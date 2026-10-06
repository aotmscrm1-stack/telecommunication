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

const breakSubSchema = new mongoose.Schema(
  {
    breakNumber: {
      type: Number,
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
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    _id: true,
  }
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
      default: 0, // Total attendance span (End - Start)
    },
    formattedDuration: {
      type: String,
      default: '', // e.g. "8h 55m"
    },
    status: {
      type: String,
      enum: ['ON_DUTY', 'ON_BREAK', 'COMPLETED', 'INCOMPLETE'],
      default: 'ON_DUTY',
      index: true,
    },
    // Breaks list
    breaks: [breakSubSchema],
    breakCount: {
      type: Number,
      default: 0,
    },
    totalBreakSeconds: {
      type: Number,
      default: 0,
    },
    formattedBreakDuration: {
      type: String,
      default: '0m',
    },
    actualWorkSeconds: {
      type: Number,
      default: 0, // Total Attendance - Total Breaks
    },
    formattedActualWork: {
      type: String,
      default: '0m',
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

// Helper function to format seconds into readable text e.g. "8h 15m" or "45s"
function formatSecToText(diffSec) {
  if (diffSec == null || isNaN(diffSec) || diffSec <= 0) return '0m';
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// Recalculates total attendance, total break, and net working duration
attendanceSchema.methods.calculateAttendanceDurations = function (now = new Date()) {
  const start = new Date(this.startTime).getTime();
  const end = this.endTime ? new Date(this.endTime).getTime() : now.getTime();
  const totalAttSec = Math.max(0, Math.floor((end - start) / 1000));
  this.durationSeconds = totalAttSec;
  this.formattedDuration = formatSecToText(totalAttSec);

  let totalBreakSec = 0;
  if (Array.isArray(this.breaks)) {
    this.breaks.forEach((b) => {
      if (b.status === 'COMPLETED' && b.endTime) {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        const bSec = Math.max(0, Math.floor((bEnd - bStart) / 1000));
        b.durationSeconds = bSec;
        b.formattedDuration = formatSecToText(bSec);
        totalBreakSec += bSec;
      } else if (b.status === 'ACTIVE') {
        const bStart = new Date(b.startTime).getTime();
        const bSec = Math.max(0, Math.floor((now.getTime() - bStart) / 1000));
        b.durationSeconds = bSec;
        b.formattedDuration = formatSecToText(bSec);
        totalBreakSec += bSec;
      }
    });
    this.breakCount = this.breaks.length;
  } else {
    this.breakCount = 0;
  }

  this.totalBreakSeconds = totalBreakSec;
  this.formattedBreakDuration = formatSecToText(totalBreakSec);

  const actualWorkSec = Math.max(0, totalAttSec - totalBreakSec);
  this.actualWorkSeconds = actualWorkSec;
  this.formattedActualWork = formatSecToText(actualWorkSec);

  return {
    totalAttendanceSeconds: this.durationSeconds,
    formattedDuration: this.formattedDuration,
    totalBreakSeconds: this.totalBreakSeconds,
    formattedBreakDuration: this.formattedBreakDuration,
    actualWorkSeconds: this.actualWorkSeconds,
    formattedActualWork: this.formattedActualWork,
  };
};

// Compound indexes
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ employeeId: 1, status: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
