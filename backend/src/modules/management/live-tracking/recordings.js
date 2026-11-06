// routes/recordings.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const mongoose = require('mongoose');
const CallRecording = require('../../../database/models/CallRecording');
const Lead = require('../../../database/models/Lead');
const MetaLead = require('../../../database/models/MetaLead');
const Campaign = require('../../../database/models/Campaign');
const User = require('../../../database/models/User');
const { normalizePhone10 } = require('../../../core/utils/phone');
const { protect } = require('../../../core/middleware/auth');
const { deleteFromCloudinary, uploadAudioToCloudinary } = require('../../../core/utils/cloudinary');

let transcribeAudioFile = null;
try {
  transcribeAudioFile = require('../../../modules/communication/calls/transcriptionService').transcribeAudioFile;
} catch (_) {}

// ─── Storage setup ────────────────────────────────────────────────────────
function getUploadDirectory() {
  const defaultDir = path.join(__dirname, '..', '..', '..', 'uploads', 'recordings');
  const preferred = process.env.RECORDINGS_DIR || (
    process.env.NODE_ENV === 'production'
      ? '/var/data/recordings'
      : defaultDir
  );

  try {
    if (!fs.existsSync(preferred)) {
      fs.mkdirSync(preferred, { recursive: true });
    }
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch (_) {
    const fallback = defaultDir;
    try {
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
      return fallback;
    } catch (e) {
      const tmpFallback = path.join('/tmp', 'recordings');
      if (!fs.existsSync(tmpFallback)) {
        fs.mkdirSync(tmpFallback, { recursive: true });
      }
      return tmpFallback;
    }
  }
}

const UPLOAD_DIR = getUploadDirectory();

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
    const allowed = /\.(m4a|amr|mp3|wav|3gp|3gpp|aac|ogg|opus|wma|m4p|flac|mp4|awb)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Unsupported audio file type'));
  },
});

