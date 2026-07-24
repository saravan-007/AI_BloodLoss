import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaUserNurse, FaFileAlt } from 'react-icons/fa';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const iconMap = {
  appointment:  <FaUserNurse className="text-primary-400" />,
  report_share: <FaFileAlt className="text-emerald-400" />,
  alert:        <FaExclamationTriangle className="text-red-400" />,
};

const bgMap = {
  appointment:  'bg-primary-500/5 border-primary-500/10',
  report_share: 'bg-emerald-500/5 border-emerald-500/10',
  alert:        'bg-red-500/5 border-red-500/10',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { role, user } = useAuth();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Fallback for Demo Mode
        if (user?.isDemo) {
          setNotifications([]);
          setLoading(false);
          return;
        }

        const { data } = await api.get('/notifications');
        setNotifications(data);
      } catch (err) {
        console.error('Notification fetch error:', err);
        if (user?.isDemo) {
          setNotifications([]);
        } else {
          toast.error('Failed to load notifications');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Notifications</h2>
          <p className="text-slate-500 text-sm mt-1">{notifications.filter(n => !n.isRead).length} unread</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary-400 text-lg border border-slate-700 shadow-inner">
          <FaBell />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/20 rounded-2xl animate-pulse border border-slate-800/50" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-20 flex flex-col items-center justify-center border-dashed border-2 border-slate-800 bg-transparent">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
            <FaBell className="text-2xl text-slate-600" />
          </div>
          <p className="text-slate-500 font-bold text-lg">No notifications yet</p>
          <p className="text-[11px] text-slate-600 mt-1 font-medium max-w-[200px]">We'll alert you when a patient is assigned or a report is shared.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, i) => (
            <motion.div
              key={n._id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => !n.isRead && handleMarkAsRead(n._id)}
              className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${bgMap[n.type] || 'bg-slate-800/40 border-slate-800'} ${n.isRead ? 'opacity-50 grayscale-[0.5]' : 'hover:scale-[1.01] shadow-lg'}`}
            >
              <div className="text-xl mt-1 flex-shrink-0">{iconMap[n.type] || <FaInfoCircle className="text-slate-400" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-white text-[13px] tracking-tight">{n.title}</h4>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5 shadow-glow" />}
                </div>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{n.message}</p>
                {n.patientId && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/${role}/patients/${n.patientId}`);
                    }}
                    className="mt-3 text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 flex items-center gap-1.5"
                  >
                    View Patient Report →
                  </button>
                )}
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-3">
                  {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
