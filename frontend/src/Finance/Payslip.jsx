import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Search,
  Download,
  Printer,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  User,
  CreditCard,
  Briefcase,
  Sparkles,
  RefreshCw,
  X,
  FileSpreadsheet,
  Users,
  ChevronLeft,
  ChevronRight,
  Save,
  Edit3,
} from 'lucide-react';
import { payslipsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';
import { numberToWords } from '../utils/numberToWords';
import PayslipDocument from './payslip/PayslipDocument';
import ExcelUploadModal from './payslip/ExcelUploadModal';

// Month options generator
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

const SAMPLE_PAYSLIP = {
  employee_name: 'Bhavani Shankar',
  employee_id: 'AOTMS-EMP-104',
  joining_date: '01-08-2025',
  designation: 'HR Executive',
  department: 'Human Resources',
  location: 'Vijayawada',
  effective_work_days: 30,
  lop: 0,
  bank_name: 'HDFC Bank',
  bank_account_number: '50200120568031',
  pan_number: 'ABCDE1234F',
  pf_number: 'AP/VJA/0012345/000/0001',
  uan_number: '101234567890',
  payslip_month: getDefaultMonth(),
  gross_salary: 25000,
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
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentSlipId, setCurrentSlipId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [previewMode, setPreviewMode] = useState('split'); // 'split' | 'fullscreen'
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

  const lopDaysNum = Number(form.lop) >= 0 ? Number(form.lop) : 0;
  const perDaySalary = grossNum > 0 ? grossNum / 30 : 0;
  const lopDeduction = grossNum > 0 && lopDaysNum > 0 ? Math.round(perDaySalary * lopDaysNum) : 0;

  const tds = 200;
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
    effective_work_days: 30,
    lop: lopDaysNum,
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
    tds: 200,
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
        `Successfully generated and saved ${savedSlips.length} payslips to the database! Use employee navigation to review or download.`
      );
      setTimeout(() => setSuccessMessage(''), 5000);
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
    setTimeout(() => setSuccessMessage(''), 4000);
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
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error in bulk download all:', err);
      setErrorMessage('An error occurred while downloading all payslips');
      setTimeout(() => setErrorMessage(''), 5000);
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
    if (form.lop === '' || form.lop === null || form.lop === undefined || Number(form.lop) < 0) {
      setErrorMessage('LOP (Loss Of Pay Days) cannot be negative');
      return;
    }
    if (Number(form.lop) > 30) {
      setErrorMessage(`LOP days (${form.lop}) cannot be greater than Effective Work Days (30)`);
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
    if (specialAllowance < 0) {
      setErrorMessage('Gross Salary must be at least ₹12,160 to support the standard allowance structure without negative values');
      return;
    }

    setSaving(true);
    try {
      let activeSlip = null;

      const payload = {
        ...form,
        effective_work_days: 30,
        lop: Number(form.lop) || 0,
        gross_salary: grossNum,
        incentive,
        tds: 200,
      };

      if (currentSlipId) {
        const res = await payslipsAPI.update(currentSlipId, payload);
        activeSlip = res.data?.payslip || draftPayslip;

        if (bulkEmployees.length > 0) {
          setBulkEmployees((prev) =>
            prev.map((item, idx) => (idx === selectedBulkIndex ? activeSlip : item))
          );
        }
      } else {
        const res = await payslipsAPI.create(payload);
        activeSlip = res.data?.payslip || draftPayslip;
        setCurrentSlipId(activeSlip._id || null);
      }

      await triggerPdfDownload(activeSlip);

      setSuccessMessage(
        `Payslip for ${form.employee_name} (${form.employee_id}) saved to database and downloaded successfully.`
      );
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchHistory();

      if (bulkEmployees.length === 0 && !currentSlipId) {
        setForm(INITIAL_FORM);
        setCurrentSlipId(null);
      }
    } catch (err) {
      console.error('Download payslip error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save payslip or generate PDF');
      setTimeout(() => setErrorMessage(''), 5000);
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
        effective_work_days: 30,
        lop: Number(form.lop) || 0,
        gross_salary: grossNum,
        incentive,
        tds: 200,
      };
      const res = await payslipsAPI.update(currentSlipId, payload);
      const updated = res.data?.payslip || draftPayslip;
      if (bulkEmployees.length > 0) {
        setBulkEmployees((prev) =>
          prev.map((item, idx) => (idx === selectedBulkIndex ? updated : item))
        );
      }
      setSuccessMessage(`Changes for ${form.employee_name} saved successfully.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchHistory();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save changes');
      setTimeout(() => setErrorMessage(''), 4000);
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
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      
      {/* ── Top Header Toolbar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: 8, borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', display: 'flex' }}>
              <FileText size={24} />
            </span>
            Salary Payslip Generator
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Official employee salary slips generator with Excel bulk import, automated statutory calculations & PDF export.
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#e2e8f0', padding: 3, borderRadius: 8, display: 'flex', gap: 2 }}>
            <button
              onClick={() => setActiveTab('create')}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: activeTab === 'create' ? '#ffffff' : 'transparent',
                color: activeTab === 'create' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'create' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Form Builder
            </button>
            <button
              onClick={() => { setActiveTab('history'); fetchHistory(); }}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: activeTab === 'history' ? '#ffffff' : 'transparent',
                color: activeTab === 'history' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Saved Records ({history.length})
            </button>
          </div>

          {activeTab === 'create' && (
            <>
              <button
                type="button"
                onClick={() => {
                  loadEmployeeIntoForm(SAMPLE_PAYSLIP);
                  setSuccessMessage('Loaded sample payslip details into form!');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
                style={{
                  padding: '9px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
                title="Fill sample employee payslip details"
              >
                <Sparkles size={15} /> Sample Payslip
              </button>

              <button
                type="button"
                onClick={() => setShowExcelModal(true)}
                style={{
                  padding: '9px 14px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
                title="Upload Excel for bulk payslip generation"
              >
                <FileSpreadsheet size={15} /> Upload Excel
              </button>

              <button
                type="button"
                onClick={handleClearForm}
                style={{
                  padding: '9px 14px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
                title="Clear all fields"
              >
                <RefreshCw size={15} /> Reset Form
              </button>

              {currentSlipId && (
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  disabled={saving}
                  style={{
                    padding: '9px 16px', background: '#0284c7', color: '#ffffff', border: 'none',
                    borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  Save Changes
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPayslip}
                disabled={saving}
                style={{
                  padding: '9px 18px', background: '#059669', color: '#ffffff', border: 'none',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                }}
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} /> {successMessage}
          </div>
          <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}
      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} /> {errorMessage}
          </div>
          <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* ── CREATE TAB: FORM BUILDER & LIVE PREVIEW SPLIT VIEW ──────────────── */}
      {activeTab === 'create' && (
        <div>
          {/* ── Bulk Employee Navigation Banner (when bulk employees loaded) ── */}
          {bulkEmployees.length > 0 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: '#1d4ed8', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} />
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>Bulk Payslip Workspace</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 12 }}>
                      {bulkEmployees.length} Employees Loaded
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Viewing Employee {selectedBulkIndex + 1} of {bulkEmployees.length}: <strong style={{ color: '#0f172a' }}>{bulkEmployees[selectedBulkIndex]?.employee_name || 'Draft'}</strong> ({bulkEmployees[selectedBulkIndex]?.employee_id})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', padding: 2 }}>
                  <button
                    type="button"
                    onClick={handlePrevEmployee}
                    disabled={selectedBulkIndex <= 0 || downloadingAll}
                    style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#334155', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: selectedBulkIndex <= 0 ? 0.4 : 1 }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>

                  <select
                    value={selectedBulkIndex}
                    onChange={(e) => handleSelectEmployee(Number(e.target.value))}
                    disabled={downloadingAll}
                    style={{ padding: '6px 10px', border: 'none', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', background: 'transparent', fontSize: 12, fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
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
                    style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#334155', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: selectedBulkIndex >= bulkEmployees.length - 1 ? 0.4 : 1 }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={downloadingAll || bulkEmployees.length === 0}
                  style={{
                    padding: '8px 16px', background: '#059669', color: '#ffffff', border: 'none',
                    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: downloadingAll ? 0.6 : 1
                  }}
                >
                  {downloadingAll ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Downloading {downloadAllProgress.current}/{downloadAllProgress.total}...
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Download All ({bulkEmployees.length})
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExitBulkMode}
                  disabled={downloadingAll}
                  style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#dc2626', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Exit Bulk Mode
                </button>
              </div>
            </div>
          )}

          {/* Main Form Builder & Live Preview Split View */}
          <div style={{ display: 'grid', gridTemplateColumns: previewMode === 'fullscreen' ? '1fr' : '480px 1fr', gap: 24, alignItems: 'start' }}>

            {/* Left Form Controls */}
            {previewMode !== 'fullscreen' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Card 1: Employee & Employment Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={18} style={{ color: '#1d4ed8' }} /> Employee & Employment Details
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Employee Name *</label>
                        <input
                          type="text"
                          required
                          value={form.employee_name || ''}
                          onChange={e => setForm({ ...form, employee_name: e.target.value })}
                          placeholder="e.g. Bhavani Shankar"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Employee ID / No. *</label>
                        <input
                          type="text"
                          required
                          value={form.employee_id || ''}
                          onChange={e => setForm({ ...form, employee_id: e.target.value })}
                          placeholder="e.g. AOTMS-EMP-104"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Joining Date *</label>
                        <input
                          type="text"
                          required
                          value={form.joining_date || ''}
                          onChange={e => setForm({ ...form, joining_date: e.target.value })}
                          placeholder="DD-MM-YYYY"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Designation *</label>
                        <input
                          type="text"
                          required
                          value={form.designation || ''}
                          onChange={e => setForm({ ...form, designation: e.target.value })}
                          placeholder="e.g. Developer / HR Executive"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Department *</label>
                        <input
                          type="text"
                          required
                          value={form.department || ''}
                          onChange={e => setForm({ ...form, department: e.target.value })}
                          placeholder="e.g. Development / Operations"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Work Location *</label>
                        <input
                          type="text"
                          required
                          value={form.location || ''}
                          onChange={e => setForm({ ...form, location: e.target.value })}
                          placeholder="e.g. Vijayawada"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Bank & Statutory Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={18} style={{ color: '#059669' }} /> Bank & Statutory Details
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Bank Name *</label>
                        <input
                          type="text"
                          required
                          value={form.bank_name || ''}
                          onChange={e => setForm({ ...form, bank_name: e.target.value })}
                          placeholder="e.g. HDFC Bank"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Bank Account Number *</label>
                        <input
                          type="text"
                          required
                          value={form.bank_account_number || ''}
                          onChange={e => setForm({ ...form, bank_account_number: e.target.value })}
                          placeholder="Enter account number"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>PAN Number *</label>
                        <input
                          type="text"
                          required
                          value={form.pan_number || ''}
                          onChange={e => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                          placeholder="ABCDE1234F"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace', textTransform: 'uppercase' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>PF Number</label>
                        <input
                          type="text"
                          value={form.pf_number || ''}
                          onChange={e => setForm({ ...form, pf_number: e.target.value })}
                          placeholder="AP/VJA/0012345/000/0001 (Optional)"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Salary & Working Period Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IndianRupee size={18} style={{ color: '#6366f1' }} /> Salary & Period Details
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Payslip Month *</label>
                        <input
                          type="text"
                          required
                          value={form.payslip_month || ''}
                          onChange={e => setForm({ ...form, payslip_month: e.target.value })}
                          placeholder="e.g. September 2026"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Gross Monthly Salary (₹) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={form.gross_salary || ''}
                          onChange={e => setForm({ ...form, gross_salary: e.target.value })}
                          placeholder="e.g. 25000"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Incentive / Bonus (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={form.incentive || ''}
                          onChange={e => setForm({ ...form, incentive: e.target.value })}
                          placeholder="0"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>LOP (Loss of Pay Days)</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={form.lop !== undefined ? form.lop : 0}
                          onChange={e => setForm({ ...form, lop: e.target.value })}
                          placeholder="0"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>
                    </div>

                    {/* Statutory PT Notice */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Professional Tax (PT)</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Fixed: ₹200</span>
                    </div>

                    {/* Live Calculation Summary Card */}
                    {grossNum > 0 && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 8 }}>Salary Breakdown Summary</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11.5 }}>
                          <div style={{ color: '#334155' }}>Basic Salary (40%): <strong>₹{fmt(basicSalary)}</strong></div>
                          <div style={{ color: '#334155' }}>HRA (40% Basic): <strong>₹{fmt(hra)}</strong></div>
                          <div style={{ color: '#334155' }}>Conveyance: <strong>₹{fmt(conveyance)}</strong></div>
                          <div style={{ color: '#334155' }}>Medical Allowance: <strong>₹{fmt(medicalAllowance)}</strong></div>
                          <div style={{ color: '#334155' }}>Food/Transport: <strong>₹{fmt(foodAllowance)}</strong></div>
                          <div style={{ color: '#334155' }}>Special Allowance: <strong>₹{fmt(specialAllowance)}</strong></div>
                          {lopDaysNum > 0 && (
                            <div style={{ color: '#b91c1c' }}>LOP Deduction ({lopDaysNum}d): <strong>-₹{fmt(lopDeduction)}</strong></div>
                          )}
                          <div style={{ color: '#b91c1c' }}>PT Deduction: <strong>-₹200</strong></div>
                        </div>
                        <div style={{ borderTop: '1px solid #bbf7d0', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Net Take-Home Salary:</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>₹{fmt(netSalary)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Bottom Action */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {currentSlipId && (
                    <button
                      type="button"
                      onClick={handleSaveOnly}
                      disabled={saving}
                      style={{
                        flex: 1, padding: '12px', background: '#0284c7', color: '#ffffff', border: 'none',
                        borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <Save size={16} /> Save Changes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDownloadPayslip}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '12px', background: '#059669', color: '#ffffff', border: 'none',
                      borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                    }}
                  >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                    Download Payslip PDF
                  </button>
                </div>
              </div>
            )}

            {/* Right Live Preview Sticky Panel */}
            <div style={{ position: 'sticky', top: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#ffffff', padding: '12px 20px', borderRadius: '12px 12px 0 0' }}>
                <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Eye size={18} style={{ color: '#38bdf8' }} /> Live Payslip Preview
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {grossNum > 0 && (
                    <span style={{ fontSize: 12, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                      Net: ₹{fmt(netSalary)}
                    </span>
                  )}
                  <button
                    onClick={() => setPreviewMode(previewMode === 'split' ? 'fullscreen' : 'split')}
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                  >
                    {previewMode === 'split' ? 'Full Width' : 'Split View'}
                  </button>
                </div>
              </div>

              <div style={{ padding: 16, backgroundColor: '#f1f5f9', overflowX: 'auto', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>
                <PayslipDocument ref={printRef} payslip={draftPayslip} isPreview={true} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── HISTORY TAB: SAVED PAYSLIPS RECORDS ──────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 320 }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee, ID, role..."
                  style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, background: '#ffffff', color: '#334155', cursor: 'pointer' }}
              >
                <option value="all">All Months</option>
                {Array.from(new Set(history.map(h => h.payslip_month))).filter(Boolean).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchHistory}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Refresh history"
              >
                <RefreshCw size={16} className={loadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loadingHistory && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading records...</div>}

          {!loadingHistory && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <FileText size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>No Saved Payslips Found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Generate and save a new employee payslip from the Form Builder tab.</div>
            </div>
          )}

          {!loadingHistory && history.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Employee Name</th>
                    <th style={{ padding: '12px 16px' }}>Employee ID</th>
                    <th style={{ padding: '12px 16px' }}>Payslip Month</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Gross Salary</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>LOP</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Incentive</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Salary</th>
                    <th style={{ padding: '12px 16px' }}>Created Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((slip, idx) => (
                    <tr key={slip._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{slip.employee_name}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{slip.employee_id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>{slip.payslip_month}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{fmt(slip.gross_salary)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {Number(slip.lop) > 0 ? (
                          <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            {slip.lop}d (-₹{fmt(slip.lop_deduction)})
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0d</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#4f46e5' }}>₹{fmt(slip.incentive || 0)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: 13.5 }}>₹{fmt(slip.net_salary)}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {new Date(slip.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setSelectedPayslip(slip); setShowPreviewModal(true); }}
                            style={{ padding: '6px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            title="Preview Payslip"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('create');
                              loadEmployeeIntoForm(slip);
                            }}
                            style={{ padding: '6px 10px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            title="Edit in Form Builder"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await triggerPdfDownload(slip);
                              } catch (err) {
                                alert('Failed to download PDF');
                              }
                            }}
                            style={{ padding: '6px 10px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            title="Download PDF"
                          >
                            <Download size={13} />
                          </button>
                          {canDelete(user) && (
                            <button
                              onClick={() => handleDelete(slip._id, slip.employee_name)}
                              style={{ padding: '6px 8px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 840, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} />
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Payslip Preview – {selectedPayslip.employee_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{selectedPayslip.payslip_month}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#ffffff', color: '#334155', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Printer size={14} /> Print
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
                  style={{ padding: '7px 14px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Download size={14} /> {downloadingPdf ? 'Downloading...' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Document Body */}
            <div style={{ padding: 20, overflowY: 'auto', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderRadius: 4 }}>
                <PayslipDocument payslip={selectedPayslip} isPreview={true} />
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