// ─── Extract phone number from recording filename ─────────────────────────
function extractPhoneFromFilename(filename) {
  if (!filename) return null;
  const name = path.basename(filename, path.extname(filename));

  // 1. Direct match: 10-digit Indian phone number starting with 6, 7, 8, or 9
  const directMatch = name.match(/(?:(?:\+?91[\s\-_]*)?([6-9]\d{9}))\b/);
  if (directMatch && directMatch[1]) {
    return directMatch[1];
  }

  // 2. Generic match: any sequence of digits containing a 10-digit phone number
  const matches = name.match(/[\+]?[\d][\d\s\-]{8,}/g);
  if (matches) {
    for (const raw of matches) {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 10) {
        // Skip unix timestamp prefixes (like 1783077830576)
        const asInt = parseInt(digits, 10);
        if (digits.length === 13 && asInt > 1000000000000) continue;

        const last10 = digits.slice(-10);
        if (/^[6-9]\d{9}$/.test(last10)) {
          return last10;
        }
      }
    }
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

async function findMetaLeadByPhone(phone10) {
  if (!phone10 || phone10.length !== 10) return null;
  const regex = buildPhoneRegex(phone10);
  return MetaLead.findOne({
    $or: [
      { normalizedPhone: phone10 },
      { phone: phone10 },
      { phone: { $regex: regex } },
      { 'rawData.phone_number': { $regex: regex } },
      { 'rawData.phone': { $regex: regex } },
      { 'rawData.Phone': { $regex: regex } },
    ]
  }).select('_id fullName phone normalizedPhone email campaign rawData').lean();
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

    let validPhone = null;
    if (extractedPhone && /^\d{10}$/.test(extractedPhone)) {
      validPhone = extractedPhone;
    }

    // Resolve lead: prefer explicit leadId, then auto-match by phone
    let resolvedLead = null;
    if (leadId) {
      resolvedLead = leadId;
    } else if (validPhone) {
      const matched = await findLeadByPhone(validPhone, req.user.workspace);
      if (matched) resolvedLead = matched._id;
    }

    const dateObj = recordedAt ? new Date(recordedAt) : new Date();
    const callDateStr = dateObj.toISOString().slice(0, 10);
    const callTimeStr = dateObj.toTimeString().slice(0, 8);

    // ─── Deduplication Check ─────────────────────────────────────────────
    // Prevent duplicate uploads on repeat folder scans (matching user + originalName + size)
    const existingRec = await CallRecording.findOne({
      user: req.user.id,
      originalName: req.file.originalname,
      size: req.file.size,
    }).populate('lead', 'name phone').lean();

    if (existingRec) {
      // If the legacy record exists without Cloudinary URL, backfill/recover it now
      let recoveredRec = existingRec;
      if (!existingRec.cloudinaryUrl && req.file.path && fs.existsSync(req.file.path)) {
        try {
          const recoveredCld = await uploadAudioToCloudinary(req.file.path, 'call_recordings', req.file.filename);
          if (recoveredCld && recoveredCld.secure_url) {
            const updatedDoc = await CallRecording.findByIdAndUpdate(
              existingRec._id,
              {
                cloudinaryUrl: recoveredCld.secure_url,
                cloudinaryPublicId: recoveredCld.public_id,
                cloudinaryResourceType: recoveredCld.resource_type || 'video',
                url: recoveredCld.secure_url,
                fileAvailable: true,
              },
              { new: true }
            ).populate('lead', 'name phone').lean();
            if (updatedDoc) {
              recoveredRec = updatedDoc;
              console.log(`[Cloudinary Audio Recovery] Successfully backfilled ${req.file.originalname} (${existingRec._id}) to Cloudinary: ${recoveredCld.secure_url}`);
            }
          }
        } catch (recoverErr) {
          console.warn('[Cloudinary Audio Recovery Notice]', recoverErr.message);
        }
      }

      // Remove the newly uploaded duplicate file from disk to save storage
      try {
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (_) {}

      return res.status(200).json({
        success: true,
        alreadySynced: true,
        recording: formatRecording(recoveredRec),
      });
    }

    // ─── Upload to Cloudinary for permanent persistent cloud storage ──────
    let cloudinaryData = null;
    const localFilePath = req.file.path;
    try {
      if (localFilePath && fs.existsSync(localFilePath)) {
        cloudinaryData = await uploadAudioToCloudinary(localFilePath, 'call_recordings', req.file.filename);
        if (cloudinaryData && cloudinaryData.secure_url) {
          console.log(`[Cloudinary Audio Success] Recording ${req.file.filename} uploaded:`, cloudinaryData.secure_url);
        }
      }
    } catch (cldErr) {
      console.error('[Cloudinary Audio Upload Error]:', cldErr.message);
    }

    // Enforce persistent cloud storage: do not report success if Cloudinary upload failed
    if (!cloudinaryData || !cloudinaryData.secure_url) {
      try {
        if (localFilePath && fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
      } catch (_) {}
      return res.status(502).json({
        error: 'Failed to upload audio recording to persistent cloud storage (Cloudinary). Please try again.',
      });
    }

    const resolvedDuration = Math.round(
      Number(cloudinaryData.duration || req.body.duration || (req.file.size ? req.file.size / 4000 : 0)) || 0
    );

    const doc = await CallRecording.create({
      user: req.user.id,
      lead: resolvedLead || null,
      phone: validPhone,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      filePath: `recordings/${req.file.filename}`,
      url: cloudinaryData.secure_url,
      cloudinaryUrl: cloudinaryData.secure_url,
      cloudinaryPublicId: cloudinaryData.public_id,
      cloudinaryResourceType: cloudinaryData.resource_type || 'video',
      fileAvailable: true,
      size: req.file.size,
      duration: resolvedDuration,
      mimeType: req.file.mimetype || getAudioMimeType(req.file.originalname) || 'audio/mp4',
      recordedAt: dateObj,
      callDate: callDateStr,
      callTime: callTimeStr,
    });

    const populated = await CallRecording.findById(doc._id)
      .populate('lead', 'name phone')
      .lean();

    // ── Background Auto-Transcription via OpenAI Whisper / GPT-4o ───────────
    try {
      const absolutePath = localFilePath || path.join(UPLOAD_DIR, req.file.filename);
      let sttFn = transcribeAudioFile;
      if (!sttFn) {
        try { sttFn = require('../../../modules/communication/calls/transcriptionService').transcribeAudioFile; } catch (_) {}
      }
      if (sttFn && fs.existsSync(absolutePath)) {
        sttFn(absolutePath)
          .then(async (transcriptText) => {
            await CallRecording.findByIdAndUpdate(doc._id, {
              transcript: transcriptText,
              transcriptStatus: 'done',
              transcriptError: '',
            });
            console.log(`[Auto-STT Success] Recording ${doc._id} transcribed automatically.`);
          })
          .catch(async (sttErr) => {
            console.warn(`[Auto-STT Warning] Recording ${doc._id} auto-transcription failed:`, sttErr.message);
            await CallRecording.findByIdAndUpdate(doc._id, {
              transcriptStatus: 'failed',
              transcriptError: sttErr.message || 'Auto-transcription failed',
            });
          });
      }
    } catch (bgErr) {
      console.error('[Auto-STT Setup Error]', bgErr);
    }

    return res.status(201).json({ success: true, recording: formatRecording(populated) });
  } catch (err) {
    console.error('Recording upload error:', err);
    return res.status(500).json({ error: 'Failed to save recording', details: err.message });
  }
});

function isHRorAdmin(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const desig = String(user.designation || '').trim().toUpperCase();
  if (role === 'manager' || desig.includes('MANAGER')) return false;
  return (
    desig === 'HR' ||
    desig.includes('HR') ||
    role === 'hr' ||
    role === 'admin' ||
    role === 'superadmin' ||
    desig === 'MANAGING DIRECTOR' ||
    desig === 'MD' ||
    desig === 'CEO' ||
    desig === 'CTO'
  );
}

// ─── POST /api/recordings/:id/link-lead ───────────────────────────────────
// Links a recording session to a Meta Lead (metaLeadId) or unlinks the session
router.post('/:id/link-lead', protect, async (req, res) => {
  try {
    const { linkType, leadId, metaLeadId, campaignId, campaignName } = req.body;
    let update = {};

    if (linkType === 'meta_lead' || metaLeadId) {
      // 1. Link to Meta Lead
      let metaLeadDoc = null;
      if (metaLeadId && mongoose.Types.ObjectId.isValid(metaLeadId)) {
        metaLeadDoc = await MetaLead.findById(metaLeadId).lean();
      }
      const resolvedName = metaLeadDoc 
        ? (metaLeadDoc.fullName || metaLeadDoc.rawData?.full_name || metaLeadDoc.rawData?.name || 'Meta Lead')
        : (req.body.metaLeadName || 'Meta Lead');
      const resolvedPhone = metaLeadDoc
        ? (metaLeadDoc.phone || metaLeadDoc.normalizedPhone || metaLeadDoc.rawData?.phone_number || metaLeadDoc.rawData?.phone || null)
        : (req.body.metaLeadPhone || null);

      update = {
        linkType: 'meta_lead',
        metaLead: metaLeadId || null,
        metaLeadName: resolvedName,
        metaLeadPhone: resolvedPhone,
        lead: null,
        campaignRef: null,
        campaignName: metaLeadDoc ? metaLeadDoc.campaign : (campaignName || null),
      };
    } else if (linkType === 'campaign' || campaignId || (campaignName && !leadId)) {
      // 2. Link to Campaign
      let campDoc = null;
      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        campDoc = await Campaign.findById(campaignId).lean();
      }
      const resolvedCampName = campDoc ? campDoc.name : (campaignName || 'Campaign');

      update = {
        linkType: 'campaign',
        campaignRef: campaignId || null,
        campaignName: resolvedCampName,
        lead: null,
        metaLead: null,
        metaLeadName: null,
        metaLeadPhone: null,
      };
    } else if (linkType === 'lead' || leadId) {
      // 3. Link to Normal Lead
      let leadDoc = null;
      if (leadId && mongoose.Types.ObjectId.isValid(leadId)) {
        leadDoc = await Lead.findById(leadId).lean();
      }
      update = {
        linkType: 'lead',
        lead: leadId || null,
        metaLead: null,
        metaLeadName: null,
        metaLeadPhone: null,
        campaignRef: null,
        campaignName: null,
      };
    } else {
      // 4. Unlink or Auto-match by Phone (prioritize Meta Lead)
      const rec = await CallRecording.findById(req.params.id).lean();
      let matchedMetaLead = null;
      if (rec && rec.phone && req.body.autoMatch) {
        matchedMetaLead = await findMetaLeadByPhone(rec.phone);
      }

      if (matchedMetaLead) {
        const resolvedName = matchedMetaLead.fullName || matchedMetaLead.rawData?.full_name || matchedMetaLead.rawData?.name || 'Meta Lead';
        const resolvedPhone = matchedMetaLead.phone || matchedMetaLead.normalizedPhone || matchedMetaLead.rawData?.phone_number || null;
        update = {
          linkType: 'meta_lead',
          metaLead: matchedMetaLead._id,
          metaLeadName: resolvedName,
          metaLeadPhone: resolvedPhone,
          lead: null,
          campaignRef: null,
          campaignName: matchedMetaLead.campaign || null,
        };
      } else {
        // Complete unlink
        update = {
          linkType: null,
          lead: null,
          metaLead: null,
          metaLeadName: null,
          metaLeadPhone: null,
          campaignRef: null,
          campaignName: null,
        };
      }
    }

    const updated = await CallRecording.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    )
      .populate('lead', 'name phone')
      .populate('metaLead', 'fullName phone email campaign rawData')
      .populate('campaignRef', 'name description status')
      .lean();

    if (!updated) return res.status(404).json({ error: 'Recording not found' });
    return res.json({ success: true, recording: formatRecording(updated) });
  } catch (err) {
    console.error('link-lead error:', err);
    return res.status(500).json({ error: 'Failed to link session: ' + err.message });
  }
});

