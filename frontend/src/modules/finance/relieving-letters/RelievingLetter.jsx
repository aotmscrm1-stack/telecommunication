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
  LogOut,
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
import signatureImg from '../../../assets/deenaz-signature.png';

const DOC_TYPE = 'relieving';

const todayLong = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

const DEFAULT_RELIEVING_LETTER = {
  doc_type: DOC_TYPE,
  letter_title: 'RELIEVING LETTER',
  letter_date: todayLong(),
  addressee: 'To Whom It May Concern',
  employee_name: '',
  honorific: 'Mr.',
  gender: 'male',
  designation: '',
  joining_date: '',
  relieving_date: '',
  company_name: 'Academy of Tech Masters',
  remarks: '',
  signatory_name: 'Deenaz Shaik',
  signatory_designation: 'HR Manager',
  signatory_contact: 'AOTMS',
  phone: '8019942233',
  email: 'hr@aotms.com',
  notes: '',
};

// Sample mirrors "Relieving letter format.docx"
const SAMPLE_RELIEVING_LETTER = {
  doc_type: DOC_TYPE,
  letter_title: 'RELIEVING LETTER',
  letter_date: '08 September 2026',
  addressee: 'To Whom It May Concern',
  employee_name: 'P Prabhu Varun',
  honorific: 'Mr.',
  gender: 'male',
  designation: 'AI Associate',
  joining_date: '19 June 2026',
  relieving_date: '05 September 2026',
  company_name: 'Academy of Tech Masters',
  remarks: '',
  signatory_name: 'Deenaz Shaik',
  signatory_designation: 'HR Manager',
  signatory_contact: 'AOTMS',
  phone: '8019942233',
  email: 'hr@aotms.com',
  notes: 'Sample relieving letter generated for the associate.',
};

const PRONOUNS = {
  male: { subj: 'he', obj: 'him', poss: 'his' },
  female: { subj: 'she', obj: 'her', poss: 'her' },
};

// "an AI Associate" / "an HR Manager" but "a Trainer"
const articleFor = (word = '') => (/^(?:[aeiou]|hr\b)/i.test(String(word).trim()) ? 'an' : 'a');

const Field = ({ label, value, onChange, type = 'text', placeholder, required, help }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-y"
    />
  </div>
);

