import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaUserMd, FaUserNurse, FaEnvelope, FaPhone, FaHospital, FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import { MdWork } from 'react-icons/md';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const requirements = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains a number',     test: (p) => /\d/.test(p) },
  { label: 'Contains a letter',     test: (p) => /[a-zA-Z]/.test(p) },
];

export default function Register({ role }) {
  const isDoctor = role === 'doctor';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullName: '', identifier: '', specialization: '', department: '', hospitalName: '', customSpecialization: '', customDepartment: '' });
  const [loading, setLoading] = useState(false);
  const [idType, setIdType] = useState('email');

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [devOtpState, setDevOtpState] = useState('');

  // Password State
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showP, setShowP] = useState(false);
  const [showC, setShowC] = useState(false);
  const [success, setSuccess] = useState(false);

  // OTP Countdown
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown, step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'identifier') setIdType(/^[\d+]/.test(value) ? 'mobile' : 'email');
  };

  const getFinalSpecialization = () => form.specialization === 'Other' ? form.customSpecialization : form.specialization;
  const getFinalDepartment = () => form.department === 'Other' ? form.customDepartment : form.department;

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    const { fullName, identifier } = form;
    const finalSpecialization = getFinalSpecialization();
    const finalDepartment = getFinalDepartment();

    if (!fullName.trim()) return toast.error('Full name is required');
    if (!identifier.trim()) return toast.error('Email or mobile number is required');
    if (isDoctor && (!finalSpecialization || !finalSpecialization.trim())) return toast.error('Specialization is required');
    if (!isDoctor && (!finalDepartment || !finalDepartment.trim())) return toast.error('Department is required');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { identifier: identifier.trim(), role, purpose: 'register' });
      toast.success(data.message);
      setCountdown(60);
      if (data.devOtp) setDevOtpState(data.devOtp);
      setStep(2);
    } catch (err) {
      console.error('Registration error:', err);
      const isNetworkError = !err.response;
      const isServerError = err.response?.status >= 500;

      if (isNetworkError || isServerError) {
        const reason = isNetworkError ? 'Backend unreachable' : 'Database connection error';
        toast.warn(`${reason}. Entering Demo Mode for registration...`);
        const randomOTP = Math.floor(100000 + Math.random() * 900000).toString();
        setDevOtpState(randomOTP);
        setStep(2);
      } else {
        toast.error(err.response?.data?.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) return toast.error('Please enter all 6 digits');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', {
        identifier: form.identifier.trim(),
        otp,
        role,
        purpose: 'register',
        fullName: form.fullName,
        hospitalName: form.hospitalName,
        specialization: getFinalSpecialization(),
        department: getFinalDepartment()
      });
      toast.success('OTP verified successfully!');
      setStep(3);
    } catch (err) {
      const isNetworkError = !err.response;
      const isServerError = err.response?.status >= 500;

      if (isNetworkError || isServerError) {
        toast.warn(`Backend unreachable. Entering Demo Mode...`);
        setStep(3);
      } else {
        toast.error(err.response?.data?.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      const { data } = await api.post('/auth/send-otp', { identifier: form.identifier.trim(), role, purpose: 'register' });
      toast.success('New OTP sent!');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      if (data.devOtp) setDevOtpState(data.devOtp);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const strength = requirements.filter(r => r.test(password)).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'];
  const strengthColor = ['', 'bg-danger-500', 'bg-warning-500', 'bg-medical-500'];

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (strength < 2) return toast.error('Password is too weak');
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/set-password', { identifier: form.identifier.trim(), role, password, purpose: 'register' });
      setSuccess(true);
      toast.success(data.message);
      if (data.token) {
        login(data.token, data.user, role);
        setTimeout(() => navigate(`/${role}/dashboard`), 1500);
      } else {
        setTimeout(() => navigate(`/${role}/login`), 1500);
      }
    } catch (err) {
      const isNetworkError = !err.response;
      const isServerError = err.response?.status >= 500;

      if (isNetworkError || isServerError) {
        toast.warn(`Demo Mode Login...`);
        const mockFullName = form.fullName || 'Demo User';
        const mockNurse = { _id: 'mock-' + Date.now(), fullName: mockFullName, isVerified: true };
        login('dummy-token', { id: mockNurse._id, fullName: mockFullName, role, isDemo: true }, role);
        setSuccess(true);
        setTimeout(() => navigate(`/${role}/dashboard`), 1500);
      } else {
        toast.error(err.response?.data?.message || 'Failed to set password');
      }
    } finally {
      setLoading(false);
    }
  };

  const accentFrom = isDoctor ? 'from-blue-600' : 'from-emerald-600';
  const accentTo   = isDoctor ? 'to-blue-800'   : 'to-teal-800';

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-12 text-center shadow-2xl">
          <FaCheckCircle className="text-medical-500 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800">Account Created!</h2>
          <p className="text-slate-500 mt-2">Redirecting you to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center text-white text-xl`}>
              {step === 1 ? (isDoctor ? <FaUserMd /> : <FaUserNurse />) : step === 2 ? <FaShieldAlt /> : <FaLock />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                {step === 1 ? 'Create Account' : step === 2 ? 'Verify OTP' : 'Create Password'}
              </h1>
              <p className="text-slate-500 text-sm">
                {step === 1 ? `${isDoctor ? 'Doctor' : 'Nurse'} registration` : `For ${form.identifier}`}
              </p>
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              {/* Form Fields */}
              <div>
                <label className="label">Full Name *</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Dr. / Nurse Full Name" className="input" />
              </div>

              <div>
                <label className="label">Email or Mobile Number *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {idType === 'mobile' ? <FaPhone /> : <FaEnvelope />}
                  </span>
                  <input name="identifier" value={form.identifier} onChange={handleChange} placeholder="email@example.com or +91XXXXXXXXXX" className="input pl-10" />
                </div>
              </div>

              {isDoctor ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Specialization *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MdWork /></span>
                      <select name="specialization" value={form.specialization} onChange={handleChange} className="input pl-10 appearance-none">
                        <option value="">Select Specialization</option>
                        {['General Surgery','Cardiothoracic Surgery','Neurosurgery','Orthopedic Surgery','Gynecology','Urology','Plastic Surgery','Vascular Surgery','Pediatric Surgery','Anesthesiology','Other'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <AnimatePresence>
                    {form.specialization === 'Other' && (
                      <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MdWork /></span>
                          <input name="customSpecialization" value={form.customSpecialization} onChange={handleChange} placeholder="Enter your specialization" className="input pl-10" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="label">Department *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MdWork /></span>
                      <select name="department" value={form.department} onChange={handleChange} className="input pl-10 appearance-none">
                        <option value="">Select Department</option>
                        {['Operating Theater','ICU','Emergency','Cardiac Care','Pediatrics','Maternity','General Ward','Oncology','Other'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <AnimatePresence>
                    {form.department === 'Other' && (
                      <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MdWork /></span>
                          <input name="customDepartment" value={form.customDepartment} onChange={handleChange} placeholder="Enter your department" className="input pl-10" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div>
                <label className="label">Hospital Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FaHospital /></span>
                  <input name="hospitalName" value={form.hospitalName} onChange={handleChange} placeholder="Hospital or Clinic name" className="input pl-10" />
                </div>
              </div>

              <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${accentFrom} ${accentTo} hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-2`}>
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Sending OTP...' : 'Send OTP & Continue'}
              </button>

              <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
                <Link to={`/${role}/login`} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">← Back to Login</Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-center">
              {devOtpState && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4">
                  <p className="font-semibold mb-1">Development Mode</p>
                  <p>Your test OTP is: <span className="font-bold text-lg tracking-widest">{devOtpState}</span></p>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-3 mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={el => inputRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} className={`otp-input ${digit ? 'border-primary-500 bg-primary-50' : ''}`} />
                ))}
              </div>

              <button onClick={handleVerifyOTP} disabled={loading || otp.join('').length < 6} className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${accentFrom} ${accentTo} hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2`}>
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-sm text-slate-500">
                {countdown > 0 ? (
                  <span>Resend OTP in <span className="font-semibold text-primary-600">{countdown}s</span></span>
                ) : (
                  <button onClick={handleResendOTP} disabled={resending} className="text-primary-600 font-semibold hover:underline disabled:opacity-50">
                    {resending ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button onClick={() => setStep(1)} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">← Edit Registration Details</button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FaLock /></span>
                  <input type={showP ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" className="input pl-10 pr-10" />
                  <button type="button" onClick={() => setShowP(!showP)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showP ? <FaEyeSlash /> : <FaEye />}</button>
                </div>
                {password && (
                  <div className="mt-3">
                    <div className="flex gap-1.5">
                      {[1,2,3].map(i => <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i <= strength ? strengthColor[strength] : 'bg-slate-200'}`} />)}
                    </div>
                    <div className="mt-2 space-y-1">
                      {requirements.map(r => (
                        <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(password) ? 'text-medical-600' : 'text-slate-400'}`}>
                          <FaCheckCircle className={r.test(password) ? 'text-medical-500' : 'text-slate-300'} />
                          {r.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FaLock /></span>
                  <input type={showC ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm your password" className={`input pl-10 pr-10 ${confirm && password !== confirm ? 'border-danger-400 focus:ring-danger-500' : confirm && password === confirm ? 'border-medical-400 focus:ring-medical-500' : ''}`} />
                  <button type="button" onClick={() => setShowC(!showC)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showC ? <FaEyeSlash /> : <FaEye />}</button>
                </div>
                {confirm && password !== confirm && <p className="text-xs text-danger-500 mt-1.5">Passwords do not match</p>}
                {confirm && password === confirm && <p className="text-xs text-medical-600 mt-1.5">✓ Passwords match</p>}
              </div>

              <button type="submit" disabled={loading || !password || !confirm} className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${accentFrom} ${accentTo} hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2`}>
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Saving...' : 'Create Account & Login'}
              </button>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
}
