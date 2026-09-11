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
import { numberToWords } from '../utils/numberToWords';
import InvoiceDocument from '../components/invoice/InvoiceDocument';

const SAMPLE_JAYAVEER = {
  invoice_number: 'AOTMS-INV-2026-001',
  invoice_date: new Date().toISOString().split('T')[0],
  client_name: 'Ramanadham Jayaveer',
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
  const [form, setForm] = useState(SAMPLE_JAYAVEER);
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
    const daM = 3450;
    
    const fixedSum = basicM + hraM + medM + convM + foodM + daM;
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
      dearness_allowance: daM,
      special_allowance: specM,
      net_earnings_annual: annual - ((prev.professional_tax || 200) * 12 + (prev.tds || 0) * 12),
      net_earnings_monthly: monthly - ((prev.professional_tax || 200) + (prev.tds || 0)),
      net_earnings_in_words: numberToWords(annual),
    }));
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
            <span style={{ padding: 8, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex' }}>
              <FileText size={24} />
            </span>
            Invoice & Compensation Generator
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Create custom salary invoices, compensation letters, real-time calculations & download vector PDFs.
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
              <button
                onClick={() => setForm(SAMPLE_JAYAVEER)}
                style={{
                  padding: '9px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
                title="Fill sample details from Jayaveer O.L .pdf"
              >
                <Sparkles size={15} /> Fill Sample (Jayaveer)
              </button>

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
              
              {/* Card 1: Candidate / Client Details */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} style={{ color: '#0284c7' }} /> Candidate / Recipient Details
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Candidate / Client Name *</label>
                    <input
                      type="text"
                      value={form.client_name}
                      onChange={e => setForm({ ...form, client_name: e.target.value })}
                      placeholder="e.g. Ramanadham Jayaveer"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Designation</label>
                      <input
                        type="text"
                        value={form.designation}
                        onChange={e => setForm({ ...form, designation: e.target.value })}
                        placeholder="Developer"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Offer / Invoice Date</label>
                      <input
                        type="text"
                        value={form.offer_date}
                        onChange={e => setForm({ ...form, offer_date: e.target.value })}
                        placeholder="20th July 2026"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="jayaveer@aotms.com"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Invoice No.</label>
                      <input
                        type="text"
                        value={form.invoice_number}
                        onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                        placeholder="AOTMS-INV-2026-001"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
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
                      value={form.annual_ctc}
                      onChange={e => updateAnnualCtc(e.target.value)}
                      placeholder="e.g. 240000"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '2px solid #059669', fontSize: 15, fontWeight: 700, color: '#047857' }}
                    />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Monthly CTC: ₹{Number(form.monthly_ctc || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Components Grid */}
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
                  </div>
                </div>
              </div>

              {/* Card 3: Dynamic Custom Earnings & Deductions */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlusCircle size={18} style={{ color: '#6366f1' }} /> Dynamic Custom Elements
                  </div>
                </div>

                {/* Custom Earnings List */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>Custom Earnings / Allowances</span>
                    <button onClick={addCustomEarning} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      + Add Earning
                    </button>
                  </div>

                  {(form.custom_earnings || []).map((earn, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="Item Name"
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
                </div>

                {/* Custom Deductions List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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
              </div>

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
                        <button
                          onClick={() => handleDeleteInvoice(inv._id)}
                          style={{ padding: '6px 10px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
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
