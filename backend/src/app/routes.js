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

// ── Followups & Daily Activity (Preserved & Protected) ──────────────────────
// ── Todo & Followups ──────────────────────────────────────────────────────────
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
router.use('/meta-leads', apiLimiter, require('../modules/marketing/meta-leads/metaLeads'));
router.use('/email-campaigns', apiLimiter, require('../modules/marketing/campaigns/emailCampaigns'));
router.use('/whatsapp-campaigns', apiLimiter, require('../modules/marketing/campaigns/whatsappCampaigns'));

// Contacts
router.use('/contacts', apiLimiter, require('../modules/marketing/contacts/contacts'));
router.use('/blocklist', apiLimiter, require('../modules/marketing/contacts/blocklist'));

// Book Free Demo (public intake + admin review)
router.use('/demo-bookings', apiLimiter, require('../modules/marketing/demo-bookings/demoBookings'));

// WhatsApp Blast
router.use('/whatsapp-lists', apiLimiter, require('../modules/marketing/whatsapp-blast/whatsappLists'));

// WhatsApp & Inbox
router.use('/whatsapp-inbox', apiLimiter, require('../modules/marketing/whatsapp/whatsappInbox'));
router.use('/message-templates', apiLimiter, require('../modules/marketing/whatsapp/messageTemplates'));

// Leaderboard / Learning
router.use('/courses', apiLimiter, require('../modules/marketing/leaderboard/courses'));

// Digital Calendar (Info, Marketing, Management, Admin)
router.use('/info/digital-calendar', apiLimiter, require('../modules/marketing/digital-calendar/digitalCalendar'));
router.use('/marketing/digital-calendar', apiLimiter, require('../modules/marketing/digital-calendar/digitalCalendar'));
router.use('/management/digital-calendar', apiLimiter, require('../modules/marketing/digital-calendar/digitalCalendar'));
router.use('/admin/digital-calendar', apiLimiter, require('../modules/marketing/digital-calendar/digitalCalendar'));
router.use('/digital-calendar', apiLimiter, require('../modules/marketing/digital-calendar/digitalCalendar'));

// ── Daily Activity Schedule (Official Employee Profiles & Reference) ────────
router.use('/daily-activity-schedules', apiLimiter, require('../modules/daily-activity-schedule/dailyActivitySchedule'));

// ── Daily Activities & Telecaller Dashboard ──────────────────────────────────
// router.use('/daily-activities', apiLimiter, require('../modules/daily-activities/dailyActivities'));

// ── Finance Modules ──────────────────────────────────────────────────────────
router.use('/payslips', apiLimiter, require('../modules/finance/payslips/payslips'));
router.use('/invoices', apiLimiter, require('../modules/finance/invoices/invoices'));
router.use('/billing', apiLimiter, require('../modules/finance/invoices/billing'));

// ── Management Modules ───────────────────────────────────────────────────────
router.use('/departments', apiLimiter, require('../modules/management/departments/departments'));
router.use('/attendance/zk', apiLimiter, require('../modules/management/attendance/zkRoutes'));
router.use('/attendance', apiLimiter, require('../modules/management/attendance/attendance'));
router.use('/tracking', apiLimiter, require('../modules/management/live-tracking/tracking'));
router.use('/recordings', (req, res, next) => {
  // Audio streaming and file downloads issue frequent Range requests per audio element.
  // Bypass rate limiting on streaming routes so users do not experience audio stuttering or 429 errors.
  if (req.path.startsWith('/stream/') || req.path.startsWith('/file/')) {
    return next();
  }
  return apiLimiter(req, res, next);
}, require('../modules/management/live-tracking/recordings'));
// Route alias for /audio-conversations
router.use('/audio-conversations', apiLimiter, require('../modules/management/live-tracking/recordings'));

// ── Employee Performance & Compliance Governance ─────────────────────────────
router.use('/performance/compliance', apiLimiter, require('../modules/management/performance/compliance'));
router.use('/performance/tickets', apiLimiter, require('../modules/management/performance/tickets'));
router.use('/performance', apiLimiter, require('../modules/management/performance/performance'));

// ── Communication & Notifications ────────────────────────────────────────────
router.use('/email', apiLimiter, require('../modules/communication/email/email'));
router.use('/notifications', apiLimiter, require('../modules/notifications/notifications'));

// ── Integrations & Public API ────────────────────────────────────────────────
router.use('/integrations', require('../integrations/integrations'));
router.use('/access-tokens', apiLimiter, require('../integrations/accessTokens'));
router.use('/public', apiLimiter, require('../integrations/publicApi'));

// ── Direct Mobile APK Download ───────────────────────────────────────────────
router.get('/download-apk', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const candidates = [
    path.join(__dirname, '..', 'uploads', 'app-release.apk'),
    path.join(__dirname, '..', 'uploads', 'Telecom-CRM.apk'),
    path.join(__dirname, '..', '..', 'Mobile_APP', 'AOTMS-CRM-Mobile-NEW.apk'),
    path.join(__dirname, '..', '..', 'Mobile_APP', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
    path.join(__dirname, '..', '..', 'AOTMS_CRM_v1.0.1.apk'),
    '/app/uploads/app-release.apk',
    '/app/src/uploads/app-release.apk',
    '/var/www/uploads/app-release.apk',
  ];
  for (const apkPath of candidates) {
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="Telecom-CRM.apk"');
      return res.download(apkPath, 'Telecom-CRM.apk');
    }
  }
  return res.status(404).json({ error: 'APK build not found on server.' });
});

router.get('/download-apk-v1', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const legacyPath = path.join(__dirname, '..', '..', 'AOTMS_CRM_v1.0.1.apk');
  if (fs.existsSync(legacyPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="AOTMS_CRM_v1.0.1.apk"');
    return res.download(legacyPath, 'AOTMS_CRM_v1.0.1.apk');
  }
  return res.status(404).json({ error: 'Legacy APK not found.' });
});

module.exports = router;
