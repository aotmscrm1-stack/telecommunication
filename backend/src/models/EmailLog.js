const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String, default: '' },
  senderEmail: { type: String, default: '' },
  senderDesignation: { type: String, default: '' },
  fromEmail: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  templateId: { type: String, default: 'custom' },
  sentVia: { type: String, default: 'Direct Delivery Service' },
  status: { type: String, enum: ['Delivered', 'Sent', 'Failed'], default: 'Delivered' },
  errorMessage: { type: String, default: '' },
  isLeaveRequest: { type: Boolean, default: false },
  trackedByMD: { type: Boolean, default: true },
  n8nDetails: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

emailLogSchema.index({ sender: 1, createdAt: -1 });
emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
