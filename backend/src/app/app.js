require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const masterRouter = require('./routes');
const errorMiddleware = require('../core/middleware/errorMiddleware');

const app = express();

// ── Security & CORS ───────────────────────────────────────────────────────────
const configuredOrigin = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');

function normalizeOrigin(o) {
  return (o || '').trim().replace(/\/+$/, '');
}

// Only these exact origins are reflected back. Substring matching is not used:
// `https://academyoftechmasters.com.attacker.tld` must not be trusted just
// because it contains the brand name.
const STATIC_ALLOWED_ORIGINS = [
  'https://academyoftechmasters.com',
  'https://www.academyoftechmasters.com',
  'https://crm.academyoftechmasters.com',
];
const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const VERCEL_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

function isAllowedOrigin(origin) {
  // Server-to-server calls (n8n, Meta, curl) send no Origin header.
  if (!origin) return true;
  const o = normalizeOrigin(origin);
  if (STATIC_ALLOWED_ORIGINS.includes(o)) return true;
  if (configuredOrigin && o === configuredOrigin) return true;
  if (LOCAL_ORIGIN_RE.test(o)) return true;
  if (VERCEL_ORIGIN_RE.test(o)) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
}));

// Security headers (HSTS, X-Content-Type-Options, frameguard, referrer policy…).
// The API also serves static assets, so cross-origin resource policy is relaxed
// for images/audio that the dashboard loads from the API host.
app.use(helmet({
  contentSecurityPolicy: false, // API only; the SPA ships its own policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Meta WhatsApp Webhook Verification Handshake ─────────────────────────────
app.get('/api/integrations/whatsapp/webhook', (req, res) => {
  const q = req.query || {};
  const challenge = q['hub.challenge'] || q.hub?.challenge || q.challenge;
  const token = q['hub.verify_token'] || q.hub?.verify_token || q.verify_token;
  const expected = process.env.META_WA_VERIFY_TOKEN;

  // Verify the subscription token before echoing the challenge back. The token
  // itself is never logged.
  if (!expected || token !== expected) {
    console.warn('[Meta Webhook Verification] rejected: verify token mismatch');
    return res.status(403).type('text/plain').send('Forbidden');
  }

  if (challenge) {
    return res.status(200).type('text/plain').send(String(challenge));
  }
  return res.status(200).type('text/plain').send('Meta WhatsApp Webhook Endpoint Active');
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// ── URL Normalization (Handle duplicated /api/api prefixes) ─────────────────
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  }
  next();
});

// ── Cache Prevention for Dynamic API Responses ─────────────────────────────
app.set('etag', false);

app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

// ── Master API Routes ────────────────────────────────────────────────────────
app.use('/api', masterRouter);

// ── Static Files & Downloads ────────────────────────────────────────────────
const handleApkDownload = (req, res) => {
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
};

app.get('/download-apk', handleApkDownload);
app.get('/api/download-apk', handleApkDownload);

app.get('/download-apk-v1', (req, res) => {
  const fs = require('fs');
  const legacyPath = path.join(__dirname, '..', '..', 'AOTMS_CRM_v1.0.1.apk');
  if (fs.existsSync(legacyPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="AOTMS_CRM_v1.0.1.apk"');
    return res.download(legacyPath, 'AOTMS_CRM_v1.0.1.apk');
  }
  return res.status(404).json({ error: 'Legacy APK not found.' });
});

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin(req.headers.origin) ? (req.headers.origin || '*') : 'null');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'AOTMS Backend Enterprise' }));

app.set('trust proxy', 1);

// ── Global Error Handling Middleware ─────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
