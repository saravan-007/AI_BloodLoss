import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaCalculator, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import StepWrapper from './StepWrapper';

const getWfState = () => JSON.parse(sessionStorage.getItem('surgery_wf') || '{}');
const setWfState = (data) => sessionStorage.setItem('surgery_wf', JSON.stringify({ ...getWfState(), ...data }));

export default function SuctionBlood() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { role }      = useAuth();
  const wf = getWfState();

  const [form, setForm]     = useState({ suctionBottleValue: '', salineUsed: '' });
  const [result, setResult] = useState({ suctionBlood: 0, calculated: false });

  const calculate = () => {
    const bottle = parseFloat(form.suctionBottleValue) || 0;
    const saline = parseFloat(form.salineUsed) || 0;
    if (!bottle) return toast.error('Please enter suction bottle value');
    const suctionBlood = Math.max(0, bottle - saline);
    setResult({ suctionBlood, calculated: true });
    setWfState({ ...form, suctionBlood });
    toast.success('Suction blood calculated!');
  };

  return (
    <StepWrapper currentStep={2}>
      {/* Previous summary */}
      {wf.totalGauzeBlood !== undefined && (
        <div className="card !p-6 bg-slate-800/20 border-slate-800/50 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Phase 1 Result</p>
              <h4 className="text-xl font-black text-white mt-1">Gauze Blood Loss</h4>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary-400">{wf.totalGauzeBlood?.toFixed(1) || 0}</span>
              <span className="text-xs text-slate-600 font-bold ml-1">ML</span>
            </div>
          </div>
        </div>
      )}

      <div className="card !p-8 border-l-4 border-cyan-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-cyan-400 font-black text-lg border border-slate-700 shadow-inner">2</div>
          <div>
            <h3 className="font-black text-white text-xl tracking-tight">Suction Analysis</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Subtract irrigation fluid from suction total</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 block">Total Suction Bottle (ml)</label>
            <input 
              name="suctionBottleValue" type="number" min="0" value={form.suctionBottleValue}
              onChange={e => setForm(f => ({ ...f, suctionBottleValue: e.target.value }))}
              placeholder="0000" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 block">Saline/Irrigation Used (ml)</label>
            <input 
              name="salineUsed" type="number" min="0" value={form.salineUsed}
              onChange={e => setForm(f => ({ ...f, salineUsed: e.target.value }))}
              placeholder="0000" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" 
            />
          </div>
        </div>

        {result.calculated && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-cyan-500/10 border border-cyan-500/20 rounded-3xl p-8 mb-8 text-center shadow-inner">
            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2">Calculated Suction Blood</p>
            <div className="text-5xl font-black text-cyan-400 tracking-tight">
              {result.suctionBlood.toFixed(1)} <span className="text-xl opacity-50">ml</span>
            </div>
          </motion.div>
        )}

        <div className="flex gap-4">
          <button onClick={() => navigate(`/${role}/surgery/${patientId}/step1`)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all">
            <FaArrowLeft />
          </button>
          <button onClick={calculate} className="btn-secondary !py-4 flex-1 !text-xs !font-black !rounded-2xl border-slate-700">
            <FaCalculator /> COMPUTE
          </button>
          <button 
            onClick={() => { if (!result.calculated) return toast.error('Calculate first'); navigate(`/${role}/surgery/${patientId}/step3`); }}
            className={`btn-primary !py-4 flex-1 !text-xs !font-black !rounded-2xl group ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`} 
          >
            NEXT STEP <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </StepWrapper>
  );
}
