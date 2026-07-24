import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    setUser(null);
    setRole(null);
  };

  // On mount, restore session from localStorage
  useEffect(() => {
    const token    = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    const savedUser = localStorage.getItem('user');
    if (token && savedRole && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setRole(savedRole);
      } catch { clearSession(); }
    }
    setLoading(false);
  }, []);

  const login = (token, userData, userRole) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', userRole);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setRole(userRole);
  };

  const logout = () => {
    clearSession();
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
