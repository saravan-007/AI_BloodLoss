import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaCalculator, FaArrowRight, FaArrowLeft, FaClock } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import StepWrapper from './StepWrapper';

const getWfState = () => JSON.parse(sessionStorage.getItem('surgery_wf') || '{}');
const setWfState = (data) => sessionStorage.setItem('surgery_wf', JSON.stringify({ ...getWfState(), ...data }));

export default function InsensibleLoss() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { role }      = useAuth();
  const wf = getWfState();

  const [form, setForm] = useState({
    surgeryDuration: '',
    patientWeight:   wf.patientWeight || '', // auto-filled from patient
  });
  const [result, setResult] = useState({ insensibleLoss: 0, calculated: false });

  const calculate = () => {
    const duration = parseFloat(form.surgeryDuration);
    const weight   = parseFloat(form.patientWeight);
    if (!duration || duration <= 0) return toast.error('Please enter surgery duration in hours');
    if (!weight || weight <= 0) return toast.error('Please enter patient weight');

    // Formula: insensible_loss = 2 × weight × duration (hours)
    const insensibleLoss = 2 * weight * duration;
    setResult({ insensibleLoss, calculated: true });
    setWfState({ surgeryDuration: duration, patientWeight: weight, insensibleLoss });
    toast.success('Insensible loss calculated!');
  };

  return (
    <StepWrapper currentStep={4}>
      {/* Previous summary */}
      <div className="card !p-6 bg-slate-800/20 border-slate-800/50 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aggregate Data</p>
            <h4 className="text-xl font-black text-white mt-1">Total Blood Loss</h4>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-red-500">{(wf.totalBloodLoss || 0).toFixed(1)}</span>
            <span className="text-xs text-slate-600 font-bold ml-1">ML</span>
          </div>
        </div>
      </div>

      <div className="card !p-8 border-l-4 border-amber-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-400 font-black text-lg border border-slate-700 shadow-inner">4</div>
          <div>
            <h3 className="font-black text-white text-xl tracking-tight">Insensible Evaporation</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Accounts for evaporation during surgery</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 block">Surgery Duration (hours)</label>
            <input 
              name="surgeryDuration" type="number" min="0" step="0.5" value={form.surgeryDuration}
              onChange={e => setForm(f => ({ ...f, surgeryDuration: e.target.value }))}
              placeholder="0.0" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 block">
              Patient Weight (kg)
              {wf.patientWeight && <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full ml-2">AUTO</span>}
            </label>
            <input 
              name="patientWeight" type="number" min="0" step="0.1" value={form.patientWeight}
              onChange={e => setForm(f => ({ ...f, patientWeight: e.target.value }))}
              placeholder="00.0" className="input !bg-slate-800/40 border-slate-800 text-lg font-black" 
            />
          </div>
        </div>

        {result.calculated && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8 mb-8 text-center shadow-inner">
            <FaClock className="text-3xl text-amber-500/50 mx-auto mb-4" />
            <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-2">Calculated Insensible Loss</p>
            <div className="text-5xl font-black text-amber-400 tracking-tight">
              {result.insensibleLoss.toFixed(1)} <span className="text-xl opacity-50">ml</span>
            </div>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-4">Formula: 2 × {form.patientWeight} KG × {form.surgeryDuration} HR</p>
          </motion.div>
        )}

        <div className="flex gap-4">
          <button onClick={() => navigate(`/${role}/surgery/${patientId}/step3`)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all">
            <FaArrowLeft />
          </button>
          <button onClick={calculate} className="btn-secondary !py-4 flex-1 !text-xs !font-black !rounded-2xl border-slate-700">
            <FaCalculator /> COMPUTE
          </button>
          <button 
            onClick={() => { if (!result.calculated) return toast.error('Calculate first'); navigate(`/${role}/surgery/${patientId}/step5`); }}
            className={`btn-primary !py-4 flex-1 !text-xs !font-black !rounded-2xl group ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`} 
          >
            NEXT STEP <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </StepWrapper>
  );
}
