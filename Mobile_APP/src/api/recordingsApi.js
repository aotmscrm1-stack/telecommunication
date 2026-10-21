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

  /**
   * Uploads an audio recording file.
   * Multipart/form-data field name must be "audio" (matching backend multer upload.single('audio')).
   * Handles deduplication: if server returns { alreadySynced: true }, returns that status cleanly.
   */
  uploadRecording: async (file, metadata = {}) => {
    const formData = new FormData();

    if (typeof file === 'object' && file.uri) {
      const fileName = file.name || `recording_${Date.now()}.m4a`;
      const ext = fileName.split('.').pop()?.toLowerCase();
      let determinedType = file.mimeType || file.type;
      if (!determinedType || determinedType === 'audio/m4a') {
        if (ext === 'aac') determinedType = 'audio/aac';
        else if (ext === 'mp3') determinedType = 'audio/mpeg';
        else if (ext === 'wav') determinedType = 'audio/wav';
        else if (ext === 'ogg') determinedType = 'audio/ogg';
        else if (ext === 'opus') determinedType = 'audio/opus';
        else if (ext === 'amr') determinedType = 'audio/amr';
        else if (ext === '3gp' || ext === '3gpp') determinedType = 'audio/3gpp';
        else if (ext === 'flac') determinedType = 'audio/flac';
        else determinedType = 'audio/mp4';
      }

      formData.append('audio', {
        uri: file.uri,
        name: fileName,
        type: determinedType,
      });
    } else {
      formData.append('audio', file);
    }

    if (metadata.leadId) {
      formData.append('leadId', metadata.leadId);
    }
    if (metadata.phone) {
      formData.append('phone', metadata.phone);
    }
    if (metadata.recordedAt) {
      formData.append('recordedAt', metadata.recordedAt);
    }

    const res = await client.post('/recordings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });

    return res.data;
  },

  /**
   * Update recording metadata (lead association, originalName, phone)
   */
  updateRecording: async (id, data) => {
    const res = await client.put(`/recordings/${id}`, data);
    return res.data;
  },

  /**
   * Delete recording and clean up disk storage
   */
  deleteRecording: async (id) => {
    const res = await client.delete(`/recordings/${id}`);
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
