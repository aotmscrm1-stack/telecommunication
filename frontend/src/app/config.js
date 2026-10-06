export const APP_CONFIG = {
  name: 'AOTMS CRM',
  version: '2.0.0',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  roles: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee'
  }
};

export default APP_CONFIG;
