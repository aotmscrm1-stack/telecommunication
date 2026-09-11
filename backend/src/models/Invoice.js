const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoice_number: { type: String, required: true, trim: true },
  invoice_date: { type: String, default: '' },
  client_name: { type: String, required: true, trim: true },
  designation: { type: String, default: 'Developer' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  offer_date: { type: String, default: '' },
  joining_date: { type: String, default: '' },
  
  // Financial & Compensation breakdown
  annual_ctc: { type: Number, required: true },
  monthly_ctc: { type: Number, required: true },
  
  basic_salary: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  medical_allowance: { type: Number, default: 0 },
  conveyance: { type: Number, default: 0 },
  food_transport_allowance: { type: Number, default: 0 },
  dearness_allowance: { type: Number, default: 0 },
  special_allowance: { type: Number, default: 0 },
  
  custom_earnings: [{
    name: { type: String, required: true },
    monthly: { type: Number, required: true },
    annual: { type: Number, required: true }
  }],
  
  esi_employee: { type: Number, default: 0 },
  pf_employee: { type: Number, default: 0 },
  professional_tax: { type: Number, default: 200 },
  tds: { type: Number, default: 0 },
  total_deductions_monthly: { type: Number, default: 200 },
  total_deductions_annual: { type: Number, default: 2400 },
  
  custom_deductions: [{
    name: { type: String, required: true },
    monthly: { type: Number, required: true },
    annual: { type: Number, required: true }
  }],
  
  esi_employer: { type: Number, default: 0 },
  pf_employer: { type: Number, default: 0 },
  
  net_earnings_monthly: { type: Number, required: true },
  net_earnings_annual: { type: Number, required: true },
  net_earnings_in_words: { type: String, default: '' },

  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Draft', 'Sent', 'Approved', 'Paid'], default: 'Draft' },
}, { timestamps: true });

invoiceSchema.index({ invoice_number: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
