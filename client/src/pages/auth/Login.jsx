import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaUserMd, FaUserNurse, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash, FaHeartbeat } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function Login({ role }) {
  const isDoctor = role === 'doctor';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputType, setInputType] = useState('email'); // email or mobile

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'identifier') {
      setInputType(/^[\d+]/.test(value) ? 'mobile' : 'email');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { ...form, role });
      login(data.token, data.user, role);
      toast.success(`Welcome back, ${data.user.fullName}!`);
      navigate(`/${role}/dashboard`);
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const accentFrom = isDoctor ? 'from-blue-600' : 'from-emerald-600';
  const accentTo = isDoctor ? 'to-blue-800' : 'to-teal-800';
  const ringColor = isDoctor ? 'focus:ring-primary-500' : 'focus:ring-medical-500';

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="relative z-10 text-center">
          <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center text-4xl text-white shadow-2xl mb-8 animate-float`}>
            {isDoctor ? <FaUserMd /> : <FaUserNurse />}
          </div>
          <h2 className="text-4xl font-black text-white mb-4">{isDoctor ? 'Doctor' : 'Nurse'} Portal</h2>
          <p className="text-slate-300 text-lg max-w-sm">AI-powered surgical monitoring system for modern healthcare professionals</p>
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-xs mx-auto">
            {['Real-time tracking', 'Smart alerts', 'PDF reports', 'Secure & Fast'].map((f) => (
              <div key={f} className="glass rounded-xl p-3 text-slate-300 text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDoctor ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                {f}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center text-white text-xl shadow-sm`}>
                <FaHeartbeat />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">Sign In</h1>
                <p className="text-slate-500 text-sm">{isDoctor ? 'Doctor' : 'Nurse'} account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div>
                <label className="label">Email or Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {inputType === 'mobile' ? <FaPhone /> : <FaEnvelope />}
                  </span>
                  <input
                    name="identifier"
                    value={form.identifier}
                    onChange={handleChange}
                    placeholder="Enter email or mobile number"
                    className="input pl-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FaLock /></span>
                  <input
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="input pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="text-right">
                <Link to="/forgot-password" state={{ role }} className={`text-sm font-medium ${isDoctor ? 'text-primary-600 hover:text-primary-700' : 'text-medical-600 hover:text-medical-700'}`}>
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${accentFrom} ${accentTo} hover:opacity-90 transition-all duration-200 shadow-md disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Register link */}
              <p className="text-center text-slate-500 text-sm">
                Don't have an account?{' '}
                <Link to={`/${role}/register`} className={`font-semibold ${isDoctor ? 'text-primary-600 hover:text-primary-700' : 'text-medical-600 hover:text-medical-700'}`}>
                  Register here
                </Link>
              </p>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-slate-400 text-xs">or</span></div>
              </div>

              <p className="text-center">
                <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 font-medium">← Back to Home</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
