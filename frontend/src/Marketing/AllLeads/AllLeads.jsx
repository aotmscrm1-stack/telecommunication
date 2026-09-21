import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsAPI, usersAPI, blocklistAPI, leadStagesAPI } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Search, Plus, RefreshCw, Download, Star, Trash2, Ban,
  BarChart2, ChevronLeft, ChevronRight, Users, CheckCircle,
  Phone, Mail, MapPin, Sparkles, Filter, Eye, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { FiUserPlus, FiLink, FiChevronRight } from 'react-icons/fi';
import { RiFileExcel2Line } from 'react-icons/ri';

/* ─────────────────────────────────────────────────────────
   ORANGE MARKETING THEME (Harmonized with AddLead.jsx)
   ───────────────────────────────────────────────────────── */
const O = {
  primary: '#ff8c42',
  primary3: '#ffb877',
  deep: '#e84a10',
  darkest: '#c23a05',

  bg: '#fff8f2',
  bgSoft: '#fff0e8',
  bgSofter: '#fff5ed',

  line: '#ffe0cb',
  lineSoft: '#ffe4d5',

  ink: '#1f1206',
  inkSoft: '#6b5546',
  muted: '#a68a78',
  error: '#e63946',
  success: '#10b981',
  white: '#ffffff',
};

const PALETTE_COLORS = [
  O.primary,
  O.deep,
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#06b6d4',
  '#f97316'
];

const FALLBACK_STATUSES = [
  'All', 'Fresh', 'Connected', 'Call Not Responding', 'Call Back Later',
  'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost', 'Blocked'
];
const SOURCES = ['All', 'Manual', 'Facebook', 'WhatsApp', 'Website', 'Excel', 'Instagram', 'Referral', 'Other'];

