import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { metaLeadsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AssignMembersModal from './AssignMembersModal';
import LeadDetailsPage from '../../../components/LeadDetails/LeadDetailsPage';
import {
  FiPlus, FiRefreshCw, FiSearch, FiLayers, FiUsers, FiCalendar,
  FiFlag, FiBarChart2, FiTrash2, FiArrowRight, FiX, FiCheck,
  FiCheckCircle, FiAlertTriangle, FiClock, FiChevronDown,
  FiTarget, FiActivity, FiEye, FiArrowUpRight, FiFilter,
  FiDownload, FiPhoneCall, FiMail, FiUserPlus, FiShield
} from 'react-icons/fi';
import { RiMegaphoneLine, RiFolderChartLine } from 'react-icons/ri';
import { FaWhatsapp } from 'react-icons/fa';

// ── White, Blue, Orange Theme Design Tokens (Exact Match to Campaigns.jsx) ───
const T = {
  white: '#ffffff',
  bg: '#f8fafc',
  bgCard: '#ffffff',
  border: '#e2e8f0',
  borderSoft: '#f1f5f9',

  text: '#1e293b',
  textSecondary: '#475569',
  muted: '#64748b',
  subtle: '#94a3b8',

  blue: '#2563eb',
  blueHover: '#1d4ed8',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',

  orange: '#ea580c',
  orangeHover: '#c2410c',
  orangeLight: '#fff7ed',
  orangeBorder: '#fed7aa',

  emerald: '#10b981',
  emeraldLight: '#ecfdf5',
  emeraldBorder: '#a7f3d0',

  amber: '#f59e0b',
  amberLight: '#fffbeb',
  amberBorder: '#fde68a',

  rose: '#f43f5e',
  roseLight: '#fff1f2',
  roseBorder: '#fecdd3',
};

// ── UI Helpers Matching Campaigns.jsx ─────────────────────────────────────────
function fmtLeads(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  return `${Math.max(1, mins)}m ago`;
}

// Circular progress indicator (Matching Campaigns.jsx)
function ProgressCircle({ value = 0 }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;

  const color = pct === 100 ? T.emerald : pct >= 70 ? T.blue : pct >= 40 ? T.orange : T.rose;
  const trackColor = '#f1f5f9';

  return (
    <div className="flex items-center gap-2">
      <svg width="38" height="38" viewBox="0 0 38 38" className="flex-shrink-0">
        <circle cx="19" cy="19" r={r} fill="none" stroke={trackColor} strokeWidth="3" />
        <circle
          cx="19"
          cy="19"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 19 19)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="19" y="22" textAnchor="middle" fontSize="9" fill={color} fontWeight="500">
          {pct}%
        </text>
      </svg>
    </div>
  );
}

