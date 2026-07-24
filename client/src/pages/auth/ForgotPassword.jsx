import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaKey, FaEnvelope, FaPhone, FaUserMd, FaUserNurse, FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const requirements = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains a number',     test: (p) => /\d/.test(p) },
  { label: 'Contains a letter',     test: (p) => /[a-zA-Z]/.test(p) },
];

export default function ForgotPassword() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState('doctor');
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

  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    setIdentifier(val);
    setIdType(/^[\d+]/.test(val) ? 'mobile' : 'email');
  };

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) return toast.error('Please enter your email or mobile number');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { identifier: identifier.trim(), role, purpose: 'reset' });
      toast.success(data.message);
      setCountdown(60);
      if (data.devOtp) setDevOtpState(data.devOtp);
      setStep(2);
    } catch (err) {
      console.error('Forgot password error:', err);
      const isNetworkError = !err.response;
      const isServerError = err.response?.status >= 500;

      if (isNetworkError || isServerError) {
        const reason = isNetworkError ? 'Backend unreachable' : 'Database connection error';
        toast.warn(`${reason}. Entering Demo Mode...`);
        const randomOTP = Math.floor(100000 + Math.random() * 900000).toString();
        setDevOtpState(randomOTP);
        setStep(2);
      } else {
        toast.error(err.response?.data?.message || 'No account found');
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
        identifier: identifier.trim(),
        otp,
        role,
        purpose: 'reset'
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
      const { data } = await api.post('/auth/send-otp', { identifier: identifier.trim(), role, purpose: 'reset' });
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
      const { data } = await api.post('/auth/set-password', { identifier: identifier.trim(), role, password, purpose: 'reset' });
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
        const mockUser = { _id: 'mock-' + Date.now(), fullName: 'Demo User', isVerified: true };
        login('dummy-token', { id: mockUser._id, fullName: 'Demo User', role, isDemo: true }, role);
        setSuccess(true);
        setTimeout(() => navigate(`/${role}/dashboard`), 1500);
      } else {
        toast.error(err.response?.data?.message || 'Failed to set password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-12 text-center shadow-2xl">
          <FaCheckCircle className="text-medical-500 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800">Password Reset!</h2>
          <p className="text-slate-500 mt-2">Redirecting you to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl mb-4 shadow-lg">
              {step === 1 ? <FaKey /> : step === 2 ? <FaShieldAlt /> : <FaLock />}
            </div>
            <h1 className="text-2xl font-black text-slate-800">
              {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Create New Password'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {step === 1 ? 'Enter your registered email or mobile to receive an OTP' : `For ${identifier}`}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              {/* Role selector */}
              <div>
                <label className="label">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {['doctor', 'nurse'].map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${role === r ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {r === 'doctor' ? <FaUserMd /> : <FaUserNurse />}
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Email or Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {idType === 'mobile' ? <FaPhone /> : <FaEnvelope />}
                  </span>
                  <input
                    value={identifier}
                    onChange={handleIdentifierChange}
                    placeholder="Enter registered email or mobile"
                    className="input pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Sending OTP...' : 'Send Reset OTP'}
              </button>

              <p className="text-center text-slate-500 text-sm">
                Remember password?{' '}
                <Link to={`/${role}/login`} className="text-primary-600 font-semibold hover:underline">Sign in</Link>
              </p>
              <div className="text-center pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => navigate(`/${role}/login`)} 
                  className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ← Back to Login
                </button>
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
                  <input key={i} ref={el => inputRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} className={`otp-input ${digit ? 'border-amber-500 bg-amber-50' : ''}`} />
                ))}
              </div>

              <button onClick={handleVerifyOTP} disabled={loading || otp.join('').length < 6} className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-sm text-slate-500">
                {countdown > 0 ? (
                  <span>Resend OTP in <span className="font-semibold text-amber-600">{countdown}s</span></span>
                ) : (
                  <button onClick={handleResendOTP} disabled={resending} className="text-amber-600 font-semibold hover:underline disabled:opacity-50">
                    {resending ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button onClick={() => setStep(1)} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">← Edit Details</button>
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
                        <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(password) ? 'text-amber-600' : 'text-slate-400'}`}>
                          <FaCheckCircle className={r.test(password) ? 'text-amber-500' : 'text-slate-300'} />
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
                  <input type={showC ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm your password" className={`input pl-10 pr-10 ${confirm && password !== confirm ? 'border-danger-400 focus:ring-danger-500' : confirm && password === confirm ? 'border-amber-400 focus:ring-amber-500' : ''}`} />
                  <button type="button" onClick={() => setShowC(!showC)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showC ? <FaEyeSlash /> : <FaEye />}</button>
                </div>
                {confirm && password !== confirm && <p className="text-xs text-danger-500 mt-1.5">Passwords do not match</p>}
                {confirm && password === confirm && <p className="text-xs text-amber-600 mt-1.5">✓ Passwords match</p>}
              </div>

              <button type="submit" disabled={loading || !password || !confirm} className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Saving...' : 'Reset Password & Login'}
              </button>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
}
