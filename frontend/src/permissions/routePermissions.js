import { ROLES } from './roles';

export const ROUTE_PERMISSIONS = {
  // Public & Auth Routes
  '/': [],
  '/login': [],
  '/signup': [],

  // Dashboard & Task Routes
  '/dashboard': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/tasks': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],

  // Marketing & Info Routes
  '/digital-calendar': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/info/digital-calendar': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/marketing/digital-calendar': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/leads': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/leads/add': [ROLES.ADMIN, ROLES.MANAGER],
  '/leads/import': [ROLES.ADMIN, ROLES.MANAGER],
  '/campaigns': [ROLES.ADMIN, ROLES.MANAGER],
  '/whatsapp-blast': [ROLES.ADMIN, ROLES.MANAGER],
  '/whatsapp': [ROLES.ADMIN, ROLES.MANAGER],
  '/leaderboard': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/reports': [ROLES.ADMIN, ROLES.MANAGER],

  // Finance Routes
  '/finance/invoices': [ROLES.ADMIN, ROLES.MANAGER],
  '/finance/payslips': [ROLES.ADMIN, ROLES.MANAGER],
  '/finance/quotations': [ROLES.ADMIN, ROLES.MANAGER],
  '/finance/offer-letters': [ROLES.ADMIN, ROLES.MANAGER],
  '/finance/fee-receipts': [ROLES.ADMIN, ROLES.MANAGER],

  // Management Routes
  '/management/digital-calendar': [ROLES.ADMIN, ROLES.MANAGER],
  '/management/departments': [ROLES.ADMIN, ROLES.MANAGER],
  '/management/attendance': [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  '/management/call-recordings': [ROLES.ADMIN, ROLES.MANAGER],
  '/management/live-tracking': [ROLES.ADMIN, ROLES.MANAGER],

  // Developer & System Administration Routes
  '/developer/integrations': [ROLES.ADMIN],
  '/developer/access-tokens': [ROLES.ADMIN],
  '/developer/custom-actions': [ROLES.ADMIN],
  '/developer/fields': [ROLES.ADMIN],
  '/developer/permission-templates': [ROLES.ADMIN],
  '/developer/billing': [ROLES.ADMIN],
};
