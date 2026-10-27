const mongoose = require('mongoose');

const metaLeadSchema = new mongoose.Schema({
  campaign: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  source: {
    type: String,
    default: 'google_sheets_meta',
    trim: true,
    index: true
  },
  // Structured identifiers for reliable deduplication
  metaLeadId: {
    type: String,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    trim: true,
    index: true
  },
  normalizedPhone: {
    type: String,
    trim: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  fullName: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  // Flexible container holding the exact, raw Google Sheet columns
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    default: 'New',
    index: true
  },
  department: {
    type: String,
    trim: true,
    index: true
  },
  lastCallAt: {
    type: Date,
    default: null
  },
  callCount: {
    type: Number,
    default: 0
  },
  followUpDate: {
    type: Date,
    default: null
  },
  callNotes: [{
    note: { type: String, trim: true },
    outcome: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  crmLeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null
  },
  syncedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  strict: false // Allows dynamic fields without stripping
});

// Compound indexes for campaign filtering, chronology, and fast deduplication
metaLeadSchema.index({ campaign: 1, createdAt: -1 });
metaLeadSchema.index({ campaign: 1, metaLeadId: 1 }, { sparse: true });
metaLeadSchema.index({ campaign: 1, normalizedPhone: 1 }, { sparse: true });
metaLeadSchema.index({ campaign: 1, 'rawData.phone': 1 });

module.exports = mongoose.model('MetaLead', metaLeadSchema);
