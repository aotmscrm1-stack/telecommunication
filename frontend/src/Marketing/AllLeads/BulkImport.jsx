import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { campaignsAPI, usersAPI } from '../../services/api';
import api from '../../services/api';
import {
  FiUploadCloud, FiUpload, FiDownload, FiCheck, FiCheckCircle,
  FiAlertCircle, FiAlertTriangle, FiInfo, FiTrash2, FiEdit3,
  FiEye, FiArrowLeft, FiArrowRight, FiUsers, FiPlus, FiX,
  FiRefreshCw, FiSend, FiAward, FiChevronRight, FiDatabase,
  FiLayers, FiFilter
} from 'react-icons/fi';
import { RiFileExcel2Line } from 'react-icons/ri';

// ── Sunset Warm Marketing Palette (Unified with AddLead & AllLeads) ───────────
const O = {
  primary:    '#ff8c42',
  primary3:   '#ffb877',
  deep:       '#e84a10',
  darkest:    '#c23a05',

  bg:         '#fff8f2',
  bgSoft:     '#fff0e8',
  bgSofter:   '#fff5ed',

  line:       '#ffe0cb',
  lineSoft:   '#ffe4d5',

  ink:        '#1f1206',
  inkSoft:    '#6b5546',
  muted:      '#8f7667',

  success:    '#10b981',
  successBg:  '#ecfdf5',
  successLine:'#a7f3d0',

  warning:    '#f59e0b',
  warningBg:  '#fffbeb',
  warningLine:'#fde68a',

  error:      '#ef4444',
  errorBg:    '#fef2f2',
  errorLine:  '#fecaca',

  white:      '#ffffff',
};

