const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
}, { timestamps: true });

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

const todoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  type: { type: String, enum: ['personal', 'assigned'], default: 'personal' },
  
  // System-controlled references
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, default: '' },
  departmentId: { type: mongoose.Schema.Types.Mixed, ref: 'Department' },

  // Priorities: low, medium, high, urgent
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  
  // Statuses: pending, in_progress, completed, cancelled
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },

  startDate: { type: Date },
  dueDate: { type: Date, required: true },
  completedAt: { type: Date },

  checklist: [checklistItemSchema],
  comments: [commentSchema],
  attachments: [attachmentSchema],
  activityHistory: [activityLogSchema],

  reminderNotifiedAt: { type: Date },
  overdueNotifiedAt: { type: Date },
}, { timestamps: true });

// Virtual for calculating Overdue state
todoSchema.virtual('isOverdue').get(function () {
  if (this.status === 'completed' || this.status === 'cancelled') return false;
  if (!this.dueDate) return false;
  return new Date() > new Date(this.dueDate);
});

todoSchema.set('toJSON', { virtuals: true });
todoSchema.set('toObject', { virtuals: true });

// Indexes for query performance
todoSchema.index({ assignedTo: 1, status: 1 });
todoSchema.index({ createdBy: 1 });
todoSchema.index({ department: 1 });
todoSchema.index({ dueDate: 1 });
todoSchema.index({ priority: 1 });

module.exports = mongoose.model('Todo', todoSchema);
