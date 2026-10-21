const mongoose = require('mongoose');

const metaSyncStateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'meta_leads_sync'
  },
  isSyncing: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: null
  },
  lastFinishedAt: {
    type: Date,
    default: null
  },
  lastStatus: {
    type: String,
    enum: ['idle', 'in_progress', 'completed', 'failed'],
    default: 'idle'
  },
  totalProcessed: {
    type: Number,
    default: 0
  },
  insertedCount: {
    type: Number,
    default: 0
  },
  updatedCount: {
    type: Number,
    default: 0
  },
  skippedCount: {
    type: Number,
    default: 0
  },
  message: {
    type: String,
    default: ''
  },
  lastError: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MetaSyncState', metaSyncStateSchema);
