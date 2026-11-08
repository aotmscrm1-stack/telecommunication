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

const ORANGE = '#ea580c';
const ORANGE_DARK = '#c2410c';
const ORANGE_LIGHT = '#fff7ed';
const ORANGE_BORDER = '#fed7aa';

const IntegrationLogo = ({ type, name, size = 50 }) => {
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
        border: `1px solid ${ORANGE_BORDER}`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        padding: size * 0.14, boxSizing: 'border-box', overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(234, 88, 12, 0.08)'
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
    <div style={{ width: size, height: size, borderRadius: 12, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
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
  mapping.interested = findCol(['interested', 'intersted', 'course', 'program', 'training', 'domain', 'stream', 'module']) || '';
  mapping.collegeName = findCol(['collegename', 'college', 'university', 'institute']) || '';
  mapping.lastQualification = findCol(['qualification', 'degree', 'education', 'branch']) || '';
  mapping.mode = findCol(['mode', 'trainingmode', 'batchmode']) || '';
  mapping.budget = findCol(['budget', 'fee', 'price', 'fees']) || '';

  return mapping;
};

const GENERIC_WEBHOOK_TYPES = ['justdial', '99acres', 'housing', 'indiamart', 'magicbricks', 'sulekha', 'tradeindia', 'webhook'];

const s = {
  card: { background: '#fff', border: `1px solid ${ORANGE_BORDER}`, borderRadius: 16, padding: 24 },
  inp: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#0f172a', transition: 'border-color 0.15s ease' },
  lbl: { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  btnPrimary: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' },
  btnGhost: { padding: '9px 18px', borderRadius: 10, border: `1.5px solid ${ORANGE_BORDER}`, background: '#fff', color: ORANGE, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnDanger: { padding: '7px 16px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' },
  hint: { fontSize: 11, color: '#64748b', marginTop: 4 },
};

export default function IntegrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generic step (for non-Google Sheets integrations)
  const [step, setStep] = useState(0);

  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // How to Connect Guide Modal state
  const [showHowToConnect, setShowHowToConnect] = useState(false);

  // Popup Modal Card state (Test Connection & Load Columns preview modal)
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Config state
  const [config, setConfig] = useState({});
  const [fieldMapping, setFieldMapping] = useState({ name: 'name', phone: 'phone', email: 'email', location: 'location', interested: 'interested' });
  const [defaultCampaign, setDefaultCampaign] = useState('');
  const [defaultAssignedTo, setDefaultAssignedTo] = useState('');

  // Multiple Google Sheets sources
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
  });

  const [sheetSources, setSheetSources] = useState([emptySheetSource()]);

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
        campaignsAPI.getAll().catch(() => ({ data: { campaigns: [] } })),
        usersAPI.getAll().catch(() => ({ data: { users: [] } })),
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
          };
        }));
      }
      setDefaultCampaign(intg.defaultCampaign?._id || '');
      setDefaultAssignedTo(intg.defaultAssignedTo?._id || '');
      setCampaigns(campRes.data?.campaigns || []);
      setUsers(usersRes.data?.users || []);
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
          .map(({ columns, columnsLoading, columnsError, availableTabs, ...rest }, idx) => ({
            ...rest,
            name: rest.name || `Sheet ${idx + 1}`,
            campaign: rest.name || rest.campaign || `Sheet ${idx + 1}`
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
        .map(({ columns, columnsLoading, columnsError, availableTabs, ...rest }, sIdx) => ({
          ...rest,
          name: rest.name || `Sheet ${sIdx + 1}`,
          campaign: rest.name || rest.campaign || `Sheet ${sIdx + 1}`
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

  const toggleAllowedColumn = (idx, colKey) => {
    if (colKey === 'phone') return; // Phone is mandatory
    setSheetSources(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const current = s.allowedColumns || { phone: true, name: true, email: true, city: true, interested: true };
      return {
        ...s,
        allowedColumns: {
          ...current,
          [colKey]: current[colKey] === false ? true : false
        }
      };
    }));
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

  // Test Connection, Fetch Columns & All Rows, then open clean Preview Modal
  const testConnectionAndShowModal = async (idx) => {
    const src = sheetSources[idx];
    if (!src.sheetId) {
      updateSheetSource(idx, { columnsError: 'Please enter a Google Sheet ID or URL.' });
      return;
    }

    const cleanRange = (src.sheetRange || '').replace(/!:+/g, '!').trim();
    if (cleanRange !== src.sheetRange) {
      updateSheetSource(idx, { sheetRange: cleanRange });
    }

    const parsed = parseSheetUrlOrId(src.sheetId);
    const effectiveSheetId = parsed.sheetId || src.sheetId;
    const effectiveGid = parsed.gid || src.gid;

    updateSheetSource(idx, { columnsLoading: true, columnsError: '' });
    try {
      const res = await integrationsAPI.getSheetColumns(id, effectiveSheetId, cleanRange || src.sheetRange, effectiveGid);
      const cols = res.data.columns || [];
      const sampleRows = res.data.sampleRows || [];
      const totalRows = sampleRows.length > 0 ? sampleRows.length : (res.data.totalRows || 0);

      if (!res.data.success || cols.length === 0) {
        updateSheetSource(idx, {
          columnsLoading: false,
          columnsError: res.data.message || 'No columns found in the sheet. Please make sure the sheet has a header row and is shared with "Anyone with the link".'
        });
        return;
      }

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

      // Silently save updated sheet source
      setTimeout(async () => {
        try {
          const currentSources = sheetSources.map((s, i) => i === idx ? { ...s, sheetId: effectiveSheetId, gid: effectiveGid, sheetRange: cleanRange, columns: cols, fieldMapping: updatedMapping } : s);
          const cleanSources = currentSources
            .filter(s => s.sheetId)
            .map(({ columns, columnsLoading, columnsError, availableTabs, ...rest }, sIdx) => ({
              ...rest,
              name: rest.name || `Sheet ${sIdx + 1}`,
              campaign: rest.name || rest.campaign || `Sheet ${sIdx + 1}`
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
        columnsError: err.response?.data?.message || err.message || 'Could not load columns. Please verify that sheet sharing is set to "Anyone with the link".',
        availableTabs: err.response?.data?.availableTabs || [],
      });
    }
  };

  // Confirm in Popup Modal: Save, Sync & Navigate to Meta Leads
  const handleConfirmAndSync = async () => {
    setConfirmLoading(true);
    try {
      await handleSave({}, true);
      const targetSrc = sheetSources[activeSheetIdx];
      await integrationsAPI.importSheets(id, targetSrc?.sheetId);
      setShowPreviewModal(false);
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

  const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin.replace('3000', '5000');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner-gradient" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (!integration) return <div style={{ padding: 32, color: '#9ca3af' }}>Integration not found.</div>;

  const type = integration.type;
  const webhookUrl = `${backendUrl}/api/integrations/webhook/${integration.webhookKey}`;
  const isGenericWebhook = GENERIC_WEBHOOK_TYPES.includes(type);

  const currentSource = sheetSources[activeSheetIdx] || emptySheetSource();
  const allowed = currentSource.allowedColumns || { phone: true, name: true, email: true, city: true, interested: true };

  // Helper to extract display values for any row in the preview modal
  const extractRowPreview = (row, mapping) => {
    if (row._extracted) {
      return row._extracted;
    }
    const nameVal = row[mapping?.name] || row.full_name || row.name || row.Name || row['Full Name'] || row['Candidate Name'] || '-';
    const phoneVal = row[mapping?.phone] || row.phone_number || row.phone || row.Phone || row.mobile || '-';
    const emailVal = row[mapping?.email] || row.email || row.Email || '-';
    const cityVal = row[mapping?.location] || row.city || row.City || row.location || '-';
    let interestedVal = row[mapping?.interested] || row.interested || row.Interested || row.intersted || row.Intersted || row.course || row.Course || '';
    if (!interestedVal) {
      const k = Object.keys(row).find(key => /intere?st|course|program|module/i.test(key));
      if (k) interestedVal = row[k];
    }
    return {
      name: nameVal || '-',
      phone: phoneVal || '-',
      email: emailVal || '-',
      city: cityVal || '-',
      interested: interestedVal || '-'
    };
  };

  return (
    <div className="id-shell" style={{ padding: '20px 28px', maxWidth: 1140, margin: '0 auto', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        @media (max-width: 640px) {
          .id-shell { padding: 14px !important; }
          .id-shell [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          .id-shell div[style*="display: flex"] { flex-wrap: wrap; row-gap: 6px; }
          .id-shell div[style*="display: flex"] > * { min-width: 0; }
        }
      `}</style>

      {/* Top Navigation Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <button
          onClick={() => navigate('/integrations')}
          style={{ background: 'none', border: 'none', color: ORANGE, cursor: 'pointer', fontSize: 13.5, padding: 0, fontWeight: 600 }}
        >
          ← Back to Integrations
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {type === 'google_sheets' && (
            <button
              type="button"
              onClick={() => setShowHowToConnect(true)}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: `1.5px solid ${ORANGE}`,
                background: ORANGE_LIGHT,
                color: ORANGE,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)'
              }}
            >
              How to Connect
            </button>
          )}
          <button onClick={handleRemove} disabled={removing} style={s.btnDanger}>
            {removing ? 'Removing...' : 'Unlink'}
          </button>
        </div>
      </div>

      {/* Integration Title Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginBottom: 20, padding: '16px 20px',
        background: '#ffffff', border: `1px solid ${ORANGE_BORDER}`,
        borderRadius: 14, boxShadow: '0 2px 10px rgba(234, 88, 12, 0.04)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IntegrationLogo type={integration.type} name={integration.name} size={46} />
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#0f172a' }}>{integration.name}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
              {type === 'google_sheets'
                ? 'Connect Google Sheets and sync leads directly into Meta Leads.'
                : integration.description}
            </p>
          </div>
        </div>
        {type === 'google_sheets' && (
          <span style={{
            background: ORANGE_LIGHT, color: ORANGE, fontWeight: 700, fontSize: 11.5,
            padding: '5px 14px', borderRadius: 20, border: `1px solid ${ORANGE_BORDER}`
          }}>
            Direct Cloud Sync
          </span>
        )}
      </div>

      {/* Main Content */}
      {type === 'google_sheets' ? (
        <div>
          {/* Multi-Sheet Selector Tabs (Orange & White Theme) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#ffffff', border: `1px solid ${ORANGE_BORDER}`,
            borderRadius: 12, padding: '10px 14px', marginBottom: 18, overflowX: 'auto'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4, whiteSpace: 'nowrap' }}>
              Sheets:
            </span>
            {sheetSources.map((src, idx) => {
              const isActive = idx === activeSheetIdx;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    background: isActive ? ORANGE : '#ffffff',
                    color: isActive ? '#ffffff' : '#334155',
                    border: `1.5px solid ${isActive ? ORANGE : '#e2e8f0'}`,
                    whiteSpace: 'nowrap', transition: 'all 0.15s ease'
                  }}
                  onClick={() => setActiveSheetIdx(idx)}
                >
                  <span>{src.name || `Sheet ${idx + 1}`}</span>
                  {sheetSources.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSheetSource(idx); }}
                      title="Remove this sheet"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isActive ? '#ffedd5' : '#94a3b8',
                        fontSize: 15, padding: '0 2px', lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={addSheetSource}
              style={{
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, background: ORANGE_LIGHT,
                color: ORANGE,
                border: `1.5px dashed ${ORANGE}`,
                whiteSpace: 'nowrap'
              }}
            >
              + Add Sheet
            </button>
          </div>

          {/* Google Sheet Configuration Card (Orange & White Theme) */}
          <div style={{
            background: '#ffffff',
            border: `1.5px solid ${ORANGE_BORDER}`,
            borderRadius: 16,
            padding: '24px 26px',
            boxShadow: '0 8px 24px -6px rgba(234, 88, 12, 0.06)'
          }}>
            {/* Card Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${ORANGE_LIGHT}`, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: '#0f172a' }}>
                  Google Sheet Configuration
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                  Enter your Google Sheet details and choose required columns.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: ORANGE, background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, padding: '4px 12px', borderRadius: 20 }}>
                  Editing: {currentSource.name || `Sheet ${activeSheetIdx + 1}`}
                </span>
              </div>
            </div>

            {/* 3 Clean Input Fields Grid (Removed Target Campaign & Auto-Assign Telecaller) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 22 }}>
              {/* 1. Sheet Label */}
              <div>
                <label style={s.lbl}>Sheet Label / Title</label>
                <input
                  value={currentSource.name}
                  onChange={e => updateSheetSource(activeSheetIdx, { name: e.target.value })}
                  placeholder="e.g. Digital Marketing Leads"
                  style={s.inp}
                />
                <div style={s.hint}>Campaign label shown in CRM.</div>
              </div>

              {/* 2. Google Sheet ID or URL */}
              <div>
                <label style={s.lbl}>Google Sheet ID or Full URL</label>
                <input
                  value={currentSource.sheetId}
                  onChange={e => handleSheetIdChange(activeSheetIdx, e.target.value)}
                  placeholder="Paste Google Sheet URL or Sheet ID"
                  style={s.inp}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={s.hint}>Paste full link or Sheet ID</span>
                  {currentSource.sheetId && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: ORANGE, background: ORANGE_LIGHT, padding: '1px 7px', borderRadius: 4, border: `1px solid ${ORANGE_BORDER}` }}>
                      ID: {currentSource.sheetId.slice(0, 12)}...
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Sheet Tab Name / Range */}
              <div>
                <label style={s.lbl}>Sheet Tab Name / Range</label>
                <input
                  value={currentSource.sheetRange}
                  onChange={e => updateSheetSource(activeSheetIdx, { sheetRange: e.target.value.replace(/!:+/g, '!'), columns: [] })}
                  onBlur={e => updateSheetSource(activeSheetIdx, { sheetRange: e.target.value.replace(/!:+/g, '!').trim() })}
                  placeholder="e.g. Sheet1 or 'Leads'!A:ZZ"
                  style={s.inp}
                />
                <div style={s.hint}>Exact tab name from the bottom of your sheet.</div>
              </div>
            </div>

            {/* Suggested Tabs if returned on error */}
            {currentSource.availableTabs && currentSource.availableTabs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginRight: 6 }}>Available Tabs:</span>
                {currentSource.availableTabs.map(tab => (
                  <button key={tab} type="button" onClick={() => useSuggestedTab(activeSheetIdx, tab)} style={{ ...s.btnGhost, padding: '3px 10px', fontSize: 11, marginRight: 6 }}>
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* Simple Error Notice if connection fails */}
            {currentSource.columnsError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 12.5,
                fontWeight: 500,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap'
              }}>
                <span>{currentSource.columnsError}</span>
                <button
                  type="button"
                  onClick={() => setShowHowToConnect(true)}
                  style={{
                    background: '#fff', border: '1px solid #fca5a5', color: '#b91c1c',
                    padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  View Connection Steps
                </button>
              </div>
            )}

            {/* ── COLUMNS ALLOWED / REQUIRED (Clean Radio Buttons Only — No Dropdowns, No Icons) ── */}
            <div style={{
              background: ORANGE_LIGHT,
              border: `1px solid ${ORANGE_BORDER}`,
              borderRadius: 12,
              padding: '16px 18px',
              marginBottom: 22
            }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                  Columns Allowed / Required
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Select the columns to sync from your Google Sheet (Phone is required):
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { key: 'phone', label: 'Phone (Required)', mandatory: true },
                  { key: 'name', label: 'Name', mandatory: false },
                  { key: 'email', label: 'Email', mandatory: false },
                  { key: 'city', label: 'City', mandatory: false },
                  { key: 'interested', label: 'Interested', mandatory: false },
                ].map(col => {
                  const isSelected = col.mandatory ? true : allowed[col.key] !== false;
                  return (
                    <label
                      key={col.key}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!col.mandatory) toggleAllowedColumn(activeSheetIdx, col.key);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 16px',
                        borderRadius: 10,
                        background: '#ffffff',
                        border: `1.5px solid ${isSelected ? ORANGE : '#cbd5e1'}`,
                        cursor: col.mandatory ? 'default' : 'pointer',
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? '#0f172a' : '#64748b',
                        userSelect: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        readOnly
                        style={{
                          accentColor: ORANGE,
                          width: 15,
                          height: 15,
                          margin: 0,
                          cursor: col.mandatory ? 'default' : 'pointer'
                        }}
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bottom Action Buttons (Orange & White Theme) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <button
                type="button"
                onClick={() => testConnectionAndShowModal(activeSheetIdx)}
                disabled={currentSource.columnsLoading}
                style={{
                  ...s.btnPrimary,
                  background: ORANGE,
                  padding: '11px 22px',
                  fontSize: 13.5,
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.22)'
                }}
              >
                {currentSource.columnsLoading ? 'Loading Sheet Leads...' : '⚡ Test Connection & Load Columns'}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => navigate('/meta-leads')}
                  style={s.btnGhost}
                >
                  View Meta Leads →
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSave({ status: 'active' });
                    alert('Google Sheet configuration saved successfully!');
                  }}
                  style={{
                    ...s.btnPrimary,
                    background: '#ffffff',
                    color: ORANGE,
                    border: `1.5px solid ${ORANGE}`
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* HOW TO CONNECT — STEP BY STEP GUIDE MODAL (Right Corner Button)  */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {showHowToConnect && (
            <div style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 1050,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 520,
                padding: '22px 24px',
                border: `1.5px solid ${ORANGE_BORDER}`,
                boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${ORANGE_BORDER}` }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: '#0f172a' }}>
                      How to Connect Google Sheet
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Step-by-step guide to connect your sheet
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHowToConnect(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 22, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    {
                      step: '1',
                      title: 'Open Your Google Sheet & Click Share',
                      desc: 'Open your Google Sheet in the browser and click the "Share" button at the top-right corner.'
                    },
                    {
                      step: '2',
                      title: 'Set Access to "Anyone with the link"',
                      desc: 'Under General access, change "Restricted" to "Anyone with the link" (Viewer) and click Done.'
                    },
                    {
                      step: '3',
                      title: 'Paste Sheet Link & Tab Name',
                      desc: 'Copy the browser URL and paste it in "Google Sheet ID or Full URL". Enter the Sheet Label and Tab Name (e.g. Sheet1).'
                    },
                    {
                      step: '4',
                      title: 'Select Required Columns',
                      desc: 'Use the radio buttons to keep Phone, Name, Email, City, and Interested enabled.'
                    },
                    {
                      step: '5',
                      title: 'Test Connection & Sync',
                      desc: 'Click "⚡ Test Connection & Load Columns" to verify all leads and click "Confirm & Sync".'
                    }
                  ].map(item => (
                    <div
                      key={item.step}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: ORANGE_LIGHT,
                        border: `1px solid ${ORANGE_BORDER}`
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: ORANGE, color: '#ffffff',
                        fontWeight: 700, fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 1
                      }}>
                        {item.step}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 1.45 }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                  <button
                    type="button"
                    onClick={() => setShowHowToConnect(false)}
                    style={s.btnPrimary}
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* CLEAN & SIMPLE PREVIEW MODAL (Orange & White Theme, All Leads)   */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {showPreviewModal && previewData && (
            <div style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 1050,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 720,
                padding: '20px 24px',
                boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
                border: `1.5px solid ${ORANGE_BORDER}`,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Clean Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: `1px solid ${ORANGE_BORDER}`, gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {previewData.sheetName}
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Tab: {previewData.tabName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: ORANGE, background: ORANGE_LIGHT,
                      border: `1px solid ${ORANGE_BORDER}`,
                      padding: '4px 12px', borderRadius: 20
                    }}>
                      {previewData.sampleRows.length} Leads Found
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(false)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#64748b', fontSize: 22, lineHeight: 1, padding: 2
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* All Leads Scrollable Table */}
                <div style={{ marginTop: 14, flex: 1, overflowY: 'auto', maxHeight: '58vh', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  {previewData.sampleRows && previewData.sampleRows.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead style={{ position: 'sticky', top: 0, background: ORANGE_LIGHT, zIndex: 1 }}>
                        <tr style={{ borderBottom: `1px solid ${ORANGE_BORDER}` }}>
                          <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: ORANGE, width: 40 }}>#</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>Name</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>Phone</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>Email</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>City</th>
                          <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>Interested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.sampleRows.map((row, rIdx) => {
                          const item = extractRowPreview(row, previewData.fieldMapping);
                          return (
                            <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9', background: rIdx % 2 === 0 ? '#ffffff' : '#fffaf5' }}>
                              <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>{rIdx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                              <td style={{ padding: '8px 10px', color: ORANGE, fontWeight: 600, fontFamily: 'monospace' }}>{item.phone}</td>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>{item.email}</td>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>{item.city}</td>
                              <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 500 }}>{item.interested}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      No lead rows found in this sheet tab.
                    </div>
                  )}
                </div>

                {/* Clean Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    style={{
                      padding: '9px 18px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      background: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#334155'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAndSync}
                    disabled={confirmLoading}
                    style={{
                      padding: '9px 20px',
                      border: 'none',
                      borderRadius: 8,
                      background: ORANGE,
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: confirmLoading ? 0.7 : 1
                    }}
                  >
                    {confirmLoading ? 'Syncing...' : `Confirm & Sync (${previewData.sampleRows.length} Leads)`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Generic Integrations Wizard (Non-Google Sheets) */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
            {STEPS.map((st, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => setStep(i)}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `2px solid ${i <= step ? ORANGE : '#d1d5db'}`,
                    background: i < step ? ORANGE : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i < step ? '#fff' : i === step ? ORANGE : '#9ca3af',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: i === step ? 600 : 400, color: i === step ? ORANGE : '#6b7280', marginTop: 4, whiteSpace: 'nowrap' }}>{st.label}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 60, height: 2, background: i < step ? ORANGE : '#e5e7eb', margin: '0 6px', marginBottom: 24, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          <div style={s.card}>
            {step === 0 && (
              <div>
                <h4 style={{ margin: '0 0 16px' }}>Connection Details</h4>
                <div style={{ display: 'grid', gap: 14 }}>
                  {(CONFIG_FIELDS[type] || []).map(f => (
                    <div key={f.key}>
                      <label style={s.lbl}>{f.label}</label>
                      <input
                        value={config[f.key] || ''}
                        onChange={e => setConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={s.inp}
                      />
                      {f.hint && <div style={s.hint}>{f.hint}</div>}
                    </div>
                  ))}
                  {isGenericWebhook && (
                    <div style={{ padding: 14, background: ORANGE_LIGHT, borderRadius: 8, fontSize: 13 }}>
                      Webhook URL: <code>{webhookUrl}</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h4 style={{ margin: '0 0 16px' }}>Field Mapping</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  {Object.keys(fieldMapping).map(field => (
                    <div key={field} style={{ display: 'grid', gridTemplateColumns: '120px 20px 1fr', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{field}</span>
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
                <select value={defaultCampaign} onChange={e => setDefaultCampaign(e.target.value)} style={s.inp}>
                  <option value="">No campaign</option>
                  {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
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

            {step >= 4 && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 17 }}>Ready to Save</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Click Save & Finish below to activate your configuration.</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button onClick={() => setStep(st => Math.max(0, st - 1))} disabled={step === 0} style={{ ...s.btnGhost, opacity: step === 0 ? 0.5 : 1 }}>Back</button>
            <button onClick={async () => {
              if (step >= 4) { await handleSave({ status: 'active' }); }
              else { await handleSave({}, true); setStep(st => st + 1); }
            }} style={s.btnPrimary} disabled={saving}>
              {step >= 4 ? (saving ? 'Saving...' : 'Save & Finish') : (saving ? 'Saving...' : 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
