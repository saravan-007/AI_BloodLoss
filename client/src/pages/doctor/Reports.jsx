import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSearch, FaDownload, FaFilter, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';

export default function Reports() {
  const navigate = useNavigate();
  const { role, user }   = useAuth();
  const userId = user?.id || user?._id || null;
  const [patients, setPatients]   = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        let liveData = [];
        try {
          const r = await api.get('/patients', { params: { search } });
          liveData = r.data;
        } catch (err) { }

        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const filteredDemo = demoPatients.filter(p => {
          let isVisible = false;
          if (!userId) {
            isVisible = true; // fallback
          } else if (role === 'doctor') {
            isVisible = p.createdBy === userId;
          } else {
            isVisible = (p.createdBy === userId || p.appointedNurse === userId);
          }
          
          if (!isVisible) return false;
          
          return p.patientName.toLowerCase().includes(search.toLowerCase());
        });

        const all = [...filteredDemo, ...liveData];
        const unique = Array.from(new Map(all.map(p => [p._id, p])).values());
        setPatients(unique);
      } catch (err) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [search]);

  const downloadPatientReport = async (patient) => {
    try {
      let data;
      try {
        const r = await api.get(`/patients/${patient._id}`);
        data = r.data;
      } catch (err) {
        // Fallback to localStorage
        const demoSurgeries = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');
        data = { 
          patient, 
          surgeries: demoSurgeries.filter(s => s.patientId === patient._id) 
        };
      }
      const { surgeries } = data;

      const doc = new jsPDF();
      let y = 20;

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Complete Patient Report', 15, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('AI Blood Loss Estimator & Fluid Monitor System', 15, 28);

      y = 50;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Details', 15, y); y += 8;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      [
        `Name: ${patient.patientName}`,
        `Age / Gender: ${patient.age} yrs / ${patient.gender}`,
        `Weight: ${patient.weight} kg`,
        `Surgery Type: ${patient.surgeryType}`,
        `Allergies: ${patient.allergies || 'None'}`,
        `Medical Notes: ${patient.medicalNotes || 'None'}`,
      ].forEach(l => { doc.text(l, 15, y); y += 7; });

      surgeries.forEach((s, i) => {
        y += 5;
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(`Surgery Record #${i + 1} — ${new Date(s.surgeryDate).toLocaleDateString('en-IN')}`, 15, y); y += 8;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        [
          `Total Blood Loss: ${s.totalBloodLoss} ml`,
          `Total Fluid Loss: ${s.totalFluidLoss} ml`,
          `Gauze Blood: ${s.totalGauzeBlood} ml | Suction Blood: ${s.suctionBlood} ml`,
          `Insensible Loss: ${s.insensibleLoss} ml | Urine: ${s.urineCollected} ml`,
          `Duration: ${s.surgeryDuration} hrs | Weight: ${s.patientWeight} kg`,
        ].forEach(l => { doc.text(l, 20, y); y += 7; });
      });

      doc.save(`Report_${patient.patientName.replace(/ /g, '_')}.pdf`);
      toast.success('Report downloaded!');
    } catch { toast.error('Failed to generate report'); }
  };

  const handleShare = async (patient) => {
    if (!patient.appointedNurse) {
      toast.info('No nurse appointed for this patient. Please edit patient details to appoint a nurse.');
      return;
    }
    try {
      await api.post('/notifications/share', {
        patientId: patient._id,
        recipientId: patient.appointedNurse,
        recipientRole: 'nurse',
        message: `Doctor has shared the clinical report for patient ${patient.patientName}.`
      });
      toast.success(`Report shared with the appointed nurse!`);
    } catch (err) {
      toast.error('Failed to share report');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h2 className="text-2xl font-black text-white">Clinical Reports</h2>
          <p className="text-slate-500 text-sm mt-1">Export comprehensive surgery logs and fluid analysis as PDF</p>
        </div>
      </div>

      {/* Search */}
      <div className="card !p-4">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patient record by name..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-20 !bg-slate-800/20 !border-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden border-dark-border bg-dark-card/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Patient Name', 'Surgery Type', 'Surgery Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="table-header text-[10px] font-black">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {patients.map((p, i) => (
                  <motion.tr 
                    key={p._id} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    transition={{ delay: i * 0.04 }} 
                    className="table-row group"
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-primary-400 flex items-center justify-center font-black border border-slate-700 shadow-inner">
                          {p.patientName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-primary-400 transition-colors">{p.patientName}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{p.age} YRS • {p.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-slate-400 font-medium">{p.surgeryType}</td>
                    <td className="table-cell text-slate-500 font-bold text-xs uppercase tracking-tight">
                      {new Date(p.surgeryDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="table-cell">
                      <span className={p.status === 'Active' ? 'badge-blue' : p.status === 'Critical' ? 'badge-red' : 'badge-green'}>{p.status}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-3">
                        <button onClick={() => navigate(`/doctor/patients/${p._id}`)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all">
                          <FaEye className="text-sm" />
                        </button>
                        <button onClick={() => downloadPatientReport(p)} className="btn-primary !py-2 !px-4 !text-[10px] !font-black !rounded-xl shadow-blue-glow">
                          <FaDownload className="text-xs" /> DOWNLOAD PDF
                        </button>
                        <button 
                          onClick={() => handleShare(p)} 
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                          title={p.appointedNurse ? 'Share with appointed nurse' : 'No nurse appointed'}
                        >
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M448 248L288 88v80H144c-44.2 0-80 35.8-80 80v128l32-32c18.5-18.5 44.1-28.8 70.4-28.8H288v80l160-160z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {patients.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSearch className="text-2xl text-slate-600" />
              </div>
              <p className="text-slate-500 font-bold text-sm">No clinical records found</p>
              <p className="text-[11px] text-slate-600 mt-1 font-medium">Try searching with a different name</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
