import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Phone, Mail, MapPin, Award, IndianRupee, Globe, User,
  Calendar, Star, Edit3, Save, X, Plus, Clock, MessageCircle,
  Copy, Check, Trash2, BookOpen, Zap, Sparkles, ShieldAlert,
  CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, Search,
  Filter, ArrowLeft, MoreVertical, ExternalLink, AlertCircle
} from 'lucide-react';
import { metaLeadsAPI, leadsAPI, blocklistAPI } from '../../../services/api';
import LeadDetailsPage from '../../../components/LeadDetails/LeadDetailsPage';

// ── Design Tokens (Consistent with AOTMS White/Orange/Blue Theme) ─────────────
const COLORS = {
  white: '#ffffff',
  bg: '#f8fafc',
  border: '#e2e8f0',
  borderSoft: '#f1f5f9',
  dark: '#0f172a',
  text: '#1e293b',
  muted: '#64748b',
  subtle: '#94a3b8',

  blue: '#2563eb',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',

  orange: '#ea580c',
  orangeHover: '#c2410c',
  orangeLight: '#fff7ed',
  orangeBorder: '#ffedd5',

  emerald: '#16a34a',
  emeraldLight: '#ecfdf5',
  emeraldBorder: '#a7f3d0',

  amber: '#d97706',
  amberLight: '#fffbeb',

  rose: '#e11d48',
  roseLight: '#fff1f2',
};

const STATUS_COLOR_MAP = {
  Fresh: '#ea580c',
  New: '#ea580c',
  Interested: '#d97706',
  Connected: '#2563eb',
  'Not Answered': '#f59e0b',
  'Call Back': '#0ea5e9',
  'Demo Scheduled': '#0284c7',
  'Demo Done': '#1d4ed8',
  Won: '#16a34a',
  Converted: '#16a34a',
  Lost: '#e11d48',
  Discarded: '#64748b',
  Blocked: '#334155',
};

const PIE_PALETTE = ['#ea580c', '#2563eb', '#d97706', '#0284c7', '#16a34a', '#f59e0b', '#64748b', '#e11d48'];

// Helper for Initials Avatar
function InitialsAvatar({ name, size = 32, bg = '#fff7ed', color = '#ea580c' }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: color,
        fontWeight: 600,
        fontSize: Math.floor(size * 0.38),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {initials}
    </div>
  );
}

