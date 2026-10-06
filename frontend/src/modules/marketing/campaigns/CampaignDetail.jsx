import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, leadsAPI, contactsAPI } from '../../../services/api';
import * as XLSX from 'xlsx';
import StatusBadge from '../../../components/common/StatusBadge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import LeadDetailsPage from '../../../components/LeadDetails/LeadDetailsPage';

// ─── White, Orange, Blue Design Tokens ────────────────────────────────────────
const ORANGE = '#ea580c';
const ORANGE_LIGHT = '#fff7ed';
const ORANGE_BORDER = '#ffedd5';
const ORANGE_HOVER = '#c2410c';

const BLUE = '#2563eb';
const BLUE_LIGHT = '#eff6ff';
const BLUE_BORDER = '#dbeafe';

const TEXT = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

const STATUS_COLORS = {
  Fresh: '#ea580c', // Orange
  Connected: '#2563eb', // Blue
  'Not Answered': '#f59e0b', // Amber
  'Call Back': '#0ea5e9', // Sky Blue
  'Call Not Responding': '#f97316', // Amber-Orange
  'Call Back Later': '#3b82f6', // Light Blue
  'Not interested': '#64748b',
  'Demo Scheduled': '#0284c7', // Sky Blue
  'Demo Done': '#1d4ed8', // Deep Blue
  Won: '#16a34a',
  Lost: '#ef4444',
  Blocked: '#334155',
  Enrolled: '#059669',
  Interested: '#d97706',
};

const PIE_COLORS = ['#ea580c', '#2563eb', '#f97316', '#3b82f6', '#0284c7', '#10b981', '#f59e0b', '#64748b'];

function Avatar({ name, size = 30, bg = ORANGE_LIGHT, color = ORANGE }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color, fontWeight: 500,
      fontSize: size * 0.36, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, border: `1px solid ${BORDER}`,
    }}>
      {initials}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
      <div className="spinner-gradient" style={{ width: 26, height: 26 }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Status mini-badge ───────────────────────────────────────────────────────
function MiniStatus({ status }) {
  const color = STATUS_COLORS[status] || '#64748b';
  return (
    <span style={{
      background: `${color}18`,
      color,
      borderRadius: 16,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 500,
      border: `1px solid ${color}33`,
      display: 'inline-block'
    }}>
      {status || '—'}
    </span>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color = TEXT, bg = '#fff', borderColor = BORDER }) {
  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      padding: '7px 8px',
      border: `1px solid ${borderColor}`,
      textAlign: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 1, fontWeight: 400 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color }}>{value ?? '—'}</div>
    </div>
  );
}

