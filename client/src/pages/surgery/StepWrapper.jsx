import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Gauze', 'Suction', 'Blood Loss', 'Insensible', 'Urine', 'Fluid Loss'];

export default function StepWrapper({ currentStep, children }) {
  const { role } = useAuth();
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Progress bar */}
      <div className="card !p-6 bg-dark-card/50">
        <div className="flex items-center justify-between px-2">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isDone  = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2 group">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all duration-500 ${
                    isDone ? (role === 'doctor' ? 'bg-primary-500 border-primary-500 text-white shadow-blue-glow' : 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-glow')
                    : isActive ? (role === 'doctor' ? 'bg-slate-800 border-primary-500 text-primary-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-slate-800 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]')
                    : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>
                    {isDone ? '✓' : stepNum}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest hidden md:block transition-colors duration-300 ${isActive ? (role === 'doctor' ? 'text-primary-400' : 'text-emerald-400') : isDone ? 'text-slate-400' : 'text-slate-700'}`}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 px-4">
                    <div className={`h-[2px] rounded-full transition-all duration-700 ${isDone ? (role === 'doctor' ? 'bg-primary-500 shadow-blue-glow' : 'bg-emerald-500 shadow-emerald-glow') : 'bg-slate-800'}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
