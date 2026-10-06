const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  color: { type: String, default: '#0284c7' },
  icon: { type: String, default: 'building' },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
