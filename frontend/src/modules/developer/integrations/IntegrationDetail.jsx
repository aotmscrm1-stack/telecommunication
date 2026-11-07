import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { integrationsAPI, campaignsAPI, usersAPI } from '../../../services/api';
import api from '../../../services/api';

// Official brand logos (high-res vector/SVG and CDN images)
const REAL_BRAND_LOGOS = {
  google_sheets: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg',
  whatsapp: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
  whatsapp_cloud: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
  facebook: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
  justdial: 'https://akam.cdn.jdmagicbox.com/images/icontent/jdlogos/jdlogosvg.svg',
  indiamart: 'https://utils.imimg.com/imhome_gifs/indiamart-logo1.png',
  magicbricks: 'https://img.mbstatic.com/mbimages/rent/static/images/mb-logo.svg',
  '99acres': 'https://static.99acres.com/universalapp/img/favicon.ico',
  housing: 'https://c.housingcdn.com/demand/s/common/assets/favicon.62886f4a.ico',
  callerdesk: 'https://callerdesk.io/wp-content/uploads/2021/08/callerdesk-logo.png',
  knowlarity: 'https://www.knowlarity.com/images/knowlarity-logo.svg',
  maqsam: 'https://maqsam.com/wp-content/uploads/2021/04/maqsam-logo.svg',
};

const LOGO_DOMAINS = {
  facebook: 'facebook.com',
  justdial: 'justdial.com',
  whatsapp: 'whatsapp.com',
  whatsapp_cloud: 'whatsapp.com',
  '99acres': '99acres.com',
  callerdesk: 'callerdesk.io',
  google_meet: 'meet.google.com',
  google_sheets: 'sheets.google.com',
  housing: 'housing.com',
  indiamart: 'indiamart.com',
  knowlarity: 'knowlarity.com',
  magicbricks: 'magicbricks.com',
  maqsam: 'maqsam.com',
  sulekha: 'sulekha.com',
  tradeindia: 'tradeindia.com',
};

const IntegrationLogo = ({ type, name, size = 52 }) => {
  const initials = (name || type || '??').slice(0, 2).toUpperCase();
  const directLogo = REAL_BRAND_LOGOS[type];
  const domain = LOGO_DOMAINS[type];
  const sources = [
    ...(directLogo ? [directLogo] : []),
    ...(domain ? [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      `https://logo.clearbit.com/${domain}?size=128`
    ] : [])
  ];
  const [srcIdx, setSrcIdx] = useState(0);

  if (sources.length > 0 && srcIdx < sources.length) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 12, background: '#fff',
        border: '1px solid var(--theme-border-tint)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        padding: size * 0.14, boxSizing: 'border-box', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <img
          src={sources[srcIdx]}
          alt={name || type}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setSrcIdx(i => i + 1)}
        />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: 'var(--theme-primary-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

// Generic steps for non-sheets integrations
const STEPS = [
  { label: 'Step 1', sub: 'Integration details' },
  { label: 'Step 2', sub: 'Field mapping' },
  { label: 'Step 3', sub: 'Choose campaign' },
  { label: 'Step 4', sub: 'Lead distribution' },
  { label: 'Step 5', sub: 'Connect & finish' },
  { label: 'Step 6', sub: 'Done' },
];

// Per-type config field definitions
const CONFIG_FIELDS = {
  facebook: [
    { key: 'accessToken', label: 'User Access Token', placeholder: 'EAAxxxxxxxx', hint: 'Long-lived user token from Meta App Dashboard' },
    { key: 'pageId', label: 'Facebook Page ID', placeholder: '123456789' },
    { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'EAAxxxxxxxx', hint: 'Token scoped to your Page' },
    { key: 'formId', label: 'Lead Form ID (optional)', placeholder: 'Leave blank to capture all forms' },
  ],
  whatsapp_cloud: [
    { key: 'accessToken', label: 'Permanent Access Token', placeholder: 'EAAxxxxxxxx', hint: 'From Meta Business App > WhatsApp > API Setup' },
    { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '123456789', hint: 'From Meta Business App > WhatsApp > API Setup' },
    { key: 'wabaId', label: 'WhatsApp Business Account ID', placeholder: '123456789' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', placeholder: 'your_custom_verify_token', hint: 'Any random string — you set this on Meta side too' },
  ],
  whatsapp: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Enter your WhatsApp API key' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', placeholder: 'your_verify_token' },
  ],
  google_meet: [],
  knowlarity: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Your Knowlarity x-api-key', hint: 'From Knowlarity Developer Portal' },
    { key: 'accessToken', label: 'Access Token / Authorization', placeholder: 'Bearer xxxxxxxx' },
    { key: 'virtualNumber', label: 'Virtual Number (SR Number)', placeholder: '+918xxxxxxxxx' },
  ],
  callerdesk: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Your CallerDesk API key', hint: 'From CallerDesk Dashboard > API' },
    { key: 'did', label: 'DID / Virtual Number', placeholder: '+918xxxxxxxxx' },
  ],
  maqsam: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Your Maqsam API key' },
    { key: 'apiSecret', label: 'API Secret', placeholder: 'Your Maqsam API secret' },
    { key: 'did', label: 'DID Number', placeholder: '+971xxxxxxxxx' },
  ],
};

const emptyFieldMapping = () => ({
  name: '', phone: '', email: '', location: '', interested: '',
  alternatePhone: '', collegeName: '', lastQualification: '', mode: '', budget: '',
});

