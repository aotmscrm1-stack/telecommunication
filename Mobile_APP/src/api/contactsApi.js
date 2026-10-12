import client from './client';

export const contactsApi = {
  getContacts: async () => {
    const res = await client.get('/contacts');
    return res.data;
  },

  createContact: async (data) => {
    const res = await client.post('/contacts', data);
    return res.data;
  },

  deleteContact: async (id) => {
    const res = await client.delete(`/contacts/${id}`);
    return res.data;
  },

  whatsappBlast: async (payload) => {
    const res = await client.post('/contacts/whatsapp-blast', payload);
    return res.data;
  },

  sendSingleWhatsapp: async (payload) => {
    const res = await client.post('/contacts/send-single-whatsapp', payload);
    return res.data;
  },

  getBroadcasts: async (params = {}) => {
    const res = await client.get('/broadcasts', { params });
    return res.data;
  },
};
