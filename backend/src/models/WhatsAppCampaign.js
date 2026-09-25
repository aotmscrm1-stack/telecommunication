const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  identity: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'invalid', 'delivered', 'read'],
    default: 'pending'
  },
  customData: { type: Map, of: String, default: {} },
  error: { type: String, default: '' },
  sentAt: { type: Date },
}, { _id: true, timestamps: true });

const whatsAppCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'ready', 'sending', 'completed', 'failed', 'cancelled'],
    default: 'ready'
  },
  templateRef: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate', default: null },
  customMessage: { type: String, default: '' },
  tags: [{ type: String, trim: true }],
  totalCount: { type: Number, default: 0 },
  validCount: { type: Number, default: 0 },
  invalidCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  contacts: [contactSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

whatsAppCampaignSchema.index({ createdBy: 1 });
whatsAppCampaignSchema.index({ createdAt: -1 });
whatsAppCampaignSchema.index({ 'contacts.phone': 1 });
whatsAppCampaignSchema.index({ 'contacts.identity': 1 });

module.exports = mongoose.model('WhatsAppCampaign', whatsAppCampaignSchema);
