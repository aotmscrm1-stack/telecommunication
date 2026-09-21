import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  X,
  PlusCircle,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { invoicesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';
import { numberToWords } from '../utils/numberToWords';
import InvoiceDocument from './InvoiceDocument';


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
  gst_rate: 18,
  gst_amount: 7560.00,
  net_earnings_in_words: 'INR Forty Nine Thousand Five Hundred Sixty Rupees Only',
  bank_account_holder: 'AOTMS GLOBAL PRIVATE LIMITED',
  bank_name: 'HDFC BANK',
  bank_account_no: '50200120568031',
  bank_ifsc: 'HDFC0009062',
  bank_branch: 'Gurunanak Colony -520008',
};

const SAMPLE_JAYAVEER = {
  doc_type: 'offer',
  invoice_number: 'AOTMS-OFF-2026-001',
  invoice_date: new Date().toISOString().split('T')[0],
  client_name: 'Candidate Name',
  designation: 'Developer',
  email: 'jayaveer@aotms.com',
  phone: '+91 80199-42233',
  offer_date: '20th July 2026',
  joining_date: '20th July 2026',
  annual_ctc: 240000,
  monthly_ctc: 20000,
  basic_salary: 8000,
  hra: 3200,
  medical_allowance: 1500,
  conveyance: 2500,
  food_transport_allowance: 1350,
  incentive: 0,
  dearness_allowance: 3450,
  special_allowance: 0,
  custom_earnings: [],
  esi_employee: 0,
  pf_employee: 0,
  professional_tax: 200,
  tds: 0,
  custom_deductions: [],
  esi_employer: 0,
  pf_employer: 0,
  notes: 'Sample offer & compensation plan generated from Jayaveer O.L .pdf',
};

