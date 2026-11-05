const mongoose = require('mongoose');

const ticketResponseSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String, required: true },
  message: { type: String, required: true, trim: true },
  attachments: [{ name: String, url: String }],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const timelineEventSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const performanceTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  incidentHash: { type: String, required: true, unique: true, index: true },

  // DATABASE-LEVEL GUARANTEED DEDUPLICATION KEYS
  // Formatted: "<employeeId>_<incidentDate>"
  morningComplianceKey: { type: String, unique: true, sparse: true, index: true },
  // Formatted: "<employeeId>_<attendanceSessionId>"
  shiftComplianceKey: { type: String, unique: true, sparse: true, index: true },
  shiftIdentifier: { type: String, default: '' },

  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employeeCode: { type: String, default: '', index: true },
  employeeName: { type: String, default: '' },
  department: { type: String, required: true, index: true },

  checkpoint: { 
    type: String, 
    enum: ['CHECKPOINT_1_MORNING_10AM', 'CHECKPOINT_2_BEFORE_LOGOUT', 'PERFORMANCE_GOVERNANCE'],
    required: true,
    index: true
  },

  triggerType: { 
    type: String, 
    enum: [
      'ATTENDANCE_NON_COMPLIANCE',          // Morning Checkpoint: Attendance missing
      'DAILY_TASK_SUBMISSION_MISSING',       // Morning Checkpoint: Tasks missing
      'MORNING_COMPLIANCE_DUAL_VIOLATION',   // Morning Checkpoint: Both missing
      'SHIFT_TASK_UPDATE_MISSING',          // Logout Checkpoint: Tasks not updated
      'TASK_OVERDUE', 
      'POOR_PERFORMANCE_DAILY', 
      'REPEATED_LATE_LOGIN', 
      'MISSED_DAILY_REPORT',
      'MANUAL_HR_DISCIPLINARY'
    ], 
    required: true,
    index: true
  },
  
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  status: { 
    type: String, 
    enum: ['open', 'under_review', 'employee_response_pending', 'action_required', 'resolved', 'closed', 'reopened'], 
    default: 'open',
    index: true 
  },

  incidentDate: { type: String, required: true, index: true }, // "YYYY-MM-DD"
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  missingRequirement: { type: String, default: '' },
  
  // Late Correction Tracking
  isCorrectedLater: { type: Boolean, default: false },
  correctedAt: { type: Date },
  correctionDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

  relatedAttendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  relatedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Todo' }],
  evidenceSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Dispute & Resolution
  responses: [ticketResponseSchema],
  employeeExplanation: { type: String, default: '' },
  isDisputed: { type: Boolean, default: false },
  assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolutionNotes: { type: String, default: '' },
  correctiveActionPlan: { type: String, default: '' },

  escalationLevel: { type: Number, default: 1 },
  escalatedAt: { type: Date },
  currentEscalationRole: { type: String, default: 'manager' },

  timeline: [timelineEventSchema]
}, { timestamps: true });

performanceTicketSchema.index({ employee: 1, incidentDate: 1 });
performanceTicketSchema.index({ priority: 1, status: 1 });
performanceTicketSchema.index({ checkpoint: 1, incidentDate: 1 });

module.exports = mongoose.model('PerformanceTicket', performanceTicketSchema);

