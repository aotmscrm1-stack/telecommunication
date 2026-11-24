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

import atmLogoImg from '../../../assets/atm-logo.jpeg';
import logoImg from '../../../assets/aotms-global-logo.png';
import aotmsStampImg from '../../../assets/image-removebg-preview.png';
import signatureImg from '../../../assets/sir sign.png';

const DOC_TYPE = 'experience';

const todayLong = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

// "an AI Associate" / "an HR Manager" but "a Trainer"
const articleFor = (word = '') => (/^(?:[aeiou]|hr\b)/i.test(String(word).trim()) ? 'an' : 'a');

const PRONOUNS = {
  male: { subj: 'he', Subj: 'He', obj: 'him', poss: 'his' },
  female: { subj: 'she', Subj: 'She', obj: 'her', poss: 'her' },
};

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

// Accepts "19 June 2026", "2026-06-19" and "19/06/2026"
const parseDate = (value = '') => {
  const raw = String(value).trim();
  if (!raw) return null;

  const long = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(raw);
  if (long) {
    const month = MONTHS.findIndex((m) => m.startsWith(long[2].toLowerCase().slice(0, 3)));
    if (month >= 0) return new Date(Number(long[3]), month, Number(long[1]));
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

// "2 months and 17 days" between the joining and relieving dates
const computeTenure = (start, end) => {
  const from = parseDate(start);
  const to = parseDate(end);
  if (!from || !to || to < from) return '';

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (months < 0) return '';

  const parts = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  return parts.length ? parts.join(' and ') : 'less than a day';
};

const DEFAULT_EXPERIENCE_LETTER = {
  doc_type: DOC_TYPE,
  letter_title: 'EXPERIENCE LETTER',
  letter_date: todayLong(),
  addressee: 'To Whom It May Concern',
  employee_name: '',
  honorific: 'Mr.',
  gender: 'male',
  designation: '',
  joining_date: '',
  relieving_date: '',
  tenure: '',
  company_name: 'Academy of Tech Masters',
  conduct_note: '',
  closing_note: '',
  signatory_designation: 'HR Manager',
  phone: '+91 80199-42233',
  email: 'hr@aotms.com',
  notes: '',
};

// Sample mirrors "Experience letter Varun.pdf" (To Whom It May Concern certificate)
const SAMPLE_EXPERIENCE_LETTER = {
  doc_type: DOC_TYPE,
  letter_title: 'EXPERIENCE LETTER',
  letter_date: '08 September 2026',
  addressee: 'To Whom It May Concern',
  employee_name: 'Prabhu Varun',
  honorific: 'Mr.',
  gender: 'male',
  designation: 'AI Associate',
  joining_date: '19 June 2026',
  relieving_date: '05 September 2026',
  tenure: '',
  company_name: 'Academy of Tech Masters',
  conduct_note: '',
  closing_note: '',
  signatory_designation: 'HR Manager',
  phone: '+91 80199-42233',
  email: 'hr@aotms.com',
  notes: 'Sample experience letter generated for the associate.',
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

const Select = ({ label, value, onChange, options, help }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {help && <p className="text-[11px] text-slate-400 mt-1">{help}</p>}
  </div>
);

// ── Experience Letter Document (single A4 page) ──────────────────────────────
export const ExperienceLetterDocument = forwardRef(({ invoiceData = {}, isPreview = false }, ref) => {
  const d = invoiceData || {};
  const company = d.company_name || 'Academy of Tech Masters';
  const employeeName = (d.employee_name || d.recipient_name || '').trim() || 'Employee Name';
  const honorific = (d.honorific || d.recipient_honorific || '').trim();
  const designation = d.designation || 'Associate';
  const joiningDate = (d.joining_date || '').trim() || '—';
  const relievingDate = (d.relieving_date || '').trim() || '—';
  const p = PRONOUNS[d.gender === 'female' ? 'female' : 'male'];
  const tenure = (d.tenure || '').trim() || computeTenure(d.joining_date, d.relieving_date);
  const conductNote =
    (d.conduct_note || '').trim() ||
    `During ${p.poss} tenure with the organization, ${p.subj} carried out ${p.poss} assigned responsibilities with dedication. ${p.Subj} demonstrated willingness to learn, and commitment toward ${p.poss} work and responsibilities.`;
  const closingNote =
    (d.closing_note || '').trim() ||
    `We appreciate ${p.poss} contributions during ${p.poss} association with ${company} and wish ${p.obj} every success in ${p.poss} future professional endeavors.`;

  const outerPageStyle = {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: "'Inter', sans-serif",
    fontSize: '16px',
    lineHeight: '1.5',
    width: '794px',
    minHeight: '1123px',
    boxSizing: 'border-box',
    padding: '20px',
    marginBottom: isPreview ? '20px' : '0px',
    position: 'relative',
    boxShadow: isPreview ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
    margin: '0 auto',
  };

  // The letterhead bleeds wider than the body copy, mirroring the issued letter
  const headerStyle = { padding: '0 15px' };
  const bodyStyle = { padding: '0 73px', boxSizing: 'border-box' };

  return (
    <div ref={ref} style={{ width: '100%', maxWidth: '810px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div className="letter-page" style={outerPageStyle}>
        {/* Letterhead */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 58px' }}>
            <img
              src={logoImg}
              alt={`${company} logo`}
              style={{ width: '100%', maxWidth: 608, height: 'auto', objectFit: 'contain', display: 'block' }}
              onError={(e) => {
                e.target.src = atmLogoImg;
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: 4,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            <span>Phone: {d.phone || '+91 80199-42233'}</span>
            <span>
              Email:{' '}
              <a
                href={`mailto:${d.email || 'hr@aotms.com'}`}
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                {d.email || 'hr@aotms.com'}
              </a>
            </span>
          </div>
          <div style={{ borderTop: '1px solid #9ca3af', marginTop: 10 }} />
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginTop: 58 }}>
            <span
              style={{
                fontSize: '27px',
                fontWeight: 400,
                textDecoration: 'underline',
                color: '#000000',
                letterSpacing: '0.5px',
              }}
            >
              {d.letter_title || 'EXPERIENCE LETTER'}
            </span>
          </div>

          {/* Date */}
          <div style={{ textAlign: 'right', fontSize: 16, color: '#000000', marginTop: 54 }}>
            <span style={{ fontWeight: 700 }}>Date:</span> {d.letter_date || todayLong()}
          </div>

          {/* Addressee */}
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 86 }}>
            {d.addressee || 'To Whom It May Concern'}
          </div>

          {/* Body copy */}
          <div style={{ textAlign: 'justify', marginTop: 22 }}>
            <p style={{ margin: '0 0 16px 0' }}>
              This is to certify that{' '}
              <span style={{ fontWeight: 700 }}>{`${honorific} ${employeeName}`.replace(/\s+/g, ' ').trim()}</span> was
              associated with <span style={{ fontWeight: 700 }}>{company}</span> as {articleFor(designation)}{' '}
              <span style={{ fontWeight: 700 }}>{designation}</span> from{' '}
              <span style={{ fontWeight: 700 }}>{`${joiningDate} to ${relievingDate}`}</span>
              {tenure ? `, completing a total tenure of ` : ''}
              {tenure ? <span style={{ fontWeight: 700 }}>{tenure}</span> : null}.
            </p>

            <p style={{ margin: '0 0 16px 0' }}>{conductNote}</p>
            <p style={{ margin: 0 }}>{closingNote}</p>
          </div>

          {/* Sign-off */}
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 16 }}>Sincerely,</div>

            <div style={{ position: 'relative', width: 84, height: 84, margin: '6px 0 4px' }}>
              <img
                src={aotmsStampImg}
                alt="AOTMS Stamp"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 84,
                  height: 84,
                  maxWidth: 'none',
                  objectFit: 'contain',
                  opacity: 0.85,
                }}
              />
              {/* Layered twice so the pen strokes stay readable where they cross the seal */}
              {[0, 1].map((layer) => (
                <img
                  key={layer}
                  src={signatureImg}
                  alt={layer === 0 ? 'Authorised signature' : ''}
                  aria-hidden={layer === 1}
                  style={{
                    position: 'absolute',
                    left: -53,
                    top: 8,
                    width: 230,
                    height: 'auto',
                    maxWidth: 'none',
                    objectFit: 'contain',
                    mixBlendMode: 'multiply',
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </div>

            <div style={{ fontSize: 16, fontWeight: 700 }}>{d.signatory_designation || 'HR Manager'}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{company}</div>
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

  const computedTenure = computeTenure(form.joining_date, form.relieving_date);

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

  const handleDownloadPDF = async (targetRef = printRef, label = form.employee_name) => {
    if (!targetRef.current) return;
    setDownloadingPdf(true);
    try {
      const pages = targetRef.current.querySelectorAll('.letter-page');
      if (!pages || pages.length === 0) return;

      const cleanName = (label || 'Employee').replace(/[^a-zA-Z0-9]+/g, '_');
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
            Issue experience certificates and download A4 PDF documents.
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
              title="Fill the sample experience letter details"
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
                <Field
                  label="Addressee"
                  value={form.addressee}
                  onChange={set('addressee')}
                  placeholder="To Whom It May Concern"
                />
                <Field label="Issuing Organisation" value={form.company_name} onChange={set('company_name')} />
                <Field label="Contact Phone" value={form.phone} onChange={set('phone')} />
                <Field label="Contact Email" value={form.email} onChange={set('email')} />
              </div>
            </div>

            {/* Employee */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Employee
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field
                  label="Employee Name"
                  value={form.employee_name}
                  onChange={set('employee_name')}
                  placeholder="e.g. Prabhu Varun"
                  required
                />
                <Field
                  label="Honorific"
                  value={form.honorific}
                  onChange={set('honorific')}
                  placeholder="Mr. / Ms. / Mrs."
                />
                <Select
                  label="Gender"
                  value={form.gender}
                  onChange={set('gender')}
                  options={[
                    { value: 'male', label: 'Male (he / him)' },
                    { value: 'female', label: 'Female (she / her)' },
                  ]}
                />
                <Field
                  label="Designation / Role"
                  value={form.designation}
                  onChange={set('designation')}
                  placeholder="e.g. AI Associate"
                />
              </div>
            </div>

            {/* Association & content */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Association &amp; Content
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label="Date of Joining"
                  value={form.joining_date}
                  onChange={set('joining_date')}
                  placeholder="e.g. 19 June 2026"
                />
                <Field
                  label="Last Working Day"
                  value={form.relieving_date}
                  onChange={set('relieving_date')}
                  placeholder="e.g. 05 September 2026"
                />
                <Field
                  label="Total Tenure"
                  value={form.tenure}
                  onChange={set('tenure')}
                  placeholder={computedTenure || 'e.g. 2 months and 17 days'}
                  help={computedTenure ? `Auto-calculated: ${computedTenure}` : 'Auto-calculated from the dates above'}
                />
              </div>
              <TextArea
                label="Tenure & Conduct Paragraph"
                value={form.conduct_note}
                onChange={set('conduct_note')}
                rows={3}
                placeholder="Leave blank for the standard wording built from the employee's pronouns."
              />
              <TextArea
                label="Appreciation Paragraph"
                value={form.closing_note}
                onChange={set('closing_note')}
                rows={2}
                placeholder="Leave blank for the standard wording built from the employee's pronouns."
              />
            </div>

            {/* Signatory */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Signatory
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Signatory Designation"
                  value={form.signatory_designation}
                  onChange={set('signatory_designation')}
                  placeholder="e.g. HR Manager"
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
                placeholder="Search by employee, role..."
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
                    <th className="text-left px-4 py-3 font-semibold">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold">Designation</th>
                    <th className="text-left px-4 py-3 font-semibold">Letter Date</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{rec.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{rec.employee_name || rec.recipient_name || '—'}</td>
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
                {selectedRecord.employee_name || selectedRecord.recipient_name}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedRecord.employee_name || selectedRecord.recipient_name)}
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
