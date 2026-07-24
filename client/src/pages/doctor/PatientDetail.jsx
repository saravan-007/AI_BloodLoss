import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaArrowLeft, FaTint, FaProcedures, FaUser, FaPlus, FaCalendarAlt, 
  FaDownload, FaEdit, FaBrain, FaReply, FaChevronDown, FaChevronUp, 
  FaArchive, FaClock, FaTimes, FaSave, FaCheckCircle, FaShieldAlt,
  FaHeartbeat, FaClipboardList, FaCapsules, FaExclamationTriangle
} from 'react-icons/fa';
import { MdBloodtype, MdClose } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import jsPDF from 'jspdf';
import AIChatbot from '../../components/AIChatbot';

const Field = ({ label, value, unit = '' }) => (
  <div>
    <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest">{label}</div>
    <div className="text-white font-bold text-base mt-1">{value ?? '—'}<span className="text-[10px] text-slate-600 ml-1">{unit && value ? unit : ''}</span></div>
  </div>
);

const severityColor = {
  Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  High:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Medium:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Low:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const riskBg = {
  Critical: 'from-red-900/60 to-rose-950 border-red-500/30',
  High:     'from-orange-900/60 to-amber-950 border-orange-500/30',
  Moderate: 'from-amber-900/60 to-yellow-950 border-amber-500/30',
  Low:      'from-emerald-900/60 to-teal-950 border-emerald-500/30',
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nurses, setNurses] = useState([]);
  
  // Note/Replies States
  const [dailyNote, setDailyNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [replyText, setReplyText] = useState({});   // noteId -> text
  const [savingReply, setSavingReply] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [expandedAI, setExpandedAI] = useState(null);
  
  // AI Assistant States
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    mobileNumber: '',
    weight: '',
    bloodGroup: '',
    surgeryType: '',
    allergies: 'None',
    medicalNotes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let liveData = { patient: null, surgeries: [] };
      try {
        const r = await api.get(`/patients/${id}`);
        liveData = r.data;
      } catch (err) { /* Live API failed */ }

      const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
      const demoSurgeries = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');
      const localPatient = demoPatients.find(p => p._id === id);
      const localSurgeries = demoSurgeries.filter(s => {
        const sPid = s.patientId?._id || s.patientId;
        return sPid === id;
      });

      const patient = liveData.patient || localPatient;
      const allSurgeries = [...localSurgeries, ...(liveData.surgeries || [])];
      const uniqueSurgeries = Array.from(new Map(allSurgeries.map(s => [s._id, s])).values());
      uniqueSurgeries.sort((a, b) => new Date(b.surgeryDate) - new Date(a.surgeryDate));

      if (patient) setData({ patient, surgeries: uniqueSurgeries });
      else setData(null);
    } catch (err) {
      toast.error('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchNurses = async () => {
      try {
        const { data } = await api.get('/auth/nurses');
        const demoNurses = JSON.parse(localStorage.getItem('demo_nurses') || '[]');
        const combined = [...data];
        demoNurses.forEach(dn => { if (!combined.find(n => n._id === dn._id)) combined.push(dn); });
        setNurses(combined);
      } catch (err) {
        setNurses(JSON.parse(localStorage.getItem('demo_nurses') || '[]'));
      }
    };
    if (role === 'doctor') fetchNurses();
  }, [role]);

  const handleUpdateNurse = async (nurseId) => {
    try {
      if (id.toString().startsWith('mock-') || id.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const oldP = demoPatients.find(p => p._id === id);
        
        const logEntry = {
          editedByName: user?.fullName || 'Clinical Staff',
          action: 'Nurse Appointed',
          timestamp: new Date().toISOString(),
          changes: `Nurse ID: "${oldP?.appointedNurse || 'None'}" -> "${nurseId || 'None'}"`
        };

        const updated = demoPatients.map(p => p._id === id ? { 
          ...p, 
          appointedNurse: nurseId,
          editLog: [...(p.editLog || []), logEntry]
        } : p);

        localStorage.setItem('demo_patients', JSON.stringify(updated));
        setData(prev => ({ 
          ...prev, 
          patient: { 
            ...prev.patient, 
            appointedNurse: nurseId,
            editLog: [...(prev.patient.editLog || []), logEntry]
          } 
        }));
        toast.success('Demo nurse appointed');
      } else {
        await api.put(`/patients/${id}`, { appointedNurse: nurseId });
        toast.success('Nurse appointed successfully');
        fetchData();
      }
    } catch (err) { toast.error('Failed to update nurse'); }
  };

  const handleDischarge = async () => {
    if (!window.confirm('Are you sure you want to discharge this patient?')) return;
    try {
      if (id.toString().startsWith('mock-') || id.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const oldP = demoPatients.find(p => p._id === id);

        const logEntry = {
          editedByName: user?.fullName || 'Clinical Staff',
          action: 'Patient Discharged',
          timestamp: new Date().toISOString(),
          changes: `Status: "${oldP?.status || 'Active'}" -> "Discharged"`
        };

        const updated = demoPatients.map(p => p._id === id ? { 
          ...p, 
          status: 'Discharged', 
          dischargedAt: new Date().toISOString(),
          editLog: [...(p.editLog || []), logEntry]
        } : p);

        localStorage.setItem('demo_patients', JSON.stringify(updated));
        setData(prev => ({ 
          ...prev, 
          patient: { 
            ...prev.patient, 
            status: 'Discharged', 
            dischargedAt: new Date().toISOString(),
            editLog: [...(prev.patient.editLog || []), logEntry]
          } 
        }));
        toast.success('Patient discharged successfully');
      } else {
        await api.put(`/patients/${id}`, { status: 'Discharged' });
        toast.success('Patient discharged successfully');
        fetchData();
      }
    } catch (err) { toast.error('Failed to discharge patient'); }
  };

  const handleToggleArchive = async (currentStatus) => {
    const isArchived = currentStatus === 'Archived';
    const newStatus = isArchived ? 'Active' : 'Archived';
    const actionText = isArchived ? 'unarchive' : 'archive';

    if (!window.confirm(`Are you sure you want to ${actionText} this patient?`)) return;

    try {
      if (id.toString().startsWith('mock-') || id.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const oldP = demoPatients.find(p => p._id === id);

        const logEntry = {
          editedByName: user?.fullName || 'Clinical Staff',
          action: isArchived ? 'Patient Unarchived' : 'Patient Archived',
          timestamp: new Date().toISOString(),
          changes: `Status: "${currentStatus}" -> "${newStatus}"`
        };

        const updated = demoPatients.map(p => p._id === id ? { 
          ...p, 
          status: newStatus,
          editLog: [...(p.editLog || []), logEntry]
        } : p);

        localStorage.setItem('demo_patients', JSON.stringify(updated));
        setData(prev => ({ 
          ...prev, 
          patient: { 
            ...prev.patient, 
            status: newStatus,
            editLog: [...(prev.patient.editLog || []), logEntry]
          } 
        }));
      } else {
        await api.put(`/patients/${id}`, { status: newStatus });
      }
      toast.success(`Patient ${isArchived ? 'unarchived' : 'archived'} successfully`);
      fetchData();
    } catch {
      toast.error(`Failed to ${actionText} patient`);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      if (id.toString().startsWith('mock-') || id.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const oldP = demoPatients.find(p => p._id === id);

        const changes = [];
        const fields = ['patientName', 'age', 'gender', 'mobileNumber', 'weight', 'bloodGroup', 'surgeryType', 'allergies', 'medicalNotes'];
        fields.forEach(f => {
          if (String(editForm[f]) !== String(oldP[f] || '')) {
            const label = f.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            changes.push(`${label}: "${oldP[f] || 'None'}" -> "${editForm[f] || 'None'}"`);
          }
        });

        const logEntry = {
          editedByName: user?.fullName || 'Clinical Staff',
          action: 'Profile Updated',
          timestamp: new Date().toISOString(),
          changes: changes.join(', ')
        };

        const updated = demoPatients.map(p => {
          if (p._id === id) {
            return {
              ...p,
              ...editForm,
              editLog: changes.length > 0 ? [...(p.editLog || []), logEntry] : (p.editLog || [])
            };
          }
          return p;
        });

        localStorage.setItem('demo_patients', JSON.stringify(updated));
        setData(prev => ({ 
          ...prev, 
          patient: { 
            ...prev.patient, 
            ...editForm,
            editLog: changes.length > 0 ? [...(prev.patient.editLog || []), logEntry] : (prev.patient.editLog || [])
          } 
        }));
      } else {
        await api.put(`/patients/${id}`, editForm);
      }
      setIsEditingProfile(false);
      toast.success('Patient dossier updated successfully!');
      fetchData();
    } catch {
      toast.error('Failed to update patient dossier');
    }
  };

  const handleSaveDailyNote = async () => {
    if (!dailyNote.trim()) { toast.error('Please enter note'); return; }
    try {
      setSavingNote(true);
      await api.post(`/patients/${id}/daily-note`, { note: dailyNote });
      toast.success('Daily note saved');
      setDailyNote('');
      fetchData();
    } catch (err) {
      toast.error('Failed to save daily note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveReply = async (noteId) => {
    const reply = (replyText[noteId] || '').trim();
    if (!reply) { toast.error('Please enter a reply'); return; }
    setSavingReply(noteId);
    try {
      await api.put(`/patients/${id}/daily-note/${noteId}/reply`, { reply });
      toast.success('Reply sent');
      setReplyText(prev => ({ ...prev, [noteId]: '' }));
      fetchData();
    } catch (err) {
      // Fallback update locally
      setData(prev => {
        const updatedNotes = prev.patient.dailyNotes.map(n => {
          if (n._id === noteId) {
            return {
              ...n,
              replies: [...(n.replies || []), {
                reply,
                repliedByName: user?.fullName || 'Nurse',
                repliedAt: new Date().toISOString()
              }]
            };
          }
          return n;
        });
        return { ...prev, patient: { ...prev.patient, dailyNotes: updatedNotes } };
      });
      toast.success('Reply sent');
      setReplyText(prev => ({ ...prev, [noteId]: '' }));
    } finally {
      setSavingReply(null);
    }
  };

  const handleDownloadPDF = (surgery, patient) => {
    const doc = new jsPDF();
    const lineH = 8;
    let y = 20;
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Surgery Report — Blood Loss & Fluid Monitor', 15, 20);
    y = 40;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Patient Information', 15, y); y += lineH;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    [
      ['Name:', patient.patientName],
      ['Age / Gender:', `${patient.age} yrs / ${patient.gender}`],
      ['Weight:', `${patient.weight} kg`],
      ['Blood Group:', patient.bloodGroup || 'Not recorded'],
      ['Surgery Type:', patient.surgeryType],
      ['Surgery Date:', new Date(surgery.surgeryDate).toLocaleDateString('en-IN')],
      ['Allergies:', patient.allergies || 'None'],
    ].forEach(([k, v]) => { doc.text(`${k} ${v}`, 15, y); y += lineH; });
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Blood Loss Calculations', 15, y); y += lineH;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    [
      ['Small Gauze Blood:', `${surgery.smallGauzeBlood} ml`],
      ['Large Gauze Blood:', `${surgery.largeGauzeBlood} ml`],
      ['Total Gauze Blood:', `${surgery.totalGauzeBlood} ml`],
      ['Suction Blood:', `${surgery.suctionBlood} ml`],
      ['Total Blood Loss:', `${surgery.totalBloodLoss} ml`],
    ].forEach(([k, v]) => { doc.text(`${k} ${v}`, 15, y); y += lineH; });
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Fluid Balance', 15, y); y += lineH;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    [
      ['Surgery Duration:', `${surgery.surgeryDuration} hours`],
      ['Insensible Loss:', `${surgery.insensibleLoss} ml`],
      ['Urine Collected:', `${surgery.urineCollected} ml`],
      ['Total Fluid Loss:', `${surgery.totalFluidLoss} ml`],
    ].forEach(([k, v]) => { doc.text(`${k} ${v}`, 15, y); y += lineH; });
    doc.save(`Surgery_Report_${patient.patientName.replace(/ /g, '_')}.pdf`);
    toast.success('PDF report downloaded!');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className={`w-10 h-10 border-4 ${role === 'doctor' ? 'border-primary-600' : 'border-emerald-600'} border-t-transparent rounded-full animate-spin`} />
    </div>
  );

  if (!data) return <div className="text-center py-20 text-slate-500">Patient not found</div>;

  const { patient, surgeries } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-6 flex-wrap">
        <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all"><FaArrowLeft /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-black text-white truncate tracking-tight">{patient.patientName}</h2>
          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-black uppercase tracking-widest mt-2 flex-wrap">
            <span>{patient.surgeryType}</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>{patient.age} YRS • {patient.gender}</span>
            {patient.bloodGroup && (<><span className="w-1 h-1 rounded-full bg-slate-700" /><span className="text-red-400">{patient.bloodGroup}</span></>)}
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className={`px-2 py-0.5 rounded-lg border ${patient.status === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : patient.status === 'Active' ? (role === 'doctor' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20') : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{patient.status}</span>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Edit Button */}
          <button 
            onClick={() => {
              setEditForm({
                patientName: patient.patientName || '',
                age: patient.age || '',
                gender: patient.gender || 'Male',
                mobileNumber: patient.mobileNumber || '',
                weight: patient.weight || '',
                bloodGroup: patient.bloodGroup || '',
                surgeryType: patient.surgeryType || '',
                allergies: patient.allergies || 'None',
                medicalNotes: patient.medicalNotes || ''
              });
              setIsEditingProfile(true);
            }} 
            className="btn-secondary !py-3 !px-6 !text-xs !font-black !rounded-xl active:scale-95 transition-transform flex items-center gap-2 border-blue-500/25 hover:bg-blue-500/10 hover:text-blue-400"
          >
            <FaEdit /> EDIT DOSSIER
          </button>

          {/* AI Assistant Button */}
          <button 
            onClick={() => setShowAiAssistant(true)} 
            className="btn-secondary !py-3 !px-6 !text-xs !font-black !rounded-xl active:scale-95 transition-transform flex items-center gap-2 border-violet-500/25 hover:bg-violet-500/10 hover:text-violet-400"
          >
            <FaBrain className="text-violet-400 animate-pulse" /> AI ASSISTANT
          </button>

          {/* Archive Button */}
          <button 
            onClick={() => handleToggleArchive(patient.status)} 
            className={`btn-secondary !py-3 !px-6 !text-xs !font-black !rounded-xl active:scale-95 transition-transform flex items-center gap-2 border-amber-500/25 ${patient.status === 'Archived' ? 'bg-amber-500/10 text-amber-400' : 'hover:bg-amber-500/10 hover:text-amber-400'}`}
          >
            <FaArchive /> {patient.status === 'Archived' ? 'UNARCHIVE PATIENT' : 'ARCHIVE PATIENT'}
          </button>

          {patient.status !== 'Discharged' && patient.status !== 'Archived' && (
            <button onClick={handleDischarge} className="btn-secondary !py-3 !px-8 !text-xs !font-black !rounded-xl active:scale-95 transition-transform flex items-center gap-2 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-400">
              DISCHARGE
            </button>
          )}

          {patient.status !== 'Archived' && (
            <button onClick={() => navigate(`/${role}/surgery/${id}/step1`)} className={`btn-primary !py-3 !px-8 !text-xs !font-black !rounded-xl active:scale-95 transition-transform flex items-center gap-2 ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`}>
              <MdBloodtype className="text-lg" /> NEW SURGERY
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Patient Profile */}
        <div className="space-y-6">
          <div className="card !p-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-white text-4xl font-black transition-all ${role === 'doctor' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-glow' : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-glow'}`}>
                {patient.patientName.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border-4 border-dark-card flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full ${patient.status === 'Active' ? 'bg-emerald-500' : (patient.status === 'Critical' ? 'bg-red-500' : 'bg-slate-500')}`} />
              </div>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">{patient.patientName}</h3>
            <p className="text-slate-500 font-bold text-sm mt-1 mb-4">{patient.mobileNumber || 'No contact provided'}</p>
            <span className={patient.status === 'Active' ? (role === 'doctor' ? 'badge-blue' : 'badge-green') : patient.status === 'Critical' ? 'badge-red' : 'badge-green'}>{patient.status}</span>

            <div className="w-full h-px bg-slate-800/50 my-8" />

            <div className="grid grid-cols-2 gap-y-6 w-full text-left">
              <Field label="Age" value={patient.age} unit="years" />
              <Field label="Weight" value={patient.weight} unit="kg" />
              <Field label="Blood Group" value={patient.bloodGroup || 'Not recorded'} />
              <Field label="Surgery Type" value={patient.surgeryType} />
              <Field label="Date" value={new Date(patient.surgeryDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} />
              {patient.dischargedAt && <Field label="Discharged" value={new Date(patient.dischargedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} />}
            </div>

            <div className="w-full h-px bg-slate-800/50 my-8" />

            <div className="w-full text-left space-y-4">
              {role === 'doctor' && (
                <div>
                  <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-2">👩‍⚕️ Appointed Nurse</div>
                  <select value={patient.appointedNurse || ''} onChange={(e) => handleUpdateNurse(e.target.value)} className="input !bg-slate-800/40 border-slate-800 !py-2 !text-xs">
                    <option value="">None Appointed</option>
                    {nurses.map(n => (<option key={n._id} value={n._id}>{n.fullName}</option>))}
                  </select>
                </div>
              )}
              <div>
                <div className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-2">🚨 Allergies</div>
                <div className="text-sm font-medium text-slate-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{patient.allergies || 'NONE REPORTED'}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-2">📝 Clinical Notes</div>
                <div className="text-sm font-medium text-slate-400 leading-relaxed">{patient.medicalNotes || 'No additional notes provided.'}</div>
              </div>

              {/* MEDICAL HISTORY AUDIT LOG TIMELINE */}
              <div className="mt-8 pt-6 border-t border-slate-850">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <FaClock className="text-[10px] text-slate-500" /> Clinical Audit Trail
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-slate-900 text-slate-400 border border-slate-800">
                    {patient.editLog?.length || 0} LOGS
                  </span>
                </div>

                {patient.editLog?.length > 0 ? (
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {patient.editLog.slice().reverse().map((log, logIdx) => (
                      <div key={log._id || logIdx} className="relative pl-6 pb-2 border-l border-slate-800 last:border-0 last:pb-0">
                        {/* Timeline dot */}
                        <span className="absolute left-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-900 group-hover:bg-primary-500 transition-colors animate-pulse-slow" />
                        
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[11px] font-black text-slate-350">{log.action || 'Edit Made'}</span>
                          <span className="text-[9px] text-slate-600 font-bold">
                            {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-normal">
                          By <strong className="text-slate-400">{log.editedByName || 'Clinical Staff'}</strong>: {log.changes || 'No detailed change description.'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-650 font-bold uppercase tracking-wide italic py-2">No history updates recorded yet.</p>
                )}
              </div>

              {/* DAILY NOTES */}
              <div className="mt-8 pt-6 border-t border-slate-850">
                <div className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-3">📅 Daily Ward Notes</div>

                {/* Doctor can add notes */}
                {role === 'doctor' && (
                  <div className="space-y-3 mb-4">
                    <textarea
                      value={dailyNote}
                      onChange={(e) => setDailyNote(e.target.value)}
                      placeholder="Write today's patient update..."
                      className="input min-h-[100px]"
                    />
                    <button onClick={handleSaveDailyNote} disabled={savingNote} className="btn-primary w-full">
                      {savingNote ? 'Saving...' : 'Save Daily Note'}
                    </button>
                  </div>
                )}

                {/* Show all notes with nurse reply support */}
                <div className="space-y-3">
                  {patient.dailyNotes?.length > 0 ? (
                    patient.dailyNotes.slice().reverse().map((n, idx) => (
                      <div key={n._id || idx} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-xs text-blue-400 font-bold">Dr. {n.addedByName || 'Doctor'}</span>
                          <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-sm text-slate-300 mb-3">{n.note}</div>

                        {/* Replies */}
                        {n.replies && n.replies.length > 0 && (
                          <div className="space-y-2 mb-3 pl-3 border-l-2 border-emerald-500/30">
                            {n.replies.map((r, ri) => (
                              <div key={ri} className="bg-emerald-500/5 rounded-lg p-3">
                                <div className="flex justify-between mb-1">
                                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">↩ {r.repliedByName || 'Nurse'}</span>
                                  <span className="text-[10px] text-slate-650">{new Date(r.repliedAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-300">{r.reply}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Nurse reply input */}
                        {role === 'nurse' && (
                          <div className="mt-3">
                            <button
                              onClick={() => setExpandedNote(expandedNote === (n._id || idx) ? null : (n._id || idx))}
                              className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1.5 hover:text-emerald-300 transition-colors"
                            >
                              <FaReply className="text-[9px]" />
                              {expandedNote === (n._id || idx) ? 'Cancel Reply' : 'Reply to Note'}
                            </button>
                            <AnimatePresence>
                              {expandedNote === (n._id || idx) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-2"
                                >
                                  <textarea
                                    value={replyText[n._id || idx] || ''}
                                    onChange={e => setReplyText(prev => ({ ...prev, [n._id || idx]: e.target.value }))}
                                    placeholder="Write your reply..."
                                    rows={2}
                                    className="input !text-xs resize-none mb-2"
                                  />
                                  <button
                                    onClick={() => handleSaveReply(n._id || idx)}
                                    disabled={savingReply === (n._id || idx)}
                                    className="btn-success !py-2 !px-4 !text-[10px] !font-black !rounded-xl w-full !bg-emerald-600 hover:!bg-emerald-700"
                                  >
                                    {savingReply === (n._id || idx) ? 'Sending...' : 'SEND REPLY'}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-sm">No daily notes available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Surgery History */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Clinical Reports History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white tracking-tight">🧠 Previous AI Clinical Reports <span className="text-violet-400 ml-2 font-black">{(patient.aiReports || []).length}</span></h3>
            </div>

            {(patient.aiReports && patient.aiReports.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patient.aiReports.slice().reverse().map((report, rIdx) => (
                  <div key={report._id || rIdx} className="card !p-5 bg-violet-950/10 border-violet-500/10 hover:border-violet-500/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {new Date(report.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${severityColor[report.overallRiskLevel] || severityColor.Medium}`}>
                          {report.overallRiskLevel} Risk
                        </span>
                      </div>
                      <p className="text-xs text-slate-350 font-medium leading-relaxed line-clamp-3 mb-4">{report.summary}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedReport(report)}
                      className="btn-secondary !py-2 !px-4 !text-[10px] !font-black !rounded-xl w-full border-violet-500/30 hover:bg-violet-650/20 text-violet-300"
                    >
                      VIEW DETAILED REPORT
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-6 border-dashed border-2 border-slate-800 bg-transparent">
                <p className="text-slate-500 text-xs italic">No previous AI clinical reports saved for this patient.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-805">
            <h3 className="text-xl font-black text-white tracking-tight">Surgery History <span className="text-slate-655 ml-2 font-black">{surgeries.length}</span></h3>
          </div>

          {surgeries.length === 0 ? (
            <div className="card text-center py-20 flex flex-col items-center justify-center border-dashed border-2 border-slate-800 bg-transparent">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                <FaProcedures className="text-2xl text-slate-600" />
              </div>
              <p className="text-slate-500 font-bold text-lg">No history available</p>
              <p className="text-[11px] text-slate-655 mt-1 font-medium max-w-[200px]">The surgery workflow hasn't been started for this patient yet.</p>
              <button onClick={() => navigate(`/${role}/surgery/${id}/step1`)} className="btn-primary mt-8 !rounded-xl !px-8">Initialize Surgery</button>
            </div>
          ) : (
            <div className="space-y-6">
              {surgeries.map((s, i) => {
                const aiData = s.aiAnalysis ? (() => { try { return JSON.parse(s.aiAnalysis); } catch { return null; } })() : null;
                return (
                  <motion.div key={s._id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="card !p-0 overflow-hidden group">
                     {/* Item Header */}
                     <div className="bg-slate-850/40 p-6 flex items-center justify-between border-b border-slate-800/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black ${role === 'doctor' ? 'text-primary-400' : 'text-emerald-400'}`}>
                          #{surgeries.length - i}
                        </div>
                        <div>
                          <h4 className="font-bold text-white leading-none">Surgical Session</h4>
                          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                            <FaCalendarAlt className="text-[8px]" /> {new Date(s.surgeryDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleDownloadPDF(s, patient)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all">
                        <FaDownload className="text-sm" />
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-center">
                          <div className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-1">Blood Loss</div>
                          <div className="text-2xl font-black text-red-400">{s.totalBloodLoss || 0} <span className="text-xs font-bold opacity-50">ml</span></div>
                        </div>
                        <div className={`${role === 'doctor' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-emerald-500/5 border-emerald-500/10'} rounded-2xl p-4 text-center`}>
                          <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`}>Fluid Loss</div>
                          <div className={`text-2xl font-black ${role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`}>{s.totalFluidLoss || 0} <span className="text-xs font-bold opacity-50">ml</span></div>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-center">
                          <div className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-1">Duration</div>
                          <div className="text-2xl font-black text-amber-400">{s.surgeryDuration || 0} <span className="text-xs font-bold opacity-50">hrs</span></div>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center">
                          <div className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Urine</div>
                          <div className="text-2xl font-black text-emerald-400">{s.urineCollected || 0} <span className="text-xs font-bold opacity-50">ml</span></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2 mb-6">
                        <Field label="Suction Blood" value={s.suctionBlood} unit="ml" />
                        <Field label="Gauze Blood" value={s.totalGauzeBlood} unit="ml" />
                        <Field label="Saline Used" value={s.salineUsed} unit="ml" />
                        <Field label="Insensible Loss" value={s.insensibleLoss} unit="ml" />
                      </div>

                      {/* AI Analysis Section */}
                      {aiData && (
                        <div className="mt-4 border-t border-slate-800/50 pt-4">
                          <button
                            onClick={() => setExpandedAI(expandedAI === s._id ? null : s._id)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors mb-3"
                          >
                            <FaBrain />
                            AI Analysis Report
                            {expandedAI === s._id ? <FaChevronUp className="text-[9px]" /> : <FaChevronDown className="text-[9px]" />}
                          </button>
                          <AnimatePresence>
                            {expandedAI === s._id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
                              >
                                <div className="space-y-4 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-violet-400 font-black uppercase tracking-widest">Overall Risk:</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${severityColor[aiData.overallRiskLevel] || severityColor.Medium}`}>
                                      {aiData.overallRiskLevel}
                                    </span>
                                  </div>
                                  {aiData.summary && <p className="text-xs text-slate-400 leading-relaxed">{aiData.summary}</p>}

                                  {aiData.possibleIssues?.length > 0 && (
                                    <div>
                                      <p className="text-[9px] text-violet-400 font-black uppercase tracking-widest mb-2">Identified Issues</p>
                                      <div className="space-y-1.5">
                                        {aiData.possibleIssues.map((issue, ii) => (
                                          <div key={ii} className={`px-3 py-2 rounded-xl border text-xs ${severityColor[issue.severity] || severityColor.Medium}`}>
                                            <span className="font-black">{issue.issue}</span>
                                            {issue.description && <span className="opacity-70 ml-2">— {issue.description}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {aiData.precautionsAndRecommendations?.immediatePrecautions?.length > 0 && (
                                    <div>
                                      <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-2">Immediate Precautions</p>
                                      <ul className="space-y-1">
                                        {aiData.precautionsAndRecommendations.immediatePrecautions.map((p, pi) => (
                                          <li key={pi} className="flex items-start gap-2 text-xs text-slate-300">
                                            <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                            {p}
                                          </li>
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
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dossier Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-lg overflow-hidden shadow-card-lg"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FaEdit className="text-blue-400" /> Edit Patient Dossier
                </h3>
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800/40 text-slate-500 hover:text-white flex items-center justify-center transition-colors"
                >
                  <MdClose className="text-xl" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Patient Name</label>
                    <input 
                      type="text" 
                      required
                      value={editForm.patientName} 
                      onChange={e => setEditForm(p => ({ ...p, patientName: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label">Age (years)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={editForm.age} 
                      onChange={e => setEditForm(p => ({ ...p, age: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select 
                      value={editForm.gender} 
                      onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                      className="input"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Weight (kg)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.1"
                      value={editForm.weight} 
                      onChange={e => setEditForm(p => ({ ...p, weight: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label">Blood Group</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A+, O-"
                      value={editForm.bloodGroup} 
                      onChange={e => setEditForm(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Surgery Type</label>
                    <input 
                      type="text" 
                      required
                      value={editForm.surgeryType} 
                      onChange={e => setEditForm(p => ({ ...p, surgeryType: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Mobile Number</label>
                    <input 
                      type="text" 
                      value={editForm.mobileNumber} 
                      onChange={e => setEditForm(p => ({ ...p, mobileNumber: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">🚨 Allergies</label>
                    <input 
                      type="text" 
                      value={editForm.allergies} 
                      onChange={e => setEditForm(p => ({ ...p, allergies: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">📝 Clinical Notes</label>
                    <textarea 
                      value={editForm.medicalNotes} 
                      onChange={e => setEditForm(p => ({ ...p, medicalNotes: e.target.value }))}
                      rows={3}
                      className="input" 
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary flex-1 shadow-blue-glow"
                  >
                    <FaSave /> Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed AI Report Modal */}
      <AnimatePresence>
          {selectedReport && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-card-lg h-[80vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-805 flex items-center justify-between bg-gradient-to-r from-violet-950/20 to-indigo-950/10">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FaBrain className="text-violet-400" /> AI Report — {new Date(selectedReport.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${severityColor[selectedReport.overallRiskLevel] || severityColor.Medium}`}>
                      {selectedReport.overallRiskLevel} Risk
                    </span>
                    <button 
                      onClick={() => setSelectedReport(null)}
                      className="w-8 h-8 rounded-xl bg-slate-800/40 text-slate-500 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <MdClose className="text-xl" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                  {/* Summary */}
                  <div className={`p-4 rounded-2xl bg-gradient-to-br border ${riskBg[selectedReport.overallRiskLevel] || riskBg.Moderate}`}>
                    <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-1">Clinical Summary</p>
                    <p className="text-white text-sm leading-relaxed">{selectedReport.summary}</p>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 space-y-2">
                    <p className="text-[10px] text-violet-400 font-black uppercase tracking-widest">AI Analysis Assessment</p>
                    <p className="text-slate-300 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{selectedReport.aiAnalysis}</p>
                  </div>

                  {/* Clinical Plan sections */}
                  <div className="space-y-4">
                    {selectedReport.aiRecommendations?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 space-y-2">
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaCheckCircle className="text-[9px]" /> AI Recommendations</p>
                        <ul className="space-y-1.5 pl-2">
                          {selectedReport.aiRecommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-350 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedReport.aiPrecautions?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 space-y-2">
                        <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaShieldAlt className="text-[9px]" /> AI Precautions</p>
                        <ul className="space-y-1.5 pl-2">
                          {selectedReport.aiPrecautions.map((prec, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-350 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                              {prec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedReport.aiRisks?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 space-y-2">
                        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaExclamationTriangle className="text-[9px]" /> AI Risk Analysis</p>
                        <ul className="space-y-1.5 pl-2">
                          {selectedReport.aiRisks.map((risk, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-350 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedReport.aiSuggestedMedication?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 space-y-2">
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaCapsules className="text-[9px]" /> AI Suggested Medication</p>
                        <ul className="space-y-1.5 pl-2">
                          {selectedReport.aiSuggestedMedication.map((med, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-350 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                              {med}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedReport.aiMonitoringAdvice?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 space-y-2">
                        <p className="text-[10px] text-violet-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaHeartbeat className="text-[9px]" /> AI Monitoring Advice</p>
                        <ul className="space-y-1.5 pl-2">
                          {selectedReport.aiMonitoringAdvice.map((mon, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-350 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                              {mon}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedReport.aiFollowUpSuggestions?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 space-y-2">
                        <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaClipboardList className="text-[9px]" /> AI Follow-up Suggestions</p>
                        <ul className="space-y-1.5 pl-2">
                          {selectedReport.aiFollowUpSuggestions.map((fol, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-350 text-xs leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                              {fol}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="btn-secondary !py-2.5 !px-6 !text-xs !font-black !rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI Assistant Modal */}
        <AnimatePresence>
          {showAiAssistant && (
            <AIChatbot
              patientData={patient}
              surgeryData={surgeries[0] || {}}
              onClose={() => {
                setShowAiAssistant(false);
                fetchData(); // reload patient to get newly saved AI reports!
              }}
            />
          )}
        </AnimatePresence>
      </div>
  );
}
