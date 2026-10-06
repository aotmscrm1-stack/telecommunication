const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  doc_type: { type: String, default: 'invoice' },
  invoice_number: { type: String, trim: true },
  receipt_number: { type: String, trim: true },
  invoice_date: { type: String, default: '' },
  client_name: { type: String, trim: true },
  student_name: { type: String, trim: true },
  designation: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  mobile_number: { type: String, default: '' },
  address: { type: String, default: '' },
  place: { type: String, default: 'Vijayawada' },
  course_name: { type: String, default: '' },
  
  // Line items & breakdown
  items: { type: Array, default: [] },
  subtotal: { type: Number, default: 0 },
  cgst_rate: { type: Number, default: 9 },
  cgst_amount: { type: Number, default: 0 },
  sgst_rate: { type: Number, default: 9 },
  sgst_amount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  amount_in_words: { type: String, default: '' },
  terms: { type: Array, default: [] },

  // Offer letter specific fields
  offer_date: { type: String, default: '' },
  joining_date: { type: String, default: '' },
  annual_ctc: { type: Number, default: 0 },
  monthly_ctc: { type: Number, default: 0 },
  basic_salary: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  medical_allowance: { type: Number, default: 0 },
  conveyance: { type: Number, default: 0 },
  food_transport_allowance: { type: Number, default: 0 },
  incentive: { type: Number, default: 0 },
  dearness_allowance: { type: Number, default: 0 },
  special_allowance: { type: Number, default: 0 },
  custom_earnings: { type: Array, default: [] },
  esi_employee: { type: Number, default: 0 },
  pf_employee: { type: Number, default: 0 },
  professional_tax: { type: Number, default: 200 },
  tds: { type: Number, default: 0 },
  total_deductions_monthly: { type: Number, default: 200 },
  total_deductions_annual: { type: Number, default: 2400 },
  custom_deductions: { type: Array, default: [] },
  esi_employer: { type: Number, default: 0 },
  pf_employer: { type: Number, default: 0 },
  net_earnings_monthly: { type: Number, default: 0 },
  net_earnings_annual: { type: Number, default: 0 },
  net_earnings_in_words: { type: String, default: '' },

  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Draft', 'Sent', 'Approved', 'Paid'], default: 'Draft' },
}, { timestamps: true, strict: false });

invoiceSchema.index({ invoice_number: 1 });
invoiceSchema.index({ doc_type: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
