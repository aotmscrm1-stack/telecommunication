import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  return 'https://telecommunication-l3oz.onrender.com/api';
};

export const API_BASE_URL = getBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Attach stored JWT Token
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('aotms_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Disable caching for live real-time CRM updates
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';

      if (config.method?.toLowerCase() === 'get') {
        config.params = {
          ...(config.params || {}),
          _t: Date.now(),
        };
      }
    } catch (e) {
      console.warn('[API Client] Error reading auth token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Error handling
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear expired session
      try {
        await AsyncStorage.removeItem('aotms_token');
        await AsyncStorage.removeItem('aotms_user');
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export default client;
