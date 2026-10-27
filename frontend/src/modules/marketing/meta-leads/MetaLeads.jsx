import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { metaLeadsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AssignMembersModal from './AssignMembersModal';
import CampaignWorkspace from './CampaignWorkspace';
import LeadDetailsPage from '../../../components/LeadDetails/LeadDetailsPage';
import {
  FiPlus, FiRefreshCw, FiSearch, FiLayers, FiUsers, FiCalendar,
  FiFlag, FiBarChart2, FiTrash2, FiArrowRight, FiX, FiCheck,
  FiCheckCircle, FiAlertTriangle, FiClock, FiChevronDown,
  FiTarget, FiActivity, FiEye, FiArrowUpRight, FiFilter,
  FiDownload, FiPhoneCall, FiMail, FiColumns, FiDatabase,
  FiUserPlus, FiShield
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

  // Assignment & Role Management State
  const [isAdmin, setIsAdmin] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignModalCampaign, setAssignModalCampaign] = useState('');

  // Fetch campaign stats and role boundaries
  const fetchCampaigns = async () => {
    try {
      const res = await metaLeadsAPI.getCampaigns();
      if (res.data?.success) {
        const fetchedCampaigns = res.data.campaigns || [];
        setCampaignStats(fetchedCampaigns);
        const adminFlag = res.data.isAdmin !== undefined ? res.data.isAdmin : true;
        const restrictedFlag = !!res.data.isRestricted;
        setIsAdmin(adminFlag);
        setIsRestricted(restrictedFlag);

        // Auto-select first accessible campaign for restricted employees
        if (restrictedFlag && fetchedCampaigns.length > 0) {
          const allowedNames = fetchedCampaigns.map(c => c.campaign);
          if (selectedCampaign === 'all' || !allowedNames.includes(selectedCampaign)) {
            setSelectedCampaign(allowedNames[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
  };

  // Fetch employees list (for Admin assignment modal)
  const fetchEmployees = async () => {
    try {
      const res = await usersAPI.getAll();
      if (res.data?.users) {
        setEmployees(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  // Fetch all assignments (for Admin assignment modal)
  const fetchAssignments = async () => {
    try {
      const res = await metaLeadsAPI.getAssignments();
      if (res.data?.success) {
        setAssignments(res.data.assignments || []);
      }
    } catch (err) {
      // Non-admins will receive 403, which is expected
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
    fetchEmployees();
    fetchAssignments();
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
    if (isRestricted) {
      // Standard telecallers only see campaigns assigned to them
      return campaignStats.map(c => c.campaign);
    }

    const list = [...DEFAULT_CAMPAIGNS];
    campaignStats.forEach(c => {
      if (c.campaign && !list.includes(c.campaign)) {
        list.push(c.campaign);
      }
    });
    return list;
  }, [campaignStats, isRestricted]);

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

  // Assignees for the currently selected campaign tab
  const activeCampaignAssignees = useMemo(() => {
    if (selectedCampaign === 'all') {
      // Return distinct assignees across all campaigns
      const memberMap = new Map();
      campaignStats.forEach(c => {
        (c.assignedUsers || []).forEach(u => {
          if (u && u._id) memberMap.set(u._id, u);
        });
      });
      return Array.from(memberMap.values());
    }

    // Specific campaign
    const stat = campaignStats.find(c => c.campaign === selectedCampaign);
    if (stat && stat.assignedUsers) return stat.assignedUsers;

    const asgn = assignments.find(a => a.campaign === selectedCampaign);
    return asgn?.assignedUsers || [];
  }, [selectedCampaign, campaignStats, assignments]);

  // Handle opening the assignment modal
  const handleOpenAssignModal = (targetCampaign) => {
    const campaignToAssign = targetCampaign || (selectedCampaign !== 'all' ? selectedCampaign : (allCampaignTabs[0] || DEFAULT_CAMPAIGNS[0]));
    setAssignModalCampaign(campaignToAssign);
    setShowAssignModal(true);
  };

  // Handle confirm assignment
  const handleConfirmAssignment = async (campaignName, userIds) => {
    await metaLeadsAPI.saveAssignments({ campaign: campaignName, userIds });
    setStatusMessage(`✅ Updated member assignments for ${campaignName}!`);
    await Promise.all([fetchCampaigns(), fetchAssignments()]);
  };

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

  // Trigger n8n Webhook Sync with Live Status Polling & Concurrency Lock
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setStatusMessage('Triggering n8n Google Sheets workflow...');
    try {
      const res = await metaLeadsAPI.triggerSync();
      setStatusMessage(res.data?.message || 'n8n workflow triggered! Ingesting Google Sheets...');
      
      // Poll execution status until completed or timed out
      let attempts = 0;
      const maxAttempts = 35; // 35 * 1.5s = ~52 seconds
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await metaLeadsAPI.getSyncStatus();
          const state = statusRes.data;
          if (state && state.message) {
            setStatusMessage(state.message);
          }
          if (!state.isSyncing || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            await fetchCampaigns();
            await fetchLeads();
            setSyncing(false);
            const summary = state.totalProcessed
              ? `Sync completed! Processed: ${state.totalProcessed} (${state.insertedCount} new, ${state.updatedCount} updated, ${state.skippedCount} skipped).`
              : 'Sync completed! Live leads updated from Google Sheets.';
            setStatusMessage(summary);
            setTimeout(() => setStatusMessage(''), 6000);
          }
        } catch (_) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            await fetchCampaigns();
            await fetchLeads();
            setSyncing(false);
            setStatusMessage('Sync finished. Refreshed leads.');
            setTimeout(() => setStatusMessage(''), 5000);
          }
        }
      }, 1500);
    } catch (err) {
      console.error('Sync error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Sync failed';
      setStatusMessage(`Sync notice: ${errMsg}`);
      setSyncing(false);
      await fetchCampaigns();
      await fetchLeads();
      setTimeout(() => setStatusMessage(''), 5000);
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
          setSelectedLead(prev => prev ? ({
            ...prev,
            status: 'Converted',
            crmLeadId: res.data?.crmLead?._id || prev.crmLeadId
          }) : null);
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

  // Helper to get phone, name, and email from dynamic Google Sheet columns
  const getLeadIdentifiers = (lead) => {
    const raw = lead?.rawData || {};
    let phone = raw.phone || raw.Phone || raw.mobile || raw.Mobile || raw['Phone Number'] || raw.Contact || raw['Contact Number'] || raw['Candidate Mobile'] || raw['Student Mobile'] || raw['Phone number'] || '';
    
    // Fallback: search any key in rawData that has phone/mobile/contact in its name
    if (!phone) {
      for (const k of Object.keys(raw)) {
        if (/phone|mobile|contact|cell/i.test(k) && raw[k]) {
          phone = raw[k];
          break;
        }
      }
    }
    
    // Fallback 2: check if any value in rawData matches 10 digits
    if (!phone) {
      for (const k of Object.keys(raw)) {
        const strVal = String(raw[k] || '').replace(/\D/g, '');
        if (strVal.length === 10) {
          phone = raw[k];
          break;
        }
      }
    }

    const name = raw.name || raw.Name || raw['Full Name'] || raw['Candidate Name'] || raw['Student Name'] || 'Unknown Lead';
    const email = raw.email || raw.Email || raw['Email Address'] || '';
    return { phone: String(phone).trim(), name: String(name).trim(), email: String(email).trim() };
  };

  // Click Phone Call Activate
  const handleActivatePhoneCall = (lead) => {
    const { phone, name } = getLeadIdentifiers(lead);
    if (!phone) {
      alert(`No phone number available for ${name}. Check the sheet fields.`);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    setStatusMessage(`📞 Activating phone call to ${name} (${cleanPhone})...`);
    window.location.href = `tel:${cleanPhone}`;
  };

  // ── Render Dedicated 3-Column Campaign Workspace upon Campaign Selection ──
  if (selectedCampaign !== 'all') {
    return (
      <>
        <CampaignWorkspace
          campaignName={selectedCampaign}
          onBack={() => { setSelectedCampaign('all'); setPage(1); }}
          isAdmin={isAdmin}
          isRestricted={isRestricted}
          employees={employees}
          assignments={assignments}
          onRefreshAll={fetchCampaigns}
          onOpenAssignModal={handleOpenAssignModal}
        />
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
      </>
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Assign Members Action (Admin Only) */}
          {isAdmin && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 8px 4px 10px', borderRadius: 10,
                background: T.white, border: `1px solid ${T.border}`
              }}
            >
              {/* Avatar Stack for Active Campaign */}
              {activeCampaignAssignees.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}>
                  {activeCampaignAssignees.slice(0, 3).map((member, idx) => {
                    const initials = (member.name || 'EM').slice(0, 2).toUpperCase();
                    return member.avatar ? (
                      <img
                        key={member._id || idx}
                        src={member.avatar}
                        alt={member.name}
                        title={`${member.name} (${member.designation || 'Staff'})`}
                        style={{
                          width: 26, height: 26, borderRadius: '50%',
                          border: '2px solid #ffffff', marginLeft: idx > 0 ? -8 : 0,
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div
                        key={member._id || idx}
                        title={`${member.name} (${member.designation || 'Staff'})`}
                        style={{
                          width: 26, height: 26, borderRadius: '50%',
                          border: '2px solid #ffffff', marginLeft: idx > 0 ? -8 : 0,
                          background: '#dbeafe', color: '#1d4ed8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700
                        }}
                      >
                        {initials}
                      </div>
                    );
                  })}
                  {activeCampaignAssignees.length > 3 && (
                    <div
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        border: '2px solid #ffffff', marginLeft: -8,
                        background: '#f1f5f9', color: '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600
                      }}
                    >
                      +{activeCampaignAssignees.length - 3}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => handleOpenAssignModal()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: T.blue, color: T.white, border: 'none', cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                }}
              >
                <FiUserPlus size={14} />
                Assign Members
              </button>
            </div>
          )}

          {leads.length > 0 && isAdmin && (
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
            meta-leads
          </div>
        </div>
      </div>

      {/* ── Zero Assigned Campaigns Empty State for Tele-callers ── */}
      {isRestricted && allCampaignTabs.length === 0 && (
        <div
          style={{
            background: T.white, border: `1px solid ${T.border}`, borderRadius: 16,
            padding: '44px 24px', textAlign: 'center', marginBottom: 24, maxWidth: 540, margin: '20px auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%', background: T.blueLight,
              color: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <FiUsers size={26} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>
            No campaigns assigned yet
          </h3>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: 0 }}>
            You don't currently have access to a Meta Leads campaign. Please contact your system administrator to request access.
          </p>
        </div>
      )}

      {/* ── INTERACTIVE CAMPAIGN HEADINGS (Same Pill Filter Styling as Campaigns.jsx) ── */}
      {allCampaignTabs.length > 0 && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isRestricted ? 'Your Assigned Campaigns:' : 'Click Campaign Heading to View Specific Leads:'}
            </div>
            {isAdmin && (
              <button
                onClick={() => handleOpenAssignModal(selectedCampaign !== 'all' ? selectedCampaign : allCampaignTabs[0])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600, color: T.blue,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '2px 6px', borderRadius: 6
                }}
                className="hover:underline"
              >
                <FiUserPlus size={13} />
                Manage Campaign Access
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {/* All Campaigns Pill (Admin only) */}
            {!isRestricted && (
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
            )}

            {/* Individual Campaign Headings */}
            {allCampaignTabs.map(tab => {
              const isSelected = selectedCampaign === tab;
              const count = campaignCountMap[tab] || 0;
              const tabStat = campaignStats.find(c => c.campaign === tab);
              const tabAssignees = tabStat?.assignedUsers || assignments.find(a => a.campaign === tab)?.assignedUsers || [];

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

                  {/* Member count indicator badge on tab */}
                  {tabAssignees.length > 0 && (
                    <span
                      title={`${tabAssignees.length} assigned member(s)`}
                      style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 10,
                        background: isSelected ? '#dbeafe' : '#f1f5f9',
                        color: isSelected ? '#1e40af' : '#64748b',
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3
                      }}
                    >
                      <FiUsers size={10} />
                      {tabAssignees.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                                <a
                                  href={`tel:${String(val).replace(/\D/g, '')}`}
                                  onClick={e => e.stopPropagation()}
                                  title={`📞 Click to Call ${strVal}`}
                                  style={{
                                    fontWeight: 600, color: '#059669', display: 'inline-flex',
                                    alignItems: 'center', gap: 5, textDecoration: 'none'
                                  }}
                                >
                                  <FiPhoneCall size={12} style={{ color: '#059669' }} />
                                  <span>{strVal}</span>
                                </a>
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
                          {/* Dedicated Call Action Button with Call Symbol & Click to Activate */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleActivatePhoneCall(lead); }}
                            title={phone ? `📞 Click to Call ${phone}` : 'No phone number available in sheet'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                              background: phone ? '#ecfdf5' : '#f8fafc',
                              color: phone ? '#059669' : '#94a3b8',
                              border: `1px solid ${phone ? '#a7f3d0' : '#e2e8f0'}`,
                              cursor: phone ? 'pointer' : 'not-allowed',
                              boxShadow: phone ? '0 1px 3px rgba(16,185,129,0.18)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <FiPhoneCall size={13} style={{ color: phone ? '#059669' : '#94a3b8' }} />
                            <span>Call</span>
                          </button>

                          {/* WhatsApp Action Button */}
                          {phone && (
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
                          )}

                          {/* View / Preview Lead Profile Button */}
                          <button
                            onClick={() => setSelectedLead(lead)}
                            title="Preview Lead Profile"
                            style={{
                              width: 30, height: 30, borderRadius: 6,
                              background: T.white, color: T.textSecondary,
                              border: `1px solid ${T.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                          >
                            <FiEye size={14} />
                          </button>

                          {/* Delete Lead Button */}
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

      {/* ── Slide-Over Lead Detail Drawer (Rich Profile Preview) ─────────────── */}
      <AnimatePresence>
        {selectedLead && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0,
                width: '100%', maxWidth: 1060, background: '#f8fafc',
                boxShadow: '-6px 0 35px rgba(0,0,0,0.2)',
                display: 'flex', flexDirection: 'column', zIndex: 101
              }}
            >
              {/* Drawer Top Header with Campaign Tag, Switcher, and Actions */}
              <div
                style={{
                  padding: '12px 20px', borderBottom: `1px solid ${T.border}`,
                  background: T.white, display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                      textTransform: 'uppercase', letterSpacing: '0.04em'
                    }}
                  >
                    Meta Lead Preview
                  </span>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                      maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}
                  >
                    {selectedLead.campaign}
                  </span>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getLeadIdentifiers(selectedLead).name}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Convert to CRM Lead Quick Action */}
                  {selectedLead.status !== 'Converted' ? (
                    <button
                      onClick={() => handleConvertLead(selectedLead._id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                        background: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                      }}
                    >
                      <FiCheck size={13} />
                      <span>Convert to CRM</span>
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                        background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
                      }}
                    >
                      ✓ Converted
                    </span>
                  )}

                  <button
                    onClick={() => setSelectedLead(null)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: T.muted
                    }}
                    title="Close Preview"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="bg-slate-50/60">
                <LeadDetailsPage
                  key={selectedLead._id}
                  leadId={selectedLead.crmLeadId || selectedLead._id}
                  embedded={true}
                  showBackButton={false}
                  onDeleted={() => {
                    setSelectedLead(null);
                    fetchLeads(page);
                  }}
                  onChange={() => {
                    fetchLeads(page);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Assign Members Modal (Admin Only) ── */}
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
