import React, { useState, useEffect, useRef, forwardRef } from 'react';
import {
  FileText,
  Search,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  X,
  Award,
  Save,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { invoicesAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { canDelete } from '../../../utils/permissions';
import { numberToWords } from '../../../utils/numberToWords';

import atmLogoImg from '../../../assets/atm-logo.jpeg';
import logoImg from '../../../assets/aotms-global-logo.png';
import aotmsStampImg from '../../../assets/image-removebg-preview.png';
import signatureImg from '../../../assets/deenaz-signature.png';

const DOC_TYPE = 'experience';

const todayLong = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

// "an AI Associate" / "an HR Manager" but "a Trainer"
const articleFor = (word = '') => (/^(?:[aeiou]|hr\b)/i.test(String(word).trim()) ? 'an' : 'a');

const DEFAULT_EXPERIENCE_LETTER = {
  doc_type: DOC_TYPE,
  letter_title: 'EXPERIENCE LETTER',
  letter_date: todayLong(),
  recipient_name: '',
  recipient_honorific: 'Mr.',
  designation: '',
  project_name: '',
  project_title: '',
  deliverable_count: 0,
  deliverable_unit: 'instructional videos',
  responsibility: '',
  fee_amount: 0,
  completion_deadline: '',
  company_name: 'Academy of Tech Masters',
  closing_note: 'We look forward to your continued association with Academy of Tech Masters.',
  declaration_note:
    'This letter is issued as an official confirmation of the project assignment and the mutually agreed payment terms.',
  signatory_name: 'Deenaz Shaik',
  signatory_designation: 'HR Manager',
  phone: '+91 80199-42233',
  email: 'hr@aotms.com',
  notes: '',
};

// Sample mirrors "Experience letter Format.docx" (Project Assignment Confirmation)
const SAMPLE_EXPERIENCE_LETTER = {
  doc_type: DOC_TYPE,
  letter_title: 'PROJECT ASSIGNMENT CONFIRMATION',
  letter_date: '08 September 2026',
  recipient_name: 'Poojitha Thota',
  recipient_honorific: 'Ms.',
  designation: 'Trainer',
  project_name: 'Data Science',
  project_title: 'Data Science – Video Content Development',
  deliverable_count: 90,
  deliverable_unit: 'instructional videos',
  responsibility:
    'Preparation, recording, and uploading of the assigned video content in accordance with the requirements and guidelines provided by Academy of Tech Masters.',
  fee_amount: 7000,
  completion_deadline: '15/Oct',
  company_name: 'Academy of Tech Masters',
  closing_note:
    'We look forward to your timely delivery of the assigned content and continued association with Academy of Tech Masters.',
  declaration_note:
    'This letter is issued as an official confirmation of the project assignment and the mutually agreed payment terms.',
  signatory_name: 'Deenaz Shaik',
  signatory_designation: 'HR Manager',
  phone: '+91 80199-42233',
  email: 'hr@aotms.com',
  notes: 'Sample project assignment confirmation generated for the associate.',
};

const Field = ({ label, value, onChange, type = 'text', placeholder, required, help }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
    {help && <p className="text-[11px] text-slate-400 mt-1">{help}</p>}
  </div>
);

const TextArea = ({ label, value, onChange, rows = 3, placeholder }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
    <textarea
      rows={rows}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-y"
    />
  </div>
);

// ── Experience Letter Document (single A4 page) ──────────────────────────────
export const ExperienceLetterDocument = forwardRef(({ invoiceData = {}, isPreview = false }, ref) => {
  const d = invoiceData || {};
  const company = d.company_name || 'Academy of Tech Masters';
  const recipientName = (d.recipient_name || '').trim() || 'Recipient Name';
  const honorific = (d.recipient_honorific || '').trim();
  const salutationName = `${honorific} ${recipientName}`.replace(/\s+/g, ' ').trim();
  const firstName = recipientName.split(/\s+/)[0];
  const designation = d.designation || 'Trainer';
  const projectName = d.project_name || 'the assigned project';
  const projectTitle = d.project_title || `${projectName} – Video Content Development`;
  const deliverableCount = Number(d.deliverable_count) || 0;
  const deliverableUnit = d.deliverable_unit || 'instructional videos';
  const feeAmount = Number(d.fee_amount) || 0;
  const feeFmt = feeAmount.toLocaleString('en-IN');
  const feeWords = numberToWords(feeAmount);
  const deadline = (d.completion_deadline || '').trim();
  const responsibility =
    d.responsibility ||
    `Preparation, recording, and uploading of the assigned content in accordance with the requirements and guidelines provided by ${company}.`;

  const outerPageStyle = {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: "'Inter', sans-serif",
    fontSize: '12.5px',
    lineHeight: '1.5',
    width: '794px',
    minHeight: '1123px',
    boxSizing: 'border-box',
    padding: '16px',
    marginBottom: isPreview ? '20px' : '0px',
    position: 'relative',
    boxShadow: isPreview ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
    margin: '0 auto',
  };

  const innerFrameStyle = {
    border: '1px solid #000000',
    minHeight: '1091px',
    boxSizing: 'border-box',
    padding: '26px 32px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    background: '#ffffff',
  };

  const sectionTitle = { fontSize: 12.5, fontWeight: 700, textDecoration: 'underline', marginBottom: 4 };

  return (
    <div ref={ref} style={{ width: '100%', maxWidth: '810px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div className="letter-page" style={outerPageStyle}>
        <div style={innerFrameStyle}>
          {/* Letterhead */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderBottom: '1px solid #000000',
              paddingBottom: 8,
              marginBottom: 12,
            }}
          >
            <img
              src={logoImg}
              alt={`${company} logo`}
              style={{ height: 42, objectFit: 'contain', marginBottom: 3, display: 'block' }}
              onError={(e) => {
                e.target.src = atmLogoImg;
              }}
            />
            <div style={{ textAlign: 'center', fontSize: 11.5, color: '#111827' }}>
              <span>Phone: {d.phone || '+91 80199-42233'}</span>
              <span style={{ margin: '0 8px', color: '#9ca3af' }}>|</span>
              <span>
                Email:{' '}
                <a href={`mailto:${d.email || 'hr@aotms.com'}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                  {d.email || 'hr@aotms.com'}
                </a>
              </span>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <span
              style={{
                fontSize: '17px',
                fontWeight: 700,
                textDecoration: 'underline',
                color: '#000000',
                letterSpacing: '0.5px',
              }}
            >
              {d.letter_title || 'EXPERIENCE LETTER'}
            </span>
          </div>

          {/* Date */}
          <div style={{ textAlign: 'right', fontSize: 12, color: '#111827', marginBottom: 10 }}>
            Date: {d.letter_date || todayLong()}
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, color: '#111' }}>To</div>
            <div style={{ fontSize: 14, color: '#000', fontWeight: 600 }}>{salutationName}</div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Dear {`${honorific} ${firstName}`.trim()},</div>

          {/* Body */}
          <div style={{ textAlign: 'justify', color: '#111827' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              This letter serves as formal confirmation of your engagement with {company} as{' '}
              {articleFor(designation)} {designation} for the development of {projectName} for our academic training
              programs.
            </p>

            {deliverableCount > 0 && (
              <p style={{ margin: '0 0 8px 0' }}>
                As discussed and mutually agreed, you have been assigned the responsibility of developing and
                delivering a total of {deliverableCount} {deliverableUnit} covering the {projectName} Modules.
              </p>
            )}

            <p style={{ margin: '0 0 6px 0' }}>The key terms of the assignment are as follows:</p>

            <div style={{ border: '1px solid #000000', padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
              <div style={{ marginBottom: 3 }}>
                <span style={{ fontWeight: 700 }}>Project: </span>
                <span>{projectTitle}</span>
              </div>
              <div style={{ marginBottom: 3 }}>
                <span style={{ fontWeight: 700 }}>Total: </span>
                <span>
                  {deliverableCount > 0 ? `${deliverableCount} ${deliverableUnit}` : '—'}
                </span>
              </div>
              <div style={{ marginBottom: 3 }}>
                <span style={{ fontWeight: 700 }}>Responsibility: </span>
                <span>{responsibility}</span>
              </div>
              <div>
                <span style={{ fontWeight: 700 }}>Agreed Professional Fee: </span>
                <span>
                  ₹{feeFmt}/- ({feeWords})
                </span>
              </div>
            </div>

            {feeAmount > 0 && (
              <p style={{ margin: '0 0 8px 0' }}>
                <span style={{ fontWeight: 700 }}>Payment Terms: </span>
                The agreed professional fee of ₹{feeFmt}/- will be payable upon the successful completion and
                submission of all {deliverableCount || 0} {deliverableUnit}, subject to fulfillment of the agreed
                project requirements.
              </p>
            )}

            {deliverableCount > 0 && (
              <p style={{ margin: '0 0 8px 0' }}>
                The assigned work is currently in progress and shall be considered completed only after all{' '}
                {deliverableCount} {deliverableUnit} have been successfully uploaded
                {deadline ? ` before ${deadline}` : ''} and the deliverables have been reviewed and accepted by{' '}
                {company}.
              </p>
            )}

            {d.closing_note && <p style={{ margin: '0 0 8px 0' }}>{d.closing_note}</p>}
            {d.declaration_note && <p style={{ margin: 0 }}>{d.declaration_note}</p>}
          </div>

          {/* Sign-off */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12.5, marginBottom: 2 }}>Sincerely,</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>For {company}</div>

            <div
              style={{
                position: 'relative',
                margin: '4px 0 2px',
                width: 140,
                height: 76,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <img src={aotmsStampImg} alt="AOTMS Stamp" style={{ width: 74, height: 74, objectFit: 'contain' }} />
              <img
                src={signatureImg}
                alt="Authorised signature"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 130,
                  height: 'auto',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {d.signatory_name && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{d.signatory_name}</div>
            )}
            {d.signatory_designation && (
              <div style={{ fontSize: 11.5, color: '#475569' }}>{d.signatory_designation}</div>
            )}
            <div style={{ fontSize: 11.5, color: '#475569' }}>
              {company} {d.phone ? `· ${d.phone}` : ''}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 6,
              borderTop: '1px solid #94a3b8',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#64748b',
            }}
          >
            <span>{company} — Confidential</span>
            <span>{d.letter_title || 'Experience Letter'}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Experience Letter Generator ──────────────────────────────────────────────
export default function ExperienceLetter() {
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_EXPERIENCE_LETTER);
  const [activeTab, setActiveTab] = useState('create');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const printRef = useRef(null);
  const modalPrintRef = useRef(null);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const flash = (setter, message) => {
    setter(message);
    setTimeout(() => setter(''), 4000);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await invoicesAPI.getAll({ doc_type: DOC_TYPE, search, limit: 100 });
      setHistory(res.data.invoices || []);
    } catch (err) {
      console.error('Failed to load experience letters:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, search]);

  const buildDocNumber = async () => {
    const year = new Date().getFullYear();
    try {
      const res = await invoicesAPI.getAll({ doc_type: DOC_TYPE, limit: 1000 });
      // Use the highest existing suffix so deleted records never cause duplicate references
      const maxSeq = (res.data.invoices || []).reduce((max, rec) => {
        const match = /-(\d+)$/.exec(rec.invoice_number || '');
        const seq = match ? Number(match[1]) : 0;
        return seq > max ? seq : max;
      }, 0);
      return `AOTMS-EXP-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
    } catch {
      return `AOTMS-EXP-${year}-${String(Date.now()).slice(-4)}`;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const docNumber = await buildDocNumber();
      await invoicesAPI.create({ ...form, doc_type: DOC_TYPE, invoice_number: docNumber });
      flash(setSuccessMessage, `Experience letter saved to records as ${docNumber}.`);
      if (activeTab === 'history') await loadHistory();
    } catch (err) {
      flash(setErrorMessage, err.response?.data?.message || 'Failed to save experience letter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this experience letter record?')) return;
    try {
      await invoicesAPI.delete(id);
      await loadHistory();
    } catch {
      alert('Failed to delete experience letter record');
    }
  };

  const handleDownloadPDF = async (targetRef = printRef, label = form.recipient_name) => {
    if (!targetRef.current) return;
    setDownloadingPdf(true);
    try {
      const pages = targetRef.current.querySelectorAll('.letter-page');
      if (!pages || pages.length === 0) return;

      const cleanName = (label || 'Recipient').replace(/[^a-zA-Z0-9]+/g, '_');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

      const originalShadows = [];
      const originalMargins = [];
      pages.forEach((p, idx) => {
        originalShadows[idx] = p.style.boxShadow;
        originalMargins[idx] = p.style.marginBottom;
        p.style.boxShadow = 'none';
        p.style.marginBottom = '0px';
      });

      try {
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i], {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollY: 0,
            scrollX: 0,
            backgroundColor: '#ffffff',
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          if (i > 0) pdf.addPage('a4', 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }
        pdf.save(`AOTMS_Experience_Letter_${cleanName}.pdf`);
      } finally {
        pages.forEach((p, idx) => {
          p.style.boxShadow = originalShadows[idx];
          p.style.marginBottom = originalMargins[idx];
        });
      }
      flash(setSuccessMessage, 'Experience letter PDF downloaded successfully.');
    } catch (err) {
      console.error('PDF generation error:', err);
      flash(setErrorMessage, 'Failed to generate PDF document');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ padding: 8, borderRadius: 10, background: '#f0f9ff', color: '#0369a1', display: 'flex' }}>
              <Award size={24} />
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Experience Letter</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Generate engagement / project assignment confirmation letters and download A4 PDF documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'create' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Builder
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Records ({history.length})
            </button>
          </div>

          {activeTab === 'create' && (
            <button
              type="button"
              onClick={() => setForm(SAMPLE_EXPERIENCE_LETTER)}
              className="px-3 py-2 text-xs font-semibold bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded-xl flex items-center gap-1.5 transition-all"
              title="Fill the sample project assignment confirmation details"
            >
              <Sparkles size={15} /> Sample Letter
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-5"
          >
            {/* Letter details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Letter Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Document Title" value={form.letter_title} onChange={set('letter_title')} required />
                <Field label="Letter Date" value={form.letter_date} onChange={set('letter_date')} />
                <Field label="Issuing Organisation" value={form.company_name} onChange={set('company_name')} />
                <Field label="Designation / Role" value={form.designation} onChange={set('designation')} />
                <Field label="Contact Phone" value={form.phone} onChange={set('phone')} />
                <Field label="Contact Email" value={form.email} onChange={set('email')} />
              </div>
            </div>

            {/* Recipient */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Recipient
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label="Recipient Name"
                  value={form.recipient_name}
                  onChange={set('recipient_name')}
                  placeholder="e.g. Poojitha Thota"
                  required
                />
                <Field
                  label="Honorific"
                  value={form.recipient_honorific}
                  onChange={set('recipient_honorific')}
                  placeholder="Mr. / Ms. / Mrs."
                />
              </div>
            </div>

            {/* Assignment & terms */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Assignment &amp; Terms
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Project / Domain"
                  value={form.project_name}
                  onChange={set('project_name')}
                  placeholder="e.g. Data Science"
                />
                <Field
                  label="Project Title (key terms)"
                  value={form.project_title}
                  onChange={set('project_title')}
                  placeholder="e.g. Data Science – Video Content Development"
                />
                <Field
                  label="Deliverable Count"
                  type="number"
                  value={form.deliverable_count}
                  onChange={set('deliverable_count')}
                  placeholder="90"
                />
                <Field
                  label="Deliverable Unit"
                  value={form.deliverable_unit}
                  onChange={set('deliverable_unit')}
                  placeholder="instructional videos"
                />
                <Field
                  label="Agreed Professional Fee (₹)"
                  type="number"
                  value={form.fee_amount}
                  onChange={set('fee_amount')}
                  placeholder="7000"
                  help={`In words: ${numberToWords(Number(form.fee_amount) || 0)}`}
                />
                <Field
                  label="Completion Deadline"
                  value={form.completion_deadline}
                  onChange={set('completion_deadline')}
                  placeholder="e.g. 15/Oct"
                />
              </div>
              <TextArea
                label="Responsibility"
                value={form.responsibility}
                onChange={set('responsibility')}
                rows={3}
                placeholder="Preparation, recording, and uploading of the assigned content..."
              />
              <TextArea label="Closing Note" value={form.closing_note} onChange={set('closing_note')} rows={2} />
              <TextArea
                label="Declaration Line"
                value={form.declaration_note}
                onChange={set('declaration_note')}
                rows={2}
              />
            </div>

            {/* Signatory */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Signatory
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Signatory Name" value={form.signatory_name} onChange={set('signatory_name')} />
                <Field
                  label="Signatory Designation"
                  value={form.signatory_designation}
                  onChange={set('signatory_designation')}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                Save Letter Record
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPDF(printRef)}
                disabled={downloadingPdf}
                className="px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {downloadingPdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                Download PDF
              </button>
            </div>
          </form>

          {/* Live preview */}
          <div className="w-full flex flex-col items-center pt-4 border-t border-slate-200">
            <div className="w-full max-w-[850px] space-y-3">
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Preview</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(printRef)}
                  disabled={downloadingPdf}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download size={13} /> Download PDF
                </button>
              </div>
              <div className="p-4 sm:p-6 bg-slate-100/70 border border-slate-200 rounded-2xl shadow-inner flex justify-center overflow-x-auto">
                <ExperienceLetterDocument ref={printRef} invoiceData={form} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Saved Experience Letters</h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by recipient, role..."
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 w-full sm:w-64"
              />
            </div>
          </div>

          {loadingHistory && <div className="text-center py-10 text-slate-400 text-sm">Loading records…</div>}

          {!loadingHistory && history.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FileText size={48} className="mx-auto text-slate-300 mb-3" />
              <div className="text-base font-semibold text-slate-700">No Saved Experience Letters Found</div>
              <div className="text-xs text-slate-400 mt-1">
                Generate and save a letter from the Form Builder tab.
              </div>
            </div>
          )}

          {!loadingHistory && history.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Reference</th>
                    <th className="text-left px-4 py-3 font-semibold">Recipient</th>
                    <th className="text-left px-4 py-3 font-semibold">Designation</th>
                    <th className="text-left px-4 py-3 font-semibold">Letter Date</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{rec.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{rec.recipient_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.designation || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.letter_date || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(rec)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                            title="Preview"
                          >
                            <Eye size={15} />
                          </button>
                          {canDelete(user) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(rec._id)}
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 size={15} />
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

      {/* Record preview modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="font-bold text-slate-800 text-sm">
                Experience Letter: <span className="text-sky-700">{selectedRecord.invoice_number || 'Draft'}</span> —{' '}
                {selectedRecord.recipient_name}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedRecord.recipient_name)}
                  disabled={downloadingPdf}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download size={13} /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 bg-slate-100 overflow-y-auto max-h-[calc(92vh-72px)] flex justify-center custom-scrollbar">
              <ExperienceLetterDocument ref={modalPrintRef} invoiceData={selectedRecord} isPreview={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