export default function Invoice() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  const getInitialForm = () => {
    if (path.includes('quotation')) return SAMPLE_AOTMS_QUOTATION;
    if (path.includes('offer')) return SAMPLE_JAYAVEER;
    return SAMPLE_URCE_INVOICE;
  };

  const [form, setForm] = useState(getInitialForm);

  useEffect(() => {
    setForm(getInitialForm());
  }, [location.pathname]);
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

  // ── Auto Calculate Financial Components ─────────────────────────────────────
  const updateAnnualCtc = (ctcValue) => {
    const annual = Number(ctcValue) || 0;
    const monthly = Math.round(annual / 12);

    // Auto breakdown (Basic: 40%, HRA: 40% of Basic, standard allowances)
    const basicM = Math.round(monthly * 0.40);
    const hraM = Math.round(basicM * 0.40);
    const medM = 1500;
    const convM = 2500;
    const foodM = 1350;
    const incM = 0;
    const daM = 3450;

    const fixedSum = basicM + hraM + medM + convM + foodM + incM + daM;
    const specM = monthly > fixedSum ? monthly - fixedSum : 0;

    setForm(prev => ({
      ...prev,
      annual_ctc: annual,
      monthly_ctc: monthly,
      basic_salary: basicM,
      hra: hraM,
      medical_allowance: medM,
      conveyance: convM,
      food_transport_allowance: foodM,
      incentive: 0,
      dearness_allowance: daM,
      special_allowance: specM,
      net_earnings_annual: annual - ((prev.professional_tax || 200) * 12 + (prev.tds || 0) * 12),
      net_earnings_monthly: monthly - ((prev.professional_tax || 200) + (prev.tds || 0)),
      net_earnings_in_words: numberToWords(annual),
    }));
  };

  // ── Auto Calculate Tax Invoice Components (Items, GST %, Total, Words) ───────
  const updateInvoiceCalculations = (itemsList, gstRateVal) => {
    const items = itemsList !== undefined ? itemsList : (form.items || []);
    const rate = (gstRateVal !== undefined && gstRateVal !== '') ? Number(gstRateVal) : (form.gst_rate !== undefined && form.gst_rate !== '' ? Number(form.gst_rate) : 18);
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const gstAmount = Math.round(subtotal * (rate / 100));
    const totalAmount = subtotal + gstAmount;
    const inWords = totalAmount > 0 ? `INR ${numberToWords(Math.round(totalAmount))} Only` : 'INR Zero Only';

    return {
      items,
      gst_rate: rate,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      net_earnings_in_words: inWords,
    };
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await invoicesAPI.getAll({ search });
      setHistory(res.data.invoices || []);
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

  // Dynamic Custom Earnings & Deductions Handlers
  const addCustomEarning = () => {
    setForm(prev => ({
      ...prev,
      custom_earnings: [...(prev.custom_earnings || []), { name: 'Performance Bonus', monthly: 1000, annual: 12000 }]
    }));
  };

  const removeCustomEarning = (idx) => {
    setForm(prev => ({
      ...prev,
      custom_earnings: (prev.custom_earnings || []).filter((_, i) => i !== idx)
    }));
  };

  const addCustomDeduction = () => {
    setForm(prev => ({
      ...prev,
      custom_deductions: [...(prev.custom_deductions || []), { name: 'Loan Recovery', monthly: 500, annual: 6000 }]
    }));
  };

  const removeCustomDeduction = (idx) => {
    setForm(prev => ({
      ...prev,
      custom_deductions: (prev.custom_deductions || []).filter((_, i) => i !== idx)
    }));
  };

  // PDF Download Handler using html2pdf.js
  const handleDownloadPDF = async (targetRef = printRef, clientName = form.client_name) => {
    if (!targetRef.current) return;
    setDownloadingPdf(true);

    try {
      const element = targetRef.current;
      const cleanName = (clientName || 'Jayaveer').replace(/[^a-zA-Z0-9]+/g, '_');
      const filename = `AOTMS_Invoice_Compensation_${cleanName}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      setSuccessMessage(`PDF downloaded successfully: ${filename}`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('PDF Generation error:', err);
      setErrorMessage('Failed to generate PDF document');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Save Invoice Handler
  const handleSaveInvoice = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await invoicesAPI.create(form);
      setSuccessMessage('Invoice saved successfully to records!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save invoice');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Delete Invoice Handler
  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice record?')) return;
    try {
      await invoicesAPI.delete(id);
      loadHistory();
    } catch (err) {
      alert('Failed to delete invoice');
    }
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Top Header Toolbar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: 8, borderRadius: 10, background: form.doc_type === 'quotation' ? '#fffbeb' : form.doc_type === 'offer' ? '#eff6ff' : '#ecfdf5', color: form.doc_type === 'quotation' ? '#b45309' : form.doc_type === 'offer' ? '#1d4ed8' : '#059669', display: 'flex' }}>
              <FileText size={24} />
            </span>
            {form.doc_type === 'quotation' ? 'Quotation Generator' : form.doc_type === 'offer' ? 'Offer Letter Generator' : 'Tax Invoice Generator'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {form.doc_type === 'quotation' ? 'Create custom workshop & service quotations and download vector PDFs.' : form.doc_type === 'offer' ? 'Create custom salary offer letters & compensation plans.' : 'Create GST tax invoices & client billing documents.'}
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
              onClick={() => setActiveTab('history')}
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
              {form.doc_type === 'quotation' && (
                <button
                  onClick={() => setForm(SAMPLE_AOTMS_QUOTATION)}
                  style={{
                    padding: '9px 14px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a',
                    borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}
                  title="Fill sample details from AOTMS MIC Quotation"
                >
                  <Sparkles size={15} /> Sample Quotation
                </button>
              )}

              {form.doc_type === 'invoice' && (
                <button
                  onClick={() => setForm(SAMPLE_URCE_INVOICE)}
                  style={{
                    padding: '9px 14px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                    borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}
                  title="Fill sample details from URCE Tax Invoice sample.pdf"
                >
                  <Sparkles size={15} /> Sample URCE Invoice
                </button>
              )}

              {form.doc_type === 'offer' && (
                <button
                  onClick={() => setForm(SAMPLE_JAYAVEER)}
                  style={{
                    padding: '9px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                    borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}
                  title="Fill sample details from Jayaveer Offer Letter .pdf"
                >
                  <Sparkles size={15} /> Sample Offer Letter
                </button>
              )}

              <button
                onClick={handleSaveInvoice}
                disabled={saving}
                style={{
                  padding: '9px 16px', background: '#0284c7', color: '#ffffff', border: 'none',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Save Record
              </button>

              <button
                onClick={() => handleDownloadPDF(printRef)}
                disabled={downloadingPdf}
                style={{
                  padding: '9px 18px', background: '#059669', color: '#ffffff', border: 'none',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                }}
              >
                {downloadingPdf ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* ── CREATE TAB: FORM BUILDER & LIVE PREVIEW SPLIT VIEW ──────────────── */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: previewMode === 'fullscreen' ? '1fr' : '480px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Left Form Controls */}
          {previewMode !== 'fullscreen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 1. QUOTATION FORM CONTROLS                                    */}
              {/* ───────────────────────────────────────────────────────────── */}
              {form.doc_type === 'quotation' && (
                <>
                  {/* Card 1: Quotation Meta & Quotation To (Client) */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={18} style={{ color: '#b45309' }} /> Quotation & Client (Quotation To) Details
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Quotation No. *</label>
                          <input
                            type="text"
                            value={form.invoice_number || ''}
                            onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                            placeholder="e.g. AOTMS-FEB-Q07"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Quotation Date</label>
                          <input
                            type="text"
                            value={form.invoice_date || ''}
                            onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                            placeholder="20/02/2026"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Valid Till Date</label>
                          <input
                            type="text"
                            value={form.valid_till || ''}
                            onChange={e => setForm({ ...form, valid_till: e.target.value })}
                            placeholder="02/03/2026"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Quotation To (Client / Academy Name) *</label>
                        <input
                          type="text"
                          value={form.client_name || ''}
                          onChange={e => setForm({ ...form, client_name: e.target.value })}
                          placeholder="e.g. MODERN ACADEMY"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 700 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Client Full Address</label>
                        <textarea
                          rows={2}
                          value={form.client_address || ''}
                          onChange={e => setForm({ ...form, client_address: e.target.value })}
                          placeholder="40-7-31,Moghalrajpuram, Vijayawada - 520010."
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Client Email</label>
                          <input
                            type="email"
                            value={form.client_email || ''}
                            onChange={e => setForm({ ...form, client_email: e.target.value })}
                            placeholder="info@modernacademy.in"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Client Mobile</label>
                          <input
                            type="text"
                            value={form.client_mobile || ''}
                            onChange={e => setForm({ ...form, client_mobile: e.target.value })}
                            placeholder="+91 95020 93357"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Description & Pricing Items */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PlusCircle size={18} style={{ color: '#b45309' }} /> Description & Pricing Items
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const currentItems = form.items || [];
                          const newItem = {
                            sno: currentItems.length + 1,
                            particulars: 'Workshop Particulars',
                            to_target: 'B.com',
                            days: '30 Days',
                            price_per_day: 2000,
                            amount: 60000.00,
                          };
                          setForm({ ...form, items: [...currentItems, newItem] });
                        }}
                        style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Add Particular Item
                      </button>
                    </div>

                    {(form.items || []).map((item, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>Item #{idx + 1}</span>
                          {(form.items || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = form.items.filter((_, i) => i !== idx);
                                setForm({ ...form, items: updated });
                              }}
                              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>Particulars Title</label>
                            <input
                              type="text"
                              value={item.particulars || ''}
                              onChange={e => {
                                const updated = [...form.items];
                                updated[idx].particulars = e.target.value;
                                setForm({ ...form, items: updated });
                              }}
                              placeholder="e.g. Tally Workshop"
                              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, fontWeight: 700 }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>To (Target)</label>
                              <input
                                type="text"
                                value={item.to_target || item.to || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  updated[idx].to_target = e.target.value;
                                  setForm({ ...form, items: updated });
                                }}
                                placeholder="B.com"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>Days</label>
                              <input
                                type="text"
                                value={item.days || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  updated[idx].days = e.target.value;
                                  setForm({ ...form, items: updated });
                                }}
                                placeholder="45 Days"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>Price/Day (₹)</label>
                              <input
                                type="number"
                                value={item.price_per_day || item.rate || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  const ppd = Number(e.target.value) || 0;
                                  updated[idx].price_per_day = ppd;
                                  setForm({ ...form, items: updated });
                                }}
                                placeholder="2000"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>Final Price (₹)</label>
                              <input
                                type="number"
                                value={item.amount || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  updated[idx].amount = Number(e.target.value) || 0;
                                  setForm({ ...form, items: updated });
                                }}
                                placeholder="90000"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card 3: Payment Terms & Account Details */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={18} style={{ color: '#b45309' }} /> Payment Terms & Bank Details
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Payment Terms Line 1</label>
                        <input
                          type="text"
                          value={form.payment_terms_1 || '50% Advance on Day 1'}
                          onChange={e => setForm({ ...form, payment_terms_1: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Payment Terms Line 2</label>
                        <input
                          type="text"
                          value={form.payment_terms_2 || '50% after Workshop completion'}
                          onChange={e => setForm({ ...form, payment_terms_2: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Payment Note</label>
                        <input
                          type="text"
                          value={form.payment_note || '*Note: GST & TDS Applicable*'}
                          onChange={e => setForm({ ...form, payment_note: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Bank Name</label>
                          <input
                            type="text"
                            value={form.bank_name || 'HDFC'}
                            onChange={e => setForm({ ...form, bank_name: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>A/c Holder Name</label>
                          <input
                            type="text"
                            value={form.bank_account_holder || 'AOTMS Global Private Limited'}
                            onChange={e => setForm({ ...form, bank_account_holder: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>A/c Number</label>
                          <input
                            type="text"
                            value={form.bank_account_no || '50200113949476'}
                            onChange={e => setForm({ ...form, bank_account_no: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>IFSC Code</label>
                          <input
                            type="text"
                            value={form.bank_ifsc || 'HDFC0003975'}
                            onChange={e => setForm({ ...form, bank_ifsc: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Authorized Signatory Name</label>
                        <input
                          type="text"
                          value={form.signatory_name || 'Ameenuddin Sayyed'}
                          onChange={e => setForm({ ...form, signatory_name: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 2. TAX INVOICE FORM CONTROLS                                  */}
              {/* ───────────────────────────────────────────────────────────── */}
              {form.doc_type === 'invoice' && (
                <>
                  {/* Card 1: Invoice Meta & Bill To Details */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={18} style={{ color: '#059669' }} /> Invoice & Client (Bill To) Details
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Document No. *</label>
                          <input
                            type="text"
                            value={form.invoice_number || ''}
                            onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                            placeholder="e.g. AOTMS-AUGINV01"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Invoice Date</label>
                          <input
                            type="text"
                            value={form.invoice_date || ''}
                            onChange={e => setForm({ ...form, invoice_date: e.target.value })}
                            placeholder="5/8/2026"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Due Date</label>
                          <input
                            type="text"
                            value={form.due_date || ''}
                            onChange={e => setForm({ ...form, due_date: e.target.value })}
                            placeholder="10/8/2026"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Payment Terms / Note</label>
                          <input
                            type="text"
                            value={form.payment_note || ''}
                            onChange={e => setForm({ ...form, payment_note: e.target.value })}
                            placeholder="Terms Of Payment - 5Days"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Client / Company Name (Bill TO) *</label>
                        <input
                          type="text"
                          value={form.client_name || ''}
                          onChange={e => setForm({ ...form, client_name: e.target.value })}
                          placeholder="e.g. Usharaama Educational Academy"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 700 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Client Full Address</label>
                        <textarea
                          rows={2}
                          value={form.client_address || ''}
                          onChange={e => setForm({ ...form, client_address: e.target.value })}
                          placeholder="NH-5, Near Gannavaram, Telaprolu, Unguturu, Krishna, AP-521109"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Client Email</label>
                          <input
                            type="email"
                            value={form.client_email || form.email || ''}
                            onChange={e => setForm({ ...form, client_email: e.target.value, email: e.target.value })}
                            placeholder="anusid.1517@gmail.com"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Client Phone</label>
                          <input
                            type="text"
                            value={form.client_mobile || form.phone || ''}
                            onChange={e => setForm({ ...form, client_mobile: e.target.value, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Line Items & Particulars */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PlusCircle size={18} style={{ color: '#0284c7' }} /> Particulars & Line Items
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const currentItems = form.items || [];
                          const newItem = {
                            sno: currentItems.length + 1,
                            particulars: 'New Service Particulars',
                            sac: '999293',
                            rate: 5000,
                            per: '1Unit',
                            amount: 5000,
                          };
                          const updated = [...currentItems, newItem];
                          const calcs = updateInvoiceCalculations(updated, form.gst_rate);
                          setForm(prev => ({ ...prev, ...calcs }));
                        }}
                        style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Add Particular Item
                      </button>
                    </div>

                    {(form.items || []).map((item, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>Item #{idx + 1}</span>
                          {(form.items || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = form.items.filter((_, i) => i !== idx);
                                const calcs = updateInvoiceCalculations(updated, form.gst_rate);
                                setForm(prev => ({ ...prev, ...calcs }));
                              }}
                              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>Particulars Description</label>
                            <textarea
                              rows={2}
                              value={item.particulars || ''}
                              onChange={e => {
                                const updated = [...form.items];
                                updated[idx].particulars = e.target.value;
                                setForm({ ...form, items: updated });
                              }}
                              placeholder="Workshop - Intelligent AI Development..."
                              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>SAC</label>
                              <input
                                type="text"
                                value={item.sac || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  updated[idx].sac = e.target.value;
                                  setForm({ ...form, items: updated });
                                }}
                                placeholder="999293"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>Rate (₹)</label>
                              <input
                                type="number"
                                value={item.rate || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  const r = Number(e.target.value) || 0;
                                  updated[idx].rate = r;
                                  updated[idx].amount = r;
                                  const calcs = updateInvoiceCalculations(updated, form.gst_rate);
                                  setForm(prev => ({ ...prev, ...calcs }));
                                }}
                                placeholder="7000"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>PER</label>
                              <input
                                type="text"
                                value={item.per || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  updated[idx].per = e.target.value;
                                  setForm({ ...form, items: updated });
                                }}
                                placeholder="6Days"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2, display: 'block' }}>Amount (₹)</label>
                              <input
                                type="number"
                                value={item.amount || ''}
                                onChange={e => {
                                  const updated = [...form.items];
                                  updated[idx].amount = Number(e.target.value) || 0;
                                  const calcs = updateInvoiceCalculations(updated, form.gst_rate);
                                  setForm(prev => ({ ...prev, ...calcs }));
                                }}
                                placeholder="42000"
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>GST Rate (%)</label>
                        <input
                          type="number"
                          value={form.gst_rate !== undefined ? form.gst_rate : 18}
                          onChange={e => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            const calcs = updateInvoiceCalculations(form.items, val === '' ? 0 : val);
                            setForm(prev => ({ ...prev, ...calcs, gst_rate: val }));
                          }}
                          placeholder="18"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 600 }}>GST Amount</span>
                        <strong style={{ fontSize: 14, color: '#0284c7', display: 'block', marginTop: 8 }}>
                          ₹{Number(
                            form.gst_amount !== undefined
                              ? form.gst_amount
                              : Math.round((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0) * ((form.gst_rate !== undefined && form.gst_rate !== '' ? Number(form.gst_rate) : 18) / 100))
                          ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: '#64748b', display: 'block', fontWeight: 600 }}>Total Invoice Amount</span>
                        <strong style={{ fontSize: 15, color: '#059669', display: 'block', marginTop: 8 }}>
                          ₹{Number(
                            form.total_amount !== undefined
                              ? form.total_amount
                              : (form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0) +
                                Math.round((form.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0) * ((form.gst_rate !== undefined && form.gst_rate !== '' ? Number(form.gst_rate) : 18) / 100))
                          ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Bank Details */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={18} style={{ color: '#0284c7' }} /> Company's Bank Details
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>A/C Holder Name</label>
                        <input
                          type="text"
                          value={form.bank_account_holder || 'AOTMS GLOBAL PRIVATE LIMITED'}
                          onChange={e => setForm({ ...form, bank_account_holder: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Bank Name</label>
                          <input
                            type="text"
                            value={form.bank_name || 'HDFC BANK'}
                            onChange={e => setForm({ ...form, bank_name: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>A/c No.</label>
                          <input
                            type="text"
                            value={form.bank_account_no || '50200120568031'}
                            onChange={e => setForm({ ...form, bank_account_no: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>HDFC / IFSC Code</label>
                          <input
                            type="text"
                            value={form.bank_ifsc || 'HDFC0009062'}
                            onChange={e => setForm({ ...form, bank_ifsc: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Branch</label>
                          <input
                            type="text"
                            value={form.bank_branch || 'Gurunanak Colony -520008'}
                            onChange={e => setForm({ ...form, bank_branch: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 3. OFFER LETTER FORM CONTROLS                                 */}
              {/* ───────────────────────────────────────────────────────────── */}
              {form.doc_type === 'offer' && (
                <>
                  {/* Card 1: Candidate / Client Details */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={18} style={{ color: '#0284c7' }} /> Candidate / Recipient Details
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Candidate Name *</label>
                        <input
                          type="text"
                          value={form.client_name || ''}
                          onChange={e => setForm({ ...form, client_name: e.target.value })}
                          placeholder="e.g. Candidate Name"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Designation</label>
                          <input
                            type="text"
                            value={form.designation || ''}
                            onChange={e => setForm({ ...form, designation: e.target.value })}
                            placeholder="Developer"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Offer Date</label>
                          <input
                            type="text"
                            value={form.offer_date || ''}
                            onChange={e => setForm({ ...form, offer_date: e.target.value })}
                            placeholder="20th July 2026"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Email</label>
                        <input
                          type="email"
                          value={form.email || ''}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          placeholder="jayaveer@aotms.com"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Probation Period</label>
                          <input
                            type="text"
                            value={form.probation_period || '01 FEB 2026 To 01 MAY 2026'}
                            onChange={e => setForm({ ...form, probation_period: e.target.value })}
                            placeholder="01 FEB 2026 To 01 MAY 2026"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Standard Work Timings</label>
                          <input
                            type="text"
                            value={form.work_timings || '9:30am to 06:30pm'}
                            onChange={e => setForm({ ...form, work_timings: e.target.value })}
                            placeholder="9:30am to 06:30pm"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Annual CTC & Salary Calculations */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IndianRupee size={18} style={{ color: '#059669' }} /> Annual CTC & Financial Breakdown
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Total Annual CTC (₹) *</label>
                        <input
                          type="number"
                          value={form.annual_ctc || ''}
                          onChange={e => updateAnnualCtc(e.target.value)}
                          placeholder="e.g. 240000"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '2px solid #059669', fontSize: 15, fontWeight: 700, color: '#047857' }}
                        />
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          Monthly CTC: ₹{Number(form.monthly_ctc || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Basic Salary (Monthly)</span>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.basic_salary || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>HRA (Monthly)</span>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.hra || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Medical Allowance</span>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.medical_allowance || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Conveyance</span>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.conveyance || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Food Transport</span>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.food_transport_allowance || 1350).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Incentive</span>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.incentive || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Dearness Allowance</span>
                          <strong style={{ fontSize: 13, color: '#1e293b' }}>₹{Number(form.dearness_allowance || 3450).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Custom Earnings & Deductions */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>Custom Earnings</span>
                      <button onClick={addCustomEarning} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        + Add Earning
                      </button>
                    </div>

                    {(form.custom_earnings || []).map((earn, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <input
                          type="text"
                          placeholder="Allowance Name"
                          value={earn.name}
                          onChange={e => {
                            const updated = [...form.custom_earnings];
                            updated[idx].name = e.target.value;
                            setForm({ ...form, custom_earnings: updated });
                          }}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <input
                          type="number"
                          placeholder="Monthly ₹"
                          value={earn.monthly}
                          onChange={e => {
                            const updated = [...form.custom_earnings];
                            const m = Number(e.target.value) || 0;
                            updated[idx].monthly = m;
                            updated[idx].annual = m * 12;
                            setForm({ ...form, custom_earnings: updated });
                          }}
                          style={{ width: 90, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <button onClick={() => removeCustomEarning(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>Custom Deductions</span>
                      <button onClick={addCustomDeduction} style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        + Add Deduction
                      </button>
                    </div>

                    {(form.custom_deductions || []).map((ded, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <input
                          type="text"
                          placeholder="Deduction Name"
                          value={ded.name}
                          onChange={e => {
                            const updated = [...form.custom_deductions];
                            updated[idx].name = e.target.value;
                            setForm({ ...form, custom_deductions: updated });
                          }}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <input
                          type="number"
                          placeholder="Monthly ₹"
                          value={ded.monthly}
                          onChange={e => {
                            const updated = [...form.custom_deductions];
                            const m = Number(e.target.value) || 0;
                            updated[idx].monthly = m;
                            updated[idx].annual = m * 12;
                            setForm({ ...form, custom_deductions: updated });
                          }}
                          style={{ width: 90, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                        />
                        <button onClick={() => removeCustomDeduction(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>
          )}

          {/* Right Live Interactive Preview */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#0f172a', padding: '12px 20px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} style={{ color: '#38bdf8' }} /> Live Document Preview
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPreviewMode(previewMode === 'split' ? 'fullscreen' : 'split')}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  {previewMode === 'split' ? 'Full Width' : 'Split View'}
                </button>
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: '#f1f5f9', overflowX: 'auto' }}>
              <InvoiceDocument ref={printRef} invoiceData={form} isPreview={true} />
            </div>
          </div>

        </div>
      )}

      {/* ── HISTORY TAB: SAVED INVOICES RECORDS ──────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16 }}>
            <div style={{ position: 'relative', width: 320 }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search candidate name or invoice no..."
                style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          {loadingHistory && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading records...</div>}

          {!loadingHistory && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <FileText size={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>No Saved Invoices Found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Generate and save a new invoice compensation document from the Form Builder tab.</div>
            </div>
          )}

          {!loadingHistory && history.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '12px 16px' }}>Invoice No.</th>
                  <th style={{ padding: '12px 16px' }}>Candidate / Client</th>
                  <th style={{ padding: '12px 16px' }}>Designation</th>
                  <th style={{ padding: '12px 16px' }}>Annual CTC</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((inv, idx) => (
                  <tr key={inv._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{inv.client_name}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.designation}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>₹{Number(inv.annual_ctc || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{inv.offer_date || new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}
                          style={{ padding: '6px 12px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={14} /> View
                        </button>
                        {canDelete(user) && (
                          <button
                            onClick={() => handleDeleteInvoice(inv._id)}
                            style={{ padding: '6px 10px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── PREVIEW MODAL FOR HISTORICAL INVOICES ───────────────────────────── */}
      {showPreviewModal && selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ background: '#0f172a', padding: '16px 24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                Invoice: {selectedInvoice.invoice_number} - {selectedInvoice.client_name}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedInvoice.client_name)}
                  disabled={downloadingPdf}
                  style={{ padding: '7px 14px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', background: '#f1f5f9' }}>
              <InvoiceDocument ref={modalPrintRef} invoiceData={selectedInvoice} isPreview={true} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
