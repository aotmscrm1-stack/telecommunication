const mongoose = require('mongoose');

/**
 * DemoBooking
 * Public "Book a Free Demo" requests captured from the marketing landing page.
 * Every field below is mandatory — the form does not accept partial submissions.
 */
const demoBookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [120, 'Name must be under 120 characters'],
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
    validate: {
      validator: (v) => /^[6-9]\d{9}$/.test(String(v || '')),
      message: 'Mobile number must be a valid 10-digit Indian mobile number',
    },
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Preferred schedule date and time is required'],
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [5, 'Message must be at least 5 characters'],
    maxlength: [1000, 'Message must be under 1000 characters'],
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'scheduled', 'completed', 'cancelled'],
    default: 'new',
  },
  source: { type: String, default: 'landing-page', trim: true },
  notes: { type: String, default: '', trim: true, maxlength: 2000 },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handledAt: { type: Date, default: null },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

demoBookingSchema.index({ createdAt: -1 });
demoBookingSchema.index({ scheduledAt: 1 });
demoBookingSchema.index({ mobile: 1 });
demoBookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DemoBooking', demoBookingSchema);
