// routes/recordings.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const CallRecording = require('../models/CallRecording');
const Lead = require('../models/Lead');
const { normalizePhone10 } = require('../utils/phone');
const { protect } = require('../middleware/auth');

let transcribeAudioFile = null;
try {
  transcribeAudioFile = require('../services/transcriptionService').transcribeAudioFile;
} catch (_) {}

// ─── Storage setup ────────────────────────────────────────────────────────
// UPLOAD_DIR points at Render's persistent disk mount (/var/data by default)
// so files survive restarts/redeploys. Falls back to a local folder for dev.
const UPLOAD_DIR = process.env.RECORDINGS_DIR
  || (process.env.NODE_ENV === 'production'
    ? path.join('/var/data', 'recordings')
    : path.join(__dirname, '..', 'uploads', 'recordings'));
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(m4a|amr|mp3|wav|3gp|3gpp|aac|ogg)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Unsupported audio file type'));
  },
});

// ─── Extract phone number from recording filename ─────────────────────────
function extractPhoneFromFilename(filename) {
  let name = path.basename(filename, path.extname(filename));

  name = name.replace(/^\d{10,}_/, '');                              // leading upload timestamp
  name = name.replace(/\s+\d{4}-\d{2}-\d{2}[ _]\d{2}-\d{2}-\d{2}$/, ''); // trailing "YYYY-MM-DD HH-MM-SS"

  // Match sequences of digits (with optional +, -, spaces) that look like phone numbers
  const matches = name.match(/[\+]?[\d][\d\s\-]{7,}/g);
  if (!matches) return null;

  for (const raw of matches) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 7) continue;

    const last10 = digits.slice(-10);
    if (last10.length === 10) return last10;
  }
  return null;
}

// ─── Match phone to lead ──────────────────────────────────────────────────
function buildPhoneRegex(phone10) {
  const escaped = phone10.split('').join('\\D*');
  return new RegExp(`${escaped}$`);
}

async function findLeadByPhone(phone10, workspaceId) {
  if (!phone10 || phone10.length !== 10) return null;

  const query = { $or: [{ phone: phone10 }, { phone: { $regex: buildPhoneRegex(phone10) } }] };
  if (workspaceId) query.workspace = workspaceId;

  return Lead.findOne(query).select('_id name phone').lean();
}

