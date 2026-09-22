const mongoose = require('mongoose');

const replySubSchema = new mongoose.Schema({
  senderEmail: { type: String, default: '' },
  senderName: { type: String, default: '' },
  recipientEmail: { type: String, default: '' },
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  direction: { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
  receivedAt: { type: Date, default: Date.now },
  source: { type: String, default: 'n8n_webhook' },
  n8nDetails: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: true });

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
  status: { type: String, enum: ['Delivered', 'Sent', 'Failed', 'Received'], default: 'Delivered' },
  errorMessage: { type: String, default: '' },
  isLeaveRequest: { type: Boolean, default: false },
  trackedByMD: { type: Boolean, default: true },
  direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
  isReply: { type: Boolean, default: false },
  parentEmail: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailLog', default: null },
  replies: [replySubSchema],
  isRead: { type: Boolean, default: true },
  n8nDetails: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

emailLogSchema.index({ sender: 1, createdAt: -1 });
emailLogSchema.index({ recipientEmail: 1, createdAt: -1 });
emailLogSchema.index({ fromEmail: 1, createdAt: -1 });
emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ direction: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
