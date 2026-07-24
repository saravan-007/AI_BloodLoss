import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaCalculator, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import StepWrapper from './StepWrapper';
import api from '../../utils/api';

// Surgery workflow state in sessionStorage (persists across step navigation)
const getWfState = () => JSON.parse(sessionStorage.getItem('surgery_wf') || '{}');
const setWfState = (data) => sessionStorage.setItem('surgery_wf', JSON.stringify({ ...getWfState(), ...data }));

export default function GauzeCalc() {
  const navigate     = useNavigate();
  const { patientId } = useParams();
  const { role }      = useAuth();

  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({
    smallGauzeCount: '', smallGauzeValue: '',
    largeGauzeCount: '', largeGauzeValue: '',
  });
  const [result, setResult] = useState({ small: 0, large: 0, total: 0, calculated: false });

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const r = await api.get(`/patients/${patientId}`);
        setPatient(r.data.patient);
      } catch (err) {
        // Fallback to localStorage
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const p = demoPatients.find(x => x._id === patientId);
        if (p) {
          setPatient(p);
        } else if (!err.response || err.response.status >= 500) {
          // Only show error if not found in local either
          toast.error('Patient not found');
        }
      }
    };
    
    fetchPatient();
    // Clear old workflow state
    sessionStorage.removeItem('surgery_wf');
  }, [patientId]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const calculate = () => {
    const sc = parseFloat(form.smallGauzeCount) || 0;
    const sv = parseFloat(form.smallGauzeValue) || 0;
    const lc = parseFloat(form.largeGauzeCount) || 0;
    const lv = parseFloat(form.largeGauzeValue) || 0;

    if (!sc && !lc) return toast.error('Please enter at least one gauze count');

    const small = sc * sv;
    const large = lc * lv;
    const total = small + large;

    setResult({ small, large, total, calculated: true });
    setWfState({ ...form, smallGauzeBlood: small, largeGauzeBlood: large, totalGauzeBlood: total, patientId, patientWeight: patient?.weight });
    toast.success('Gauze calculation complete!');
  };

  const handleNext = () => {
    if (!result.calculated) return toast.error('Please calculate first');
    navigate(`/${role}/surgery/${patientId}/step2`);
  };

  return (
    <StepWrapper currentStep={1}>
      {/* Patient info banner */}
      {patient && (
        <div className={`card !p-6 bg-gradient-to-br border-white/5 shadow-lg mb-8 transition-all duration-500 ${role === 'doctor' ? 'from-blue-900/40 to-indigo-950/40 border-blue-500/20' : 'from-emerald-900/40 to-teal-950/40 border-emerald-500/20'}`}>
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-black text-2xl shadow-inner transition-all ${role === 'doctor' ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'}`}>
              {patient.patientName.charAt(0)}
            </div>
            <div>
              <h4 className="text-xl font-black text-white tracking-tight">{patient.patientName}</h4>
              <div className="flex items-center gap-3 text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">
                <span>{patient.surgeryType}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>{patient.weight} KG</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>{patient.age} YRS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 card */}
      <div className={`card !p-8 border-l-4 transition-all duration-500 ${role === 'doctor' ? 'border-primary-500' : 'border-emerald-500'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-lg border border-slate-700 shadow-inner transition-all ${role === 'doctor' ? 'text-primary-400' : 'text-emerald-400'}`}>1</div>
            <div>
              <h3 className="font-black text-white text-xl tracking-tight">Gauze Calculation</h3>
              <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Calculate volume from saturated gauzes</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Small Gauze */}
          <div className={`p-6 rounded-3xl border transition-all group ${role === 'doctor' ? 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30' : 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role === 'doctor' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                 <FaCalculator className="text-xs" />
              </div>
              <h4 className={`text-[11px] font-black uppercase tracking-widest ${role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`}>Small Gauze</h4>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Quantity (pcs)</label>
                <input name="smallGauzeCount" type="number" min="0" value={form.smallGauzeCount} onChange={handleChange} placeholder="0" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Blood Volume (ml/pc)</label>
                <input name="smallGauzeValue" type="number" min="0" step="0.1" value={form.smallGauzeValue} onChange={handleChange} placeholder="0" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" />
              </div>
            </div>
          </div>

          {/* Large Gauze */}
          <div className="p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10 hover:border-rose-500/30 transition-all group">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                 <FaCalculator className="text-xs" />
              </div>
              <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-widest">Large Gauze</h4>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Quantity (pcs)</label>
                <input name="largeGauzeCount" type="number" min="0" value={form.largeGauzeCount} onChange={handleChange} placeholder="0" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Blood Volume (ml/pc)</label>
                <input name="largeGauzeValue" type="number" min="0" step="0.1" value={form.largeGauzeValue} onChange={handleChange} placeholder="0" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" />
              </div>
            </div>
          </div>
        </div>

        {/* Results section */}
        {result.calculated && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800 text-center">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Small Total</p>
              <p className={`text-xl font-black ${role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`}>{result.small.toFixed(1)} <span className="text-xs opacity-50">ml</span></p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-800 text-center">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Large Total</p>
              <p className="text-xl font-black text-rose-400">{result.large.toFixed(1)} <span className="text-xs opacity-50">ml</span></p>
            </div>
            <div className={`p-4 rounded-2xl text-center border transition-all ${role === 'doctor' ? 'bg-primary-600 shadow-blue-glow border-primary-500' : 'bg-emerald-600 shadow-emerald-glow border-emerald-500'}`}>
              <p className="text-[9px] text-white/70 font-black uppercase tracking-widest mb-1">Grand Total</p>
              <p className="text-xl font-black text-white">{result.total.toFixed(1)} <span className="text-xs opacity-70">ml</span></p>
            </div>
          </motion.div>
        )}

        <div className="flex gap-4">
          <button onClick={calculate} className="btn-secondary !py-4 flex-1 !text-xs !font-black !rounded-2xl border-slate-700">
            <FaCalculator /> CALCULATE VOLUME
          </button>
          <button onClick={handleNext} className={`btn-primary !py-4 flex-1 !text-xs !font-black !rounded-2xl transition-all group ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`} disabled={!result.calculated}>
            PROCEED TO STEP 2 <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </StepWrapper>
  );
}
