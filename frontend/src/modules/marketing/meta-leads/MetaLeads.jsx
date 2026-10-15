import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { metaLeadsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import {
  FiPlus, FiRefreshCw, FiSearch, FiLayers, FiUsers, FiCalendar,
  FiFlag, FiBarChart2, FiTrash2, FiArrowRight, FiX, FiCheck,
  FiCheckCircle, FiAlertTriangle, FiClock, FiChevronDown,
  FiTarget, FiActivity, FiEye, FiArrowUpRight, FiFilter,
  FiDownload, FiPhoneCall, FiMail, FiColumns, FiDatabase
} from 'react-icons/fi';
import { RiMegaphoneLine, RiFolderChartLine } from 'react-icons/ri';
import { FaWhatsapp } from 'react-icons/fa';

// ── White, Blue, Orange Theme Design Tokens (Matching Campaigns.jsx) ──────────
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

// Standard Sheet Tab Headings
const DEFAULT_CAMPAIGNS = [
  'Digital Marketing_Leads',
  'SAP_Leads',
  'Python_Leads',
  'CyberSecurity_Leads'
];

function timeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  return `${Math.max(1, mins)}m ago`;
}

export default function MetaLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [leads, setLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [campaignStats, setCampaignStats] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedLead, setSelectedLead] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch campaign stats
  const fetchCampaigns = async () => {
    try {
      const res = await metaLeadsAPI.getCampaigns();
      if (res.data?.success) {
        setCampaignStats(res.data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
  };

  // Fetch leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        campaign: selectedCampaign !== 'all' ? selectedCampaign : undefined,
        search: search.trim() || undefined,
      };
      const res = await metaLeadsAPI.getAll(params);
      if (res.data?.success) {
        setLeads(res.data.leads || []);
        setTotalLeads(res.data.total || 0);
        setTotalPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch meta leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [selectedCampaign, page, limit]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLeads();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Combine default campaigns with discovered database campaigns
  const allCampaignTabs = useMemo(() => {
    const list = [...DEFAULT_CAMPAIGNS];
    campaignStats.forEach(c => {
      if (c.campaign && !list.includes(c.campaign)) {
        list.push(c.campaign);
      }
    });
    return list;
  }, [campaignStats]);

  // Map of campaign lead counts
  const campaignCountMap = useMemo(() => {
    const map = {};
    let sum = 0;
    campaignStats.forEach(c => {
      map[c.campaign] = c.count || 0;
      sum += c.count || 0;
    });
    map['all'] = sum;
    return map;
  }, [campaignStats]);

  // Extract all unique dynamic Google Sheet headers from current leads
  const dynamicHeaders = useMemo(() => {
    const set = new Set();
    leads.forEach(l => {
      if (l.rawData && typeof l.rawData === 'object') {
        Object.keys(l.rawData).forEach(k => {
          if (!k.startsWith('_') && k !== 'campaign' && k !== 'source') {
            set.add(k);
          }
        });
      }
    });
    const arr = Array.from(set);
    // Sort so primary fields (Name, Phone, Email) appear first if available
    return arr.sort((a, b) => {
      const priority = ['Full Name', 'Name', 'name', 'Phone', 'phone', 'Mobile', 'mobile', 'Email', 'email', 'Timestamp', 'Date'];
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [leads]);

  // Initialize visible columns
  useEffect(() => {
    if (dynamicHeaders.length > 0) {
      setVisibleColumns(prev => {
        const next = { ...prev };
        dynamicHeaders.forEach((h, idx) => {
          if (next[h] === undefined) {
            // By default, show first 7 columns to maintain great table density
            next[h] = idx < 7;
          }
        });
        return next;
      });
    }
  }, [dynamicHeaders]);

  // Trigger n8n Webhook Sync
  const handleSync = async () => {
    setSyncing(true);
    setStatusMessage('Triggering n8n Google Sheets workflow...');
    try {
      const res = await metaLeadsAPI.triggerSync();
      setStatusMessage(res.data?.message || 'n8n workflow triggered! Ingesting Google Sheets...');
      
      // Wait for n8n execution to pull sheets and post leads, then refetch
      setTimeout(async () => {
        await fetchCampaigns();
        await fetchLeads();
        setStatusMessage('Sync completed! Live leads updated from Google Sheets.');
        setTimeout(() => setStatusMessage(''), 5000);
      }, 2500);
    } catch (err) {
      console.error('Sync error:', err);
      setStatusMessage('Trigger sent to n8n webhook. Refreshing leads...');
      await fetchCampaigns();
      await fetchLeads();
      setTimeout(() => setStatusMessage(''), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // Clear / Purge all leads (Clean Slate)
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all meta leads from the database? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await metaLeadsAPI.clearAll();
      alert(res.data?.message || 'Leads cleared');
      await fetchCampaigns();
      await fetchLeads();
    } catch (err) {
      alert('Failed to clear: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert to CRM Lead
  const handleConvertLead = async (leadId) => {
    try {
      const res = await metaLeadsAPI.convert(leadId);
      if (res.data?.success) {
        alert('Lead successfully converted and pushed to Active Tele-Caller Queue!');
        if (selectedLead && selectedLead._id === leadId) {
          setSelectedLead(prev => ({ ...prev, status: 'Converted' }));
        }
        fetchLeads();
        fetchCampaigns();
      }
    } catch (err) {
      alert('Failed to convert: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this meta lead?')) return;
    try {
      await metaLeadsAPI.delete(leadId);
      fetchLeads();
      fetchCampaigns();
      if (selectedLead?._id === leadId) setSelectedLead(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Export CSV preserving exact Google Sheet columns
  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export');
      return;
    }
    const headers = dynamicHeaders.length > 0 ? dynamicHeaders : ['Campaign', 'Status', 'Date'];
    const csvRows = [];
    csvRows.push(['Campaign', 'Status', ...headers].map(h => `"${h}"`).join(','));

    leads.forEach(l => {
      const row = [
        l.campaign || '',
        l.status || '',
        ...headers.map(h => {
          const val = l.rawData?.[h] !== undefined ? l.rawData[h] : '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meta-leads-${selectedCampaign}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to get phone and name
  const getLeadIdentifiers = (lead) => {
    const raw = lead?.rawData || {};
    const phone = raw.phone || raw.Phone || raw.mobile || raw.Mobile || raw['Phone Number'] || raw.Contact || '';
    const name = raw.name || raw.Name || raw['Full Name'] || raw['Candidate Name'] || raw['Student Name'] || 'Unknown Lead';
    const email = raw.email || raw.Email || raw['Email Address'] || '';
    return { phone: String(phone).trim(), name: String(name).trim(), email: String(email).trim() };
  };

  return (
    <div style={{ background: T.bg, minHeight: '100vh', padding: '24px 28px' }}>
      {/* ── Page Header (Matching Campaigns.jsx Style) ────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: T.blueLight, border: `1px solid ${T.blueBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.blue
            }}
          >
            <RiFolderChartLine size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>
                Meta Leads Ingestion Hub
              </h1>
              <span
                style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: T.blueLight, color: T.blue, border: `1px solid ${T.blueBorder}`
                }}
              >
                Google Sheets Live Sync
              </span>
            </div>
            <p style={{ fontSize: 13, color: T.muted, margin: '2px 0 0' }}>
              Multi-tab Google Sheets sync preserving 100% of custom column headings with zero data truncation.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {leads.length > 0 && (
            <button
              onClick={handleClearAll}
              title="Clear all leads from the database"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: T.roseLight, border: `1px solid ${T.roseBorder}`, color: T.rose,
                cursor: 'pointer'
              }}
            >
              <FiTrash2 size={14} />
              Clear All
            </button>
          )}

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: T.white, border: `1px solid ${T.border}`, color: T.text,
              cursor: 'pointer'
            }}
          >
            <FiDownload size={15} />
            Export CSV
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: T.blue, color: T.white, border: 'none', cursor: 'pointer',
              opacity: syncing ? 0.7 : 1
            }}
          >
            <FiRefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync Status Toast */}
      {statusMessage && (
        <div
          style={{
            marginBottom: 16, padding: '10px 16px', borderRadius: 8,
            background: T.emeraldLight, border: `1px solid ${T.emeraldBorder}`,
            color: T.emerald, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <FiCheckCircle size={16} />
          {statusMessage}
        </div>
      )}

      {/* ── Metric Summary Cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Total Meta Leads</span>
            <span style={{ color: T.blue, background: T.blueLight, padding: 6, borderRadius: 8 }}><FiUsers size={16} /></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{campaignCountMap['all'] || totalLeads}</div>
          <div style={{ fontSize: 12, color: T.emerald, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiActivity size={12} /> Across all connected tabs
          </div>
        </div>

        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Active Campaign Tabs</span>
            <span style={{ color: T.orange, background: T.orangeLight, padding: 6, borderRadius: 8 }}><FiLayers size={16} /></span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{allCampaignTabs.length} Tabs</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            Google Sheets A:ZZ readers
          </div>
        </div>

        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Selected Tab Filter</span>
            <span style={{ color: T.emerald, background: T.emeraldLight, padding: 6, borderRadius: 8 }}><FiTarget size={16} /></span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedCampaign === 'all' ? 'All Campaigns' : selectedCampaign}
          </div>
          <div style={{ fontSize: 12, color: T.blue, marginTop: 4, fontWeight: 600 }}>
            {campaignCountMap[selectedCampaign] || (selectedCampaign === 'all' ? totalLeads : 0)} Leads loaded
          </div>
        </div>

        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Live Sync Status</span>
            <span style={{ color: '#059669', background: '#ecfdf5', padding: 6, borderRadius: 8 }}><FiClock size={16} /></span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {campaignStats[0]?.lastSynced ? timeAgo(campaignStats[0].lastSynced) : 'Connected'}
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            n8n Webhook /api/meta-leads
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE CAMPAIGN HEADINGS (Same Pill Filter Styling as Campaigns.jsx) ── */}
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Click Campaign Heading to View Specific Leads:
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {/* All Campaigns Pill */}
          <button
            onClick={() => { setSelectedCampaign('all'); setPage(1); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
              background: selectedCampaign === 'all' ? T.blueLight : T.white,
              border: `1px solid ${selectedCampaign === 'all' ? T.blueBorder : T.border}`,
              color: selectedCampaign === 'all' ? T.blue : T.muted,
              whiteSpace: 'nowrap'
            }}
          >
            <FiTarget size={14} />
            <span>All Campaigns</span>
            <span
              style={{
                fontSize: 11, padding: '1px 7px', borderRadius: 12,
                background: selectedCampaign === 'all' ? T.blue : T.borderSoft,
                color: selectedCampaign === 'all' ? T.white : T.textSecondary
              }}
            >
              {campaignCountMap['all'] || totalLeads}
            </span>
          </button>

          {/* Individual Campaign Headings */}
          {allCampaignTabs.map(tab => {
            const isSelected = selectedCampaign === tab;
            const count = campaignCountMap[tab] || 0;
            return (
              <button
                key={tab}
                onClick={() => { setSelectedCampaign(tab); setPage(1); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  background: isSelected ? T.blueLight : T.white,
                  border: `1px solid ${isSelected ? T.blueBorder : T.border}`,
                  color: isSelected ? T.blue : T.muted,
                  whiteSpace: 'nowrap'
                }}
              >
                <FiLayers size={14} style={{ color: isSelected ? T.blue : T.subtle }} />
                <span>{tab.replace(/_/g, ' ')}</span>
                <span
                  style={{
                    fontSize: 11, padding: '1px 7px', borderRadius: 12,
                    background: isSelected ? T.blue : T.borderSoft,
                    color: isSelected ? T.white : T.textSecondary
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search & Action Toolbar ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 16, flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
          {/* Universal Search Input */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.white, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '8px 12px', flex: 1, maxWidth: 440
            }}
          >
            <FiSearch size={16} color={T.muted} />
            <input
              type="text"
              placeholder="Search by name, mobile, city, or any custom sheet attribute..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 13, color: T.text, width: '100%'
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 0 }}
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          {/* Column Visibility Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColumnDropdown(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: T.white, border: `1px solid ${T.border}`, color: T.text,
                cursor: 'pointer'
              }}
            >
              <FiColumns size={14} color={T.muted} />
              <span>Visible Columns</span>
              <FiChevronDown size={14} />
            </button>

            {showColumnDropdown && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 30,
                  background: T.white, border: `1px solid ${T.border}`, borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: 240, maxHeight: 300,
                  overflowY: 'auto', padding: 8
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, padding: '4px 8px', textTransform: 'uppercase' }}>
                  Toggle Google Sheet Columns
                </div>
                {dynamicHeaders.map(col => (
                  <label
                    key={col}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', fontSize: 12, color: T.text,
                      cursor: 'pointer', borderRadius: 6
                    }}
                    className="hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col] !== false}
                      onChange={e => setVisibleColumns(v => ({ ...v, [col]: e.target.checked }))}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lead Count Display */}
        <div style={{ fontSize: 13, color: T.muted }}>
          Showing <b>{leads.length}</b> of <b>{totalLeads}</b> leads
        </div>
      </div>

      {/* ── DYNAMIC ZERO-LOSS TABLE (Preserving Google Sheet Headings 100%) ── */}
      <div
        style={{
          background: T.white, border: `1px solid ${T.border}`,
          borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: T.muted, width: 48 }}>#</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: T.muted }}>Campaign Tab</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, color: T.muted }}>Status</th>

                {/* DYNAMIC GOOGLE SHEET HEADERS (Exact columns, no loss!) */}
                {dynamicHeaders
                  .filter(h => visibleColumns[h] !== false)
                  .map(header => (
                    <th
                      key={header}
                      style={{
                        padding: '12px 14px', fontWeight: 600, color: T.text,
                        whiteSpace: 'nowrap', borderLeft: `1px solid ${T.borderSoft}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{header}</span>
                      </div>
                    </th>
                  ))}

                <th style={{ padding: '12px 14px', fontWeight: 600, color: T.muted, textAlign: 'right', minWidth: 140 }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={dynamicHeaders.length + 4} style={{ padding: 48, textAlign: 'center', color: T.muted }}>
                    <FiRefreshCw className="animate-spin inline-block mr-2" size={20} />
                    Loading dynamic campaign leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={dynamicHeaders.length + 4} style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ maxWidth: 360, margin: '0 auto' }}>
                      <div
                        style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: T.blueLight, color: T.blue, margin: '0 auto 12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <RiFolderChartLine size={26} />
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>
                        No Leads Ingested Yet
                      </h3>
                      <p style={{ fontSize: 13, color: T.muted, margin: '0 0 16px' }}>
                        Trigger your live n8n workflow to read all campaign tabs from your Google Sheet and stream them into the CRM.
                      </p>
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        style={{
                          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                          background: T.blue, color: T.white, border: 'none', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          opacity: syncing ? 0.7 : 1
                        }}
                      >
                        <FiRefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Triggering n8n Workflow...' : 'Sync Now with n8n'}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  const { phone, name, email } = getLeadIdentifiers(lead);
                  return (
                    <tr
                      key={lead._id || index}
                      style={{ borderBottom: `1px solid ${T.borderSoft}`, transition: 'background 0.12s' }}
                      className="hover:bg-slate-50"
                    >
                      {/* Row Index */}
                      <td style={{ padding: '12px 14px', color: T.muted, fontSize: 12 }}>
                        {(page - 1) * limit + index + 1}
                      </td>

                      {/* Campaign Pill */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                            background: T.blueLight, color: T.blue, border: `1px solid ${T.blueBorder}`
                          }}
                        >
                          {lead.campaign}
                        </span>
                      </td>

                      {/* Status Tag */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                            background: lead.status === 'Converted' ? T.emeraldLight : T.orangeLight,
                            color: lead.status === 'Converted' ? T.emerald : T.orange,
                            border: `1px solid ${lead.status === 'Converted' ? T.emeraldBorder : T.orangeBorder}`
                          }}
                        >
                          {lead.status || 'New'}
                        </span>
                      </td>

                      {/* DYNAMIC GOOGLE SHEET VALUES */}
                      {dynamicHeaders
                        .filter(h => visibleColumns[h] !== false)
                        .map(header => {
                          const val = lead.rawData?.[header];
                          const strVal = val !== undefined && val !== null ? String(val) : '—';
                          const isPhoneCol = header.toLowerCase().includes('phone') || header.toLowerCase().includes('mobile');
                          const isEmailCol = header.toLowerCase().includes('email');

                          return (
                            <td
                              key={header}
                              style={{
                                padding: '12px 14px', color: T.text,
                                borderLeft: `1px solid ${T.borderSoft}`, whiteSpace: 'nowrap'
                              }}
                            >
                              {isPhoneCol && val ? (
                                <span style={{ fontWeight: 600, color: T.blue }}>
                                  {strVal}
                                </span>
                              ) : isEmailCol && val ? (
                                <span style={{ color: T.muted }}>
                                  {strVal}
                                </span>
                              ) : (
                                <span>{strVal}</span>
                              )}
                            </td>
                          );
                        })}

                      {/* Actions Column (Call, WhatsApp, View Details, Delete) */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {phone && (
                            <>
                              <a
                                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Chat on WhatsApp"
                                style={{
                                  width: 30, height: 30, borderRadius: 6,
                                  background: T.emeraldLight, color: T.emerald,
                                  border: `1px solid ${T.emeraldBorder}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                <FaWhatsapp size={14} />
                              </a>

                              <a
                                href={`tel:${phone}`}
                                title="Call Lead"
                                style={{
                                  width: 30, height: 30, borderRadius: 6,
                                  background: T.blueLight, color: T.blue,
                                  border: `1px solid ${T.blueBorder}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                              >
                                <FiPhoneCall size={13} />
                              </a>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedLead(lead)}
                            title="Inspect All Sheet Fields"
                            style={{
                              width: 30, height: 30, borderRadius: 6,
                              background: T.white, color: T.textSecondary,
                              border: `1px solid ${T.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                          >
                            <FiEye size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteLead(lead._id)}
                            title="Delete Lead"
                            style={{
                              width: 30, height: 30, borderRadius: 6,
                              background: T.white, color: T.rose,
                              border: `1px solid ${T.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderTop: `1px solid ${T.border}`, background: '#f8fafc',
            flexWrap: 'wrap', gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.muted }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{
                background: T.white, border: `1px solid ${T.border}`, borderRadius: 6,
                padding: '4px 8px', fontSize: 13, color: T.text, outline: 'none'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: T.white, border: `1px solid ${T.border}`,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: T.muted, padding: '0 8px' }}>
              Page <b>{page}</b> of <b>{totalPages}</b>
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: T.white, border: `1px solid ${T.border}`,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Slide-Over Lead Detail Drawer (All Raw Sheet Columns) ─────────────── */}
      <AnimatePresence>
        {selectedLead && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)' }}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0,
                width: '100%', maxWidth: 520, background: T.white,
                boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', zIndex: 101
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  padding: '20px 24px', borderBottom: `1px solid ${T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: T.blueLight, color: T.blue, border: `1px solid ${T.blueBorder}`
                      }}
                    >
                      {selectedLead.campaign}
                    </span>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: selectedLead.status === 'Converted' ? T.emeraldLight : T.orangeLight,
                        color: selectedLead.status === 'Converted' ? T.emerald : T.orange
                      }}
                    >
                      {selectedLead.status}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: '6px 0 0' }}>
                    {getLeadIdentifiers(selectedLead).name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
                    background: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: T.muted
                  }}
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Drawer Content: Renders All Raw Sheet Key-Values */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 12 }}>
                  All Google Sheet Column Values:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {selectedLead.rawData && Object.keys(selectedLead.rawData).map(key => {
                    const val = selectedLead.rawData[key];
                    return (
                      <div
                        key={key}
                        style={{
                          background: '#f8fafc', border: `1px solid ${T.borderSoft}`,
                          borderRadius: 8, padding: '10px 14px', display: 'flex',
                          flexDirection: 'column', gap: 2
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>
                          {key}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: T.text, wordBreak: 'break-word' }}>
                          {val !== undefined && val !== null ? String(val) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div
                style={{
                  padding: '16px 24px', borderTop: `1px solid ${T.border}`,
                  background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10
                }}
              >
                {selectedLead.status !== 'Converted' ? (
                  <button
                    onClick={() => handleConvertLead(selectedLead._id)}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: T.blue, color: T.white, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <FiCheck size={16} />
                    Convert to Active Tele-Caller Lead
                  </button>
                ) : (
                  <div
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: T.emeraldLight, color: T.emerald, border: `1px solid ${T.emeraldBorder}`,
                      textAlign: 'center'
                    }}
                  >
                    ✓ Converted to CRM Leads
                  </div>
                )}

                <button
                  onClick={() => setSelectedLead(null)}
                  style={{
                    padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: T.white, border: `1px solid ${T.border}`, color: T.text,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
