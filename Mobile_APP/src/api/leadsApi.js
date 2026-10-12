import client from './client';

export const leadsApi = {
  getLeads: async (params = {}) => {
    const res = await client.get('/leads', { params });
    return res.data;
  },

  getStats: async () => {
    const res = await client.get('/leads/stats');
    return res.data;
  },

  getRealtimeKpis: async () => {
    const res = await client.get('/leads/realtime-kpis');
    return res.data;
  },

  getLead: async (id) => {
    const res = await client.get(`/leads/${id}`);
    return res.data;
  },

  createLead: async (leadData) => {
    const res = await client.post('/leads', leadData);
    return res.data;
  },

  updateLead: async (id, leadData) => {
    const res = await client.put(`/leads/${id}`, leadData);
    return res.data;
  },

  deleteLead: async (id) => {
    const res = await client.delete(`/leads/${id}`);
    return res.data;
  },

  logCall: async (id, callData) => {
    const res = await client.post(`/leads/${id}/call`, callData);
    return res.data;
  },

  addNote: async (id, text) => {
    const res = await client.post(`/leads/${id}/note`, { text });
    return res.data;
  },
};