// ─── POST /api/recordings ─────────────────────────────────────────────────
router.post('/', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file received (field name must be "audio")' });
    }

    const { leadId, recordedAt } = req.body;

    const bodyPhoneRaw = req.body.phone || req.body.mobile || req.body.number
      || req.body.contactNumber || req.body.callerNumber || req.body.msisdn || '';
    const bodyDigits = normalizePhone10(bodyPhoneRaw);
    const extractedPhone = bodyDigits.length === 10
      ? bodyDigits
      : extractPhoneFromFilename(req.file.originalname);

    // Resolve lead: prefer explicit leadId, then auto-match by phone
    let resolvedLead = null;
    if (leadId) {
      resolvedLead = leadId;
    } else if (extractedPhone) {
      const matched = await findLeadByPhone(extractedPhone, req.user.workspace);
      if (matched) resolvedLead = matched._id;
    }

    const dateObj = recordedAt ? new Date(recordedAt) : new Date();
    const callDateStr = dateObj.toISOString().slice(0, 10);
    const callTimeStr = dateObj.toTimeString().slice(0, 8);

    const doc = await CallRecording.create({
      user: req.user.id,
      lead: resolvedLead || null,
      phone: extractedPhone || null,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      filePath: `recordings/${req.file.filename}`,
      url: `/uploads/recordings/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype || 'audio/mpeg',
      recordedAt: dateObj,
      callDate: callDateStr,
      callTime: callTimeStr,
    });

    const populated = await CallRecording.findById(doc._id)
      .populate('lead', 'name phone')
      .lean();

    return res.status(201).json({ success: true, recording: populated });
  } catch (err) {
    console.error('Recording upload error:', err);
    return res.status(500).json({ error: 'Failed to save recording' });
  }
});

// ─── POST /api/recordings/:id/link-lead ───────────────────────────────────
router.post('/:id/link-lead', protect, async (req, res) => {
  try {
    const { leadId } = req.body;
    const update = { lead: leadId || null };

    if (!leadId) {
      const rec = await CallRecording.findById(req.params.id).lean();
      if (rec && rec.phone) {
        const matched = await findLeadByPhone(rec.phone, req.user.workspace);
        if (matched) update.lead = matched._id;
      }
    }

    const updated = await CallRecording.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('lead', 'name phone').lean();

    if (!updated) return res.status(404).json({ error: 'Recording not found' });
    return res.json({ success: true, recording: updated });
  } catch (err) {
    console.error('link-lead error:', err);
    return res.status(500).json({ error: 'Failed to link lead' });
  }
});

// ─── POST /api/recordings/rematch ─────────────────────────────────────────
router.post('/rematch', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const unlinked = await CallRecording.find({ lead: null }).lean();
    let matched = 0;
    let corrected = 0;
    let failed = 0;

    for (const rec of unlinked) {
      try {
        let phone10 = rec.phone;
        if (!phone10) {
          const freshPhone = extractPhoneFromFilename(rec.originalName);
          if (freshPhone) {
            phone10 = freshPhone;
            await CallRecording.findByIdAndUpdate(rec._id, { phone: freshPhone });
            corrected++;
          }
        }

        if (phone10) {
          const lead = await findLeadByPhone(phone10, req.user.workspace);
          if (lead) {
            await CallRecording.findByIdAndUpdate(rec._id, { lead: lead._id });
            matched++;
          }
        }
      } catch (recErr) {
        console.error(`rematch: failed on recording ${rec._id}:`, recErr);
        failed++;
      }
    }

    return res.json({ success: true, total: unlinked.length, matched, corrected, failed });
  } catch (err) {
    console.error('rematch error:', err);
    return res.status(500).json({ error: err.message || 'Rematch failed' });
  }
});

// ─── GET /api/recordings/my ───────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const recordings = await CallRecording.find({ user: req.user.id })
      .sort({ recordedAt: -1 })
      .limit(200)
      .populate('lead', 'name phone')
      .lean();

    return res.json({ recordings: recordings.map(formatRecording) });
  } catch (err) {
    console.error('getMyRecordings error:', err);
    return res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// ─── GET /api/recordings ─────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.phone) {
      const phoneDigits = normalizePhone10(req.query.phone);
      if (phoneDigits) filter.phone = phoneDigits;
    }
    if (req.query.userId) {
      filter.user = req.query.userId;
    } else if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      filter.user = req.user.id;
    }

    const recordings = await CallRecording.find(filter)
      .sort({ recordedAt: -1 })
      .limit(500)
      .populate('user', 'name email')
      .populate('lead', 'name phone')
      .lean();

    return res.json({ recordings: recordings.map(formatRecording) });
  } catch (err) {
    console.error('getAllRecordings error:', err);
    return res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// ─── POST /api/recordings/:id/transcribe ──────────────────────────────────
router.post('/:id/transcribe', protect, async (req, res) => {
  try {
    const rec = await CallRecording.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recording not found' });

    if (rec.transcriptStatus === 'done' && rec.transcript && !req.body.force) {
      return res.json({ success: true, transcript: rec.transcript, cached: true });
    }

    if (!transcribeAudioFile) {
      return res.status(501).json({ error: 'Transcription service not configured on server' });
    }

    rec.transcriptStatus = 'pending';
    await rec.save();

    try {
      const absolutePath = path.join(UPLOAD_DIR, rec.storedName);
      const transcript = await transcribeAudioFile(absolutePath, req.body.apiKey);
      rec.transcript = transcript;
      rec.transcriptStatus = 'done';
      rec.transcriptError = '';
      await rec.save();
      return res.json({ success: true, transcript, cached: false });
    } catch (sttErr) {
      rec.transcriptStatus = 'failed';
      rec.transcriptError = sttErr.message || 'Transcription failed';
      await rec.save();
      return res.status(500).json({ error: rec.transcriptError });
    }
  } catch (err) {
    console.error('transcribe error:', err);
    return res.status(500).json({ error: 'Failed to transcribe recording' });
  }
});

function formatRecording(r) {
  return {
    _id: r._id,
    recordedAt: r.recordedAt,
    url: absoluteUrl(r.url),
    size: r.size,
    mimeType: r.mimeType,
    phone: r.phone || null,
    userName: r.user && r.user.name ? r.user.name : undefined,
    leadId: r.lead ? r.lead._id : null,
    leadName: r.lead && r.lead.name ? r.lead.name : null,
    leadPhone: r.lead && r.lead.phone ? r.lead.phone : null,
    transcript: r.transcript || '',
    transcriptStatus: r.transcriptStatus || 'none',
    transcriptError: r.transcriptError || '',
    lastCallIqReport: r.lastCallIqReport && r.lastCallIqReport.runAt
      ? {
          agentName: r.lastCallIqReport.agentName || '',
          status: r.lastCallIqReport.status || '',
          result: r.lastCallIqReport.result || null,
          error: r.lastCallIqReport.error || '',
          runAt: r.lastCallIqReport.runAt,
        }
      : null,
  };
}

function absoluteUrl(relativePath) {
  const base = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '';
  if (!base) return relativePath;
  return `${base.replace(/\/+$/, '')}${relativePath}`;
}

module.exports = router;
