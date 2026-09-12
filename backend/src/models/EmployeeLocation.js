const mongoose = require('mongoose');

const employeeLocationSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      default: 0, // In meters
    },
    speed: {
      type: Number,
      default: 0, // In km/h (or m/s converted to km/h)
    },
    heading: {
      type: Number,
      default: 0, // Degrees 0-360
    },
    battery: {
      type: Number,
      default: null, // Battery level percentage (0-100) if available
    },
    trackingStatus: {
      type: String,
      enum: ['AT_OFFICE', 'LEAVING_OFFICE', 'ARRIVING_AT_OFFICE', 'MOVING', 'STOPPED', 'OFFLINE'],
      default: 'STOPPED',
      index: true,
    },
    road: {
      type: String,
      default: '',
    },
    area: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    formattedAddress: {
      type: String,
      default: '',
    },
    officeDistanceMeters: {
      type: Number,
      default: null,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
    sinceOfficeAt: {
      type: Date,
      default: null,
    },
    isLive: {
      type: Boolean,
      default: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal real-time queries & history playback
employeeLocationSchema.index({ employeeId: 1, timestamp: -1 });
employeeLocationSchema.index({ employeeId: 1, isLive: 1 });
employeeLocationSchema.index({ employeeId: 1, trackingStatus: 1 });

module.exports = mongoose.model('EmployeeLocation', employeeLocationSchema);
