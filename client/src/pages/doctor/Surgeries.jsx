import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaProcedures, FaCalendarAlt, FaTint, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// Helper to get the real user ID regardless of API field name
const getUserId = (user) => user?.id || user?._id || null;

export default function Surgeries() {
  const navigate   = useNavigate();
  const { role, user } = useAuth();
  const userId = getUserId(user);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate]       = useState('');

  useEffect(() => {
    const fetchSurgeries = async () => {
      setLoading(true);
      try {
        let liveRecords = [];
        try {
          const r = await api.get('/surgeries', { params: { date } });
          liveRecords = r.data;
        } catch (err) { }

        // Fetch from local storage
        const demoSurgeriesAll = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');
        const demoPatientsAll = JSON.parse(localStorage.getItem('demo_patients') || '[]');

        // Filter demo patients/surgeries for the logged-in user
        const filteredDemoPatients = demoPatientsAll.filter(p => {
          if (!userId) return true; // no user ID — show all (fallback)
          if (role === 'doctor') {
            return p.createdBy === userId;
          } else {
            return (p.createdBy === userId || p.appointedNurse === userId);
          }
        });
        const filteredDemoPatientIds = filteredDemoPatients.map(p => p._id);
        
        const filteredDemoSurgeries = demoSurgeriesAll.filter(s => {
          return s.createdBy === userId || filteredDemoPatientIds.includes(s.patientId);
        });

        // Link demo surgeries with their patient details for display
        const mappedDemo = filteredDemoSurgeries.map(s => ({
          ...s,
          patientId: filteredDemoPatients.find(p => p._id === s.patientId) || { patientName: 'Demo Patient' }
        }));

        // Filter by date if provided
        const filteredDemo = date 
          ? mappedDemo.filter(s => s.surgeryDate.startsWith(date))
          : mappedDemo;

        // Merge and unique
        const all = [...filteredDemo, ...liveRecords];
        const unique = Array.from(new Map(all.map(s => [s._id, s])).values());
        
        // Sort descending
        unique.sort((a, b) => new Date(b.surgeryDate) - new Date(a.surgeryDate));
        
        setRecords(unique);
      } catch (err) {
        toast.error('Failed to load surgery history');
      } finally {
        setLoading(false);
      }
    };
    fetchSurgeries();
  }, [date, user]);

  const totalBlood = records.reduce((s, r) => s + (r.totalBloodLoss || 0), 0);
  const totalFluid = records.reduce((s, r) => s + (r.totalFluidLoss || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h2 className="text-2xl font-black text-white">Surgeries</h2>
          <p className="text-slate-500 text-sm mt-1">{records.length} record{records.length !== 1 ? 's' : ''} found in history</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/40 p-1.5 rounded-2xl border border-slate-800/50">
          <FaCalendarAlt className="ml-3 text-slate-500" />
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer" 
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Records', value: records.length, icon: <FaProcedures />, bg: role === 'doctor' ? 'bg-blue-500/10' : 'bg-emerald-500/10', color: role === 'doctor' ? 'text-blue-400' : 'text-emerald-400', border: role === 'doctor' ? 'border-blue-500/20' : 'border-emerald-500/20' },
          { label: 'Avg Blood Loss', value: records.length ? `${Math.round(totalBlood / records.length)} ml` : '0 ml', icon: <FaTint />, bg: 'bg-red-500/10', color: 'text-red-400', border: 'border-red-500/20' },
          { label: 'Total Volume Tracked', value: `${totalBlood + totalFluid} ml`, icon: <FaProcedures />, bg: role === 'doctor' ? 'bg-indigo-500/10' : 'bg-teal-500/10', color: role === 'doctor' ? 'text-indigo-400' : 'text-teal-400', border: role === 'doctor' ? 'border-indigo-500/20' : 'border-teal-500/20' },
        ].map((s, i) => (
          <div key={i} className={`card flex items-center gap-5 ${s.border}`}>
            <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center text-2xl shadow-inner`}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-black text-white">{loading ? '—' : s.value}</div>
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Surgery list */}
      {loading ? (
        <div className="card h-64 !bg-slate-800/20 !border-slate-800/50 animate-pulse" />
      ) : records.length === 0 ? (
        <div className="card text-center py-24">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaProcedures className="text-3xl text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-400">No Records Found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-8 max-w-xs mx-auto">
            {date ? `No surgery records were found for the selected date.` : 'There are no surgery records in the system yet.'}
          </p>
          <button onClick={() => navigate(`/${role}/patients`)} className={`btn-primary mx-auto !px-8 ${role === 'nurse' ? '!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-glow' : ''}`}>View Patient List</button>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden !bg-dark-card/50 border-dark-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Patient', 'Surgery Type', 'Date', 'Blood Loss', 'Fluid Loss', 'Duration', 'Actions'].map(h => (
                    <th key={h} className="table-header text-[10px] font-black">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {records.map((r, i) => (
                  <motion.tr
                    key={r._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="table-row group"
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-black shadow-inner border border-slate-700 ${role === 'doctor' ? 'text-primary-400' : 'text-emerald-400'}`}>
                          {r.patientId?.patientName?.charAt(0) || '?'}
                        </div>
                        <span className={`font-bold text-white transition-colors ${role === 'doctor' ? 'group-hover:text-primary-400' : 'group-hover:text-emerald-400'}`}>{r.patientId?.patientName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="table-cell text-slate-400 font-medium">{r.surgeryType || r.patientId?.surgeryType || '—'}</td>
                    <td className="table-cell text-slate-500">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                        <FaCalendarAlt className="text-[10px]" />
                        {new Date(r.surgeryDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`font-black text-base ${(r.totalBloodLoss || 0) > 500 ? 'text-red-400' : 'text-slate-300'}`}>
                        {r.totalBloodLoss || 0} <span className="text-[10px] font-bold text-slate-600 ml-1">ml</span>
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-bold text-slate-400">
                        {r.totalFluidLoss || 0} <span className="text-[10px] font-bold text-slate-600 ml-1">ml</span>
                      </span>
                    </td>
                    <td className="table-cell text-slate-500 font-bold">{r.surgeryDuration || 0} <span className="text-[9px] lowercase font-medium">hrs</span></td>
                    <td className="table-cell">
                      <button onClick={() => navigate(`/${role}/patients/${r.patientId?._id}`)} className="btn-secondary !py-2 !px-4 !text-[10px] !font-black !rounded-xl">
                        <FaEye /> DETAILS
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
