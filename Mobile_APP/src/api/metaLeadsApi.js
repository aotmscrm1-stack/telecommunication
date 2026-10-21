import client from './client';

export const metaLeadsApi = {
  /**
   * Fetch meta leads with dynamic filters
   * @param {Object} params - { campaign, department, status, search, page, limit }
   */
  getLeads: async (params = {}) => {
    const res = await client.get('/meta-leads', { params });
    return res.data;
  },

  /**
   * Fetch distinct campaigns with lead counts & assignments
   */
  getCampaigns: async () => {
    const res = await client.get('/meta-leads/campaigns');
    return res.data;
  },

  /**
   * Fetch department-wise summary & lead counts
   */
  getDepartments: async () => {
    const res = await client.get('/meta-leads/departments');
    return res.data;
  },

  /**
   * Update lead status, notes, follow-up, or department
   * @param {string} id
   * @param {Object} data - { status, note, callOutcome, followUpDate, department, incrementCall }
   */
  updateLead: async (id, data) => {
    const res = await client.patch(`/meta-leads/${id}`, data);
    return res.data;
  },

  /**
   * Record a call log outcome for telecalling session
   * @param {string} id
   * @param {Object} callData - { status, note, followUpDate, duration }
   */
  logCallOutcome: async (id, callData) => {
    const res = await client.post(`/meta-leads/${id}/call-log`, callData);
    return res.data;
  },

  /**
   * Convert Meta Lead into standard active CRM Lead pipeline
   * @param {string} id
   */
  convertLead: async (id) => {
    const res = await client.post(`/meta-leads/${id}/convert`);
    return res.data;
  },

  /**
   * Trigger n8n background sync workflow
   */
  syncNow: async () => {
    const res = await client.post('/meta-leads/sync');
    return res.data;
  },

  /**
   * Get sync status
   */
  getSyncStatus: async () => {
    const res = await client.get('/meta-leads/sync-status');
    return res.data;
  },
};

export default metaLeadsApi;
