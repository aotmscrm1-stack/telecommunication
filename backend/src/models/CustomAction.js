const mongoose = require('mongoose');

const customActionFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  fieldType: { type: String, enum: ['text', 'number', 'date', 'select', 'boolean'], default: 'text' },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
}, { _id: false });

const customActionSchema = new mongoose.Schema({
  workspace: { type: String, default: 'default', index: true },
  icon: { type: String, default: 'activity' },
  name: { type: String, required: true, trim: true },
  score: { type: Number, default: 0 },
  direction: { type: String, default: 'information' },
  description: { type: String, default: '' },
  allowPredefinedActions: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  fields: { type: [customActionFieldSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CustomAction', customActionSchema);