// ─── PUT /api/recordings/:id ──────────────────────────────────────────────
// Update recording metadata (notes, title, lead association)
router.put('/:id', protect, async (req, res) => {
  try {
    const rec = await CallRecording.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recording not found' });

    // Authorization: Must be owner or HR/Admin
    const isOwner = String(rec.user) === String(req.user._id || req.user.id);
    if (!isOwner && !isHRorAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized to update this recording' });
    }

    const { leadId, originalName, phone } = req.body;
    if (leadId !== undefined) rec.lead = leadId || null;
    if (originalName) rec.originalName = originalName.trim();
    if (phone !== undefined) rec.phone = phone ? normalizePhone10(phone) : null;

    await rec.save();
    const updated = await CallRecording.findById(rec._id)
      .populate('user', 'name email')
      .populate('lead', 'name phone')
      .populate('metaLead', 'fullName phone normalizedPhone email campaign rawData')
      .populate('campaignRef', 'name description status')
      .lean();

    return res.json({ success: true, recording: formatRecording(updated) });
  } catch (err) {
    console.error('Update recording error:', err);
    return res.status(500).json({ error: 'Failed to update recording metadata' });
  }
});

// ─── PATCH /api/recordings/:id/duration ───────────────────────────────────
// Persist actual audio duration (in seconds) detected by browser audio metadata
router.patch('/:id/duration', protect, async (req, res) => {
  try {
    const rawDuration = Number(req.body.duration);
    if (!rawDuration || isNaN(rawDuration) || rawDuration <= 0) {
      return res.status(400).json({ error: 'Valid positive duration in seconds is required' });
    }

    const durationSec = Math.max(1, Math.round(rawDuration));
    const updated = await CallRecording.findByIdAndUpdate(
      req.params.id,
      { duration: durationSec },
      { new: true }
    )
      .populate('user', 'name email designation department role')
      .populate('lead', 'name phone')
      .populate('metaLead', 'fullName phone normalizedPhone email campaign rawData')
      .populate('campaignRef', 'name description status')
      .lean();

    if (!updated) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    return res.json({
      success: true,
      duration: durationSec,
      recording: formatRecording(updated)
    });
  } catch (err) {
    console.error('Update recording duration error:', err);
    return res.status(500).json({ error: 'Failed to update recording duration' });
  }
});

// ─── DELETE /api/recordings/:id (also aliased for /api/audio-conversations/:id) ──
// Securely deletes the audio asset from Cloudinary (if linked) and local disk,
// then deletes the MongoDB conversation/recording document.
async function handleDeleteRecording(req, res) {
  const { id } = req.params;

  // 1. Validate MongoDB ObjectId format
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid audio conversation ID format' });
  }

  try {
    // 2. Fetch the conversation/recording document
    const rec = await CallRecording.findById(id);
    if (!rec) {
      return res.status(404).json({ error: 'Audio conversation record not found' });
    }

    // 3. Confirm authorization: requester must be owner or HR/Admin/Manager
    const currentUserId = String(req.user._id || req.user.id);
    const isOwner = String(rec.user) === currentUserId;
    if (!isOwner && !isHRorAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized: You do not have permission to delete this audio conversation' });
    }

    // 4. Determine Cloudinary public_id
    // Check direct schema field or extract if url is on res.cloudinary.com
    let cloudinaryId = rec.cloudinaryPublicId;
    if (!cloudinaryId && rec.url && rec.url.includes('res.cloudinary.com')) {
      try {
        const parts = rec.url.split('/upload/');
        if (parts.length > 1) {
          const pathAfterUpload = parts[1].replace(/^v\d+\//, ''); // strip version v12345/
          cloudinaryId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.')) || pathAfterUpload;
        }
      } catch (_) {}
    }

    // 5. Delete Cloudinary asset if present
    let cloudinaryResult = null;
    if (cloudinaryId) {
      const resourceType = rec.cloudinaryResourceType || 'video';
      const cldRes = await deleteFromCloudinary(cloudinaryId, resourceType);

      if (!cldRes.success) {
        // Provider or network failure: PRESERVE MongoDB record so deletion can be retried safely!
        console.error(`[Delete Audio Error] Cloudinary deletion failed for ID ${id} (public_id: ${cloudinaryId}):`, cldRes.error || cldRes.result);
        return res.status(502).json({
          error: 'Cloudinary asset deletion failed. The record was preserved in CRM so you can safely retry.',
          details: cldRes.error || cldRes.result,
        });
      }

      cloudinaryResult = cldRes.alreadyDeleted ? 'already_absent' : 'deleted';
    }

    // 6. Clean up stored local disk file if present
    try {
      const filePath = findAudioFilePath(rec.storedName);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.warn('[Delete Audio] Local storage cleanup notice:', fileErr.message);
    }

    // 7. Delete the MongoDB document
    await CallRecording.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Audio conversation deleted successfully',
      id,
      deletedAsset: {
        cloudinaryPublicId: cloudinaryId || null,
        cloudinaryStatus: cloudinaryResult || 'not_applicable',
        localFileCleaned: true,
      },
    });
  } catch (err) {
    console.error('Delete audio conversation error:', err);
    return res.status(500).json({ error: 'Failed to delete audio conversation', details: err.message });
  }
}

