const mongoose = require('mongoose');

// Single field diff record for comprehensive audit history
const fieldDiffSchema = new mongoose.Schema({
  field: { type: String, required: true },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  updatedValue: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// Audit entry recording editor, action, timestamp, and field-level diffs
const auditEntrySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'published', 'archived', 'restored'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  summary: {
    type: String,
    default: ''
  },
  fieldChanges: [fieldDiffSchema]
}, { _id: false });

const recurringMeetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  days: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Daily', 'Every 2 Days', 'Weekly'],
    required: true
  }],
  time: { type: String, default: '', trim: true }, // e.g. "10:30 AM"
  description: { type: String, default: '', trim: true }
}, { _id: true });

const employeeDailyActivityScheduleSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Guarantees strictly 1 schedule document per employee
    index: true
  },
  workingHours: {
    loginTime: { type: String, default: '', trim: true },   // e.g. "09:30 AM"
    logoutTime: { type: String, default: '', trim: true },  // e.g. "06:30 PM"
    note: { type: String, default: '', trim: true }         // e.g. "Online class 08:00 AM - 09:15 AM"
  },
  keyResponsibilities: [{
    type: String,
    trim: true
  }],
  regularActivities: [{
    type: String,
    trim: true
  }],
  weeklyResponsibilities: [{
    type: String,
    trim: true
  }],
  recurringMeetings: [recurringMeetingSchema],
  additionalInformation: {
    type: String,
    default: '',
    trim: true
  },
  publishStatus: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  isHrConfirmed: {
    type: Boolean,
    default: true,
    index: true
  },
  hrConfirmationNote: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditHistory: [auditEntrySchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for high-speed directory queries and status filters
employeeDailyActivityScheduleSchema.index({ publishStatus: 1, isHrConfirmed: 1 });

module.exports = mongoose.model('EmployeeDailyActivitySchedule', employeeDailyActivityScheduleSchema);

