const mongoose = require('mongoose');

const performanceAuditLogSchema = new mongoose.Schema({
  entityType: { 
    type: String, 
    enum: ['TICKET', 'SCORE', 'RULE_CONFIG', 'COMPLIANCE_JOB', 'TASK_CONFIRMATION'], 
    required: true, 
    index: true 
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
  action: { type: String, required: true }, // e.g. "TICKET_CREATED", "SCORE_OVERRIDDEN", "LATE_CORRECTION", "LOGOUT_TASK_BYPASS"
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByRole: { type: String, default: '' },
  previousState: { type: mongoose.Schema.Types.Mixed, default: {} },
  newState: { type: mongoose.Schema.Types.Mixed, default: {} },
  reason: { type: String, default: '', trim: true },
  ipAddress: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

performanceAuditLogSchema.index({ entityType: 1, timestamp: -1 });

module.exports = mongoose.model('PerformanceAuditLog', performanceAuditLogSchema);

