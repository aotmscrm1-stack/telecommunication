import client from './client';

export const attendanceApi = {
  getCurrentStatus: async () => {
    const res = await client.get('/attendance/current');
    return res.data;
  },

  startAttendance: async (data = {}) => {
    const res = await client.post('/attendance/start', data);
    return res.data;
  },

  stopAttendance: async (data = {}) => {
    const res = await client.post('/attendance/stop', data);
    return res.data;
  },

  startBreak: async (data = {}) => {
    const res = await client.post('/attendance/break/start', data);
    return res.data;
  },

  resumeBreak: async (data = {}) => {
    const res = await client.post('/attendance/break/resume', data);
    return res.data;
  },

  getRecords: async (params = {}) => {
    const res = await client.get('/attendance/records', { params });
    return res.data;
  },

  getSummary: async (params = {}) => {
    const res = await client.get('/attendance/summary', { params });
    return res.data;
  },
};
