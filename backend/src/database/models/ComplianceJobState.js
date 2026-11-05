const mongoose = require('mongoose');

const complianceJobStateSchema = new mongoose.Schema({
  jobName: { 
    type: String, 
    required: true, 
    enum: ['MORNING_10AM_COMPLIANCE', 'SHIFT_END_TASK_CLOSURE', 'DAILY_PERFORMANCE_SCORE', 'SLA_ESCALATION_CHECK'],
    index: true 
  },
  date: { type: String, required: true, index: true }, // "YYYY-MM-DD"
  
  workerId: { type: String, default: '' },
  lockedAt: { type: Date },
  heartbeatAt: { type: Date },
  lockExpiresAt: { type: Date }, // 5-minute lease timeout
  attempts: { type: Number, default: 0 },
  
  lastRunStartedAt: { type: Date, required: true },
  lastRunCompletedAt: { type: Date },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'running' },
  
  totalEmployeesEvaluated: { type: Number, default: 0 },
  compliantCount: { type: Number, default: 0 },
  ticketsGeneratedCount: { type: Number, default: 0 },
  jobErrors: [{ message: String, timestamp: { type: Date, default: Date.now } }],
  
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { 
  timestamps: true,
  suppressReservedKeysWarning: true 
});

complianceJobStateSchema.index({ jobName: 1, date: 1 }, { unique: true });
complianceJobStateSchema.index({ status: 1, lockExpiresAt: 1 });

module.exports = mongoose.model('ComplianceJobState', complianceJobStateSchema);