router.delete('/:id', protect, handleDeleteRecording);

// ─── POST /api/recordings/bulk-delete ─────────────────────────────────────
// Bulk delete multiple call recordings by IDs or by current active filter
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    if (!isHRorAdmin(req.user)) {
      return res.status(403).json({
        error: 'Not authorized: Only HR and Admin can perform bulk deletion of call recordings'
      });
    }

    const { ids, deleteByFilter, filters } = req.body || {};
    let targetRecordings = [];

    if (Array.isArray(ids) && ids.length > 0 && !deleteByFilter) {
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return res.status(400).json({ error: 'No valid recording IDs provided for bulk delete' });
      }
      targetRecordings = await CallRecording.find({ _id: { $in: validIds } }).lean();
    } else if (deleteByFilter) {
      const mockReq = {
        user: req.user,
        query: filters && typeof filters === 'object' ? filters : {}
      };
      const mongoFilter = await buildRecordingsFilter(mockReq);
      targetRecordings = await CallRecording.find(mongoFilter).lean();
    } else {
      return res.status(400).json({ error: 'Provide either an array of recording IDs or deleteByFilter: true' });
    }

    if (targetRecordings.length === 0) {
      return res.json({
        success: true,
        totalRequested: Array.isArray(ids) ? ids.length : 0,
        deletedCount: 0,
        failedCount: 0,
        message: 'No matching call recordings found to delete.'
      });
    }

    let deletedCount = 0;
    let failedCount = 0;
    const deletedIds = [];

    // Process in concurrent batches of 10 for fast bulk deletion (e.g., 51 records in ~1-2s)
    const BATCH_SIZE = 10;
    for (let i = 0; i < targetRecordings.length; i += BATCH_SIZE) {
      const batch = targetRecordings.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (rec) => {
          try {
            // 1. Best-effort Cloudinary asset cleanup
            let cloudinaryId = rec.cloudinaryPublicId;
            if (!cloudinaryId && rec.url && rec.url.includes('res.cloudinary.com')) {
              try {
                const parts = rec.url.split('/upload/');
                if (parts.length > 1) {
                  const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
                  cloudinaryId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.')) || pathAfterUpload;
                }
              } catch (_) {}
            }

            if (cloudinaryId) {
              try {
                await deleteFromCloudinary(cloudinaryId, rec.cloudinaryResourceType || 'video');
              } catch (cldErr) {
                console.warn(`[Bulk Delete] Cloudinary cleanup notice for ${rec._id}:`, cldErr.message);
              }
            }

            // 2. Best-effort local disk cleanup
            try {
              const filePath = findAudioFilePath(rec.storedName);
              if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (_) {}

            // 3. Delete MongoDB document
            const delDoc = await CallRecording.findByIdAndDelete(rec._id);
            if (delDoc) {
              deletedCount += 1;
              deletedIds.push(String(rec._id));
            } else {
              failedCount += 1;
            }
          } catch (itemErr) {
            console.error(`[Bulk Delete] Failed to delete recording ${rec._id}:`, itemErr.message);
            failedCount += 1;
          }
        })
      );
    }

    // Also count any requested IDs that did not exist in DB as failed if explicit IDs were sent
    if (Array.isArray(ids) && ids.length > 0 && !deleteByFilter && ids.length > targetRecordings.length) {
      failedCount += (ids.length - targetRecordings.length);
    }

    return res.json({
      success: true,
      totalRequested: Array.isArray(ids) && !deleteByFilter ? ids.length : targetRecordings.length,
      deletedCount,
      failedCount,
      deletedIds,
      message: `Bulk delete completed: ${deletedCount} deleted, ${failedCount} failed.`
    });
  } catch (err) {
    console.error('[Bulk Delete Recordings Error]:', err);
    return res.status(500).json({
      error: 'Failed to execute bulk delete operation',
      details: err.message
    });
  }
});

