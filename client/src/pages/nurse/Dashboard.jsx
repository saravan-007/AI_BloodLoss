import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUsers, FaProcedures, FaBell, FaPlus, FaClipboardList, FaCheckCircle, FaDoorOpen } from 'react-icons/fa';
import { MdWarning } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { toast } from 'react-toastify';

export default function NurseDashboard() {
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const [counts, setCounts] = useState({ patients: 0, surgeries: 0, activeOTs: 0 });
  const [activePatients, setActivePatients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [tasks, setTasks] = useState([
    { id: 1, task: 'Prepare OT Room 1 for next surgery', done: false, priority: 'high' },
    { id: 2, task: 'Monitor patient Priya Sharma vitals',  done: false, priority: 'high' },
    { id: 3, task: 'Restock suction equipment in OT 2',   done: true,  priority: 'medium' },
    { id: 4, task: 'Verify gauze inventory',             done: false, priority: 'low' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let livePatients = [];
        let liveSurgeries = [];
        try {
          const [patientsRes, surgeriesRes] = await Promise.all([
            api.get('/patients'),
            api.get('/surgeries')
          ]);
          livePatients = patientsRes.data;
          liveSurgeries = surgeriesRes.data;
        } catch (err) {
          console.warn('Dashboard live fetch failed');
        }

        // Local Storage Fallback & Merging
        const demoPatientsAll = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const demoSurgeriesAll = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');

        // Scope to this logged-in nurse
        const demoPatients = demoPatientsAll.filter(p => p.createdBy === user?.id || p.appointedNurse === user?.id);
        const demoPatientIds = demoPatients.map(p => p._id);
        const demoSurgeries = demoSurgeriesAll.filter(s => s.createdBy === user?.id || demoPatientIds.includes(s.patientId));

        // Merge
        const patients = [...demoPatients, ...livePatients];
        const uniquePatients = Array.from(new Map(patients.map(p => [p._id, p])).values());
        
        const surgeries = [...demoSurgeries, ...liveSurgeries];
        const uniqueSurgeries = Array.from(new Map(surgeries.map(s => [s._id, s])).values());

        const active = uniquePatients.filter(p => p.status === 'Active' || p.status === 'Critical');
        
        setCounts({
          patients: uniquePatients.length,
          surgeries: uniqueSurgeries.length,
          activeOTs: active.length
        });
        setActivePatients(active.slice(0, 5)); // Show top 5 active patients
      } catch (err) {
        console.error('Dashboard data load failed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-900/80 to-teal-950 p-8 md:p-12 border border-emerald-500/20 shadow-glow"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Nurse Station Dashboard 👋
            </h2>
            <div className="text-emerald-300/80 font-medium mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-black uppercase tracking-[0.15em] text-[10px]"><FaUserNurse className="text-xs" /> {user?.fullName || 'STAFF'}</span>
              <span className="w-1 h-1 rounded-full bg-emerald-500/50" />
              <span className="text-xs font-bold uppercase tracking-widest">{user?.department || 'Main Surgery Unit'}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/nurse/patients/add')}
            className="group btn-success btn-lg !rounded-2xl flex items-center gap-3 active:scale-95 transition-transform !bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <FaPlus className="text-sm group-hover:rotate-90 transition-transform duration-300" />
            <span>Register New Admission</span>
          </button>
        </div>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl -ml-10 -mb-10" />
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Patients', value: counts.patients, icon: <FaUsers />, bg: 'bg-emerald-500/10', color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Active OTs',      value: counts.activeOTs, icon: <FaProcedures />, bg: 'bg-teal-500/10', color: 'text-teal-400', border: 'border-teal-500/20' },
          { label: 'Pending Tasks',  value: tasks.filter(t => !t.done).length, icon: <FaClipboardList />, bg: 'bg-amber-500/10', color: 'text-amber-400', border: 'border-amber-500/20' },
          { label: 'Completed',      value: counts.surgeries, icon: <FaCheckCircle />, bg: 'bg-emerald-500/10', color: 'text-emerald-400', border: 'border-emerald-500/20' },
        ].map((s, i) => (
          <motion.div 
            key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`card group hover:scale-[1.02] transition-all duration-300 ${s.border}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
                <div className="text-3xl font-black text-white">{s.value}</div>
              </div>
              <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center text-xl shadow-inner group-hover:shadow-glow transition-all`}>
                {s.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* OT Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-black text-white tracking-tight flex items-center gap-3">
               <span className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
               OT Room Status
             </h3>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Monitoring</span>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-800/40 rounded-2xl animate-pulse" />)}
            </div>
          ) : activePatients.length === 0 ? (
            <div className="py-12 text-center">
              <FaDoorOpen className="text-4xl text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">All OT Rooms are currently idle</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activePatients.map((p, i) => (
                <div 
                  key={p._id} 
                  onClick={() => navigate(`/${user?.role || 'nurse'}/patients/${p._id}`)}
                  className={`flex items-center gap-4 p-4 rounded-2xl bg-slate-800/20 border cursor-pointer group transition-all ${
                    p.status === 'Critical' ? 'border-red-500/30 hover:bg-red-500/5' : 'border-emerald-500/30 hover:bg-emerald-500/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-105 transition-all ${
                    p.status === 'Critical' ? 'bg-red-600' : 'bg-emerald-600'
                  }`}>OT {i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-base truncate group-hover:text-emerald-400 transition-colors">{p.patientName}</div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">{p.surgeryType}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${p.status === 'Critical' ? 'text-red-400' : 'text-emerald-400'}`}>{p.status}</div>
                    <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter italic">In Progress</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nurse Checklists */}
        <div className="card">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-black text-white tracking-tight flex items-center gap-3">
               <span className="w-1.5 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
               Nurse Checklists
             </h3>
             <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">Daily Sync</div>
          </div>
          <div className="space-y-3">
            {tasks.map((t) => (
              <div 
                key={t.id} 
                onClick={() => toggleTask(t.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl bg-slate-800/10 border cursor-pointer group transition-all ${t.done ? 'opacity-40 border-slate-800' : 'border-slate-800/50 hover:border-slate-700'}`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  t.done ? 'bg-emerald-500 border-emerald-500 shadow-glow-emerald' : t.priority === 'high' ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700'
                }`}>
                  {t.done && <FaCheckCircle className="text-white text-sm" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${t.done ? 'line-through text-slate-500' : 'text-white'}`}>{t.task}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${
                  t.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : t.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                  : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  {t.priority}
                </span>
              </div>
            ))}
            
            <button 
              onClick={() => toast.info('Checklist reset successfully')}
              className="w-full py-3 border-2 border-dashed border-slate-800/50 rounded-2xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:border-slate-700 hover:text-slate-400 transition-all mt-4"
            >
              Reset Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const FaUserNurse = () => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M319.4 320.6L224 416l-95.4-95.4C57.1 323.7 0 382.2 0 454.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-9.6c0-72.2-57.1-130.7-128.6-133.8zM13.6 79.8l6.4 1.5v58.4c-7 2.8-12 9.8-12 17.9 0 10.6 8.6 19.2 19.2 19.2s19.2-8.6 19.2-19.2c0-8.1-5-15.1-12-17.9V86.5l6.4-1.5c10.6-2.5 17.6-12.1 17.6-23V48c0-26.5-21.5-48-48-48S14.4 21.5 14.4 48v8.8c0 10.9 7 20.5 17.6 23zM160 128c44.2 0 80-35.8 80-80s-35.8-80-80-80-80 35.8-80 80 35.8 80 80 80zm256-80c0-26.5-21.5-48-48-48s-48 21.5-48 48v8.8c0 10.9 7 20.5 17.6 23l6.4 1.5v58.4c-7 2.8-12 9.8-12 17.9 0 10.6 8.6 19.2 19.2 19.2s19.2-8.6 19.2-19.2c0-8.1-5-15.1-12-17.9V86.5l6.4-1.5c10.6-2.5 17.6-12.1 17.6-23V48z"></path>
  </svg>
);
