import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle,
  FaUserNurse, FaFileAlt, FaCheckDouble, FaTrashAlt, FaFolderOpen
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const iconMap = {
  appointment:  <FaUserNurse className="text-emerald-400" />,
  report_share: <FaFileAlt className="text-blue-400" />,
  alert:        <FaExclamationTriangle className="text-red-400" />,
};

const bgMap = {
  appointment:  'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30',
  report_share: 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30',
  alert:        'bg-red-500/5 border-red-500/10 hover:border-red-500/30',
};

const activeTabStyles = "border-emerald-500 text-emerald-400 bg-emerald-500/10";
const inactiveTabStyles = "border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-900/40 hover:bg-slate-900/80";

export default function NurseNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'appointment', 'report_share', 'alert'
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let liveNotifications = [];
      try {
        const { data } = await api.get('/notifications');
        liveNotifications = data;
      } catch (err) {
        console.warn('API error fetching notifications, falling back to localStorage.');
      }

      // Check localStorage for demo notifications
      let demoNotifications = localStorage.getItem('demo_notifications');
      
      if (!demoNotifications) {
        // Initialize demo notifications if empty
        const demoPatients = JSON.parse(localStorage.getItem('demo_patients') || '[]');
        const firstDemoPatientId = demoPatients[0]?._id || 'mock-patient-1';
        const initialDemo = [
          {
            _id: 'mock-notif-1',
            recipientRole: 'nurse',
            title: 'New Patient Appointment Allotment',
            message: `You have been appointed to patient ${demoPatients[0]?.patientName || 'John Doe'} for ${demoPatients[0]?.surgeryType || 'General Surgery'}.`,
            type: 'appointment',
            patientId: firstDemoPatientId,
            isRead: false,
            createdAt: new Date(Date.now() - 1800000).toISOString() // 30 mins ago
          },
          {
            _id: 'mock-notif-2',
            recipientRole: 'nurse',
            title: 'New Doctor Daily Note',
            message: `Dr. Smith added a note: "Keep monitoring insensible fluid loss and urine output."`,
            type: 'alert',
            patientId: firstDemoPatientId,
            isRead: false,
            createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          },
          {
            _id: 'mock-notif-3',
            recipientRole: 'nurse',
            title: 'Shared Surgery Report',
            message: `Post-op fluid and blood loss estimations report has been shared with you.`,
            type: 'report_share',
            patientId: firstDemoPatientId,
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ];
        localStorage.setItem('demo_notifications', JSON.stringify(initialDemo));
        demoNotifications = initialDemo;
      } else {
        demoNotifications = JSON.parse(demoNotifications);
      }

      // Combine real + demo notifications (only show nurse's own notifications)
      const combined = [...demoNotifications, ...liveNotifications];
      const unique = Array.from(new Map(combined.map(n => [n._id, n])).values())
        .filter(n => n.recipientRole === 'nurse')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(unique);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      if (id.toString().startsWith('mock-')) {
        const demoNotifs = JSON.parse(localStorage.getItem('demo_notifications') || '[]');
        const updated = demoNotifs.map(n => n._id === id ? { ...n, isRead: true } : n);
        localStorage.setItem('demo_notifications', JSON.stringify(updated));
        setNotifications(updated);
      } else {
        await api.put(`/notifications/${id}/read`);
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = filteredNotifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    try {
      const mockIds = unread.filter(n => n._id.toString().startsWith('mock-')).map(n => n._id);
      const realIds = unread.filter(n => !n._id.toString().startsWith('mock-')).map(n => n._id);

      if (mockIds.length > 0) {
        const demoNotifs = JSON.parse(localStorage.getItem('demo_notifications') || '[]');
        const updated = demoNotifs.map(n => mockIds.includes(n._id) ? { ...n, isRead: true } : n);
        localStorage.setItem('demo_notifications', JSON.stringify(updated));
        // local state update will happen via merge below
      }

      if (realIds.length > 0) {
        await Promise.all(realIds.map(id => api.put(`/notifications/${id}/read`)));
      }

      setNotifications(prev => prev.map(n => unread.find(u => u._id === n._id) ? { ...n, isRead: true } : n));
      toast.success('All current category notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = (id) => {
    // Allows nurses to clear/delete demo notifications or locally dismissed ones
    if (id.toString().startsWith('mock-')) {
      const demoNotifs = JSON.parse(localStorage.getItem('demo_notifications') || '[]');
      const updated = demoNotifs.filter(n => n._id !== id);
      localStorage.setItem('demo_notifications', JSON.stringify(updated));
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notification cleared');
    } else {
      // Local dismissal for UI
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notification dismissed');
    }
  };

  // Filtering based on tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  });

  // Calculate unread counts for badges
  const getUnreadCount = (type) => {
    if (type === 'all') {
      return notifications.filter(n => !n.isRead).length;
    }
    return notifications.filter(n => n.type === type && !n.isRead).length;
  };

  const tabs = [
    { id: 'all', label: 'All Notifications', countKey: 'all' },
    { id: 'appointment', label: 'Patient Allotments', countKey: 'appointment' },
    { id: 'report_share', label: 'Shared Reports', countKey: 'report_share' },
    { id: 'alert', label: 'OT & Daily Notes Alerts', countKey: 'alert' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <FaBell className="text-emerald-400" />
            Nurse Notification Center
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Keep track of patient allotments, medical alert changes, and shared surgery logs.
          </p>
        </div>
        {filteredNotifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn-secondary !bg-emerald-500/10 hover:!bg-emerald-500/20 text-emerald-400 !text-xs !py-2 !px-4 border border-emerald-500/20 shadow-emerald-glow"
          >
            <FaCheckDouble className="text-xs" /> Mark Category As Read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const unreadCount = getUnreadCount(tab.countKey);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all duration-150 ${isActive ? activeTabStyles : inactiveTabStyles}`}
            >
              {tab.label}
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/10 rounded-2xl animate-pulse border border-slate-800/50" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card text-center py-20 flex flex-col items-center justify-center border-dashed border-2 border-slate-800 bg-transparent">
          <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center mb-6 border border-slate-800">
            <FaBell className="text-2xl text-slate-600" />
          </div>
          <p className="text-slate-500 font-bold text-lg">All caught up!</p>
          <p className="text-[11px] text-slate-600 mt-1 font-medium max-w-xs mx-auto">
            {activeTab === 'all' 
              ? 'No notifications present in your history logs.' 
              : `No notifications found under the selected category.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((n, i) => {
              const isRead = !!n.isRead;
              return (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => !isRead && handleMarkAsRead(n._id)}
                  className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer relative group ${
                    bgMap[n.type] || 'bg-slate-850/40 border-slate-800'
                  } ${isRead ? 'opacity-40 grayscale-[0.3]' : 'hover:scale-[1.01] hover:shadow-lg'}`}
                >
                  {/* Category icon */}
                  <div className="text-xl mt-0.5 flex-shrink-0">
                    {iconMap[n.type] || <FaInfoCircle className="text-slate-400" />}
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-white text-[13px] tracking-tight">
                        {n.title}
                      </h4>
                      {!isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1 shadow-emerald-glow" />
                      )}
                    </div>
                    <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
                      {n.message}
                    </p>

                    {/* Patient detail link */}
                    {n.patientId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/nurse/patients/${n.patientId}`);
                        }}
                        className="mt-3.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <FaFolderOpen className="text-[10px]" /> Go to Patient File →
                      </button>
                    )}

                    {/* Footer / timestamp */}
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-3">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Delete button (displays on card hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(n._id);
                    }}
                    className="absolute right-4 top-4 text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Dismiss notification"
                  >
                    <FaTrashAlt className="text-xs" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
