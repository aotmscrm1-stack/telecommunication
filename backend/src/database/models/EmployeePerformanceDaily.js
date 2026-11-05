const mongoose = require('mongoose');

const employeePerformanceDailySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employeeCode: { type: String, default: '', index: true },
  employeeName: { type: String, default: '' },
  department: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // "YYYY-MM-DD"

  // 5 Pillar Scores (0.00 to 100.00)
  pillarScores: {
    taskCompletion: { type: Number, min: 0, max: 100, default: 0 }, // 30%
    productivity: { type: Number, min: 0, max: 100, default: 0 },   // 25%
    attendance: { type: Number, min: 0, max: 100, default: 0 },     // 15%
    workQuality: { type: Number, min: 0, max: 100, default: 0 },    // 20%
    discipline: { type: Number, min: 0, max: 100, default: 0 }      // 10%
  },

  // Weighted Composite Score (0.00 to 100.00)
  compositeScore: { type: Number, min: 0, max: 100, default: 0, index: true },

  // Deterministic Category: 'GREEN' (85-100) | 'ORANGE' (65-84.99) | 'RED' (<65)
  category: { 
    type: String, 
    enum: ['GREEN', 'ORANGE', 'RED'], 
    default: 'ORANGE',
    index: true 
  },

  // Compliance Flags
  morningCompliance: {
    status: { type: String, enum: ['COMPLIANT', 'ATTENDANCE_VIOLATION', 'TASK_VIOLATION', 'DUAL_VIOLATION', 'EXEMPT'], default: 'COMPLIANT' },
    checkInTime: { type: String, default: '' },
    taskCountUploaded: { type: Number, default: 0 }
  },
  logoutCompliance: {
    status: { type: String, enum: ['COMPLIANT', 'VIOLATION', 'NOT_APPLICABLE'], default: 'NOT_APPLICABLE' },
    unupdatedTasksCount: { type: Number, default: 0 }
  },

  // Manual Review / Override
  isOverridden: { type: Boolean, default: false },
  originalScore: { type: Number },
  overrideReason: { type: String, default: '' },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  overriddenAt: { type: Date }
}, { timestamps: true });

employeePerformanceDailySchema.index({ employee: 1, date: 1 }, { unique: true });
employeePerformanceDailySchema.index({ department: 1, date: -1, compositeScore: -1 });

module.exports = mongoose.model('EmployeePerformanceDaily', employeePerformanceDailySchema);

