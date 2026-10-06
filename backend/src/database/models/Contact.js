const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  identity: { type: String, default: 'SAP FICO', trim: true },
  segment: { type: String, default: 'New', trim: true },
  source: { type: String, default: 'manual', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

contactSchema.index({ phone: 1 });
contactSchema.index({ identity: 1 });
contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
