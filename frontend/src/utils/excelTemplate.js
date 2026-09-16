import * as XLSX from 'xlsx';
import { numberToWords } from './numberToWords';

/**
 * Single source of truth for Excel column definitions matching the AOTMS Payslip Module form.
 */
export const PAYSLIP_EXCEL_COLUMNS = [
  { key: 'employee_name', header: 'Employee Name *', required: true, width: 22, example: 'John Doe', description: 'Full name of the employee' },
  { key: 'employee_id', header: 'Employee ID *', required: true, width: 16, example: 'EMP001', description: 'Unique employee ID / code' },
  { key: 'joining_date', header: 'Joining Date *', required: true, width: 16, example: '15-01-2024', description: 'Date of joining (DD-MM-YYYY or YYYY-MM-DD)' },
  { key: 'designation', header: 'Designation *', required: true, width: 22, example: 'Software Engineer', description: 'Employee official job designation' },
  { key: 'department', header: 'Department *', required: true, width: 18, example: 'Engineering', description: 'Department name (e.g. Engineering, Sales, HR)' },
  { key: 'location', header: 'Location *', required: true, width: 16, example: 'Vijayawada', description: 'Work location / office' },
  { key: 'effective_work_days', header: 'Effective Work Days *', required: true, width: 20, example: 30, description: 'Total working days in month (default: 30)' },
  { key: 'lop', header: 'LOP Days', required: false, width: 14, example: 0, description: 'Loss of Pay / unpaid leave days (default: 0)' },
  { key: 'bank_name', header: 'Bank Name *', required: true, width: 20, example: 'HDFC Bank', description: 'Bank name for salary deposit' },
  { key: 'bank_account_number', header: 'Bank Account Number *', required: true, width: 24, example: '50100456789012', description: 'Bank account number' },
  { key: 'pan_number', header: 'PAN Number *', required: true, width: 16, example: 'ABCDE1234F', description: '10-character PAN number' },
  { key: 'pf_number', header: 'PF Number *', required: true, width: 22, example: 'AP/HYD/12345/678', description: 'Provident Fund account number' },
  { key: 'uan_number', header: 'PF UAN *', required: true, width: 18, example: '101234567890', description: '12-digit Universal Account Number' },
  { key: 'payslip_month', header: 'Payslip Month *', required: true, width: 20, example: 'September 2026', description: 'Month & Year (e.g. "September 2026")' },
  { key: 'gross_salary', header: 'Gross Salary *', required: true, width: 16, example: 35000, description: 'Monthly Gross CTC in INR (Min ₹12,160)' },
  { key: 'incentive', header: 'Incentive', required: false, width: 14, example: 2000, description: 'Performance incentive / bonus in INR (default: 0)' },
  { key: 'tds', header: 'Professional Tax / TDS', required: false, width: 22, example: 200, description: 'Professional Tax deduction in INR (default: 200)' },
];

/**
 * Calculates all statutory salary components consistently with backend and live preview.
 */
export function calculateSalaryComponents(grossSalary, effectiveWorkDays = 30, lopDays = 0, customIncentive = 0, customTds = 200) {
  const gross = Math.round(Number(grossSalary) || 0);
  const workDays = Number(effectiveWorkDays) > 0 ? Number(effectiveWorkDays) : 30;
  const lop = Number(lopDays) >= 0 ? Number(lopDays) : 0;

  const basic = Math.round(gross * 0.40);
  const hra = Math.round(basic * 0.40);
  const conveyance = gross > 0 ? 2500 : 0;
  const medical = gross > 0 ? 1500 : 0;
  const food = gross > 0 ? 1350 : 0;
  const fixedAndBasic = basic + hra + conveyance + medical + food;
  const specialAllowance = gross > 0 ? gross - fixedAndBasic : 0;

  const incentive = Math.max(0, Math.round(Number(customIncentive) || 0));
  const totalEarnings = gross > 0 ? basic + hra + conveyance + medical + food + specialAllowance + incentive : 0;

  // LOP Deduction: Calculated on standard 30 days basis -> (Gross Salary / 30) * LOP Days
  const perDaySalary = gross > 0 ? gross / 30 : 0;
  const lopDeduction = gross > 0 && lop > 0 ? Math.round(perDaySalary * lop) : 0;
  const tds = Number(customTds) >= 0 ? Number(customTds) : 200;
  const totalDeductions = gross > 0 ? lopDeduction + tds : 0;
  const netSalary = gross > 0 ? totalEarnings - totalDeductions : 0;
  const netSalaryInWords = netSalary > 0 ? numberToWords(netSalary) : '';

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
    effective_work_days: workDays,
    lop,
    lop_deduction: lopDeduction,
    tds,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    net_salary_in_words: netSalaryInWords,
  };
}

/**
 * Generates and triggers download of a clean, structured Excel Template (.xlsx).
 */
