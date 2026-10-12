import client from './client';

export const authApi = {
  login: async (email, password) => {
    const res = await client.post('/auth/login', { email, password });
    return res.data;
  },

  register: async (userData) => {
    // userData: { name, email, password, role, phone }
    const res = await client.post('/auth/register', userData);
    return res.data;
  },

  getMe: async () => {
    const res = await client.get('/auth/me');
    return res.data;
  },
};
