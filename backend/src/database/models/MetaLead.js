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
  // Flexible container holding the exact, raw Google Sheet columns
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Converted', 'Follow-up', 'Discarded'],
    default: 'New',
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

// Compound index for efficient campaign filtering & chronology
metaLeadSchema.index({ campaign: 1, createdAt: -1 });
metaLeadSchema.index({ campaign: 1, 'rawData.phone': 1 });

module.exports = mongoose.model('MetaLead', metaLeadSchema);
