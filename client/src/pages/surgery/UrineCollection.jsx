import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowRight, FaArrowLeft, FaSave } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import StepWrapper from './StepWrapper';

const getWfState = () => JSON.parse(sessionStorage.getItem('surgery_wf') || '{}');
const setWfState = (data) => sessionStorage.setItem('surgery_wf', JSON.stringify({ ...getWfState(), ...data }));

export default function UrineCollection() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { role }      = useAuth();
  const wf = getWfState();

  const [urineCollected, setUrineCollected] = useState('');

  const handleSaveAndNext = () => {
    const urine = parseFloat(urineCollected);
    if (urine === undefined || urine === '' || isNaN(urine)) return toast.error('Please enter urine collected (enter 0 if none)');
    setWfState({ urineCollected: urine });
    navigate(`/${role}/surgery/${patientId}/step6`);
  };

  return (
    <StepWrapper currentStep={5}>
      {/* Summary */}
      <div className="card !p-6 bg-slate-800/20 border-slate-800/50 mb-8">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Blood Loss</p>
              <h4 className="text-xl font-black text-red-500 mt-1">{(wf.totalBloodLoss || 0).toFixed(1)} <span className="text-xs opacity-50">ML</span></h4>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Insensible</p>
              <h4 className="text-xl font-black text-amber-500 mt-1">{(wf.insensibleLoss || 0).toFixed(1)} <span className="text-xs opacity-50">ML</span></h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card !p-8 border-l-4 border-violet-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-violet-400 font-black text-lg border border-slate-700 shadow-inner">5</div>
          <div>
            <h3 className="font-black text-white text-xl tracking-tight">Urine Excretion</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Intra-operative renal output monitoring</p>
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 block text-center">Volume Collected (ml)</label>
          <input
            type="number" min="0" value={urineCollected}
            onChange={e => setUrineCollected(e.target.value)}
            placeholder="000"
            className="input !bg-slate-800/40 border-slate-800 text-4xl py-10 font-black text-center text-violet-400 focus:border-violet-500/50 shadow-inner"
          />
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-4 text-center">Enter 0 if no catheter output was recorded</p>
        </div>

        <div className="flex gap-4">
          <button onClick={() => navigate(`/${role}/surgery/${patientId}/step4`)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 hover:border-slate-700 transition-all">
            <FaArrowLeft />
          </button>
          <button onClick={handleSaveAndNext} className={`btn-primary !py-4 flex-1 !text-xs !font-black !rounded-2xl group ${role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`}>
            <FaSave /> SAVE & PROCEED <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </StepWrapper>
  );
}
