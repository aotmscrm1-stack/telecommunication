const express = require('express');
const { authLimiter, apiLimiter } = require('../core/middleware/rateLimiter');

const router = express.Router();

// ── Authentication & Users ───────────────────────────────────────────────────
router.use('/auth/login', authLimiter);
router.use('/auth/register', authLimiter);
router.use('/auth', require('../modules/auth/auth'));
router.use('/users', apiLimiter, require('../modules/users/users'));

// ── Organizations & Roles ────────────────────────────────────────────────────
router.use('/workspace-preferences', apiLimiter, require('../modules/organizations/workspacePreferences'));
router.use('/permission-templates', apiLimiter, require('../modules/roles/permissionTemplates'));

// ── Dashboard ────────────────────────────────────────────────────────────────
router.use('/reports', apiLimiter, require('../modules/dashboard/reports'));

// ── Tasks & Followups ────────────────────────────────────────────────────────
router.use('/tasks', apiLimiter, require('../modules/tasks/tasks'));
router.use('/todos', apiLimiter, require('../modules/tasks/todos'));
router.use('/followups', apiLimiter, require('../modules/tasks/followups'));

// ── Marketing Modules ────────────────────────────────────────────────────────
// Leads
router.use('/leads', apiLimiter, require('../modules/marketing/leads/leads'));
router.use('/lead-fields', apiLimiter, require('../modules/marketing/leads/leadFields'));
router.use('/lead-stages', apiLimiter, require('../modules/marketing/leads/leadStages'));
router.use('/bulk-import', apiLimiter, require('../modules/marketing/leads/bulkImport'));
router.use('/custom-actions', apiLimiter, require('../modules/marketing/leads/customActions'));

// Campaigns
router.use('/campaigns', apiLimiter, require('../modules/marketing/campaigns/campaigns'));
router.use('/email-campaigns', apiLimiter, require('../modules/marketing/campaigns/emailCampaigns'));
router.use('/whatsapp-campaigns', apiLimiter, require('../modules/marketing/campaigns/whatsappCampaigns'));

// Contacts
router.use('/contacts', apiLimiter, require('../modules/marketing/contacts/contacts'));
router.use('/blocklist', apiLimiter, require('../modules/marketing/contacts/blocklist'));

// WhatsApp Blast
router.use('/whatsapp-lists', apiLimiter, require('../modules/marketing/whatsapp-blast/whatsappLists'));
router.use('/broadcasts', apiLimiter, require('../modules/marketing/whatsapp-blast/broadcasts'));

// WhatsApp & Inbox
router.use('/whatsapp-inbox', apiLimiter, require('../modules/marketing/whatsapp/whatsappInbox'));
router.use('/message-templates', apiLimiter, require('../modules/marketing/whatsapp/messageTemplates'));

// Leaderboard / Learning
router.use('/courses', apiLimiter, require('../modules/marketing/leaderboard/courses'));

// Digital Calendar (Marketing)
router.use('/marketing/digital-calendar', apiLimiter, require('../modules/marketing/digital-calendar/digitalCalendar'));
router.use('/digital-calendar', apiLimiter, require('../modules/marketing/digital-calendar/digitalCalendar'));

// ── Finance Modules ──────────────────────────────────────────────────────────
router.use('/payslips', apiLimiter, require('../modules/finance/payslips/payslips'));
router.use('/invoices', apiLimiter, require('../modules/finance/invoices/invoices'));
router.use('/billing', apiLimiter, require('../modules/finance/invoices/billing'));

// ── Management Modules ───────────────────────────────────────────────────────
router.use('/departments', apiLimiter, require('../modules/management/departments/departments'));
router.use('/attendance/zk', apiLimiter, require('../modules/management/attendance/zkRoutes'));
router.use('/attendance', apiLimiter, require('../modules/management/attendance/attendance'));
router.use('/tracking', apiLimiter, require('../modules/management/live-tracking/tracking'));
router.use('/recordings', apiLimiter, require('../modules/management/live-tracking/recordings'));

// ── Communication & Notifications ────────────────────────────────────────────
router.use('/email', apiLimiter, require('../modules/communication/email/email'));
router.use('/notifications', apiLimiter, require('../modules/notifications/notifications'));

// ── Integrations & Public API ────────────────────────────────────────────────
router.use('/integrations', require('../integrations/integrations'));
router.use('/access-tokens', apiLimiter, require('../integrations/accessTokens'));
router.use('/public', apiLimiter, require('../integrations/publicApi'));

module.exports = router;
