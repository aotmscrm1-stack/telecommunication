import client from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export const authService = {
  async login(credentials) {
    const response = await client.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async signup(userData) {
    const response = await client.post(API_ENDPOINTS.AUTH.SIGNUP, userData);
    return response.data;
  },

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
