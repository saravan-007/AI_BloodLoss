import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBrain, FaTimes, FaPaperPlane, FaSpinner, FaExclamationTriangle,
  FaCheckCircle, FaInfoCircle, FaShieldAlt, FaHeartbeat, FaUser,
  FaStethoscope, FaClipboardList, FaCapsules, FaSave
} from 'react-icons/fa';
import { MdWarning, MdBloodtype, MdOutlineHealthAndSafety } from 'react-icons/md';
import { toast } from 'react-toastify';
import api from '../utils/api';

const severityColor = {
  Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  High:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Medium:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Low:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const probColor = {
  High:     'text-red-400',
  Moderate: 'text-amber-400',
  Low:      'text-emerald-400',
};

const riskBg = {
  Critical: 'from-red-900/60 to-rose-950 border-red-500/30',
  High:     'from-orange-900/60 to-amber-950 border-orange-500/30',
  Moderate: 'from-amber-900/60 to-yellow-950 border-amber-500/30',
  Low:      'from-emerald-900/60 to-teal-950 border-emerald-500/30',
};

export default function AIChatbot({ patientData, surgeryData, onClose, onSaveAnalysis }) {
  const [phase, setPhase] = useState('loading'); // loading | analysis | chat
  const [analysis, setAnalysis] = useState(null);
  const [rawText, setRawText] = useState('');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  const [savingReport, setSavingReport] = useState(false);
  const [savedReport, setSavedReport] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleSaveReport = async () => {
    if (!analysis) return;
    setSavingReport(true);
    try {
      const pId = patientData?._id || patientData?.id;
      if (!pId) throw new Error('No patient ID found');

      if (pId.toString().startsWith('mock-') || pId.toString().startsWith('demo-')) {
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const updated = demoPatients.map(p => {
          if (p._id === pId) {
            return {
              ...p,
              aiReports: [...(p.aiReports || []), { ...analysis, createdAt: new Date().toISOString() }]
            };
          }
          return p;
        });
        localStorage.setItem('demo_patients', JSON.stringify(updated));
        toast.success('AI Report saved to demo patient history');
      } else {
        await api.post(`/patients/${pId}/ai-report`, analysis);
        toast.success('AI Report saved permanently!');
      }
      setSavedReport(true);
    } catch (err) {
      toast.error('Failed to save AI report');
    } finally {
      setSavingReport(false);
    }
  };

  const runAnalysis = async () => {
    setPhase('loading');
    setError('');
    try {
      const { data } = await api.post('/ai/analyze', { patientData, surgeryData });
      if (data.analysis) {
        setAnalysis(data.analysis);
        setPhase('analysis');
        // Persist analysis to parent if callback provided
        if (onSaveAnalysis) onSaveAnalysis(data.analysis);
      } else if (data.rawText) {
        setRawText(data.rawText);
        setPhase('analysis');
      }
    } catch (err) {
      setError('AI analysis failed. You can still ask medical questions below.');
      setPhase('analysis');
    }
  };

  // Auto-run analysis on mount
  useEffect(() => {
    runAnalysis();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || sending) return;
    setQuestion('');
    setSending(true);

    const userMsg = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data } = await api.post('/ai/analyze', {
        patientData,
        surgeryData,
        question: q
      });
      const answer = data.answer || 'No response received.';
      setMessages(prev => [...prev, { role: 'ai', content: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '⚠️ Could not get a response. Please check your internet connection or API configuration.'
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const suggestedQuestions = [
    'What are the signs of hypovolemia in this patient?',
    `What fluid replacement is recommended for ${surgeryData?.totalBloodLoss || 0} ml blood loss?`,
    'What monitoring is required postoperatively?',
    'What are the risks of electrolyte imbalance?',
    'When should ICU care be considered?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-5xl h-[90vh] flex flex-col rounded-[28px] overflow-hidden border border-slate-700/50"
        style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0f172a 50%, #0c1428 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50"
          style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.15), rgba(59,130,246,0.10))' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
              <FaBrain className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight">AI Medical Assistant</h2>
              <p className="text-violet-300/70 text-xs font-bold uppercase tracking-widest mt-0.5">
                Powered by Google Gemini • Patient: {patientData?.patientName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {analysis && (
              <button
                onClick={handleSaveReport}
                disabled={savingReport || savedReport}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                  savedReport
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-violet-600 hover:bg-violet-750 text-white border-violet-500 hover:scale-95'
                }`}
              >
                {savingReport ? <FaSpinner className="animate-spin text-[10px]" /> : (savedReport ? <FaCheckCircle /> : <FaSave />)}
                {savedReport ? 'REPORT SAVED' : 'SAVE AI REPORT'}
              </button>
            )}
            {analysis && (
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest ${severityColor[analysis.overallRiskLevel] || severityColor.Medium}`}>
                {analysis.overallRiskLevel} Risk
              </div>
            )}
            <button onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 transition-all">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Patient Summary Bar */}
        <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-800/30 bg-slate-900/30 flex-wrap">
          {[
            { label: 'Age', value: `${patientData?.age} yrs` },
            { label: 'Weight', value: `${patientData?.weight} kg` },
            { label: 'Blood Group', value: patientData?.bloodGroup || 'N/A' },
            { label: 'Surgery', value: patientData?.surgeryType },
            { label: 'Blood Loss', value: `${surgeryData?.totalBloodLoss || 0} ml`, color: 'text-red-400' },
            { label: 'Fluid Loss', value: `${surgeryData?.totalFluidLoss || 0} ml`, color: 'text-blue-400' },
            { label: 'Duration', value: `${surgeryData?.surgeryDuration || 0} hrs`, color: 'text-amber-400' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{item.label}</span>
              <span className={`text-xs font-bold ${item.color || 'text-white'}`}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Panel — Analysis */}
          <div className="w-[55%] border-r border-slate-800/50 flex flex-col overflow-hidden">
            {phase === 'loading' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                  <FaBrain className="absolute inset-0 m-auto text-2xl text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-lg">Analyzing Patient Data</p>
                  <p className="text-slate-500 text-sm mt-2">AI is processing intraoperative measurements...</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                  {['Blood Loss', 'Fluid Balance', 'Risk Factors', 'Complications', 'Precautions'].map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse"
                      style={{ animationDelay: `${i * 0.3}s` }}>{t}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* Error banner */}
                {error && (
                  <div className="mx-4 mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                    <FaExclamationTriangle className="text-red-400 text-lg flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {analysis ? (
                  <div className="p-4 space-y-4">
                    {/* Risk Level Banner */}
                    <div className={`rounded-2xl p-4 bg-gradient-to-br border ${riskBg[analysis.overallRiskLevel] || riskBg.Moderate}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <MdOutlineHealthAndSafety className="text-2xl text-white" />
                        <div>
                          <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Overall Risk Level</p>
                          <p className="text-white font-black text-lg">{analysis.overallRiskLevel}</p>
                        </div>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">{analysis.summary}</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-slate-900/50 rounded-2xl p-1">
                      {[
                        { id: 'analysis', label: 'Analysis', icon: <FaInfoCircle className="text-[10px]" /> },
                        { id: 'risks', label: 'Risks', icon: <MdWarning className="text-[10px]" /> },
                        { id: 'recommendations', label: 'Clinical Plan', icon: <FaStethoscope className="text-[10px]" /> },
                      ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id
                              ? 'bg-violet-600 text-white shadow-lg'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}>
                          {tab.icon}{tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                      {activeTab === 'analysis' && (
                        <motion.div key="analysis"
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }} className="space-y-3">
                          <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                            <p className="text-[10px] text-violet-400 font-black uppercase tracking-widest mb-2">Detailed AI Assessment</p>
                            <p className="text-slate-350 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{analysis.aiAnalysis}</p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'risks' && (
                        <motion.div key="risks"
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }} className="space-y-3">
                          <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-3">
                            <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">Identified Risks & Complications</p>
                            <div className="space-y-2">
                              {(analysis.aiRisks || []).map((risk, i) => (
                                <div key={i} className="flex items-start gap-2.5 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                                  <FaExclamationTriangle className="text-red-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-slate-300 text-xs font-semibold leading-relaxed">{risk}</p>
                                </div>
                              ))}
                              {(!analysis.aiRisks || analysis.aiRisks.length === 0) && (
                                <p className="text-slate-500 text-xs italic">No specific high-severity risks identified.</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'recommendations' && (
                        <motion.div key="recommendations"
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }} className="space-y-4">
                          
                          {/* Recommendations */}
                          {analysis.aiRecommendations?.length > 0 && (
                            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaCheckCircle /> Recommendations</p>
                              <ul className="space-y-2 pl-2">
                                {analysis.aiRecommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Precautions */}
                          {analysis.aiPrecautions?.length > 0 && (
                            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                              <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaShieldAlt /> Precautions</p>
                              <ul className="space-y-2 pl-2">
                                {analysis.aiPrecautions.map((prec, i) => (
                                  <li key={i} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                                    {prec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Suggested Medication */}
                          {analysis.aiSuggestedMedication?.length > 0 && (
                            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaCapsules /> Suggested Medication</p>
                              <ul className="space-y-2 pl-2">
                                {analysis.aiSuggestedMedication.map((med, i) => (
                                  <li key={i} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                    {med}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Monitoring Advice */}
                          {analysis.aiMonitoringAdvice?.length > 0 && (
                            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                              <p className="text-[10px] text-violet-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaHeartbeat /> Monitoring Advice</p>
                              <ul className="space-y-2 pl-2">
                                {analysis.aiMonitoringAdvice.map((mon, i) => (
                                  <li key={i} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                                    {mon}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Follow-up Suggestions */}
                          {analysis.aiFollowUpSuggestions?.length > 0 && (
                            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-2">
                              <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest flex items-center gap-1.5"><FaClipboardList /> Follow-up Suggestions</p>
                              <ul className="space-y-2 pl-2">
                                {analysis.aiFollowUpSuggestions.map((fol, i) => (
                                  <li key={i} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                    {fol}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Raw text fallback */}
                    {!analysis && rawText && (
                      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
                        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{rawText}</p>
                      </div>
                    )}
                  </div>
                ) : rawText ? (
                  <div className="p-4">
                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
                      <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{rawText}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right Panel — Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-800/30">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Medical Q&A</p>
              <p className="text-white font-bold text-sm mt-0.5">Ask follow-up medical questions</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center mb-4">Suggested Questions</p>
                  {suggestedQuestions.map((q, i) => (
                    <button key={i} onClick={() => setQuestion(q)}
                      className="w-full text-left p-3 rounded-2xl bg-slate-800/30 border border-slate-800/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group">
                      <p className="text-slate-400 text-xs group-hover:text-violet-300 transition-colors leading-relaxed">{q}</p>
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-3xl rounded-tr-lg px-4 py-3'
                    : 'bg-slate-800/60 border border-slate-700/50 text-slate-200 rounded-3xl rounded-tl-lg px-4 py-3'}`}>
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-2 mb-2">
                        <FaBrain className="text-violet-400 text-xs" />
                        <span className="text-[9px] text-violet-400 font-black uppercase tracking-widest">AI Assistant</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl rounded-tl-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FaSpinner className="text-violet-400 animate-spin text-xs" />
                      <span className="text-slate-400 text-xs">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-800/50">
              <div className="flex gap-3 items-end">
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a medical question... (Enter to send)"
                  rows={2}
                  className="flex-1 resize-none rounded-2xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 text-sm px-4 py-3 focus:outline-none focus:border-violet-500/50 transition-all"
                />
                <button
                  onClick={sendQuestion}
                  disabled={!question.trim() || sending}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                  {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                </button>
              </div>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center mt-2">
                AI responses are for informational purposes. Always apply clinical judgment.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