// Smart URL / ID parser for Google Sheets
const parseSheetUrlOrId = (input) => {
  if (!input || typeof input !== 'string') return { sheetId: '', gid: '', tabName: '' };
  const str = input.trim();
  let sheetId = str;
  let gid = '';
  let tabName = '';

  const idMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    sheetId = idMatch[1];
  }
  const gidMatch = str.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }
  const sheetMatch = str.match(/[#&?]sheet=([^&#]+)/);
  if (sheetMatch && sheetMatch[1]) {
    try {
      tabName = decodeURIComponent(sheetMatch[1]);
    } catch (_) {
      tabName = sheetMatch[1];
    }
  }
  return { sheetId, gid, tabName };
};

// Auto-match helper: maps sheet columns to CRM fields based on keywords
const autoMapFields = (columns = []) => {
  const mapping = emptyFieldMapping();
  const lowerCols = columns.map(c => ({
    original: c,
    lower: String(c).toLowerCase().replace(/[^a-z0-9]/g, '')
  }));

  const findCol = (patterns) => {
    for (const pat of patterns) {
      const match = lowerCols.find(c => c.lower.includes(pat));
      if (match) return match.original;
    }
    return '';
  };

  mapping.name = findCol(['fullname', 'candidatename', 'studentname', 'leadname', 'candidate', 'name']) || '';
  mapping.phone = findCol(['phonenumber', 'contactnumber', 'studentphone', 'mobile', 'contact', 'phone']) || '';
  mapping.email = findCol(['emailaddress', 'emailid', 'email']) || '';
  mapping.location = findCol(['city', 'location', 'town', 'address']) || '';
  mapping.interested = findCol(['interested', 'course', 'program', 'training', 'domain', 'stream']) || '';
  mapping.collegeName = findCol(['collegename', 'college', 'university', 'institute']) || '';
  mapping.lastQualification = findCol(['qualification', 'degree', 'education', 'branch']) || '';
  mapping.mode = findCol(['mode', 'trainingmode', 'batchmode']) || '';
  mapping.budget = findCol(['budget', 'fee', 'price', 'fees']) || '';

  return mapping;
};

const OAUTH_TYPES = ['facebook', 'google_meet'];
const WEBHOOK_TYPES = ['whatsapp_cloud', 'whatsapp', 'knowlarity', 'callerdesk', 'maqsam'];
const GENERIC_WEBHOOK_TYPES = ['justdial', '99acres', 'housing', 'indiamart', 'magicbricks', 'sulekha', 'tradeindia', 'webhook'];

const s = {
  card: { background: '#fff', border: '1px solid var(--theme-border-tint)', borderRadius: 14, padding: 22 },
  inp: { width: '100%', padding: '10px 14px', border: '1px solid var(--theme-border-tint)', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: 'var(--theme-text-strongest)', transition: 'border-color 0.15s ease' },
  lbl: { display: 'block', fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  btnPrimary: { padding: '10px 22px', borderRadius: 10, border: 'none', background: 'var(--theme-primary-alt)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' },
  btnGhost: { padding: '9px 18px', borderRadius: 10, border: '1.5px solid var(--theme-border-tint)', background: '#fff', color: 'var(--theme-text-strongest)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnDanger: { padding: '7px 18px', borderRadius: 10, border: '1.5px solid #ef4444', background: '#fff', color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  hint: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  badge: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: color === 'green' ? '#d1fae5' : '#fef3c7', color: color === 'green' ? '#059669' : '#b45309' }),
};

export default function IntegrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integration, setIntegration] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [sheetFilter, setSheetFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('configuration'); // Default directly to configuration

  // Generic step (for Facebook, WhatsApp, etc.)
  const [step, setStep] = useState(0);

  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [actionResult, setActionResult] = useState(null);

  // Popup Modal Card state ("Add Todo" style preview modal)
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Config state
  const [config, setConfig] = useState({});
  const [fieldMapping, setFieldMapping] = useState({ name: 'name', phone: 'phone', email: 'email', location: 'location', interested: 'interested' });
  const [defaultCampaign, setDefaultCampaign] = useState('');
  const [defaultAssignedTo, setDefaultAssignedTo] = useState('');
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Multiple Google Sheets sources (google_sheets type only)
  const emptySheetSource = () => ({
    sheetId: '',
    gid: '',
    sheetRange: '',
    name: '',
    fieldMapping: emptyFieldMapping(),
    allowedColumns: { phone: true, name: true, email: true, city: true, interested: true },
    extraColumns: [],
    columns: [],
    columnsLoading: false,
    columnsError: '',
    availableTabs: [],
    campaign: '',
    assignedTo: '',
    showNewCampaign: false,
    newCampaignName: '',
    creatingCampaign: false
  });

  const [sheetSources, setSheetSources] = useState([emptySheetSource()]);

  // Extra states for Google Meet
  const [meetings, setMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ summary: '', startTime: '', attendeeEmails: '' });

  useEffect(() => { fetchAll(); }, [id]);

  // Handle Google OAuth popup completion
  useEffect(() => {
    const oauthStatus = searchParams.get('google_oauth');
    if (!oauthStatus) return;

    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: 'google_oauth', status: oauthStatus }, window.location.origin);
      window.close();
      return;
    }

    if (oauthStatus === 'success') {
      fetchAll();
      alert('Google account connected successfully.');
    } else {
      alert(`Google authorization failed: ${searchParams.get('message') || 'Unknown error'}`);
    }
    searchParams.delete('google_oauth');
    searchParams.delete('type');
    searchParams.delete('message');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams]);

  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'google_oauth') return;
      if (event.data.status === 'success') {
        fetchAll();
        alert('Google account connected successfully.');
      } else {
        alert('Google authorization failed. Please try again.');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [intRes, campRes, usersRes] = await Promise.all([
        integrationsAPI.getOne(id),
        campaignsAPI.getAll(),
        usersAPI.getAll(),
      ]);
      const intg = intRes.data;
      setIntegration(intg);
      setConfig(intg.config || {});
      setFieldMapping(intg.fieldMapping || { name: 'name', phone: 'phone', email: 'email', location: 'location', interested: 'interested' });
      if (intg.type === 'google_sheets') {
        const existing = (intg.config?.sheetSources && intg.config.sheetSources.length > 0)
          ? intg.config.sheetSources
          : [{ sheetId: intg.config?.sheetId || '', gid: intg.config?.gid || '', sheetRange: intg.config?.sheetRange || '', name: '', fieldMapping: intg.fieldMapping || {} }];
        setSheetSources(prevSources => existing.map(src => {
          const prevMatch = prevSources.find(p => p.sheetId === (src.sheetId || '') && p.sheetRange === (src.sheetRange || ''));
          return {
            sheetId: src.sheetId || '',
            gid: src.gid || '',
            sheetRange: src.sheetRange || '',
            name: src.name || '',
            fieldMapping: { ...emptyFieldMapping(), ...(src.fieldMapping || {}) },
            allowedColumns: src.allowedColumns || { phone: true, name: true, email: true, city: true, interested: true },
            extraColumns: src.extraColumns || [],
            columns: prevMatch?.columns || src.columns || [],
            columnsLoading: false,
            columnsError: '',
            availableTabs: [],
            campaign: src.campaign || '',
            assignedTo: src.assignedTo || '',
            showNewCampaign: false,
            newCampaignName: '',
            creatingCampaign: false,
          };
        }));
      }
      setDefaultCampaign(intg.defaultCampaign?._id || '');
      setDefaultAssignedTo(intg.defaultAssignedTo?._id || '');
      setCampaigns(campRes.data?.campaigns || []);
      setUsers(usersRes.data?.users || []);
      const leadsRes = await integrationsAPI.getLeads(id);
      setLeads(leadsRes.data.leads || []);
      setLeadsTotal(leadsRes.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (extra = {}, silent = false) => {
    setSaving(true);
    try {
      let payloadConfig = config;
      let payloadMapping = fieldMapping;
      if (type === 'google_sheets') {
        const cleanSources = sheetSources
          .filter(src => src.sheetId)
          .map(({ columns, columnsLoading, columnsError, availableTabs, showNewCampaign, newCampaignName, creatingCampaign, ...rest }, idx) => ({
            ...rest,
            name: rest.name || `Sheet ${idx + 1}`,
            campaign: rest.campaign || rest.name || `Sheet ${idx + 1}`
          }));
        payloadConfig = {
          ...config,
          sheetSources: cleanSources,
          sheetId: cleanSources[0]?.sheetId || '',
          sheetRange: cleanSources[0]?.sheetRange || ''
        };
        payloadMapping = cleanSources[0]?.fieldMapping || fieldMapping;
      }
      await integrationsAPI.update(id, {
        config: payloadConfig,
        fieldMapping: payloadMapping,
        defaultCampaign: defaultCampaign || null,
        defaultAssignedTo: defaultAssignedTo || null,
        ...extra
      });
      if (!extra.status && !silent) alert('Configuration saved successfully');
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const createCampaignInline = async () => {
    if (!newCampaignName.trim()) return;
    setCreatingCampaign(true);
    try {
      const res = await campaignsAPI.create({ name: newCampaignName.trim() });
      const created = res.data.campaign || res.data;
      setCampaigns(prev => [...prev, created]);
      setDefaultCampaign(created._id);
      setNewCampaignName('');
      setShowNewCampaign(false);
      await handleSave({}, true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove this integration? Leads already imported will remain in CRM.')) return;
    setRemoving(true);
    try {
      await integrationsAPI.remove(id);
      navigate('/integrations');
    } catch (err) {
      alert('Failed to remove');
      setRemoving(false);
    }
  };

  const doAction = async (label, fn) => {
    setActionLoading(label);
    setActionResult(null);
    try {
      const res = await fn();
      setActionResult({ ok: true, data: res.data, label });
    } catch (err) {
      setActionResult({ ok: false, msg: err.response?.data?.message || err.message, needsAuth: !!err.response?.data?.needsAuth, label });
    } finally {
      setActionLoading('');
    }
  };

  const addSheetSource = () => setSheetSources(prev => {
    const next = [...prev, emptySheetSource()];
    setActiveSheetIdx(next.length - 1);
    return next;
  });

  const removeSheetSource = async (idx) => {
    if (!window.confirm('Remove this sheet source? Leads already synced will be preserved in CRM.')) return;
    const next = sheetSources.filter((_, i) => i !== idx);
    const updatedSources = next.length > 0 ? next : [emptySheetSource()];
    setSheetSources(updatedSources);
    setActiveSheetIdx(a => Math.min(a, Math.max(updatedSources.length - 1, 0)));
    try {
      const cleanSources = updatedSources
        .filter(src => src.sheetId)
        .map(({ columns, columnsLoading, columnsError, availableTabs, showNewCampaign, newCampaignName, creatingCampaign, ...rest }, sIdx) => ({
          ...rest,
          name: rest.name || `Sheet ${sIdx + 1}`,
          campaign: rest.campaign || rest.name || `Sheet ${sIdx + 1}`
        }));
      await integrationsAPI.update(id, {
        config: { ...config, sheetSources: cleanSources, sheetId: cleanSources[0]?.sheetId || '', sheetRange: cleanSources[0]?.sheetRange || '' },
      });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete sheet from server');
    }
  };

  const updateSheetSource = (idx, patch) => setSheetSources(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const updateSheetSourceMapping = (idx, field, value) => setSheetSources(prev => prev.map((s, i) => (
    i === idx ? { ...s, fieldMapping: { ...s.fieldMapping, [field]: value } } : s
  )));

  const toggleAllowedColumn = (idx, colKey) => {
    if (colKey === 'phone') return; // Phone is mandatory
    setSheetSources(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const current = s.allowedColumns || { phone: true, name: true, email: true, city: true, interested: true };
      return {
        ...s,
        allowedColumns: {
          ...current,
          [colKey]: !current[colKey]
        }
      };
    }));
  };

  const createCampaignForSource = async (idx) => {
    const nameVal = sheetSources[idx]?.newCampaignName?.trim();
    if (!nameVal) return;
    updateSheetSource(idx, { creatingCampaign: true });
    try {
      const res = await campaignsAPI.create({ name: nameVal });
      const created = res.data.campaign || res.data;
      setCampaigns(prev => [...prev, created]);
      updateSheetSource(idx, { campaign: created._id, newCampaignName: '', showNewCampaign: false, creatingCampaign: false });
      await handleSave({}, true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create campaign');
      updateSheetSource(idx, { creatingCampaign: false });
    }
  };

  const handleSheetIdChange = (idx, val) => {
    const { sheetId, gid, tabName } = parseSheetUrlOrId(val);
    const updates = { sheetId, columns: [], columnsError: '' };
    if (gid) updates.gid = gid;
    if (tabName && !sheetSources[idx]?.sheetRange) {
      updates.sheetRange = `'${tabName}'!A:ZZ`;
    }
    updateSheetSource(idx, updates);
  };

  // Test Connection, Fetch Columns & Sample Rows, then trigger Popup Card
  const testConnectionAndShowModal = async (idx) => {
    const src = sheetSources[idx];
    if (!src.sheetId) {
      updateSheetSource(idx, { columnsError: 'Please enter a Google Sheet ID or URL.' });
      return;
    }

    // Auto-clean typos like !:
    const cleanRange = (src.sheetRange || '').replace(/!:+/g, '!').trim();
    if (cleanRange !== src.sheetRange) {
      updateSheetSource(idx, { sheetRange: cleanRange });
    }

    // Parse URL if full URL was pasted
    const parsed = parseSheetUrlOrId(src.sheetId);
    const effectiveSheetId = parsed.sheetId || src.sheetId;
    const effectiveGid = parsed.gid || src.gid;

    updateSheetSource(idx, { columnsLoading: true, columnsError: '' });
    try {
      const res = await integrationsAPI.getSheetColumns(id, effectiveSheetId, cleanRange || src.sheetRange, effectiveGid);
      const cols = res.data.columns || [];
      const sampleRows = res.data.sampleRows || [];
      const totalRows = res.data.totalRows !== undefined ? res.data.totalRows : (sampleRows.length || 0);

      if (!res.data.success || cols.length === 0) {
        updateSheetSource(idx, {
          columnsLoading: false,
          columnsError: res.data.message || 'No columns found in the sheet. Please make sure sheet contains header row and is shared with link.'
        });
        return;
      }

      // Auto-map empty fields
      const autoMapped = autoMapFields(cols);
      const updatedMapping = { ...src.fieldMapping };
      Object.keys(autoMapped).forEach(k => {
        if (!updatedMapping[k] && autoMapped[k]) {
          updatedMapping[k] = autoMapped[k];
        }
      });

      updateSheetSource(idx, {
        sheetId: effectiveSheetId,
        gid: effectiveGid,
        columns: cols,
        columnsLoading: false,
        columnsError: '',
        fieldMapping: updatedMapping
      });

      // Prepare preview data and OPEN POPUP MODAL ("Add Todo" style)
      setPreviewData({
        sheetIdx: idx,
        sheetName: src.name || `Sheet ${idx + 1}`,
        tabName: cleanRange || src.sheetRange || 'Default Sheet',
        columns: cols,
        sampleRows,
        totalRows,
        fieldMapping: updatedMapping,
        allowedColumns: src.allowedColumns || { phone: true, name: true, email: true, city: true, interested: true }
      });
      setShowPreviewModal(true);

      // Silently save
      setTimeout(async () => {
        try {
          const currentSources = sheetSources.map((s, i) => i === idx ? { ...s, sheetId: effectiveSheetId, gid: effectiveGid, sheetRange: cleanRange, columns: cols, fieldMapping: updatedMapping } : s);
          const cleanSources = currentSources
            .filter(s => s.sheetId)
            .map(({ columns, columnsLoading, columnsError, availableTabs, showNewCampaign, newCampaignName, creatingCampaign, ...rest }, sIdx) => ({
              ...rest,
              name: rest.name || `Sheet ${sIdx + 1}`,
              campaign: rest.campaign || rest.name || `Sheet ${sIdx + 1}`
            }));
          await integrationsAPI.update(id, {
            config: { ...config, sheetSources: cleanSources, sheetId: cleanSources[0]?.sheetId || '', sheetRange: cleanSources[0]?.sheetRange || '' },
            fieldMapping: cleanSources[0]?.fieldMapping || fieldMapping
          });
        } catch (_) {}
      }, 50);
    } catch (err) {
      updateSheetSource(idx, {
        columnsLoading: false,
        columnsError: err.response?.data?.message || err.message || 'Could not load columns. Please verify that sheet sharing is set to "Anyone with the link can view".',
        availableTabs: err.response?.data?.availableTabs || [],
      });
    }
  };

  // Confirm in Popup Modal: Save, Sync & Navigate to Meta Leads!
  const handleConfirmAndSync = async () => {
    setConfirmLoading(true);
    try {
      await handleSave({}, true);
      const targetSrc = sheetSources[activeSheetIdx];
      await integrationsAPI.importSheets(id, targetSrc?.sheetId);
      setShowPreviewModal(false);
      // Immediately navigate to Meta Leads!
      navigate('/meta-leads');
    } catch (err) {
      alert(err.response?.data?.message || 'Sync failed. Please check sheet permissions.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const useSuggestedTab = (idx, tabName) => {
    updateSheetSource(idx, { sheetRange: `'${tabName}'!A:ZZ`, columnsError: '', availableTabs: [] });
  };

  const startGoogleOAuth = async () => {
    const res = await api.get(`/integrations/google/oauth/url?type=${integration.type}&integrationId=${id}`);
    window.open(res.data.url, '_blank', 'width=600,height=700');
  };

  const startFacebookOAuth = async () => {
    const res = await api.get(`/integrations/facebook/oauth/url`);
    window.open(res.data.url, '_blank', 'width=600,height=700');
  };

  const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin.replace('3000', '5000');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner-gradient" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!integration) return <div style={{ padding: 32, color: '#9ca3af' }}>Integration not found.</div>;

  const type = integration.type;
  const webhookUrl = `${backendUrl}/api/integrations/webhook/${integration.webhookKey}`;
  const configFields = CONFIG_FIELDS[type] || [];
  const isGenericWebhook = GENERIC_WEBHOOK_TYPES.includes(type);
  const isRealWebhook = WEBHOOK_TYPES.includes(type);

  const currentSource = sheetSources[activeSheetIdx] || emptySheetSource();
  const allowed = currentSource.allowedColumns || { phone: true, name: true, email: true, city: true, interested: true };

  return (
    <div className="id-shell" style={{ padding: '20px 28px', maxWidth: 1200, margin: '0 auto', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        @media (max-width: 640px) {
          .id-shell { padding: 14px !important; }
          .id-shell [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          .id-shell div[style*="display: flex"] { flex-wrap: wrap; row-gap: 6px; }
          .id-shell div[style*="display: flex"] > * { min-width: 0; }
        }
      `}</style>

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => navigate('/integrations')} style={{ background: 'none', border: 'none', color: 'var(--theme-primary-alt)', cursor: 'pointer', fontSize: 14, padding: 0, fontWeight: 600 }}>
          ← Back to Integrations
        </button>
        <button onClick={handleRemove} disabled={removing} style={s.btnDanger}>
          {removing ? 'Removing...' : '⊗ Unlink'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <IntegrationLogo type={integration.type} name={integration.name} size={52} />
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--theme-text-strongest)' }}>{integration.name}</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            {type === 'google_sheets'
              ? 'Native Google Sheets Direct Cloud Sync — 100% automated without Apps Script or Code.gs'
              : integration.description}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--theme-border-tint)', marginBottom: 24, overflowX: 'auto' }}>
        {['configuration', 'overview', 'actions', 'leads'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14,
            fontWeight: activeTab === tab ? 600 : 400,
            color: activeTab === tab ? 'var(--theme-primary-alt)' : '#6b7280',
            borderBottom: activeTab === tab ? '2px solid var(--theme-primary-alt)' : '2px solid transparent',
            marginBottom: -2, textTransform: 'capitalize', whiteSpace: 'nowrap',
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Configuration Tab ── */}
      {activeTab === 'configuration' && (
        <div>
          {type === 'google_sheets' ? (
            /* ============================================================== */
            /* SINGLE-STEP REACTBITS-INSPIRED GOOGLE SHEETS CARD              */
            /* ============================================================== */
            <div>
              {/* Direct CRM Cloud Connection Badge */}
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                border: '1px solid #a7f3d0',
                borderRadius: 14,
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: '#10b981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 20, flexShrink: 0
                  }}>
                    ⚡
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#065f46' }}>
                      Direct CRM Cloud Connection Active — No Code.gs or Google Apps Script Needed!
                    </div>
                    <div style={{ fontSize: 12, color: '#047857', marginTop: 1 }}>
                      CRM directly syncs rows from Google Sheets. Quota limits and URLFetch issues are permanently eliminated.
                    </div>
                  </div>
                </div>
                <div style={{
                  background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 11,
                  padding: '4px 12px', borderRadius: 20, border: '1px solid #6ee7b7'
                }}>
                  ✓ Direct Sync Active
                </div>
              </div>

              {/* Multi-Sheet Selector Tabs */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff', border: '1px solid var(--theme-border-tint)',
                borderRadius: 12, padding: '8px 12px', marginBottom: 20, overflowX: 'auto'
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4, whiteSpace: 'nowrap' }}>
                  Sheets:
                </span>
                {sheetSources.map((src, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 12, fontWeight: idx === activeSheetIdx ? 700 : 500,
                      background: idx === activeSheetIdx ? 'var(--theme-primary-alt)' : 'var(--theme-surface-faint2)',
                      color: idx === activeSheetIdx ? '#fff' : 'var(--theme-text-strongest)',
                      border: `1.5px solid ${idx === activeSheetIdx ? 'var(--theme-primary-alt)' : 'var(--theme-border-tint)'}`,
                      whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                    }}
                    onClick={() => setActiveSheetIdx(idx)}
                  >
                    <span>📊 {src.name || `Sheet ${idx + 1}`}</span>
                    {sheetSources.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeSheetSource(idx); }}
                        title="Remove this sheet"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: idx === activeSheetIdx ? '#fecaca' : '#9ca3af',
                          fontSize: 15, padding: '0 2px', lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSheetSource}
                  style={{
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, background: '#fff',
                    color: 'var(--theme-primary-alt)',
                    border: '1.5px dashed var(--theme-primary-alt)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + Add Another Sheet
                </button>
              </div>

              {/* Single Reactbits-Style Main Card */}
              <div style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                borderRadius: 18,
                padding: '24px 28px',
                boxShadow: '0 12px 32px -8px rgba(0,0,0,0.06), 0 4px 12px -2px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--theme-text-strongest)' }}>
                      Google Sheet Configuration
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                      Configure connection details, assign campaign/telecaller, and choose allowed columns.
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#d1fae5', padding: '4px 12px', borderRadius: 20 }}>
                    Editing: {currentSource.name || `Sheet ${activeSheetIdx + 1}`}
                  </span>
                </div>

                {/* Input Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                  {/* Sheet Label */}
                  <div>
                    <label style={s.lbl}>Sheet Label / Title</label>
                    <input
                      value={currentSource.name}
                      onChange={e => updateSheetSource(activeSheetIdx, { name: e.target.value })}
                      placeholder="e.g. Digital Marketing Leads, SAP Leads"
                      style={s.inp}
                    />
                    <div style={s.hint}>Custom label for this sheet in CRM.</div>
                  </div>

                  {/* Google Sheet ID or URL */}
                  <div>
                    <label style={s.lbl}>Google Sheet ID or Full URL</label>
                    <input
                      value={currentSource.sheetId}
                      onChange={e => handleSheetIdChange(activeSheetIdx, e.target.value)}
                      placeholder="Paste Sheet URL or ID (https://docs.google.com/spreadsheets/d/...)"
                      style={s.inp}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={s.hint}>Paste full URL or Sheet ID</span>
                      {currentSource.sheetId && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: 4 }}>
                          ✓ ID: {currentSource.sheetId.slice(0, 14)}... {currentSource.gid ? `(GID: ${currentSource.gid})` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sheet Range / Tab Name */}
                  <div>
                    <label style={s.lbl}>Sheet Tab Name / Range</label>
                    <input
                      value={currentSource.sheetRange}
                      onChange={e => updateSheetSource(activeSheetIdx, { sheetRange: e.target.value.replace(/!:+/g, '!'), columns: [] })}
                      onBlur={e => updateSheetSource(activeSheetIdx, { sheetRange: e.target.value.replace(/!:+/g, '!').trim() })}
                      placeholder="e.g. 'CyberSecurity_Lead_Form_Nov2026'!A:ZZ or Sheet1"
                      style={s.inp}
                    />
                    <div style={s.hint}>Tab name in your Google Sheet (e.g. Sheet1, Leads).</div>
                  </div>

                  {/* Target Campaign */}
                  <div>
                    <label style={s.lbl}>Target Campaign</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={currentSource.campaign}
                        onChange={e => updateSheetSource(activeSheetIdx, { campaign: e.target.value })}
                        style={{ ...s.inp, flex: 1 }}
                      >
                        <option value="">-- Auto (Use Sheet Name) --</option>
                        {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => updateSheetSource(activeSheetIdx, { showNewCampaign: !currentSource.showNewCampaign })}
                        style={{ ...s.btnGhost, padding: '7px 12px', fontSize: 12 }}
                      >
                        + New
                      </button>
                    </div>
                    {currentSource.showNewCampaign && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <input
                          value={currentSource.newCampaignName || ''}
                          onChange={e => updateSheetSource(activeSheetIdx, { newCampaignName: e.target.value })}
                          placeholder="Campaign name"
                          style={{ ...s.inp, flex: 1, padding: '6px 10px', fontSize: 12 }}
                          onKeyDown={e => { if (e.key === 'Enter') createCampaignForSource(activeSheetIdx); }}
                        />
                        <button
                          type="button"
                          onClick={() => createCampaignForSource(activeSheetIdx)}
                          style={{ ...s.btnPrimary, padding: '6px 14px', fontSize: 12 }}
                          disabled={currentSource.creatingCampaign || !currentSource.newCampaignName?.trim()}
                        >
                          Create
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Telecaller Assignment */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={s.lbl}>Auto-Assign Telecaller / Agent</label>
                    <select
                      value={currentSource.assignedTo || ''}
                      onChange={e => updateSheetSource(activeSheetIdx, { assignedTo: e.target.value })}
                      style={s.inp}
                    >
                      <option value="">Auto assign / Round-robin (or unassigned)</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Suggested Tabs pill buttons if any */}
                {currentSource.availableTabs && currentSource.availableTabs.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', marginRight: 6 }}>Suggested Tabs:</span>
                    {currentSource.availableTabs.map(tab => (
                      <button key={tab} type="button" onClick={() => useSuggestedTab(activeSheetIdx, tab)} style={{ ...s.btnGhost, padding: '3px 8px', fontSize: 11, marginRight: 6 }}>
                        Use "{tab}"
                      </button>
                    ))}
                  </div>
                )}

                {/* Column Error / Helper Banner */}
                {currentSource.columnsError && (
                  <div style={{
                    padding: '16px 18px',
                    borderRadius: 12,
                    background: currentSource.columnsError.includes('401') || currentSource.columnsError.toLowerCase().includes('restricted') ? '#fef2f2' : '#fffbeb',
                    border: `1.5px solid ${currentSource.columnsError.includes('401') || currentSource.columnsError.toLowerCase().includes('restricted') ? '#fca5a5' : '#fcd34d'}`,
                    marginBottom: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: 24, lineHeight: 1 }}>
                        {currentSource.columnsError.includes('401') || currentSource.columnsError.toLowerCase().includes('restricted') ? '🔒' : '⚠️'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: currentSource.columnsError.includes('401') || currentSource.columnsError.toLowerCase().includes('restricted') ? '#991b1b' : '#92400e',
                          marginBottom: 4
                        }}>
                          {currentSource.columnsError.includes('401') || currentSource.columnsError.toLowerCase().includes('restricted')
                            ? 'Google Sheet Access Restricted (401 Error) — Data Not Visible'
                            : currentSource.columnsError.includes('404')
                              ? 'Google Sheet Not Found (404 Error)'
                              : 'Google Sheet Connection Notice'}
                        </div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#374151' }}>
                          {currentSource.columnsError.includes('401') || currentSource.columnsError.toLowerCase().includes('restricted') ? (
                            <div>
                              <p style={{ margin: '0 0 8px 0', color: '#b91c1c', fontWeight: 600 }}>
                                Ee Google Sheet private / restricted gaa undi. CRM data ni access cheyadaniki Google Sheet Share permissions change cheyali:
                              </p>
                              <ol style={{ margin: '0 0 10px 0', paddingLeft: 20, color: '#4b5563', lineHeight: 1.6 }}>
                                <li>Mee Google Sheet ni browser lo open cheyandi.</li>
                                <li>Top-Right corner lo unna <strong>Share</strong> button click cheyandi.</li>
                                <li><strong>General access</strong> lo <em>Restricted</em> place lo <strong>Anyone with the link</strong> select chesi, role <strong>Viewer</strong> unchandi.</li>
                                <li><strong>Done</strong> click chesi, ikkada kinda malli <strong>⚡ Test Connection & Load Columns</strong> click cheyandi. Existing leads ventane kanapadathayi!</li>
                              </ol>
                              {currentSource.sheetId && (
                                <a
                                  href={`https://docs.google.com/spreadsheets/d/${currentSource.sheetId}/edit`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#2563eb',
                                    textDecoration: 'underline',
                                    marginTop: 4
                                  }}
                                >
                                  Open Google Sheet in new tab ↗
                                </a>
                              )}
                            </div>
                          ) : currentSource.columnsError.includes('404') ? (
                            <div>
                              <p style={{ margin: '0 0 6px 0', color: '#b91c1c', fontWeight: 600 }}>
                                Google Sheet ID match avvaledhu (Google Sheet IDs are case-sensitive).
                              </p>
                              <div style={{ color: '#4b5563' }}>
                                Browser address bar lo unna complete URL (e.g. <code>https://docs.google.com/spreadsheets/d/...</code>) copy chesi 'Google Sheet ID or Full URL' box lo paste cheyandi.
                              </div>
                            </div>
                          ) : (
                            <div>{currentSource.columnsError}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── COLUMNS ALLOW SECTION ── */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '18px 20px',
                  marginBottom: 22
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--theme-text-strongest)' }}>
                        Columns Allowed / Required
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Toggle which fields to capture. Phone is mandatory. Match to sheet column below:
                      </div>
                    </div>
                    {currentSource.columns.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: 12, border: '1px solid #a7f3d0' }}>
                        ✓ {currentSource.columns.length} Columns Detected in Sheet
                      </span>
                    )}
                  </div>

                  {/* 5 Column Toggle Cards / Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>

                    {/* 1. Phone (Mandatory) */}
                    <div style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: '#ecfdf5', border: '1.5px solid #10b981',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#065f46' }}>📱 Phone</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 12 }}>
                          Mandatory *
                        </span>
                      </div>
                      <select
                        value={currentSource.fieldMapping?.phone || ''}
                        onChange={e => updateSheetSourceMapping(activeSheetIdx, 'phone', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #a7f3d0', fontSize: 12, background: '#fff', outline: 'none' }}
                      >
                        <option value="">-- Match Phone Column --</option>
                        {currentSource.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* 2. Name */}
                    {(() => {
                      const isChecked = allowed.name !== false;
                      return (
                        <div style={{
                          padding: '12px 14px', borderRadius: 12,
                          background: isChecked ? '#f0fdf4' : '#f9fafb',
                          border: `1.5px solid ${isChecked ? '#34d399' : '#e5e7eb'}`,
                          display: 'flex', flexDirection: 'column', gap: 6,
                          transition: 'all 0.15s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: isChecked ? '#065f46' : '#6b7280' }}>👤 Name</span>
                            <button
                              type="button"
                              onClick={() => toggleAllowedColumn(activeSheetIdx, 'name')}
                              style={{
                                padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                fontSize: 11, fontWeight: 700,
                                background: isChecked ? '#10b981' : '#e5e7eb',
                                color: isChecked ? '#fff' : '#6b7280'
                              }}
                            >
                              {isChecked ? '✓ Allowed' : '+ Include'}
                            </button>
                          </div>
                          {isChecked && (
                            <select
                              value={currentSource.fieldMapping?.name || ''}
                              onChange={e => updateSheetSourceMapping(activeSheetIdx, 'name', e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1fae5', fontSize: 12, background: '#fff', outline: 'none' }}
                            >
                              <option value="">-- Match Name Column --</option>
                              {currentSource.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })()}

                    {/* 3. Email */}
                    {(() => {
                      const isChecked = allowed.email !== false;
                      return (
                        <div style={{
                          padding: '12px 14px', borderRadius: 12,
                          background: isChecked ? '#f0fdf4' : '#f9fafb',
                          border: `1.5px solid ${isChecked ? '#34d399' : '#e5e7eb'}`,
                          display: 'flex', flexDirection: 'column', gap: 6,
                          transition: 'all 0.15s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: isChecked ? '#065f46' : '#6b7280' }}>✉️ Email</span>
                            <button
                              type="button"
                              onClick={() => toggleAllowedColumn(activeSheetIdx, 'email')}
                              style={{
                                padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                fontSize: 11, fontWeight: 700,
                                background: isChecked ? '#10b981' : '#e5e7eb',
                                color: isChecked ? '#fff' : '#6b7280'
                              }}
                            >
                              {isChecked ? '✓ Allowed' : '+ Include'}
                            </button>
                          </div>
                          {isChecked && (
                            <select
                              value={currentSource.fieldMapping?.email || ''}
                              onChange={e => updateSheetSourceMapping(activeSheetIdx, 'email', e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1fae5', fontSize: 12, background: '#fff', outline: 'none' }}
                            >
                              <option value="">-- Match Email Column --</option>
                              {currentSource.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })()}

                    {/* 4. City */}
                    {(() => {
                      const isChecked = allowed.city !== false;
                      return (
                        <div style={{
                          padding: '12px 14px', borderRadius: 12,
                          background: isChecked ? '#f0fdf4' : '#f9fafb',
                          border: `1.5px solid ${isChecked ? '#34d399' : '#e5e7eb'}`,
                          display: 'flex', flexDirection: 'column', gap: 6,
                          transition: 'all 0.15s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: isChecked ? '#065f46' : '#6b7280' }}>📍 City</span>
                            <button
                              type="button"
                              onClick={() => toggleAllowedColumn(activeSheetIdx, 'city')}
                              style={{
                                padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                fontSize: 11, fontWeight: 700,
                                background: isChecked ? '#10b981' : '#e5e7eb',
                                color: isChecked ? '#fff' : '#6b7280'
                              }}
                            >
                              {isChecked ? '✓ Allowed' : '+ Include'}
                            </button>
                          </div>
                          {isChecked && (
                            <select
                              value={currentSource.fieldMapping?.location || ''}
                              onChange={e => updateSheetSourceMapping(activeSheetIdx, 'location', e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1fae5', fontSize: 12, background: '#fff', outline: 'none' }}
                            >
                              <option value="">-- Match City Column --</option>
                              {currentSource.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })()}

                    {/* 5. Interested */}
                    {(() => {
                      const isChecked = allowed.interested !== false;
                      return (
                        <div style={{
                          padding: '12px 14px', borderRadius: 12,
                          background: isChecked ? '#f0fdf4' : '#f9fafb',
                          border: `1.5px solid ${isChecked ? '#34d399' : '#e5e7eb'}`,
                          display: 'flex', flexDirection: 'column', gap: 6,
                          transition: 'all 0.15s ease'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: isChecked ? '#065f46' : '#6b7280' }}>🎯 Interested</span>
                            <button
                              type="button"
                              onClick={() => toggleAllowedColumn(activeSheetIdx, 'interested')}
                              style={{
                                padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                fontSize: 11, fontWeight: 700,
                                background: isChecked ? '#10b981' : '#e5e7eb',
                                color: isChecked ? '#fff' : '#6b7280'
                              }}
                            >
                              {isChecked ? '✓ Allowed' : '+ Include'}
                            </button>
                          </div>
                          {isChecked && (
                            <select
                              value={currentSource.fieldMapping?.interested || ''}
                              onChange={e => updateSheetSourceMapping(activeSheetIdx, 'interested', e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d1fae5', fontSize: 12, background: '#fff', outline: 'none' }}
                            >
                              <option value="">-- Match Course / Interest --</option>
                              {currentSource.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => testConnectionAndShowModal(activeSheetIdx)}
                    disabled={currentSource.columnsLoading}
                    style={{
                      ...s.btnPrimary,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      padding: '12px 24px',
                      fontSize: 14,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    {/* Modern SVG Lightning / Connection Icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    {currentSource.columnsLoading ? 'Connecting & Reading Data...' : '⚡ Test Connection & Load Columns'}
                  </button>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => navigate('/meta-leads')}
                      style={s.btnGhost}
                    >
                      View Meta Leads ➔
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleSave({ status: 'active' });
                        alert('Google Sheet configuration saved successfully!');
                      }}
                      style={s.btnPrimary}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : '💾 Save Configuration'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ────────────────────────────────────────────────────────── */}
              {/* "ADD TODO" STYLE POPUP MODAL CARD (Preview & Confirmation) */}
              {/* ────────────────────────────────────────────────────────── */}
              {showPreviewModal && previewData && (
                <div style={{
                  position: 'fixed', inset: 0,
                  background: 'rgba(2, 48, 71, 0.45)',
                  backdropFilter: 'blur(3px)',
                  zIndex: 1000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 16
                }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: 16,
                    width: '100%',
                    maxWidth: 560,
                    padding: 24,
                    boxShadow: '0 16px 40px rgba(2, 48, 71, 0.18)',
                    border: '1px solid #e2e8f0',
                    maxHeight: '92vh',
                    overflowY: 'auto'
                  }}>
                    {/* Modal Top Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 18
                        }}>
                          ⚡
                        </div>
                        <div>
                          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--theme-text-strongest)', margin: 0 }}>
                            Sheet Connection & Data Preview
                          </h3>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {previewData.sheetName} ({previewData.tabName})
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(false)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#94a3b8', fontSize: 22, lineHeight: 1, padding: 4
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div style={{ display: 'grid', gap: 16 }}>
                      {/* Connection Status Badge */}
                      {previewData.totalRows === 0 ? (
                        <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>
                              ⚠️ Sheet Connected, but 0 Lead Row(s) Detected
                            </div>
                            <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                              Sheet header read ayyindi, but row data emi ledu. Sheet lo lead rows undho ledo check cheyandi.
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#f59e0b', padding: '3px 10px', borderRadius: 20 }}>
                            0 Leads Found
                          </span>
                        </div>
                      ) : (
                        <div style={{ padding: '12px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#065f46' }}>
                              ✓ Successfully Connected to Google Sheet!
                            </div>
                            <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                              {previewData.totalRows} lead row(s) ready to sync • {previewData.columns.length} columns available
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#10b981', padding: '3px 10px', borderRadius: 20 }}>
                            Ready to Sync ({previewData.totalRows} leads)
                          </span>
                        </div>
                      )}

                      {/* Allowed Columns Display */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                          Columns to Ingest:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                            📱 Phone (Mandatory)
                          </span>
                          {previewData.allowedColumns.name !== false && (
                            <span style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                              👤 Name
                            </span>
                          )}
                          {previewData.allowedColumns.email !== false && (
                            <span style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                              ✉️ Email
                            </span>
                          )}
                          {previewData.allowedColumns.city !== false && (
                            <span style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                              📍 City
                            </span>
                          )}
                          {previewData.allowedColumns.interested !== false && (
                            <span style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                              🎯 Interested
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sample Data Live Preview Table */}
                      {previewData.sampleRows && previewData.sampleRows.length > 0 ? (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                            Sample Existing Leads from Sheet ({previewData.sampleRows.length} shown):
                          </div>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflowX: 'auto', background: '#fafafa' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Name</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Phone</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Email</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>City</th>
                                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Interested</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.sampleRows.map((row, rIdx) => {
                                  const nameVal = row[previewData.fieldMapping?.name] || row.full_name || row.name || row.Candidate || '-';
                                  const phoneVal = row[previewData.fieldMapping?.phone] || row.phone_number || row.phone || row.mobile || '-';
                                  const emailVal = row[previewData.fieldMapping?.email] || row.email || '-';
                                  const cityVal = row[previewData.fieldMapping?.location] || row.city || row.location || '-';
                                  const interestedVal = row[previewData.fieldMapping?.interested] || row.interested || row.course || '-';
                                  return (
                                    <tr key={rIdx} style={{ borderBottom: rIdx < previewData.sampleRows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                      <td style={{ padding: '6px 10px', fontWeight: 500, color: '#1e293b' }}>{String(nameVal).slice(0, 20)}</td>
                                      <td style={{ padding: '6px 10px', color: '#059669', fontWeight: 600 }}>{String(phoneVal).slice(0, 15)}</td>
                                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{String(emailVal).slice(0, 24)}</td>
                                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{String(cityVal).slice(0, 15)}</td>
                                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{String(interestedVal).slice(0, 20)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: 12, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                          No lead rows were found under the header row in this sheet tab.
                        </div>
                      )}

                      {/* Direct Sync Info */}
                      <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', lineHeight: 1.4 }}>
                        💡 Click <strong>Confirm & Sync</strong> to save this sheet configuration and immediately sync all existing leads into CRM Meta Leads.
                      </div>
                    </div>

                    {/* Modal Bottom Buttons (Cancel & Confirm) */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(false)}
                        style={{
                          flex: 1, padding: '10px 14px',
                          border: '1px solid var(--theme-border-tint)',
                          borderRadius: 8, background: '#fff',
                          fontSize: 14, fontWeight: 500, cursor: 'pointer',
                          color: 'var(--theme-text-strongest)'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAndSync}
                        disabled={confirmLoading}
                        style={{
                          flex: 1.4, padding: '10px 14px',
                          border: 'none', borderRadius: 8,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#fff', fontSize: 14, fontWeight: 600,
                          cursor: 'pointer',
                          opacity: confirmLoading ? 0.7 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                      >
                        {confirmLoading ? 'Syncing to Meta Leads...' : (previewData.totalRows > 0 ? `Confirm & Sync ${previewData.totalRows} Leads ➔` : 'Confirm & Sync to Meta Leads ➔')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* GENERIC INTEGRATIONS WIZARD (Facebook, WhatsApp, etc.)         */
            /* ============================================================== */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
                {STEPS.map((st, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => setStep(i)}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: `2px solid ${i <= step ? 'var(--theme-primary-alt)' : '#d1d5db'}`,
                        background: i < step ? 'var(--theme-primary-alt)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: i < step ? '#fff' : i === step ? 'var(--theme-primary-alt)' : '#9ca3af',
                        fontWeight: 700, fontSize: 13,
                      }}>
                        {i < step ? '✓' : i + 1}
                      </div>
                      <div style={{ fontSize: 11, color: i === step ? 'var(--theme-primary-alt)' : '#9ca3af', fontWeight: i === step ? 600 : 400, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {st.label}<br /><span style={{ fontSize: 10 }}>{st.sub}</span>
                      </div>
                    </div>
                    {i < STEPS.length - 1 && <div style={{ height: 1, width: 60, background: i < step ? 'var(--theme-primary-alt)' : '#d1d5db', margin: '0 4px', marginBottom: 24 }} />}
                  </div>
                ))}
              </div>

              <div style={{ ...s.card, padding: 28 }}>
                {step === 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 20px', color: 'var(--theme-text-strongest)' }}>Integration Credentials</h4>
                    {type === 'facebook' && (
                      <div style={{ marginBottom: 20 }}>
                        <button onClick={startFacebookOAuth} style={s.btnPrimary}>🔐 Connect with Facebook (OAuth)</button>
                      </div>
                    )}
                    {type === 'google_meet' && (
                      <div style={{ marginBottom: 20 }}>
                        <button onClick={startGoogleOAuth} style={s.btnPrimary}>🔐 Connect with Google (OAuth)</button>
                      </div>
                    )}
                    {configFields.length > 0 && (
                      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
                        {configFields.map(field => (
                          <div key={field.key}>
                            <label style={s.lbl}>{field.label}</label>
                            <input
                              value={config[field.key] || ''}
                              onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              style={s.inp}
                              type={field.key.toLowerCase().includes('secret') || field.key.toLowerCase().includes('token') ? 'password' : 'text'}
                            />
                            {field.hint && <div style={s.hint}>{field.hint}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {isGenericWebhook && (
                      <div style={{ padding: 20, background: 'var(--theme-surface-faint2)', borderRadius: 8, fontSize: 14, color: '#374151' }}>
                        <strong>{integration.name}</strong> uses a webhook push model.
                        Copy the webhook URL from the Overview tab and paste it in your {integration.name} account.
                      </div>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px', color: 'var(--theme-text-strongest)' }}>Map Fields</h4>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {['name', 'phone', 'email', 'location'].map(field => (
                        <div key={field} style={{ display: 'grid', gridTemplateColumns: '120px 20px 1fr', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--theme-text-strongest)', textTransform: 'capitalize' }}>{field}</span>
                          <span style={{ color: '#9ca3af' }}>←</span>
                          <input
                            value={fieldMapping[field] || ''}
                            onChange={e => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                            placeholder={`Source field for "${field}"`}
                            style={s.inp}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px' }}>Default Campaign</h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={defaultCampaign} onChange={e => setDefaultCampaign(e.target.value)} style={{ ...s.inp, flex: 1 }}>
                        <option value="">No campaign</option>
                        {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                      <button onClick={() => setShowNewCampaign(v => !v)} style={s.btnGhost}>+ New Campaign</button>
                    </div>
                    {showNewCampaign && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <input
                          value={newCampaignName}
                          onChange={e => setNewCampaignName(e.target.value)}
                          placeholder="Campaign name"
                          style={{ ...s.inp, flex: 1 }}
                          onKeyDown={e => { if (e.key === 'Enter') createCampaignInline(); }}
                        />
                        <button onClick={createCampaignInline} style={s.btnPrimary} disabled={creatingCampaign || !newCampaignName.trim()}>
                          {creatingCampaign ? 'Creating...' : 'Create'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px' }}>Lead Distribution</h4>
                    <select value={defaultAssignedTo} onChange={e => setDefaultAssignedTo(e.target.value)} style={s.inp}>
                      <option value="">Auto assign / None</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h4 style={{ margin: '0 0 20px' }}>Connect & Verify</h4>
                    {type === 'facebook' && (
                      <div style={{ display: 'grid', gap: 12 }}>
                        <button onClick={() => doAction('subscribe', () => api.post(`/integrations/${id}/facebook/subscribe`))} style={s.btnPrimary} disabled={!!actionLoading}>
                          {actionLoading === 'subscribe' ? 'Subscribing...' : '1. Subscribe Page to Lead Webhooks'}
                        </button>
                        <button onClick={() => doAction('sync', () => api.post(`/integrations/${id}/facebook/sync`))} style={s.btnGhost} disabled={!!actionLoading}>
                          {actionLoading === 'sync' ? 'Syncing...' : '2. Pull Existing Leads from Form'}
                        </button>
                      </div>
                    )}
                    {type === 'whatsapp_cloud' && (
                      <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, fontSize: 13 }}>
                        Webhook URL: <code>{backendUrl}/api/integrations/whatsapp/webhook</code>
                      </div>
                    )}
                    {type === 'google_meet' && (
                      <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, fontSize: 13 }}>
                        Google Meet is connected via OAuth.
                      </div>
                    )}
                    {isGenericWebhook && (
                      <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
                        <code>{webhookUrl}</code>
                      </div>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                    <h4 style={{ margin: '0 0 8px', color: 'var(--theme-text-strongest)', fontSize: 18 }}>Integration Complete!</h4>
                    <button onClick={() => setActiveTab('leads')} style={{ ...s.btnPrimary, marginTop: 16 }}>View Leads</button>
                  </div>
                )}
              </div>

              {step < 5 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                  <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ ...s.btnGhost, opacity: step === 0 ? 0.5 : 1 }}>Back</button>
                  <button onClick={async () => {
                    if (step === 4) { await handleSave({ status: 'active' }); setStep(5); }
                    else { await handleSave({}, true); setStep(s => s + 1); }
                  }} style={s.btnPrimary} disabled={saving}>
                    {step === 4 ? (saving ? 'Saving...' : 'Save & Finish') : (saving ? 'Saving...' : 'Next')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Actions Tab ── */}
      {activeTab === 'actions' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {type === 'google_sheets' && (
            <div style={s.card}>
              <h4 style={{ margin: '0 0 16px' }}>Google Sheets Direct Cloud Actions</h4>
              <div style={{ padding: 14, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#166534', marginBottom: 16 }}>
                ⚡ <strong>Direct CRM Live Sync</strong> is active. Google Apps Script (<code>Code.gs</code>) is permanently removed.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => doAction('import_all', () => api.post(`/integrations/${id}/sheets/import`))}
                  style={s.btnPrimary}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'import_all' ? 'Live Syncing...' : '🚀 Live Sync All Sheets Now'}
                </button>
              </div>
            </div>
          )}

          {actionResult && (
            <div style={{ ...s.card, background: actionResult.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${actionResult.ok ? '#86efac' : '#fca5a5'}` }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12, color: actionResult.ok ? '#166534' : '#dc2626' }}>
                {actionResult.ok ? JSON.stringify(actionResult.data, null, 2) : `❌ ${actionResult.msg}`}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Leads Tab ── */}
      {activeTab === 'leads' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--theme-text-strongest)' }}>
              Leads from {integration.name} ({leadsTotal})
            </h3>
            {type === 'google_sheets' && sheetSources.length > 0 && (
              <select value={sheetFilter} onChange={e => setSheetFilter(e.target.value)} style={{ ...s.inp, width: 220 }}>
                <option value="">All sheet sources</option>
                {sheetSources.filter(src => src.sheetId).map((src, idx) => (
                  <option key={idx} value={src.name || `Sheet ${idx + 1}`}>{src.name || `Sheet ${idx + 1}`}</option>
                ))}
              </select>
            )}
          </div>
          {(() => {
            const filteredLeads = (type === 'google_sheets' && sheetFilter)
              ? leads.filter(lead => (lead.sourceSheetName || '') === sheetFilter || (lead.campaign?.name || '') === sheetFilter)
              : leads;
            if (filteredLeads.length === 0) {
              return (
                <div style={{ ...s.card, padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  {sheetFilter ? `No leads yet from "${sheetFilter}".` : `No leads yet from ${integration.name}.`}
                </div>
              );
            }
            return (
              <div style={{ background: '#fff', border: '1px solid var(--theme-border-tint)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--theme-surface-faint2)' }}>
                      {['Name', 'Phone', 'Email', 'Status', 'Campaign', 'Assigned To', ...(type === 'google_sheets' ? ['Source Sheet'] : []), 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--theme-surface-faint5)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, idx) => (
                      <tr key={lead._id} style={{ borderBottom: idx < filteredLeads.length - 1 ? '1px solid var(--theme-surface-faint5)' : 'none', cursor: 'pointer' }}
                        onClick={() => navigate(`/leads/${lead._id}`)}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{lead.name}</td>
                        <td style={{ padding: '12px 16px', color: '#4f46e5' }}>{lead.phone}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{lead.email || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 12, background: 'var(--theme-surface-tint2)', color: 'var(--theme-primary)', fontSize: 12, fontWeight: 500 }}>{lead.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{lead.campaign?.name || '-'}</td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{lead.assignedTo?.name || '-'}</td>
                        {type === 'google_sheets' && (
                          <td style={{ padding: '12px 16px', color: '#6b7280' }}>{lead.sourceSheetName || '-'}</td>
                        )}
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
