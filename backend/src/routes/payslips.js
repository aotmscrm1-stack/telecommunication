const express = require('express');
const router = express.Router();
const Payslip = require('../models/Payslip');
const { protect } = require('../middleware/auth');
const { numberToWords } = require('../utils/numberToWords');

const MONTH_NAMES_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function cleanPayslipMonth(val) {
  if (!val) return '';
  let str = String(val).trim();
  if (str.includes('T') || str.includes('GMT') || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return `${MONTH_NAMES_LIST[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }
  }
  // Strip any trailing time like 10:00:00 or 12:00 AM
  str = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?/i, '').trim();
  return str;
}

/**
 * Helper to calculate all salary components based on Gross Salary, Work Days, LOP, Incentive, and TDS
 */
function calculateSalaryComponents(grossSalary, effectiveWorkDays = 30, lopDays = 0, customIncentive = 0, customTds = 200) {
  const gross = Math.round(Number(grossSalary) || 0);
  if (gross <= 0) {
    throw new Error('Gross Salary must be greater than 0');
  }

  // Effective Work Days is fixed at 30 days
  const workDays = 30;

  const lop = Number(lopDays) >= 0 ? Number(lopDays) : 0;
  if (lop < 0) {
    throw new Error('LOP days cannot be negative');
  }
  if (lop > workDays) {
    throw new Error(`LOP days (${lop}) cannot be greater than Effective Work Days (${workDays})`);
  }

  const basic = Math.round(gross * 0.40);
  const hra = Math.round(basic * 0.40);
  const conveyance = 2500;
  const medical = 1500;
  const food = 1350;

  const fixedAndBasic = basic + hra + conveyance + medical + food;
  const specialAllowance = gross - fixedAndBasic;

  if (specialAllowance < 0) {
    throw new Error('Gross salary is too low for the standard allowance structure (must be at least ₹12,160)');
  }

  const incentive = Math.max(0, Math.round(Number(customIncentive) || 0));
  const totalEarnings = basic + hra + conveyance + medical + food + specialAllowance + incentive;

  // LOP Deduction: Calculated on standard 30 days basis -> (Gross Salary / 30) * LOP Days
  const perDaySalary = gross / 30;
  const lopDeduction = Math.round(perDaySalary * lop);

  // Professional Tax is fixed at ₹200
  const tds = 200;
  const totalDeductions = lopDeduction + tds;
  const netSalary = totalEarnings - totalDeductions;
  const netSalaryInWords = numberToWords(netSalary);

  return {
    gross_salary: gross,
    basic_salary: basic,
    hra,
    conveyance,
    medical_allowance: medical,
    food_allowance: food,
    special_allowance: specialAllowance,
    incentive,
    total_earnings: totalEarnings,
    effective_work_days: 30,
    lop,
    lop_deduction: lopDeduction,
    tds: 200,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    net_salary_in_words: netSalaryInWords,
  };
}

// ── GET /api/payslips/calculate (Live preview helper) ──────────────────────────
router.post('/calculate', protect, (req, res) => {
  try {
    const { gross_salary, effective_work_days, lop, tds, incentive } = req.body;
    const components = calculateSalaryComponents(gross_salary, effective_work_days, lop, incentive, tds);
    res.json({ ok: true, data: components });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

// ── GET /api/payslips (List with search & pagination) ──────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { search, month, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { employee_name: regex },
        { employee_id: regex },
        { designation: regex },
        { department: regex },
      ];
    }

    if (month && month !== 'all') {
      query.payslip_month = month;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payslips, total] = await Promise.all([
      Payslip.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payslip.countDocuments(query),
    ]);

    res.json({
      payslips,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/payslips/:id (Single payslip) ────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id).populate('createdBy', 'name email');
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    res.json({ payslip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/payslips (Create & save new payslip) ─────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      employee_name,
      employee_id,
      joining_date,
      designation,
      department,
      location,
      effective_work_days = 30,
      lop = 0,
      bank_name,
      bank_account_number,
      pan_number,
      pf_number,
      uan_number,
      payslip_month,
      gross_salary,
      incentive = 0,
      tds = 200,
    } = req.body;

    if (!employee_name?.trim()) {
      return res.status(400).json({ message: 'Employee Name is required' });
    }
    if (!employee_id?.trim()) {
      return res.status(400).json({ message: 'Employee ID / Number is required' });
    }
    if (!joining_date?.trim()) {
      return res.status(400).json({ message: 'Joining Date is required' });
    }
    if (!designation?.trim()) {
      return res.status(400).json({ message: 'Designation is required' });
    }
    if (!department?.trim()) {
      return res.status(400).json({ message: 'Department is required' });
    }
    if (!location?.trim()) {
      return res.status(400).json({ message: 'Location is required' });
    }
    if (lop === undefined || lop === null || lop === '' || Number(lop) < 0) {
      return res.status(400).json({ message: 'LOP (Loss Of Pay Days) cannot be negative' });
    }
    if (Number(lop) > 30) {
      return res.status(400).json({ message: `LOP days (${lop}) cannot be greater than standard Effective Work Days (30)` });
    }
    if (!bank_name?.trim()) {
      return res.status(400).json({ message: 'Bank Name is required' });
    }
    if (!bank_account_number?.trim()) {
      return res.status(400).json({ message: 'Bank Account Number is required' });
    }
    if (!pan_number?.trim()) {
      return res.status(400).json({ message: 'PAN Number is required' });
    }
    if (!pf_number?.trim()) {
      return res.status(400).json({ message: 'PF Number is required' });
    }
    if (!uan_number?.trim()) {
      return res.status(400).json({ message: 'PF UAN Number is required' });
    }
    if (!payslip_month?.trim()) {
      return res.status(400).json({ message: 'Payslip Month is required' });
    }
    if (!gross_salary || Number(gross_salary) <= 0) {
      return res.status(400).json({ message: 'Valid Gross Salary greater than 0 is required' });
    }

    const calculated = calculateSalaryComponents(
      gross_salary,
      Number(effective_work_days),
      Number(lop),
      incentive,
      tds
    );

    const payslip = await Payslip.create({
      employee_name: employee_name.trim(),
      employee_id: employee_id.trim(),
      joining_date: joining_date.trim(),
      designation: designation.trim(),
      department: department.trim(),
      location: location.trim(),
      bank_name: bank_name.trim(),
      bank_account_number: bank_account_number.trim(),
      pan_number: pan_number.trim(),
      pf_number: pf_number.trim(),
      uan_number: uan_number.trim(),
      payslip_month: cleanPayslipMonth(payslip_month),
      ...calculated,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: 'Payslip generated and saved successfully',
      payslip,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/payslips/bulk (Bulk create & save payslips) ──────────────────────
router.post('/bulk', protect, async (req, res) => {
  try {
    const { payslips = [] } = req.body;
    if (!Array.isArray(payslips) || payslips.length === 0) {
      return res.status(400).json({ message: 'No payslip records provided in payload' });
    }

    const createdRecords = [];
    const errors = [];

    for (let i = 0; i < payslips.length; i++) {
      const item = payslips[i];
      const rowNum = i + 1;

      try {
        const {
          employee_name,
          employee_id,
          joining_date = '',
          designation = '',
          department = '',
          location = '',
          effective_work_days = 30,
          lop = 0,
          bank_name = '',
          bank_account_number = '',
          pan_number = '',
          pf_number = '',
          uan_number = '',
          payslip_month,
          gross_salary,
          incentive = 0,
          tds = 200,
        } = item;

        if (!employee_name?.trim()) throw new Error(`Row ${rowNum}: Employee Name is required`);
        if (!employee_id?.trim()) throw new Error(`Row ${rowNum}: Employee ID is required`);
        if (!payslip_month?.trim()) throw new Error(`Row ${rowNum}: Payslip Month is required`);
        if (!gross_salary || Number(gross_salary) <= 0) throw new Error(`Row ${rowNum}: Gross Salary must be greater than 0`);

        const workDays = Number(effective_work_days) > 0 ? Number(effective_work_days) : 30;
        const lopDays = Number(lop) >= 0 ? Number(lop) : 0;
        const incentiveNum = Math.max(0, Math.round(Number(incentive) || 0));
        const tdsNum = Number(tds) >= 0 ? Number(tds) : 200;

        const calculated = calculateSalaryComponents(gross_salary, workDays, lopDays, incentiveNum, tdsNum);

        const doc = await Payslip.create({
          employee_name: employee_name.trim(),
          employee_id: employee_id.trim(),
          joining_date: String(joining_date || '').trim(),
          designation: String(designation || '').trim(),
          department: String(department || '').trim(),
          location: String(location || '').trim(),
          bank_name: String(bank_name || '').trim(),
          bank_account_number: String(bank_account_number || '').trim(),
          pan_number: String(pan_number || '').trim(),
          pf_number: String(pf_number || '').trim(),
          uan_number: String(uan_number || '').trim(),
          payslip_month: cleanPayslipMonth(payslip_month),
          ...calculated,
          createdBy: req.user._id,
        });

        createdRecords.push(doc);
      } catch (rowErr) {
        errors.push({ index: i, error: rowErr.message });
      }
    }

    if (createdRecords.length === 0 && errors.length > 0) {
      return res.status(400).json({
        message: 'Failed to create any payslips due to validation errors',
        errors,
      });
    }

    res.status(201).json({
      message: `Successfully generated and saved ${createdRecords.length} payslip(s)${errors.length > 0 ? ` (${errors.length} skipped)` : ''}`,
      payslips: createdRecords,
      savedCount: createdRecords.length,
      errorsCount: errors.length,
      errors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/payslips/:id (Update payslip) ────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const existing = await Payslip.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Payslip not found' });

    const {
      employee_name,
      employee_id,
      joining_date,
      designation,
      department,
      location,
      effective_work_days,
      lop,
      bank_name,
      bank_account_number,
      pan_number,
      pf_number,
      uan_number,
      payslip_month,
      gross_salary,
      incentive,
      tds,
      status,
    } = req.body;

    const gross = gross_salary !== undefined ? Number(gross_salary) : existing.gross_salary;
    const workDays = effective_work_days !== undefined ? Number(effective_work_days) : existing.effective_work_days;
    const lopDays = lop !== undefined ? Number(lop) : existing.lop;
    const currentIncentive = incentive !== undefined ? Number(incentive) : (existing.incentive || 0);
    const currentTds = tds !== undefined ? Number(tds) : existing.tds;
    const calculated = calculateSalaryComponents(gross, workDays, lopDays, currentIncentive, currentTds);

    existing.employee_name = employee_name?.trim() || existing.employee_name;
    existing.employee_id = employee_id?.trim() || existing.employee_id;
    if (joining_date !== undefined) existing.joining_date = joining_date;
    if (designation !== undefined) existing.designation = designation;
    if (department !== undefined) existing.department = department;
    if (location !== undefined) existing.location = location;
    if (effective_work_days !== undefined) existing.effective_work_days = Number(effective_work_days);
    if (lop !== undefined) existing.lop = Number(lop);
    if (bank_name !== undefined) existing.bank_name = bank_name;
    if (bank_account_number !== undefined) existing.bank_account_number = bank_account_number;
    if (pan_number !== undefined) existing.pan_number = pan_number;
    if (pf_number !== undefined) existing.pf_number = pf_number;
    if (uan_number !== undefined) existing.uan_number = uan_number;
    if (payslip_month !== undefined) existing.payslip_month = cleanPayslipMonth(payslip_month);
    if (status !== undefined) existing.status = status;

    Object.assign(existing, calculated);
    await existing.save();

    res.json({ message: 'Payslip updated successfully', payslip: existing });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE /api/payslips/:id (Delete payslip) ──────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const payslip = await Payslip.findByIdAndDelete(req.params.id);
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    res.json({ message: 'Payslip deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
