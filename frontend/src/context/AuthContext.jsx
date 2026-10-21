import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authAPI, metaLeadsAPI } from '../services/api';
import geoTracker from '../services/geoTracker';
import { emitCrmSync, CRM_EVENTS } from '../services/crmSyncBus';

const AuthContext = createContext(null);

// Specific keys to clean when switching users or logging out to avoid cross-user data leakage
const USER_CACHE_KEYS = [
  'aotms_token',
  'aotms_user',
  'aotms_bulk_uploads',
  'wa_active_lead_id',
  'token',
  'user'
];

export const clearUserStorage = () => {
  USER_CACHE_KEYS.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch (_) {}
  });
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('aotms_token'));
  const [user, setUser] = useState(null); // Never show stale profile while verifying
  const [metaLeadAssignment, setMetaLeadAssignment] = useState({ hasAccess: false, loading: true });
  const [loading, setLoading] = useState(true);

  const refreshMetaLeadAssignment = useCallback(async () => {
    try {
      const res = await metaLeadsAPI.getMyAssignmentStatus();
      if (res?.data?.success) {
        setMetaLeadAssignment({
          hasAccess: Boolean(res.data.hasAccess),
          isAdmin: Boolean(res.data.isAdmin),
          assignedCount: res.data.assignedCount,
          assignedCampaigns: res.data.assignedCampaigns || [],
          loading: false
        });
        return res.data;
      }
    } catch (err) {
      setMetaLeadAssignment({ hasAccess: false, loading: false });
    }
    return null;
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('aotms_token');
    if (savedToken) {
      authAPI.me()
        .then(res => {
          const u = res?.data?.user || res?.data || res?.user;
          if (u) {
            setUser(u);
            localStorage.setItem('aotms_user', JSON.stringify(u));
            refreshMetaLeadAssignment();
          }
        })
        .catch(() => {
          clearUserStorage();
          setToken(null);
          setUser(null);
          setMetaLeadAssignment({ hasAccess: false, loading: false });
          geoTracker.stopTracking().catch(() => {});
          emitCrmSync(CRM_EVENTS.SESSION_RESET);
        })
        .finally(() => setLoading(false));
    } else {
      clearUserStorage();
      setLoading(false);
      setMetaLeadAssignment({ hasAccess: false, loading: false });
    }
  }, [refreshMetaLeadAssignment]);

  const login = useCallback(async (email, password) => {
    // If switching accounts, clear previous user's cached keys first
    clearUserStorage();
    emitCrmSync(CRM_EVENTS.SESSION_RESET);

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
    clearUserStorage();
    setToken(null);
    setUser(null);
    setMetaLeadAssignment({ hasAccess: false, loading: false });
    emitCrmSync(CRM_EVENTS.SESSION_RESET);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('aotms_user', JSON.stringify(updatedUser));
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      loading,
      updateUser,
      metaLeadAssignment,
      refreshMetaLeadAssignment
    }),
    [user, token, loading, login, logout, updateUser, metaLeadAssignment, refreshMetaLeadAssignment]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);