export function generatePayslipExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // ── Sheet: Payslip Data (Single sheet with 1 sample row) ───────────────────
  const headers = PAYSLIP_EXCEL_COLUMNS.map((c) => c.header);
  const sampleRow1 = PAYSLIP_EXCEL_COLUMNS.map((c) => c.example);

  const wsData = [headers, sampleRow1];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = PAYSLIP_EXCEL_COLUMNS.map((c) => ({ wch: c.width }));

  XLSX.utils.book_append_sheet(wb, ws, 'Payslip Data');

  // Trigger file download
  XLSX.writeFile(wb, 'AOTMS_Payslip_Bulk_Template.xlsx');
}

/**
 * Normalizes header string for flexible matching across minor casing/whitespace differences.
 */
function normalizeHeader(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Map raw header names to canonical field keys.
 */
const HEADER_KEY_MAP = {
  employeename: 'employee_name',
  name: 'employee_name',
  fullname: 'employee_name',
  empname: 'employee_name',
  employeeid: 'employee_id',
  empid: 'employee_id',
  employeeno: 'employee_id',
  empno: 'employee_id',
  joiningdate: 'joining_date',
  doj: 'joining_date',
  dateofjoining: 'joining_date',
  designation: 'designation',
  role: 'designation',
  jobtitle: 'designation',
  department: 'department',
  dept: 'department',
  location: 'location',
  city: 'location',
  worklocation: 'location',
  effectiveworkdays: 'effective_work_days',
  workdays: 'effective_work_days',
  totaldays: 'effective_work_days',
  lop: 'lop',
  lopdays: 'lop',
  lossofpay: 'lop',
  bankname: 'bank_name',
  bank: 'bank_name',
  bankaccountnumber: 'bank_account_number',
  bankaccountno: 'bank_account_number',
  accountnumber: 'bank_account_number',
  accountno: 'bank_account_number',
  pannumber: 'pan_number',
  panno: 'pan_number',
  pan: 'pan_number',
  pfnumber: 'pf_number',
  pfno: 'pf_number',
  pf: 'pf_number',
  pfuan: 'uan_number',
  uannumber: 'uan_number',
  uan: 'uan_number',
  payslipmonth: 'payslip_month',
  month: 'payslip_month',
  salarymonth: 'payslip_month',
  grosssalary: 'gross_salary',
  gross: 'gross_salary',
  grossctc: 'gross_salary',
  monthlygross: 'gross_salary',
  incentive: 'incentive',
  bonus: 'incentive',
  professionaltaxtds: 'tds',
  professionaltax: 'tds',
  proftax: 'tds',
  tds: 'tds',
  tax: 'tds',
};

const MONTH_NAMES_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats date values from Excel (including Excel serial date numbers or Date objects).
 */
function formatExcelDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}-${m}-${y}`;
  }
  // If Excel number serial (e.g. 45300)
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const d = String(jsDate.getUTCDate()).padStart(2, '0');
      const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
      const y = jsDate.getUTCFullYear();
      return `${d}-${m}-${y}`;
    }
  }
  return String(val).trim();
}

/**
 * Formats month values from Excel cleanly as "Month Year" without any time component.
 */
export function formatExcelMonth(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const m = MONTH_NAMES_LIST[val.getMonth()] || MONTH_NAMES_LIST[val.getUTCMonth()];
      const y = val.getFullYear() || val.getUTCFullYear();
      return `${m} ${y}`;
    }
  }
  // If Excel number serial
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const m = MONTH_NAMES_LIST[jsDate.getUTCMonth()];
      const y = jsDate.getUTCFullYear();
      return `${m} ${y}`;
    }
  }
  let str = String(val).trim();
  if (str.includes('T') || str.includes('GMT') || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return `${MONTH_NAMES_LIST[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }
  }
  // Clean any time string like "09:30:00" or "10:00 AM"
  str = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?/i, '').trim();
  return str;
}

/**
 * Parses and validates an uploaded Excel file client-side.
 */
