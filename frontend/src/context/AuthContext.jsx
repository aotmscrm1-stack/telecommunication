import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authAPI } from '../services/api';
import geoTracker from '../services/geoTracker';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('aotms_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('aotms_user');
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('aotms_token');
    if (savedToken) {
      authAPI.me()
        .then(res => {
          const u = res?.data?.user || res?.data || res?.user;
          if (u) {
            setUser(u);
            localStorage.setItem('aotms_user', JSON.stringify(u));
          }
        })
        .catch(() => {
          localStorage.removeItem('aotms_token');
          localStorage.removeItem('aotms_user');
          setToken(null);
          setUser(null);
          geoTracker.stopTracking().catch(() => {});
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const newToken = res?.data?.token || res?.token;
    const newUser = res?.data?.user || res?.user;
    
    if (newToken) {
      localStorage.setItem('aotms_token', newToken);
      setToken(newToken);
    }
    if (newUser) {
      localStorage.setItem('aotms_user', JSON.stringify(newUser));
      setUser(newUser);
    }
    return res.data || res;
  }, []);

  const logout = useCallback(() => {
    geoTracker.stopTracking().catch(() => {});
    localStorage.removeItem('aotms_token');
    localStorage.removeItem('aotms_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('aotms_user', JSON.stringify(updatedUser));
  }, []);

  const contextValue = useMemo(
    () => ({ user, token, login, logout, loading, updateUser }),
    [user, token, loading, login, logout, updateUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);