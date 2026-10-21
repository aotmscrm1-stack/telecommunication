export function setupInterceptors(axiosInstance) {
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('aotms_token') || localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // Token expired or invalid — clear user session storage
        ['aotms_token', 'aotms_user', 'aotms_bulk_uploads', 'wa_active_lead_id', 'token', 'user'].forEach(k => {
          try { localStorage.removeItem(k); } catch (_) {}
        });
      }
      return Promise.reject(error);
    }
  );
}

export default setupInterceptors;
