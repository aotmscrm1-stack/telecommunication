const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  lead: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lead'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
  scheduledAt: { type: Date, required: true },
  initialScheduledAt: { type: Date },
  completedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['upcoming', 'done', 'late', 'cancelled'], default: 'upcoming' },
  type: { type: String, default: 'task' },
  note: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  department: { type: String, default: '' },
  departmentId: { type: mongoose.Schema.Types.Mixed, ref: 'Department' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checklist: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  }],
  overdueNotifiedAt: { type: Date },

  recurrence: {
    frequency: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    endDate: { type: Date },
  },
  recurringGroupId: { type: mongoose.Schema.Types.ObjectId },
  reminderNotifiedAt: { type: Date },
  reminderMinutesBefore: { type: Number, default: 30 },
}, { timestamps: true });

taskSchema.index({ scheduledAt: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema, 'tasks');