export default function CampaignWorkspace({
  campaignName,
  onBack,
  isAdmin = true,
  isRestricted = false,
  employees = [],
  assignments = [],
  onRefreshAll,
  onOpenAssignModal,
}) {
  // ── States ─────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLead, setSelectedLead] = useState(null);

  // Edit Lead Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Action States
  const [copiedKey, setCopiedKey] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('leads'); // 'leads' | 'analytics' | 'profile'

  // AI Calling toggle state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);

  // ── Extract Lead Identifiers (Supports MongoDB structured & raw Google Sheets) ──
  const getLeadInfo = useCallback((lead) => {
    if (!lead) return {};
    const raw = lead.rawData || {};

    const name = lead.fullName || raw['Full Name'] || raw.Name || raw.name || raw['Candidate Name'] || raw['Student Name'] || 'Student Lead';
    let phone = lead.phone || raw['Phone Number'] || raw.Phone || raw.phone || raw.Mobile || raw.mobile || raw['Candidate Mobile'] || raw.Contact || '';
    if (!phone) {
      for (const k of Object.keys(raw)) {
        if (/phone|mobile|contact/i.test(k) && raw[k]) {
          phone = raw[k];
          break;
        }
      }
    }
    const cleanPhone = String(phone).replace(/\D/g, '');

    const altPhone = raw['Alt Phone'] || raw['Alternate Phone'] || raw.alternatePhone || '—';
    const email = lead.email || raw['Email Address'] || raw.Email || raw.email || '—';
    const location = raw.Location || raw.City || raw.location || raw.city || '—';
    const qualification = raw.Qualification || raw.qualification || raw.Degree || raw.degree || '—';
    const course = raw['Course Target'] || raw['Selected Course'] || raw.Course || raw.course || 'Data Analytics';
    const duration = raw.Duration || raw.duration || '4 Months';
    const budget = raw.Budget || raw.budget || '₹30,000';
    const courseFee = raw['Course Fee'] || raw.courseFee || '₹30,000';
    const mode = raw.Mode || raw.mode || 'HYBRID';
    const source = raw.Source || raw.source || 'Instagram';
    const rating = lead.rating || raw.Rating || 0;

    // Assigned staff name
    const assigneeName = lead.assignedTo?.name || (typeof lead.assignedTo === 'string' ? lead.assignedTo : null) || 'Unassigned';

    return {
      name: String(name).trim(),
      phone: String(phone).trim(),
      cleanPhone,
      altPhone: String(altPhone).trim(),
      email: String(email).trim(),
      location: String(location).trim(),
      qualification: String(qualification).trim(),
      course: String(course).trim(),
      duration: String(duration).trim(),
      budget: String(budget).trim(),
      courseFee: String(courseFee).trim(),
      mode: String(mode).trim().toUpperCase(),
      source: String(source).trim(),
      assigneeName,
      rating: Number(rating) || 0,
    };
  }, []);

  // ── Fetch Leads for This Campaign ──────────────────────────────────────────
  const fetchCampaignLeads = useCallback(async (targetPage = page, keepSelection = true) => {
    setLoading(true);
    try {
      const res = await metaLeadsAPI.getAll({
        page: targetPage,
        limit,
        campaign: campaignName,
        search: search.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });

      if (res.data?.success) {
        const fetched = res.data.leads || [];
        setLeads(fetched);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.pages || 1);

        // Auto select first lead if none currently selected or if selection no longer in list
        if (fetched.length > 0) {
          if (!keepSelection || !selectedLead) {
            setSelectedLead(fetched[0]);
          } else {
            const found = fetched.find(l => l._id === selectedLead._id);
            setSelectedLead(found || fetched[0]);
          }
        } else {
          setSelectedLead(null);
        }
      }
    } catch (err) {
      console.error('Failed to load campaign leads:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignName, page, limit, search, statusFilter, selectedLead]);

  useEffect(() => {
    fetchCampaignLeads(page, false);
  }, [campaignName, page, statusFilter]);

  // Debounced Search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchCampaignLeads(1, false);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Compute Analytics for Column 2 ─────────────────────────────────────────
  const analytics = useMemo(() => {
    const statusMap = {};
    let fresh = 0;
    let won = 0;

    leads.forEach(l => {
      const s = l.status || 'Fresh';
      statusMap[s] = (statusMap[s] || 0) + 1;
      if (s === 'Fresh' || s === 'New') fresh++;
      if (s === 'Won' || s === 'Converted') won++;
    });

    const breakdown = Object.entries(statusMap).map(([name, count]) => ({
      name,
      count
    }));

    // Find assigned callers for this campaign
    const assignment = assignments.find(a => a.campaign === campaignName);
    const assignedCallers = assignment?.assignedUsers || [];

    return {
      freshCount: fresh,
      wonCount: won,
      callersCount: assignedCallers.length,
      breakdown,
      assignedCallers,
    };
  }, [leads, assignments, campaignName]);

  // ── Copy to Clipboard ───────────────────────────────────────────────────────
  const copyText = (text, key) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1800);
  };

  // ── Quick Status Update ────────────────────────────────────────────────────
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedLead?._id || statusUpdating) return;
    setStatusUpdating(true);
    try {
      await metaLeadsAPI.update(selectedLead._id, { status: newStatus });
      setSelectedLead(prev => ({ ...prev, status: newStatus }));
      setLeads(prev => prev.map(l => l._id === selectedLead._id ? { ...l, status: newStatus } : l));
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  // ── Convert Lead to CRM ───────────────────────────────────────────────────
  const handleConvertLead = async () => {
    if (!selectedLead?._id) return;
    try {
      const res = await metaLeadsAPI.convert(selectedLead._id);
      if (res.data?.success) {
        alert('Lead successfully converted to CRM Active Pipeline!');
        setSelectedLead(prev => ({
          ...prev,
          status: 'Converted',
          crmLeadId: res.data?.crmLead?._id || prev.crmLeadId
        }));
        fetchCampaignLeads(page, true);
        if (onRefreshAll) onRefreshAll();
      }
    } catch (err) {
      alert('Failed to convert: ' + (err.response?.data?.message || err.message));
    }
  };

  // ── Block Phone Number ─────────────────────────────────────────────────────
  const handleToggleBlock = async () => {
    const info = getLeadInfo(selectedLead);
    if (!info.cleanPhone) return;
    try {
      if (isBlocked) {
        await blocklistAPI.unblock({ phone: info.cleanPhone });
        setIsBlocked(false);
        alert(`Phone ${info.phone} has been unblocked.`);
      } else {
        if (window.confirm(`Are you sure you want to block ${info.name} (${info.phone}) from communications?`)) {
          await blocklistAPI.block({ phone: info.cleanPhone, reason: 'Manual Block from Campaign Workspace' });
          setIsBlocked(true);
          alert(`Phone ${info.phone} is now blocked.`);
        }
      }
    } catch (err) {
      alert('Action notice: ' + (err.response?.data?.message || err.message));
    }
  };

  // ── Quick Edit Save ────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!selectedLead?._id) return;
    setSavingEdit(true);
    try {
      await metaLeadsAPI.update(selectedLead._id, {
        fullName: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        rawData: {
          ...(selectedLead.rawData || {}),
          ...editForm
        }
      });
      setSelectedLead(prev => ({
        ...prev,
        fullName: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        rawData: { ...(prev.rawData || {}), ...editForm }
      }));
      setIsEditing(false);
      fetchCampaignLeads(page, true);
    } catch (err) {
      alert('Failed to save changes: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const activeLeadInfo = selectedLead ? getLeadInfo(selectedLead) : null;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── TOP MOBILE NAVIGATION TABS (Visible only on small devices) ───────── */}
      <div className="flex md:hidden bg-white border-b border-slate-200 px-3 py-2 items-center justify-between">
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: COLORS.blue, fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'leads', label: 'Students' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'profile', label: 'Profile' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMobileTab(tab.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: activeMobileTab === tab.id ? COLORS.orangeLight : 'transparent',
                color: activeMobileTab === tab.id ? COLORS.orange : COLORS.muted,
                border: activeMobileTab === tab.id ? `1px solid ${COLORS.orangeBorder}` : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN 3-COLUMN WORKSPACE CONTAINER ─────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 1: CAMPAIGN DETAILS & STUDENT LIST (LEFT PANE)
        ══════════════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full md:w-[310px] xl:w-[330px] flex-shrink-0 bg-white border-r border-slate-200 flex-col min-h-0 ${
            activeMobileTab === 'leads' ? 'flex' : 'hidden md:flex'
          }`}
          style={{ height: 'calc(100vh - 60px)', display: activeMobileTab === 'leads' ? 'flex' : undefined }}
        >
          {/* Header & Back Navigation */}
          <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: COLORS.muted,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                marginBottom: 8,
              }}
              className="hover:text-blue-600 transition-colors"
            >
              <ChevronLeft size={14} /> Back to Campaigns
            </button>

            {/* Campaign Name Pill with Refresh */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  background: COLORS.orangeLight,
                  color: COLORS.orange,
                  border: `1px solid ${COLORS.orangeBorder}`,
                  borderRadius: 10,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '85%',
                }}
              >
                @{campaignName.replace(/_/g, ' ')}
              </div>
              <button
                onClick={() => fetchCampaignLeads(page, true)}
                title="Refresh leads"
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: COLORS.muted,
                }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* 4 Mini Stat Counter Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
              <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500 }}>Total</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.blue, marginTop: 1 }}>{totalCount}</div>
              </div>
              <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500 }}>Fresh</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.orange, marginTop: 1 }}>{analytics.freshCount}</div>
              </div>
              <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500 }}>Won</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.emerald, marginTop: 1 }}>{analytics.wonCount}</div>
              </div>
              <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500 }}>Callers</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.dark, marginTop: 1 }}>{analytics.callersCount}</div>
              </div>
            </div>

            {/* AI Calling Bar */}
            <div
              style={{
                background: aiEnabled ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${aiEnabled ? '#bbf7d0' : COLORS.border}`,
                borderRadius: 8,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => setAiExpanded(o => !o)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: aiEnabled ? '#16a34a' : '#94a3b8',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: aiEnabled ? '#15803d' : COLORS.text }}>
                  AI Calling — {aiEnabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: COLORS.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>0 active · 0 queued</span>
                <span style={{ transform: aiExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
              </div>
            </div>
            {aiExpanded && (
              <div style={{ marginTop: 6, padding: '8px 10px', background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: COLORS.muted }}>AI Auto-Dialer:</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAiEnabled(!aiEnabled); }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      background: aiEnabled ? '#fee2e2' : '#dcfce7',
                      color: aiEnabled ? '#b91c1c' : '#15803d',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {aiEnabled ? 'Pause AI Calling' : 'Activate AI Calling'}
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: 10, color: COLORS.subtle }}>
                  Automatically triggers AI voice agents for Fresh uncontacted leads in this campaign.
                </p>
              </div>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${COLORS.borderSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '5px 8px', marginBottom: 6 }}>
              <Search size={13} color={COLORS.muted} />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11.5, color: COLORS.dark, width: '100%' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={12} color={COLORS.muted} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                style={{
                  flex: 1,
                  background: '#ffffff',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: '4px 6px',
                  fontSize: 11,
                  color: COLORS.text,
                  outline: 'none',
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Fresh">Fresh</option>
                <option value="Interested">Interested</option>
                <option value="Connected">Connected</option>
                <option value="Call Back">Call Back</option>
                <option value="Demo Scheduled">Demo Scheduled</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>

              <button
                onClick={() => {
                  setEditForm({ name: '', phone: '', email: '', course: 'Data Analytics' });
                  setIsEditing(true);
                }}
                style={{
                  background: COLORS.orange,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 5 }}>
              {totalCount} students in this campaign
            </div>
          </div>

          {/* Student List (Scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: COLORS.muted }}>
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500" />
                <span style={{ fontSize: 11 }}>Loading students...</span>
              </div>
            ) : leads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: COLORS.muted }}>
                <User size={28} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 500 }}>No students found</p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.subtle }}>Try clearing search or filters</p>
              </div>
            ) : (
              leads.map(lead => {
                const isSelected = selectedLead?._id === lead._id;
                const info = getLeadInfo(lead);
                const statusColor = STATUS_COLOR_MAP[lead.status] || '#64748b';

                return (
                  <div
                    key={lead._id}
                    onClick={() => {
                      setSelectedLead(lead);
                      if (window.innerWidth < 768) {
                        setActiveMobileTab('profile');
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderBottom: `1px solid ${COLORS.borderSoft}`,
                      background: isSelected ? COLORS.orangeLight : '#ffffff',
                      borderLeft: isSelected ? `4px solid ${COLORS.orange}` : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    className="hover:bg-slate-50"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <InitialsAvatar
                        name={info.name}
                        size={30}
                        bg={isSelected ? '#fed7aa' : COLORS.orangeLight}
                        color={COLORS.orange}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {info.name}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace', marginTop: 1 }}>
                          {info.phone || 'No phone'}
                        </div>
                      </div>
                      <ChevronRight size={14} color="#94a3b8" />
                    </div>

                    {/* Mini Status Badge Pill */}
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          background: `${statusColor}15`,
                          color: statusColor,
                          border: `1px solid ${statusColor}30`,
                          borderRadius: 12,
                          padding: '1px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        {lead.status || 'Fresh'}
                      </span>
                      {lead.crmLeadId && (
                        <span style={{ fontSize: 9.5, color: COLORS.emerald, fontWeight: 600 }}>✓ CRM Linked</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={{ padding: '8px 14px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  background: '#ffffff',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? '#cbd5e1' : COLORS.dark,
                }}
              >
                ‹ Prev
              </button>
              <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 500 }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  background: '#ffffff',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  color: page === totalPages ? '#cbd5e1' : COLORS.dark,
                }}
              >
                Next ›
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 2: CAMPAIGN ANALYTICS & CHARTS (MIDDLE PANE)
        ══════════════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full md:w-[250px] xl:w-[270px] flex-shrink-0 bg-slate-50/70 border-r border-slate-200 overflow-y-auto p-3 flex-col gap-3 min-h-0 ${
            activeMobileTab === 'analytics' ? 'flex' : 'hidden md:flex'
          }`}
          style={{ height: 'calc(100vh - 60px)', display: activeMobileTab === 'analytics' ? 'flex' : undefined }}
        >
          {/* 1. Status Distribution (Donut Chart) */}
          <div style={{ background: '#ffffff', borderRadius: 12, padding: '12px 10px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.dark, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.orange }} />
              Status Distribution
            </div>

            {analytics.breakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={analytics.breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={26}
                      outerRadius={48}
                      dataKey="count"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {analytics.breakdown.map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLOR_MAP[entry.name] || PIE_PALETTE[idx % PIE_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {analytics.breakdown.map((entry, idx) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: STATUS_COLOR_MAP[entry.name] || PIE_PALETTE[idx % PIE_PALETTE.length],
                          }}
                        />
                        <span style={{ color: COLORS.muted }}>{entry.name}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: COLORS.dark }}>{entry.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 11, padding: '16px 0' }}>
                No status data available
              </div>
            )}
          </div>

          {/* 2. Dropped Reasons Card */}
          <div style={{ background: '#ffffff', borderRadius: 12, padding: '12px 10px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.dark, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.rose }} />
              Dropped Reasons
            </div>
            <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 11, padding: '12px 0', fontWeight: 400 }}>
              No dropped leads
            </div>
          </div>

          {/* 3. Call Outcomes Progress Card */}
          <div style={{ background: '#ffffff', borderRadius: 12, padding: '12px 10px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.dark, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.blue }} />
              Call Outcomes
            </div>

            {analytics.breakdown.length > 0 ? (
              analytics.breakdown.map((s, idx) => {
                const pct = totalCount > 0 ? Math.round((s.count / totalCount) * 100) : 0;
                const barColor = STATUS_COLOR_MAP[s.name] || PIE_PALETTE[idx % PIE_PALETTE.length];
                return (
                  <div key={s.name} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: COLORS.muted }}>{s.name}</span>
                      <span style={{ fontWeight: 600, color: COLORS.dark }}>{s.count}</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: barColor, width: `${pct}%`, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: COLORS.muted, fontSize: 11, padding: '12px 0' }}>
                No call data yet
              </div>
            )}
          </div>

          {/* 4. Assigned Callers Card */}
          <div style={{ background: '#ffffff', borderRadius: 12, padding: '12px 10px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.dark, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6' }} />
                Assigned Callers
              </div>
              {isAdmin && onOpenAssignModal && (
                <button
                  onClick={() => onOpenAssignModal(campaignName)}
                  style={{ background: 'none', border: 'none', color: COLORS.blue, fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  + Assign
                </button>
              )}
            </div>

            {analytics.assignedCallers.length > 0 ? (
              analytics.assignedCallers.map(caller => (
                <div key={caller._id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <InitialsAvatar name={caller.name} size={22} bg={COLORS.blueLight} color={COLORS.blue} />
                  <span style={{ fontSize: 11, color: COLORS.dark, fontWeight: 500 }}>{caller.name}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 10.5, color: COLORS.muted, textAlign: 'center', padding: '6px 0' }}>
                No callers assigned yet
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            COLUMN 3: ACTIVE LEAD WORKSPACE & ACTION CENTER (RIGHT PANE)
        ══════════════════════════════════════════════════════════════════════ */}
        <div
          className={`flex-1 min-w-0 bg-white overflow-y-auto p-4 md:p-6 min-h-0 ${
            activeMobileTab === 'profile' ? 'flex flex-col' : 'hidden md:flex flex-col'
          }`}
          style={{ height: 'calc(100vh - 60px)' }}
        >
          {selectedLead && activeLeadInfo ? (
            <div style={{ maxWidth: 980, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 1. TOP HEADER ROW: Name, Rating, Status, Call & WhatsApp Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 14, borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark, margin: 0 }}>
                    {activeLeadInfo.name}
                  </h2>
                  <Star size={16} className="text-amber-400 fill-amber-400 cursor-pointer" />
                  <span
                    style={{
                      background: `${STATUS_COLOR_MAP[selectedLead.status] || '#64748b'}18`,
                      color: STATUS_COLOR_MAP[selectedLead.status] || '#64748b',
                      borderRadius: 16,
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1px solid ${STATUS_COLOR_MAP[selectedLead.status] || '#64748b'}33`,
                    }}
                  >
                    ● {selectedLead.status || 'Fresh'}
                  </span>
                  <span style={{ fontSize: 11, color: COLORS.subtle, fontFamily: 'monospace' }}>
                    ID: {selectedLead._id}
                  </span>
                </div>

                {/* Action Buttons Top Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Call Button */}
                  {activeLeadInfo.cleanPhone && (
                    <a
                      href={`tel:${activeLeadInfo.cleanPhone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#16a34a',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        boxShadow: '0 1px 2px rgba(22,163,74,0.2)',
                      }}
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}

                  {/* WhatsApp Button */}
                  {activeLeadInfo.cleanPhone && (
                    <a
                      href={`https://wa.me/${activeLeadInfo.cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#2563eb',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                      }}
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  )}

                  {/* Status Dropdown Picker */}
                  <select
                    value={selectedLead.status || 'Fresh'}
                    onChange={e => handleUpdateStatus(e.target.value)}
                    disabled={statusUpdating}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.dark,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="Fresh">Fresh</option>
                    <option value="Interested">Interested</option>
                    <option value="Connected">Connected</option>
                    <option value="Call Back">Call Back</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                    <option value="Discarded">Discarded</option>
                  </select>

                  {/* Delete / Clear Action */}
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete ${activeLeadInfo.name}?`)) {
                          await metaLeadsAPI.delete(selectedLead._id);
                          fetchCampaignLeads(page, false);
                        }
                      }}
                      title="Delete lead"
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        color: '#dc2626',
                        borderRadius: 8,
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. CARD: BASIC INFORMATION (10-Tile Metadata Grid) */}
              <div style={{ background: '#ffffff', borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: COLORS.dark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <User size={15} color={COLORS.blue} />
                    BASIC INFORMATION
                  </div>
                  <button
                    onClick={() => {
                      setEditForm({
                        name: activeLeadInfo.name,
                        phone: activeLeadInfo.phone,
                        email: activeLeadInfo.email !== '—' ? activeLeadInfo.email : '',
                        location: activeLeadInfo.location !== '—' ? activeLeadInfo.location : '',
                        qualification: activeLeadInfo.qualification !== '—' ? activeLeadInfo.qualification : '',
                      });
                      setIsEditing(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.blue,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={13} /> Edit Info
                  </button>
                </div>

                {/* 10-item Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {/* Phone */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <Phone size={12} /> PHONE
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark }}>{activeLeadInfo.phone || '—'}</span>
                      {activeLeadInfo.phone && (
                        <button
                          onClick={() => copyText(activeLeadInfo.phone, 'phone')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: COLORS.muted }}
                        >
                          {copiedKey === 'phone' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alt Phone */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <Phone size={12} /> ALT PHONE
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4 }}>{activeLeadInfo.altPhone}</div>
                  </div>

                  {/* Email */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <Mail size={12} /> EMAIL
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activeLeadInfo.email}>
                      {activeLeadInfo.email}
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <MapPin size={12} /> LOCATION
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4 }}>{activeLeadInfo.location}</div>
                  </div>

                  {/* Qualification */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <Award size={12} /> QUALIFICATION
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4 }}>{activeLeadInfo.qualification}</div>
                  </div>

                  {/* Budget */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <IndianRupee size={12} /> BUDGET
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4 }}>{activeLeadInfo.budget}</div>
                  </div>

                  {/* Source */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <Globe size={12} /> SOURCE
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4 }}>{activeLeadInfo.source}</div>
                  </div>

                  {/* Campaign */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <Calendar size={12} /> CAMPAIGN
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {campaignName}
                    </div>
                  </div>

                  {/* Assignee */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <User size={12} /> ASSIGNEE
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.dark, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeLeadInfo.assigneeName}
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ background: '#f8fafc', border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.blue, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                      <Star size={12} /> RATING
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map(r => (
                        <Star
                          key={r}
                          size={13}
                          className={`cursor-pointer ${r <= activeLeadInfo.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                          onClick={async () => {
                            await metaLeadsAPI.update(selectedLead._id, { rating: r });
                            setSelectedLead(prev => ({ ...prev, rating: r }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. CARD: COURSE INTEREST & MODE */}
              <div style={{ background: '#ffffff', borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: COLORS.dark, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  <BookOpen size={15} color={COLORS.orange} />
                  COURSE INTEREST & MODE
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {/* Left Box: Selected Course */}
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ffedd5', color: COLORS.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.orange, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SELECTED COURSE</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.dark, marginTop: 2 }}>{activeLeadInfo.course}</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#9a3412', marginTop: 6 }}>
                        <Clock size={11} /> {activeLeadInfo.duration}
                      </div>
                    </div>
                  </div>

                  {/* Right Box: Fees & Mode */}
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.blue, textTransform: 'uppercase', letterSpacing: '0.04em' }}>COURSE FEE</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', marginTop: 2 }}>{activeLeadInfo.courseFee}</div>
                      <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, marginTop: 2 }}>Budget: {activeLeadInfo.budget}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #dbeafe', paddingTop: 8, marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: COLORS.muted }}>Mode</span>
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{activeLeadInfo.mode}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. CARD: QUICK ACTION CENTER */}
              <div style={{ background: '#ffffff', borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: COLORS.dark, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <Zap size={15} color={COLORS.blue} />
                    QUICK ACTION CENTER
                  </div>
                  <button
                    onClick={handleToggleBlock}
                    style={{
                      background: isBlocked ? '#ecfdf5' : '#fff1f2',
                      color: isBlocked ? '#059669' : '#e11d48',
                      border: `1px solid ${isBlocked ? '#a7f3d0' : '#fecdd3'}`,
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isBlocked ? 'Unblock Phone' : 'Block Phone'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {/* Action 1: Call Now */}
                  <button
                    onClick={() => {
                      if (activeLeadInfo.cleanPhone) window.location.href = `tel:${activeLeadInfo.cleanPhone}`;
                    }}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    <Phone size={16} />
                    <span>CALL NOW</span>
                  </button>

                  {/* Action 2: WhatsApp Message */}
                  <button
                    onClick={() => {
                      if (activeLeadInfo.cleanPhone) window.open(`https://wa.me/${activeLeadInfo.cleanPhone}`, '_blank');
                    }}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>WHATSAPP CHAT</span>
                  </button>

                  {/* Action 3: Convert to CRM */}
                  <button
                    onClick={handleConvertLead}
                    disabled={selectedLead.status === 'Converted'}
                    style={{
                      background: selectedLead.status === 'Converted' ? '#ecfdf5' : '#f8fafc',
                      color: selectedLead.status === 'Converted' ? '#059669' : COLORS.dark,
                      border: `1px solid ${selectedLead.status === 'Converted' ? '#a7f3d0' : COLORS.border}`,
                      borderRadius: 10,
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: selectedLead.status === 'Converted' ? 'default' : 'pointer',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    <CheckCircle2 size={16} color={selectedLead.status === 'Converted' ? '#059669' : COLORS.muted} />
                    <span>{selectedLead.status === 'Converted' ? 'CONVERTED' : 'CONVERT TO CRM'}</span>
                  </button>

                  {/* Action 4: Quick Stage buttons */}
                  <button
                    onClick={() => handleUpdateStatus('Interested')}
                    style={{
                      background: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #fed7aa',
                      borderRadius: 10,
                      padding: '12px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    <Sparkles size={16} />
                    <span>INTERESTED</span>
                  </button>
                </div>
              </div>

              {/* 5. DYNAMIC GOOGLE SHEET EXTRA ATTRIBUTES (Zero Data Loss) */}
              {selectedLead.rawData && Object.keys(selectedLead.rawData).length > 0 && (
                <div style={{ background: '#ffffff', borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Google Sheet Dynamic Attributes
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                    {Object.entries(selectedLead.rawData).map(([k, v]) => (
                      <div key={k} style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: `1px solid ${COLORS.borderSoft}` }}>
                        <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</div>
                        <div style={{ fontSize: 11.5, color: COLORS.dark, fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(v ?? '—')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted, flexDirection: 'column', gap: 10 }}>
              <User size={44} color="#cbd5e1" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Select a student from the list to view full details</span>
            </div>
          )}
        </div>

      </div>

      {/* ── MODAL: QUICK EDIT STUDENT INFO ──────────────────────────────────── */}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.dark, margin: 0 }}>Edit Student Details</h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 4 }}>Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 4 }}>Email Address</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 4 }}>Location</label>
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, display: 'block', marginBottom: 4 }}>Qualification</label>
                  <input
                    type="text"
                    value={editForm.qualification || ''}
                    onChange={e => setEditForm(f => ({ ...f, qualification: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12.5 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button
                onClick={() => setIsEditing(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: '#ffffff', color: COLORS.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: COLORS.blue, color: '#ffffff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