// ─── POST /api/recordings/rematch ─────────────────────────────────────────
router.post('/rematch', protect, async (req, res) => {
  try {
    const unlinked = await CallRecording.find({ metaLead: null, lead: null }).lean();
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
          const metaLead = await findMetaLeadByPhone(phone10);
          if (metaLead) {
            const resolvedName = metaLead.fullName || metaLead.rawData?.full_name || metaLead.rawData?.name || 'Meta Lead';
            const resolvedPhone = metaLead.phone || metaLead.normalizedPhone || metaLead.rawData?.phone_number || phone10;
            await CallRecording.findByIdAndUpdate(rec._id, {
              linkType: 'meta_lead',
              metaLead: metaLead._id,
              metaLeadName: resolvedName,
              metaLeadPhone: resolvedPhone,
              campaignName: metaLead.campaign || null,
            });
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
    const filter = await buildRecordingsFilter(req);
    filter.user = req.user._id || req.user.id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = req.query.limit === 'all'
      ? 1000
      : Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const [total, recordings] = await Promise.all([
      CallRecording.countDocuments(filter),
      CallRecording.find(filter)
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email designation department role avatar')
        .populate('lead', 'name phone')
        .populate('metaLead', 'fullName phone normalizedPhone email campaign rawData')
        .populate('campaignRef', 'name description status')
        .lean()
    ]);

    return res.json({
      success: true,
      recordings: recordings.map(formatRecording),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    console.error('getMyRecordings error:', err);
    return res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// ─── HELPER: Sanitize Dangling Lead / MetaLead References ─────────────────
let lastLinkSanitizeTime = 0;
async function sanitizeDanglingRecordingLinks() {
  const now = Date.now();
  if (now - lastLinkSanitizeTime < 15000) return;
  lastLinkSanitizeTime = now;

  try {
    const recsWithRefs = await CallRecording.find({
      $or: [
        { lead: { $ne: null } },
        { metaLead: { $ne: null } },
        { linkType: { $in: ['lead', 'meta_lead', 'campaign'] } }
      ]
    })
      .select('_id lead metaLead metaLeadName linkType')
      .lean();

    if (recsWithRefs.length === 0) return;

    const leadIds = recsWithRefs.map(r => r.lead).filter(Boolean);
    const metaIds = recsWithRefs.map(r => r.metaLead).filter(Boolean);

    const [validLeads, validMetaLeads] = await Promise.all([
      leadIds.length > 0 ? Lead.find({ _id: { $in: leadIds } }).select('_id').lean() : [],
      metaIds.length > 0 ? MetaLead.find({ _id: { $in: metaIds } }).select('_id').lean() : []
    ]);

    const validLeadSet = new Set(validLeads.map(l => String(l._id)));
    const validMetaSet = new Set(validMetaLeads.map(m => String(m._id)));

    const staleIds = [];
    for (const r of recsWithRefs) {
      const hasValidLead = r.lead && validLeadSet.has(String(r.lead));
      const hasValidMeta = r.metaLead && validMetaSet.has(String(r.metaLead));
      const hasStoredMetaName = Boolean(r.metaLeadName && String(r.metaLeadName).trim());

      if (!hasValidLead && !hasValidMeta && !hasStoredMetaName) {
        staleIds.push(r._id);
      }
    }

    if (staleIds.length > 0) {
      await CallRecording.updateMany(
        { _id: { $in: staleIds } },
        {
          $set: {
            lead: null,
            metaLead: null,
            metaLeadName: null,
            metaLeadPhone: null,
            campaignRef: null,
            linkType: null
          }
        }
      );
    }
  } catch (err) {
    console.warn('[Sanitize Dangling Links Notice]:', err.message);
  }
}

// ─── HELPER: Determine if a Recording is Linked (matches frontend getLinkInfo) ──
function isRecordingLinked(r) {
  if (!r) return false;
  return Boolean(
    r.metaLead ||
    r.lead ||
    (r.metaLeadName && String(r.metaLeadName).trim()) ||
    r.linkType === 'meta_lead' ||
    r.linkType === 'lead'
  );
}

// ─── HELPER: Build multi-dimensional recording filter ──────────────────────
async function buildRecordingsFilter(req) {
  await sanitizeDanglingRecordingLinks();

  const isElevated = isHRorAdmin(req.user);
  const filter = {};

  // 1. Role Scoping
  const targetUserId = req.query.userId || req.query.user;
  if (!isElevated) {
    filter.user = req.user._id || req.user.id;
  } else if (targetUserId && targetUserId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(targetUserId)) {
      filter.user = new mongoose.Types.ObjectId(targetUserId);
    }
  }

  // 2. Direct Phone
  if (req.query.phone) {
    const phoneDigits = normalizePhone10(req.query.phone);
    if (phoneDigits) filter.phone = phoneDigits;
  }

  // 3. Date / Date Range
  if (req.query.date) {
    // Exact Day (e.g. from calendar click): "YYYY-MM-DD"
    const exactDay = String(req.query.date).trim();
    const dayStart = new Date(`${exactDay}T00:00:00.000Z`);
    const dayEnd = new Date(`${exactDay}T23:59:59.999Z`);
    filter.$or = [
      { callDate: exactDay },
      { recordedAt: { $gte: dayStart, $lte: dayEnd } }
    ];
  } else if (req.query.from || req.query.to) {
    filter.recordedAt = {};
    if (req.query.from) {
      filter.recordedAt.$gte = new Date(`${String(req.query.from).trim()}T00:00:00.000Z`);
    }
    if (req.query.to) {
      filter.recordedAt.$lte = new Date(`${String(req.query.to).trim()}T23:59:59.999Z`);
    }
  }

  // 4. Status
  if (req.query.status && req.query.status !== 'all') {
    const s = String(req.query.status).toLowerCase();
    if (s === 'completed' || s === 'connected') {
      filter.callStatus = { $in: ['completed', 'connected', '', null] };
    } else if (s === 'transcribed') {
      filter.transcript = { $nin: [null, ''] };
    } else if (s === 'missed') {
      filter.callStatus = { $in: ['missed', 'no_answer', 'failed', 'busy', 'rejected'] };
    } else {
      filter.callStatus = s;
    }
  }

  // 5. Direction
  if (req.query.direction && req.query.direction !== 'all') {
    filter.direction = req.query.direction;
  }

  // 6. File Availability
  if (req.query.fileAvailable === 'true') {
    filter.fileAvailable = { $ne: false };
  } else if (req.query.fileAvailable === 'false') {
    filter.fileAvailable = false;
  }

  // 7. Link Type (100% consistent with frontend getLinkInfo & analytics-summary)
  if (req.query.linkType && req.query.linkType !== 'all') {
    if (req.query.linkType === 'meta_lead' || req.query.linkType === 'lead' || req.query.linkType === 'matched') {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { metaLead: { $ne: null } },
          { lead: { $ne: null } },
          { metaLeadName: { $nin: [null, ''] } },
          { linkType: { $in: ['meta_lead', 'lead'] } }
        ]
      });
    } else if (req.query.linkType === 'campaign') {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: [{ linkType: 'campaign' }, { campaignRef: { $ne: null } }, { campaignName: { $nin: [null, ''] } }] });
    } else if (req.query.linkType === 'unlinked') {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $and: [
          { $or: [{ metaLead: null }, { metaLead: { $exists: false } }] },
          { $or: [{ lead: null }, { lead: { $exists: false } }] },
          { $or: [{ metaLeadName: null }, { metaLeadName: '' }, { metaLeadName: { $exists: false } }] },
          { $or: [{ linkType: null }, { linkType: '' }, { linkType: { $exists: false } }, { linkType: { $nin: ['meta_lead', 'lead'] } }] }
        ]
      });
    }
  }

  // 8. Smart Search across contact, phone, agent, and campaign
  if (req.query.search && req.query.search.trim()) {
    const rawSearch = req.query.search.trim();
    const regex = new RegExp(rawSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
    const phoneDigits = rawSearch.replace(/\D/g, '');

    const matchingLeads = await Lead.find({ name: regex }).select('_id').limit(40).lean();
    const matchingLeadIds = matchingLeads.map(l => l._id);

    const matchingUsers = await User.find({ name: regex }).select('_id').limit(40).lean();
    const matchingUserIds = matchingUsers.map(u => u._id);

    const searchConditions = [
      { originalName: regex },
      { storedName: regex },
      { metaLeadName: regex },
      { campaignName: regex }
    ];

    if (phoneDigits && phoneDigits.length >= 3) {
      searchConditions.push({ phone: { $regex: phoneDigits } });
      searchConditions.push({ metaLeadPhone: { $regex: phoneDigits } });
    }
    if (matchingLeadIds.length > 0) {
      searchConditions.push({ lead: { $in: matchingLeadIds } });
    }
    if (matchingUserIds.length > 0) {
      searchConditions.push({ user: { $in: matchingUserIds } });
    }

    if (filter.$or) {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: filter.$or });
      delete filter.$or;
    }

    if (filter.$and) {
      filter.$and.push({ $or: searchConditions });
    } else {
      filter.$or = searchConditions;
    }
  }

  return filter;
}

