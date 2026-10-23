import client from './client';

export const dailyActivityApi = {
  /**
   * Fetch daily activity for a specific date (YYYY-MM-DD)
   */
  getActivity: async (date) => {
    const params = date ? { date } : {};
    const res = await client.get('/daily-activities', { params });
    return res.data;
  },

  /**
   * Create or update draft daily activity
   * @param {Object} data - { activityDate, department, metrics, outcomes, departmentData, remarks, nextSteps }
   */
  saveDraft: async (data) => {
    const res = await client.post('/daily-activities', data);
    return res.data;
  },

  /**
   * Formally submit a daily activity report
   * @param {string} id
   * @param {Object} data - { metrics, outcomes, departmentData, remarks, nextSteps }
   */
  submitActivity: async (id, data = {}) => {
    const res = await client.post(`/daily-activities/${id}/submit`, data);
    return res.data;
  },

  /**
   * Fetch paginated submission history
   * @param {Object} params - { page, limit, status }
   */
  getHistory: async (params = {}) => {
    const res = await client.get('/daily-activities/history', { params });
    return res.data;
  },

  /**
   * Fetch calendar date status dots for month (YYYY-MM)
   */
  getCalendar: async (month) => {
    const params = month ? { month } : {};
    const res = await client.get('/daily-activities/calendar', { params });
    return res.data;
  },

  /**
   * Fetch upcoming and today's follow-ups for telecallers
   */
  getFollowUps: async () => {
    const res = await client.get('/daily-activities/follow-ups');
    return res.data;
  },
};

export default dailyActivityApi;
