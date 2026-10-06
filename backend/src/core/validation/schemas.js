const { z } = require('zod');

// Authentication Schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['admin', 'manager', 'employee', 'caller']).optional(),
  phone: z.string().optional(),
});

// Lead Schemas
const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.enum(['Fresh', 'Contacted', 'Interested', 'Closed', 'Blocked']).optional(),
  source: z.string().optional(),
  assignedTo: z.string().optional(),
});

// Task Schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
  createLeadSchema,
  createTaskSchema,
  z,
};
