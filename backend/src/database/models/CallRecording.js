// models/CallRecording.js
// Collection: callrecordings
const mongoose = require('mongoose');
const { normalizePhone10 } = require('../../core/utils/phone');

const callRecordingSchema = new mongoose.Schema(
  {
    // Who recorded this call (the caller/agent)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Optional link to the lead this call was about
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },

    // Link category: 'lead' (Normal Lead), 'meta_lead' (Meta Lead), 'campaign' (Campaign), or null
    linkType: {
      type: String,
      enum: ['lead', 'meta_lead', 'campaign', null],
      default: null,
      index: true,
    },

    // Reference to a MetaLead (when category is Meta Leads)
    metaLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MetaLead',
      default: null,
      index: true,
    },
    metaLeadName: { type: String, default: null },
    metaLeadPhone: { type: String, default: null },

    // Reference to a Campaign (when category is Campaigns)
    campaignRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
      index: true,
    },
    campaignName: { type: String, default: null },

    // Phone number extracted from the recording filename (digits only, last
    // 10 kept) — lets a recording be matched to a lead's call history even
    // when no leadId was sent or the lead didn't exist yet at upload time.
    // Always normalized to exactly the last 10 digits — never more, never
    // less — same rule as Lead.phone (see utils/phone.js). Left as null
    // only when no phone digits could be found anywhere in the upload.
    phone: {
      type: String,
      default: null,
      index: true,
      set: v => (v === null || v === undefined || v === '' ? null : normalizePhone10(v)),
      validate: {
        validator: v => v === null || /^\d{10}$/.test(v),
        message: props => `Recording phone must be exactly 10 digits (got "${props.value}")`,
      },
    },

    // Original filename as saved by the phone's call-recorder app
    originalName: { type: String, required: true },

    // Filename actually stored on disk (sanitized + unique)
    storedName: { type: String, required: true },

    // Relative path on disk, e.g. "recordings/167900_call.m4a"
    filePath: { type: String, required: true },

    // Publicly servable URL, e.g. "/uploads/recordings/167900_call.m4a"
    url: { type: String, required: true },

    // Cloudinary storage reference (when stored in Cloudinary)
    cloudinaryPublicId: { type: String, default: null, index: true },
    cloudinaryResourceType: { type: String, default: 'video' }, // Cloudinary stores audio files under 'video' resource_type
    cloudinaryUrl: { type: String, default: null },

    // Physical audio file availability flag (false if audio binary is lost, transcript preserved)
    fileAvailable: { type: Boolean, default: true },

    // File size in bytes
    size: { type: Number, default: 0 },

    // MIME type, e.g. "audio/mp4", "audio/amr"
    mimeType: { type: String, default: 'audio/mpeg' },

    // When the call actually happened (sent by the app), vs createdAt = upload time
    recordedAt: { type: Date, required: true },

    // Same moment as recordedAt, split out into plain date/time strings so
    // the exact call date and call time are stored directly in the schema
    // (not just derivable from a Date object) and always render exactly as
    // the call happened, independent of any timezone conversion.
    callDate: { type: String, required: true },  // "YYYY-MM-DD"
    callTime: { type: String, required: true },  // "HH:mm:ss" (24-hour)

    // Speech-to-text result (via OpenAI Whisper), populated on demand the
    // first time someone runs a Call IQ agent against this recording, then
    // cached here so repeat audits don't re-transcribe the same audio.
    transcript: { type: String, default: '' },
    transcriptStatus: { type: String, enum: ['none', 'pending', 'done', 'failed'], default: 'none' },
    transcriptError: { type: String, default: '' },

    // Call duration in seconds (extracted from audio/device or calculated)
    duration: { type: Number, default: 0, index: true },

    // Call status outcome (connected, completed, missed, failed, etc.)
    callStatus: {
      type: String,
      enum: ['completed', 'connected', 'missed', 'failed', 'busy', 'no_answer', 'rejected', 'in_progress', 'unknown'],
      default: 'completed',
      index: true,
    },

    // Call direction: outbound (agent called lead) or inbound (lead called agent)
    direction: {
      type: String,
      enum: ['outbound', 'inbound', 'unknown'],
      default: 'outbound',
      index: true,
    },

    // Snapshot of the MOST RECENT Call IQ audit run against this recording.
    // Overwritten every time "Run Call IQ" is used (never appended), so this
    // always reflects the latest report — not the first one ever run — and
    // can be shown directly in the recordings list without a second fetch.
    lastCallIqReport: {
      audit: { type: mongoose.Schema.Types.ObjectId, ref: 'CallAudit', default: null },
      agent: { type: mongoose.Schema.Types.ObjectId, ref: 'AiAgent', default: null },
      agentName: { type: String, default: '' },
      status: { type: String, enum: ['success', 'failed', ''], default: '' },
      result: { type: mongoose.Schema.Types.Mixed, default: null },
      error: { type: String, default: '' },
      runAt: { type: Date, default: null },
      runBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
  },
  { timestamps: true } // adds createdAt, updatedAt
);

// High performance indexes for calendar, smart filtering, and pagination
callRecordingSchema.index({ user: 1, recordedAt: -1 });
callRecordingSchema.index({ callDate: 1, user: 1 });
callRecordingSchema.index({ recordedAt: -1, user: 1 });
callRecordingSchema.index({ callStatus: 1, recordedAt: -1 });
callRecordingSchema.index({ phone: 1, recordedAt: -1 });
callRecordingSchema.index({ linkType: 1, recordedAt: -1 });

module.exports = mongoose.model('CallRecording', callRecordingSchema);