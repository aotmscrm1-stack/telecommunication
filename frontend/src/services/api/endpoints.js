export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    SEND_OTP: '/auth/send-registration-otp',
    VERIFY_OTP: '/auth/verify-registration-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  LEADS: {
    BASE: '/leads',
    IMPORT: '/leads/bulk-import',
    BLOCKLIST: '/leads/blocklist',
  },
  FOLLOWUPS: {
    BASE: '/followups',
    OVERDUE: '/followups/overdue',
    REMINDERS: '/followups/reminders',
  },
  ATTENDANCE: {
    BASE: '/attendance',
    LIVE_EMPLOYEES: '/attendance/live-employees',
  },
  FINANCE: {
    INVOICES: '/finance/invoices',
    PAYSLIPS: '/finance/payslips',
    QUOTATIONS: '/finance/quotations',
    FEE_RECEIPTS: '/finance/fee-receipts',
  },
  INTEGRATIONS: {
    BASE: '/integrations',
    WHATSAPP: '/whatsapp',
  },
};

export default API_ENDPOINTS;
