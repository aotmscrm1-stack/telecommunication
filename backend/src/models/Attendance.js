const mongoose = require('mongoose');

const locationSubSchema = new mongoose.Schema(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    road: { type: String, default: '' },
    area: { type: String, default: '' },
    city: { type: String, default: 'Vijayawada' },
    formattedAddress: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeCode: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    date: {
      type: String, // Format: "YYYY-MM-DD" e.g. "2026-09-18"
      required: true,
      index: true,
    },
    day: {
      type: String, // e.g. "Friday", "Monday"
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    formattedDuration: {
      type: String,
      default: '', // e.g. "8h 55m" or "45m"
    },
    status: {
      type: String,
      enum: ['ON_DUTY', 'COMPLETED', 'INCOMPLETE'],
      default: 'ON_DUTY',
      index: true,
    },
    startLocation: {
      type: locationSubSchema,
      default: () => ({}),
    },
    latestLocation: {
      type: locationSubSchema,
      default: () => ({}),
    },
    endLocation: {
      type: locationSubSchema,
      default: () => ({}),
    },
    lastLocationUpdate: {
      type: Date,
      default: Date.now,
    },
    deviceInfo: {
      battery: { type: Number, default: null },
      userAgent: { type: String, default: '' },
      platform: { type: String, default: '' },
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Helper function to format duration in human readable form (e.g. 8h 55m)
attendanceSchema.methods.calculateFormattedDuration = function () {
  const start = new Date(this.startTime).getTime();
  const end = this.endTime ? new Date(this.endTime).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  this.durationSeconds = diffSec;

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  if (hours > 0) {
    this.formattedDuration = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    this.formattedDuration = `${minutes}m`;
  } else {
    this.formattedDuration = `${diffSec}s`;
  }
  return this.formattedDuration;
};

// Compound indexes
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ employeeId: 1, status: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
