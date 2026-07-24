import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaPlus, FaUser, FaEye, FaTrash, FaFilter,
  FaHospital, FaTint, FaChevronDown, FaChevronUp, FaProcedures, FaCalendarAlt,
  FaArchive, FaSortAmountDown
} from 'react-icons/fa';
import { MdBloodtype } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const statusColors = (role) => ({
  Active:     role === 'doctor' ? 'badge-blue' : 'badge-green',
  Discharged: 'badge-green',
  Critical:   'badge-red',
  Archived:   'badge-gray',
});

const getUserId = (user) => user?.id || user?._id || null;

export default function Patients({ initialStatus = '' }) {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const userId = getUserId(user);

  const [patients, setPatients] = useState([]);
  const [surgeryMap, setSurgeryMap] = useState({}); // patientId -> surgery[]
  const [expanded, setExpanded] = useState(null); // expanded card id
  const [loading, setLoading] = useState(true);
  const [allottingId, setAllottingId] = useState(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [genderFilter, setGenderFilter] = useState('');
  const [nurseFilter, setNurseFilter] = useState(''); // '', 'appointed', 'unappointed'
  const [otFilter, setOtFilter] = useState(''); // '', 'allotted', 'unallotted'
  const [sortBy, setSortBy] = useState('date-newest');

  // Load surgeries from localStorage and build a map keyed by patientId
  const loadSurgeryMap = (patientList) => {
    const demoSurgeries = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');
    const map = {};
    patientList.forEach(p => {
      const surg = demoSurgeries
        .filter(s => {
          const sPid = s.patientId?._id || s.patientId;
          return sPid === p._id;
        })
        .sort((a, b) => new Date(b.surgeryDate) - new Date(a.surgeryDate));
      if (surg.length > 0) map[p._id] = surg;
    });
    setSurgeryMap(map);
  };

  const fetchPatients = async () => {
    try {
      // Pass status query param to backend so it knows whether to return archived
      const { data } = await api.get('/patients', { params: { status: status || undefined } });
      const demoPatientsAll = JSON.parse(localStorage.getItem('demo_patients') || '[]');
      const demoPatients = demoPatientsAll.filter(p => {
        if (!userId) return true;
        if (role === 'doctor') {
          return p.createdBy === userId;
        } else {
          return p.createdBy === userId || p.appointedNurse === userId;
        }
      });
      const allPatients = [...demoPatients, ...data];
      const unique = Array.from(new Map(allPatients.map(p => [p._id, p])).values());
      setPatients(unique);
      loadSurgeryMap(unique);
    } catch (err) {
      if (!err.response || err.response.status >= 500) {
        const demoPatientsAll = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const demoPatients = demoPatientsAll.filter(p => {
          if (!userId) return true;
          if (role === 'doctor') {
            return p.createdBy === userId;
          } else {
            return p.createdBy === userId || p.appointedNurse === userId;
          }
        });
        setPatients(demoPatients);
        loadSurgeryMap(demoPatients);
      } else {
        toast.error('Failed to load patients');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [status, user]);

  const handleAllotOT = async (id, otRoom) => {
    try {
      if (id.toString().startsWith('mock-') || id.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const updated = demoPatients.map(p => p._id === id ? { ...p, otRoom } : p);
        localStorage.setItem('demo_patients', JSON.stringify(updated));
        setPatients(p => p.map(x => x._id === id ? { ...x, otRoom } : x));
        toast.success(`Patient allotted to ${otRoom}`);
      } else {
        await api.put(`/patients/${id}`, { otRoom });
        setPatients(p => p.map(x => x._id === id ? { ...x, otRoom } : x));
        toast.success(`Patient allotted to ${otRoom}`);
      }
      setAllottingId(null);
    } catch {
      toast.error('Failed to allot OT room');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete patient "${name}"? This will also remove all surgery records.`)) return;
    try {
      if (id.toString().startsWith('mock-') || id.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        localStorage.setItem('demo_patients', JSON.stringify(demoPatients.filter(p => p._id !== id)));
        
        const demoSurgeries = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');
        localStorage.setItem('demo_surgeries', JSON.stringify(demoSurgeries.filter(s => {
          const sPid = s.patientId?._id || s.patientId;
          return sPid !== id;
        })));
        
        setPatients(p => p.filter(x => x._id !== id));
        setSurgeryMap(m => {
          const n = { ...m };
          delete n[id];
          return n;
        });
        toast.success('Patient deleted');
      } else {
        await api.delete(`/patients/${id}`);
        toast.success('Patient deleted');
        setPatients(p => p.filter(x => x._id !== id));
        setSurgeryMap(m => {
          const n = { ...m };
          delete n[id];
          return n;
        });
      }
    } catch {
      toast.error('Failed to delete patient');
    }
  };

  const handleToggleArchive = async (id, currentStatus) => {
    const isArchived = currentStatus === 'Archived';
    const newStatus = isArchived ? 'Active' : 'Archived';
    const actionText = isArchived ? 'unarchive' : 'archive';

    if (!window.confirm(`Are you sure you want to ${actionText} this patient?`)) return;

    try {
      if (id.toString().startsWith('mock-') || id.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        
        const updated = demoPatients.map(p => {
          if (p._id === id) {
            const changes = `Status: "${currentStatus}" -> "${newStatus}"`;
            const logEntry = {
              editedByName: user?.fullName || 'Clinical Staff',
              action: isArchived ? 'Patient Unarchived' : 'Patient Archived',
              timestamp: new Date().toISOString(),
              changes
            };
            return {
              ...p,
              status: newStatus,
              editLog: [...(p.editLog || []), logEntry]
            };
          }
          return p;
        });

        localStorage.setItem('demo_patients', JSON.stringify(updated));
        toast.success(`Patient ${isArchived ? 'unarchived' : 'archived'} successfully`);
      } else {
        await api.put(`/patients/${id}`, { status: newStatus });
        toast.success(`Patient ${isArchived ? 'unarchived' : 'archived'} successfully`);
      }
      fetchPatients();
    } catch {
      toast.error(`Failed to ${actionText} patient`);
    }
  };

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  // Client-Side Search, Filtering, and Sorting on combined dataset
  const getFilteredAndSortedPatients = () => {
    let result = [...patients];

    // 1. Search (Extended search across fields)
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => 
        p.patientName.toLowerCase().includes(s) ||
        (p.surgeryType && p.surgeryType.toLowerCase().includes(s)) ||
        (p.mobileNumber && p.mobileNumber.toLowerCase().includes(s))
      );
    }

    // 2. Status Filter
    if (status) {
      result = result.filter(p => p.status === status);
    } else {
      // Exclude Archived and Discharged by default when 'All Status' is chosen on main active patients page
      result = result.filter(p => p.status !== 'Archived' && p.status !== 'Discharged');
    }

    // 3. Gender Filter
    if (genderFilter) {
      result = result.filter(p => p.gender === genderFilter);
    }

    // 4. Appointed Nurse Filter
    if (nurseFilter === 'appointed') {
      result = result.filter(p => p.appointedNurse);
    } else if (nurseFilter === 'unappointed') {
      result = result.filter(p => !p.appointedNurse);
    }

    // 5. OT Room Filter
    if (otFilter === 'allotted') {
      result = result.filter(p => p.otRoom);
    } else if (otFilter === 'unallotted') {
      result = result.filter(p => !p.otRoom);
    }

    // 6. Advanced Sorting
    result.sort((a, b) => {
      const surgeriesA = surgeryMap[a._id] || [];
      const surgeriesB = surgeryMap[b._id] || [];
      const totalBloodA = surgeriesA.reduce((sum, s) => sum + (s.totalBloodLoss || 0), 0);
      const totalBloodB = surgeriesB.reduce((sum, s) => sum + (s.totalBloodLoss || 0), 0);

      switch (sortBy) {
        case 'name-asc':
          return a.patientName.localeCompare(b.patientName);
        case 'name-desc':
          return b.patientName.localeCompare(a.patientName);
        case 'date-oldest':
          return new Date(a.createdAt || a.surgeryDate) - new Date(b.createdAt || b.surgeryDate);
        case 'weight-desc':
          return (b.weight || 0) - (a.weight || 0);
        case 'weight-asc':
          return (a.weight || 0) - (b.weight || 0);
        case 'surgeries-desc':
          return surgeriesB.length - surgeriesA.length;
        case 'surgeries-asc':
          return surgeriesA.length - surgeriesB.length;
        case 'blood-desc':
          return totalBloodB - totalBloodA;
        case 'blood-asc':
          return totalBloodA - totalBloodB;
        case 'date-newest':
        default:
          return new Date(b.createdAt || b.surgeryDate) - new Date(a.createdAt || a.surgeryDate);
      }
    });

    return result;
  };

  const processedPatients = getFilteredAndSortedPatients();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Patients</h2>
          <p className="text-slate-500 text-sm mt-1">{processedPatients.length} patient{processedPatients.length !== 1 ? 's' : ''} found</p>
        </div>
        <button onClick={() => navigate(`/${role}/patients/add`)} className={`btn-primary ${role === 'nurse' ? '!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-glow' : ''}`}>
          <FaPlus /> Add Patient
        </button>
      </div>

      {/* Advanced Filters & Sorting Panel */}
      <div className="card !p-6 space-y-4 !bg-dark-card border-dark-border">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Extended Search */}
          <div className="relative flex-1 w-full">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, surgery type, or phone..."
              className="input pl-10"
            />
          </div>
          
          {/* Sorting controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap"><FaSortAmountDown /> Sort By:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input py-2.5 !bg-slate-900 border-slate-800 text-xs w-full md:w-auto">
              <option value="date-newest">Date Added (Newest)</option>
              <option value="date-oldest">Date Added (Oldest)</option>
              <option value="name-asc">Patient Name (A-Z)</option>
              <option value="name-desc">Patient Name (Z-A)</option>
              <option value="weight-desc">Weight (Highest)</option>
              <option value="weight-asc">Weight (Lowest)</option>
              <option value="surgeries-desc">Surgeries Count (Highest)</option>
              <option value="surgeries-asc">Surgeries Count (Lowest)</option>
              <option value="blood-desc">Total Blood Loss (Highest)</option>
              <option value="blood-asc">Total Blood Loss (Lowest)</option>
            </select>
          </div>
        </div>

        {/* Filter Selection Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/40">
          <div>
            <label className="label text-[10px] mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input py-2 !bg-slate-900 border-slate-800 text-xs">
              <option value="">All Active Patients</option>
              <option value="Active">Active</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="label text-[10px] mb-1">Gender</label>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="input py-2 !bg-slate-900 border-slate-800 text-xs">
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label text-[10px] mb-1">Appointed Nurse</label>
            <select value={nurseFilter} onChange={e => setNurseFilter(e.target.value)} className="input py-2 !bg-slate-900 border-slate-800 text-xs">
              <option value="">All Appointed Status</option>
              <option value="appointed">Nurse Appointed</option>
              <option value="unappointed">Unappointed</option>
            </select>
          </div>
          <div>
            <label className="label text-[10px] mb-1">OT Room</label>
            <select value={otFilter} onChange={e => setOtFilter(e.target.value)} className="input py-2 !bg-slate-900 border-slate-800 text-xs">
              <option value="">All OT Status</option>
              <option value="allotted">OT Room Allotted</option>
              <option value="unallotted">Unallotted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-44 !bg-slate-800/20 !border-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : processedPatients.length === 0 ? (
        <div className="card text-center py-20 border-dashed border-2 border-slate-800 bg-transparent">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaUser className="text-3xl text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-400">No Patients Found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-8 max-w-xs mx-auto">
            Try adjusting your search criteria, filter options, or status parameters.
          </p>
          <button onClick={() => navigate(`/${role}/patients/add`)} className={`btn-primary mx-auto !px-8 ${role === 'nurse' ? '!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-glow' : ''}`}>
            <FaPlus /> Add New Patient
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedPatients.map((p, i) => {
            const patientSurgeries = surgeryMap[p._id] || [];
            const lastSurgery = patientSurgeries[0] || null;
            const isExpanded = expanded === p._id;

            return (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card !p-0 overflow-hidden group !bg-dark-card !border-dark-border"
              >
                {/* Card top accent */}
                <div className={`h-1 w-full ${role === 'doctor' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} />

                <div className="p-6">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border transition-all ${role === 'doctor' ? 'bg-gradient-to-br from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400' : 'bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400'}`}>
                        {p.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3
                          onClick={() => navigate(`/${role}/patients/${p._id}`)}
                          className={`font-bold text-white text-base tracking-tight transition-colors cursor-pointer hover:underline underline-offset-2 ${role === 'doctor' ? 'hover:text-primary-400' : 'hover:text-emerald-400'}`}
                        >
                          {p.patientName}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{p.age} YRS • {p.gender}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={statusColors(role)[p.status] || 'badge-gray'}>{p.status}</span>
                      {patientSurgeries.length > 0 && (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${role === 'doctor' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                          {patientSurgeries.length} {patientSurgeries.length === 1 ? 'surgery' : 'surgeries'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500 shrink-0">
                        <MdBloodtype className="text-base" />
                      </div>
                      <span className="truncate font-medium text-[13px]">{p.surgeryType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 px-1">
                      <span className="flex items-center gap-1.5"><FaHospital className="text-[10px]" /> {p.weight} kg</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="flex items-center gap-1.5">
                        <FaCalendarAlt className="text-[10px]" />
                        {new Date(p.surgeryDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {p.allergies && p.allergies !== 'None' && (
                      <div className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                        🚨 {p.allergies.toUpperCase()}
                      </div>
                    )}
                    {p.otRoom && (
                      <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border inline-flex items-center gap-1.5 ${role === 'doctor' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                        <FaHospital className="text-[8px]" /> ALLOTTED: {p.otRoom}
                      </div>
                    )}
                  </div>

                  {/* Last surgery summary */}
                  {lastSurgery && (
                    <div className="bg-slate-800/30 border border-slate-800/50 rounded-2xl p-3 mb-4">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">
                        Last Surgery — {new Date(lastSurgery.surgeryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[8px] text-red-400 font-black uppercase tracking-widest">Blood Loss</p>
                          <p className="text-sm font-black text-red-400">{lastSurgery.totalBloodLoss || 0} <span className="text-[9px] opacity-50">ml</span></p>
                        </div>
                        <div className="text-center">
                          <p className={`text-[8px] font-black uppercase tracking-widest ${role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`}>Fluid Loss</p>
                          <p className={`text-sm font-black ${role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`}>{lastSurgery.totalFluidLoss || 0} <span className="text-[9px] opacity-50">ml</span></p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-amber-400 font-black uppercase tracking-widest">Duration</p>
                          <p className="text-sm font-black text-amber-400">{lastSurgery.surgeryDuration || 0} <span className="text-[9px] opacity-50">hrs</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable: All surgeries list */}
                  {patientSurgeries.length > 0 && (
                    <>
                      <button
                        onClick={() => toggleExpand(p._id)}
                        className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white py-1 mb-3 transition-colors"
                      >
                        {isExpanded ? <><FaChevronUp className="text-[9px]" /> Hide All Surgeries</> : <><FaChevronDown className="text-[9px]" /> View All {patientSurgeries.length} {patientSurgeries.length === 1 ? 'Surgery' : 'Surgeries'}</>}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden mb-4"
                          >
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {patientSurgeries.map((s, idx) => (
                                <div key={s._id} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${role === 'doctor' ? 'text-primary-400' : 'text-emerald-400'}`}>
                                      Surgery #{patientSurgeries.length - idx}
                                    </span>
                                    <span className="text-[9px] text-slate-600 font-bold">
                                      {new Date(s.surgeryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-[9px] text-slate-500 font-bold">Blood Loss</span>
                                      <span className="text-[9px] font-black text-red-400">{s.totalBloodLoss || 0} ml</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[9px] text-slate-500 font-bold">Fluid Loss</span>
                                      <span className={`text-[9px] font-black ${role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`}>{s.totalFluidLoss || 0} ml</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[9px] text-slate-500 font-bold">Urine</span>
                                      <span className="text-[9px] font-black text-violet-400">{s.urineCollected || 0} ml</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[9px] text-slate-500 font-bold">Duration</span>
                                      <span className="text-[9px] font-black text-amber-400">{s.surgeryDuration || 0} hrs</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}

                  {/* Actions */}
                  {allottingId === p._id ? (
                    <div className="flex flex-col gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-700">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Select OT Room</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['OT 1', 'OT 2', 'OT 3', 'OT 4'].map(room => (
                          <button
                            key={room}
                            onClick={() => handleAllotOT(p._id, room)}
                            className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${p.otRoom === room ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                          >
                            {room}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setAllottingId(null)} className="text-[10px] font-bold text-slate-500 hover:text-white mt-1">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap items-center">
                      <button onClick={() => navigate(`/${role}/patients/${p._id}`)} className="btn-secondary !py-2.5 !px-3 flex-1 !text-[10px] !font-black !rounded-xl">
                        <FaEye /> DETAILS
                      </button>
                      {role === 'nurse' && (
                        <button
                          onClick={() => setAllottingId(p._id)}
                          className="btn-secondary !py-2.5 !px-3 flex-1 !text-[10px] !font-black !rounded-xl border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                        >
                          ALLOT OT
                        </button>
                      )}
                      <button onClick={() => navigate(`/${role}/surgery/${p._id}/step1`)} className={`btn-primary !py-2.5 !px-3 flex-1 !text-[10px] !font-black !rounded-xl ${role === 'nurse' ? '!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-glow' : ''}`}>
                        <FaProcedures className="text-[10px]" /> SURGERY
                      </button>
                      
                      {/* Archive/Unarchive button */}
                      <button 
                        onClick={() => handleToggleArchive(p._id, p.status)} 
                        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
                          p.status === 'Archived'
                            ? 'text-emerald-400 hover:text-white bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-600'
                            : 'text-slate-400 hover:text-amber-400 bg-slate-800/40 border-slate-800 hover:bg-amber-500/10 hover:border-amber-500/20'
                        }`}
                        title={p.status === 'Archived' ? 'Unarchive Patient' : 'Archive Patient'}
                      >
                        <FaArchive className="text-xs" />
                      </button>

                      {/* Delete button */}
                      <button onClick={() => handleDelete(p._id, p.patientName)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
