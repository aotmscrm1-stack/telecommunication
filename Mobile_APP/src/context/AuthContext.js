import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync
} from '../services/notificationService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and check existing session
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('aotms_token');
      const storedUser = await AsyncStorage.getItem('aotms_user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (parseErr) {}
        }

        // Immediately unblock UI so app opens in milliseconds
        setIsLoading(false);

        // Immediately synchronize device push token in background
        registerForPushNotificationsAsync().catch(() => {});

        // Verify token in background asynchronously without stalling app startup
        authApi.getMe()
          .then(async (meData) => {
            if (meData?.user) {
              setUser(meData.user);
              await AsyncStorage.setItem('aotms_user', JSON.stringify(meData.user));
              registerForPushNotificationsAsync().catch(() => {});
            }
          })
          .catch(async (verifyErr) => {
            if (verifyErr.response?.status === 401) {
              console.log('[AuthContext] Session expired, logging out');
              await logout();
            }
          });
        return;
      }
    } catch (e) {
      console.error('[AuthContext] Failed to load stored credentials:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    const receivedToken = data.token;
    const receivedUser = data.user;

    if (receivedToken) {
      await AsyncStorage.setItem('aotms_token', receivedToken);
      setToken(receivedToken);
    }
    if (receivedUser) {
      await AsyncStorage.setItem('aotms_user', JSON.stringify(receivedUser));
      setUser(receivedUser);
      // Register device FCM token after successful authentication
      registerForPushNotificationsAsync().catch(() => {});
    }
    return data;
  };

  const signup = async (userData) => {
    const data = await authApi.register(userData);
    const receivedToken = data.token;
    const receivedUser = data.user;

    if (receivedToken) {
      await AsyncStorage.setItem('aotms_token', receivedToken);
      setToken(receivedToken);
    }
    if (receivedUser) {
      await AsyncStorage.setItem('aotms_user', JSON.stringify(receivedUser));
      setUser(receivedUser);
      registerForPushNotificationsAsync().catch(() => {});
    }
    return data;
  };

  const logout = async () => {
    try {
      await unregisterPushNotificationsAsync().catch(() => {});
      await AsyncStorage.removeItem('aotms_token');
      await AsyncStorage.removeItem('aotms_user');
    } catch (e) {
      console.warn('Error clearing storage:', e);
    }
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const meData = await authApi.getMe();
      if (meData?.user) {
        setUser(meData.user);
        await AsyncStorage.setItem('aotms_user', JSON.stringify(meData.user));
      }
    } catch (e) {
      console.warn('Failed to refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