// ── UI Components ─────────────────────────────────────────────────────────────
const Step = ({ n, label, active, done }) => (
  <div className="flex items-center gap-2.5">
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: done
          ? O.success
          : active
            ? `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)`
            : O.bgSofter,
        border: `1.5px solid ${done ? O.success : active ? O.deep : O.line}`,
        color: done || active ? '#ffffff' : O.muted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 13,
        flexShrink: 0,
        boxShadow: active ? '0 4px 12px rgba(232, 74, 16, 0.25)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      {done ? <FiCheck className="w-4 h-4 stroke-[3]" /> : n}
    </div>
    <span
      style={{
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        color: active ? O.deep : done ? O.ink : O.muted,
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </span>
  </div>
);

const Divider = ({ active }) => (
  <div
    style={{
      flex: 1,
      height: 2,
      background: active ? O.deep : O.line,
      margin: '0 8px',
      borderRadius: 2,
      opacity: active ? 0.8 : 0.4
    }}
  />
);

const Card = ({ children, style = {}, className = '' }) => (
  <div
    className={`rounded-2xl transition-all duration-200 ${className}`}
    style={{
      background: '#ffffff',
      border: `1px solid ${O.line}`,
      boxShadow: '0 4px 20px -2px rgba(232, 74, 16, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
      padding: 24,
      ...style
    }}
  >
    {children}
  </div>
);

const Btn = ({ children, onClick, disabled, variant = 'primary', style = {}, className = '', type = 'button' }) => {
  const baseStyles = {
    padding: '10px 22px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    opacity: disabled ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
  };

  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)`,
      color: '#ffffff',
      boxShadow: '0 4px 14px rgba(232, 74, 16, 0.28)',
    },
    outline: {
      background: '#ffffff',
      color: O.inkSoft,
      border: `1.5px solid ${O.line}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    danger: {
      background: O.error,
      color: '#ffffff',
      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
    },
    success: {
      background: `linear-gradient(135deg, #10b981 0%, #059669 100%)`,
      color: '#ffffff',
      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyles, ...variants[variant], ...style }}
      className={`hover:brightness-105 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
};

const InfoBox = ({ type = 'info', children }) => {
  const configs = {
    info: {
      bg: O.bgSofter,
      border: O.line,
      color: O.deep,
      icon: <FiInfo className="w-4 h-4 flex-shrink-0" style={{ color: O.deep }} />
    },
    warning: {
      bg: O.warningBg,
      border: O.warningLine,
      color: '#b45309',
      icon: <FiAlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
    },
    error: {
      bg: O.errorBg,
      border: O.errorLine,
      color: '#b91c1c',
      icon: <FiAlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
    },
    success: {
      bg: O.successBg,
      border: O.successLine,
      color: '#047857',
      icon: <FiCheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
    }
  };

  const cfg = configs[type] || configs.info;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 16
      }}
    >
      <span className="mt-0.5">{cfg.icon}</span>
      <div style={{ fontSize: 13, color: cfg.color, fontWeight: 500, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
};

// ── Constants ─────────────────────────────────────────────────────────────────
const SYSTEM_FIELDS = [
  { key: 'name', label: 'Name ★ (Required)', required: true },
  { key: 'phone', label: 'Phone Number ★ (Required)', required: true },
  { key: 'email', label: 'Email ID' },
  { key: 'collegeName', label: 'College / Institution Name' },
  { key: 'alternatePhone', label: 'Alternate Phone' },
  { key: 'status', label: 'Initial Status' },
  { key: 'leadSource', label: 'Lead Source' },
  { key: 'location', label: 'City / Location' },
  { key: 'budget', label: 'Budget' },
  { key: 'lastQualification', label: 'Last Qualification' },
  { key: 'preferredCourses', label: 'Preferred Course' },
  { key: 'nextFollowupDate', label: 'Next Followup Date' },
];

const WIZARD_STEPS = [
  { n: 1, label: 'Sheet Selection' },
  { n: 2, label: 'Field Mapping' },
  { n: 3, label: 'Duplicate Check' },
  { n: 4, label: 'Campaign & List' },
  { n: 5, label: 'Lead Distribution' },
];

function autoMap(columns) {
  const norm = s => s.toLowerCase().replace(/[\s_\-\.]+/g, '');
  const rules = [
    { keys: ['name', 'fullname', 'leadname', 'candidatename'], field: 'name' },
    { keys: ['phone', 'mobile', 'phonenumber', 'mobilenumber', 'contactnumber'], field: 'phone' },
    { keys: ['email', 'emailid', 'emailaddress', 'mail'], field: 'email' },
    { keys: ['collegename', 'college', 'institution', 'instname', 'institutename', 'school', 'university'], field: 'collegeName' },
    { keys: ['alternatephone', 'altphone', 'altmobile', 'phone2'], field: 'alternatePhone' },
    { keys: ['status', 'leadstatus'], field: 'status' },
    { keys: ['leadsource', 'source'], field: 'leadSource' },
    { keys: ['location', 'city', 'place'], field: 'location' },
    { keys: ['budget'], field: 'budget' },
    { keys: ['qualification', 'lastqualification', 'education'], field: 'lastQualification' },
    { keys: ['courses', 'preferredcourses', 'course', 'courseinterest'], field: 'preferredCourses' },
  ];
  const mapping = {};
  for (const col of columns) {
    const n = norm(col);
    const match = rules.find(r => r.keys.includes(n));
    mapping[col] = match ? match.field : '';
  }
  return mapping;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function BulkImport() {
  const navigate = useNavigate();
  const fileRef = useRef();

  // Wizard state
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [callers, setCallers] = useState([]);

  // Browser history back preservation
  const poppingRef = useRef(false);
  useEffect(() => {
    window.history.replaceState({ step: 0 }, '');
    const onPopState = (e) => {
      poppingRef.current = true;
      setStep(typeof e.state?.step === 'number' ? e.state.step : 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (poppingRef.current) { poppingRef.current = false; return; }
    window.history.pushState({ step }, '');
  }, [step]);

  // Step 1
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loadingSheet, setLoadingSheet] = useState(false);

  // Step 2
  const [fieldMapping, setFieldMapping] = useState({});
  const [customLabels, setCustomLabels] = useState({});
  const [confirmedCustom, setConfirmedCustom] = useState({});
  const [savedCustomFields, setSavedCustomFields] = useState([]);
  const [dupCheckField, setDupCheckField] = useState('phone');

  // Step 3
  const [dupSummary, setDupSummary] = useState(null);
  const [loadingDup, setLoadingDup] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState('skip');

  // Step 4
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Step 5
  const [selectedCallers, setSelectedCallers] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Import leads view
  const [viewingImport, setViewingImport] = useState(null);
  const [importLeads, setImportLeads] = useState([]);
  const [importLeadsTotal, setImportLeadsTotal] = useState(0);
  const [importLeadsPage, setImportLeadsPage] = useState(1);
  const [loadingImportLeads, setLoadingImportLeads] = useState(false);

  // Edit import modal
  const [editImport, setEditImport] = useState(null);
  const [editCampaign, setEditCampaign] = useState('');
  const [editCallers, setEditCallers] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    campaignsAPI.getAll().then(r => setCampaigns(r.data.campaigns || [])).catch(console.error);
    usersAPI.getAll().then(r => {
      const all = r.data.users || [];
      setCallers(all.filter(u => u.role === 'employee' || u.role === 'caller' || u.role === 'admin' || u.role === 'manager'));
    }).catch(console.error);
    loadHistory(1);
    api.get('/lead-fields').then(r => setSavedCustomFields((r.data.fields || []).map(f => f.name))).catch(console.error);
  }, []);

  const loadHistory = async (page = 1) => {
    setLoadingHistory(true);
    try {
      const r = await api.get(`/bulk-import/history?page=${page}&limit=10`);
      setHistory(r.data.records || []);
      setHistoryTotal(r.data.total || 0);
      setHistoryPage(page);
    } catch (e) {
      console.error(e);
    }
    setLoadingHistory(false);
  };

  // ── File Handling ──────────────────────────────────────────────────────────
  const handleFile = async (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload an Excel (.xlsx, .xls) or CSV file');
      return;
    }
    setFile(f);
    setLoadingSheet(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await api.post('/bulk-import/parse-file', fd);
      setSheetNames(r.data.sheetNames || []);
      setSelectedSheet(r.data.defaultSheet || '');
      setColumns(r.data.columns || []);
      setPreview(r.data.preview || []);
      setTotalRows(r.data.totalRows || 0);
      setFieldMapping(autoMap(r.data.columns || []));
      setCustomLabels({});
      setStep(1);
    } catch (e) {
      alert('Failed to parse file: ' + (e.response?.data?.message || e.message));
    }
    setLoadingSheet(false);
  };

  const handleSheetChange = async (name) => {
    setSelectedSheet(name);
    if (!file || !name) return;
    setLoadingSheet(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sheetName', name);
      const r = await api.post('/bulk-import/select-sheet', fd);
      setColumns(r.data.columns || []);
      setPreview(r.data.preview || []);
      setTotalRows(r.data.totalRows || 0);
      setFieldMapping(autoMap(r.data.columns || []));
      setCustomLabels({});
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
    setLoadingSheet(false);
  };

  // Build the final fieldMapping
  const buildFinalMapping = () => {
    const final = {};
    for (const [col, val] of Object.entries(fieldMapping)) {
      if (val === '__other__') {
        const label = (customLabels[col] || '').trim();
        if (label) final[col] = `custom__${label}`;
        else final[col] = '__ignore__';
      } else if (val && val.startsWith('__custom__')) {
        final[col] = `custom__${val.slice(10)}`;
      } else {
        final[col] = val;
      }
    }
    return final;
  };

  // ── Step Navigation ────────────────────────────────────────────────────────
  const goToStep2 = () => {
    if (!selectedSheet) { alert('Please select a sheet'); return; }
    setStep(2);
  };

  const goToStep3 = async () => {
    const finalMapping = buildFinalMapping();
    const mappedFields = Object.values(finalMapping).filter(Boolean);
    if (!mappedFields.includes('name')) { alert('Please map the Name column'); return; }
    if (!mappedFields.includes('phone')) { alert('Please map the Phone Number column'); return; }
    setLoadingDup(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sheetName', selectedSheet);
      fd.append('fieldMapping', JSON.stringify(finalMapping));
      const r = await api.post('/bulk-import/check-duplicates', fd);
      setDupSummary(r.data);
      setStep(3);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
    setLoadingDup(false);
  };

  const goToStep4 = () => setStep(4);
  const goToStep5 = () => {
    if (!selectedCampaign) { alert('Please select a campaign'); return; }
    setStep(5);
  };

  // ── Create Campaign ────────────────────────────────────────────────────────
  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) { alert('Enter campaign name'); return; }
    setCreatingCampaign(true);
    try {
      const r = await api.post('/campaigns', {
        name: newCampaignName.trim(),
        description: 'Created from bulk import'
      });
      const created = r.data.campaign || r.data;
      setCampaigns(prev => [created, ...prev]);
      setSelectedCampaign(created._id);
      setNewCampaignName('');
      setShowNewCampaign(false);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
    setCreatingCampaign(false);
  };

  // ── Caller Distribution ────────────────────────────────────────────────────
  const distributeEvenly = (list) => {
    if (!list.length) { setSelectedCallers([]); return; }
    const base = Math.floor(100 / list.length), rem = 100 - base * list.length;
    setSelectedCallers(list.map((c, i) => ({ ...c, pct: base + (i === list.length - 1 ? rem : 0) })));
  };

  const handleAddCaller = (id) => {
    if (!id || selectedCallers.find(c => c.id === id)) return;
    const u = callers.find(c => c._id === id);
    if (!u) return;
    distributeEvenly([...selectedCallers, { id, name: u.name, pct: 0 }]);
  };

  const handleRemoveCaller = (id) => distributeEvenly(selectedCallers.filter(c => c.id !== id));
  const handlePctChange = (id, val) => setSelectedCallers(prev => prev.map(c => c.id === id ? { ...c, pct: parseInt(val) || 0 } : c));
  const totalPct = selectedCallers.reduce((s, c) => s + c.pct, 0);

  // ── Execute Import ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (totalPct !== 100) {
      alert(`Percentages must total 100% (currently ${totalPct}%)`);
      return;
    }
    setImporting(true);
    try {
      const finalMapping = buildFinalMapping();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sheetName', selectedSheet);
      fd.append('fieldMapping', JSON.stringify(finalMapping));
      fd.append('campaignId', selectedCampaign);
      fd.append('duplicateHandling', duplicateHandling);
      fd.append('importName', file.name);
      fd.append('callerAssignments', JSON.stringify(selectedCallers.map(c => ({ callerId: c.id, pct: c.pct }))));
      const r = await api.post('/bulk-import/import', fd);
      setResult(r.data);
      setStep(6);
      loadHistory(1);
    } catch (e) {
      alert('Import failed: ' + (e.response?.data?.message || e.message));
    }
    setImporting(false);
  };

  const resetWizard = () => {
    setStep(0);
    setFile(null);
    setSheetNames([]);
    setSelectedSheet('');
    setColumns([]);
    setPreview([]);
    setTotalRows(0);
    setFieldMapping({});
    setCustomLabels({});
    setDupSummary(null);
    setSelectedCampaign('');
    setSelectedCallers([]);
    setResult(null);
    setViewingImport(null);
    setImportLeads([]);
    setShowNewCampaign(false);
    setNewCampaignName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── View Import Leads ──────────────────────────────────────────────────────
  const viewImportLeads = async (record, page = 1) => {
    setViewingImport(record);
    setLoadingImportLeads(true);
    try {
      const r = await api.get(`/bulk-import/history/${record._id}/leads?page=${page}&limit=100`);
      setImportLeads(r.data.leads || []);
      setImportLeadsTotal(r.data.total || 0);
      setImportLeadsPage(page);
    } catch (e) {
      console.error(e);
    }
    setLoadingImportLeads(false);
  };

  // ── Delete Import ──────────────────────────────────────────────────────────
  const handleDeleteImport = async (record) => {
    if (!confirm(`Delete import "${record.importName || record.fileName}" and all ${record.importedRecords || 0} leads? This cannot be undone.`)) return;
    try {
      await api.delete(`/bulk-import/history/${record._id}`);
      loadHistory(historyPage);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  // ── Edit Import ────────────────────────────────────────────────────────────
  const openEditImport = (record) => {
    setEditImport(record);
    setEditCampaign(record.campaign?._id || '');
    const existing = (record.callerAssignments || []).map(ca => ({ id: ca.callerId, name: ca.callerName, pct: ca.pct }));
    setEditCallers(existing);
  };

  const handleEditAddCaller = (id) => {
    if (!id || editCallers.find(c => c.id === id)) return;
    const u = callers.find(c => c._id === id);
    if (!u) return;
    const list = [...editCallers, { id, name: u.name, pct: 0 }];
    const base = Math.floor(100 / list.length), rem = 100 - base * list.length;
    setEditCallers(list.map((c, i) => ({ ...c, pct: base + (i === list.length - 1 ? rem : 0) })));
  };

  const handleEditRemoveCaller = (id) => {
    const list = editCallers.filter(c => c.id !== id);
    const base = Math.floor(100 / list.length) || 0, rem = 100 - base * list.length;
    setEditCallers(list.map((c, i) => ({ ...c, pct: base + (i === list.length - 1 ? rem : 0) })));
  };

  const editTotalPct = editCallers.reduce((s, c) => s + c.pct, 0);

  const handleSaveEdit = async () => {
    if (editTotalPct !== 100 && editCallers.length) {
      alert(`Percentages must total 100% (got ${editTotalPct}%)`);
      return;
    }
    setSavingEdit(true);
    try {
      await api.put(`/bulk-import/history/${editImport._id}`, {
        ...(editCampaign ? { campaignId: editCampaign } : {}),
        ...(editCallers.length ? { callerAssignments: editCallers.map(c => ({ callerId: c.id, pct: c.pct })) } : {}),
      });
      setEditImport(null);
      loadHistory(historyPage);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
    setSavingEdit(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: VIEW IMPORTED LEADS
  // ─────────────────────────────────────────────────────────────────────────────
  if (viewingImport) {
    const allCustomKeys = [...new Set(importLeads.flatMap(l => Object.keys(l.customFields || {})))];
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewingImport(null)}
              className="p-2.5 rounded-xl border transition-colors hover:bg-orange-50"
              style={{ borderColor: O.line, color: O.deep }}
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold" style={{ color: O.ink }}>
                  {viewingImport.importName || viewingImport.fileName}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: O.bgSoft, color: O.deep }}>
                  {importLeadsTotal} Leads
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Uploaded {new Date(viewingImport.createdAt).toLocaleString()} · Campaign: <strong style={{ color: O.deep }}>{viewingImport.campaign?.name || 'Unassigned'}</strong>
              </p>
            </div>
          </div>
          <Btn onClick={() => setViewingImport(null)} variant="outline">
            Done Viewing
          </Btn>
        </div>

        {loadingImportLeads ? (
          <Card className="text-center py-16">
            <FiRefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: O.deep }} />
            <p className="text-sm font-medium text-stone-500">Retrieving leads data...</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr style={{ background: O.bgSofter, borderBottom: `1px solid ${O.line}` }}>
                    {['Name', 'Phone Number', 'Email', 'College / Inst.', 'Status', 'Assigned Caller', ...allCustomKeys.slice(0, 3)].map(h => (
                      <th key={h} className="py-3.5 px-4 font-bold uppercase tracking-wider" style={{ color: O.inkSoft }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: O.lineSoft }}>
                  {importLeads.map((l, i) => (
                    <tr key={l._id} className="hover:bg-orange-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold" style={{ color: O.ink }}>{l.name}</td>
                      <td className="py-3 px-4 font-mono text-stone-600">{l.phone}</td>
                      <td className="py-3 px-4 text-stone-600">{l.email || '—'}</td>
                      <td className="py-3 px-4 text-stone-600">{l.collegeName || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ background: O.bgSoft, color: O.deep }}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-700">{l.assignedTo?.name || '—'}</td>
                      {allCustomKeys.slice(0, 3).map(k => (
                        <td key={k} className="py-3 px-4 text-stone-500 max-w-[140px] truncate">{l.customFields?.[k] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                  {!importLeads.length && (
                    <tr>
                      <td colSpan={6 + allCustomKeys.slice(0, 3).length} className="py-16 text-center text-stone-400 font-medium">
                        No leads found in this import batch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {importLeadsTotal > 100 && (
              <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
                <span className="text-xs text-stone-500 font-medium">
                  Showing {((importLeadsPage - 1) * 100) + 1}–{Math.min(importLeadsPage * 100, importLeadsTotal)} of {importLeadsTotal} leads
                </span>
                <div className="flex gap-2">
                  {importLeadsPage > 1 && (
                    <Btn onClick={() => viewImportLeads(viewingImport, importLeadsPage - 1)} variant="outline" style={{ padding: '6px 14px' }}>
                      <FiArrowLeft className="w-3.5 h-3.5" /> Prev
                    </Btn>
                  )}
                  {importLeadsPage * 100 < importLeadsTotal && (
                    <Btn onClick={() => viewImportLeads(viewingImport, importLeadsPage + 1)} variant="primary" style={{ padding: '6px 14px' }}>
                      Next <FiArrowRight className="w-3.5 h-3.5" />
                    </Btn>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: SUCCESS SCREEN (STEP 6)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 6 && result) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Card className="text-center p-8 space-y-6">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: O.successBg, border: `1.5px solid ${O.successLine}` }}
          >
            <FiAward className="w-8 h-8 text-emerald-600" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-emerald-600">Import Complete!</h2>
            <p className="text-sm text-stone-500 mt-1">
              Campaign: <strong style={{ color: O.ink }}>{result.campaignName}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Rows', value: result.total, color: O.ink, bg: O.bgSofter },
              { label: 'Imported', value: result.imported, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Skipped', value: result.skipped, color: '#d97706', bg: '#fffbeb' },
              { label: 'Errors', value: result.errors, color: '#dc2626', bg: '#fef2f2' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl border border-stone-200/60" style={{ background: s.bg }}>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold text-stone-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {result.callerBreakdown?.length > 0 && (
            <div className="text-left space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Lead Distribution Summary</h4>
              <div className="space-y-1.5">
                {result.callerBreakdown.map(cb => (
                  <div key={cb.callerId} className="flex justify-between items-center p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs">
                    <span className="font-bold" style={{ color: O.ink }}>{cb.callerName}</span>
                    <span className="font-semibold text-stone-600">{cb.count} leads ({cb.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <InfoBox type="success">
            Automatic notifications have been dispatched to all assigned callers.
          </InfoBox>

          <div className="flex gap-3 justify-center pt-2">
            <Btn onClick={resetWizard} variant="outline">
              Import Another Sheet
            </Btn>
            <Btn onClick={() => navigate('/leads')} variant="primary">
              View All Leads
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: LANDING / UPLOAD ZONE / HISTORY (STEP 0)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: O.deep }}>
              <RiFileExcel2Line className="w-4 h-4" /> Marketing Lead Ingestion
            </div>
            <h1 className="text-2xl md:text-3xl font-black mt-1" style={{ color: O.ink }}>
              Bulk Import Leads
            </h1>
            <p className="text-xs md:text-sm text-stone-500 mt-1">
              Upload spreadsheets, auto-map columns, remove duplicates, and distribute to your team in minutes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/bulk-import/template"
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-orange-50 transition-colors shadow-sm"
              style={{ borderColor: O.line, color: O.deep, background: '#ffffff' }}
            >
              <FiDownload className="w-4 h-4" /> Download Sample .XLSX
            </a>
            <Btn onClick={() => fileRef.current?.click()}>
              <FiUpload className="w-4 h-4" /> Select File
            </Btn>
          </div>
        </div>

        {/* Upload Zone */}
        <Card className="p-8">
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl p-10 md:p-14 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center border-2 border-dashed"
            style={{
              borderColor: dragOver ? O.deep : O.primary,
              background: dragOver ? O.bgSoft : O.bgSofter,
              transform: dragOver ? 'scale(1.008)' : 'scale(1)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm"
              style={{ background: '#ffffff', border: `1.5px solid ${O.line}` }}
            >
              <FiUploadCloud className="w-8 h-8" style={{ color: O.deep }} />
            </div>

            <p className="text-base font-bold" style={{ color: O.ink }}>
              {loadingSheet ? 'Parsing file structure...' : 'Click to browse or drag & drop your spreadsheet here'}
            </p>
            <p className="text-xs text-stone-500 mt-1.5 mb-6">
              Supported formats: <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> (Up to 100MB and 100,000 rows)
            </p>

            <div className="flex items-center gap-3">
              <Btn
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                disabled={loadingSheet}
                variant="primary"
              >
                {loadingSheet ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiUpload className="w-4 h-4" />}
                {loadingSheet ? 'Reading file...' : 'Choose File from Computer'}
              </Btn>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </Card>

        {/* History Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: O.bgSoft, border: `1px solid ${O.line}` }}
              >
                <FiDatabase className="w-5 h-5" style={{ color: O.deep }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: O.ink }}>Import History</h3>
                <p className="text-xs text-stone-500">Track and manage previous spreadsheet uploads</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: O.bgSoft, color: O.deep }}>
              {historyTotal} Batches
            </span>
          </div>

          {loadingHistory ? (
            <div className="text-center py-12 text-stone-400">
              <FiRefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
              <p className="text-xs font-medium">Loading history...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr style={{ background: O.bgSofter, borderBottom: `1px solid ${O.line}` }}>
                    {['Batch Name', 'File Name', 'Date', 'Campaign', 'Uploaded By', 'Leads', 'Status', 'Actions'].map(h => (
                      <th key={h} className="py-3 px-3.5 font-bold uppercase tracking-wider" style={{ color: O.inkSoft }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: O.lineSoft }}>
                  {history.map((rec) => (
                    <tr key={rec._id} className="hover:bg-orange-50/40 transition-colors">
                      <td className="py-3.5 px-3.5 font-bold" style={{ color: O.ink }}>
                        {rec.importName || rec.fileName}
                      </td>
                      <td className="py-3.5 px-3.5 text-stone-500 font-mono max-w-[150px] truncate" title={rec.fileName}>
                        {rec.fileName}
                      </td>
                      <td className="py-3.5 px-3.5 text-stone-500 whitespace-nowrap">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-3.5 font-medium text-stone-700">
                        {rec.campaign?.name || '—'}
                      </td>
                      <td className="py-3.5 px-3.5 text-stone-600">
                        {rec.uploadedBy?.name || '—'}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <button
                          onClick={() => viewImportLeads(rec)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-transform hover:scale-105"
                          style={{ background: O.bgSoft, color: O.deep }}
                        >
                          <FiUsers className="w-3.5 h-3.5" />
                          {rec.importedRecords ?? '0'}
                        </button>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 capitalize"
                          style={{
                            background: rec.status === 'completed' ? '#ecfdf5' : rec.status === 'failed' ? '#fef2f2' : '#fffbeb',
                            color: rec.status === 'completed' ? '#059669' : rec.status === 'failed' ? '#dc2626' : '#d97706',
                            border: `1px solid ${rec.status === 'completed' ? '#a7f3d0' : rec.status === 'failed' ? '#fecaca' : '#fde68a'}`
                          }}
                        >
                          {rec.status === 'completed' ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => viewImportLeads(rec)}
                            title="View Leads"
                            className="p-1.5 rounded-lg border hover:bg-orange-50 transition-colors"
                            style={{ borderColor: O.line, color: O.deep }}
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditImport(rec)}
                            title="Reassign / Edit"
                            className="p-1.5 rounded-lg border hover:bg-amber-50 text-amber-600 border-amber-200 transition-colors"
                          >
                            <FiEdit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteImport(rec)}
                            title="Delete Batch"
                            className="p-1.5 rounded-lg border hover:bg-red-50 text-red-600 border-red-200 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!history.length && (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-stone-400 font-medium">
                        No previous imports found. Upload your first spreadsheet above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {historyTotal > 10 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: Math.ceil(historyTotal / 10) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => loadHistory(p)}
                  className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    background: p === historyPage ? O.deep : '#ffffff',
                    color: p === historyPage ? '#ffffff' : O.ink,
                    border: `1px solid ${p === historyPage ? O.deep : O.line}`
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Edit Modal */}
        {editImport && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border"
              style={{ borderColor: O.line }}
            >
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: O.lineSoft }}>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: O.ink }}>Edit Batch & Reassign</h3>
                  <p className="text-xs text-stone-500">{editImport.importName || editImport.fileName}</p>
                </div>
                <button onClick={() => setEditImport(null)} className="p-1 rounded-lg text-stone-400 hover:text-stone-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Target Campaign
                  </label>
                  <select
                    value={editCampaign}
                    onChange={e => setEditCampaign(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs bg-stone-50 focus:bg-white transition-colors"
                    style={{ borderColor: O.line }}
                  >
                    <option value="">Keep current ({editImport.campaign?.name || '—'})</option>
                    {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Reassign Callers
                  </label>
                  <select
                    onChange={e => { handleEditAddCaller(e.target.value); e.target.value = ''; }}
                    className="w-full p-2.5 rounded-xl border text-xs bg-stone-50 mb-3"
                    style={{ borderColor: O.line }}
                  >
                    <option value="">Add caller to distribution...</option>
                    {callers.filter(c => !editCallers.find(s => s.id === c._id)).map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.role})</option>
                    ))}
                  </select>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editCallers.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-stone-50/70" style={{ borderColor: O.lineSoft }}>
                        <span className="text-xs font-bold" style={{ color: O.ink }}>{c.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={c.pct}
                            onChange={e => setEditCallers(prev => prev.map(ec => ec.id === c.id ? { ...ec, pct: parseInt(e.target.value) || 0 } : ec))}
                            className="w-14 p-1 rounded-lg border text-center text-xs font-bold"
                            style={{ borderColor: O.line }}
                          />
                          <span className="text-xs text-stone-500 font-bold">%</span>
                          <button
                            onClick={() => handleEditRemoveCaller(c.id)}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {editCallers.length > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-xl mt-3" style={{ background: editTotalPct === 100 ? '#ecfdf5' : '#fffbeb' }}>
                      <span className="text-xs font-bold text-stone-700">Total Distribution:</span>
                      <span className="text-xs font-black" style={{ color: editTotalPct === 100 ? '#059669' : '#d97706' }}>
                        {editTotalPct}%
                      </span>
                    </div>
                  )}
                </div>

                <InfoBox type="warning">
                  Saving will reassign all leads from this batch to the chosen callers and notify them.
                </InfoBox>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: O.lineSoft }}>
                <Btn onClick={() => setEditImport(null)} variant="outline">
                  Cancel
                </Btn>
                <Btn
                  onClick={handleSaveEdit}
                  disabled={savingEdit || (editCallers.length > 0 && editTotalPct !== 100)}
                  variant="primary"
                >
                  {savingEdit ? 'Saving...' : 'Save Reassignment'}
                </Btn>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: WIZARD STEPS (STEPS 1 - 5)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: O.bgSoft, border: `1px solid ${O.line}` }}
          >
            <RiFileExcel2Line className="w-5 h-5" style={{ color: O.deep }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: O.ink }}>
              Import Leads Wizard
            </h1>
            <p className="text-xs text-stone-500">Step {step} of 5: {WIZARD_STEPS[step - 1]?.label}</p>
          </div>
        </div>
        <button
          onClick={resetWizard}
          className="text-xs font-bold px-3 py-1.5 rounded-xl border hover:bg-orange-50 transition-colors"
          style={{ borderColor: O.line, color: O.deep }}
        >
          Cancel & Reset
        </button>
      </div>

      {/* Steps Pill Bar */}
      <Card className="p-4">
        <div className="flex items-center overflow-x-auto pb-1">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 min-w-[130px]">
              <Step n={s.n} label={s.label} active={step === s.n} done={step > s.n} />
              {i < WIZARD_STEPS.length - 1 && <Divider active={step > s.n} />}
            </div>
          ))}
        </div>
      </Card>

      {/* ── STEP 1: Sheet Selection ────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: O.lineSoft }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
                <RiFileExcel2Line className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400">Target File</div>
                <div className="font-bold text-sm" style={{ color: O.ink }}>{file?.name}</div>
              </div>
            </div>
            <button
              onClick={resetWizard}
              className="text-xs font-bold hover:underline"
              style={{ color: O.deep }}
            >
              Choose Different File
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Select Sheet to Import
            </label>
            <select
              value={selectedSheet}
              onChange={e => handleSheetChange(e.target.value)}
              className="w-full p-3 rounded-xl border text-sm font-medium bg-stone-50 focus:bg-white focus:outline-none transition-all"
              style={{ borderColor: O.line }}
            >
              <option value="">Select the sheet to import leads from...</option>
              {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {loadingSheet && (
            <div className="text-center py-6 text-stone-400">
              <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
              <span className="text-xs">Analyzing sheet data...</span>
            </div>
          )}

          {columns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Data Preview ({totalRows} Rows, {columns.length} Columns)
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Ready to Map
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: O.line }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr style={{ background: O.bgSofter }}>
                      {columns.slice(0, 8).map(c => (
                        <th key={c} className="py-2.5 px-3 font-bold border-b whitespace-nowrap" style={{ color: O.inkSoft, borderColor: O.line }}>
                          {c}
                        </th>
                      ))}
                      {columns.length > 8 && (
                        <th className="py-2.5 px-3 text-stone-400 font-bold border-b" style={{ borderColor: O.line }}>
                          +{columns.length - 8} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: O.lineSoft }}>
                    {preview.slice(0, 3).map((row, i) => (
                      <tr key={i} className="hover:bg-orange-50/40">
                        {columns.slice(0, 8).map(c => (
                          <td key={c} className="py-2 px-3 text-stone-600 max-w-[130px] truncate">
                            {String(row[c] ?? '')}
                          </td>
                        ))}
                        {columns.length > 8 && <td className="py-2 px-3 text-stone-400">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t" style={{ borderColor: O.lineSoft }}>
            <Btn onClick={() => setStep(0)} variant="outline">
              <FiArrowLeft className="w-4 h-4" /> Back to Files
            </Btn>
            <Btn onClick={goToStep2} disabled={!selectedSheet || loadingSheet}>
              Continue to Mapping <FiArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Field Mapping ──────────────────────────────────────────── */}
      {step === 2 && (
        <Card className="space-y-6">
          <InfoBox type="info">
            Map your spreadsheet headers to system lead fields. <strong>Name</strong> and <strong>Phone Number</strong> are mandatory. You can also define unlimited custom fields on the fly!
          </InfoBox>

          <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ borderColor: O.line, background: O.bgSofter }}>
            <div className="flex items-center gap-2.5">
              <FiLayers className="w-5 h-5" style={{ color: O.deep }} />
              <div>
                <div className="font-bold text-xs" style={{ color: O.ink }}>Source Ingestion Channel</div>
                <div className="text-[11px] text-stone-500">Auto-tagged as Bulk Spreadsheet Import</div>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-white border" style={{ borderColor: O.line, color: O.deep }}>
              Excel / CSV
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 px-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: O.muted }}>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-5">Spreadsheet Column Header</div>
              <div className="col-span-6">System Destination Field</div>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {columns.map(col => {
                const mapped = fieldMapping[col] || '';
                const isOther = mapped === '__other__';
                const isMapped = !!mapped && mapped !== '__ignore__';
                const isRequired = mapped === 'name' || mapped === 'phone';

                return (
                  <div key={col} className="p-2.5 rounded-xl border bg-stone-50/60 hover:bg-stone-50 transition-colors" style={{ borderColor: isMapped ? (isRequired ? O.deep : O.primary) : O.lineSoft }}>
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-1 flex justify-center">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-colors"
                          style={{ background: isMapped ? (isRequired ? O.deep : O.success) : '#d6d3d1' }}
                        >
                          {isMapped ? <FiCheck className="w-3 h-3" /> : '•'}
                        </div>
                      </div>

                      <div className="col-span-5">
                        <div className="font-bold text-xs truncate" style={{ color: O.ink }} title={col}>
                          {col}
                        </div>
                      </div>

                      <div className="col-span-6">
                        <select
                          value={mapped}
                          onChange={e => setFieldMapping(prev => ({ ...prev, [col]: e.target.value }))}
                          className="w-full p-2 rounded-xl border text-xs font-medium bg-white focus:outline-none transition-all"
                          style={{
                            borderColor: isMapped ? (isRequired ? O.deep : O.primary) : O.line,
                            color: isMapped ? O.ink : O.muted
                          }}
                        >
                          <option value="">[ Map to Field... ]</option>
                          <option value="__ignore__">— Ignore / Skip this column —</option>
                          {SYSTEM_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                          {savedCustomFields.map(name => (
                            <option key={name} value={`__custom__${name}`}>
                              Custom: {name}
                            </option>
                          ))}
                          <option value="__other__">+ Define New Custom Field...</option>
                        </select>
                      </div>
                    </div>

                    {isOther && (
                      <div className="mt-2 ml-8 flex items-center gap-2">
                        {confirmedCustom[col] ? (
                          <div className="flex-1 flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                            <span className="font-bold flex items-center gap-1.5">
                              <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {customLabels[col]}
                            </span>
                            <button
                              onClick={() => setConfirmedCustom(prev => ({ ...prev, [col]: false }))}
                              className="text-[11px] text-stone-500 hover:text-stone-800 underline"
                            >
                              Edit Name
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              placeholder="Enter custom attribute name and press Enter"
                              value={customLabels[col] || ''}
                              onChange={e => setCustomLabels(prev => ({ ...prev, [col]: e.target.value }))}
                              onKeyDown={async e => {
                                if (e.key === 'Enter') {
                                  const name = (customLabels[col] || '').trim();
                                  if (!name) return;
                                  setConfirmedCustom(prev => ({ ...prev, [col]: true }));
                                  if (!savedCustomFields.includes(name)) {
                                    try {
                                      await api.post('/lead-fields', { name, type: 'text' });
                                      setSavedCustomFields(prev => [...prev, name]);
                                    } catch (err) {
                                      console.warn('Could not save custom field:', err.message);
                                    }
                                  }
                                }
                              }}
                              className="flex-1 p-2 rounded-lg border text-xs bg-white font-medium focus:outline-none"
                              style={{ borderColor: O.primary }}
                            />
                            <span className="text-[11px] text-stone-400 whitespace-nowrap">Press ↵ Enter to save</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: O.lineSoft }}>
            <div>
              <div className="text-xs font-bold" style={{ color: O.ink }}>Duplicate Detection Key</div>
              <div className="text-[11px] text-stone-500">Select which field to verify against for uniqueness</div>
            </div>
            <select
              value={dupCheckField}
              onChange={e => setDupCheckField(e.target.value)}
              className="p-2 rounded-xl border text-xs font-bold bg-stone-50"
              style={{ borderColor: O.line, color: O.ink }}
            >
              <option value="phone">Phone Number</option>
              <option value="email">Email Address</option>
            </select>
          </div>

          <div className="flex justify-between pt-2">
            <Btn onClick={() => setStep(1)} variant="outline">
              <FiArrowLeft className="w-4 h-4" /> Back
            </Btn>
            <Btn onClick={goToStep3} disabled={loadingDup}>
              {loadingDup ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : null}
              {loadingDup ? 'Scanning Duplicates...' : 'Run Duplicate Scan'} <FiArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Duplicate Checking ────────────────────────────────────── */}
      {step === 3 && dupSummary && (
        <Card className="space-y-6">
          <div>
            <h3 className="font-bold text-base" style={{ color: O.ink }}>Duplicate Detection Report</h3>
            <p className="text-xs text-stone-500">Review validation checks across your spreadsheet and the CRM database</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-stone-50/60" style={{ borderColor: O.line }}>
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">In-File Integrity</div>
              <div className="flex items-center gap-2">
                {dupSummary.fileErrorRows === 0 ? (
                  <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5">
                    <FiCheckCircle className="w-4 h-4" /> Clean File (0 internal duplicates)
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold text-sm flex items-center gap-1.5">
                    <FiAlertTriangle className="w-4 h-4" /> {dupSummary.fileErrorRows} duplicate / empty rows in file
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                Proceeding with {dupSummary.uniqueInFile} unique rows out of {dupSummary.totalRows} original rows.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-stone-50/60" style={{ borderColor: O.line }}>
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">CRM Database Match</div>
              <div className="flex items-center gap-2">
                {dupSummary.crmDuplicates === 0 ? (
                  <span className="text-emerald-600 font-bold text-sm flex items-center gap-1.5">
                    <FiCheckCircle className="w-4 h-4" /> 0 existing leads matched
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold text-sm flex items-center gap-1.5">
                    <FiAlertCircle className="w-4 h-4" /> {dupSummary.crmDuplicates} leads already exist in CRM
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                Evaluated against stored contacts using {dupCheckField.toUpperCase()}.
              </p>
            </div>
          </div>

          {dupSummary.crmDuplicates > 0 && (
            <div className="p-5 rounded-2xl border bg-amber-50/40 space-y-3 border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <FiFilter className="w-4 h-4 text-amber-600" /> Choose Duplicate Resolution Strategy
              </div>

              <div className="space-y-2">
                {[
                  {
                    key: 'skip',
                    title: `Skip existing duplicates (${dupSummary.uniqueCount} new leads will be added)`,
                    desc: 'Safe & recommended. Prevents overwriting or duplicating records.',
                    badge: 'Recommended'
                  },
                  {
                    key: 'add',
                    title: `Add duplicates anyway (${dupSummary.uniqueInFile} total leads will be created)`,
                    desc: 'Creates a brand new lead even if the contact already exists.',
                  },
                  {
                    key: 'reset',
                    title: `Reset & replace (${dupSummary.crmDuplicates} existing leads deleted & re-created)`,
                    desc: 'Completely refreshes matching leads with updated spreadsheet values.',
                  },
                ].map(opt => (
                  <label
                    key={opt.key}
                    onClick={() => setDuplicateHandling(opt.key)}
                    className="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all bg-white"
                    style={{
                      borderColor: duplicateHandling === opt.key ? O.deep : '#e7e5e4',
                      boxShadow: duplicateHandling === opt.key ? '0 2px 8px rgba(232, 74, 16, 0.12)' : 'none'
                    }}
                  >
                    <input
                      type="radio"
                      name="dupHandling"
                      checked={duplicateHandling === opt.key}
                      onChange={() => setDuplicateHandling(opt.key)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: O.ink }}>{opt.title}</span>
                        {opt.badge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t" style={{ borderColor: O.lineSoft }}>
            <Btn onClick={() => setStep(2)} variant="outline">
              <FiArrowLeft className="w-4 h-4" /> Back to Mapping
            </Btn>
            <Btn onClick={goToStep4}>
              Campaign Configuration <FiArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </Card>
      )}

      {/* ── STEP 4: Campaign & List ────────────────────────────────────────── */}
      {step === 4 && (
        <Card className="space-y-6">
          <div>
            <h3 className="font-bold text-base" style={{ color: O.ink }}>Target Campaign Association</h3>
            <p className="text-xs text-stone-500">Attach imported leads to an active marketing campaign for pipeline tracking</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Select Destination Campaign <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCampaign}
              onChange={e => {
                if (e.target.value === '__new__') setShowNewCampaign(true);
                else setSelectedCampaign(e.target.value);
              }}
              className="w-full p-3 rounded-xl border text-sm font-medium bg-stone-50 focus:bg-white transition-all"
              style={{ borderColor: selectedCampaign ? O.deep : O.line }}
            >
              <option value="">Select a Campaign...</option>
              {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              <option value="__new__">+ Create Brand New Campaign...</option>
            </select>
          </div>

          {showNewCampaign && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border bg-orange-50/50 space-y-3"
              style={{ borderColor: O.line }}
            >
              <div className="text-xs font-bold" style={{ color: O.ink }}>Create New Campaign</div>
              <input
                placeholder="Enter campaign title (e.g. Q4 Masterclass Drive)"
                value={newCampaignName}
                onChange={e => setNewCampaignName(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-xs bg-white font-medium"
                style={{ borderColor: O.line }}
              />
              <div className="flex gap-2">
                <Btn onClick={handleCreateCampaign} disabled={creatingCampaign} variant="primary" style={{ padding: '7px 16px', fontSize: 12 }}>
                  {creatingCampaign ? 'Creating...' : 'Save & Select Campaign'}
                </Btn>
                <Btn onClick={() => { setShowNewCampaign(false); setNewCampaignName(''); }} variant="outline" style={{ padding: '7px 16px', fontSize: 12 }}>
                  Cancel
                </Btn>
              </div>
            </motion.div>
          )}

          <div className="flex justify-between pt-4 border-t" style={{ borderColor: O.lineSoft }}>
            <Btn onClick={() => setStep(3)} variant="outline">
              <FiArrowLeft className="w-4 h-4" /> Back to Duplicate Check
            </Btn>
            <Btn onClick={goToStep5} disabled={!selectedCampaign}>
              Configure Distribution <FiArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </Card>
      )}

      {/* ── STEP 5: Lead Distribution ──────────────────────────────────────── */}
      {step === 5 && (
        <Card className="space-y-6">
          <div>
            <h3 className="font-bold text-base" style={{ color: O.ink }}>Telecaller Distribution</h3>
            <p className="text-xs text-stone-500">Allocate leads across your team. Total quota percentage must equal exactly 100%</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Add Callers to Distribution Queue
            </label>
            <select
              onChange={e => { handleAddCaller(e.target.value); e.target.value = ''; }}
              className="w-full p-3 rounded-xl border text-sm font-medium bg-stone-50 focus:bg-white"
              style={{ borderColor: O.line }}
            >
              <option value="">Select a team member to add...</option>
              {callers.filter(c => !selectedCallers.find(s => s.id === c._id)).map(c => (
                <option key={c._id} value={c._id}>{c.name} ({c.role})</option>
              ))}
            </select>
          </div>

          {selectedCallers.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 px-2">
                <span>Caller / Role</span>
                <span>Assigned Allocation</span>
              </div>

              {selectedCallers.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm"
                  style={{ borderColor: O.lineSoft }}
                >
                  <div>
                    <div className="font-bold text-xs" style={{ color: O.ink }}>{c.name}</div>
                    <div className="text-[11px] text-stone-500">
                      ≈ {Math.round((c.pct / 100) * (dupSummary?.uniqueCount || totalRows))} estimated leads
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-lg border" style={{ borderColor: O.line }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={c.pct}
                        onChange={e => handlePctChange(c.id, e.target.value)}
                        className="w-12 text-center text-xs font-bold bg-transparent focus:outline-none"
                      />
                      <span className="text-xs font-bold text-stone-400">%</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCaller(c.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove caller"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div
                className="flex items-center justify-between p-3.5 rounded-xl border mt-3"
                style={{
                  background: totalPct === 100 ? '#ecfdf5' : '#fffbeb',
                  borderColor: totalPct === 100 ? '#a7f3d0' : '#fde68a'
                }}
              >
                <div className="flex items-center gap-2">
                  {totalPct === 100 ? (
                    <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <FiAlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-xs font-bold" style={{ color: totalPct === 100 ? '#065f46' : '#92400e' }}>
                    {totalPct === 100 ? 'All 100% Allocated' : `Allocation Incomplete (${totalPct}% of 100%)`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => distributeEvenly(selectedCallers)}
                  className="text-xs font-bold underline text-stone-600 hover:text-stone-900"
                >
                  Distribute Evenly
                </button>
              </div>
            </div>
          )}

          {!selectedCallers.length && (
            <InfoBox type="warning">
              Please add at least one caller to receive the newly ingested leads.
            </InfoBox>
          )}

          <div className="flex justify-between pt-4 border-t" style={{ borderColor: O.lineSoft }}>
            <Btn onClick={() => setStep(4)} variant="outline">
              <FiArrowLeft className="w-4 h-4" /> Back to Campaign
            </Btn>
            <Btn
              onClick={handleImport}
              disabled={importing || !selectedCallers.length || totalPct !== 100}
              variant="primary"
            >
              {importing ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
              {importing ? 'Processing & Distributing...' : 'Start Lead Ingestion'}
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}