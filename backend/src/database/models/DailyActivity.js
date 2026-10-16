const mongoose = require('mongoose');

const outcomeSubSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    leadName: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'Interested',
        'Follow-up Required',
        'Not Interested',
        'No Answer',
        'Wrong Number',
        'Converted',
        'Call Back Requested',
        'Other',
      ],
      default: 'Interested',
    },
    followUpAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

const revisionSubSchema = new mongoose.Schema(
  {
    editedAt: {
      type: Date,
      default: Date.now,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changesSummary: {
      type: String,
      default: '',
      trim: true,
    },
    previousStatus: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const dailyActivitySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    activityDate: {
      type: String, // Format: "YYYY-MM-DD" e.g. "2026-10-16"
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed', 'needs_correction'],
      default: 'draft',
      index: true,
    },

    // Calling Performance Metrics (Telecalling)
    metrics: {
      callsAttempted: { type: Number, min: 0, default: 0 },
      connectedCalls: { type: Number, min: 0, default: 0 },
      unansweredCalls: { type: Number, min: 0, default: 0 },
      interestedLeads: { type: Number, min: 0, default: 0 },
      followUpsScheduled: { type: Number, min: 0, default: 0 },
      conversions: { type: Number, min: 0, default: 0 },
    },

    // Lead call outcomes & next follow-ups (Telecalling)
    outcomes: [outcomeSubSchema],

    // Flexible payload for Developer, Management, Trainer departments
    departmentData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    nextSteps: {
      type: String,
      default: '',
      trim: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    correctionReason: {
      type: String,
      default: '',
      trim: true,
    },

    revisions: [revisionSubSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual relationship for employee
dailyActivitySchema.virtual('employee', {
  ref: 'User',
  localField: 'employeeId',
  foreignField: '_id',
  justOne: true,
});

// Compound unique index: Enforces exactly one daily activity report per employee per date
dailyActivitySchema.index({ employeeId: 1, activityDate: 1 }, { unique: true });

// Admin & Overview query index
dailyActivitySchema.index({ department: 1, activityDate: -1, status: 1 });

module.exports = mongoose.model('DailyActivity', dailyActivitySchema);
