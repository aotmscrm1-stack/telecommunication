import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import geoTracker from '../services/geoTracker';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('aotms_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aotms_token');
    if (token) {
      authAPI.me()
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('aotms_user', JSON.stringify(res.data.user));
          // Auto start live location tracking on restored session
          geoTracker.startTracking().catch(() => {});
        })
        .catch(() => {
          localStorage.removeItem('aotms_token');
          localStorage.removeItem('aotms_user');
          setUser(null);
          geoTracker.stopTracking().catch(() => {});
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('aotms_token', res.data.token);
    localStorage.setItem('aotms_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    // Automatically enable live location tracking immediately on successful login click
    geoTracker.startTracking().catch((err) => {
      console.warn('[AuthContext] Automatic location tracking start error:', err?.message || err);
    });
    return res.data;
  };

  const logout = () => {
    // Automatically disable live location tracking immediately on logout click
    geoTracker.stopTracking().catch((err) => {
      console.warn('[AuthContext] Automatic location tracking stop error:', err?.message || err);
    });
    localStorage.removeItem('aotms_token');
    localStorage.removeItem('aotms_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('aotms_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);