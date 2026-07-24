import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSearch, FaUser, FaArrowRight } from 'react-icons/fa';
import { MdBloodtype } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StartSurgery() {
  const navigate   = useNavigate();
  const { role, user }   = useAuth();
  const userId = user?.id || user?._id || null;
  const [patients, setPatients] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        let liveData = [];
        try {
          const r = await api.get('/patients', { params: { search, status: 'Active' } });
          liveData = r.data;
        } catch (err) { }

        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const filteredDemo = demoPatients.filter(p => {
          return p.status === 'Active' && p.patientName.toLowerCase().includes(search.toLowerCase());
        });

        const all = [...filteredDemo, ...liveData];
        const unique = Array.from(new Map(all.map(p => [p._id, p])).values());
        setPatients(unique);
      } catch (err) {
        toast.error('Failed to load active patients');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [search]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">Initialize New Surgery</h2>
        <p className="text-slate-500 text-sm mt-1">Select an active patient to begin intra-operative monitoring</p>
      </div>

      <div className="card !p-4">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search active patients..."
            className="input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-32 !bg-slate-800/20 animate-pulse" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="card text-center py-20 border-dashed border-2 border-slate-800 bg-transparent">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUser className="text-2xl text-slate-600" />
          </div>
          <p className="text-slate-500 font-bold">No active patients found</p>
          <button onClick={() => navigate(`/${role}/patients/add`)} className={`btn-primary mt-6 !px-8 ${role === 'nurse' ? '!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-glow' : ''}`}>Register New Patient</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {patients.map((p, i) => (
            <motion.div
              key={p._id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/${role}/surgery/${p._id}/step1`)}
              className="card-hover !bg-dark-card !border-dark-border group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-black text-xl shadow-inner group-hover:bg-primary-600 group-hover:text-white transition-all">
                    {p.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-primary-400 transition-colors">{p.patientName}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{p.surgeryType} • {p.age} YRS</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary-400 font-black text-xs uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  START <FaArrowRight />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
