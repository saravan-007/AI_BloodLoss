import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import {
  FaTint, FaProcedures, FaUsers, FaExclamationTriangle,
  FaPlus, FaChartLine, FaClock, FaRobot, FaPlay, FaStop,
  FaHeartbeat, FaChevronRight, FaRegHospital
} from 'react-icons/fa';
import { MdBloodtype, MdWarning, MdArrowForward } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const dummyTrend = [
  { date: 'Mon', avgBloodLoss: 320, count: 2 },
  { date: 'Tue', avgBloodLoss: 480, count: 3 },
  { date: 'Wed', avgBloodLoss: 250, count: 1 },
  { date: 'Thu', avgBloodLoss: 610, count: 4 },
  { date: 'Fri', avgBloodLoss: 390, count: 2 },
  { date: 'Sat', avgBloodLoss: 720, count: 5 },
  { date: 'Sun', avgBloodLoss: 180, count: 1 },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalSurgeriesToday: 0,
    totalBloodLossToday: 0,
    recentSurgeries: [],
    bloodLossTrend: dummyTrend,
    fluidLossTrend: [],
    criticalPatients: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('blood'); // 'blood' or 'fluid'

  // Live simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simData, setSimData] = useState({
    elapsedTime: 0,
    patientName: 'Ananya Sharma',
    surgeryType: 'Cardiac Bypass Surgery',
    gauzeCount: 6,
    gauzeBlood: 180,
    suctionBottleValue: 550,
    salineUsed: 250,
    suctionBlood: 300,
    urineCollected: 120,
    insensibleLoss: 54,
    hr: 98,
    bp: '118/76',
    spo2: 98,
  });

  // Real-time active surgery state (pulled from sessionStorage workflow)
  const [activeWf, setActiveWf] = useState(null);
  const [realTimerDisplay, setRealTimerDisplay] = useState('00:00');

  // Check sessionStorage for real ongoing surgery session
  const checkActiveWorkflow = () => {
    try {
      const wf = JSON.parse(sessionStorage.getItem('surgery_wf'));
      if (wf && wf.patientId) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const p = demoPatients.find(x => x._id === wf.patientId);
        
        setActiveWf({
          ...wf,
          patientName: p?.patientName || wf.patientName || 'Active Patient',
          surgeryType: p?.surgeryType || wf.surgeryType || 'Ongoing Surgery',
          startTime: wf.startTime || (Date.now() - (wf.surgeryDuration || 0) * 3600 * 1000),
          totalGauzeBlood: wf.totalGauzeBlood || 0,
          suctionBlood: wf.suctionBlood || 0,
          urineCollected: wf.urineCollected || 0,
          insensibleLoss: wf.insensibleLoss || 0,
          totalBloodLoss: wf.totalBloodLoss || (wf.totalGauzeBlood || 0) + (wf.suctionBlood || 0),
          totalFluidLoss: wf.totalFluidLoss || (wf.totalGauzeBlood || 0) + (wf.suctionBlood || 0) + (wf.urineCollected || 0) + (wf.insensibleLoss || 0)
        });
      } else {
        setActiveWf(null);
      }
    } catch {
      setActiveWf(null);
    }
  };

  useEffect(() => {
    checkActiveWorkflow();
    const interval = setInterval(checkActiveWorkflow, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stats and merge with localStorage demo records
  const fetchStats = async () => {
    try {
      let liveStats = {};
      try {
        const r = await api.get('/surgeries/stats');
        liveStats = r.data;
      } catch (err) {
        console.warn('Dashboard live stats failed, falling back to local merge');
      }

      const userId = user?.id || user?._id || null;
      const demoPatientsAll = JSON.parse(localStorage.getItem('demo_patients') || '[]');
      const demoSurgeriesAll = JSON.parse(localStorage.getItem('demo_surgeries') || '[]');

      // Scope to this logged-in doctor
      const demoPatients = demoPatientsAll.filter(p => !userId || p.createdBy === userId);
      const demoPatientIds = demoPatients.map(p => p._id);
      const demoSurgeries = demoSurgeriesAll.filter(s => !userId || s.createdBy === userId || demoPatientIds.includes(s.patientId));

      const todayStr = new Date().toISOString().split('T')[0];
      const localSurgeriesToday = demoSurgeries.filter(s => s.surgeryDate && s.surgeryDate.startsWith(todayStr));
      const localBloodLossToday = localSurgeriesToday.reduce((sum, r) => sum + (r.totalBloodLoss || 0), 0);

      const criticalDemoPatients = demoPatients.filter(p => p.status === 'Critical');

      // Merged Statistics
      const mergedStats = {
        totalPatients: (liveStats.totalPatients || 0) + demoPatients.length,
        totalSurgeriesToday: (liveStats.totalSurgeriesToday || 0) + localSurgeriesToday.length,
        totalBloodLossToday: (liveStats.totalBloodLossToday || 0) + localBloodLossToday,
        recentSurgeries: [
          ...(liveStats.recentSurgeries || []),
          ...localSurgeriesToday.map(s => ({
            ...s,
            patientId: demoPatients.find(p => p._id === s.patientId) || { patientName: s.patientName || 'Demo Patient' }
          }))
        ].sort((a, b) => new Date(b.surgeryDate) - new Date(a.surgeryDate)).slice(0, 5),
        bloodLossTrend: liveStats.bloodLossTrend || dummyTrend,
        fluidLossTrend: liveStats.fluidLossTrend || dummyTrend.map(t => ({
          ...t,
          avgUrineLoss: Math.round(t.avgBloodLoss * 0.4),
          avgInsensibleLoss: Math.round(t.avgBloodLoss * 0.25),
          avgFluidLoss: Math.round(t.avgBloodLoss * 1.65)
        })),
        criticalPatients: [
          ...(liveStats.criticalPatients || []),
          ...criticalDemoPatients
        ]
      };

      setStats(mergedStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Timer Ticking & Active Simulation Interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSimulating) {
        setSimData(prev => {
          const nextTime = prev.elapsedTime + 1;

          // Increment measurements dynamically
          let newGauze = prev.gauzeBlood;
          let newGauzeCount = prev.gauzeCount;
          let newSuction = prev.suctionBlood;
          let newUrine = prev.urineCollected;
          let newInsensible = prev.insensibleLoss;

          if (nextTime % 6 === 0) {
            newGauze += Math.floor(Math.random() * 6) + 2;
            newGauzeCount += Math.random() > 0.6 ? 1 : 0;
          }
          if (nextTime % 8 === 0) {
            newSuction += Math.floor(Math.random() * 10) + 4;
          }
          if (nextTime % 12 === 0) {
            newUrine += Math.floor(Math.random() * 4) + 1;
          }
          if (nextTime % 10 === 0) {
            newInsensible += 2;
          }

          // Fluctuating Vitals based on blood loss severity
          const totalLoss = newGauze + newSuction;
          const baselineHR = totalLoss > 750 ? 116 : (totalLoss > 500 ? 104 : 88);
          const hrFluct = Math.floor(Math.sin(nextTime / 5) * 4) + Math.floor(Math.random() * 3);
          const newHr = baselineHR + hrFluct;

          const bpSys = Math.max(85, 120 - Math.floor(totalLoss / 20) + Math.floor(Math.random() * 4 - 2));
          const bpDia = Math.max(50, 80 - Math.floor(totalLoss / 35) + Math.floor(Math.random() * 3 - 1));
          const newBp = `${bpSys}/${bpDia}`;

          const newSpo2 = totalLoss > 750 
            ? Math.max(90, 94 + Math.floor(Math.random() * 3))
            : Math.max(95, 97 + Math.floor(Math.random() * 3));

          return {
            ...prev,
            elapsedTime: nextTime,
            gauzeCount: newGauzeCount,
            gauzeBlood: newGauze,
            suctionBlood: newSuction,
            suctionBottleValue: newSuction + prev.salineUsed,
            urineCollected: newUrine,
            insensibleLoss: newInsensible,
            hr: newHr,
            bp: newBp,
            spo2: newSpo2,
          };
        });
      } else if (activeWf && activeWf.startTime) {
        const totalSecs = Math.floor((Date.now() - activeWf.startTime) / 1000);
        const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        setRealTimerDisplay(`${mins}:${secs}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulating, activeWf]);

  // Fluctuating Vitals for Database Critical Patients list
  const [criticalVitals, setCriticalVitals] = useState({});
  useEffect(() => {
    if (stats.criticalPatients.length) {
      const initial = {};
      stats.criticalPatients.forEach(p => {
        initial[p._id] = {
          hr: 104 + Math.floor(Math.random() * 8 - 4),
          bp: `${106 + Math.floor(Math.random() * 10 - 5)}/${66 + Math.floor(Math.random() * 6 - 3)}`,
          spo2: 93 + Math.floor(Math.random() * 3)
        };
      });
      setCriticalVitals(initial);

      const vitalsInterval = setInterval(() => {
        setCriticalVitals(prev => {
          const copy = { ...prev };
          stats.criticalPatients.forEach(p => {
            const current = prev[p._id] || { hr: 105, bp: '110/68', spo2: 94 };
            copy[p._id] = {
              hr: Math.min(130, Math.max(85, current.hr + Math.floor(Math.random() * 5 - 2))),
              bp: `${Math.min(125, Math.max(80, parseInt(current.bp.split('/')[0]) + Math.floor(Math.random() * 5 - 2)))}/${Math.min(85, Math.max(50, parseInt(current.bp.split('/')[1]) + Math.floor(Math.random() * 3 - 1)))}`,
              spo2: Math.min(99, Math.max(89, current.spo2 + (Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0)))
            };
          });
          return copy;
        });
      }, 3000);

      return () => clearInterval(vitalsInterval);
    }
  }, [stats.criticalPatients]);

  const getSimStopwatch = () => {
    const mins = Math.floor(simData.elapsedTime / 60).toString().padStart(2, '0');
    const secs = (simData.elapsedTime % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const activeSimulation = isSimulating;
  const simulatedBloodLoss = simData.gauzeBlood + simData.suctionBlood;
  const simulatedFluidLoss = simulatedBloodLoss + simData.urineCollected + simData.insensibleLoss;

  const currentBloodLoss = activeSimulation ? simulatedBloodLoss : (activeWf ? activeWf.totalBloodLoss : 0);
  const currentFluidLoss = activeSimulation ? simulatedFluidLoss : (activeWf ? activeWf.totalFluidLoss : 0);

  // Dynamic alerts list compiling DB + live statuses
  const getDynamicAlerts = () => {
    const list = [];
    
    // Live simulated alerts
    if (activeSimulation) {
      if (simulatedBloodLoss > 750) {
        list.push({
          id: 'sim-crit',
          type: 'critical',
          patient: simData.patientName,
          msg: `Critical Hemorrhage: Blood loss at ${simulatedBloodLoss}ml! Threshold exceeded.`,
          time: 'Live'
        });
      } else if (simulatedBloodLoss > 500) {
        list.push({
          id: 'sim-warn',
          type: 'warning',
          patient: simData.patientName,
          msg: `Hemorrhage Warning: Blood loss approaching critical level (${simulatedBloodLoss}ml).`,
          time: 'Live'
        });
      }

      if (simData.hr > 110) {
        list.push({
          id: 'sim-hr',
          type: 'warning',
          patient: simData.patientName,
          msg: `Tachycardia Warning: Heart rate elevated to ${simData.hr} bpm.`,
          time: 'Live'
        });
      }
    }

    // DB Critical Patients Alerts
    stats.criticalPatients.forEach((p, idx) => {
      list.push({
        id: `db-crit-${idx}`,
        type: 'critical',
        patient: p.patientName,
        msg: `Patient in OT/Room ${p.otRoom || 'N/A'} is marked Critical. Appointed Nurse: ${p.appointedNurse?.fullName || 'Not assigned'}`,
        time: 'Active'
      });
    });

    // Default static fallback alerts
    if (list.length === 0) {
      list.push(
        { id: 'f-1', type: 'warning', patient: 'Priya Sharma', msg: 'Fluid loss approaching threshold (600ml)', time: '8 min ago' },
        { id: 'f-2', type: 'info', patient: 'Arjun Mehta', msg: 'Surgery completed — record saved', time: '25 min ago' }
      );
    }

    return list;
  };

  const dynamicAlerts = getDynamicAlerts();

  // AI Prediction notification logic
  const getAIPrediction = () => {
    if (activeSimulation) {
      if (simulatedBloodLoss > 750) {
        return {
          riskScore: 94,
          status: 'HIGH RISK',
          color: 'text-red-400 border-red-500/20 bg-red-500/5',
          message: 'Hemorrhagic Shock highly likely. Vitals indicate Stage III shock. Recommend urgent transfusion of 2 units packed RBCs, optimization of infusion rates, and immediate local hemostatic measures.'
        };
      } else if (simulatedBloodLoss > 500) {
        return {
          riskScore: 68,
          status: 'MODERATE RISK',
          color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
          message: 'Hemorrhage predicted based on rapid gauze weight accumulation and bottle suction levels. Prepare cross-matched blood units and increase visual surveillance of the cavity.'
        };
      } else {
        return {
          riskScore: 24,
          status: 'NORMAL / STABLE',
          color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
          message: 'Hemodynamic parameters stable. Current estimated blood loss is within acceptable surgical limits. Continue routine monitoring.'
        };
      }
    } else if (activeWf) {
      const loss = activeWf.totalBloodLoss;
      if (loss > 750) {
        return {
          riskScore: 88,
          status: 'HIGH RISK',
          color: 'text-red-400 border-red-500/20 bg-red-500/5',
          message: `Active surgery blood loss is ${loss}ml. AI model predicts elevated shock risk. Suggest cross-matching RBCs.`
        };
      }
      return {
        riskScore: 18,
        status: 'MONITORING',
        color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
        message: 'Active surgery workflow detected. AI model is currently training parameters. Values are within safe margins.'
      };
    }

    return {
      riskScore: 12,
      status: 'SYSTEM CALIBRATED',
      color: 'text-slate-400 border-slate-700 bg-slate-800/20',
      message: 'No active surgeries or simulations running. AI monitoring model stands ready for intra-operative monitoring.'
    };
  };

  const aiPrediction = getAIPrediction();

  // Stat cards configurations
  const statCards = [
    {
      label: "Today's Blood Loss", value: `${stats.totalBloodLossToday + (activeSimulation ? simulatedBloodLoss : 0)} ml`,
      icon: <FaTint />, bg: 'bg-red-500/10', color: 'text-red-400', border: 'border-red-500/20'
    },
    {
      label: 'Total Patients Registered', value: stats.totalPatients,
      icon: <FaUsers />, bg: 'bg-blue-500/10', color: 'text-blue-400', border: 'border-blue-500/20'
    },
    {
      label: "Today's Surgeries", value: stats.totalSurgeriesToday + (activeSimulation ? 1 : 0),
      icon: <FaProcedures />, bg: 'bg-amber-500/10', color: 'text-amber-400', border: 'border-amber-500/20'
    },
    {
      label: 'Critical Status Patients', value: stats.criticalPatients.length + (activeSimulation && simulatedBloodLoss > 750 ? 1 : 0),
      icon: <FaExclamationTriangle />, bg: 'bg-rose-500/10', color: 'text-rose-400', border: 'border-rose-500/20'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner & Start controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-900/80 to-indigo-950 p-8 md:p-12 border border-blue-500/20 shadow-glow"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Good morning, {user?.fullName?.split(' ')[0] || 'Doctor'} 👋
            </h2>
            <p className="text-blue-300/80 font-medium mt-2 flex items-center gap-2">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="w-1 h-1 rounded-full bg-blue-500/50" />
              <span className="uppercase tracking-widest text-[11px] font-bold">{user?.role || 'Doctor'}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => navigate('/doctor/start-surgery')}
              className="group btn-primary btn-lg !rounded-2xl flex items-center gap-3 active:scale-95 transition-transform"
            >
              <FaPlus className="text-sm group-hover:rotate-90 transition-transform duration-300" />
              <span>Start New Surgery</span>
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mb-10" />
      </motion.div>

      {/* Real-time Ticking Panel (Active Surgery or Simulation) */}
      {(isSimulating || activeWf) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="card border-l-4 border-primary-500 !p-8 bg-gradient-to-br from-slate-900/60 to-indigo-950/40 backdrop-blur-md relative overflow-hidden"
        >
          {/* Pulsing indicator */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">LIVE SURGERY SESSION</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Stopwatch & Info */}
            <div className="lg:col-span-1 space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Ongoing Patient</p>
                <h3 className="text-2xl font-black text-white mt-1 leading-tight">{isSimulating ? simData.patientName : activeWf.patientName}</h3>
                <p className="text-primary-400 text-xs font-bold mt-1 uppercase tracking-wide">{isSimulating ? simData.surgeryType : activeWf.surgeryType}</p>
              </div>

              {/* Glowing Timer */}
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center text-lg">
                  <FaClock />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">ELAPSED TIME</p>
                  <p className="text-2xl font-black font-mono text-white tracking-widest mt-0.5">
                    {isSimulating ? getSimStopwatch() : realTimerDisplay}
                  </p>
                </div>
              </div>

              {/* Vitals monitor */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-center">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider block">HR (bpm)</span>
                  <span className="text-sm font-black text-rose-400 flex items-center justify-center gap-1 mt-1">
                    <FaHeartbeat className="animate-pulse text-xs" />
                    {isSimulating ? simData.hr : 85}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-center">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider block">NIBP</span>
                  <span className="text-xs font-black text-blue-400 block mt-1.5">{isSimulating ? simData.bp : '120/80'}</span>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-center">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider block">SpO2 (%)</span>
                  <span className="text-sm font-black text-emerald-400 block mt-1">{isSimulating ? simData.spo2 : 98}%</span>
                </div>
              </div>
            </div>

            {/* Live Blood Loss Values */}
            <div className="lg:col-span-1 p-6 bg-red-500/5 rounded-3xl border border-red-500/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-black text-red-400 uppercase tracking-widest">Live Blood Loss</h4>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30">REALTIME</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Gauze Volume:</span>
                    <span className="font-bold text-white">{isSimulating ? `${simData.gauzeBlood} ml` : `${activeWf.totalGauzeBlood} ml`}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Suction Loss:</span>
                    <span className="font-bold text-white">{isSimulating ? `${simData.suctionBlood} ml` : `${activeWf.suctionBlood} ml`}</span>
                  </div>
                  <div className="border-t border-red-500/20 pt-2 flex justify-between text-sm font-extrabold text-red-300">
                    <span>Total Loss:</span>
                    <span>{currentBloodLoss} ml</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/doctor/surgery/${isSimulating ? 'mock' : activeWf.patientId}/step${activeWf?.currentStep || 1}`)} 
                className="btn-danger w-full !py-2.5 !text-[10px] !font-black !rounded-xl text-center flex items-center justify-center mt-4 bg-danger-600 shadow-glow-red hover:bg-danger-700"
                disabled={isSimulating}
              >
                <span>OPEN LIVE ESTIMATOR</span>
                <FaChevronRight className="text-[9px] ml-1.5" />
              </button>
            </div>

            {/* Live Fluid Balance Summary */}
            <div className="lg:col-span-1 p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">Fluid Balance</h4>
                  <span className="px-2 py-0.5 rounded text-[8px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">REALTIME</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Blood Volume:</span>
                    <span className="font-bold text-white">{currentBloodLoss} ml</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Urine Output:</span>
                    <span className="font-bold text-white">{isSimulating ? `${simData.urineCollected} ml` : `${activeWf.urineCollected} ml`}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Insensible Loss:</span>
                    <span className="font-bold text-white">{isSimulating ? `${simData.insensibleLoss} ml` : `${activeWf.insensibleLoss} ml`}</span>
                  </div>
                  <div className="border-t border-cyan-500/20 pt-2 flex justify-between text-sm font-extrabold text-cyan-300">
                    <span>Total Fluid Loss:</span>
                    <span>{currentFluidLoss} ml</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl mt-4 flex items-center gap-2">
                <FaTint className="text-cyan-400 text-sm animate-bounce" />
                <span className="text-[9px] text-cyan-300 font-black uppercase tracking-wider leading-none">Estimate Balance Checked</span>
              </div>
            </div>

            {/* AI Prediction Widget */}
            <div className="lg:col-span-1 p-6 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-inner">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FaRobot className="text-indigo-400 text-sm" />
                    AI Prediction
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${aiPrediction.color}`}>
                    {aiPrediction.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tight">{aiPrediction.riskScore}%</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">SHOCK INDEX RISK</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium line-clamp-4">
                    {aiPrediction.message}
                  </p>
                </div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${aiPrediction.riskScore}%` }} 
                  className={`h-full rounded-full ${aiPrediction.riskScore > 75 ? 'bg-red-500' : (aiPrediction.riskScore > 50 ? 'bg-amber-500' : 'bg-emerald-500')}`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => (
          <motion.div 
            key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`card group hover:scale-[1.02] transition-all duration-300 ${s.border}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
                <div className="text-3xl font-black text-white">{loading ? '—' : s.value}</div>
              </div>
              <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center text-xl shadow-inner group-hover:shadow-glow transition-all`}>
                {s.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart Section with tab selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card min-h-[420px] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <h3 className="font-black text-white tracking-tight flex items-center gap-3">
              <span className="w-1.5 h-6 bg-primary-500 rounded-full" />
              Surgical Loss Trend Analysis
            </h3>
            
            {/* Tab selection buttons */}
            <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1 self-stretch sm:self-auto">
              <button
                onClick={() => setActiveTab('blood')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'blood' ? 'bg-primary-600 text-white shadow-blue-glow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Blood Loss Trend
              </button>
              <button
                onClick={() => setActiveTab('fluid')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'fluid' ? 'bg-primary-600 text-white shadow-blue-glow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Fluid Loss Trend
              </button>
            </div>
          </div>
          
          <div className="flex-1 w-full h-[320px]">
            {loading ? (
              <div className="w-full h-full bg-slate-800/10 animate-pulse rounded-2xl" />
            ) : activeTab === 'blood' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.bloodLossTrend}>
                  <defs>
                    <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    tickFormatter={(val) => `${val}ml`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgBloodLoss" 
                    name="Average Blood Loss"
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorLoss)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.fluidLossTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    tickFormatter={(val) => `${val}ml`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }}/>
                  <Bar dataKey="avgBloodLoss" name="Blood Loss" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgUrineLoss" name="Urine Output" fill="#eab308" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgInsensibleLoss" name="Insensible Loss" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Dynamic Alerts Widgets */}
        <div className="card flex flex-col justify-between max-h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-red-500 rounded-full animate-pulse" />
              Intra-operative Alerts
            </h3>
            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">{dynamicAlerts.length} ACTIVE</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
            {dynamicAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                  alert.type === 'critical' 
                    ? 'bg-red-500/10 border-red-500/20 hover:border-red-500/40 text-red-400' 
                    : alert.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 text-amber-400'
                    : 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40 text-blue-400'
                }`}
              >
                <div className="mt-1">
                  {alert.type === 'critical' ? <MdWarning className="text-lg animate-bounce" /> : <FaExclamationTriangle className="text-sm" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-black uppercase tracking-tight">{alert.patient}</p>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{alert.time}</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed text-slate-300">{alert.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Patient Cards & Surgeries List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Critical Patient Cards */}
        <div className="lg:col-span-2 card flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-red-600 rounded-full animate-pulse" />
              Critical Patient Surveillance
            </h3>
            <button onClick={() => navigate('/doctor/patients')} className="text-[10px] font-black text-primary-400 uppercase tracking-widest hover:underline">Manage Patients →</button>
          </div>

          {stats.criticalPatients.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {stats.criticalPatients.map((p) => {
                const vitals = criticalVitals[p._id] || { hr: 104, bp: '112/70', spo2: 95 };
                return (
                  <div 
                    key={p._id} 
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 cursor-pointer"
                    onClick={() => navigate(`/doctor/patients/${p._id}`)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-lg">
                          {p.patientName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{p.patientName}</h4>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{p.surgeryType} • {p.age} YRS</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-[6px] text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>
                    </div>

                    {/* Vitals reading panel */}
                    <div className="p-3 bg-black/40 border border-slate-850 rounded-xl grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <span className="text-[8px] text-slate-500 font-bold block">HEART RATE</span>
                        <span className="text-xs font-black text-rose-400 flex items-center justify-center gap-1 mt-1">
                          <FaHeartbeat className="animate-pulse-slow text-[10px]" />
                          {vitals.hr} <span className="text-[8px] opacity-65">bpm</span>
                        </span>
                      </div>
                      <div className="text-center border-x border-slate-800">
                        <span className="text-[8px] text-slate-500 font-bold block">BLOOD PRESS.</span>
                        <span className="text-xs font-black text-blue-400 block mt-1">{vitals.bp}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[8px] text-slate-500 font-bold block">O2 SAT (SPO2)</span>
                        <span className="text-xs font-black text-emerald-400 block mt-1">{vitals.spo2}%</span>
                      </div>
                    </div>

                    {/* Bed Info */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                      <span className="flex items-center gap-1 uppercase"><FaRegHospital /> Room: {p.otRoom || 'N/A'}</span>
                      <span className="uppercase text-primary-400 flex items-center gap-1 hover:underline">
                        Details <MdArrowForward />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/40 flex items-center justify-center text-slate-650">
                <FaRegHospital className="text-2xl opacity-20" />
              </div>
              <div>
                <p className="text-slate-500 font-bold text-sm">No Critical Surveillance Patients</p>
                <p className="text-[10px] text-slate-650 mt-1 font-medium px-4">All patients currently stable or discharged.</p>
              </div>
            </div>
          )}
        </div>

        {/* Today's surgeries recent list */}
        <div className="card flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-white tracking-tight">Today's Surgeries</h3>
              <button onClick={() => navigate('/doctor/surgeries')} className="text-[10px] font-black text-primary-400 uppercase tracking-widest hover:underline">View all →</button>
            </div>
            
            {stats.recentSurgeries.length ? (
              <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {stats.recentSurgeries.map((s) => (
                  <div 
                    key={s._id} 
                    className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer" 
                    onClick={() => navigate(`/doctor/patients/${s.patientId?._id}`)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center font-bold">
                      {s.patientId?.patientName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.patientId?.patientName || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{s.patientId?.surgeryType || s.surgeryType || 'Surgery'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-red-400">{s.totalBloodLoss || 0} ml</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10 space-y-6">
                <div className="w-16 h-16 rounded-full bg-slate-850 flex items-center justify-center text-slate-600">
                  <FaProcedures className="text-2xl opacity-20" />
                </div>
                <div>
                  <p className="text-slate-550 font-bold text-xs">No surgeries today</p>
                  <p className="text-[10px] text-slate-600 mt-1 font-medium px-2">New surgeries started today will appear here.</p>
                </div>
              </div>
            )}
          </div>

          {!stats.recentSurgeries.length && (
            <button 
              onClick={() => navigate('/doctor/start-surgery')}
              className="btn-primary w-full !py-3 !rounded-xl !text-xs !font-black shadow-blue-glow mt-4"
            >
              Start Surgery
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
