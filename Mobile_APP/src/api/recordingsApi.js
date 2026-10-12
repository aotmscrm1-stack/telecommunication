import client, { API_BASE_URL } from './client';

export const recordingsApi = {
  getMy: async () => {
    const res = await client.get('/recordings/my');
    return res.data;
  },

  getAll: async (params = {}) => {
    const res = await client.get('/recordings', { params });
    return res.data;
  },

  getStreamUrl: (recording) => {
    if (!recording) return '';
    if (recording.streamUrl) return recording.streamUrl;
    if (recording.url) {
      if (recording.url.startsWith('http')) return recording.url;
      return `${API_BASE_URL}${recording.url.startsWith('/') ? '' : '/'}${recording.url}`;
    }
    if (recording.storedName) {
      return `${API_BASE_URL}/recordings/stream/${recording.storedName}`;
    }
    return '';
  },
};