function RatingStars({ lead, onRate }) {
  const [hoverRating, setHoverRating] = useState(0);
  const currentRating = lead.rating || 0;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHoverRating(0)}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || currentRating);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onClick={() => onRate(lead, star)}
            className="p-0.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
            title={`Set rating to ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-4 h-4 transition-all duration-150 ${isFilled
                  ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                  : 'text-stone-300 hover:text-amber-200'
                }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function AllLeads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'manager' || user?.role === 'admin';
  const isCaller = user?.role === 'employee' || user?.role === 'caller';

  const filterOptions = isAdmin
    ? [
      { key: 'all', label: 'All Leads' },
      { key: 'mine', label: 'My Leads' },
      { key: 'last_week', label: 'Last Week' },
      { key: 'last_month', label: 'Last Month' },
    ]
    : [
      { key: 'mine', label: 'My Leads' },
      { key: 'last_week', label: 'Last Week' },
      { key: 'last_month', label: 'Last Month' },
    ];

  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [source, setSource] = useState('All');
  const [filter, setFilter] = useState(isAdmin ? 'all' : 'mine');
  const [selected, setSelected] = useState([]);
  const [callers, setCallers] = useState([]);
  const [showCharts, setShowCharts] = useState(false);
  const [statusStats, setStatusStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [statuses, setStatuses] = useState(FALLBACK_STATUSES);
  const [ratingToast, setRatingToast] = useState('');

  // Load team callers for admin
  useEffect(() => {
    if (isAdmin) {
      usersAPI.getAll()
        .then(res => {
          setCallers(res.data.users || []);
        })
        .catch(console.error);
    }
  }, [user, isAdmin]);

  // Load custom lead stage statuses
  useEffect(() => {
    leadStagesAPI.get().then(res => {
      const active = (res.data.config?.statuses || [])
        .filter(s => !s.archived)
        .sort((a, b) => a.order - b.order)
        .map(s => s.name);
      if (active.length) setStatuses(['All', ...active, 'Blocked']);
    }).catch(() => { });
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await leadsAPI.getStats();
      const counts = res.data.statusCounts || [];
      setStatusStats(counts.map(s => ({ name: s._id, value: s.count })));
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    if (showCharts) fetchStats();
  }, [showCharts, fetchStats]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filter === 'last_week' || filter === 'last_month') {
        params.filter = 'mine';
        params.dateFilter = filter;
      } else {
        params.filter = filter;
      }
      if (search) params.search = search;
      if (status !== 'All') params.status = status;
      if (source !== 'All') params.source = source;
      const res = await leadsAPI.getAll(params);
      setLeads(res.data.leads || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, limit, search, status, source, filter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => { setPage(1); }, [search, status, source, filter, limit]);

  const handleRatingUpdate = async (lead, newRating) => {
    try {
      setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, rating: newRating } : l));
      await leadsAPI.update(lead._id, { rating: newRating });
      setRatingToast(`Rating updated to ${newRating} star${newRating > 1 ? 's' : ''} for ${lead.name}`);
      setTimeout(() => setRatingToast(''), 2500);
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  const toggleStar = async (lead, e) => {
    e.stopPropagation();
    try {
      await leadsAPI.update(lead._id, { isStarred: !lead.isStarred });
      setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, isStarred: !l.isStarred } : l));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await leadsAPI.delete(id);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete lead');
    }
  };

  const handleBlock = async (lead, e) => {
    e.stopPropagation();
    const reason = prompt(`Enter reason for blocking ${lead.name}:`, 'Spam Lead');
    if (reason === null) return;
    try {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      await blocklistAPI.add({ phone: cleanPhone, name: lead.name, reason });
      await leadsAPI.updateStatus(lead._id, { status: 'Blocked' });
      fetchLeads();
    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
  };

  const handleExport = async () => {
    try {
      const params = { filter };
      if (status !== 'All') params.status = status;
      const res = await leadsAPI.exportCSV(params);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `leads-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Export failed'); }
  };

  const pages = Math.ceil(total / limit) || 1;

  return (
    <div className="leads-shell flex flex-col" style={{ background: O.bg, minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
      <style>{`
        @media (max-width: 640px) {
          .leads-shell { height: auto !important; min-height: calc(100vh - 56px); padding: 12px !important; }
        }
      `}</style>

      {/* Floating Rating Toast */}
      {ratingToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: O.darkest, color: '#ffffff',
            borderRadius: 14, padding: '12px 20px', fontSize: 13, fontWeight: 600,
            boxShadow: `0 12px 30px ${O.deep}44`,
            display: 'flex', alignItems: 'center', gap: 8,
            border: `1px solid ${O.primary}`
          }}
        >
          <span style={{ color: '#fbbf24' }}>★</span> {ratingToast}
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-4 flex-wrap gap-3 mb-4"
        style={{ borderBottom: `1px solid ${O.line}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${O.primary}, ${O.deep})` }}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: O.ink }}>All Leads</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: O.inkSoft }}>
              {total.toLocaleString()} total customer leads in pipeline
            </p>
          </div>
        </div>

        {/* Top Header Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCharts(v => !v)}
            style={{
              background: showCharts ? `linear-gradient(135deg, ${O.primary}, ${O.deep})` : '#ffffff',
              color: showCharts ? '#ffffff' : O.inkSoft,
              borderColor: O.line,
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border shadow-sm transition-all hover:translate-y-[-1px]"
          >
            <BarChart2 className="w-4 h-4" />
            Charts & Analytics
          </button>

          <button
            onClick={handleExport}
            style={{ background: '#ffffff', color: O.inkSoft, borderColor: O.line }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border shadow-sm transition-all hover:bg-[#fff0e8]"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* Add Lead Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddMenu(v => !v)}
              style={{
                background: `linear-gradient(135deg, ${O.primary}, ${O.deep})`,
                boxShadow: `0 4px 14px ${O.deep}33`
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white transition-all hover:brightness-105"
            >
              <Plus className="w-4 h-4" />
              Add Lead
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showAddMenu && (
              <div
                style={{
                  position: 'absolute', right: 0, top: '118%', background: '#ffffff',
                  border: `1px solid ${O.line}`, borderRadius: 16,
                  boxShadow: '0 16px 40px -8px rgba(232, 74, 16, 0.2), 0 0 0 1px rgba(255, 224, 203, 0.5)',
                  minWidth: 280, zIndex: 300, overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease-out'
                }}
                onMouseLeave={() => setShowAddMenu(false)}
              >
                <div style={{
                  padding: '10px 16px', fontSize: 11, fontWeight: 700, color: O.muted,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  borderBottom: `1px solid ${O.lineSoft}`, background: O.bgSofter,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span>Add Lead Options</span>
                  <span style={{ fontSize: 10, background: O.bgSoft, color: O.deep, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>3 Ways</span>
                </div>
                {[
                  {
                    label: 'Add Single Lead',
                    desc: 'Quick manual lead entry form',
                    to: '/leads/new',
                    icon: <FiUserPlus className="w-4 h-4" style={{ color: O.deep }} />,
                    bg: '#fff0e8',
                    border: '#ffd6be',
                  },
                  {
                    label: 'Bulk Import from Excel',
                    desc: 'Upload .xlsx, .xls or .csv sheets',
                    to: '/bulk-import',
                    icon: <RiFileExcel2Line className="w-4 h-4 text-emerald-600" />,
                    bg: '#ecfdf5',
                    border: '#a7f3d0',
                  },
                  {
                    label: 'Connect Integration',
                    desc: 'Sync Meta, Webhooks & APIs',
                    to: '/integrations',
                    icon: <FiLink className="w-4 h-4 text-blue-600" />,
                    bg: '#eff6ff',
                    border: '#bfdbfe',
                  },
                ].map(item => (
                  <div
                    key={item.to}
                    onClick={() => { setShowAddMenu(false); navigate(item.to); }}
                    className="group transition-colors duration-150"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 16px', cursor: 'pointer',
                      borderBottom: `1px solid ${O.lineSoft}`
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = O.bgSoft}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: item.bg, border: `1px solid ${item.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: O.ink, lineHeight: 1.25 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: O.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.desc}
                      </div>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts Panel */}
      {showCharts && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0 pb-4"
        >
          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: O.line }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm" style={{ color: O.ink }}>Lead Status Distribution</h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: O.bgSoft, color: O.deep }}>
                Bar Visualization
              </span>
            </div>
            {statsLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              </div>
            ) : statusStats.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-stone-400 text-xs">No chart metrics available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusStats} margin={{ top: 5, right: 5, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={O.lineSoft} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: O.inkSoft }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: O.inkSoft }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12, color: O.ink }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusStats.map((_, i) => <Cell key={i} fill={PALETTE_COLORS[i % PALETTE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: O.line }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm" style={{ color: O.ink }}>Pipeline Ratio Breakdown</h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: O.bgSoft, color: O.deep }}>
                Pie Visualization
              </span>
            </div>
            {statsLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              </div>
            ) : statusStats.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-stone-400 text-xs">No chart metrics available</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={statusStats}
                      cx="50%" cy="50%"
                      outerRadius={68} innerRadius={36}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusStats.map((_, i) => <Cell key={i} fill={PALETTE_COLORS[i % PALETTE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-3 max-h-24 overflow-y-auto pr-1">
                  {statusStats.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE_COLORS[i % PALETTE_COLORS.length] }} />
                      <span className="truncate text-stone-600 font-medium">{s.name}</span>
                      <span className="font-bold ml-auto" style={{ color: O.ink }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Container */}
      <div className="flex flex-col md:flex-row items-stretch gap-4 flex-1 min-h-0">

        {/* Filter View Sidebar Card */}
        <div className="w-full md:w-56 flex-shrink-0 bg-white rounded-2xl border shadow-sm p-3.5 space-y-1 overflow-y-auto max-h-56 md:max-h-none"
          style={{ borderColor: O.line }}>
          <div className="text-[11px] font-bold uppercase tracking-wider px-2 mb-2.5" style={{ color: O.deep }}>
            {isAdmin ? 'Pipeline Filters' : 'My Workspace'}
          </div>
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${filter === opt.key
                  ? 'text-white shadow-sm'
                  : 'text-stone-700 hover:bg-[#fff0e8]'
                }`}
              style={filter === opt.key ? { background: `linear-gradient(135deg, ${O.primary}, ${O.deep})` } : undefined}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${filter === opt.key ? 'bg-white' : 'bg-stone-300'}`} />
              {opt.label}
            </button>
          ))}

          {/* Team Members List for Manager/Admin */}
          {isAdmin && callers.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${O.lineSoft}` }}>
              <div className="text-[11px] font-bold uppercase tracking-wider px-2 mb-2" style={{ color: O.deep }}>
                Team Members
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {callers.map(c => (
                  <button
                    key={c._id}
                    onClick={() => setFilter(c._id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${filter === c._id ? 'bg-[#fff0e8] text-[#c23a05] border border-[#ffe0cb]' : 'text-stone-700 hover:bg-[#fff0e8]'
                      }`}
                  >
                    <div className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: O.primary }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Leads Table Container */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden"
          style={{ borderColor: O.line }}>

          {/* Controls Bar: Search & Status / Source Filters */}
          <div className="flex items-center gap-2.5 p-3 border-b flex-shrink-0 flex-wrap"
            style={{ borderColor: O.line, background: '#ffffff' }}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search leads by name or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none bg-[#fff8f2] text-stone-800 font-medium"
                style={{ borderColor: O.line }}
              />
            </div>

            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-xs font-bold border rounded-xl px-3 py-2 bg-[#fff8f2] text-stone-700 outline-none cursor-pointer"
              style={{ borderColor: O.line }}
            >
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>

            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="text-xs font-bold border rounded-xl px-3 py-2 bg-[#fff8f2] text-stone-700 outline-none cursor-pointer"
              style={{ borderColor: O.line }}
            >
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>

            <button
              onClick={fetchLeads}
              className="p-2 rounded-xl border bg-white text-stone-600 hover:bg-[#fff0e8] transition-colors"
              style={{ borderColor: O.line }}
              title="Refresh leads list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 border-b" style={{ background: O.bgSofter, borderColor: O.line }}>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.length === leads.length && leads.length > 0}
                      onChange={e => setSelected(e.target.checked ? leads.map(l => l._id) : [])}
                      className="rounded border-stone-300 accent-orange-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: O.ink }}>Lead Name</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: O.ink }}>Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: O.ink }}>Rating</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: O.ink }}>Assignee</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: O.ink }}>Created Date</th>
                  {(isAdmin || isCaller) && <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: O.ink }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-2" />
                      <div className="text-xs font-bold" style={{ color: O.deep }}>Loading leads...</div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center">
                      <div className="text-stone-300 mb-2">
                        <Users className="w-10 h-10 mx-auto" />
                      </div>
                      <div className="text-xs font-semibold text-stone-400">No leads found in this view.</div>
                      <button onClick={() => navigate('/leads/new')} className="mt-2 text-xs font-bold hover:underline" style={{ color: O.deep }}>
                        + Add a new lead
                      </button>
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr
                      key={lead._id}
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      className="border-b transition-colors cursor-pointer group hover:bg-[#fff8f2]"
                      style={{ borderColor: O.lineSoft }}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(lead._id)}
                          onChange={e => setSelected(prev =>
                            e.target.checked ? [...prev, lead._id] : prev.filter(id => id !== lead._id)
                          )}
                          className="rounded border-stone-300 accent-orange-500"
                        />
                      </td>

                      {/* Lead Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={e => toggleStar(lead, e)}
                            className={`transition-colors flex-shrink-0 ${lead.isStarred ? 'text-amber-400' : 'text-stone-300 hover:text-amber-300'}`}
                          >
                            <Star className="w-4 h-4" fill={lead.isStarred ? 'currentColor' : 'none'} />
                          </button>
                          <div>
                            <div className="font-bold text-xs" style={{ color: O.ink }}>{lead.name}</div>
                            <div className="text-[11px] font-semibold" style={{ color: O.inkSoft }}>{lead.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>

                      {/* Rating Component */}
                      <td className="px-4 py-3">
                        <RatingStars lead={lead} onRate={handleRatingUpdate} />
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-3">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ background: O.primary }}>
                              {lead.assignedTo.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-xs font-semibold text-stone-700 truncate max-w-28">{lead.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-stone-400">Unassigned</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3 text-xs font-medium text-stone-500">
                        {lead.createdAt ? format(new Date(lead.createdAt), 'd MMM yyyy') : '—'}
                      </td>

                      {/* Actions */}
                      {(isAdmin || isCaller) && (
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isAdmin && (
                              <button
                                onClick={e => handleBlock(lead, e)}
                                className="p-1.5 rounded-lg text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                title="Block Lead"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={e => handleDelete(lead._id, e)}
                                className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Controls & Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0 flex-wrap gap-2"
            style={{ borderColor: O.line, background: '#ffffff' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold" style={{ color: O.inkSoft }}>
                {total > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} leads` : '0 leads'}
              </span>

              {/* Limit Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400 font-medium">Limit:</span>
                <select
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                  className="text-xs font-bold border rounded-lg px-2 py-1 bg-[#fff8f2] text-stone-700 outline-none cursor-pointer"
                  style={{ borderColor: O.line }}
                >
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border text-stone-600 hover:bg-[#fff0e8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: O.line }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: p === page ? `linear-gradient(135deg, ${O.primary}, ${O.deep})` : '#ffffff',
                      color: p === page ? '#ffffff' : O.ink,
                      border: `1px solid ${O.line}`
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-1.5 rounded-lg border text-stone-600 hover:bg-[#fff0e8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: O.line }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