// ─── AI Calling Panel ────────────────────────────────────────────────────────
function AICallingPanel({ campaignId, campaign, onStatusChange }) {
  const [aiStatus, setAiStatus] = useState(null);
  const [aiConcurrency, setAiConcurrency] = useState(5);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await campaignsAPI.aiStatus(campaignId);
      setAiStatus(res.data);
    } catch (err) {
      // silently ignore if endpoint not available yet
    }
  }, [campaignId]);

  // Poll every 5s while panel is mounted
  useEffect(() => {
    if (!campaignId) return;
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [campaignId, refreshStatus]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await campaignsAPI.aiStart(campaignId, { aiConcurrencyLimit: aiConcurrency });
      await refreshStatus();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start AI calling');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      await campaignsAPI.aiPause(campaignId);
      await refreshStatus();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pause AI calling');
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = aiStatus?.aiCallingEnabled;

  return (
    <div style={{
      background: isEnabled ? '#f0fdf4' : '#ffffff',
      border: `1px solid ${isEnabled ? '#86efac' : BORDER}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color 0.2s, background 0.2s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      {/* Header row */}
      <div
        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Animated dot */}
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isEnabled ? '#16a34a' : '#94a3b8',
            boxShadow: isEnabled ? '0 0 0 3px #bbf7d0' : 'none',
            animation: isEnabled ? 'aipulse 1.5s infinite' : 'none',
            flexShrink: 0,
          }} />
          <style>{`@keyframes aipulse{0%,100%{box-shadow:0 0 0 0 #bbf7d0}50%{box-shadow:0 0 0 4px #bbf7d000}}`}</style>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: isEnabled ? '#15803d' : TEXT }}>
            AI Calling {isEnabled ? '— Active' : '— Paused'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {aiStatus && (
            <span style={{ fontSize: 10.5, color: MUTED, fontVariantNumeric: 'tabular-nums', fontWeight: 400 }}>
              {aiStatus.inProgress ?? 0} active · {aiStatus.queued ?? 0} queued
            </span>
          )}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${isEnabled ? '#bbf7d0' : BORDER}` }}>
          {/* Stats row */}
          {aiStatus && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, margin: '8px 0' }}>
              {[
                { label: 'In Progress', value: aiStatus.inProgress ?? 0, color: '#16a34a' },
                { label: 'Queued', value: aiStatus.queued ?? 0, color: '#f59e0b' },
                { label: 'Done Today', value: aiStatus.completedToday ?? 0, color: BLUE },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9.5, color: MUTED, marginBottom: 1, fontWeight: 400 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Concurrency input (only when not active) */}
          {!isEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: MUTED, fontWeight: 400, whiteSpace: 'nowrap' }}>Concurrent calls:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={aiConcurrency}
                onChange={e => setAiConcurrency(Math.max(1, Math.min(20, Number(e.target.value))))}
                style={{
                  width: 50, padding: '4px 6px', borderRadius: 6,
                  border: `1px solid ${BORDER}`, fontSize: 11.5, color: TEXT,
                  fontWeight: 500, outline: 'none', textAlign: 'center',
                }}
              />
            </div>
          )}

          {/* Action button */}
          {isEnabled ? (
            <button
              onClick={handlePause}
              disabled={loading}
              style={{
                width: '100%', padding: '7px', borderRadius: 7,
                background: loading ? '#fef9c3' : '#fef08a',
                border: '1px solid #fde047', color: '#854d0e',
                fontSize: 11.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {loading ? (
                <>
                  <div className="spinner-gradient" style={{ width: 11, height: 11 }} />
                  Pausing…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Pause AI Calling
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              style={{
                width: '100%', padding: '7px', borderRadius: 7,
                background: loading ? '#93c5fd' : BLUE,
                border: 'none', color: '#fff',
                fontSize: 11.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {loading ? (
                <>
                  <div className="spinner-gradient" style={{ width: 11, height: 11 }} />
                  Starting…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start AI Calling
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Identity Badge Helper ───────────────────────────────────────────────────
function IdentityBadge({ identity }) {
  const label = identity && identity !== 'General' ? identity : 'Client';
  const norm = label.toLowerCase();
  
  let bg = '#f0f9ff';
  let color = '#0284c7';
  let border = '#bae6fd';

  if (norm.includes('sap') || norm.includes('fico')) {
    bg = '#eff6ff';
    color = '#2563eb';
    border = '#bfdbfe';
  } else if (norm.includes('python') || norm.includes('full stack') || norm.includes('dev')) {
    bg = '#ecfdf5';
    color = '#059669';
    border = '#a7f3d0';
  } else if (norm.includes('digital') || norm.includes('marketing')) {
    bg = '#fff7ed';
    color = '#ea580c';
    border = '#fed7aa';
  } else if (norm.includes('vip') || norm.includes('star')) {
    bg = '#fdf4ff';
    color = '#9333ea';
    border = '#f0abfc';
  } else if (norm.includes('vendor')) {
    bg = '#f8fafc';
    color = '#475569';
    border = '#cbd5e1';
  }

  return (
    <span style={{
      background: bg,
      color,
      borderRadius: 9999,
      padding: '2px 9px',
      fontSize: 10.5,
      fontWeight: 600,
      border: `1px solid ${border}`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      whiteSpace: 'nowrap',
      flexShrink: 0
    }}>
      <span style={{ fontSize: 9 }}>🏷️</span> {label}
    </span>
  );
}

// ─── Add Contacts & Leads Modal (With Identities, Identity Filters & Excel Upload) ───
function AddLeadsModal({ campaignId, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'excel' | 'create'
  const [allContacts, setAllContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState('ALL');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Excel Upload State
  const [excelRows, setExcelRows] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [saveToContactsDb, setSaveToContactsDb] = useState(true);
  const fileInputRef = useRef(null);

  // New Contact Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newIdentity, setNewIdentity] = useState('SAP FICO');
  const [customIdentity, setCustomIdentity] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState('Fresh');
  const [createError, setCreateError] = useState('');

  // Fetch all contacts from Marketing -> Contacts AND Leads
  useEffect(() => {
    const fetchAllSources = async () => {
      setLoading(true);
      try {
        const [contactsRes, leadsRes] = await Promise.allSettled([
          contactsAPI.getAll(),
          leadsAPI.getAll({ limit: 1000 })
        ]);

        const combinedMap = new Map();

        // 1. Process Marketing Contacts
        if (contactsRes.status === 'fulfilled' && contactsRes.value?.data?.contacts) {
          const list = contactsRes.value.data.contacts;
          list.forEach(c => {
            const rawPhone = String(c.phone || '').trim();
            let digits = rawPhone.replace(/\D/g, '');
            if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
            const clean10 = digits.slice(-10);

            if (clean10 && clean10.length === 10) {
              const identity = (c.identity && c.identity !== 'General') ? c.identity : 'SAP FICO';
              combinedMap.set(clean10, {
                id: c._id || clean10,
                name: c.name || 'Contact',
                phone: clean10,
                email: c.email || '',
                identity: identity,
                segment: c.segment || 'New',
                source: 'Marketing Contacts',
                isLead: false,
                leadId: null,
                currentCampaign: null
              });
            }
          });
        }

        // 2. Process Existing Leads (matching & enriching with campaign info)
        if (leadsRes.status === 'fulfilled' && leadsRes.value?.data?.leads) {
          const leadsList = leadsRes.value.data.leads;
          leadsList.forEach(l => {
            const clean10 = String(l.phone || '').replace(/\D/g, '').slice(-10);
            if (!clean10 || clean10.length !== 10) return;

            const existing = combinedMap.get(clean10);
            const leadIdentity = l.identity || l.customFields?.identity || l.customFields?.Identity || (existing?.identity || 'Client');
            const leadCampaignId = l.campaign?._id || l.campaign;

            combinedMap.set(clean10, {
              id: l._id,
              name: l.name || existing?.name || 'Contact',
              phone: clean10,
              email: l.email || existing?.email || '',
              identity: leadIdentity,
              segment: l.customFields?.segment || existing?.segment || 'New',
              location: l.location || '',
              status: l.status || 'Fresh',
              source: existing ? 'Marketing Contacts' : 'Leads',
              isLead: true,
              leadId: l._id,
              currentCampaign: leadCampaignId
            });
          });
        }

        // Filter out contacts already belonging to THIS campaign
        const available = Array.from(combinedMap.values()).filter(
          item => String(item.currentCampaign || '') !== String(campaignId)
        );

        setAllContacts(available);
      } catch (err) {
        console.error('Failed to load contacts for campaign:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllSources();
  }, [campaignId]);

  // Extract unique identities dynamically with counts
  const availableIdentities = useMemo(() => {
    const counts = {};
    allContacts.forEach(c => {
      const tag = (c.identity || 'Client').trim();
      counts[tag] = (counts[tag] || 0) + 1;
    });

    const sortedTags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return [
      { id: 'ALL', label: 'All Contacts', count: allContacts.length },
      ...sortedTags.map(tag => ({ id: tag, label: tag, count: counts[tag] }))
    ];
  }, [allContacts]);

  // Filter contacts by selected identity & search query
  const filtered = useMemo(() => {
    return allContacts.filter(c => {
      const contactIdentity = (c.identity || 'Client').trim();
      const matchesIdentity = selectedIdentity === 'ALL' || contactIdentity.toLowerCase() === selectedIdentity.toLowerCase();
      if (!matchesIdentity) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        contactIdentity.toLowerCase().includes(q)
      );
    });
  }, [allContacts, selectedIdentity, search]);

  const toggle = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    const allFilteredIds = filtered.map(c => c.id);
    const areAllSelected = allFilteredIds.every(id => selected.has(id));

    setSelected(prev => {
      const n = new Set(prev);
      if (areAllSelected) {
        allFilteredIds.forEach(id => n.delete(id));
      } else {
        allFilteredIds.forEach(id => n.add(id));
      }
      return n;
    });
  };

  const isAllFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  // Submit selected existing contacts
  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const selectedContactsList = allContacts.filter(c => selected.has(c.id));
      const leadIds = [];
      const contactsToCreate = [];

      selectedContactsList.forEach(c => {
        if (c.isLead && c.leadId) {
          leadIds.push(c.leadId);
        } else {
          contactsToCreate.push({
            name: c.name,
            phone: c.phone,
            email: c.email,
            identity: c.identity,
            segment: c.segment,
            status: 'Fresh'
          });
        }
      });

      await campaignsAPI.addLeads(campaignId, {
        leadIds,
        contacts: contactsToCreate
      });

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to add contacts to campaign');
    } finally {
      setSaving(false);
    }
  };

  // Excel File Parser
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawRows || rawRows.length < 2) {
          setErrorMsg('The uploaded file is empty or has no data rows.');
          return;
        }

        // Find header row
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, rawRows.length); i++) {
          const rowStr = (rawRows[i] || []).map(c => String(c)).join(' ').toLowerCase();
          if (rowStr.includes('name') || rowStr.includes('phone') || rowStr.includes('mobile') || rowStr.includes('contact') || rowStr.includes('party')) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = (rawRows[headerRowIdx] || []).map(h => String(h).trim());
        const headerLower = headers.map(h => h.toLowerCase());

        let nameIdx = headerLower.findIndex(h => h.includes('name') || h.includes('party') || h.includes('customer') || h.includes('contact'));
        let phoneIdx = headerLower.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact no') || h.includes('number') || h.includes('whatsapp') || h.includes('cell'));
        let emailIdx = headerLower.findIndex(h => h.includes('email') || h.includes('mail'));
        let identityIdx = headerLower.findIndex(h => h.includes('identity') || h.includes('group') || h.includes('category') || h.includes('type') || h.includes('role') || h.includes('course'));

        if (nameIdx === -1) nameIdx = 0;
        if (phoneIdx === -1) phoneIdx = headers.length > 1 ? 1 : 0;
        if (emailIdx === -1) emailIdx = headers.length > 2 ? 2 : -1;
        if (identityIdx === -1) identityIdx = headers.length > 3 ? 3 : -1;

        const parsed = [];
        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const rawName = String(row[nameIdx] !== undefined ? row[nameIdx] : '').trim();
          const rawPhone = String(row[phoneIdx] !== undefined ? row[phoneIdx] : '').trim();
          const rawEmail = emailIdx !== -1 && row[emailIdx] !== undefined ? String(row[emailIdx]).trim() : '';
          const rawIdentity = identityIdx !== -1 && row[identityIdx] !== undefined ? String(row[identityIdx]).trim() : 'SAP FICO';

          if (!rawName && !rawPhone) continue;

          let digits = rawPhone.replace(/\D/g, '');
          if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
          const clean10 = digits.slice(-10);

          if (clean10 && clean10.length === 10) {
            parsed.push({
              name: rawName || `Contact ${i}`,
              phone: clean10,
              email: rawEmail || '',
              identity: rawIdentity || 'SAP FICO',
              status: 'Fresh'
            });
          }
        }

        if (parsed.length === 0) {
          setErrorMsg('No valid 10-digit mobile numbers found in the file.');
          return;
        }

        setExcelRows(parsed);
      } catch (err) {
        console.error('Failed to parse Excel:', err);
        setErrorMsg('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportExcel = async () => {
    if (excelRows.length === 0) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await campaignsAPI.addLeads(campaignId, {
        contacts: excelRows,
        saveToContacts: saveToContactsDb
      });
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to import Excel contacts into campaign');
    } finally {
      setSaving(false);
    }
  };

  // Create single contact
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const finalName = newName.trim();
    const rawPhone = newPhone.replace(/\D/g, '');
    const cleanPhone = (rawPhone.startsWith('91') && rawPhone.length > 10 ? rawPhone.slice(2) : rawPhone).slice(-10);

    if (!finalName || cleanPhone.length !== 10) {
      setCreateError('Name and a valid 10-digit Phone number are required');
      return;
    }

    const finalIdentity = newIdentity === 'CUSTOM' ? (customIdentity.trim() || 'Client') : newIdentity;

    setCreateError('');
    setSaving(true);
    try {
      await campaignsAPI.addLeads(campaignId, {
        contacts: [{
          name: finalName,
          phone: cleanPhone,
          email: newEmail.trim(),
          identity: finalIdentity,
          location: newLocation.trim(),
          status: newStatus
        }],
        saveToContacts: true
      });
      onSuccess();
      onClose();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 620,
        height: '90vh',
        maxHeight: 700,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: `1px solid ${BORDER}`,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Add Contacts to Campaign</span>
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2, fontWeight: 400 }}>
              Select existing contacts from Marketing, upload an Excel file, or create a new contact
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 28,
              height: 28,
              cursor: 'pointer',
              fontSize: 14,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: '#f8fafc' }}>
          <button
            onClick={() => setActiveTab('contacts')}
            style={{
              flex: 1,
              padding: '11px 8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: activeTab === 'contacts' ? 600 : 500,
              color: activeTab === 'contacts' ? ORANGE : MUTED,
              borderBottom: `2.5px solid ${activeTab === 'contacts' ? ORANGE : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <span>Marketing Contacts</span>
            <span style={{
              fontSize: 11,
              background: activeTab === 'contacts' ? ORANGE_LIGHT : '#e2e8f0',
              color: activeTab === 'contacts' ? ORANGE : '#475569',
              padding: '1px 7px',
              borderRadius: 12,
              fontWeight: 600
            }}>
              {allContacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            style={{
              flex: 1,
              padding: '11px 8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: activeTab === 'excel' ? 600 : 500,
              color: activeTab === 'excel' ? BLUE : MUTED,
              borderBottom: `2.5px solid ${activeTab === 'excel' ? BLUE : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <span>📊 Upload Excel / CSV</span>
            {excelRows.length > 0 && (
              <span style={{
                fontSize: 11,
                background: BLUE_LIGHT,
                color: BLUE,
                padding: '1px 7px',
                borderRadius: 12,
                fontWeight: 600
              }}>
                {excelRows.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '11px 8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: activeTab === 'create' ? 600 : 500,
              color: activeTab === 'create' ? '#16a34a' : MUTED,
              borderBottom: `2.5px solid ${activeTab === 'create' ? '#16a34a' : 'transparent'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <span>+ Create Contact</span>
          </button>
        </div>

        {/* Global Error Notice */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: 12,
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: EXISTING CONTACTS WITH DYNAMIC IDENTITY FILTER
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'contacts' && (
          <>
            {/* Search Input */}
            <div style={{ padding: '12px 18px 8px', borderBottom: `1px solid ${BORDER}`, background: '#ffffff' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f8fafc',
                border: `1px solid ${BORDER}`,
                borderRadius: 9,
                padding: '7px 12px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, phone, email, or identity..."
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontSize: 12.5,
                    color: TEXT,
                    width: '100%',
                    fontWeight: 400
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 13 }}>✕</button>
                )}
              </div>

              {/* 🏷️ Dynamic Identity Filter Pill Bar */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                  Identities:
                </span>
                <div style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  {availableIdentities.map(identity => {
                    const isSelected = selectedIdentity.toLowerCase() === identity.id.toLowerCase();
                    return (
                      <button
                        key={identity.id}
                        type="button"
                        onClick={() => setSelectedIdentity(identity.id)}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isSelected ? `1.5px solid ${ORANGE}` : `1px solid ${BORDER}`,
                          background: isSelected ? ORANGE_LIGHT : '#ffffff',
                          color: isSelected ? ORANGE : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{identity.label}</span>
                        <span style={{
                          fontSize: 10,
                          padding: '0.5px 5px',
                          borderRadius: 10,
                          background: isSelected ? ORANGE : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#64748b',
                          fontWeight: 600
                        }}>
                          {identity.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contacts List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px', background: '#ffffff' }}>
              {loading ? (
                <Spinner />
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>No matching contacts found</div>
                  <div style={{ fontSize: 12, marginTop: 3 }}>
                    {search || selectedIdentity !== 'ALL' ? 'Try clearing your identity filter or search query' : 'No contacts available in Marketing to add.'}
                  </div>
                </div>
              ) : (
                <>
                  {/* Select All Row */}
                  <div
                    onClick={toggleAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 4px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${BORDER}`,
                      position: 'sticky',
                      top: 0,
                      background: '#ffffff',
                      zIndex: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        readOnly
                        checked={isAllFilteredSelected}
                        style={{ accentColor: ORANGE, width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE }}>
                        Select All Filtered ({filtered.length})
                      </span>
                    </div>
                    {selectedIdentity !== 'ALL' && (
                      <span style={{ fontSize: 11, color: MUTED }}>
                        Filtering by <strong>{selectedIdentity}</strong>
                      </span>
                    )}
                  </div>

                  {/* Contact Rows */}
                  {filtered.map(contact => {
                    const isChecked = selected.has(contact.id);
                    return (
                      <div
                        key={contact.id}
                        onClick={() => toggle(contact.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 4px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          background: isChecked ? '#fffaf5' : '#ffffff',
                          transition: 'background 0.1s'
                        }}
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={isChecked}
                          style={{ accentColor: ORANGE, width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                        />

                        <Avatar name={contact.name} size={32} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {contact.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
                            <span style={{ fontSize: 11.5, color: '#059669', fontFamily: 'monospace', fontWeight: 500 }}>
                              +91 {contact.phone}
                            </span>
                            {contact.email && (
                              <span style={{ fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                • {contact.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Identity Badge */}
                        <IdentityBadge identity={contact.identity} />
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>
                  {selected.size} contact{selected.size !== 1 ? 's' : ''} selected
                </span>
                {selected.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    background: '#fff',
                    color: TEXT,
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={saving || selected.size === 0}
                  style={{
                    padding: '8px 18px',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: selected.size === 0 || saving ? 'not-allowed' : 'pointer',
                    background: selected.size === 0 ? '#fdba74' : ORANGE,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: selected.size > 0 ? '0 2px 6px rgba(234, 88, 12, 0.3)' : 'none'
                  }}
                >
                  {saving ? 'Adding Contacts...' : `Add ${selected.size > 0 ? selected.size : ''} Contact${selected.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: EXCEL / CSV DIRECT UPLOAD WITH IDENTITY DETECTION
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'excel' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 20 }}>
            {/* Upload Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${excelRows.length > 0 ? '#10b981' : BLUE}`,
                borderRadius: 12,
                background: excelRows.length > 0 ? '#f0fdf4' : BLUE_LIGHT,
                padding: '24px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {excelRows.length > 0 ? '✅' : '📁'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                {excelFileName ? excelFileName : 'Click to Upload Excel or CSV Spreadsheet'}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                Supported formats: <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>
              </div>
              <div style={{ fontSize: 11, color: BLUE, marginTop: 6, fontWeight: 500 }}>
                Auto-detects Name, Phone, Email, and Identity / Group columns
              </div>
            </div>

            {/* Parsed Preview */}
            {excelRows.length > 0 && (
              <div style={{ marginTop: 16, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                    Detected Contacts ({excelRows.length})
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveToContactsDb}
                      onChange={e => setSaveToContactsDb(e.target.checked)}
                      style={{ accentColor: BLUE }}
                    />
                    Save to Marketing Contacts as well
                  </label>
                </div>

                {/* Table Preview */}
                <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 8, maxHeight: 240 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0 }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: MUTED }}>#</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: MUTED }}>Name</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: MUTED }}>Phone</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: MUTED }}>Email</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, color: MUTED }}>Identity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '7px 12px', color: MUTED, fontSize: 11 }}>{idx + 1}</td>
                          <td style={{ padding: '7px 12px', fontWeight: 500, color: TEXT }}>{row.name}</td>
                          <td style={{ padding: '7px 12px', color: '#059669', fontFamily: 'monospace' }}>+91 {row.phone}</td>
                          <td style={{ padding: '7px 12px', color: MUTED }}>{row.email || '—'}</td>
                          <td style={{ padding: '7px 12px' }}>
                            <IdentityBadge identity={row.identity} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {excelRows.length > 50 && (
                    <div style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, color: MUTED, background: '#f8fafc' }}>
                      + {excelRows.length - 50} more contacts ready to import
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${BORDER}` }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, cursor: 'pointer', background: '#fff', color: TEXT, fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || excelRows.length === 0}
                onClick={handleImportExcel}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: excelRows.length === 0 || saving ? 'not-allowed' : 'pointer',
                  background: excelRows.length === 0 ? '#93c5fd' : BLUE,
                  color: '#fff'
                }}
              >
                {saving ? 'Importing...' : `Import & Add ${excelRows.length} Contacts to Campaign`}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: CREATE NEW CONTACT
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateStudent} style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {createError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#dc2626' }}>
                ⚠️ {createError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, display: 'block', marginBottom: 4 }}>
                  Contact Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, display: 'block', marginBottom: 4 }}>
                  Phone Number (10 digits) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  maxLength={13}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, display: 'block', marginBottom: 4 }}>
                  Email Address
                </label>
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, display: 'block', marginBottom: 4 }}>
                  Identity / Course Category
                </label>
                <select
                  value={newIdentity}
                  onChange={e => setNewIdentity(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', background: '#fff' }}
                >
                  <option value="SAP FICO">SAP FICO</option>
                  <option value="Python Full Stack">Python Full Stack</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Client">Client</option>
                  <option value="VIP">VIP</option>
                  <option value="Lead">Lead</option>
                  <option value="CUSTOM">+ Enter Custom Identity...</option>
                </select>
              </div>
            </div>

            {newIdentity === 'CUSTOM' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, display: 'block', marginBottom: 4 }}>
                  Custom Identity Name
                </label>
                <input
                  value={customIdentity}
                  onChange={e => setCustomIdentity(e.target.value)}
                  placeholder="e.g. Data Science, AWS Cloud"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, display: 'block', marginBottom: 4 }}>
                  Location / City
                </label>
                <input
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="Hyderabad"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, display: 'block', marginBottom: 4 }}>
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', background: '#fff' }}
                >
                  <option value="Fresh">Fresh</option>
                  <option value="Interested">Interested</option>
                  <option value="Connected">Connected</option>
                  <option value="Not Answered">Not Answered</option>
                  <option value="Call Back">Call Back</option>
                  <option value="Demo Scheduled">Demo Scheduled</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12.5, cursor: 'pointer', background: '#fff', color: TEXT, fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  background: ORANGE,
                  color: '#fff'
                }}
              >
                {saving ? 'Creating...' : 'Create & Add to Campaign'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Mobile / Tablet Tab View ('students' | 'analytics' | 'profile')
  const [activeMobileTab, setActiveMobileTab] = useState('students');

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await campaignsAPI.getOne(id);
      setCampaign(res.data.campaign);
    } catch (err) { console.error(err); }
  }, [id]);

  const fetchLeads = useCallback(async (pg = 1) => {
    setLeadsLoading(true);
    try {
      const params = { campaign: id, page: pg, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await leadsAPI.getAll(params);
      const fetched = res.data.leads || [];
      setLeads(fetched);
      setTotalPages(res.data.pages || 1);
      setTotalCount(res.data.total || fetched.length);
      if (fetched.length > 0 && !selectedLead) setSelectedLead(fetched[0]);
    } catch (err) { console.error(err); }
    finally { setLeadsLoading(false); }
  }, [id, statusFilter, search, selectedLead]);

  const handleLeadDetailsChange = (updatedLead) => {
    setSelectedLead(prev => (prev && updatedLead?._id === prev._id ? updatedLead : prev));
    fetchLeads(page);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCampaign(), fetchLeads(1)]);
    setLoading(false);
  }, [fetchCampaign, fetchLeads]);

  useEffect(() => { fetchAll(); }, [id]);
  useEffect(() => { fetchLeads(page); }, [statusFilter, page]);

  const handleSearchSubmit = (e) => { if (e.key === 'Enter') { setPage(1); fetchLeads(1); } };

  const statusBreakdown = campaign?.statusBreakdown || [];
  const totalLeads = campaign?.totalLeads || statusBreakdown.reduce((a, b) => a + b.count, 0) || 0;
  const freshLeads = statusBreakdown.find(s => s._id === 'Fresh')?.count || 0;
  const wonLeads = statusBreakdown.find(s => s._id === 'Won')?.count || 0;
  const lostReasons = campaign?.lostReasons || [];

  const allStatuses = ['Fresh', 'Connected', 'Not Answered', 'Call Back', 'Call Not Responding', 'Call Back Later', 'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost', 'Blocked'];

  if (loading) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;
  if (!campaign) return <div style={{ textAlign: 'center', padding: 48, color: MUTED }}>Campaign not found</div>;

  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 h-[calc(100vh-64px)] flex flex-col box-border font-sans">
      
      {/* Mobile / Tablet Responsive Tab Navigation */}
      <div className="flex lg:hidden items-center justify-between mb-2.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveMobileTab('students')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeMobileTab === 'students' ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Students ({leads.length})
        </button>
        <button
          onClick={() => setActiveMobileTab('analytics')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeMobileTab === 'analytics' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Analytics & AI
        </button>
        <button
          onClick={() => setActiveMobileTab('profile')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeMobileTab === 'profile' ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Student Profile
        </button>
      </div>

      {/* Main Responsive 3-Panel Card Shell */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">

        {/* ─── LEFT PANEL: Student List ─────────────────────────────────────────── */}
        <div className={`w-full lg:w-72 xl:w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden min-h-0 ${
          activeMobileTab === 'students' ? 'flex flex-1' : 'hidden lg:flex'
        }`}>
          {/* Back + campaign summary card */}
          <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => navigate('/campaigns')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: MUTED, marginBottom: 8, padding: 0, fontWeight: 500 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              Back to Campaigns
            </button>

            {/* Campaign summary card (White, Orange, Blue) */}
            <div style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE, background: ORANGE_LIGHT, padding: '2px 8px', borderRadius: 8, border: `1px solid ${ORANGE_BORDER}` }}>
                  @{campaign.name}
                </span>
                <button onClick={fetchAll} title="Refresh Campaign" style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, padding: 2 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-5" /></svg>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                <StatCard label="Total" value={totalLeads} color={BLUE} bg={BLUE_LIGHT} borderColor={BLUE_BORDER} />
                <StatCard label="Fresh" value={freshLeads} color={ORANGE} bg={ORANGE_LIGHT} borderColor={ORANGE_BORDER} />
                <StatCard label="Won" value={wonLeads} color="#16a34a" bg="#f0fdf4" borderColor="#bbf7d0" />
                <StatCard label="Callers" value={campaign.assignedCallers?.length || 0} color={TEXT} bg="#fff" borderColor={BORDER} />
              </div>
            </div>

            {/* ── AI Calling Panel ─────────────────────────────────────────── */}
            <div style={{ marginTop: 8 }}>
              <AICallingPanel
                campaignId={id}
                campaign={campaign}
                onStatusChange={fetchCampaign}
              />
            </div>
          </div>

          {/* Search + filter */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 6, background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 8px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchSubmit}
                placeholder="Search students..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11.5, color: TEXT, width: '100%', fontWeight: 400 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ flex: 1, fontSize: 11, padding: '4px 6px', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, background: '#fff', outline: 'none', fontWeight: 400 }}>
                <option value="">All Statuses</option>
                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => { setShowAddLeads(true); }}
                style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 400 }}>{totalCount} student{totalCount !== 1 ? 's' : ''} in this campaign</div>
          </div>

          {/* Student list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {leadsLoading ? <Spinner /> : leads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 14px', color: MUTED }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: 6, margin: '0 auto' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                <div style={{ fontSize: 11.5, fontWeight: 400 }}>No students found</div>
                <button onClick={() => setShowAddLeads(true)}
                  style={{ marginTop: 8, background: ORANGE, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>
                  + Add Students
                </button>
              </div>
            ) : leads.map(lead => {
              const isSelected = selectedLead?._id === lead._id;
              return (
                <div key={lead._id}
                  onClick={() => {
                    setSelectedLead(lead);
                    setActiveMobileTab('profile');
                  }}
                  style={{
                    padding: '9px 12px', borderBottom: `1px solid #f1f5f9`, cursor: 'pointer',
                    background: isSelected ? ORANGE_LIGHT : '#fff',
                    borderLeft: isSelected ? `3px solid ${ORANGE}` : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar name={lead.name} size={26} bg={isSelected ? '#fed7aa' : ORANGE_LIGHT} color={ORANGE} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                        {lead.aiLock?.expiresAt && new Date(lead.aiLock.expiresAt) > new Date() && (
                          <span style={{ fontSize: 8.5, background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '1px 4px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>AI</span>
                        )}
                        {lead.aiCallState === 'queued' && !lead.aiLock?.expiresAt && (
                          <span style={{ fontSize: 8.5, background: BLUE_LIGHT, color: BLUE, borderRadius: 8, padding: '1px 4px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>Q</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: MUTED, fontFamily: 'monospace', fontWeight: 400 }}>{lead.phone}</div>
                    </div>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </div>
                  <div style={{ marginTop: 4 }}><MiniStatus status={lead.status} /></div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 8px', fontSize: 10.5, cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#cbd5e1' : TEXT, fontWeight: 500 }}>‹ Prev</button>
              <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 400 }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 8px', fontSize: 10.5, cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#cbd5e1' : TEXT, fontWeight: 500 }}>Next ›</button>
            </div>
          )}
        </div>

        {/* ─── MIDDLE PANEL: Analytics (White, Orange, Blue) ───────────────────── */}
        <div className={`w-full lg:w-60 xl:w-64 flex-shrink-0 bg-slate-50/70 border-r border-slate-200 overflow-y-auto p-3 flex flex-col gap-3 min-h-0 ${
          activeMobileTab === 'analytics' ? 'flex flex-1' : 'hidden lg:flex'
        }`}>

          {/* Lead Status Distribution (Pie) */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: TEXT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ORANGE }} />
              Status Distribution
            </div>
            {statusBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={105}>
                  <PieChart>
                    <Pie data={statusBreakdown.map(s => ({ name: s._id, value: s.count }))}
                      cx="50%" cy="50%" outerRadius={44} innerRadius={22} dataKey="value">
                      {statusBreakdown.map((s, i) => (
                        <Cell key={s._id} fill={STATUS_COLORS[s._id] || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {statusBreakdown.map((s, i) => (
                    <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[s._id] || PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: '#475569', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>{s._id}</span>
                      </div>
                      <span style={{ fontWeight: 500, color: TEXT }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{ textAlign: 'center', color: MUTED, fontSize: 11, padding: '16px 0', fontWeight: 400 }}>No status data yet</div>}
          </div>

          {/* Dropped / Lost Reasons */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: TEXT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              Dropped Reasons
            </div>
            {lostReasons.length > 0 ? (
              lostReasons.map((r, i) => (
                <div key={r._id} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 2 }}>
                    <span style={{ color: '#475569', fontWeight: 400 }}>{r._id}</span>
                    <span style={{ fontWeight: 500, color: TEXT }}>{r.count}</span>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3, width: `${totalLeads > 0 ? Math.round(r.count / totalLeads * 100) : 0}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))
            ) : <div style={{ textAlign: 'center', color: MUTED, fontSize: 11, padding: '12px 0', fontWeight: 400 }}>No dropped leads</div>}
          </div>

          {/* Call Outcomes */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: TEXT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE }} />
              Call Outcomes
            </div>
            {statusBreakdown.length > 0 ? (
              statusBreakdown.map((s, i) => (
                <div key={s._id} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 2 }}>
                    <span style={{ color: '#475569', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>{s._id}</span>
                    <span style={{ fontWeight: 500, color: TEXT }}>{s.count}</span>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: STATUS_COLORS[s._id] || PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3, width: `${totalLeads > 0 ? Math.round(s.count / totalLeads * 100) : 0}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))
            ) : <div style={{ textAlign: 'center', color: MUTED, fontSize: 11, padding: '12px 0', fontWeight: 400 }}>No call data yet</div>}
          </div>

          {/* Assigned Callers */}
          {campaign.assignedCallers?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: TEXT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE }} />
                Assigned Callers
              </div>
              {campaign.assignedCallers.map(caller => (
                <div key={caller._id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <Avatar name={caller.name} size={24} bg={BLUE_LIGHT} color={BLUE} />
                  <span style={{ fontSize: 11.5, color: TEXT, fontWeight: 400 }}>{caller.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── RIGHT PANEL: Lead Detail ─────────────────────────────────────────── */}
        <div className={`flex-1 min-w-0 bg-white overflow-y-auto min-h-0 ${
          activeMobileTab === 'profile' ? 'flex flex-col flex-1' : 'hidden lg:flex flex-col'
        }`}>
          {selectedLead ? (
            <LeadDetailsPage
              key={selectedLead._id}
              leadId={selectedLead._id}
              embedded
              onDeleted={() => { setSelectedLead(null); fetchLeads(page); }}
              onChange={handleLeadDetailsChange}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, flexDirection: 'column', gap: 8, padding: 32 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              <span style={{ fontSize: 12.5, fontWeight: 400 }}>Select a student to view details</span>
            </div>
          )}
        </div>

      </div>

      {/* ─── Add Leads Modal ──────────────────────────────────────────────────── */}
      {showAddLeads && (
        <AddLeadsModal
          campaignId={id}
          onClose={() => setShowAddLeads(false)}
          onSuccess={() => { fetchAll(); }}
        />
      )}
    </div>
  );
}