import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Calendar,
  Building2,
  User,
  CreditCard,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  X,
  Clock,
} from 'lucide-react';
import { payslipsAPI } from '../services/api';
import { numberToWords } from '../utils/numberToWords';
import PayslipDocument from '../components/payslip/PayslipDocument';

// Month options generator (e.g. "January 2026", "February 2026", "March 2026", etc.)
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDefaultMonth() {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

const INITIAL_FORM = {
  employee_name: '',
  employee_id: '',
  joining_date: '',
  designation: '',
  department: '',
  location: '',
  effective_work_days: '',
  lop: '',
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

function formatPayslipFilename(employeeName, payslipMonth) {
  const cleanName = (employeeName || 'Employee').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const cleanMonth = (payslipMonth || 'Month').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `AOTMS_Payslip_${cleanName}_${cleanMonth}.pdf`;
}

export default function Payslip() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeExportSlip, setActiveExportSlip] = useState(null);

  const printRef = useRef(null);

  // ── Real-time Salary Calculation ──────────────────────────────────────────
  const grossNum = Math.round(Number(form.gross_salary) || 0);
  const basicSalary = Math.round(grossNum * 0.40);
  const hra = Math.round(basicSalary * 0.40);
  const conveyance = 2500;
  const medicalAllowance = 1500;
  const foodAllowance = 1350;
  const fixedSum = basicSalary + hra + conveyance + medicalAllowance + foodAllowance;
  const specialAllowance = grossNum > 0 ? grossNum - fixedSum : 0;
  const incentive = Math.max(0, Math.round(Number(form.incentive) || 0));
  const totalEarnings = grossNum > 0 ? basicSalary + hra + conveyance + medicalAllowance + foodAllowance + specialAllowance + incentive : 0;

  const workDaysNum = Number(form.effective_work_days) > 0 ? Number(form.effective_work_days) : 30;
  const lopDaysNum = Number(form.lop) >= 0 ? Number(form.lop) : 0;
  const perDaySalary = grossNum > 0 && workDaysNum > 0 ? grossNum / workDaysNum : 0;
  const lopDeduction = grossNum > 0 && lopDaysNum > 0 ? Math.round(perDaySalary * lopDaysNum) : 0;

  const tds = Number(form.tds) >= 0 ? Number(form.tds) : 200;
  const totalDeductions = grossNum > 0 ? lopDeduction + tds : 0;
  const netSalary = grossNum > 0 ? totalEarnings - totalDeductions : 0;
  const netInWords = netSalary > 0 ? numberToWords(netSalary) : '';

  // Live draft payslip object connected to form inputs
  const draftPayslip = {
    employee_name: form.employee_name,
    employee_id: form.employee_id,
    joining_date: form.joining_date,
    designation: form.designation,
    department: form.department,
    location: form.location,
    effective_work_days: form.effective_work_days,
    lop: form.lop,
    bank_name: form.bank_name,
    bank_account_number: form.bank_account_number,
    pan_number: form.pan_number,
    pf_number: form.pf_number,
    uan_number: form.uan_number,
    payslip_month: form.payslip_month,
    gross_salary: grossNum,
    basic_salary: basicSalary,
    hra: hra,
    conveyance: grossNum > 0 ? conveyance : 0,
    medical_allowance: grossNum > 0 ? medicalAllowance : 0,
    food_allowance: grossNum > 0 ? foodAllowance : 0,
    special_allowance: specialAllowance,
    incentive: incentive,
    total_earnings: totalEarnings,
    lop_deduction: lopDeduction,
    tds: tds,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    net_salary_in_words: netInWords,
  };

  // ── Fetch History ─────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await payslipsAPI.getAll({
        search: search.trim() || undefined,
        month: monthFilter !== 'all' ? monthFilter : undefined,
        limit: 100,
      });
      setHistory(res.data?.payslips || []);
    } catch (err) {
      console.error('Failed to load payslip history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, monthFilter]);

  // ── PDF Export Helper ────────────────────────────────────────────────────
  const triggerPdfDownload = async (slip) => {
    if (!slip) return;
    setActiveExportSlip(slip);
    // Allow React state to render the export DOM node
    await new Promise((resolve) => setTimeout(resolve, 200));

    const element = document.getElementById('payslip-direct-export-node');
    const filename = formatPayslipFilename(slip.employee_name, slip.payslip_month);

    try {
      const html2pdfModule = (await import('html2pdf.js')).default;
      if (html2pdfModule && element) {
        const opt = {
          margin: [8, 8, 8, 8],
          filename,
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollY: 0,
            scrollX: 0,
            windowWidth: 780,
            logging: false,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };
        await html2pdfModule().set(opt).from(element).save();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      throw err;
    }
  };

  // ── Handle Download Payslip (Save to DB & Download PDF) ───────────────────
  const handleDownloadPayslip = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Strict validation for all required fields
    if (!form.employee_name?.trim()) {
      setErrorMessage('Please enter Employee Name');
      return;
    }
    if (!form.employee_id?.trim()) {
      setErrorMessage('Please enter Employee ID / Number');
      return;
    }
    if (!form.joining_date?.trim()) {
      setErrorMessage('Please enter Joining Date');
      return;
    }
    if (!form.designation?.trim()) {
      setErrorMessage('Please enter Designation');
      return;
    }
    if (!form.department?.trim()) {
      setErrorMessage('Please enter Department');
      return;
    }
    if (!form.location?.trim()) {
      setErrorMessage('Please enter Location');
      return;
    }
    if (form.effective_work_days === '' || form.effective_work_days === null || form.effective_work_days === undefined || Number(form.effective_work_days) <= 0) {
      setErrorMessage('Effective Work Days must be greater than 0');
      return;
    }
    if (form.lop === '' || form.lop === null || form.lop === undefined || Number(form.lop) < 0) {
      setErrorMessage('LOP (Loss Of Pay Days) cannot be negative');
      return;
    }
    if (Number(form.lop) > Number(form.effective_work_days)) {
      setErrorMessage(`LOP days (${form.lop}) cannot be greater than Effective Work Days (${form.effective_work_days})`);
      return;
    }
    if (!form.bank_name?.trim()) {
      setErrorMessage('Please enter Bank Name');
      return;
    }
    if (!form.bank_account_number?.trim()) {
      setErrorMessage('Please enter Bank Account Number');
      return;
    }
    if (!form.pan_number?.trim()) {
      setErrorMessage('Please enter PAN Number');
      return;
    }
    if (!form.pf_number?.trim()) {
      setErrorMessage('Please enter PF Number');
      return;
    }
    if (!form.uan_number?.trim()) {
      setErrorMessage('Please enter PF UAN Number');
      return;
    }
    if (!form.payslip_month?.trim()) {
      setErrorMessage('Please enter Payslip Month');
      return;
    }
    if (!form.gross_salary || grossNum <= 0) {
      setErrorMessage('Please enter a valid Gross Salary greater than 0');
      return;
    }
    if (Number(form.incentive) < 0) {
      setErrorMessage('Incentive cannot be negative');
      return;
    }
    if (Number(form.tds) < 0) {
      setErrorMessage('Professional Tax cannot be negative');
      return;
    }
    if (specialAllowance < 0) {
      setErrorMessage('Gross Salary must be at least ₹12,160 to support the standard allowance structure without negative values');
      return;
    }

    setSaving(true);
    try {
      // 1. Save payslip record to database
      const res = await payslipsAPI.create({
        ...form,
        effective_work_days: Number(form.effective_work_days),
        lop: Number(form.lop),
        gross_salary: grossNum,
        incentive,
        tds,
      });

      const newSlip = res.data?.payslip || draftPayslip;

      // 2. Generate and download PDF immediately
      await triggerPdfDownload(newSlip);

      // 3. Update history and show success message
      setSuccessMessage('Payslip downloaded successfully and saved to database.');
      fetchHistory();
      // Reset form to empty
      setForm(INITIAL_FORM);
    } catch (err) {
      console.error('Download payslip error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save payslip or generate PDF');
    } finally {
      setSaving(false);
    }
  };

  // ── Handle Delete ────────────────────────────────────────────────────────
  const handleDelete = async (id, empName) => {
    if (!window.confirm(`Are you sure you want to delete the payslip for ${empName}?`)) return;
    try {
      await payslipsAPI.delete(id);
      fetchHistory();
      if (selectedPayslip?._id === id) {
        setShowPreviewModal(false);
        setSelectedPayslip(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete payslip');
    }
  };

  // ── Print Handler ────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const handleClearForm = () => {
    setForm(INITIAL_FORM);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const fmt = (v) => (v !== undefined && v !== null && v !== '' ? Number(v).toLocaleString('en-IN') : '0');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                AOTMS Payslip Module
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Official employee salary slips generator with automated statutory calculations & PDF export
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              handleClearForm();
            }}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Plus className="w-4 h-4" /> Create Payslip
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" /> History ({history.length})
          </button>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Tab: Create Payslip ──────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Form Left Side (6 cols) */}
          <div className="xl:col-span-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Employee & Salary Information</h2>
                <p className="text-xs text-gray-500">Fill in all required fields marked with <span className="text-red-500 font-bold">*</span></p>
              </div>

              {/* Action Helpers */}
              <div>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Clear all fields"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Form
                </button>
              </div>
            </div>

            <form onSubmit={handleDownloadPayslip} className="space-y-5">
              {/* ── Section: Employee Details ── */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  <User className="w-3.5 h-3.5" /> Employee Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Employee Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter employee name"
                      value={form.employee_name}
                      onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Employee ID / Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter employee ID / number"
                      value={form.employee_id}
                      onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Joining Date <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter joining date"
                      value={form.joining_date}
                      onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Designation <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter designation"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Department <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter department"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Location <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter location"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Effective Work Days <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="31"
                      placeholder="Enter work days"
                      value={form.effective_work_days}
                      onChange={(e) => setForm({ ...form, effective_work_days: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      LOP (Loss Of Pay Days) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="Enter LOP days"
                      value={form.lop}
                      onChange={(e) => setForm({ ...form, lop: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section: Bank & Statutory Details ── */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  <CreditCard className="w-3.5 h-3.5" /> Bank & Statutory Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Bank Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter bank name"
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Bank Account Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter bank account number"
                      value={form.bank_account_number}
                      onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      PAN Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter PAN number"
                      value={form.pan_number}
                      onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      PF Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter PF number"
                      value={form.pf_number}
                      onChange={(e) => setForm({ ...form, pf_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      PF UAN Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter PF UAN number"
                      value={form.uan_number}
                      onChange={(e) => setForm({ ...form, uan_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section: Period & Gross Salary ── */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  <Calendar className="w-3.5 h-3.5" /> Salary Period & Input
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Payslip Month <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter payslip month"
                      value={form.payslip_month}
                      onChange={(e) => setForm({ ...form, payslip_month: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-semibold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Gross Salary (₹) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Enter gross salary"
                        value={form.gross_salary}
                        onChange={(e) => setForm({ ...form, gross_salary: e.target.value })}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-indigo-200 text-base font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Incentive (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.incentive}
                        onChange={(e) => setForm({ ...form, incentive: e.target.value })}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Professional Tax (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={form.tds}
                        onChange={(e) => setForm({ ...form, tds: e.target.value })}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" /> Download Payslip
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Realistic Live Payslip Preview on Right Side (6 cols) */}
          <div className="xl:col-span-6 space-y-4 xl:sticky xl:top-6">
            <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              {/* Preview Header */}
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Live Payslip Preview</h3>
                    <p className="text-[11px] text-gray-500">Real-time AOTMS format mirror</p>
                  </div>
                </div>
                {grossNum > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold font-mono">
                    Net: ₹{fmt(netSalary)}
                  </span>
                )}
              </div>

              {/* Realistic Payslip Document Paper Rendering */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <PayslipDocument payslip={draftPayslip} isPreview={true} />
              </div>

              {/* Salary Calculation Notice if Gross is below threshold */}
              {specialAllowance < 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>Gross salary must be at least ₹12,160. Special Allowance is currently negative (₹{fmt(specialAllowance)}).</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: History Table ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generated Payslips History</h2>
              <p className="text-xs text-gray-500">Search and download previously generated salary slips</p>
            </div>

            {/* Search & Month Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee, ID, role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Months</option>
                {Array.from(new Set(history.map((h) => h.payslip_month))).filter(Boolean).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchHistory}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                title="Refresh history"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* History Table */}
          {loadingHistory ? (
            <div className="py-16 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Loading payslips...
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No payslips found</p>
              <p className="text-xs text-gray-400">Generate your first payslip from the "Create Payslip" tab</p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                Create Payslip Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold text-[11px] bg-gray-50/50">
                    <th className="py-3 px-4">Employee Name</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Payslip Month</th>
                    <th className="py-3 px-4 text-right">Gross Salary</th>
                    <th className="py-3 px-4 text-center">LOP</th>
                    <th className="py-3 px-4 text-right">Incentive</th>
                    <th className="py-3 px-4 text-right">Total Earnings</th>
                    <th className="py-3 px-4 text-right">Total Deductions</th>
                    <th className="py-3 px-4 text-right">Net Salary</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {history.map((slip) => (
                    <tr key={slip._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {slip.employee_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-indigo-600">
                        {slip.employee_id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">
                        {slip.payslip_month}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                        ₹{fmt(slip.gross_salary)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {Number(slip.lop) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {slip.lop}d (-₹{fmt(slip.lop_deduction)})
                          </span>
                        ) : (
                          <span className="text-gray-400">0d</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-600">
                        ₹{fmt(slip.incentive || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                        ₹{fmt(slip.total_earnings || slip.gross_salary)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                        ₹{fmt(slip.total_deductions || slip.tds || 200)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-[13px]">
                        ₹{fmt(slip.net_salary)}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(slip.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayslip(slip);
                              setShowPreviewModal(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="View / Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await triggerPdfDownload(slip);
                              } catch (err) {
                                alert('Failed to download PDF');
                              }
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(slip._id, slip.employee_name)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Payslip Document Preview & Download ──────────────────────── */}
      {showPreviewModal && selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                    Payslip Preview – {selectedPayslip.employee_name}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedPayslip.payslip_month}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setDownloadingPdf(true);
                      await triggerPdfDownload(selectedPayslip);
                    } catch (err) {
                      alert('Failed to download PDF');
                    } finally {
                      setDownloadingPdf(false);
                    }
                  }}
                  disabled={downloadingPdf}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> {downloadingPdf ? 'Downloading...' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Document Body */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center">
              <div id="payslip-printable-document" className="bg-white shadow-lg">
                <PayslipDocument ref={printRef} payslip={selectedPayslip} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated export container for pristine A4 PDF downloads */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '740px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -9999,
        }}
        aria-hidden="true"
      >
        <div id="payslip-direct-export-node" style={{ width: '740px', backgroundColor: '#ffffff' }}>
          <PayslipDocument payslip={activeExportSlip || draftPayslip} isPreview={false} />
        </div>
      </div>
    </div>
  );
}
