require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
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

function isAllowedOrigin(origin) {
  if (!configuredOrigin) return true;
  if (!origin) return true;
  const o = normalizeOrigin(origin);
  const withWww = configuredOrigin.replace(/^https?:\/\//, m => m).replace(/^(https?:\/\/)(?!www\.)/, '$1www.');
  const withoutWww = configuredOrigin.replace(/^(https?:\/\/)www\./, '$1');
  return o === configuredOrigin || o === withWww || o === withoutWww;
}

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Meta WhatsApp Webhook Verification Handshake ─────────────────────────────
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

// ── URL Normalization (Handle duplicated /api/api prefixes) ─────────────────
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  }
  next();
});

// ── Master API Routes ────────────────────────────────────────────────────────
app.use('/api', masterRouter);

// ── Static Files & Downloads ────────────────────────────────────────────────
app.get('/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '..', 'uploads', 'app-release.apk');
  const fs = require('fs');
  if (fs.existsSync(apkPath)) {
    return res.download(apkPath, 'Telecom-CRM.apk');
  }
  return res.status(404).send('APK build not found on server.');
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
