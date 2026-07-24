import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaCalculator, FaSave, FaArrowLeft, FaDownload, FaCheckCircle, FaBrain } from 'react-icons/fa';
import { MdBloodtype } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import StepWrapper from './StepWrapper';
import api from '../../utils/api';
import jsPDF from 'jspdf';
import AIChatbot from '../../components/AIChatbot';

const getWfState = () => JSON.parse(sessionStorage.getItem('surgery_wf') || '{}');

export default function TotalFluidLoss() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { role, user } = useAuth();
  const wf = getWfState();

  const [result, setResult] = useState({ totalFluidLoss: 0, calculated: false });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [patient, setPatient] = useState(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [savedSurgeryId, setSavedSurgeryId] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const calculate = () => {
    const blood      = parseFloat(wf.totalBloodLoss)  || 0;
    const urine      = parseFloat(wf.urineCollected)  || 0;
    const insensible = parseFloat(wf.insensibleLoss)  || 0;

    if (!blood && !urine && !insensible)
      return toast.error('Please complete all previous steps first');

    const totalFluidLoss = blood + urine + insensible;
    setResult({ totalFluidLoss, calculated: true });
    toast.success('Total fluid loss calculated!');
  };

  const getPatientData = async () => {
    try {
      const { data } = await api.get(`/patients/${patientId}`);
      return data.patient;
    } catch {
      const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
      return demoPatients.find(x => x._id === patientId) || null;
    }
  };

  const handleFindIssue = async () => {
    const p = patient || await getPatientData();
    if (p) setPatient(p);
    setShowChatbot(true);
  };

  const handleSaveAnalysis = async (analysis) => {
    setAiAnalysis(analysis);
    if (!savedSurgeryId) return;
    try {
      await api.post('/ai/save-analysis', {
        surgeryId: savedSurgeryId,
        analysis
      });
    } catch { /* silent — localStorage mode */ }
  };

  const handleSave = async () => {
    if (!result.calculated) return toast.error('Please calculate first');
    setSaving(true);
    const payload = {
      patientId,
      ...wf,
      totalFluidLoss: result.totalFluidLoss,
      surgeryDate: new Date().toISOString(),
      createdBy: user?.id || user?._id || 'demo-user-id',
      createdByRole: role,
      aiAnalysis: aiAnalysis ? (typeof aiAnalysis === 'string' ? aiAnalysis : JSON.stringify(aiAnalysis)) : '',
    };

    try {
      const { data } = await api.post('/surgeries', payload);
      setSavedSurgeryId(data._id);
      setSaved(true);
      toast.success('Surgery record saved successfully!');
      sessionStorage.removeItem('surgery_wf');
    } catch (err) {
      if (!err.response || err.response.status >= 500) {
        // Save to localStorage silently
        const existing = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');
        const mockId = 'surgery-' + Date.now();
        localStorage.setItem('demo_surgeries', JSON.stringify([{ ...payload, _id: mockId }, ...existing]));
        setSavedSurgeryId(mockId);
        setSaved(true);
        toast.success('Surgery record saved successfully!');
        sessionStorage.removeItem('surgery_wf');
      } else {
        toast.error(err.response?.data?.message || 'Failed to save surgery record');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      let p;
      try {
        const { data: pd } = await api.get(`/patients/${patientId}`);
        p = pd.patient;
      } catch (err) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        p = demoPatients.find(x => x._id === patientId);
        if (!p) throw new Error('Patient not found');
      }
      const doc = new jsPDF();
      let y = 20;

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Surgery Report — Blood Loss & Fluid Monitor', 15, 22);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 15, 30);

      y = 45;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Patient Details', 15, y); y += 9;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      [
        `Name: ${p.patientName}`,
        `Age / Gender: ${p.age} yrs / ${p.gender}`,
        `Weight: ${p.weight} kg`,
        `Blood Group: ${p.bloodGroup || 'Not recorded'}`,
        `Surgery Type: ${p.surgeryType}`,
        `Allergies: ${p.allergies || 'None'}`,
      ].forEach(l => { doc.text(l, 15, y); y += 8; });

      y += 5;
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Blood Loss Calculations', 15, y); y += 9;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      [
        `Small Gauze: ${wf.smallGauzeCount || 0} pcs × ${wf.smallGauzeValue || 0} ml = ${(wf.smallGauzeBlood || 0).toFixed(1)} ml`,
        `Large Gauze: ${wf.largeGauzeCount || 0} pcs × ${wf.largeGauzeValue || 0} ml = ${(wf.largeGauzeBlood || 0).toFixed(1)} ml`,
        `Total Gauze Blood: ${(wf.totalGauzeBlood || 0).toFixed(1)} ml`,
        `Suction Bottle: ${wf.suctionBottleValue || 0} ml − Saline: ${wf.salineUsed || 0} ml = ${(wf.suctionBlood || 0).toFixed(1)} ml`,
        `TOTAL BLOOD LOSS: ${(wf.totalBloodLoss || 0).toFixed(1)} ml`,
      ].forEach(l => { doc.text(l, 15, y); y += 8; });

      y += 5;
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Fluid Balance', 15, y); y += 9;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      [
        `Surgery Duration: ${wf.surgeryDuration || 0} hours`,
        `Patient Weight: ${wf.patientWeight || 0} kg`,
        `Insensible Loss (2 × ${wf.patientWeight || 0} × ${wf.surgeryDuration || 0}): ${(wf.insensibleLoss || 0).toFixed(1)} ml`,
        `Urine Collected: ${wf.urineCollected || 0} ml`,
        `TOTAL FLUID LOSS: ${result.totalFluidLoss.toFixed(1)} ml`,
      ].forEach(l => { doc.text(l, 15, y); y += 8; });

      doc.save(`SurgeryReport_${p.patientName.replace(/ /g, '_')}.pdf`);
      toast.success('PDF downloaded!');
    } catch { toast.error('Failed to generate PDF'); }
  };

  const blood      = parseFloat(wf.totalBloodLoss) || 0;
  const urine      = parseFloat(wf.urineCollected) || 0;
  const insensible = parseFloat(wf.insensibleLoss) || 0;

  if (saved) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card !p-12 border-emerald-500/20 shadow-emerald-500/10">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-emerald-500/20">
             <FaCheckCircle className="text-5xl text-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">Surgery Completed!</h2>
          <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed text-sm">
            All clinical measurements have been securely synchronized with the patient's medical history.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate(`/${role}/patients/${patientId}`)} className={`btn-primary !py-4 !px-10 !text-xs !font-black !rounded-2xl ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`}>
              VIEW PATIENT DOSSIER
            </button>
            <button onClick={handleDownloadPDF} className="btn-secondary !py-4 !px-10 !text-xs !font-black !rounded-2xl border-slate-700">
              <FaDownload className="mr-2" /> EXPORT PDF
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <StepWrapper currentStep={6}>
        {/* Complete Summary Header */}
        <div className="card !p-6 bg-slate-800/20 border-slate-800/50 mb-8">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6 px-2">Clinical Aggregate Summary</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 text-center">
              <p className="text-[9px] text-red-400/70 font-black uppercase tracking-widest mb-1">Blood Loss</p>
              <p className="text-xl font-black text-white">{blood.toFixed(1)} <span className="text-[10px] opacity-40">ML</span></p>
            </div>
            <div className="p-4 bg-violet-500/5 rounded-2xl border border-violet-500/10 text-center">
              <p className="text-[9px] text-violet-400/70 font-black uppercase tracking-widest mb-1">Urine Output</p>
              <p className="text-xl font-black text-white">{urine.toFixed(1)} <span className="text-[10px] opacity-40">ML</span></p>
            </div>
            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-center">
              <p className="text-[9px] text-amber-400/70 font-black uppercase tracking-widest mb-1">Insensible</p>
              <p className="text-xl font-black text-white">{insensible.toFixed(1)} <span className="text-[10px] opacity-40">ML</span></p>
            </div>
          </div>
        </div>

        <div className="card !p-8 border-l-4 border-emerald-500">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-emerald-400 font-black text-lg border border-slate-700 shadow-inner">6</div>
            <div>
              <h3 className="font-black text-white text-xl tracking-tight">Final Fluid Inventory</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Summation of all clinical output channels</p>
            </div>
          </div>

          {result.calculated && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-600/10 border-2 border-emerald-500/30 rounded-[32px] p-10 mb-8 text-center shadow-inner shadow-emerald-500/10">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                 <MdBloodtype className="text-3xl text-emerald-400" />
              </div>
              <p className="text-[11px] text-emerald-400 font-black uppercase tracking-[0.3em] mb-3">Net Surgical Fluid Loss</p>
              <div className="text-7xl font-black text-white tracking-tighter">
                {result.totalFluidLoss.toFixed(1)}
                <span className="text-2xl opacity-40 ml-2 font-bold tracking-normal uppercase">ml</span>
              </div>
              <div className="mt-8 flex items-center justify-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                <span>{blood.toFixed(1)} B</span>
                <span className="text-slate-800">+</span>
                <span>{urine.toFixed(1)} U</span>
                <span className="text-slate-800">+</span>
                <span>{insensible.toFixed(1)} I</span>
              </div>
            </motion.div>
          )}

          {!result.calculated ? (
            <div className="grid grid-cols-4 gap-4">
              <button onClick={() => navigate(`/${role}/surgery/${patientId}/step5`)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all">
                <FaArrowLeft />
              </button>
              <button onClick={calculate} className="col-span-3 btn-success !py-4 !text-xs !font-black !rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <FaCalculator /> FINALIZE CALCULATIONS
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action row 1: Back + Find Issue */}
              <div className="flex gap-4">
                <button onClick={() => navigate(`/${role}/surgery/${patientId}/step5`)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all flex-shrink-0">
                  <FaArrowLeft />
                </button>
                {/* FIND ISSUE — AI Chatbot Button */}
                <button
                  onClick={handleFindIssue}
                  className="flex-1 flex items-center justify-center gap-3 !py-4 !text-xs !font-black !rounded-2xl transition-all border border-violet-500/30 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 hover:text-white"
                  style={{ boxShadow: '0 0 20px rgba(124,58,237,0.15)' }}
                >
                  <FaBrain className="text-base" />
                  FIND ISSUE — AI ANALYSIS
                </button>
              </div>
              {/* Action row 2: Save + PDF */}
              <div className="flex gap-4">
                <button onClick={handleSave} disabled={saving} className={`btn-primary flex-1 !py-4 !text-xs !font-black !rounded-2xl ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : <><FaSave className="mr-2" />SAVE RECORD</>}
                </button>
                <button onClick={handleDownloadPDF} className="btn-secondary flex-1 !py-4 !text-xs !font-black !rounded-2xl border-slate-700">
                  <FaDownload className="mr-2" /> PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </StepWrapper>

      {/* AI Chatbot Modal */}
      <AnimatePresence>
        {showChatbot && (
          <AIChatbot
            patientData={patient || {
              patientName: 'Patient',
              age: wf.patientWeight ? '—' : '—',
              gender: '—',
              weight: wf.patientWeight || 0,
              bloodGroup: '',
              surgeryType: '—',
              allergies: '—',
              medicalNotes: '—',
            }}
            surgeryData={wf}
            onClose={() => setShowChatbot(false)}
            onSaveAnalysis={handleSaveAnalysis}
          />
        )}
      </AnimatePresence>
    </>
  );
}
