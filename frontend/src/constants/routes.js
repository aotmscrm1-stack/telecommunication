export const ROUTES = {
  PUBLIC: {
    LANDING: '/',
  },
  AUTH: {
    LOGIN: '/login',
    SIGNUP: '/signup',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    VERIFY_ACCOUNT: '/verify-account',
  },
  MODULES: {
    DASHBOARD: '/dashboard',
    TASKS: '/tasks',
    INFO: {
      DASHBOARD: '/dashboard',
      TASKS: '/tasks',
      DIGITAL_CALENDAR: '/digital-calendar',
    },
    MARKETING: {
      LEADS: '/leads',
      ADD_LEAD: '/leads/add',
      IMPORT_LEADS: '/leads/import',
      CAMPAIGNS: '/campaigns',
      WHATSAPP_BLAST: '/whatsapp-blast',
      WHATSAPP: '/whatsapp',
      LEADERBOARD: '/leaderboard',
      REPORTS: '/reports',
    },
    FINANCE: {
      INVOICES: '/finance/invoices',
      PAYSLIPS: '/finance/payslips',
      QUOTATIONS: '/finance/quotations',
      OFFER_LETTERS: '/finance/offer-letters',
      FEE_RECEIPTS: '/finance/fee-receipts',
    },
    MANAGEMENT: {
      DEPARTMENTS: '/management/departments',
      ATTENDANCE: '/management/attendance',
      CALL_RECORDINGS: '/management/call-recordings',
      LIVE_TRACKING: '/management/live-tracking',
      EMAIL_CRM: '/management/email-crm',
    },
    DEVELOPER: {
      INTEGRATIONS: '/developer/integrations',
      ACCESS_TOKENS: '/developer/access-tokens',
      CUSTOM_ACTIONS: '/developer/custom-actions',
      FIELDS: '/developer/fields',
      PERMISSION_TEMPLATES: '/developer/permission-templates',
      BILLING: '/developer/billing',
    },
  },
  ERRORS: {
    FORBIDDEN: '/403',
    NOT_FOUND: '/404',
    SERVER_ERROR: '/500',
  },
};

export default ROUTES;
