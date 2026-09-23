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
  PlusCircle,
  QrCode,
  CreditCard,
  User,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { invoicesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';
import { numberToWords } from '../../utils/numberToWords';
import InvoiceDocument from './InvoiceDocument';

const SAMPLE_URCE_INVOICE = {
  doc_type: 'invoice',
  invoice_number: 'AOTMS-AUGINV01',
  invoice_date: '5/8/2026',
  due_date: '10/8/2026',
  payment_note: 'Terms Of Payment - 5Days',
  client_name: 'Usharaama Educational Academy',
  client_address: 'NH-5, Near Gannavaram, Telaprolu, Unguturu, Krishna, AP-521109',
  client_mobile: '',
  client_email: 'anusid.1517@gmail.com',
  items: [
    {
      sno: 1,
      particulars: 'Workshop - Intelligent AI Development\nFrom Innovation to Deployment',
      sac: '999293',
      rate: 7000.00,
      per: '6Days',
      amount: 42000.00,
    }
  ],
  cgst_rate: 9,
  cgst_amount: 3780.00,
  sgst_rate: 9,
  sgst_amount: 3780.00,
  gst_amount: 7560.00,
  total_amount: 49560.00,
  net_earnings_in_words: 'INR Forty Nine Thousand Five Hundred Sixty Rupees Only',
  bank_account_holder: 'AOTMS GLOBAL PRIVATE LIMITED',
  bank_name: 'HDFC BANK',
  bank_account_no: '50200120568031',
  bank_ifsc: 'HDFC0009062',
  bank_branch: 'Gurunanak Colony -520008',
};

export default function Invoice() {
  const { user } = useAuth();
  const [form, setForm] = useState(SAMPLE_URCE_INVOICE);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [previewMode, setPreviewMode] = useState('split'); // 'split' | 'fullscreen'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const printRef = useRef(null);
  const modalPrintRef = useRef(null);

  // Auto Calculate Tax Invoice Components (Items, CGST %, SGST %, Total, Words)
  const updateInvoiceCalculations = (itemsList, cgstRateVal, sgstRateVal) => {
    const items = itemsList !== undefined ? itemsList : (form.items || []);
    const cRate = (cgstRateVal !== undefined && cgstRateVal !== '') 
      ? Number(cgstRateVal) 
      : (form.cgst_rate !== undefined && form.cgst_rate !== '' ? Number(form.cgst_rate) : 9);
    const sRate = (sgstRateVal !== undefined && sgstRateVal !== '') 
      ? Number(sgstRateVal) 
      : (form.sgst_rate !== undefined && form.sgst_rate !== '' ? Number(form.sgst_rate) : 9);

    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const cgstAmount = Math.round(subtotal * (cRate / 100));
    const sgstAmount = Math.round(subtotal * (sRate / 100));
    const totalTax = cgstAmount + sgstAmount;
    const totalAmount = subtotal + totalTax;
    const inWords = totalAmount > 0 ? `INR ${numberToWords(Math.round(totalAmount))} Only` : 'INR Zero Only';

    return {
      items,
      cgst_rate: cRate,
      cgst_amount: cgstAmount,
      sgst_rate: sRate,
      sgst_amount: sgstAmount,
      gst_amount: totalTax,
      total_amount: totalAmount,
      net_earnings_in_words: inWords,
    };
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await invoicesAPI.getAll({ search });
      const all = res.data.invoices || [];
      // Filter invoices for this page
      setHistory(all.filter(inv => !inv.doc_type || inv.doc_type === 'invoice'));
    } catch (err) {
      console.error('Failed to load invoices history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, search]);

  // PDF Download Handler using direct jsPDF & html2canvas for 100% exact page rendering
  const handleDownloadPDF = async (targetRef = printRef, clientName = form.client_name) => {
    if (!targetRef.current) return;
    setDownloadingPdf(true);

    try {
      const element = targetRef.current;
      const cleanName = (clientName || 'Client').replace(/[^a-zA-Z0-9]+/g, '_');
      const filename = `AOTMS_Tax_Invoice_${cleanName}.pdf`;

      const canvas = await html2canvas(element, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF. Please try again or use the browser Print option.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Save to DB
  const handleSave = async () => {
    if (!form.client_name) {
      setErrorMessage('Client Name is required');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const calcData = updateInvoiceCalculations();
      const payload = {
        ...form,
        ...calcData,
        doc_type: 'invoice',
        type: 'invoice',
      };

      await invoicesAPI.create(payload);
      setSuccessMessage('Tax Invoice successfully saved & recorded!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to save invoice:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save invoice');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Delete invoice from history
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice record?')) return;
    try {
      await invoicesAPI.delete(id);
      loadHistory();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  // Line Item Handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...(form.items || [])];
    updated[index] = { ...updated[index], [field]: value };

    // Auto calculate item amount if rate or quantity changes
    if (field === 'rate' || field === 'per') {
      const rateNum = Number(field === 'rate' ? value : updated[index].rate) || 0;
      updated[index].amount = rateNum;
    }

    const calc = updateInvoiceCalculations(updated);
    setForm(prev => ({
      ...prev,
      ...calc,
    }));
  };

  const addItem = () => {
    const nextSno = (form.items?.length || 0) + 1;
    const updated = [
      ...(form.items || []),
      {
        sno: nextSno,
        particulars: 'Workshop Service / Technical Training',
        sac: '999293',
        rate: 5000,
        per: '1Unit',
        amount: 5000,
      }
    ];
    const calc = updateInvoiceCalculations(updated);
    setForm(prev => ({ ...prev, ...calc }));
  };

  const removeItem = (idx) => {
    const updated = (form.items || []).filter((_, i) => i !== idx).map((it, i) => ({ ...it, sno: i + 1 }));
    const calc = updateInvoiceCalculations(updated);
    setForm(prev => ({ ...prev, ...calc }));
  };

  return (
    <div className="space-y-6 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Header & Tab Navigation ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ padding: 8, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex' }}>
              <FileText size={24} />
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Tax Invoice Generator
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create official GST tax invoices, client billing documents, and download high-resolution PDFs.
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
              Invoice Editor
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Invoices
            </button>
          </div>

          {activeTab === 'create' && (
            <button
              type="button"
              onClick={() => setForm(SAMPLE_URCE_INVOICE)}
              className="px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-all"
              title="Fill sample details from AOTMS URCE Invoice"
            >
              <Sparkles size={15} /> Sample Invoice
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

      {/* ── Tab 1: CREATE / EDIT INVOICE ─────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className={`grid gap-6 ${previewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Left Form Controls (7 cols in split) */}
          <div className={previewMode === 'split' ? 'lg:col-span-6 space-y-5' : 'space-y-5'}>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
              
              {/* Card 1: Invoice Meta & Client Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600" /> Invoice &amp; Billed To Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Invoice No. *</label>
                    <input
                      type="text"
                      value={form.invoice_number}
                      onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                      placeholder="e.g. AOTMS-AUGINV01"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Invoice Date</label>
                    <input
                      type="text"
                      value={form.invoice_date}
                      onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                      placeholder="e.g. 5/8/2026"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Due Date</label>
                    <input
                      type="text"
                      value={form.due_date || ''}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      placeholder="e.g. 10/8/2026"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Note / Terms</label>
                  <input
                    type="text"
                    value={form.payment_note || ''}
                    onChange={(e) => setForm({ ...form, payment_note: e.target.value })}
                    placeholder="e.g. Terms Of Payment - 5Days"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Billed To (Client / Academy Name) *</label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    placeholder="e.g. Usharaama Educational Academy"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Client Address</label>
                  <textarea
                    rows={2}
                    value={form.client_address || ''}
                    onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                    placeholder="Full address of client / academy"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Client Email</label>
                    <input
                      type="email"
                      value={form.client_email || ''}
                      onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                      placeholder="client@academy.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Client Mobile / Phone</label>
                    <input
                      type="text"
                      value={form.client_mobile || ''}
                      onChange={(e) => setForm({ ...form, client_mobile: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Particulars / Line Items Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <IndianRupee size={18} className="text-emerald-600" /> Line Items &amp; Particulars
                  </h2>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus size={14} /> Add Line Item
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
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Particulars (Description) *</label>
                        <textarea
                          rows={2}
                          value={item.particulars}
                          onChange={(e) => handleItemChange(idx, 'particulars', e.target.value)}
                          placeholder="e.g. Workshop - Intelligent AI Development..."
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">SAC Code</label>
                          <input
                            type="text"
                            value={item.sac || ''}
                            onChange={(e) => handleItemChange(idx, 'sac', e.target.value)}
                            placeholder="999293"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Rate (₹)</label>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">PER (Unit/Days)</label>
                          <input
                            type="text"
                            value={item.per || ''}
                            onChange={(e) => handleItemChange(idx, 'per', e.target.value)}
                            placeholder="6Days / 1Unit"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Amount (₹)</label>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CGST, SGST & Totals breakdown */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Subtotal (Items Sum):</span>
                    <span className="font-bold text-slate-800">
                      ₹{((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* CGST Rate & Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">CGST Rate:</span>
                      <input
                        type="number"
                        value={form.cgst_rate !== undefined ? form.cgst_rate : 9}
                        onChange={(e) => {
                          const calc = updateInvoiceCalculations(form.items, e.target.value, form.sgst_rate);
                          setForm(prev => ({ ...prev, ...calc }));
                        }}
                        className="w-16 px-2 py-0.5 text-xs border border-emerald-300 rounded bg-white font-bold text-center"
                      />
                      <span className="text-slate-600">%</span>
                    </div>
                    <span className="font-bold text-emerald-800">
                      + ₹{(form.cgst_amount !== undefined ? form.cgst_amount : Math.round(((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)) * 0.09)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* SGST Rate & Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">SGST Rate:</span>
                      <input
                        type="number"
                        value={form.sgst_rate !== undefined ? form.sgst_rate : 9}
                        onChange={(e) => {
                          const calc = updateInvoiceCalculations(form.items, form.cgst_rate, e.target.value);
                          setForm(prev => ({ ...prev, ...calc }));
                        }}
                        className="w-16 px-2 py-0.5 text-xs border border-emerald-300 rounded bg-white font-bold text-center"
                      />
                      <span className="text-slate-600">%</span>
                    </div>
                    <span className="font-bold text-emerald-800">
                      + ₹{(form.sgst_amount !== undefined ? form.sgst_amount : Math.round(((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)) * 0.09)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-base font-extrabold text-emerald-900">
                    <span>Grand Total:</span>
                    <span>
                      ₹{(
                        ((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)) + 
                        (form.cgst_amount !== undefined ? form.cgst_amount : Math.round(((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)) * 0.09)) + 
                        (form.sgst_amount !== undefined ? form.sgst_amount : Math.round(((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0)) * 0.09))
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Bank Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={18} className="text-emerald-600" /> Company Bank &amp; Payment Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">A/C Holder Name</label>
                    <input
                      type="text"
                      value={form.bank_account_holder || 'AOTMS GLOBAL PRIVATE LIMITED'}
                      onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Bank Name</label>
                    <input
                      type="text"
                      value={form.bank_name || 'HDFC BANK'}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Account Number</label>
                    <input
                      type="text"
                      value={form.bank_account_no || '50200120568031'}
                      onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">IFSC Code</label>
                    <input
                      type="text"
                      value={form.bank_ifsc || 'HDFC0009062'}
                      onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Bank Branch</label>
                  <input
                    type="text"
                    value={form.bank_branch || 'Gurunanak Colony -520008'}
                    onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
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
                  Save &amp; Record Invoice
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPDF(printRef, form.client_name)}
                  disabled={downloadingPdf}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {downloadingPdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                  Download Vector PDF
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
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Document Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(printRef, form.client_name)}
                    disabled={downloadingPdf}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm"
                  >
                    <Download size={12} /> PDF
                  </button>
                </div>
              </div>

              {/* Printable Live Invoice Preview Container */}
              <div className="p-2 sm:p-4 bg-slate-100/70 border border-slate-200 rounded-2xl shadow-inner">
                <InvoiceDocument ref={printRef} invoiceData={form} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: SAVED INVOICES HISTORY ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by client name, invoice number, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Total: <strong>{history.length}</strong> invoices</span>
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
              <p className="text-sm">Loading invoices history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <FileText size={36} className="text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No invoices saved yet</p>
              <p className="text-xs text-slate-400">Generate and save your first tax invoice from the editor tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Invoice No</th>
                    <th className="py-3.5 px-4">Client Name</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {inv.invoice_number || 'AOTMS-AUGINV01'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {inv.client_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {inv.invoice_date || new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">
                        ₹{(Number(inv.total_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowPreviewModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Preview Invoice"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setForm(inv);
                              setActiveTab('create');
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit In Editor"
                          >
                            <FileText size={16} />
                          </button>
                          {canDelete(user) && (
                            <button
                              onClick={() => handleDelete(inv._id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
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

      {/* ── PREVIEW & EXPORT MODAL ─────────────────────────────────────────── */}
      {showPreviewModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Invoice Preview: {selectedInvoice.invoice_number || selectedInvoice.client_name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedInvoice.client_name)}
                  disabled={downloadingPdf}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  {downloadingPdf ? <RefreshCw className="animate-spin" size={13} /> : <Download size={13} />}
                  Download PDF
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex justify-center bg-slate-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <InvoiceDocument ref={modalPrintRef} invoiceData={selectedInvoice} isPreview={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
