const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  employee_name: { type: String, required: true, trim: true },
  employee_id: { type: String, required: true, trim: true },
  joining_date: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  location: { type: String, default: '' },
  effective_work_days: { type: Number, default: 30 },
  lop: { type: Number, default: 0 },
  bank_name: { type: String, default: '' },
  bank_account_number: { type: String, default: '' },
  pan_number: { type: String, default: '' },
  pf_number: { type: String, default: '' },
  uan_number: { type: String, default: '' },
  payslip_month: { type: String, required: true, trim: true }, // e.g. "March 2026"

  // Calculated Salary Components
  gross_salary: { type: Number, required: true },
  basic_salary: { type: Number, required: true },
  hra: { type: Number, required: true },
  conveyance: { type: Number, default: 2500 },
  medical_allowance: { type: Number, default: 1500 },
  food_allowance: { type: Number, default: 1350 },
  special_allowance: { type: Number, default: 0 },
  incentive: { type: Number, default: 0 },
  total_earnings: { type: Number, required: true },

  // Deductions
  lop_deduction: { type: Number, default: 0 },
  tds: { type: Number, default: 200 },
  total_deductions: { type: Number, default: 200 },

  // Net Pay
  net_salary: { type: Number, required: true },
  net_salary_in_words: { type: String, default: '' },

  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Generated', 'Paid', 'Cancelled'], default: 'Generated' },
}, { timestamps: true });

payslipSchema.index({ employee_id: 1, payslip_month: 1 });
payslipSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payslip', payslipSchema);
