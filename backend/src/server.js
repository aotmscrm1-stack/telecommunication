// Nodemon restart trigger v7
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const http = require('node:http');
require('./models/ImportHistory');
require('./models/Payment');
const { startOverdueTaskChecker } = require('./services/taskOverdueChecker');
const { startTaskReminderChecker } = require('./services/taskReminderChecker');
const dns = require('node:dns');

const app = express();
connectDB();

// ── Security ─────────────────────────────────────────────────────────────────
// A single exact-string origin match (the old approach) silently breaks CORS
// for every route if the configured FRONTEND_URL differs from the browser's
// origin by so much as a trailing slash or a missing "www." — with no error
// logged anywhere, since the request is still handled fine, just without the
// CORS header. This matcher normalizes both sides and accepts the www/non-www
// variant of whatever's configured, so that class of mismatch can't happen.
const configuredOrigin = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');

function normalizeOrigin(o) {
  return (o || '').trim().replace(/\/+$/, '');
}

function isAllowedOrigin(origin) {
  if (!configuredOrigin) return true; // no FRONTEND_URL set -> behave like the old '*' fallback
  if (!origin) return true; // non-browser requests (server-to-server, curl) send no Origin header
  const o = normalizeOrigin(origin);
  const withWww = configuredOrigin.replace(/^https?:\/\//, m => m).replace(/^(https?:\/\/)(?!www\.)/, '$1www.');
  const withoutWww = configuredOrigin.replace(/^(https?:\/\/)www\./, '$1');
  return o === configuredOrigin || o === withWww || o === withoutWww;
}

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: 'Too many requests. Slow down.' },
});

// ── Meta WhatsApp Webhook Verification Handshake ─────────────────────────────
// Must be mounted BEFORE mongoSanitize() so Meta query params like hub.challenge containing dots aren't stripped!
app.get('/api/integrations/whatsapp/webhook', (req, res) => {
  const q = req.query || {};
  const challenge = q['hub.challenge'] || q.hub?.challenge || q.challenge;
  const token = q['hub.verify_token'] || q.hub?.verify_token || q.verify_token;
  console.log('[Meta Webhook Verification Request]', { query: req.query, challenge, token });
  
  if (challenge) {
    return res.status(200).type('text/plain').send(String(challenge));
  }
  return res.status(200).type('text/plain').send('Meta WhatsApp Webhook Endpoint Active');
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', apiLimiter, require('./routes/leads'));
app.use('/api/followups', apiLimiter, require('./routes/followups'));
app.use('/api/campaigns', apiLimiter, require('./routes/campaigns'));
app.use('/api/reports', apiLimiter, require('./routes/reports'));
app.use('/api/users', apiLimiter, require('./routes/users'));
app.use('/api/courses', apiLimiter, require('./routes/courses'));
app.use('/api/blocklist', apiLimiter, require('./routes/blocklist'));
app.use('/api/message-templates', apiLimiter, require('./routes/messageTemplates'));
app.use('/api/broadcasts', apiLimiter, require('./routes/broadcasts'));
app.use('/api/whatsapp-inbox', apiLimiter, require('./routes/whatsappInbox'));
app.use('/api/whatsapp-lists', apiLimiter, require('./routes/whatsappLists'));
app.use('/api/bulk-import', apiLimiter, require('./routes/bulkImport'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/notifications', apiLimiter, require('./routes/notifications'));
app.use('/api/email', apiLimiter, require('./routes/email'));

// ── Uploads static folder ───────────────────────────────────────────────────
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin(req.headers.origin) ? (req.headers.origin || '*') : 'null');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/api/access-tokens', apiLimiter, require('./routes/accessTokens'));
app.use('/api/email-campaigns', apiLimiter, require('./routes/emailCampaigns'));
app.use('/api/lead-stages', apiLimiter, require('./routes/leadStages'));
app.use('/api/lead-fields', apiLimiter, require('./routes/leadFields'));
app.use('/api/custom-actions', apiLimiter, require('./routes/customActions'));
app.use('/api/workspace-preferences', apiLimiter, require('./routes/workspacePreferences'));
app.use('/api/permission-templates', apiLimiter, require('./routes/permissionTemplates'));
app.use('/api/payslips', apiLimiter, require('./routes/payslips'));
app.use('/api/invoices', apiLimiter, require('./routes/invoices'));
app.use('/api/billing', apiLimiter, require('./routes/billing'));
app.use('/api/public', apiLimiter, require('./routes/publicApi'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'AOTMS Backend' }));

app.set('trust proxy', 1);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Server error' });
});

const { initWebSocketServer } = require('./services/websocket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Attach WebSocket server on /ws
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 AOTMS Server running on port ${PORT}`);
  startOverdueTaskChecker(5 * 60 * 1000);
  startTaskReminderChecker(5 * 60 * 1000);
});

// Keep-alive self-ping every 10 minutes (Render free tier spin-down prevention)
const SELF_URL = process.env.PUBLIC_BASE_URL;
if (SELF_URL) {
  setInterval(() => {
    http.get(`${SELF_URL.replace('https', 'http')}/api/health`, (res) => {
      console.log('[keep-alive] ping:', res.statusCode);
    }).on('error', () => {
      const https = require('https');
      https.get(`${SELF_URL}/api/health`, () => {}).on('error', () => {});
    });
  }, 10 * 60 * 1000);
}

module.exports = app;