// ─── HELPER: Compute Effective Call Duration (in seconds) ──────────────────
function computeEffectiveDuration(r) {
  if (!r) return 0;
  const direct = Number(r.duration);
  if (direct && !isNaN(direct) && direct > 0) {
    return Math.round(direct);
  }
  const bytes = Number(r.size);
  if (bytes && !isNaN(bytes) && bytes > 0) {
    return Math.max(1, Math.round(bytes / 3200));
  }
  if (r.transcript && typeof r.transcript === 'string' && r.transcript.trim().length > 0) {
    return Math.max(12, Math.round(r.transcript.trim().length / 12));
  }
  if (r.fileAvailable !== false && (r.cloudinaryUrl || r.url || r.storedName)) {
    return 35;
  }
  return 0;
}

// ─── GET /api/recordings/analytics-summary ─────────────────────────────────
router.get('/analytics-summary', protect, async (req, res) => {
  try {
    const filter = await buildRecordingsFilter(req);

    const matchedRecordings = await CallRecording.find(filter)
      .select('callStatus duration size transcript fileAvailable cloudinaryUrl url storedName metaLead lead metaLeadName linkType')
      .lean();

    let totalCalls = 0;
    let completedCalls = 0;
    let linkedCalls = 0;
    let unlinkedCalls = 0;
    let transcribedCalls = 0;
    let totalDurationSeconds = 0;
    let hasRecordingCount = 0;
    let callsWithDuration = 0;

    for (const r of matchedRecordings) {
      totalCalls += 1;
      const status = r.callStatus || 'completed';
      if (['completed', 'connected', ''].includes(status)) {
        completedCalls += 1;
      }
      if (isRecordingLinked(r)) {
        linkedCalls += 1;
      } else {
        unlinkedCalls += 1;
      }
      if (r.transcript && typeof r.transcript === 'string' && r.transcript.trim().length > 0) {
        transcribedCalls += 1;
      }
      if (r.fileAvailable !== false) {
        hasRecordingCount += 1;
      }

      const dur = computeEffectiveDuration(r);
      if (dur > 0) {
        totalDurationSeconds += dur;
        callsWithDuration += 1;
      }
    }

    const avgDivisor = completedCalls > 0
      ? completedCalls
      : (callsWithDuration > 0 ? callsWithDuration : totalCalls);

    const avgDuration = avgDivisor > 0
      ? Math.round(totalDurationSeconds / avgDivisor)
      : 0;

    const answerRate = totalCalls > 0
      ? `${((completedCalls / totalCalls) * 100).toFixed(1)}%`
      : '0.0%';

    return res.json({
      success: true,
      summary: {
        totalCalls,
        completedCalls,
        linkedCalls,
        unlinkedCalls,
        transcribedCalls,
        totalDurationSeconds: Math.round(totalDurationSeconds),
        avgDurationSeconds: avgDuration,
        answerRate,
        hasRecordingCount
      }
    });
  } catch (err) {
    console.error('[Analytics Summary Error]', err);
    return res.status(500).json({ error: 'Failed to generate analytics summary' });
  }
});

// ─── GET /api/recordings/calendar-activity ─────────────────────────────────
router.get('/calendar-activity', protect, async (req, res) => {
  try {
    const isElevated = isHRorAdmin(req.user);
    const filter = {};

    if (!isElevated) {
      filter.user = req.user._id || req.user.id;
    } else {
      const targetUserId = req.query.userId || req.query.user;
      if (targetUserId && targetUserId !== 'all' && mongoose.Types.ObjectId.isValid(targetUserId)) {
        filter.user = targetUserId;
      }
    }

    // Support both { year, month } and { month: "YYYY-MM" }
    let year, m, monthStr;
    if (req.query.year && req.query.month) {
      year = parseInt(req.query.year, 10);
      m = parseInt(req.query.month, 10);
      monthStr = `${year}-${String(m).padStart(2, '0')}`;
    } else if (req.query.month && String(req.query.month).includes('-')) {
      monthStr = String(req.query.month);
      year = parseInt(monthStr.split('-')[0], 10);
      m = parseInt(monthStr.split('-')[1], 10);
    } else {
      monthStr = new Date().toISOString().slice(0, 7);
      year = parseInt(monthStr.split('-')[0], 10);
      m = parseInt(monthStr.split('-')[1], 10);
    }
    const startOfMonth = new Date(`${monthStr}-01T00:00:00.000Z`);
    const endOfMonth = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

    filter.recordedAt = { $gte: startOfMonth, $lte: endOfMonth };

    const grouped = await CallRecording.aggregate([
      { $match: filter },
      {
        $project: {
          dayStr: {
            $ifNull: [
              '$callDate',
              { $dateToString: { format: '%Y-%m-%d', date: '$recordedAt', timezone: '+05:30' } }
            ]
          },
          callStatus: 1
        }
      },
      {
        $group: {
          _id: '$dayStr',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ['$callStatus', ['completed', 'connected', '', null]] }, 1, 0]
            }
          },
          missed: {
            $sum: {
              $cond: [{ $in: ['$callStatus', ['missed', 'no_answer', 'failed', 'busy', 'rejected']] }, 1, 0]
            }
          }
        }
      }
    ]);

    const activityMap = {};
    for (const item of grouped) {
      if (item._id) {
        activityMap[item._id] = {
          total: item.total,
          completed: item.completed,
          missed: item.missed
        };
      }
    }

    return res.json({
      success: true,
      month: monthStr,
      activity: activityMap
    });
  } catch (err) {
    console.error('[Calendar Activity Error]', err);
    return res.status(500).json({ error: 'Failed to fetch calendar activity' });
  }
});

