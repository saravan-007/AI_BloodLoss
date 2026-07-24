import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaHeartbeat, FaUserMd, FaUserNurse, FaTint, FaShieldAlt,
  FaChartLine, FaClock, FaBell, FaFileMedical, FaHospital, FaBrain
} from 'react-icons/fa';
import { MdBloodtype, MdMonitorHeart } from 'react-icons/md';
import { GiMedicalDrip } from 'react-icons/gi';

const features = [
  { icon: <FaBrain />,        title: 'AI-Powered Analysis',    desc: 'Smart blood loss estimation using advanced algorithms', color: 'from-violet-500 to-purple-600' },
  { icon: <MdMonitorHeart />, title: 'Real-Time Monitoring',   desc: 'Live tracking of fluid loss during surgery',            color: 'from-rose-500 to-red-600'     },
  { icon: <FaTint />,      title: 'Fluid Tracking',         desc: 'Precise suction, gauze, and urine measurement',        color: 'from-blue-500 to-cyan-600'    },
  { icon: <FaShieldAlt />,    title: 'Emergency Alerts',       desc: 'Instant notifications for critical blood loss levels',  color: 'from-amber-500 to-orange-600' },
  { icon: <FaFileMedical />,  title: 'Patient Management',     desc: 'Complete patient records and surgery history',          color: 'from-emerald-500 to-teal-600' },
  { icon: <FaChartLine />,    title: 'Analytics & Reports',    desc: 'Downloadable PDF reports and trend charts',            color: 'from-sky-500 to-indigo-600'   },
];

const stats = [
  { value: '99.9%', label: 'Accuracy Rate' },
  { value: '500+',  label: 'Hospitals' },
  { value: '50K+',  label: 'Surgeries Tracked' },
  { value: '24/7',  label: 'Monitoring' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }),
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #0c1a4b 60%, #0f172a 100%)',
      }}>
        {/* Animated blobs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, #dc2626, transparent)', animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full opacity-15 blur-3xl animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)', animationDelay: '4s' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-glow">
            <FaHeartbeat className="text-white text-lg" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">BloodLoss Monitor</p>
            <p className="text-blue-300 text-xs">AI-Powered Surgery System</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/doctor/login')} className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors">Doctor Login</button>
          <button onClick={() => navigate('/nurse/login')}  className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors">Nurse Login</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-12 pb-20 text-center">
        <motion.div initial="hidden" animate="visible" className="max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-300 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI-Powered Intra-Operative Monitoring System
          </motion.div>

          {/* Title */}
          <motion.h1 custom={1} variants={fadeUp} className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Blood Loss Estimator
            <span className="block mt-2" style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              & Fluid Monitor
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p custom={2} variants={fadeUp} className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Precision surgical monitoring with AI-powered blood loss estimation, real-time fluid tracking, 
            and instant emergency alerts for doctors and nurses.
          </motion.p>

          {/* CTA buttons */}
          <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/doctor/login')}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl shadow-glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-base min-w-[200px]"
            >
              <FaUserMd className="text-xl" />
              <div className="text-left">
                <div className="text-xs text-blue-200 leading-none mb-0.5">I'm a</div>
                <div>Doctor</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/nurse/login')}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold rounded-2xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-base min-w-[200px]"
              style={{ boxShadow: '0 0 20px rgba(34,197,94,0.4)' }}
            >
              <FaUserNurse className="text-xl" />
              <div className="text-left">
                <div className="text-xs text-emerald-200 leading-none mb-0.5">I'm a</div>
                <div>Nurse</div>
              </div>
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div custom={4} variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map((s, i) => (
              <div key={i} className="glass rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-slate-400 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 px-6 md:px-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-slate-400 max-w-lg mx-auto">A complete surgical monitoring platform designed for modern operating theaters</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={i}
              custom={i} variants={fadeUp}
              initial="hidden" whileInView="visible"
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 group cursor-default"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white text-xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Surgery workflow preview */}
      <section className="relative z-10 px-6 md:px-12 pb-20">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">6-Step Surgery Workflow</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { step: 1, title: 'Gauze Calculation',   icon: <MdBloodtype />,   color: 'from-blue-600 to-blue-700'    },
              { step: 2, title: 'Suction Blood',        icon: <GiMedicalDrip />, color: 'from-cyan-600 to-teal-700'    },
              { step: 3, title: 'Total Blood Loss',     icon: <FaTint />,     color: 'from-red-600 to-rose-700'     },
              { step: 4, title: 'Insensible Loss',      icon: <FaClock />,       color: 'from-amber-600 to-orange-700' },
              { step: 5, title: 'Urine Collection',     icon: <FaHospital />,    color: 'from-violet-600 to-purple-700'},
              { step: 6, title: 'Total Fluid Loss',     icon: <FaChartLine />,   color: 'from-emerald-600 to-green-700'},
            ].map((s) => (
              <div key={s.step} className="glass rounded-2xl p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white text-lg flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Step {s.step}</div>
                  <div className="text-white font-semibold text-sm">{s.title}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <FaHeartbeat className="text-blue-400" />
            <span>AI-Powered Intra-Operative Blood Loss Estimator &amp; Fluid Monitoring System</span>
          </div>
          <div className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} BloodLoss Monitor. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
