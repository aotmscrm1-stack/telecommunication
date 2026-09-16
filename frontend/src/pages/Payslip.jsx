import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FileSpreadsheet,
  Users,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Edit3,
} from 'lucide-react';
import { payslipsAPI } from '../services/api';
import { numberToWords } from '../utils/numberToWords';
import PayslipDocument from '../components/payslip/PayslipDocument';
import ExcelUploadModal from '../components/payslip/ExcelUploadModal';

// Month options generator (e.g. "January 2026", "February 2026", "March 2026", etc.)
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function cleanPayslipMonth(val) {
  if (!val) return '';
  let str = String(val).trim();
  if (str.includes('T') || str.includes('GMT') || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
    }
  }
  str = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?/i, '').trim();
  return str;
}

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

function formatPayslipFilename(employeeName, employeeId, payslipMonth) {
  const cleanName = (employeeName || 'Employee').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const cleanId = (employeeId || '').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const cleanMonth = (cleanPayslipMonth(payslipMonth) || 'Month').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `AOTMS_Payslip_${cleanName}${cleanId ? `_${cleanId}` : ''}_${cleanMonth}.pdf`;
}

export default function Payslip() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentSlipId, setCurrentSlipId] = useState(null); // When editing an existing saved slip
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeExportSlip, setActiveExportSlip] = useState(null);

  // ── Bulk Upload & Multi-Employee Navigation State ─────────────────────────
  const [bulkEmployees, setBulkEmployees] = useState([]);
  const [selectedBulkIndex, setSelectedBulkIndex] = useState(0);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState({ current: 0, total: 0 });

  const printRef = useRef(null);

  // ── Real-time Salary Calculation ──────────────────────────────────────────
  const grossNum = Math.round(Number(form.gross_salary) || 0);
  const basicSalary = Math.round(grossNum * 0.40);
  const hra = Math.round(basicSalary * 0.40);
  const conveyance = grossNum > 0 ? 2500 : 0;
  const medicalAllowance = grossNum > 0 ? 1500 : 0;
  const foodAllowance = grossNum > 0 ? 1350 : 0;
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
    conveyance: conveyance,
    medical_allowance: medicalAllowance,
    food_allowance: foodAllowance,
    special_allowance: specialAllowance,
    incentive: incentive,
    total_earnings: totalEarnings,
    lop_deduction: lopDeduction,
    tds: tds,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    net_salary_in_words: netInWords,
  };

  // ── Helper: Load an employee's values into the form ────────────────────────
  const loadEmployeeIntoForm = (emp) => {
    if (!emp) return;
    setCurrentSlipId(emp._id || null);
    setForm({
      employee_name: emp.employee_name || '',
      employee_id: emp.employee_id || '',
      joining_date: emp.joining_date || '',
      designation: emp.designation || '',
      department: emp.department || '',
      location: emp.location || '',
      effective_work_days: emp.effective_work_days !== undefined ? emp.effective_work_days : 30,
      lop: emp.lop !== undefined ? emp.lop : 0,
      bank_name: emp.bank_name || '',
      bank_account_number: emp.bank_account_number || '',
      pan_number: emp.pan_number || '',
      pf_number: emp.pf_number || '',
      uan_number: emp.uan_number || '',
      payslip_month: cleanPayslipMonth(emp.payslip_month) || '',
      gross_salary: emp.gross_salary !== undefined ? emp.gross_salary : '',
      incentive: emp.incentive || 0,
      tds: emp.tds !== undefined ? emp.tds : 200,
    });
    setErrorMessage('');
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
    await new Promise((resolve) => setTimeout(resolve, 150));

    const element = document.getElementById('payslip-direct-export-node');
    const filename = formatPayslipFilename(slip.employee_name, slip.employee_id, slip.payslip_month);

    try {
      const html2pdfModule = (await import('html2pdf.js')).default;
      if (html2pdfModule && element) {
        const opt = {
          margin: [6, 6, 6, 6],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            scrollX: 0,
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

  // ── Handle Bulk Import Success from Excel Modal ───────────────────────────
  const handleBulkImportSuccess = async (validRows) => {
    const res = await payslipsAPI.bulkCreate({ payslips: validRows });
    const savedSlips = res.data?.payslips || [];

    if (savedSlips.length > 0) {
      setBulkEmployees(savedSlips);
      setSelectedBulkIndex(0);
      loadEmployeeIntoForm(savedSlips[0]);
      setSuccessMessage(
        `Successfully generated and saved ${savedSlips.length} payslips to the database! Use the employee navigation below to review each payslip or download individual PDFs.`
      );
      fetchHistory();
    }
  };

  // ── Multi-Employee Navigation Handlers ────────────────────────────────────
  const handleSelectEmployee = (index) => {
    if (index >= 0 && index < bulkEmployees.length) {
      setSelectedBulkIndex(index);
      loadEmployeeIntoForm(bulkEmployees[index]);
    }
  };

  const handlePrevEmployee = () => {
    if (selectedBulkIndex > 0) {
      const newIdx = selectedBulkIndex - 1;
      setSelectedBulkIndex(newIdx);
      loadEmployeeIntoForm(bulkEmployees[newIdx]);
    }
  };

  const handleNextEmployee = () => {
    if (selectedBulkIndex < bulkEmployees.length - 1) {
      const newIdx = selectedBulkIndex + 1;
      setSelectedBulkIndex(newIdx);
      loadEmployeeIntoForm(bulkEmployees[newIdx]);
    }
  };

  const handleExitBulkMode = () => {
    setBulkEmployees([]);
    setSelectedBulkIndex(0);
    setCurrentSlipId(null);
    setForm(INITIAL_FORM);
    setSuccessMessage('Exited bulk workspace. Switched to manual single payslip mode.');
  };

  // ── Handle Download All Payslips Sequentially ─────────────────────────────
  const handleDownloadAll = async () => {
    if (bulkEmployees.length === 0 || downloadingAll) return;
    setDownloadingAll(true);
    setErrorMessage('');
    try {
      for (let i = 0; i < bulkEmployees.length; i++) {
        setDownloadAllProgress({ current: i + 1, total: bulkEmployees.length });
        await triggerPdfDownload(bulkEmployees[i]);
        if (i < bulkEmployees.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
      setSuccessMessage(`Successfully downloaded all ${bulkEmployees.length} employee payslips.`);
    } catch (err) {
      console.error('Error in bulk download all:', err);
      setErrorMessage('An error occurred while downloading all payslips');
    } finally {
      setDownloadingAll(false);
      setDownloadAllProgress({ current: 0, total: 0 });
    }
  };

  // ── Handle Download Payslip (Save/Update DB & Download PDF) ───────────────
  const handleDownloadPayslip = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
      let activeSlip = null;

      const payload = {
        ...form,
        effective_work_days: Number(form.effective_work_days),
        lop: Number(form.lop),
        gross_salary: grossNum,
        incentive,
        tds,
      };

      if (currentSlipId) {
        // Update existing database record
        const res = await payslipsAPI.update(currentSlipId, payload);
        activeSlip = res.data?.payslip || draftPayslip;

        // Update current record in bulkEmployees list if present
        if (bulkEmployees.length > 0) {
          setBulkEmployees((prev) =>
            prev.map((item, idx) => (idx === selectedBulkIndex ? activeSlip : item))
          );
        }
      } else {
        // Create new record in database
        const res = await payslipsAPI.create(payload);
        activeSlip = res.data?.payslip || draftPayslip;
        setCurrentSlipId(activeSlip._id || null);
      }

      // 2. Generate and download PDF immediately for the active employee
      await triggerPdfDownload(activeSlip);

      // 3. Update history and notify user
      setSuccessMessage(
        `Payslip for ${form.employee_name} (${form.employee_id}) saved to database and downloaded successfully.`
      );
      fetchHistory();

      // If in manual mode (not bulk), clear form after creation
      if (bulkEmployees.length === 0 && !currentSlipId) {
        setForm(INITIAL_FORM);
        setCurrentSlipId(null);
      }
    } catch (err) {
      console.error('Download payslip error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save payslip or generate PDF');
    } finally {
      setSaving(false);
    }
  };

  // ── Handle Save Changes (without downloading immediately) ────────────────
  const handleSaveOnly = async () => {
    if (!currentSlipId) {
      return handleDownloadPayslip();
    }
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const payload = {
        ...form,
        effective_work_days: Number(form.effective_work_days),
        lop: Number(form.lop),
        gross_salary: grossNum,
        incentive,
        tds,
      };
      const res = await payslipsAPI.update(currentSlipId, payload);
      const updated = res.data?.payslip || draftPayslip;
      if (bulkEmployees.length > 0) {
        setBulkEmployees((prev) =>
          prev.map((item, idx) => (idx === selectedBulkIndex ? updated : item))
        );
      }
      setSuccessMessage(`Changes for ${form.employee_name} saved successfully.`);
      fetchHistory();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save changes');
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
      if (currentSlipId === id) {
        handleClearForm();
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
    setCurrentSlipId(null);
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
                Official employee salary slips generator with Excel bulk import, automated statutory calculations & PDF export
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
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
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
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
          <button onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Tab: Create Payslip ──────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* ── Bulk Employee Navigation Bar (Visible when bulk employees are loaded) ── */}
          {bulkEmployees.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50/95 via-blue-50/95 to-slate-50 border border-indigo-200/90 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 animate-fadeIn">
              {/* Left: Bulk Mode details & counter */}
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900">Bulk Payslip Workspace</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                      {bulkEmployees.length} Employees Loaded
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Viewing Employee {selectedBulkIndex + 1} of {bulkEmployees.length}: <span className="font-semibold text-gray-800">{bulkEmployees[selectedBulkIndex]?.employee_name || 'Draft'}</span>
                  </p>
                </div>
              </div>

              {/* Right: Navigation Dropdown, Download All & Exit Bulk Mode */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
                {/* Employee Selector Dropdown with Prev & Next */}
                <div className="inline-flex items-center bg-white rounded-xl border border-gray-300 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevEmployee}
                    disabled={selectedBulkIndex <= 0 || downloadingAll}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Previous Employee"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>

                  <select
                    value={selectedBulkIndex}
                    onChange={(e) => handleSelectEmployee(Number(e.target.value))}
                    disabled={downloadingAll}
                    aria-label="Select employee"
                    className="px-3 py-1.5 border-x border-gray-200 bg-transparent text-xs font-semibold text-gray-800 focus:outline-none max-w-[220px] cursor-pointer"
                  >
                    {bulkEmployees.map((emp, idx) => (
                      <option key={emp._id || idx} value={idx}>
                        #{idx + 1}: {emp.employee_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleNextEmployee}
                    disabled={selectedBulkIndex >= bulkEmployees.length - 1 || downloadingAll}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Next Employee"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtle Divider */}
                <div className="hidden sm:block h-6 w-px bg-indigo-200"></div>

                {/* Action Group: Download All & Exit Bulk Mode */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    disabled={downloadingAll || bulkEmployees.length === 0}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:shadow-sm"
                    title="Download all employee payslip PDFs sequentially"
                  >
                    {downloadingAll ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Downloading {downloadAllProgress.current}/{downloadAllProgress.total}...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Download All ({bulkEmployees.length})
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleExitBulkMode}
                    disabled={downloadingAll}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Exit bulk mode and switch to standard manual single payslip"
                  >
                    Exit Bulk Mode
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main 2-Column Grid: Form Left (6 cols) & Live Preview Right (6 cols) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Form Left Side (6 cols) */}
            <div className="xl:col-span-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-4 gap-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Employee & Salary Information</h2>
                  <p className="text-xs text-gray-500">
                    {bulkEmployees.length > 0 ? (
                      <span className="text-indigo-600 font-medium">
                        Editing Employee {selectedBulkIndex + 1} of {bulkEmployees.length} ({form.employee_name || 'Draft'})
                      </span>
                    ) : (
                      <>Fill in all required fields marked with <span className="text-red-500 font-bold">*</span></>
                    )}
                  </p>
                </div>

                {/* Action Helpers: Upload Excel beside Reset Form */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(true)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Upload Excel for bulk payslip generation"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Upload Excel
                  </button>
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Employee ID / No. <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter employee ID"
                        value={form.employee_id}
                        onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Joining Date <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter joining date (DD-MM-YYYY)"
                        value={form.joining_date}
                        onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Effective Work Days <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="31"
                        placeholder="30"
                        value={form.effective_work_days}
                        onChange={(e) => setForm({ ...form, effective_work_days: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        LOP (Loss Of Pay Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        placeholder="0"
                        value={form.lop}
                        onChange={(e) => setForm({ ...form, lop: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
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
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        PF UAN <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter PF UAN number"
                        value={form.uan_number}
                        onChange={(e) => setForm({ ...form, uan_number: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Section: Salary Information ── */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    <IndianRupee className="w-3.5 h-3.5" /> Salary & Period
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Payslip Month <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter payslip month (e.g. September 2026)"
                        value={form.payslip_month}
                        onChange={(e) => setForm({ ...form, payslip_month: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Gross Salary (₹) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Enter gross salary"
                        value={form.gross_salary}
                        onChange={(e) => setForm({ ...form, gross_salary: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-semibold text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Incentive (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.incentive}
                        onChange={(e) => setForm({ ...form, incentive: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Professional Tax / TDS (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="200"
                        value={form.tds}
                        onChange={(e) => setForm({ ...form, tds: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Submit / Download Actions ── */}
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
                  {currentSlipId && (
                    <button
                      type="button"
                      onClick={handleSaveOnly}
                      disabled={saving}
                      className="w-full sm:w-auto px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save Changes
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving & Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" /> Download Payslip
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
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
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
                            onClick={() => {
                              setActiveTab('create');
                              loadEmployeeIntoForm(slip);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit in Form"
                          >
                            <Edit3 className="w-4 h-4" />
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
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors ml-2 cursor-pointer"
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

      {/* ── Modal: Excel Bulk Upload ─────────────────────────────────────────── */}
      <ExcelUploadModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onImportSuccess={handleBulkImportSuccess}
      />

      {/* Hidden dedicated export container for pristine A4 PDF downloads */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '750px',
          backgroundColor: '#ffffff',
          zIndex: -999,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <div id="payslip-direct-export-node">
          <PayslipDocument payslip={activeExportSlip || draftPayslip} isPreview={false} />
        </div>
      </div>
    </div>
  );
}