// Stacked Assignee Avatars (Matching Campaigns.jsx)
function AssigneeAvatars({ callers }) {
  const avatarColors = [
    { bg: T.blueLight, text: T.blue, border: T.blueBorder },
    { bg: T.orangeLight, text: T.orange, border: T.orangeBorder },
    { bg: T.emeraldLight, text: '#059669', border: T.emeraldBorder },
    { bg: '#f8fafc', text: '#475569', border: T.border },
  ];

  if (!callers || callers.length === 0) {
    return <span className="text-xs text-slate-400 font-normal">—</span>;
  }

  const shown = callers.slice(0, 4);
  const extra = callers.length - 4;

  return (
    <div className="flex items-center">
      {shown.map((c, i) => {
        const theme = avatarColors[i % avatarColors.length];
        return (
          <div
            key={c._id || i}
            title={`${c.name || 'Staff'}${c.designation ? ` (${c.designation})` : ''}`}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: theme.bg,
              color: theme.text,
              border: `2px solid #ffffff`,
              outline: `1px solid ${theme.border}`,
              fontSize: 10,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: i === 0 ? 0 : -7,
              zIndex: shown.length - i,
            }}
          >
            {c.avatar ? (
              <img src={c.avatar} alt={c.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              (c.name || 'U').slice(0, 2).toUpperCase()
            )}
          </div>
        );
      })}
      {extra > 0 && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: T.blue,
            background: T.blueLight,
            borderRadius: 20,
            padding: '1px 6px',
            marginLeft: 5,
            border: `1px solid ${T.blueBorder}`
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

// Filter Dropdown Component (Matching Campaigns.jsx)
function FilterDropdown({ label, options, value, onChange, icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = !!value;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-xs"
        style={{
          background: active ? T.blueLight : '#ffffff',
          borderColor: active ? T.blue : T.border,
          color: active ? T.blue : T.textSecondary,
        }}
      >
        {icon && <span className="opacity-80">{icon}</span>}
        <span>{active ? value : label}</span>
        {active ? (
          <span
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-100 text-xs font-medium ml-0.5"
          >
            ×
          </span>
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1.5 w-44 rounded-xl border bg-white shadow-lg py-1 z-30 max-h-56 overflow-y-auto"
          style={{ borderColor: T.border }}
        >
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 cursor-pointer font-medium"
          >
            All
          </div>
          {options.map((opt, idx) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const isSelected = value === optVal;
            return (
              <div
                key={idx}
                onClick={() => { onChange(optVal); setOpen(false); }}
                className={`px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50 font-normal'}`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.dot && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.dot }} />
                  )}
                  <span className="truncate">{optLabel}</span>
                </div>
                {isSelected && <FiCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 ml-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN META LEADS COMPONENT (Exact UI/UX Concept of Campaigns.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export default function MetaLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Primary Campaigns & Leads Data
  const [campaignStats, setCampaignStats] = useState([]);
  const [totalLeadsAll, setTotalLeadsAll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Selected Campaign State (When opening a campaign's leads list)
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignLeads, setCampaignLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');

  // Filters for Campaigns Overview Table
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortField, setSortField] = useState('count');
  const [sortDir, setSortDir] = useState('desc');

  // Permissions & Employees
  const [isAdmin, setIsAdmin] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignModalCampaign, setAssignModalCampaign] = useState('');

  // Lead Detail Drawer State
  const [selectedLead, setSelectedLead] = useState(null);

  // ── Fetch Campaigns Overview & Assignment Status ────────────────────────────
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await metaLeadsAPI.getCampaigns();
      const payload = res.data || {};
      const rawCampaigns = payload.campaigns || [];
      const adminRole = payload.isAdmin !== undefined ? payload.isAdmin : true;
      const restricted = payload.isRestricted || false;

      setIsAdmin(adminRole);
      setIsRestricted(restricted);
      setCampaignStats(rawCampaigns);

      const total = rawCampaigns.reduce((acc, c) => acc + (c.count || 0), 0);
      setTotalLeadsAll(total);
    } catch (err) {
      console.error('Failed to load Meta campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employees & Assignments
  const fetchEmployeesAndAssignments = async () => {
    try {
      const [empRes, assignRes] = await Promise.allSettled([
        usersAPI.getAll(),
        metaLeadsAPI.getAssignments()
      ]);

      if (empRes.status === 'fulfilled') {
        const userList = empRes.value?.data?.users || empRes.value?.data || [];
        setEmployees(userList);
      }
      if (assignRes.status === 'fulfilled') {
        setAssignments(assignRes.value?.data?.assignments || []);
      }
    } catch (err) {
      console.error('Failed to load employees/assignments:', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchEmployeesAndAssignments();
  }, []);

  // ── Fetch Leads When a Specific Campaign is Selected ───────────────────────
  const fetchCampaignLeads = async (campaignName, page = 1) => {
    if (!campaignName) return;
    try {
      setLoadingLeads(true);
      const params = {
        campaign: campaignName,
        page,
        limit: 25,
        search: leadsSearch,
        status: leadStatusFilter
      };
      const res = await metaLeadsAPI.getAll(params);
      const data = res.data || {};
      setCampaignLeads(data.leads || []);
      setLeadsTotal(data.total || (data.leads ? data.leads.length : 0));
      setLeadsPage(page);
    } catch (err) {
      console.error('Failed to fetch leads for campaign:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignLeads(selectedCampaign, 1);
    }
  }, [selectedCampaign, leadsSearch, leadStatusFilter]);

  // ── Sync Handler ────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setStatusMessage('Syncing Meta Leads Google Sheets via live n8n pipeline...');
    try {
      await metaLeadsAPI.triggerSync();
      setStatusMessage('Sync triggered! Updating campaigns and leads...');
      setTimeout(async () => {
        await fetchCampaigns();
        if (selectedCampaign) {
          await fetchCampaignLeads(selectedCampaign, leadsPage);
        }
        setStatusMessage('Meta Leads sync successfully completed!');
        setSyncing(false);
        setTimeout(() => setStatusMessage(''), 4000);
      }, 2500);
    } catch (err) {
      console.error('Sync failed:', err);
      setStatusMessage('Sync encountered an issue. Please try again.');
      setSyncing(false);
    }
  };

  // ── Assign Modal Handlers ──────────────────────────────────────────────────
  const handleOpenAssignModal = (campaignName) => {
    setAssignModalCampaign(campaignName || (campaignStats[0]?.campaign || ''));
    setShowAssignModal(true);
  };

  const handleConfirmAssignment = async (campaignName, userIds) => {
    await metaLeadsAPI.saveAssignments({ campaign: campaignName, userIds });
    setStatusMessage(`Updated assignments for ${campaignName}!`);
    await Promise.all([fetchCampaigns(), fetchEmployeesAndAssignments()]);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // ── Export CSV Handler ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const listToExport = selectedCampaign ? campaignLeads : campaignStats;
    if (!listToExport || listToExport.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    if (selectedCampaign) {
      csvContent += 'Name,Phone,Email,Campaign,Status,Synced Date\n';
      campaignLeads.forEach(lead => {
        const { name, phone, email } = getLeadIdentifiers(lead);
        csvContent += `"${name}","${phone}","${email}","${lead.campaign || selectedCampaign}","${lead.status || 'New'}","${lead.syncedAt || ''}"\n`;
      });
    } else {
      csvContent += 'Campaign Name,Total Leads,New Leads,Converted Leads,Completion Rate,Last Synced\n';
      campaignStats.forEach(c => {
        const rate = c.count ? Math.round(((c.convertedCount || 0) / c.count) * 100) : 0;
        csvContent += `"${c.campaign}",${c.count || 0},${c.newCount || 0},${c.convertedCount || 0},"${rate}%","${c.lastSynced || ''}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedCampaign ? selectedCampaign : 'meta_leads_campaigns'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Clear All Leads (Admin Only) ───────────────────────────────────────────
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all Meta Leads? This action cannot be undone.')) {
      return;
    }
    try {
      await metaLeadsAPI.clearAll();
      setStatusMessage('All Meta leads cleared.');
      await fetchCampaigns();
      if (selectedCampaign) {
        setSelectedCampaign(null);
      }
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error('Failed to clear leads:', err);
    }
  };

  // ── Lead Helpers (Name, Phone, Email extraction) ───────────────────────────
  const getLeadIdentifiers = (lead) => {
    const raw = lead?.rawData || {};
    let phone = raw.phone || raw.Phone || raw.mobile || raw.Mobile || raw['Phone Number'] || raw.Contact || raw['Contact Number'] || raw['Candidate Mobile'] || raw['Student Mobile'] || '';
    if (!phone) {
      for (const k of Object.keys(raw)) {
        if (/phone|mobile|contact|cell/i.test(k) && raw[k]) {
          phone = raw[k];
          break;
        }
      }
    }
    if (!phone) {
      for (const k of Object.keys(raw)) {
        const digits = String(raw[k] || '').replace(/\D/g, '');
        if (digits.length === 10) {
          phone = raw[k];
          break;
        }
      }
    }
    const name = raw.name || raw.Name || raw['Full Name'] || raw['Candidate Name'] || raw['Student Name'] || 'Unknown Lead';
    const email = raw.email || raw.Email || raw['Email Address'] || '';
    return { phone: String(phone).trim(), name: String(name).trim(), email: String(email).trim() };
  };

  // Click-to-Call
  const handleActivateCall = (lead) => {
    const { phone, name } = getLeadIdentifiers(lead);
    if (!phone) {
      alert(`No phone number available for ${name}`);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    setStatusMessage(`📞 Calling ${name} (${cleanPhone})...`);
    window.location.href = `tel:${cleanPhone}`;
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Toggle Converted Status
  const handleConvertLead = async (lead) => {
    try {
      await metaLeadsAPI.convert(lead._id);
      setStatusMessage(`Lead marked as Converted!`);
      if (selectedCampaign) {
        fetchCampaignLeads(selectedCampaign, leadsPage);
      }
      fetchCampaigns();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error('Failed to convert lead:', err);
    }
  };

  // Delete Single Lead
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Delete this lead from the campaign?')) return;
    try {
      await metaLeadsAPI.delete(leadId);
      setStatusMessage('Lead removed.');
      if (selectedCampaign) {
        fetchCampaignLeads(selectedCampaign, leadsPage);
      }
      fetchCampaigns();
      setTimeout(() => setStatusMessage(''), 2500);
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  // ── All Assignees List for Dropdown Filter ──────────────────────────────────
  const allAssignees = useMemo(() => {
    const map = new Map();
    campaignStats.forEach(c => {
      (c.assignedUsers || []).forEach(u => {
        if (u && u._id) map.set(u._id, u);
      });
    });
    return Array.from(map.values());
  }, [campaignStats]);

  // ── Filtered & Sorted Campaigns (Overview Table) ───────────────────────────
  const filteredCampaigns = useMemo(() => {
    return campaignStats.filter(c => {
      const nameMatch = !search || c.campaign?.toLowerCase().includes(search.toLowerCase());
      const assigneeMatch = !assigneeFilter || (c.assignedUsers || []).some(u => (u._id || u) === assigneeFilter);
      let statusMatch = true;
      if (statusFilter === 'active') statusMatch = (c.count || 0) > 0;
      if (statusFilter === 'completed') statusMatch = (c.convertedCount || 0) > 0 && c.convertedCount === c.count;
      if (statusFilter === 'pending') statusMatch = (c.count || 0) === 0;

      let dateMatch = true;
      if (dateFilter && c.lastSynced) {
        const syncDate = new Date(c.lastSynced).getTime();
        const now = Date.now();
        if (dateFilter === 'Today') dateMatch = now - syncDate < 86400000;
        if (dateFilter === 'Last 7 days') dateMatch = now - syncDate < 7 * 86400000;
        if (dateFilter === 'Last 30 days') dateMatch = now - syncDate < 30 * 86400000;
      }
      return nameMatch && assigneeMatch && statusMatch && dateMatch;
    }).sort((a, b) => {
      if (sortField === 'count') {
        return sortDir === 'asc' ? (a.count || 0) - (b.count || 0) : (b.count || 0) - (a.count || 0);
      }
      if (sortField === 'name') {
        return sortDir === 'asc' ? a.campaign.localeCompare(b.campaign) : b.campaign.localeCompare(a.campaign);
      }
      if (sortField === 'lastSynced') {
        const tA = new Date(a.lastSynced || 0).getTime();
        const tB = new Date(b.lastSynced || 0).getTime();
        return sortDir === 'asc' ? tA - tB : tB - tA;
      }
      return 0;
    });
  }, [campaignStats, search, assigneeFilter, statusFilter, dateFilter, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Metrics calculation
  const totalCampaignsCount = campaignStats.length;
  const activeDrives = campaignStats.filter(c => (c.count || 0) > 0).length;
  const totalConverted = campaignStats.reduce((acc, c) => acc + (c.convertedCount || 0), 0);
  const avgCompletion = totalLeadsAll > 0 ? Math.round((totalConverted / totalLeadsAll) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5" style={{ background: T.bg, minHeight: '100vh' }}>

      {/* ── Top Header (Exact Match to Campaigns.jsx Style) ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <RiMegaphoneLine className="w-3.5 h-3.5" /> Meta Leads Outreach
          </div>
          <div className="flex items-center gap-2.5 mt-1.5">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800">
              {selectedCampaign ? (
                <span className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    className="text-slate-400 hover:text-slate-700 text-lg flex items-center gap-1 font-normal"
                  >
                    Campaigns <span className="text-slate-300">/</span>
                  </button>
                  <span>{selectedCampaign.replace(/_/g, ' ')}</span>
                </span>
              ) : (
                'Meta Leads Campaigns'
              )}
            </h1>
            <button
              onClick={() => {
                fetchCampaigns();
                if (selectedCampaign) fetchCampaignLeads(selectedCampaign, leadsPage);
              }}
              title="Refresh Campaigns"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            {selectedCampaign
              ? `Manage and call all ingested Meta leads for "${selectedCampaign.replace(/_/g, ' ')}".`
              : 'Organize Meta Google Sheet campaigns, assign callers, and track calling progress across target batches.'}
          </p>
        </div>

        {/* Action Buttons (Orange & Blue Theme Matching Campaigns.jsx) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => handleOpenAssignModal(selectedCampaign)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium text-orange-700 bg-orange-50/70 border-orange-200 hover:bg-orange-100 transition-colors shadow-xs"
            >
              <FiUserPlus className="w-3.5 h-3.5" />
              {selectedCampaign ? 'Manage Campaign Access' : 'Assign Members'}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors"
            style={{ borderColor: T.border }}
          >
            <FiDownload className="w-3.5 h-3.5" /> Export CSV
          </button>

          {isAdmin && totalLeadsAll > 0 && !selectedCampaign && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium text-rose-700 bg-rose-50/70 border-rose-200 hover:bg-rose-100 transition-colors shadow-xs"
            >
              <FiTrash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync / Status Toast Notification */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── Summary Stats Cards (White, Blue, Orange, Emerald Matching Campaigns.jsx) ── */}
      {!selectedCampaign && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              label: 'Total Meta Campaigns',
              value: totalCampaignsCount,
              icon: <RiFolderChartLine className="w-4.5 h-4.5 text-blue-600" />,
              bg: T.blueLight,
              border: T.blueBorder,
              suffix: ' Batches'
            },
            {
              label: 'Total Leads Ingested',
              value: fmtLeads(totalLeadsAll),
              icon: <FiUsers className="w-4.5 h-4.5 text-orange-600" />,
              bg: T.orangeLight,
              border: T.orangeBorder,
              suffix: ' Leads'
            },
            {
              label: 'Active Calling Drives',
              value: activeDrives,
              icon: <FiActivity className="w-4.5 h-4.5 text-emerald-600" />,
              bg: T.emeraldLight,
              border: T.emeraldBorder,
              suffix: ' In Progress'
            },
            {
              label: 'Average Completion',
              value: avgCompletion,
              icon: <FiTarget className="w-4.5 h-4.5 text-blue-600" />,
              bg: '#f1f5f9',
              border: T.border,
              suffix: '%'
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border bg-white shadow-xs flex items-center gap-3 transition-transform hover:-translate-y-0.5"
              style={{ borderColor: T.border }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
              >
                {stat.icon}
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-800">
                  {stat.value}{stat.suffix.startsWith('%') ? '%' : ''}
                </div>
                <div className="text-xs font-normal text-slate-500">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: CAMPAIGNS OVERVIEW TABLE (Matching Campaigns.jsx UI/UX)           */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {!selectedCampaign && (
        <>
          {/* ── Filter & Search Bar ── */}
          <div className="p-3.5 rounded-xl border bg-white shadow-xs space-y-2.5" style={{ borderColor: T.border }}>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div
                className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50/70 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
                style={{ borderColor: T.border }}
              >
                <FiSearch className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search Meta campaigns by title..."
                  className="w-full text-xs font-normal text-slate-800 bg-transparent focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700">
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <FilterDropdown
                label="Campaign Status"
                value={statusFilter}
                onChange={setStatusFilter}
                icon={<FiFlag className="w-3.5 h-3.5" />}
                options={[
                  { label: 'Active Leads', value: 'active', dot: '#10b981' },
                  { label: 'Completed', value: 'completed', dot: '#2563eb' },
                  { label: 'Pending Sync', value: 'pending', dot: '#f59e0b' },
                ]}
              />

              {/* Date Filter */}
              <FilterDropdown
                label="Last Synced"
                value={dateFilter}
                onChange={setDateFilter}
                icon={<FiCalendar className="w-3.5 h-3.5" />}
                options={['Today', 'Last 7 days', 'Last 30 days']}
              />

              {/* Assigned Caller Filter */}
              <FilterDropdown
                label="Assigned Caller"
                value={assigneeFilter ? (allAssignees.find(a => a._id === assigneeFilter)?.name || assigneeFilter) : ''}
                onChange={(val) => {
                  if (!val) { setAssigneeFilter(''); return; }
                  const found = allAssignees.find(a => a.name === val);
                  setAssigneeFilter(found?._id || val);
                }}
                icon={<FiUsers className="w-3.5 h-3.5" />}
                options={allAssignees.map(a => ({ label: a.name, value: a.name }))}
              />

              {(statusFilter || dateFilter || assigneeFilter || search) && (
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setDateFilter('');
                    setAssigneeFilter('');
                    setSearch('');
                  }}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Active Filter Chips */}
            {(statusFilter || dateFilter || assigneeFilter) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: T.borderSoft }}>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Active:</span>
                {statusFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Status: {statusFilter}
                    <FiX className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setStatusFilter('')} />
                  </span>
                )}
                {dateFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Date: {dateFilter}
                    <FiX className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setDateFilter('')} />
                  </span>
                )}
                {assigneeFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Assignee: {allAssignees.find(a => a._id === assigneeFilter)?.name || assigneeFilter}
                    <FiX className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setAssigneeFilter('')} />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Campaigns Table (Exact Match to Campaigns.jsx) ── */}
          <div className="rounded-xl border bg-white shadow-xs overflow-hidden" style={{ borderColor: T.border }}>
            {loading ? (
              <div className="text-center py-16">
                <FiRefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs font-medium text-slate-500">Loading Meta outreach campaigns...</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: T.blueLight, border: `1px solid ${T.blueBorder}` }}
                >
                  <RiFolderChartLine className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">No Meta Campaigns Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {search || statusFilter || assigneeFilter
                    ? 'No campaigns matched your active filters. Try resetting the filters.'
                    : 'Sync your live Google Sheets via n8n to ingest campaign tabs and leads into the CRM.'}
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Google Sheets Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${T.border}` }}>
                      {[
                        { label: 'Campaign Title', field: 'name' },
                        { label: 'Status', field: null },
                        { label: 'Team Assignees', field: null },
                        { label: 'Total Leads', field: 'count' },
                        { label: 'Outreach Progress', field: null },
                        { label: 'Last Synced', field: 'lastSynced' },
                        { label: 'Actions', field: null },
                      ].map((col, idx) => (
                        <th
                          key={col.label || idx}
                          onClick={() => col.field && handleSort(col.field)}
                          className={`py-3 px-4 font-medium text-[11px] uppercase tracking-wider whitespace-nowrap text-slate-500 ${col.field ? 'cursor-pointer select-none hover:text-blue-600' : ''}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: sortField === col.field ? T.blue : undefined }}>{col.label}</span>
                            {col.field && (
                              <span className="text-slate-400">
                                {sortField === col.field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: T.borderSoft }}>
                    {filteredCampaigns.map((c) => {
                      const initial = (c.campaign || 'C').charAt(0).toUpperCase();
                      const cleanTitle = c.campaign.replace(/_/g, ' ');
                      const progressPct = c.count > 0 ? Math.round(((c.convertedCount || 0) / c.count) * 100) : 0;

                      return (
                        <tr
                          key={c.campaign}
                          onClick={() => setSelectedCampaign(c.campaign)}
                          className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                        >
                          {/* Name with Orange/Blue branding badge */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs shadow-2xs flex-shrink-0"
                                style={{
                                  background: T.orangeLight,
                                  color: T.orange,
                                  border: `1px solid ${T.orangeBorder}`
                                }}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-xs sm:text-sm text-slate-800 truncate flex items-center gap-1.5">
                                  <span>{cleanTitle}</span>
                                  <FiArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                                </div>
                                <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs mt-0.5">
                                  Google Sheets Live Sync batch
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5"
                              style={{
                                background: c.count > 0 ? T.emeraldLight : T.orangeLight,
                                color: c.count > 0 ? '#059669' : T.orange,
                                border: `1px solid ${c.count > 0 ? T.emeraldBorder : T.orangeBorder}`
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: c.count > 0 ? '#10b981' : '#f97316' }}
                              />
                              {c.count > 0 ? 'Active Synced' : 'Empty Batch'}
                            </span>
                          </td>

                          {/* Team Assignees */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <AssigneeAvatars callers={c.assignedUsers} />
                          </td>

                          {/* Total Leads */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold">{c.count || 0}</span>
                              <span className="text-[11px] text-slate-400 font-normal">leads</span>
                            </div>
                          </td>

                          {/* Outreach Progress */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <ProgressCircle value={progressPct} />
                          </td>

                          {/* Last Synced Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-normal">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{timeAgo(c.lastSynced)}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3.5 px-4 whitespace-nowrap text-right"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedCampaign(c.campaign)}
                                className="px-3 py-1 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                              >
                                View Leads
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleOpenAssignModal(c.campaign)}
                                  title="Assign Members"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                                >
                                  <FiUserPlus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: CAMPAIGN LEADS DETAIL VIEW (When a Campaign is Clicked)           */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {selectedCampaign && (
        <div className="space-y-4">
          {/* ── Subheader Bar for Active Campaign ── */}
          <div className="p-3.5 rounded-xl border bg-white shadow-xs flex flex-wrap items-center justify-between gap-3" style={{ borderColor: T.border }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                style={{ borderColor: T.border }}
              >
                ← Back to Campaigns
              </button>
              <div className="h-5 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">
                  {selectedCampaign.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {leadsTotal} Total Leads
                </span>
              </div>
            </div>

            {/* Campaign Assignees on Active Header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Assigned Team:</span>
                <AssigneeAvatars
                  callers={
                    campaignStats.find(c => c.campaign === selectedCampaign)?.assignedUsers ||
                    assignments.find(a => a.campaign === selectedCampaign)?.assignedUsers || []
                  }
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleOpenAssignModal(selectedCampaign)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Manage Assignees
                </button>
              )}
            </div>
          </div>

          {/* ── Search & Filter Toolbar for Leads ── */}
          <div className="p-3.5 rounded-xl border bg-white shadow-xs flex flex-wrap items-center justify-between gap-3" style={{ borderColor: T.border }}>
            <div className="flex items-center gap-2.5 flex-1 min-w-[220px] max-w-md">
              <div
                className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50/70 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
                style={{ borderColor: T.border }}
              >
                <FiSearch className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input
                  value={leadsSearch}
                  onChange={e => setLeadsSearch(e.target.value)}
                  placeholder="Search leads by name, phone, email..."
                  className="w-full text-xs font-normal text-slate-800 bg-transparent focus:outline-none"
                />
                {leadsSearch && (
                  <button onClick={() => setLeadsSearch('')} className="text-slate-400 hover:text-slate-700">
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <FilterDropdown
                label="Lead Status"
                value={leadStatusFilter}
                onChange={setLeadStatusFilter}
                icon={<FiFilter className="w-3.5 h-3.5" />}
                options={[
                  { label: 'New', value: 'New', dot: '#f97316' },
                  { label: 'Converted', value: 'Converted', dot: '#10b981' },
                  { label: 'Contacted', value: 'Contacted', dot: '#2563eb' },
                  { label: 'Discarded', value: 'Discarded', dot: '#ef4444' }
                ]}
              />

              {(leadsSearch || leadStatusFilter) && (
                <button
                  onClick={() => { setLeadsSearch(''); setLeadStatusFilter(''); }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Showing <b>{campaignLeads.length}</b> of <b>{leadsTotal}</b> campaign leads
            </div>
          </div>

          {/* ── Leads Table (Clean CRM Layout Matching Marketing UI/UX) ── */}
          <div className="rounded-xl border bg-white shadow-xs overflow-hidden" style={{ borderColor: T.border }}>
            {loadingLeads ? (
              <div className="text-center py-16">
                <FiRefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs font-medium text-slate-500">Loading campaign leads...</p>
              </div>
            ) : campaignLeads.length === 0 ? (
              <div className="text-center py-16 px-4">
                <FiUsers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800 mb-1">No Leads Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {leadsSearch || leadStatusFilter
                    ? 'No leads matched your search or status filter.'
                    : 'This campaign batch has no leads yet. Trigger Sync to ingest.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${T.border}` }}>
                      <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wider text-slate-500 w-12">#</th>
                      <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wider text-slate-500">Student / Lead</th>
                      <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wider text-slate-500">Contact Details</th>
                      <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wider text-slate-500">Status</th>
                      <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wider text-slate-500">Sheet Attributes</th>
                      <th className="py-3 px-4 font-medium text-[11px] uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: T.borderSoft }}>
                    {campaignLeads.map((lead, idx) => {
                      const { name, phone, email } = getLeadIdentifiers(lead);
                      const initial = (name || 'L').charAt(0).toUpperCase();
                      const isConverted = lead.status === 'Converted';

                      return (
                        <tr
                          key={lead._id || idx}
                          onClick={() => setSelectedLead(lead)}
                          className="hover:bg-blue-50/25 transition-colors cursor-pointer group"
                        >
                          {/* Row Index */}
                          <td className="py-3.5 px-4 text-slate-400 font-normal">
                            {(leadsPage - 1) * 25 + idx + 1}
                          </td>

                          {/* Student Name & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0"
                                style={{
                                  background: T.blueLight,
                                  color: T.blue,
                                  border: `1px solid ${T.blueBorder}`
                                }}
                              >
                                {initial}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                                  {name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Ingested: {timeAgo(lead.syncedAt || lead.createdAt)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info (Click-to-call & WhatsApp) */}
                          <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                            <div className="space-y-1">
                              {phone ? (
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`tel:${phone.replace(/\D/g, '')}`}
                                    className="font-medium text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                                    title="Click to Call"
                                  >
                                    <FiPhoneCall className="w-3 h-3 text-emerald-600" />
                                    <span>{phone}</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 hover:text-emerald-800"
                                    title="WhatsApp Chat"
                                  >
                                    <FaWhatsapp className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">No phone</span>
                              )}
                              {email && (
                                <div className="text-slate-500 text-[11px] flex items-center gap-1">
                                  <FiMail className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[160px]">{email}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status Badge with Quick Convert Toggle */}
                          <td className="py-3.5 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleConvertLead(lead)}
                              title="Click to toggle Converted status"
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5 transition-transform active:scale-95"
                              style={{
                                background: isConverted ? T.emeraldLight : T.orangeLight,
                                color: isConverted ? '#059669' : T.orange,
                                border: `1px solid ${isConverted ? T.emeraldBorder : T.orangeBorder}`
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: isConverted ? '#10b981' : '#f97316' }}
                              />
                              {lead.status || 'New'}
                            </button>
                          </td>

                          {/* Raw Sheet Attributes Preview */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                              {lead.rawData && Object.entries(lead.rawData).slice(0, 3).map(([k, v]) => {
                                if (!v || k.startsWith('_') || /phone|mobile|email|name/i.test(k)) return null;
                                return (
                                  <span
                                    key={k}
                                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-normal truncate max-w-[120px]"
                                    title={`${k}: ${v}`}
                                  >
                                    <b>{k}:</b> {String(v)}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Dedicated Call Action Button */}
                              {phone && (
                                <button
                                  onClick={() => handleActivateCall(lead)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                  title="Instant Call"
                                >
                                  <FiPhoneCall className="w-3 h-3 text-emerald-600" />
                                  <span>Call</span>
                                </button>
                              )}

                              {/* WhatsApp Button */}
                              {phone && (
                                <a
                                  href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                  title="WhatsApp"
                                >
                                  <FaWhatsapp className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* View Details Drawer */}
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                                title="View Lead Details"
                              >
                                <FiEye className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Lead */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteLead(lead._id)}
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Lead"
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Slide-Over Lead Details Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: T.border }}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{ background: T.blueLight, color: T.blue, border: `1px solid ${T.blueBorder}` }}
                  >
                    {(getLeadIdentifiers(selectedLead).name || 'L').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {getLeadIdentifiers(selectedLead).name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Campaign: {selectedLead.campaign}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Embedded LeadDetailsPage */}
              <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/60">
                <LeadDetailsPage
                  key={selectedLead._id}
                  leadId={selectedLead.crmLeadId || selectedLead._id}
                  embedded={true}
                  showBackButton={false}
                  onDeleted={() => {
                    setSelectedLead(null);
                    if (selectedCampaign) fetchCampaignLeads(selectedCampaign, leadsPage);
                    fetchCampaigns();
                  }}
                  onChange={() => {
                    if (selectedCampaign) fetchCampaignLeads(selectedCampaign, leadsPage);
                    fetchCampaigns();
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Assign Members Modal (Admin Only) ──────────────────────────────── */}
      {isAdmin && (
        <AssignMembersModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          campaign={assignModalCampaign}
          employees={employees}
          currentAssignedUserIds={
            (
              campaignStats.find(c => c.campaign === assignModalCampaign)?.assignedUsers ||
              assignments.find(a => a.campaign === assignModalCampaign)?.assignedUsers ||
              []
            ).map(u => (u?._id ? u._id : u))
          }
          onConfirm={handleConfirmAssignment}
        />
      )}
    </div>
  );
}
