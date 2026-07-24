import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaCalendarAlt, FaUser, FaHospital, FaTint, FaChevronDown,
  FaChevronUp, FaProcedures, FaBrain, FaFileMedical, FaClock, FaHeartbeat, FaTimes,
  FaRegFolderOpen
} from 'react-icons/fa';
import { MdBloodtype } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const statusColors = {
  Active: 'badge-blue',
  Discharged: 'badge-green',
  Critical: 'badge-red',
};

const severityColor = {
  Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  High:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Medium:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Low:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const Field = ({ label, value, unit = '' }) => (
  <div>
    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{label}</div>
    <div className="text-white font-bold text-xs mt-0.5">{value ?? '—'}<span className="text-[9px] text-slate-600 ml-1">{unit && value ? unit : ''}</span></div>
  </div>
);

// Helper: get the user's real ID regardless of API field name
const getUserId = (user) => user?.id || user?._id || null;

export default function DischargedPatients() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const userId = getUserId(user);

  const [patients, setPatients] = useState([]);
  const [surgeryMap, setSurgeryMap] = useState({}); // patientId -> surgery[]
  const [expandedSurgeries, setExpandedSurgeries] = useState({}); // patientId -> bool
  const [expandedAI, setExpandedAI] = useState({}); // surgeryId -> bool
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      let livePatients = [];
      let liveSurgeries = [];
      try {
        const pRes = await api.get('/patients', { params: { status: 'Discharged' } });
        livePatients = pRes.data;

        const sRes = await api.get('/surgeries');
        liveSurgeries = sRes.data;
      } catch (err) {
        console.warn('Live API request failed, falling back to localStorage data merging.');
      }

      // Load from localStorage
      const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]')
        .filter(p => p.status === 'Discharged');
      
      const demoSurgeries = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');

      // Filter demo patients by visibility
      const filteredDemoPatients = demoPatients.filter(p => {
        if (!userId) return true; // fallback
        if (role === 'doctor') {
          return p.createdBy === userId;
        } else {
          return p.createdBy === userId || p.appointedNurse === userId;
        }
      });

      // Combine patients (avoid duplicates by _id)
      const combinedPatients = [...filteredDemoPatients, ...livePatients];
      const uniquePatients = Array.from(new Map(combinedPatients.map(p => [p._id, p])).values());

      // Combine surgeries
      const combinedSurgeries = [...demoSurgeries, ...liveSurgeries];
      const uniqueSurgeries = Array.from(new Map(combinedSurgeries.map(s => [s._id, s])).values());

      // Build surgery map patientId -> surgeries
      const map = {};
      uniquePatients.forEach(p => {
        const pSurgeries = uniqueSurgeries
          .filter(s => {
            const pId = s.patientId?._id || s.patientId;
            return pId === p._id;
          })
          .sort((a, b) => new Date(b.surgeryDate) - new Date(a.surgeryDate));
        map[p._id] = pSurgeries;
      });

      setPatients(uniquePatients);
      setSurgeryMap(map);
    } catch (err) {
      toast.error('Failed to load discharged patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const toggleSurgeries = (patientId) => {
    setExpandedSurgeries(prev => ({ ...prev, [patientId]: !prev[patientId] }));
  };

  const toggleAI = (surgeryId) => {
    setExpandedAI(prev => ({ ...prev, [surgeryId]: !prev[surgeryId] }));
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.patientName.toLowerCase().includes(search.toLowerCase()) || 
                          (p.surgeryType && p.surgeryType.toLowerCase().includes(search.toLowerCase()));
    
    let matchesDate = true;
    if (filterDate) {
      if (p.dischargedAt) {
        const pDate = new Date(p.dischargedAt).toISOString().split('T')[0];
        matchesDate = pDate === filterDate;
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <FaRegFolderOpen className={role === 'nurse' ? 'text-emerald-400' : 'text-primary-400'} />
          Discharged Patients Archives
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          View discharged records, discharge dates, and saved AI analysis logs.
        </p>
      </div>

      {/* Filter panel */}
      <div className="card !p-4 flex flex-wrap gap-4 items-center !bg-dark-card border-dark-border">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient name or surgery type..."
            className="input pl-10"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <FaCalendarAlt className="text-slate-500" /> Filter by Discharge Date:
          </span>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-transparent border-0 text-white font-semibold text-xs outline-none cursor-pointer focus:ring-0 w-28"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-slate-400 hover:text-red-400 transition-colors"
              title="Clear Date Filter"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-48 !bg-slate-800/10 !border-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-20 h-20 bg-slate-800/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
            <FaUser className="text-3xl text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-400">No Discharged Patients</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            {search || filterDate 
              ? 'No records match your filters. Try clearing dates or search query.'
              : 'There are currently no patients registered under the "Discharged" status.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((p, idx) => {
            const patientSurgeries = surgeryMap[p._id] || [];
            const isExpanded = !!expandedSurgeries[p._id];

            return (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card !p-0 overflow-hidden group !bg-dark-card border-dark-border"
              >
                {/* Border Top Accent */}
                <div className={`h-1 w-full ${role === 'nurse' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`} />

                <div className="p-6">
                  {/* Top Header info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg border ${role === 'nurse' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {p.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base tracking-tight hover:underline cursor-pointer" onClick={() => navigate(`/${role}/patients/${p._id}`)}>
                          {p.patientName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.age} Yrs • {p.gender}</span>
                          {p.bloodGroup && (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                              <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <MdBloodtype className="text-[11px]" /> {p.bloodGroup}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="badge-green">Discharged</span>
                  </div>

                  {/* Body Info */}
                  <div className="space-y-2 mb-4 text-xs text-slate-400">
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span className="font-bold text-slate-500">Surgery Type</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[180px]">{p.surgeryType}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span className="font-bold text-slate-500">Allotted OT</span>
                      <span className="text-slate-300 font-medium">{p.otRoom || 'None'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span className="font-bold text-slate-500">Weight / Gender</span>
                      <span className="text-slate-300 font-medium">{p.weight} kg • {p.gender}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5 bg-emerald-500/5 px-2.5 py-1.5 rounded-xl border border-emerald-500/15">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <FaCalendarAlt className="text-[10px]" /> Discharged On
                      </span>
                      <span className="text-emerald-400 font-black">
                        {p.dischargedAt 
                          ? new Date(p.dischargedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                          : new Date(p.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                        }
                      </span>
                    </div>
                  </div>

                  {/* Action buttons / Accordion toggles */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/${role}/patients/${p._id}`)} className="btn-secondary !py-2 !px-3 flex-1 !text-[10px] !font-black !rounded-xl text-center flex items-center justify-center">
                        <FaUser className="text-[10px]" /> FULL DOSSIER
                      </button>
                      
                      {patientSurgeries.length > 0 && (
                        <button
                          onClick={() => toggleSurgeries(p._id)}
                          className="btn-outline !py-2 !px-3 flex-1 !text-[10px] !font-black !rounded-xl flex items-center justify-center gap-1 bg-slate-900 border-slate-800 hover:bg-slate-800 text-white"
                        >
                          <FaProcedures className="text-[10px]" /> 
                          {isExpanded ? 'HIDE HISTORY' : `SURGERIES (${patientSurgeries.length})`}
                        </button>
                      )}
                    </div>

                    {/* Surgeries Accordion */}
                    <AnimatePresence>
                      {isExpanded && patientSurgeries.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden space-y-2 mt-2 pt-2 border-t border-slate-800/60"
                        >
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Surgical Sessions Archive</p>
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {patientSurgeries.map((s, sIdx) => {
                              const aiData = s.aiAnalysis ? (() => { try { return JSON.parse(s.aiAnalysis); } catch { return null; } })() : null;
                              const isAIExpanded = !!expandedAI[s._id];

                              return (
                                <div key={s._id} className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                                    <span className="text-[10px] font-black text-slate-400">
                                      Session #{patientSurgeries.length - sIdx}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                      <FaCalendarAlt className="text-[8px]" />
                                      {new Date(s.surgeryDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                    </span>
                                  </div>

                                  {/* Stats mini grid */}
                                  <div className="grid grid-cols-3 gap-1.5 text-center">
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-1">
                                      <div className="text-[8px] text-red-400 font-bold uppercase tracking-wider">Blood</div>
                                      <div className="text-xs font-black text-red-400">{s.totalBloodLoss || 0}ml</div>
                                    </div>
                                    <div className={`bg-blue-500/5 border border-blue-500/10 rounded-lg p-1`}>
                                      <div className="text-[8px] text-blue-400 font-bold uppercase tracking-wider">Fluid</div>
                                      <div className="text-xs font-black text-blue-400">{s.totalFluidLoss || 0}ml</div>
                                    </div>
                                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-1">
                                      <div className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">Hours</div>
                                      <div className="text-xs font-black text-amber-400">{s.surgeryDuration || 0}h</div>
                                    </div>
                                  </div>

                                  {/* AI Analysis Accordion Inside Surgery item */}
                                  {aiData && (
                                    <div className="mt-2 pt-2 border-t border-slate-800/50">
                                      <button
                                        onClick={() => toggleAI(s._id)}
                                        className="w-full flex items-center justify-between text-[9px] font-black text-violet-400 hover:text-violet-300 transition-colors"
                                      >
                                        <span className="flex items-center gap-1">
                                          <FaBrain /> AI ANALYSIS REPORT
                                        </span>
                                        {isAIExpanded ? <FaChevronUp className="text-[8px]" /> : <FaChevronDown className="text-[8px]" />}
                                      </button>
                                      
                                      <AnimatePresence>
                                        {isAIExpanded && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden mt-2"
                                          >
                                            <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-2.5 space-y-2 text-[11px]">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[8px] text-violet-400 font-black uppercase tracking-wider">Overall Risk:</span>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${severityColor[aiData.overallRiskLevel] || severityColor.Medium}`}>
                                                  {aiData.overallRiskLevel}
                                                </span>
                                              </div>
                                              
                                              {aiData.summary && (
                                                <p className="text-slate-400 leading-normal">{aiData.summary}</p>
                                              )}

                                              {aiData.possibleIssues?.length > 0 && (
                                                <div className="space-y-1">
                                                  <div className="text-[8px] text-violet-400 font-black uppercase tracking-wider">Identified Issues</div>
                                                  {aiData.possibleIssues.map((issue, issueIdx) => (
                                                    <div key={issueIdx} className={`px-2 py-1 rounded border text-[10px] ${severityColor[issue.severity] || severityColor.Medium}`}>
                                                      <span className="font-bold">{issue.issue}</span>
                                                      {issue.description && <span className="opacity-80"> — {issue.description}</span>}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              {aiData.precautionsAndRecommendations?.immediatePrecautions?.length > 0 && (
                                                <div className="space-y-1">
                                                  <div className="text-[8px] text-amber-400 font-black uppercase tracking-wider">Immediate Precautions</div>
                                                  <ul className="space-y-0.5 list-disc list-inside text-slate-300">
                                                    {aiData.precautionsAndRecommendations.immediatePrecautions.map((prec, precIdx) => (
                                                      <li key={precIdx} className="leading-tight">{prec}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
