import client from './client';

export const campaignsApi = {
  getCampaigns: async () => {
    const res = await client.get('/campaigns');
    return res.data;
  },

  getCampaign: async (id) => {
    const res = await client.get(`/campaigns/${id}`);
    return res.data;
  },

  createCampaign: async (data) => {
    const res = await client.post('/campaigns', data);
    return res.data;
  },

  deleteCampaign: async (id) => {
    const res = await client.delete(`/campaigns/${id}`);
    return res.data;
  },
};
