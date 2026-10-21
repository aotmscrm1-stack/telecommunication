import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'https://telecommunication-l3oz.onrender.com/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
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