export async function parseAndValidatePayslipExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Find the 'Payslip Data' sheet or use first sheet
        const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('payslip') || s.toLowerCase().includes('data')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error('No valid sheet found in uploaded Excel file');
        }

        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rawRows || rawRows.length < 2) {
          throw new Error('Uploaded Excel file contains no data rows');
        }

        // Identify header row (first non-empty row)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
          const nonEmptyCells = (rawRows[i] || []).filter((c) => String(c).trim() !== '').length;
          if (nonEmptyCells >= 3) {
            headerRowIndex = i;
            break;
          }
        }

        const rawHeaders = rawRows[headerRowIndex] || [];
        const headerMap = {};
        rawHeaders.forEach((h, colIdx) => {
          const norm = normalizeHeader(h);
          const key = HEADER_KEY_MAP[norm];
          if (key) {
            headerMap[colIdx] = key;
          }
        });

        // Ensure key mandatory headers exist
        const mappedKeys = Object.values(headerMap);
        const essentialFields = ['employee_name', 'employee_id', 'gross_salary'];
        const missingEssentials = essentialFields.filter((f) => !mappedKeys.includes(f));
        if (missingEssentials.length > 0) {
          throw new Error(`Missing essential columns in Excel: ${missingEssentials.join(', ')}. Please use the downloadable template.`);
        }

        const allRows = [];
        const validRows = [];
        const invalidRows = [];
        const seenKeys = new Set();
        let duplicateCount = 0;

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const rowData = rawRows[r] || [];
          const isRowEmpty = !rowData.some((c) => String(c).trim() !== '');
          if (isRowEmpty) continue; // skip blank row

          const rowObj = {
            employee_name: '',
            employee_id: '',
            joining_date: '',
            designation: '',
            department: '',
            location: '',
            effective_work_days: 30,
            lop: 0,
            bank_name: '',
            bank_account_number: '',
            pan_number: '',
            pf_number: '',
            uan_number: '',
            payslip_month: '',
            gross_salary: '',
            incentive: 0,
            tds: 200,
          };

          // Populate mapped fields
          Object.keys(headerMap).forEach((colIdx) => {
            const fieldKey = headerMap[colIdx];
            const rawVal = rowData[colIdx];
            if (fieldKey === 'joining_date') {
              rowObj[fieldKey] = formatExcelDate(rawVal);
            } else if (fieldKey === 'payslip_month') {
              rowObj[fieldKey] = formatExcelMonth(rawVal);
            } else if (['effective_work_days', 'lop', 'gross_salary', 'incentive', 'tds'].includes(fieldKey)) {
              const num = Number(String(rawVal).replace(/[^0-9.-]/g, ''));
              rowObj[fieldKey] = isNaN(num) ? (fieldKey === 'effective_work_days' ? 30 : 0) : num;
            } else {
              rowObj[fieldKey] = String(rawVal !== undefined && rawVal !== null ? rawVal : '').trim();
            }
          });

          // Row validation errors
          const errors = [];
          const rowNumber = r + 1;

          if (!rowObj.employee_name) errors.push('Employee Name is required');
          if (!rowObj.employee_id) errors.push('Employee ID is required');
          if (!rowObj.joining_date) errors.push('Joining Date is required');
          if (!rowObj.designation) errors.push('Designation is required');
          if (!rowObj.department) errors.push('Department is required');
          if (!rowObj.location) errors.push('Location is required');
          if (!rowObj.bank_name) errors.push('Bank Name is required');
          if (!rowObj.bank_account_number) errors.push('Bank Account Number is required');
          if (!rowObj.pan_number) errors.push('PAN Number is required');
          if (!rowObj.pf_number) errors.push('PF Number is required');
          if (!rowObj.uan_number) errors.push('PF UAN is required');
          if (!rowObj.payslip_month) errors.push('Payslip Month is required');

          const gross = Number(rowObj.gross_salary);
          if (!gross || gross <= 0) {
            errors.push('Gross Salary must be greater than 0');
          } else if (gross < 12160) {
            errors.push('Gross Salary must be at least ₹12,160 for standard allowances');
          }

          const workDays = Number(rowObj.effective_work_days);
          if (isNaN(workDays) || workDays <= 0) {
            errors.push('Effective Work Days must be > 0');
          }

          const lop = Number(rowObj.lop);
          if (isNaN(lop) || lop < 0) {
            errors.push('LOP cannot be negative');
          } else if (lop > workDays) {
            errors.push(`LOP (${lop}) exceeds Effective Work Days (${workDays})`);
          }

          // Duplicate detection in same file
          const uniqueKey = `${String(rowObj.employee_id).toLowerCase()}_${String(rowObj.payslip_month).toLowerCase()}`;
          let isDuplicate = false;
          if (rowObj.employee_id && rowObj.payslip_month) {
            if (seenKeys.has(uniqueKey)) {
              isDuplicate = true;
              duplicateCount++;
              errors.push(`Duplicate entry for Employee ID "${rowObj.employee_id}" in month "${rowObj.payslip_month}"`);
            } else {
              seenKeys.add(uniqueKey);
            }
          }

          const calculated = calculateSalaryComponents(
            rowObj.gross_salary,
            rowObj.effective_work_days,
            rowObj.lop,
            rowObj.incentive,
            rowObj.tds
          );

          const isValid = errors.length === 0;

          const processedRow = {
            rowNumber,
            isValid,
            isDuplicate,
            errors,
            data: rowObj,
            calculated,
          };

          allRows.push(processedRow);
          if (isValid) {
            validRows.push({
              ...rowObj,
              ...calculated,
            });
          } else {
            invalidRows.push({
              rowNumber,
              data: rowObj,
              errors,
            });
          }
        }

        resolve({
          totalRows: allRows.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
          duplicateCount,
          validRows,
          invalidRows,
          allRows,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read the Excel file'));
    reader.readAsArrayBuffer(file);
  });
}
