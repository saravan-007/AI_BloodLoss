import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  FaHeartbeat, FaUserMd, FaUserNurse, FaHome, FaUsers,
  FaProcedures, FaFileAlt, FaBell, FaUser, FaSignOutAlt,
  FaBars, FaTimes, FaChevronRight,
} from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
import { toast } from 'react-toastify';

const getDoctorMenu = () => [
  { to: '/doctor/dashboard',     icon: <MdDashboard />, label: 'Dashboard' },
  { to: '/doctor/patients',      icon: <FaUsers />,     label: 'Patients' },
  { to: '/doctor/start-surgery', icon: <FaProcedures />,label: 'New Surgery', badge: 'NEW' },
  { to: '/doctor/reports',       icon: <FaFileAlt />,   label: 'Reports' },
  { to: '/doctor/surgeries',     icon: <FaProcedures />,label: 'History' },
  { to: '/doctor/discharged-patients', icon: <FaUsers />, label: 'Discharged' },
  { to: '/doctor/profile',       icon: <FaUser />,      label: 'Profile' },
];

const getNurseMenu = () => [
  { to: '/nurse/dashboard',     icon: <MdDashboard />, label: 'Dashboard' },
  { to: '/nurse/patients',      icon: <FaUsers />,     label: 'Patients' },
  { to: '/nurse/start-surgery', icon: <FaProcedures />,label: 'New Surgery', badge: 'NEW' },
  { to: '/nurse/surgeries',     icon: <FaProcedures />,label: 'History' },
  { to: '/nurse/discharged-patients', icon: <FaUsers />, label: 'Discharged' },
  { to: '/nurse/notifications', icon: <FaBell />,      label: 'Notifications' },
  { to: '/nurse/profile',       icon: <FaUser />,      label: 'Profile' },
];

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menu = role === 'doctor' ? getDoctorMenu() : getNurseMenu();
  const isDoctor = role === 'doctor';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0b0f1a] text-slate-400">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-6 py-6 border-b border-slate-800/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${isDoctor ? 'bg-primary-600' : 'bg-emerald-600'}`}>
          <FaHeartbeat className="text-white text-xl" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-black text-white text-lg leading-none tracking-tight">Blood Loss</p>
            <p className="text-[11px] mt-1.5 font-black uppercase tracking-[0.2em] text-slate-400">Monitor System</p>
          </div>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-4 mt-6 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/20 border border-slate-800/30">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-glow overflow-hidden ${isDoctor ? 'bg-primary-600' : 'bg-emerald-600'}`}>
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate tracking-tight">{user?.fullName || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isDoctor ? 'bg-blue-400' : 'bg-emerald-400'} shadow-glow`} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menu.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`${active ? (isDoctor ? 'sidebar-link-active' : 'sidebar-link-active-nurse') : 'sidebar-link'} ${collapsed ? 'justify-center' : ''}`}
            >
              <span className={`text-lg flex-shrink-0 transition-colors ${active ? 'text-white' : (isDoctor ? 'group-hover:text-primary-400' : 'group-hover:text-emerald-400')}`}>{item.icon}</span>
              {!collapsed && <span className="truncate flex-1 tracking-wide font-black">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${isDoctor ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-6 border-t border-slate-800/50">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-danger-400 hover:bg-danger-900/20 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <FaSignOutAlt className="flex-shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-bg flex text-slate-300">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-[#0b0f1a] border-r border-slate-800/50 z-30 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        {renderSidebarContent()}
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 shadow-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <FaChevronRight className={`text-[10px] transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 h-screen w-64 bg-[#0b0f1a] border-r border-slate-800/50 z-50 lg:hidden"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Top navbar */}
        <header className="sticky top-0 z-20 bg-dark-bg/80 backdrop-blur-md border-b border-slate-800/50 px-4 md:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors"
          >
            <FaBars />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
              <Link to="/" className={`hover:transition-colors ${isDoctor ? 'hover:text-primary-400' : 'hover:text-emerald-400'}`}>Home</Link>
              <FaChevronRight className="text-[8px]" />
              <span className="text-slate-400">{menu.find(m => location.pathname.startsWith(m.to))?.label || 'Dashboard'}</span>
            </div>
            <h1 className="text-white font-black text-lg truncate">
              {menu.find(m => location.pathname.startsWith(m.to))?.label || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/${role}/notifications`)}
              className="relative p-2.5 rounded-xl bg-slate-800/40 text-slate-400 hover:text-white border border-slate-800/50 transition-all"
            >
              <FaBell className="text-lg" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-danger-500 rounded-full border-2 border-dark-bg" />
            </button>
            
            <div 
              onClick={() => navigate(`/${role}/profile`)}
              className="flex items-center gap-3 pl-4 border-l border-slate-800/50 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-black text-white leading-none transition-colors ${isDoctor ? 'group-hover:text-primary-400' : 'group-hover:text-emerald-400'}`}>{user?.fullName || 'User'}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-1">{role}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-glow group-hover:scale-105 transition-all overflow-hidden ${isDoctor ? 'bg-primary-600' : 'bg-emerald-600'}`}>
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
