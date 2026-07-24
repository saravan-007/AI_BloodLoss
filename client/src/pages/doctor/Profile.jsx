import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { FaUser, FaEdit, FaSave, FaTimes, FaLock, FaUserMd, FaCamera } from 'react-icons/fa';
import { MdWork } from 'react-icons/md';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const QUALIFICATIONS = ['MD', 'MS', 'MBBS', 'DNB', 'PhD', 'Other'];
const DEPARTMENTS = ['General Surgery', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Obstetrics & Gynecology', 'Urology', 'Neurology', 'Other'];
const SPECIALIZATIONS = ['General Surgery', 'Cardiothoracic', 'Orthopedic Surgery', 'Neurosurgeon', 'Gastroenterology', 'Urologist', 'Plastic Surgery', 'Pediatric Surgery', 'Other'];

export default function DoctorProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    address: user?.address || '',
    mobileNumber: user?.mobileNumber || '',
    email: user?.email || '',
    specialization: user?.specialization || '',
    department: user?.department || '',
    qualification: user?.qualification || '',
    registrationNumber: user?.registrationNumber || '',
    hospitalName: user?.hospitalName || '',
  });

  // Password change section
  const [showPassSection, setShowPassSection] = useState(false);
  const [passForm, setPassForm] = useState({ identifier: user?.email || user?.mobileNumber || '', step: 'input' });
  const [otp, setOtp]           = useState('');
  const [newPass, setNewPass]   = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtpState, setDevOtpState] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Profile image must be smaller than 2MB');
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setLoading(true);
      try {
        const { data } = await api.put('/auth/profile', { profilePhoto: base64 });
        updateUser(data.user);
        toast.success('Profile photo updated successfully!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload profile photo');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendOTP = async () => {
    setOtpLoading(true);
    const identifier = user?.email || user?.mobileNumber;
    try {
      const { data } = await api.post('/auth/send-otp', { identifier, role: 'doctor', purpose: 'reset' });
      toast.success('OTP sent!');
      if (data.devOtp) setDevOtpState(data.devOtp);
      setPassForm(p => ({ ...p, step: 'otp' }));
    } catch (err) {
      const isNetworkError = !err.response;
      const isServerError = err.response?.status >= 500;
      if (isNetworkError || isServerError) {
        toast.warn('Backend unreachable. Entering Demo Mode...');
        const randomOTP = Math.floor(100000 + Math.random() * 900000).toString();
        setDevOtpState(randomOTP);
        setPassForm(p => ({ ...p, step: 'otp' }));
      } else {
        toast.error(err.response?.data?.message || 'Failed to send OTP');
      }
    }
    finally { setOtpLoading(false); }
  };

  const handleVerifyAndReset = async () => {
    setOtpLoading(true);
    try {
      const identifier = user?.email || user?.mobileNumber;
      await api.post('/auth/verify-otp', { identifier, otp, role: 'doctor', purpose: 'reset' });
      await api.post('/auth/set-password', { identifier, role: 'doctor', password: newPass, purpose: 'reset' });
      toast.success('Password changed successfully!');
      setShowPassSection(false);
      setPassForm({ identifier, step: 'input' });
      setOtp(''); setNewPass(''); setDevOtpState('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setOtpLoading(false); }
  };

  const fields = [
    { label: 'Full Name',       name: 'fullName',       type: 'text'  },
    { label: 'Email',           name: 'email',           type: 'email' },
    { label: 'Mobile Number',   name: 'mobileNumber',    type: 'text'  },
    { label: 'Address',         name: 'address',         type: 'text'  },
    { label: 'Qualification',   name: 'qualification',   type: 'select' },
    { label: 'Department',      name: 'department',      type: 'select' },
    { label: 'Specialization',  name: 'specialization',  type: 'select' },
    { label: 'Registration No', name: 'registrationNumber', type: 'text' },
    { label: 'Hospital Name',   name: 'hospitalName',    type: 'text'  },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Medical Profile</h2>
      </div>

      {/* Profile card */}
      <div className="card !p-8">
        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-800/50">
          <div className="relative">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-white text-4xl font-black transition-all overflow-hidden ${user?.role === 'doctor' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-glow' : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-glow'}`}>
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0)?.toUpperCase() || 'D'
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center hover:text-white transition-colors"
            >
              <FaCamera className="text-xs" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{user?.fullName}</h3>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-3">
                <span className={`font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 ${user?.role === 'doctor' ? 'text-primary-400' : 'text-emerald-400'}`}>
                  <FaUserMd /> {user?.specialization || 'Surgeon'}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">{user?.hospitalName || 'Clinical Center'}</span>
              </div>
              {user?.updatedAt && (
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Last Updated: {new Date(user.updatedAt).toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary !py-2.5 !px-6 !text-xs !font-black !rounded-xl">
              <FaEdit /> EDIT PROFILE
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={loading} className={`btn-primary !py-2.5 !px-6 !text-xs !font-black !rounded-xl ${user?.role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`}>
                <FaSave /> {loading ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary !py-2.5 !px-3 !text-xs !font-black !rounded-xl">
                <FaTimes />
              </button>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {fields.map(f => {
            const isSelect = f.type === 'select';
            const options = f.name === 'specialization' ? SPECIALIZATIONS : f.name === 'department' ? DEPARTMENTS : QUALIFICATIONS;

            return (
              <div key={f.name}>
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">{f.label}</label>
                {editing ? (
                  isSelect ? (
                    <select
                      value={form[f.name]}
                      onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                      className={`input !bg-slate-800/40 border-slate-800 focus:ring-1 ${user?.role === 'doctor' ? 'focus:border-primary-500/50 focus:ring-primary-500/20' : 'focus:border-emerald-500/50 focus:ring-emerald-500/20'}`}
                    >
                      <option value="">Select...</option>
                      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={form[f.name]}
                      onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                      className={`input !bg-slate-800/40 border-slate-800 focus:ring-1 ${user?.role === 'doctor' ? 'focus:border-primary-500/50 focus:ring-primary-500/20' : 'focus:border-emerald-500/50 focus:ring-emerald-500/20'}`}
                    />
                  )
                ) : (
                  <p className="text-white font-bold py-2 border-b border-transparent">{user?.[f.name] || '—'}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Password section */}
      <div className="card !p-8 border-amber-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
              <FaLock />
            </div>
            <div>
              <h3 className="font-black text-white tracking-tight">Security Credentials</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Manage your login security</p>
            </div>
          </div>
          <button 
            onClick={() => setShowPassSection(!showPassSection)} 
            className={`btn-secondary !py-2.5 !px-6 !text-xs !font-black !rounded-xl ${showPassSection ? '!text-red-400 !border-red-500/20' : ''}`}
          >
            {showPassSection ? 'CANCEL' : 'CHANGE PASSWORD'}
          </button>
        </div>

        {showPassSection && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mt-8 p-6 bg-slate-800/20 rounded-2xl border border-slate-800">
            {passForm.step === 'input' ? (
              <>
                <div className={`text-sm font-medium bg-white/5 border rounded-xl px-4 py-4 ${user?.role === 'doctor' ? 'text-blue-400 border-blue-500/10 bg-blue-500/5' : 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5'}`}>
                   🔐 An OTP will be sent to your registered {user?.email ? 'email' : 'mobile'}: <strong className={user?.role === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}>{user?.email || user?.mobileNumber}</strong>
                </div>
                <button onClick={handleSendOTP} disabled={otpLoading} className={`btn-primary w-full !py-4 !rounded-xl !text-xs !font-black ${user?.role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`}>
                  {otpLoading ? 'SENDING OTP...' : 'SEND VERIFICATION CODE'}
                </button>
              </>
            ) : (
              <div className="space-y-6">
                {devOtpState && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4 text-center">
                    <p className="font-semibold mb-1">Development Mode</p>
                    <p>Your test OTP is: <span className="font-bold text-lg tracking-widest">{devOtpState}</span></p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Enter Verification Code</label>
                  <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" className="input text-center text-2xl tracking-[1em] font-black" maxLength={6} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Create New Password</label>
                  <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 characters" className="input" />
                </div>
                <button onClick={handleVerifyAndReset} disabled={otpLoading || !otp || !newPass} className={`btn-primary w-full !py-4 !rounded-xl !text-xs !font-black ${user?.role === 'doctor' ? 'shadow-blue-glow' : 'shadow-emerald-glow !bg-emerald-600 hover:!bg-emerald-700'}`}>
                  {otpLoading ? 'UPDATING...' : 'UPDATE ACCOUNT PASSWORD'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

