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
  CreditCard,
  User,
  Calendar,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { invoicesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';
import { numberToWords } from '../../utils/numberToWords';
import QuotationDocument from './QuotationDocument';

const SAMPLE_AOTMS_QUOTATION = {
  doc_type: 'quotation',
  invoice_number: 'AOTMS-FEB-Q07',
  invoice_date: '20/02/2026',
  valid_till: '02/03/2026',

  company_name: 'AOTMS Global Private Limited',
  company_address: '2nd Floor, Pothuri Towers, MG Road, Near DV Manor, Vijayawada-10',
  company_mobile: '+91 80199-52233',
  company_email: 'Info@aotms.in',
  company_gst: 'GSAPS2603R1Z5',

  client_name: 'MODERN ACADEMY',
  client_address: '40-7-31,Moghalrajpuram, Vijayawada - 520010.',
  client_mobile: '+91 95020 93357',
  client_email: 'info@modernacademy.in',

  items: [
    {
      sno: 1,
      particulars: 'Tally Workshop',
      to_target: 'B.com',
      days: '45 Days',
      price_per_day: 2000,
      amount: 90000.00,
    }
  ],

  payment_terms_1: '50% Advance on Day 1',
  payment_terms_2: '50% after Workshop completion',
  payment_note: '*Note: GST & TDS Applicable*',

  bank_account_holder: 'AOTMS Global Private Limited',
  bank_name: 'HDFC',
  bank_account_no: '50200113949476',
  bank_ifsc: 'HDFC0003975',
  bank_branch: 'Enikepadu, Vijayawada-521108.',

  signatory_name: 'Ameenuddin Sayyed',
  signatory_role: 'Managing Director',
  signatory_company: 'AOTMS Global Private Limited',
};

export default function Quotation() {
  const { user } = useAuth();
  const [form, setForm] = useState(SAMPLE_AOTMS_QUOTATION);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'history'
  const [previewMode, setPreviewMode] = useState('split'); // 'split' | 'fullscreen'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const printRef = useRef(null);
  const modalPrintRef = useRef(null);

  const calculateTotal = (itemsList) => {
    const items = itemsList || form.items || [];
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await invoicesAPI.getAll({ search });
      const all = res.data.invoices || [];
      // Filter only quotations
      setHistory(all.filter(inv => inv.doc_type === 'quotation'));
    } catch (err) {
      console.error('Failed to load quotations history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, search]);

  // PDF Download Handler using direct jsPDF & html2canvas
  const handleDownloadPDF = async (targetRef = printRef, clientName = form.client_name) => {
    if (!targetRef.current) return;
    setDownloadingPdf(true);

    try {
      const element = targetRef.current;
      const cleanName = (clientName || 'Client').replace(/[^a-zA-Z0-9]+/g, '_');
      const filename = `AOTMS_Quotation_${cleanName}.pdf`;

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
      const totalAmount = calculateTotal(form.items);
      const payload = {
        ...form,
        total_amount: totalAmount,
        doc_type: 'quotation',
        type: 'quotation',
      };

      await invoicesAPI.create(payload);
      setSuccessMessage('Quotation successfully saved & recorded!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to save quotation:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save quotation');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Delete quotation from history
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation record?')) return;
    try {
      await invoicesAPI.delete(id);
      loadHistory();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || 'Failed to delete quotation');
    }
  };

  // Line Item Handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...(form.items || [])];
    updated[index] = { ...updated[index], [field]: value };

    // Auto calculate amount if price_per_day or days changed
    if (field === 'price_per_day' || field === 'days') {
      const daysNum = parseInt(String(updated[index].days).replace(/\D/g, ''), 10) || 1;
      const priceNum = Number(updated[index].price_per_day) || 0;
      if (priceNum > 0) {
        updated[index].amount = daysNum * priceNum;
      }
    }

    setForm(prev => ({
      ...prev,
      items: updated,
    }));
  };

  const addItem = () => {
    const nextSno = (form.items?.length || 0) + 1;
    const updated = [
      ...(form.items || []),
      {
        sno: nextSno,
        particulars: 'Full Stack Web Development Workshop',
        to_target: 'B.Tech / MCA',
        days: '30 Days',
        price_per_day: 2500,
        amount: 75000.00,
      }
    ];
    setForm(prev => ({ ...prev, items: updated }));
  };

  const removeItem = (idx) => {
    const updated = (form.items || []).filter((_, i) => i !== idx).map((it, i) => ({ ...it, sno: i + 1 }));
    setForm(prev => ({ ...prev, items: updated }));
  };

  return (
    <div className="space-y-6 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Header & Tab Navigation ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ padding: 8, borderRadius: 10, background: '#fffbeb', color: '#b45309', display: 'flex' }}>
              <FileText size={24} />
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Quotation Generator
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create custom workshop &amp; service quotations, propose pricing terms, and download vector PDFs.
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quotation Editor
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Quotations
            </button>
          </div>

          {activeTab === 'create' && (
            <button
              type="button"
              onClick={() => setForm(SAMPLE_AOTMS_QUOTATION)}
              className="px-3 py-2 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5 transition-all"
              title="Fill sample details from AOTMS MIC Quotation"
            >
              <Sparkles size={15} /> Sample Quotation
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

      {/* ── Tab 1: CREATE / EDIT QUOTATION ──────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className={`grid gap-6 ${previewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Left Form Controls (6 cols in split) */}
          <div className={previewMode === 'split' ? 'lg:col-span-6 space-y-5' : 'space-y-5'}>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
              
              {/* Card 1: Quotation Meta & Client Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-amber-700" /> Quotation &amp; Client Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Quotation No. *</label>
                    <input
                      type="text"
                      value={form.invoice_number}
                      onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                      placeholder="e.g. AOTMS-FEB-Q07"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Quotation Date</label>
                    <input
                      type="text"
                      value={form.invoice_date}
                      onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                      placeholder="e.g. 20/02/2026"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Valid Till</label>
                    <input
                      type="text"
                      value={form.valid_till || ''}
                      onChange={(e) => setForm({ ...form, valid_till: e.target.value })}
                      placeholder="e.g. 02/03/2026"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Quotation To (Client / Academy Name) *</label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    placeholder="e.g. MODERN ACADEMY"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Client Address</label>
                  <textarea
                    rows={2}
                    value={form.client_address || ''}
                    onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                    placeholder="40-7-31, Moghalrajpuram, Vijayawada - 520010."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Client Mobile</label>
                    <input
                      type="text"
                      value={form.client_mobile || ''}
                      onChange={(e) => setForm({ ...form, client_mobile: e.target.value })}
                      placeholder="+91 95020 93357"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Client Email</label>
                    <input
                      type="email"
                      value={form.client_email || ''}
                      onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                      placeholder="info@modernacademy.in"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Particulars / Workshops Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <IndianRupee size={18} className="text-amber-700" /> Description &amp; Pricing Details
                  </h2>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus size={14} /> Add Particular
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
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Particulars (Workshop / Service) *</label>
                        <input
                          type="text"
                          value={item.particulars}
                          onChange={(e) => handleItemChange(idx, 'particulars', e.target.value)}
                          placeholder="e.g. Tally Workshop"
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 font-medium"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Target (To)</label>
                          <input
                            type="text"
                            value={item.to_target || item.to || ''}
                            onChange={(e) => handleItemChange(idx, 'to_target', e.target.value)}
                            placeholder="B.com / CSE"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Days</label>
                          <input
                            type="text"
                            value={item.days || ''}
                            onChange={(e) => handleItemChange(idx, 'days', e.target.value)}
                            placeholder="45 Days"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Price/Day (₹)</label>
                          <input
                            type="number"
                            value={item.price_per_day || item.rate || ''}
                            onChange={(e) => handleItemChange(idx, 'price_per_day', e.target.value)}
                            placeholder="2000"
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Final Price (₹)</label>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 font-bold text-amber-800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between text-base font-extrabold text-amber-950">
                  <span>Grand Total (Final Price):</span>
                  <span>
                    ₹{calculateTotal(form.items).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Card 3: Payment Terms & Notes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-amber-700" /> Payment Terms &amp; Conditions
                  </h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Term 1</label>
                    <input
                      type="text"
                      value={form.payment_terms_1 || ''}
                      onChange={(e) => setForm({ ...form, payment_terms_1: e.target.value })}
                      placeholder="e.g. 50% Advance on Day 1"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Term 2</label>
                    <input
                      type="text"
                      value={form.payment_terms_2 || ''}
                      onChange={(e) => setForm({ ...form, payment_terms_2: e.target.value })}
                      placeholder="e.g. 50% after Workshop completion"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Note</label>
                    <input
                      type="text"
                      value={form.payment_note || ''}
                      onChange={(e) => setForm({ ...form, payment_note: e.target.value })}
                      placeholder="*Note: GST & TDS Applicable*"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Bank Details & Signatory */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={18} className="text-amber-700" /> Bank Details &amp; Authorized Signatory
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Account Name</label>
                    <input
                      type="text"
                      value={form.bank_account_holder || 'AOTMS Global Private Limited'}
                      onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Bank Name</label>
                    <input
                      type="text"
                      value={form.bank_name || 'HDFC'}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Account Number</label>
                    <input
                      type="text"
                      value={form.bank_account_no || '50200113949476'}
                      onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">IFSC Code</label>
                    <input
                      type="text"
                      value={form.bank_ifsc || 'HDFC0003975'}
                      onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 uppercase font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Branch</label>
                  <input
                    type="text"
                    value={form.bank_branch || 'Enikepadu, Vijayawada-521108.'}
                    onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Signatory Name</label>
                    <input
                      type="text"
                      value={form.signatory_name || 'Ameenuddin Sayyed'}
                      onChange={(e) => setForm({ ...form, signatory_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Signatory Designation</label>
                    <input
                      type="text"
                      value={form.signatory_role || 'Managing Director'}
                      onChange={(e) => setForm({ ...form, signatory_role: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />}
                  Save &amp; Record Quotation
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
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Quotation Preview</span>
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

              {/* Printable Live Quotation Preview Container */}
              <div className="p-2 sm:p-4 bg-slate-100/70 border border-slate-200 rounded-2xl shadow-inner">
                <QuotationDocument ref={printRef} quotationData={form} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: SAVED QUOTATIONS HISTORY ─────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by client name, quotation number, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Total: <strong>{history.length}</strong> quotations</span>
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
              <RefreshCw className="animate-spin text-amber-600" size={28} />
              <p className="text-sm">Loading quotations history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <FileText size={36} className="text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No quotations saved yet</p>
              <p className="text-xs text-slate-400">Generate and save your first quotation from the editor tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Quotation No</th>
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
                        {inv.invoice_number || 'AOTMS-FEB-Q07'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {inv.client_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {inv.invoice_date || new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-amber-800">
                        ₹{(Number(inv.total_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedQuotation(inv);
                              setShowPreviewModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Preview Quotation"
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
      {showPreviewModal && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-amber-700" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Quotation Preview: {selectedQuotation.invoice_number || selectedQuotation.client_name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedQuotation.client_name)}
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
              <QuotationDocument ref={modalPrintRef} quotationData={selectedQuotation} isPreview={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
