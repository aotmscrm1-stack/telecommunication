const mongoose = require('mongoose');

const performanceRuleConfigSchema = new mongoose.Schema({
  workspace: { type: String, default: 'default', unique: true },
  timezone: { type: String, default: 'Asia/Kolkata' },
  
  // Checkpoint 1: 10:00 AM Universal Fixed Morning Compliance
  morningComplianceCutoffTime: { type: String, default: '10:00:00' },
  morningCheckEnabled: { type: Boolean, default: true },
  allowManagerAssignedTasksForMorningCompliance: { type: Boolean, default: true },

  // Checkpoint 2: Before Logout Task Closure
  beforeLogoutTaskCheckEnabled: { type: Boolean, default: true },
  requireReasonsForIncompleteTasks: { type: Boolean, default: true },

  // Global 5-Pillar Weights (100% total)
  globalWeights: {
    taskCompletion: { type: Number, default: 0.30 }, // 30%
    productivity: { type: Number, default: 0.25 },   // 25%
    attendance: { type: Number, default: 0.15 },     // 15%
    workQuality: { type: Number, default: 0.20 },    // 20%
    discipline: { type: Number, default: 0.10 }      // 10%
  },

  // Priority SLAs
  escalationSlaHours: {
    critical: { type: Number, default: 24 }, // 24 Hours SLA
    high: { type: Number, default: 48 },     // 48 Hours SLA
    medium: { type: Number, default: 72 },   // 72 Hours SLA
    low: { type: Number, default: 96 }       // 96 Hours SLA
  },

  // Role-Based Escalation Roles
  escalationRecipients: {
    level1Role: { type: String, default: 'manager' },
    level2Role: { type: String, default: 'hr' },
    level3Role: { type: String, default: 'admin' }
  },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('PerformanceRuleConfig', performanceRuleConfigSchema);

