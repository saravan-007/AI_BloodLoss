import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaCalculator, FaArrowRight, FaArrowLeft, FaTint } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import StepWrapper from './StepWrapper';

const getWfState = () => JSON.parse(sessionStorage.getItem('surgery_wf') || '{}');
const setWfState = (data) => sessionStorage.setItem('surgery_wf', JSON.stringify({ ...getWfState(), ...data }));

export default function TotalBloodLoss() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { role }      = useAuth();
  const wf = getWfState();

  const [result, setResult] = useState({ totalBloodLoss: 0, calculated: false });

  const calculate = () => {
    const gauze   = parseFloat(wf.totalGauzeBlood) || 0;
    const suction = parseFloat(wf.suctionBlood) || 0;
    if (!gauze && !suction) return toast.error('Please complete previous steps first');
    const total = gauze + suction;
    setResult({ totalBloodLoss: total, calculated: true });
    setWfState({ totalBloodLoss: total });
    toast.success('Total blood loss calculated!');
  };

  return (
    <StepWrapper currentStep={3}>
      <div className="card !p-8 border-l-4 border-red-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-red-400 font-black text-lg border border-slate-700 shadow-inner">3</div>
          <div>
            <h3 className="font-black text-white text-xl tracking-tight">Cumulative Blood Loss</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Aggregated clinical volume assessment</p>
          </div>
        </div>

        {/* Component summary */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 text-center">
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">Phase 1: Gauze</p>
            <div className="text-3xl font-black text-white">{(wf.totalGauzeBlood || 0).toFixed(1)}</div>
            <div className="text-[10px] text-slate-600 font-bold mt-1">ML</div>
          </div>
          <div className="p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/10 text-center">
            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2">Phase 2: Suction</p>
            <div className="text-3xl font-black text-white">{(wf.suctionBlood || 0).toFixed(1)}</div>
            <div className="text-[10px] text-slate-600 font-bold mt-1">ML</div>
          </div>
        </div>

        {result.calculated && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`rounded-[32px] p-10 mb-8 text-center border-2 shadow-glow transition-all duration-500 ${
              result.totalBloodLoss > 500 
              ? 'bg-red-600/20 border-red-500/40 shadow-red-500/20' 
              : 'bg-slate-800/40 border-slate-700 shadow-inner'
            }`}>
            <FaTint className={`text-4xl mx-auto mb-4 ${result.totalBloodLoss > 500 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
            <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">Total Intra-Operative Blood Loss</p>
            <div className={`text-7xl font-black tracking-tighter ${result.totalBloodLoss > 500 ? 'text-red-500' : 'text-white'}`}>
              {result.totalBloodLoss.toFixed(1)}
              <span className="text-2xl opacity-40 ml-2 font-bold tracking-normal uppercase">ml</span>
            </div>
            
            {result.totalBloodLoss > 500 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 py-3 px-6 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                 ⚠️ CRITICAL: EXCEEDS 500ML THRESHOLD
              </motion.div>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          <button onClick={() => navigate(`/${role}/surgery/${patientId}/step2`)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all">
            <FaArrowLeft />
          </button>
          <button onClick={calculate} className="btn-secondary !py-4 flex-1 !text-xs !font-black !rounded-2xl border-slate-700">
            <FaCalculator /> AGGREGATE
          </button>
          <button 
            onClick={() => { if (!result.calculated) return toast.error('Calculate first'); navigate(`/${role}/surgery/${patientId}/step4`); }}
            className={`btn-primary !py-4 flex-1 !text-xs !font-black !rounded-2xl group ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`} 
            disabled={!result.calculated}
          >
            NEXT PHASE: FLUIDS <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </StepWrapper>
  );
}
