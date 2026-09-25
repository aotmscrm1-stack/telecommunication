import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, leadsAPI } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import LeadDetailsPage from '../../components/LeadDetails/LeadDetailsPage';

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

// ─── Add Leads Modal ─────────────────────────────────────────────────────────
function AddLeadsModal({ campaignId, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('select'); // 'select' | 'create'
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // New Student Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState('Fresh');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    leadsAPI.getAll({ limit: 200 })
      .then(res => {
        const all = res.data.leads || [];
        setAllLeads(all.filter(l => !l.campaign || l.campaign._id !== campaignId));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [campaignId]);

  const filtered = allLeads.filter(l =>
    !search ||
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  );

  const toggle = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l._id)));
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await campaignsAPI.addLeads(campaignId, [...selected]);
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add leads');
    } finally { setSaving(false); }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      setCreateError('Name and Phone are required');
      return;
    }
    setCreateError('');
    setSaving(true);
    try {
      await leadsAPI.create({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        location: newLocation.trim(),
        status: newStatus,
        campaign: campaignId
      });
      onSuccess();
      onClose();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Add Students to Campaign</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, fontWeight: 400 }}>Select existing students or create a new student record</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', lineHeight: 1 }}>✕</button>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: '#f8fafc' }}>
          <button onClick={() => setActiveTab('select')}
            style={{ flex: 1, padding: '9px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, color: activeTab === 'select' ? ORANGE : MUTED, borderBottom: `2px solid ${activeTab === 'select' ? ORANGE : 'transparent'}` }}>
            Existing Students ({filtered.length})
          </button>
          <button onClick={() => setActiveTab('create')}
            style={{ flex: 1, padding: '9px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 500, color: activeTab === 'create' ? BLUE : MUTED, borderBottom: `2px solid ${activeTab === 'create' ? BLUE : 'transparent'}` }}>
            + Create New Student
          </button>
        </div>

        {activeTab === 'select' ? (
          <>
            {/* Search */}
            <div style={{ padding: '10px 18px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: TEXT, width: '100%', fontWeight: 400 }} />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
              {loading ? <Spinner /> : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: MUTED, fontSize: 12.5, fontWeight: 400 }}>No available students found</div>
              ) : (
                <>
                  <div onClick={toggleAll} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', cursor: 'pointer', borderBottom: `1px solid ${BORDER}` }}>
                    <input type="checkbox" readOnly checked={selected.size === filtered.length && filtered.length > 0} style={{ accentColor: ORANGE, width: 14, height: 14 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: ORANGE }}>Select All ({filtered.length})</span>
                  </div>
                  {filtered.map(lead => (
                    <div key={lead._id} onClick={() => toggle(lead._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', cursor: 'pointer', borderBottom: `1px solid #f1f5f9` }}>
                      <input type="checkbox" readOnly checked={selected.has(lead._id)} style={{ accentColor: ORANGE, width: 14, height: 14, flexShrink: 0 }} />
                      <Avatar name={lead.name} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: TEXT }}>{lead.name}</div>
                        <div style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>{lead.phone}</div>
                      </div>
                      <MiniStatus status={lead.status} />
                      <div style={{ fontSize: 11, color: MUTED, flexShrink: 0, fontWeight: 400 }}>{lead.location || ''}</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 400 }}>{selected.size} student{selected.size !== 1 ? 's' : ''} selected</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{ padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff', color: TEXT, fontWeight: 500 }}>Cancel</button>
                <button onClick={handleAdd} disabled={saving || selected.size === 0}
                  style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: selected.size === 0 ? 'not-allowed' : 'pointer', background: selected.size === 0 ? '#fdba74' : ORANGE, color: '#fff' }}>
                  {saving ? 'Adding...' : `Add ${selected.size > 0 ? selected.size : ''} Student${selected.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Create New Student Form */
          <form onSubmit={handleCreateStudent} style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
            {createError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 10px', marginBottom: 10, fontSize: 11.5, color: '#dc2626' }}>
                ⚠️ {createError}
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11.5, fontWeight: 500, color: TEXT, display: 'block', marginBottom: 3 }}>Student Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Rahul Sharma"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontWeight: 400 }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11.5, fontWeight: 500, color: TEXT, display: 'block', marginBottom: 3 }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="e.g. +919876543210"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontWeight: 400 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 500, color: TEXT, display: 'block', marginBottom: 3 }}>Email</label>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="rahul@example.com"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontWeight: 400 }} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 500, color: TEXT, display: 'block', marginBottom: 3 }}>Location / City</label>
                <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Hyderabad"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontWeight: 400 }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11.5, fontWeight: 500, color: TEXT, display: 'block', marginBottom: 3 }}>Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BORDER}`, fontSize: 12.5, outline: 'none', background: '#fff', fontWeight: 400 }}>
                <option value="Fresh">Fresh</option>
                <option value="Interested">Interested</option>
                <option value="Connected">Connected</option>
                <option value="Call Back Later">Call Back Later</option>
                <option value="Enrolled">Enrolled</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
              <button type="button" onClick={onClose} style={{ padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff', color: TEXT, fontWeight: 500 }}>Cancel</button>
              <button type="submit" disabled={saving}
                style={{ padding: '7px 18px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', background: ORANGE, color: '#fff' }}>
                {saving ? 'Creating...' : 'Create & Add Student'}
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

  const allStatuses = ['Fresh', 'Connected', 'Call Not Responding', 'Call Back Later', 'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost', 'Blocked'];

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