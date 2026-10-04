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
  Building2,
  Sparkles,
  RefreshCw,
  X,
  User,
  Calendar,
  Layers,
  Edit3,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { invoicesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';
import { numberToWords } from '../../utils/numberToWords';
import FeeReceiptDocument from './FeeReceiptDocument';

const SAMPLE_FEE_RECEIPT = {
  doc_type: 'fee_receipt',
  invoice_number: 'AOTMSINV001',
  receipt_number: 'AOTMSINV001',
  invoice_date: '03/08/2026',
  place: 'Vijayawada',

  company_phone: '+91 80199-42233',
  company_email: 'hr@aotms.com',

  student_name: 'Bommareddy Ramakoti Reddy',
  client_name: 'Bommareddy Ramakoti Reddy',
  mobile_number: '9381414268',
  phone: '9381414268',
  email: 'bommareddyvarma@gmail.com',
  address: 'Katur Road, Vuyyur-521165',

  items: [
    {
      sno: 1,
      course_name: 'AI&ML Full Course',
      particulars: 'AI&ML Full Course',
      qty: 1,
      amount: 24600,
    }
  ],

  cgst_rate: 9,
  cgst_amount: 2700,
  sgst_rate: 9,
  sgst_amount: 2700,
  subtotal: 24600,
  total_amount: 30000,
  amount_in_words: 'Thirty thousand rupees only',

  terms: [
    'A 50% of advance fee is required to confirm enrollment in the selected course.',
    'The remaining 50% fee must be paid with in 20days from the date of admission or before commencement of the second module ,whichever is earlier.',
    'The advance fee is non – refundable under any circumstance .',
    'Course transfers or batch changes are subject to institute approval and may involve additional charges.',
  ],

  company_name: 'AOTMS GLOBAL PVT, LTD.',
  company_address_footer: 'POTHURI TOWERS, 2ND FLOOR, Near DV MANOR, MG ROAD, VJA - 520010',
};

export default function FeeReceipt() {
  const { user } = useAuth();
  const [form, setForm] = useState(SAMPLE_FEE_RECEIPT);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [previewMode, setPreviewMode] = useState('split'); // 'split' | 'fullscreen'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const printRef = useRef(null);
  const modalPrintRef = useRef(null);

  // Recalculate Subtotal, CGST, SGST, Total, and Words when Grand Total is input/changed:
  // Grand Total -> 9% CGST -> 9% SGST (CGST & SGST same) -> Remaining amount goes into Item Amount & Subtotal
  const updateFromGrandTotal = (grandTotalVal, cgstRateVal, sgstRateVal, itemsList) => {
    const total = (grandTotalVal !== undefined && grandTotalVal !== '' && !isNaN(Number(grandTotalVal))) 
      ? Number(grandTotalVal) 
      : 0;

    let cRate = (cgstRateVal !== undefined && cgstRateVal !== '' && !isNaN(Number(cgstRateVal)))
      ? Number(cgstRateVal)
      : (form.cgst_rate !== undefined && form.cgst_rate !== '' ? Number(form.cgst_rate) : 9);

    let sRate = (sgstRateVal !== undefined && sgstRateVal !== '' && !isNaN(Number(sgstRateVal)))
      ? Number(sgstRateVal)
      : cRate; // CGST and SGST should be the same

    const cgstAmount = Math.round(total * (cRate / 100));
    const sgstAmount = Math.round(total * (sRate / 100));
    const remainingAmount = Math.max(0, total - cgstAmount - sgstAmount);

    const currentItems = itemsList !== undefined ? itemsList : (form.items || []);
    let items = currentItems.map(it => ({ ...it }));

    if (items.length === 0) {
      items = [{
        sno: 1,
        course_name: '',
        particulars: '',
        qty: 1,
        amount: remainingAmount,
      }];
    } else if (items.length === 1) {
      items[0] = { ...items[0], amount: remainingAmount };
    } else {
      const perItemAmount = Math.floor(remainingAmount / items.length);
      const remainder = remainingAmount - (perItemAmount * items.length);
      items = items.map((it, idx) => ({
        ...it,
        amount: idx === items.length - 1 ? perItemAmount + remainder : perItemAmount,
      }));
    }

    const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

    let inWords = 'Zero rupees only';
    if (total > 0) {
      const raw = numberToWords(Math.round(total));
      const cleaned = raw.replace(/^Rupees\s+/i, '').replace(/\s+Only$/i, '').trim();
      inWords = `${cleaned} rupees only`;
    }

    return {
      items,
      subtotal,
      cgst_rate: cRate,
      cgst_amount: cgstAmount,
      sgst_rate: sRate,
      sgst_amount: sgstAmount,
      total_amount: total,
      amount_in_words: inWords,
    };
  };

  const updateCalculations = () => {
    return updateFromGrandTotal(form.total_amount, form.cgst_rate, form.sgst_rate, form.items);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await invoicesAPI.getAll({ search, doc_type: 'fee_receipt' });
      const all = res.data.invoices || [];
      setHistory(all.filter(inv => inv.doc_type === 'fee_receipt'));
    } catch (err) {
      console.error('Failed to load fee receipts history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, search]);

  // PDF Download Handler matching standard A4 export
  const handleDownloadPDF = async (targetRef = printRef, studentName = (form.student_name || form.client_name)) => {
    if (!targetRef.current) return;
    setDownloadingPdf(true);

    try {
      const element = targetRef.current;
      const cleanName = (studentName || 'Student').replace(/[^a-zA-Z0-9]+/g, '_');
      const invoiceNo = (form.invoice_number || form.receipt_number || 'AOTMSINV').replace(/[^a-zA-Z0-9]+/g, '_');
      const filename = `AOTMS_Fee_Receipt_${invoiceNo}_${cleanName}.pdf`;

      const pages = element.querySelectorAll('.fee-receipt-page');
      const targetPages = (pages && pages.length > 0) ? pages : [element];

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const originalShadows = [];
      const originalMargins = [];
      targetPages.forEach((p, idx) => {
        originalShadows[idx] = p.style.boxShadow;
        originalMargins[idx] = p.style.marginBottom;
        p.style.boxShadow = 'none';
        p.style.marginBottom = '0px';
      });

      try {
        for (let i = 0; i < targetPages.length; i++) {
          const pageEl = targetPages[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollY: 0,
            scrollX: 0,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          if (i > 0) {
            pdf.addPage('a4', 'portrait');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }

        pdf.save(filename);
      } finally {
        targetPages.forEach((p, idx) => {
          p.style.boxShadow = originalShadows[idx];
          p.style.marginBottom = originalMargins[idx];
        });
      }

      setSuccessMessage(`Fee Receipt downloaded successfully: ${filename}`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      setErrorMessage('Failed to generate PDF. Please try again.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Save to DB
  const handleSave = async () => {
    const sName = form.student_name || form.client_name;
    if (!sName) {
      setErrorMessage('Student Name is required');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const calcData = updateCalculations();
      const payload = {
        ...form,
        ...calcData,
        client_name: sName,
        student_name: sName,
        doc_type: 'fee_receipt',
      };

      await invoicesAPI.create(payload);
      setSuccessMessage('Fee Receipt saved & recorded successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to save fee receipt:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save fee receipt');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Delete receipt from history
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee receipt?')) return;
    try {
      await invoicesAPI.delete(id);
      loadHistory();
      setSuccessMessage('Fee Receipt deleted successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || 'Failed to delete fee receipt');
    }
  };

  // Load a historical receipt into the editor
  const handleLoadReceipt = (receipt) => {
    setForm({
      ...SAMPLE_FEE_RECEIPT,
      ...receipt,
      student_name: receipt.student_name || receipt.client_name || '',
      client_name: receipt.student_name || receipt.client_name || '',
      mobile_number: receipt.mobile_number || receipt.phone || '',
      phone: receipt.mobile_number || receipt.phone || '',
    });
    setActiveTab('create');
    setSuccessMessage(`Loaded receipt: ${receipt.invoice_number || receipt.receipt_number || ''}`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Grand Total Handler
  const handleGrandTotalChange = (val) => {
    const rawVal = val === '' ? '' : Number(val);
    const calcs = updateFromGrandTotal(rawVal, form.cgst_rate, form.sgst_rate, form.items);
    setForm(prev => ({
      ...prev,
      ...calcs,
      total_amount: rawVal,
    }));
  };

  // Line Item Handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...(form.items || [])];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'course_name') {
      updated[index].particulars = value;
    }
    setForm(prev => ({
      ...prev,
      items: updated,
    }));
  };

  const addItem = () => {
    const current = form.items || [];
    const nextSno = current.length + 1;
    const updated = [
      ...current,
      {
        sno: nextSno,
        course_name: '',
        particulars: '',
        qty: 1,
        amount: 0,
      }
    ];
    const calcs = updateFromGrandTotal(form.total_amount, form.cgst_rate, form.sgst_rate, updated);
    setForm(prev => ({
      ...prev,
      ...calcs,
    }));
  };

  const removeItem = (index) => {
    const current = form.items || [];
    if (current.length <= 1) return;
    const updated = current.filter((_, idx) => idx !== index).map((item, i) => ({
      ...item,
      sno: i + 1,
    }));
    const calcs = updateFromGrandTotal(form.total_amount, form.cgst_rate, form.sgst_rate, updated);
    setForm(prev => ({
      ...prev,
      ...calcs,
    }));
  };

  // Tax Rate Handlers (CGST and SGST remain synchronized)
  const handleCgstRateChange = (val) => {
    const num = val === '' ? '' : Number(val);
    const calcs = updateFromGrandTotal(form.total_amount, num, num, form.items);
    setForm(prev => ({
      ...prev,
      ...calcs,
      cgst_rate: num,
      sgst_rate: num,
    }));
  };

  const handleSgstRateChange = (val) => {
    const num = val === '' ? '' : Number(val);
    const calcs = updateFromGrandTotal(form.total_amount, num, num, form.items);
    setForm(prev => ({
      ...prev,
      ...calcs,
      cgst_rate: num,
      sgst_rate: num,
    }));
  };

  // Terms Handlers
  const handleTermChange = (index, value) => {
    const updated = [...(form.terms || [])];
    updated[index] = value;
    setForm(prev => ({ ...prev, terms: updated }));
  };

  const addTerm = () => {
    setForm(prev => ({
      ...prev,
      terms: [...(prev.terms || []), ''],
    }));
  };

  const removeTerm = (index) => {
    const updated = (form.terms || []).filter((_, idx) => idx !== index);
    setForm(prev => ({ ...prev, terms: updated }));
  };

  const resetTerms = () => {
    setForm(prev => ({ ...prev, terms: SAMPLE_FEE_RECEIPT.terms }));
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Header & Tab Navigation ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ padding: 8, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex' }}>
              <FileText size={24} />
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Fee Receipt Generator
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create official student fee receipts, course billing documents, and download high-resolution PDFs.
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Receipt Editor
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Receipts
            </button>
          </div>

          {activeTab === 'create' && (
            <button
              type="button"
              onClick={() => setForm(SAMPLE_FEE_RECEIPT)}
              className="px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-all"
              title="Fill sample details from reference Fee Receipt"
            >
              <Sparkles size={15} /> Sample Receipt
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Tab 1: CREATE / EDIT RECEIPT ─────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className={`grid gap-6 ${previewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Left Form Controls (6 cols in split) */}
          <div className={previewMode === 'split' ? 'lg:col-span-6 space-y-5' : 'space-y-5'}>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
              
              {/* Card 1: Receipt Meta & Student Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600" /> Receipt &amp; Billed To Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Invoice / Receipt No. *</label>
                    <input
                      type="text"
                      value={form.invoice_number || ''}
                      onChange={(e) => setForm({ ...form, invoice_number: e.target.value, receipt_number: e.target.value })}
                      placeholder="e.g. AOTMSINV001"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Receipt Date</label>
                    <input
                      type="text"
                      value={form.invoice_date || ''}
                      onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Place</label>
                    <input
                      type="text"
                      value={form.place || ''}
                      onChange={(e) => setForm({ ...form, place: e.target.value })}
                      placeholder="Vijayawada"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Student Name (Billed To) *</label>
                  <input
                    type="text"
                    value={form.student_name !== undefined ? form.student_name : (form.client_name || '')}
                    onChange={(e) => setForm({ ...form, student_name: e.target.value, client_name: e.target.value })}
                    placeholder="e.g. Bommareddy Ramakoti Reddy"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Student Address</label>
                  <textarea
                    rows={2}
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Katur Road, Vuyyur-521165"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Student Email</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. bommareddyvarma@gmail.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Student Mobile / Phone</label>
                    <input
                      type="text"
                      value={form.mobile_number !== undefined ? form.mobile_number : (form.phone || '')}
                      onChange={(e) => setForm({ ...form, mobile_number: e.target.value, phone: e.target.value })}
                      placeholder="e.g. 9381414268"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Company Phone</label>
                    <input
                      type="text"
                      value={form.company_phone || ''}
                      onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
                      placeholder="+91 80199-42233"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Company Email</label>
                    <input
                      type="email"
                      value={form.company_email || ''}
                      onChange={(e) => setForm({ ...form, company_email: e.target.value })}
                      placeholder="hr@aotms.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Particulars / Course Line Items Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <IndianRupee size={18} className="text-emerald-600" /> Course &amp; Fee Details
                  </h2>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus size={14} /> Add Course Item
                  </button>
                </div>

                <div className="space-y-4">
                  {(form.items || []).map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          #{idx + 1}
                        </span>
                        {(form.items || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Course Name *</label>
                        <input
                          type="text"
                          value={item.course_name || item.particulars || ''}
                          onChange={(e) => handleItemChange(idx, 'course_name', e.target.value)}
                          placeholder="e.g. AI&ML Full Course"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">S.no</label>
                          <input
                            type="number"
                            value={item.sno !== undefined ? item.sno : idx + 1}
                            onChange={(e) => handleItemChange(idx, 'sno', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Qty</label>
                          <input
                            type="number"
                            value={item.qty !== undefined ? item.qty : 1}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Amount (₹)</label>
                          <input
                            type="text"
                            readOnly
                            value={item.amount !== undefined && item.amount !== '' ? Number(item.amount).toLocaleString('en-IN') : '0'}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-bold cursor-not-allowed select-none focus:outline-none"
                            title="Calculated automatically from Grand Total"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CGST, SGST & Totals breakdown */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium">Base Course Subtotal:</span>
                    <span className="font-bold text-slate-800">
                      ₹{Number(form.subtotal || 0).toLocaleString('en-IN')}/-
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="font-medium">CGST</span>
                      <input
                        type="number"
                        value={form.cgst_rate !== undefined ? form.cgst_rate : 9}
                        onChange={(e) => handleCgstRateChange(e.target.value)}
                        className="w-14 px-2 py-0.5 text-xs border border-slate-200 rounded bg-white font-semibold text-center focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-600 font-medium">%</span>
                    </div>
                    <span className="font-bold text-emerald-800">
                      + ₹{Number(form.cgst_amount || 0).toLocaleString('en-IN')}/-
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="font-medium">SGST</span>
                      <input
                        type="number"
                        value={form.sgst_rate !== undefined ? form.sgst_rate : 9}
                        onChange={(e) => handleSgstRateChange(e.target.value)}
                        className="w-14 px-2 py-0.5 text-xs border border-slate-200 rounded bg-white font-semibold text-center focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-600 font-medium">%</span>
                    </div>
                    <span className="font-bold text-emerald-800">
                      + ₹{Number(form.sgst_amount || 0).toLocaleString('en-IN')}/-
                    </span>
                  </div>

                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-emerald-900">Grand Total:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-emerald-900 text-sm">₹</span>
                      <input
                        type="number"
                        value={form.total_amount !== undefined ? form.total_amount : ''}
                        onChange={(e) => handleGrandTotalChange(e.target.value)}
                        placeholder="30000"
                        className="w-36 px-2.5 py-1 text-sm font-extrabold text-emerald-900 border-2 border-emerald-400 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right shadow-sm"
                      />
                      <span className="font-extrabold text-emerald-900 text-sm">/-</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 italic pt-1 border-t border-emerald-100/60">
                    Rupees in words : ( {form.amount_in_words || 'Thirty thousand rupees only'} )
                  </div>
                </div>
              </div>

              {/* Card 3: Terms & Conditions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={18} className="text-emerald-600" /> Terms &amp; Conditions
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetTerms}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={addTerm}
                      className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Plus size={13} /> Add Term
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {(form.terms || []).map((term, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-xs font-bold text-slate-400 mt-2">•</span>
                      <textarea
                        rows={2}
                        value={term}
                        onChange={(e) => handleTermChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                      />
                      {(form.terms || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTerm(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 mt-1"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 4: Company & Footer Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={18} className="text-emerald-600" /> Company Footer Details
                  </h2>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Company Name</label>
                  <input
                    type="text"
                    value={form.company_name || 'AOTMS GLOBAL PVT, LTD.'}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Footer Address</label>
                  <input
                    type="text"
                    value={form.company_address_footer || 'POTHURI TOWERS, 2ND FLOOR, Near DV MANOR, MG ROAD, VJA - 520010'}
                    onChange={(e) => setForm({ ...form, company_address_footer: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />}
                  Save &amp; Record Receipt
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPDF(printRef, form.student_name || form.client_name)}
                  disabled={downloadingPdf}
                  className="group px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 border border-slate-700/80 disabled:opacity-50 cursor-pointer"
                >
                  <div className="w-6.5 h-6.5 rounded-full bg-emerald-500/20 border-2 border-emerald-400/60 ring-2 ring-emerald-500/20 flex items-center justify-center text-emerald-300 group-hover:scale-105 group-hover:border-emerald-300 transition-all shadow-inner">
                    {downloadingPdf ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  </div>
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 transition-all flex items-center gap-1.5"
                >
                  <Printer size={16} /> Print
                </button>
              </div>
            </form>
          </div>

          {/* Right Preview Pane (6 cols in split) */}
          <div className="lg:col-span-6">
            <div className="sticky top-6 space-y-3">
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Receipt Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(previewMode === 'split' ? 'fullscreen' : 'split')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    {previewMode === 'split' ? 'Full Width' : 'Split View'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(printRef, form.student_name || form.client_name)}
                    disabled={downloadingPdf}
                    className="group px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all border border-slate-700/80 cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 ring-1 ring-emerald-400/20 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-all">
                      {downloadingPdf ? <RefreshCw className="animate-spin w-3 h-3" /> : <Download className="w-3 h-3" />}
                    </div>
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Printable Live Receipt Preview Container with standard A4 scrollbar */}
              <div className="p-2 sm:p-4 bg-slate-100/70 border border-slate-200 rounded-2xl shadow-inner max-h-[calc(100vh-220px)] lg:max-h-[580px] overflow-y-auto custom-scrollbar">
                <FeeReceiptDocument ref={printRef} receiptData={form} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: SAVED RECEIPTS HISTORY ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by student name, receipt number, course, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Total: <strong>{history.length}</strong> receipts</span>
              <button
                onClick={loadHistory}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                title="Refresh history"
              >
                <RefreshCw size={15} className={loadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="animate-spin text-emerald-600" size={28} />
              <span>Loading fee receipt records...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <FileText size={40} className="mx-auto text-slate-300 mb-2" />
              <div className="text-base font-semibold text-slate-700">No Saved Fee Receipts Found</div>
              <div className="text-xs text-slate-400">Generate and save a fee receipt from the Receipt Editor tab.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {history.map((receipt) => {
                    const studentName = receipt.student_name || receipt.client_name || 'N/A';
                    const receiptNo = receipt.invoice_number || receipt.receipt_number || 'AOTMSINV';
                    const dateStr = receipt.invoice_date || (receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString('en-IN') : '-');
                    const firstCourse = (receipt.items && receipt.items[0]?.course_name) || receipt.course_name || 'AI&ML Course';
                    const totalAmt = Number(receipt.total_amount || 0);

                    return (
                      <tr key={receipt._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {receiptNo}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {dateStr}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{receipt.mobile_number || receipt.phone || '-'}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{receipt.email || ''}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {firstCourse}
                          {receipt.items && receipt.items.length > 1 && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                              +{receipt.items.length - 1} more
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          ₹{totalAmt.toLocaleString('en-IN')}/-
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedReceipt(receipt);
                                setShowPreviewModal(true);
                              }}
                              title="Quick Preview"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => handleLoadReceipt(receipt)}
                              title="Load & Edit in Editor"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              onClick={() => handleDownloadPDF(modalPrintRef, receipt.student_name || receipt.client_name)}
                              title="Download PDF"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                            >
                              <Download size={15} />
                            </button>

                            {canDelete(user) && (
                              <button
                                onClick={() => handleDelete(receipt._id)}
                                title="Delete Record"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: QUICK PREVIEW & DOWNLOAD ────────────────────────── */}
      {showPreviewModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Fee Receipt Preview &mdash; {selectedReceipt.invoice_number || selectedReceipt.receipt_number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedReceipt.student_name || selectedReceipt.client_name)}
                  disabled={downloadingPdf}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingPdf ? 'Downloading...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedReceipt(null);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Preview */}
            <div className="p-6 overflow-y-auto bg-slate-100/70 flex justify-center">
              <div className="shadow-lg rounded-xl overflow-hidden bg-white">
                <FeeReceiptDocument ref={modalPrintRef} receiptData={selectedReceipt} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
