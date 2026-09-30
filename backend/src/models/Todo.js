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
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  title: { type: String, default: '', trim: true },
  note: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  type: { type: String, default: 'todo' },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
  department: { type: String, default: '' },
  departmentId: { type: mongoose.Schema.Types.Mixed, ref: 'Department' },

  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['upcoming', 'done', 'late', 'cancelled', 'pending', 'in_progress', 'completed'], default: 'upcoming' },

  scheduledAt: { type: Date },
  dueDate: { type: Date },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  checklist: [checklistItemSchema],
  comments: [commentSchema],
  attachments: [attachmentSchema],
  activityHistory: [activityLogSchema],

  recurrence: {
    frequency: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    endDate: { type: Date },
  },
  recurringGroupId: { type: mongoose.Schema.Types.ObjectId },
  reminderNotifiedAt: { type: Date },
  overdueNotifiedAt: { type: Date },
  reminderMinutesBefore: { type: Number, default: 30 },
}, { timestamps: true });

todoSchema.virtual('isOverdue').get(function () {
  if (this.status === 'completed' || this.status === 'done' || this.status === 'cancelled') return false;
  const targetDate = this.scheduledAt || this.dueDate;
  if (!targetDate) return false;
  return new Date() > new Date(targetDate);
});

todoSchema.set('toJSON', { virtuals: true });
todoSchema.set('toObject', { virtuals: true });

todoSchema.index({ assignedTo: 1, status: 1 });
todoSchema.index({ scheduledAt: 1 });
todoSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Todo', todoSchema, 'todos');
