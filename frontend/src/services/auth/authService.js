import client from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export const authService = {
  async login(credentials) {
    const response = await client.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    if (response.data.token) {
      localStorage.setItem('aotms_token', response.data.token);
      localStorage.setItem('aotms_user', JSON.stringify(response.data.user));
      // Cleanup legacy keys if present
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return response.data;
  },

  async signup(userData) {
    const response = await client.post(API_ENDPOINTS.AUTH.SIGNUP, userData);
    return response.data;
  },

  async logout() {
    ['aotms_token', 'aotms_user', 'aotms_bulk_uploads', 'wa_active_lead_id', 'token', 'user'].forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });
    return true;
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
};

export default authService;