// ─── GET /api/recordings (Paginated, Filtered, Backward Compatible) ─────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = await buildRecordingsFilter(req);

    // Pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = req.query.limit === 'all'
      ? 1000
      : Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = req.query.sortBy || 'recordedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const [total, recordings] = await Promise.all([
      CallRecording.countDocuments(filter),
      CallRecording.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email designation department role avatar')
        .populate('lead', 'name phone')
        .populate('metaLead', 'fullName phone normalizedPhone email campaign rawData')
        .populate('campaignRef', 'name description status')
        .lean()
    ]);

    const formatted = recordings.map(formatRecording);

    return res.json({
      success: true,
      recordings: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    console.error('getAllRecordings error:', err);
    return res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// ─── POST /api/recordings/:id/transcribe ──────────────────────────────────
router.post('/:id/transcribe', protect, async (req, res) => {
  try {
    if (!isHRorAdmin(req.user)) {
      return res.status(403).json({ error: 'Not authorized: Call recordings are restricted to HR and Admin' });
    }

    const rec = await CallRecording.findById(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recording not found' });

    if (rec.transcriptStatus === 'done' && rec.transcript && !req.body.force) {
      return res.json({ success: true, transcript: rec.transcript, cached: true });
    }

    let sttFn = transcribeAudioFile;
    if (!sttFn) {
      try {
        sttFn = require('../../../modules/communication/calls/transcriptionService').transcribeAudioFile;
      } catch (err) {
        console.error('Failed to load transcriptionService:', err);
      }
    }

    if (!sttFn) {
      return res.status(501).json({ error: 'Transcription service not configured on server or OPENAI_API_KEY is missing' });
    }

    rec.transcriptStatus = 'pending';
    await rec.save();

    try {
      const absolutePath = path.join(UPLOAD_DIR, rec.storedName);
      const transcript = await sttFn(absolutePath, req.body.apiKey);
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

// ─── Stream & Serve Audio Files ───────────────────────────────────────────
function findAudioFilePath(filename) {
  if (!filename) return null;
  const cleanName = path.basename(filename);
  const possiblePaths = [
    path.join(UPLOAD_DIR, cleanName),
    path.join(__dirname, '..', '..', '..', 'uploads', 'recordings', cleanName),
    path.join(__dirname, '..', '..', '..', 'uploads', cleanName),
    path.join(process.cwd(), 'src', 'uploads', 'recordings', cleanName),
    path.join(process.cwd(), 'src', 'uploads', cleanName),
    path.join(process.cwd(), 'uploads', 'recordings', cleanName),
    path.join(process.cwd(), 'uploads', cleanName),
    path.join(__dirname, '..', '..', '..', 'temp_recordings', cleanName),
    path.join(process.cwd(), 'src', 'temp_recordings', cleanName),
    path.join(process.cwd(), 'temp_recordings', cleanName),
    path.join('/var/data/recordings', cleanName),
    path.join('/tmp/recordings', cleanName),
    path.join('/tmp', cleanName),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

function getAudioMimeType(filename) {
  if (!filename) return 'audio/mp4';
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.m4a': return 'audio/mp4';
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.aac': return 'audio/aac';
    case '.ogg': return 'audio/ogg';
    case '.3gp':
    case '.3gpp': return 'audio/3gpp';
    case '.amr': return 'audio/amr';
    case '.flac': return 'audio/flac';
    default: return 'audio/mp4';
  }
}

async function streamAudioFile(req, res) {
  try {
    const filename = req.params.filename;
    const filePath = findAudioFilePath(filename);

    if (!filePath) {
      // 1. Check if recording exists in MongoDB with a valid Cloudinary URL
      const rec = await CallRecording.findOne({
        $or: [
          { storedName: filename },
          { originalName: filename },
          { url: { $regex: filename } },
          { cloudinaryUrl: { $regex: filename } },
        ]
      }).select('cloudinaryUrl url').lean();

      if (rec && (rec.cloudinaryUrl || (rec.url && rec.url.includes('res.cloudinary.com')))) {
        const cldUrl = rec.cloudinaryUrl || rec.url;
        console.log(`[AudioStream] Streaming via Cloudinary CDN redirect for ${filename}: ${cldUrl}`);
        return res.redirect(302, cldUrl);
      }

      // 2. If file not found locally or in Cloudinary, proxy from remote Render server
      // only if we are NOT already on the remote server!
      const remoteHost = 'telecommunication-l3oz.onrender.com';
      const currentHost = (req.get('host') || '').toLowerCase();
      const isRunningOnRemote = currentHost.includes(remoteHost) || !!process.env.RENDER;

      if (isRunningOnRemote) {
        return res.status(404).json({ error: 'Audio recording file not found on server' });
      }

      const remoteStreamUrl = `https://${remoteHost}/api/recordings/stream/${filename}`;
      console.log(`[AudioStream] Local file not found for ${filename}. Proxying from ${remoteStreamUrl}`);

      const https = require('https');
      const reqHeaders = {};
      if (req.headers.range) {
        reqHeaders.range = req.headers.range;
      }

      const proxyReq = https.get(remoteStreamUrl, { headers: reqHeaders, timeout: 15000 }, (proxyRes) => {
        if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
          const redirectLocation = proxyRes.headers.location;
          if (redirectLocation) {
            return res.redirect(302, redirectLocation);
          }
        }
        if (proxyRes.statusCode === 404) {
          return res.status(404).json({ error: 'Audio recording file not found on server' });
        }
        
        // Pass essential headers
        const forwardHeaders = {};
        const safeHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified'];
        safeHeaders.forEach(h => {
          if (proxyRes.headers[h]) forwardHeaders[h] = proxyRes.headers[h];
        });
        if (!forwardHeaders['content-type']) {
          forwardHeaders['content-type'] = getAudioMimeType(filename);
        }
        forwardHeaders['access-control-allow-origin'] = '*';
        
        res.writeHead(proxyRes.statusCode, forwardHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        if (!res.headersSent) {
          res.status(504).json({ error: 'Remote audio stream request timed out' });
        }
      });

      proxyReq.on('error', (proxyErr) => {
        console.error('[AudioStream Proxy Error]', proxyErr.message);
        if (!res.headersSent) {
          res.status(404).json({ error: 'Audio recording file not found on server' });
        }
      });

      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = getAudioMimeType(filename);
    const range = req.headers.range;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).send('Requested Range Not Satisfiable');
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[AudioStream Error]', err);
    res.status(500).json({ error: 'Failed to stream audio file' });
  }
}

router.get('/stream/:filename', streamAudioFile);
router.get('/file/:filename', streamAudioFile);

function formatRecording(r) {
  const filename = r.storedName || (r.url ? path.basename(r.url) : '');
  const localFile = filename ? findAudioFilePath(filename) : null;
  const isCloudinary = !!(r.cloudinaryUrl || (r.url && r.url.includes('res.cloudinary.com')));
  const fileAvailable = r.fileAvailable !== false && (!!localFile || isCloudinary);

  // Use direct Cloudinary CDN URL when available, otherwise backend streaming path
  const cldUrl = r.cloudinaryUrl || (r.url && r.url.includes('res.cloudinary.com') ? r.url : null);
  const streamPath = filename ? `/api/recordings/stream/${filename}` : (r.url || '');
  const finalAudioUrl = cldUrl || absoluteUrl(streamPath);

  const linkType = r.linkType || (r.lead ? 'lead' : (r.metaLead ? 'meta_lead' : (r.campaignRef || r.campaignName ? 'campaign' : null)));
  const metaLeadName = r.metaLeadName || (r.metaLead ? (r.metaLead.fullName || r.metaLead.rawData?.full_name || r.metaLead.rawData?.name || 'Meta Lead') : null);
  const metaLeadPhone = r.metaLeadPhone || (r.metaLead ? (r.metaLead.phone || r.metaLead.normalizedPhone || r.metaLead.rawData?.phone_number || r.metaLead.rawData?.phone || null) : null);
  const campaignName = r.campaignName || (r.campaignRef ? r.campaignRef.name : (r.metaLead ? r.metaLead.campaign : null));

  // Resolved display name for backward compatibility
  const resolvedLeadName = r.lead && r.lead.name
    ? r.lead.name
    : (metaLeadName || campaignName || null);
  const resolvedLeadPhone = r.lead && r.lead.phone
    ? r.lead.phone
    : (metaLeadPhone || null);

  return {
    _id: r._id,
    recordedAt: r.recordedAt,
    url: finalAudioUrl,
    audioUrl: finalAudioUrl,
    streamUrl: cldUrl || absoluteUrl(streamPath),
    originalUrl: absoluteUrl(r.url),
    cloudinaryUrl: cldUrl,
    cloudinaryPublicId: r.cloudinaryPublicId || null,
    cloudinaryResourceType: r.cloudinaryResourceType || 'video',
    fileAvailable: fileAvailable,
    fileExists: fileAvailable,
    size: r.size,
    mimeType: getAudioMimeType(filename) || r.mimeType || 'audio/mp4',
    phone: r.phone || null,
    userId: r.user ? (r.user._id || r.user) : undefined,
    userName: r.user && r.user.name ? r.user.name : undefined,
    userEmail: r.user && r.user.email ? r.user.email : undefined,
    userDesignation: r.user && r.user.designation ? r.user.designation : undefined,
    userDepartment: r.user && r.user.department ? r.user.department : undefined,
    userRole: r.user && r.user.role ? r.user.role : undefined,
    userAvatar: r.user && r.user.avatar ? r.user.avatar : undefined,
    linkType: linkType,
    leadId: r.lead ? (r.lead._id || r.lead) : null,
    leadName: resolvedLeadName,
    leadPhone: resolvedLeadPhone,
    metaLeadId: r.metaLead ? (r.metaLead._id || r.metaLead) : null,
    metaLeadName: metaLeadName,
    metaLeadPhone: metaLeadPhone,
    metaLeadCampaign: r.metaLead ? r.metaLead.campaign : null,
    campaignId: r.campaignRef ? (r.campaignRef._id || r.campaignRef) : null,
    campaignName: campaignName,
    originalName: r.originalName || filename,
    duration: computeEffectiveDuration(r),
    callStatus: r.callStatus || 'completed',
    direction: r.direction || 'outbound',
    callDate: r.callDate || (r.recordedAt ? new Date(r.recordedAt).toISOString().slice(0, 10) : ''),
    callTime: r.callTime || (r.recordedAt ? new Date(r.recordedAt).toTimeString().slice(0, 8) : ''),
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

// ─── Startup Migration Routine for Legacy Recordings ───────────────────────
async function syncLegacyRecordings() {
  try {
    const legacyRecs = await CallRecording.find({
      $or: [
        { cloudinaryUrl: null },
        { cloudinaryUrl: '' },
        { fileAvailable: { $ne: false } },
      ]
    });

    for (const rec of legacyRecs) {
      // Backfill duration if missing or 0
      if (!rec.duration || rec.duration <= 0) {
        const estimatedSec = computeEffectiveDuration(rec);
        if (estimatedSec > 0) {
          await CallRecording.findByIdAndUpdate(rec._id, { duration: estimatedSec });
        }
      }

      if (!rec.cloudinaryUrl) {
        const localFile = findAudioFilePath(rec.storedName || rec.originalName);
        if (localFile && fs.existsSync(localFile)) {
          try {
            const cld = await uploadAudioToCloudinary(localFile, 'call_recordings', rec.storedName);
            if (cld && cld.secure_url) {
              const cldDur = cld.duration ? Math.round(Number(cld.duration)) : computeEffectiveDuration(rec);
              await CallRecording.findByIdAndUpdate(rec._id, {
                cloudinaryUrl: cld.secure_url,
                cloudinaryPublicId: cld.public_id,
                cloudinaryResourceType: cld.resource_type || 'video',
                url: cld.secure_url,
                fileAvailable: true,
                ...(cldDur > 0 ? { duration: cldDur } : {}),
              });
              console.log(`[Legacy Audio Sync] Recovered & uploaded ${rec.storedName} to Cloudinary.`);
            }
          } catch (cldErr) {
            console.warn(`[Legacy Audio Sync] Failed to backfill ${rec.storedName}:`, cldErr.message);
          }
        } else {
          // File not present locally or in Cloudinary
          if (rec.fileAvailable !== false) {
            await CallRecording.findByIdAndUpdate(rec._id, { fileAvailable: false });
            console.log(`[Legacy Audio Sync] Marked ${rec.originalName} (${rec._id}) as fileAvailable: false (audio missing, transcript preserved).`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Legacy Audio Sync Notice]', err.message);
  }
}

// Run legacy sync once MongoDB connection is established
function triggerLegacySync() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    syncLegacyRecordings().catch(() => {});
  } else if (mongoose.connection) {
    mongoose.connection.once('connected', () => {
      syncLegacyRecordings().catch(() => {});
    });
  }
}
setTimeout(triggerLegacySync, 2000);

module.exports = router;