// ── Relieving Letter Document (single A4 page) ───────────────────────────────
export const RelievingLetterDocument = forwardRef(({ invoiceData = {}, isPreview = false }, ref) => {
  const d = invoiceData || {};
  const company = d.company_name || 'Academy of Tech Masters';
  const employeeName = (d.employee_name || '').trim() || 'Employee Name';
  const honorific = (d.honorific || '').trim();
  const tokens = employeeName.split(/\s+/);
  const shortName = tokens.length > 2 ? tokens.slice(-2).join(' ') : employeeName;
  const designation = d.designation || 'Associate';
  const joiningDate = d.joining_date || '—';
  const relievingDate = d.relieving_date || '—';
  const p = PRONOUNS[d.gender === 'female' ? 'female' : 'male'];

  const outerPageStyle = {
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: "'Inter', sans-serif",
    fontSize: '12.5px',
    lineHeight: '1.6',
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
              <span>Phone: {d.phone || '8019942233'}</span>
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
              {d.letter_title || 'RELIEVING LETTER'}
            </span>
          </div>

          {/* Date */}
          <div style={{ textAlign: 'right', fontSize: 12, color: '#111827', marginBottom: 10 }}>
            Date: {d.letter_date || todayLong()}
          </div>

          {/* Addressee */}
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>{d.addressee || 'To Whom It May Concern'}</div>

          {/* Body */}
          <div style={{ textAlign: 'justify', color: '#111827' }}>
            <p style={{ margin: '0 0 10px 0' }}>
              This is to certify that {honorific} {employeeName} was employed with {company} as {articleFor(designation)}{' '}
              {designation} from {joiningDate} to {relievingDate}.
            </p>

            <p style={{ margin: '0 0 10px 0' }}>
              We hereby confirm that {honorific} {shortName} has been formally relieved from {p.poss} duties and
              responsibilities with {company}, effective {relievingDate}.
            </p>

            <p style={{ margin: '0 0 10px 0' }}>
              During {p.poss} tenure with the organization, {p.subj} performed {p.poss} assigned responsibilities with
              dedication and contributed to the best of {p.poss} abilities. We appreciate {p.poss} efforts and
              contributions during {p.poss} association with us.
            </p>

            {d.remarks && <p style={{ margin: '0 0 10px 0' }}>{d.remarks}</p>}

            <p style={{ margin: '0 0 10px 0' }}>
              We wish {p.obj} continued success and all the very best in {p.poss} future professional endeavors.
            </p>
          </div>

          {/* Sign-off */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>For {company}</div>

            <div
              style={{
                position: 'relative',
                margin: '6px 0 2px',
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
            {d.signatory_contact && <div style={{ fontSize: 11.5, color: '#475569' }}>{d.signatory_contact}</div>}
            {d.phone && <div style={{ fontSize: 11.5, color: '#475569' }}>{d.phone}</div>}
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
            <span>{d.letter_title || 'Relieving Letter'}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Relieving Letter Generator ───────────────────────────────────────────────
export default function RelievingLetter() {
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_RELIEVING_LETTER);
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
      console.error('Failed to load relieving letters:', err);
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
      return `AOTMS-REL-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
    } catch {
      return `AOTMS-REL-${year}-${String(Date.now()).slice(-4)}`;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const docNumber = await buildDocNumber();
      await invoicesAPI.create({ ...form, doc_type: DOC_TYPE, invoice_number: docNumber });
      flash(setSuccessMessage, `Relieving letter saved to records as ${docNumber}.`);
      if (activeTab === 'history') await loadHistory();
    } catch (err) {
      flash(setErrorMessage, err.response?.data?.message || 'Failed to save relieving letter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this relieving letter record?')) return;
    try {
      await invoicesAPI.delete(id);
      await loadHistory();
    } catch {
      alert('Failed to delete relieving letter record');
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
      pages.forEach((pg, idx) => {
        originalShadows[idx] = pg.style.boxShadow;
        originalMargins[idx] = pg.style.marginBottom;
        pg.style.boxShadow = 'none';
        pg.style.marginBottom = '0px';
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
        pdf.save(`AOTMS_Relieving_Letter_${cleanName}.pdf`);
      } finally {
        pages.forEach((pg, idx) => {
          pg.style.boxShadow = originalShadows[idx];
          pg.style.marginBottom = originalMargins[idx];
        });
      }
      flash(setSuccessMessage, 'Relieving letter PDF downloaded successfully.');
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
            <span style={{ padding: 8, borderRadius: 10, background: '#eef2ff', color: '#4338ca', display: 'flex' }}>
              <LogOut size={24} />
            </span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Relieving Letter</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Issue relieving / experience certificates on exit and download A4 PDF documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'create' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Builder
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Records ({history.length})
            </button>
          </div>

          {activeTab === 'create' && (
            <button
              type="button"
              onClick={() => setForm(SAMPLE_RELIEVING_LETTER)}
              className="px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 rounded-xl flex items-center gap-1.5 transition-all"
              title="Fill the sample relieving letter details"
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
            {/* Employee details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Employee Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label="Employee Name"
                  value={form.employee_name}
                  onChange={set('employee_name')}
                  placeholder="e.g. P Prabhu Varun"
                  required
                />
                <Field
                  label="Honorific"
                  value={form.honorific}
                  onChange={set('honorific')}
                  placeholder="Mr. / Ms. / Mrs."
                />
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Pronouns</label>
                  <select
                    value={form.gender}
                    onChange={(e) => set('gender')(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="male">He / His / Him</option>
                    <option value="female">She / Her / Her</option>
                  </select>
                </div>
                <Field label="Designation" value={form.designation} onChange={set('designation')} />
                <Field
                  label="Date of Joining"
                  value={form.joining_date}
                  onChange={set('joining_date')}
                  placeholder="e.g. 19 June 2026"
                />
                <Field
                  label="Date of Relieving"
                  value={form.relieving_date}
                  onChange={set('relieving_date')}
                  placeholder="e.g. 05 September 2026"
                />
              </div>
            </div>

            {/* Letter details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Letter Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Document Title" value={form.letter_title} onChange={set('letter_title')} required />
                <Field label="Letter Date" value={form.letter_date} onChange={set('letter_date')} />
                <Field label="Addressee" value={form.addressee} onChange={set('addressee')} />
                <Field label="Issuing Organisation" value={form.company_name} onChange={set('company_name')} />
                <Field label="Contact Phone" value={form.phone} onChange={set('phone')} />
                <Field label="Contact Email" value={form.email} onChange={set('email')} />
              </div>
              <TextArea
                label="Additional Remarks (optional)"
                value={form.remarks}
                onChange={set('remarks')}
                rows={2}
                placeholder="Any additional paragraph to include before the closing wish."
              />
            </div>

            {/* Signatory */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
                Signatory
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Signatory Name" value={form.signatory_name} onChange={set('signatory_name')} />
                <Field
                  label="Signatory Designation"
                  value={form.signatory_designation}
                  onChange={set('signatory_designation')}
                />
                <Field label="Signatory Contact Line" value={form.signatory_contact} onChange={set('signatory_contact')} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
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
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
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
                <RelievingLetterDocument ref={printRef} invoiceData={form} isPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Saved Relieving Letters</h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee, role..."
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
              />
            </div>
          </div>

          {loadingHistory && <div className="text-center py-10 text-slate-400 text-sm">Loading records…</div>}

          {!loadingHistory && history.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FileText size={48} className="mx-auto text-slate-300 mb-3" />
              <div className="text-base font-semibold text-slate-700">No Saved Relieving Letters Found</div>
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
                    <th className="text-left px-4 py-3 font-semibold">Relieved On</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{rec.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{rec.employee_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.designation || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.relieving_date || '—'}</td>
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
                Relieving Letter: <span className="text-indigo-700">{selectedRecord.invoice_number || 'Draft'}</span> —{' '}
                {selectedRecord.employee_name}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(modalPrintRef, selectedRecord.employee_name)}
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
              <RelievingLetterDocument ref={modalPrintRef} invoiceData={selectedRecord} isPreview={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
