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
import { canDelete, canAccessEmailBlast } from '../../utils/permissions';

// ── White, Blue, Orange Theme Design Tokens ──────────────────────────────────
const T = {
  white: '#ffffff',
  bg: '#f8fafc',
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

const PALETTE_COLORS = [
  '#2563eb', // Blue
  '#ea580c', // Orange
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#3b82f6', // Light Blue
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
            className="p-0.5 transition-transform hover:scale-115 focus:outline-none cursor-pointer"
            title={`Set rating to ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-3.5 h-3.5 transition-all duration-150 ${
                isFilled
                  ? 'text-amber-400 fill-amber-400 drop-shadow-2xs'
                  : 'text-slate-200 hover:text-amber-200'
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
    <div className="min-h-[calc(100vh-64px)] bg-slate-50/60 flex flex-col">
      {/* Floating Rating Toast */}
      {ratingToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white rounded-xl px-4 py-2.5 text-xs font-medium shadow-lg flex items-center gap-2 border border-slate-700"
        >
          <span className="text-amber-400">★</span> {ratingToast}
        </motion.div>
      )}

      {/* Responsive Container (Decreased Width, Max 7xl, Perfect Screen Fit) */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-5 flex flex-col flex-1 space-y-4">
        {/* Page Header (White, Blue, Orange) */}
        <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-slate-200 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-blue-600 shadow-xs">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">All Leads</h1>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                <span className="font-medium text-slate-700">{total.toLocaleString()}</span> total customer leads in pipeline
              </p>
            </div>
          </div>

          {/* Top Header Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCharts(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all shadow-xs ${
                showCharts
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showCharts ? 'Hide Charts' : 'Charts & Analytics'}</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {canAccessEmailBlast(user) && (
              <button
                onClick={() => navigate('/email-blast')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Blast</span>
              </button>
            )}

            {/* Add Lead Dropdown Button (Orange Theme) */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lead</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showAddMenu && (
                <div
                  className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[260px] z-50 overflow-hidden"
                  onMouseLeave={() => setShowAddMenu(false)}
                >
                  <div className="px-3.5 py-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span>Add Lead Options</span>
                    <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium border border-orange-200">3 Ways</span>
                  </div>
                  {[
                    {
                      label: 'Add Single Lead',
                      desc: 'Quick manual lead entry form',
                      to: '/leads/new',
                      icon: <FiUserPlus className="w-3.5 h-3.5 text-orange-600" />,
                      bg: T.orangeLight,
                      border: T.orangeBorder,
                    },
                    {
                      label: 'Bulk Import from Excel',
                      desc: 'Upload .xlsx, .xls or .csv sheets',
                      to: '/bulk-import',
                      icon: <RiFileExcel2Line className="w-3.5 h-3.5 text-emerald-600" />,
                      bg: T.emeraldLight,
                      border: T.emeraldBorder,
                    },
                    {
                      label: 'Connect Integration',
                      desc: 'Sync Meta, Webhooks & APIs',
                      to: '/integrations',
                      icon: <FiLink className="w-3.5 h-3.5 text-blue-600" />,
                      bg: T.blueLight,
                      border: T.blueBorder,
                    },
                  ].map(item => (
                    <div
                      key={item.to}
                      onClick={() => { setShowAddMenu(false); navigate(item.to); }}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-b-0"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: item.bg, border: `1px solid ${item.border}` }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-800">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal truncate">
                          {item.desc}
                        </div>
                      </div>
                      <FiChevronRight className="w-3.5 h-3.5 text-slate-300" />
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
            className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 flex-shrink-0"
          >
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-xs sm:text-sm text-slate-800">Lead Status Distribution</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Bar Chart
                </span>
              </div>
              {statsLoading ? (
                <div className="flex justify-center items-center h-44">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                </div>
              ) : statusStats.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-slate-400 text-xs font-normal">No chart metrics available</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusStats} margin={{ top: 5, right: 5, left: -20, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 11, color: '#1e293b' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statusStats.map((_, i) => <Cell key={i} fill={PALETTE_COLORS[i % PALETTE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-xs sm:text-sm text-slate-800">Pipeline Ratio Breakdown</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                  Ratio
                </span>
              </div>
              {statsLoading ? (
                <div className="flex justify-center items-center h-44">
                  <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                </div>
              ) : statusStats.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-slate-400 text-xs font-normal">No chart metrics available</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={statusStats}
                        cx="50%" cy="50%"
                        outerRadius={58} innerRadius={30}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusStats.map((_, i) => <Cell key={i} fill={PALETTE_COLORS[i % PALETTE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-20 overflow-y-auto pr-1">
                    {statusStats.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-xs flex-shrink-0" style={{ background: PALETTE_COLORS[i % PALETTE_COLORS.length] }} />
                        <span className="truncate text-slate-600 font-normal">{s.name}</span>
                        <span className="font-medium text-slate-800 ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Main Content Area (Sidebar + Table) */}
        <div className="flex flex-col md:flex-row items-stretch gap-3.5 flex-1 min-h-0">
          {/* Responsive Filter View Sidebar (Horizontal on Mobile, Vertical on Desktop) */}
          <div className="w-full md:w-52 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-xs p-2.5 sm:p-3 flex md:flex-col overflow-x-auto md:overflow-y-auto gap-1">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 px-2 py-1 hidden md:block">
              {isAdmin ? 'Pipeline Filters' : 'My Workspace'}
            </div>
            {filterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left whitespace-nowrap flex-shrink-0 md:flex-shrink ${
                  filter === opt.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${filter === opt.key ? 'bg-white' : 'bg-slate-300'}`} />
                {opt.label}
              </button>
            ))}

            {/* Team Members List for Manager/Admin */}
            {isAdmin && callers.length > 0 && (
              <div className="md:mt-3 md:pt-2.5 md:border-t md:border-slate-100 flex md:flex-col gap-1 items-center md:items-stretch">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 px-2 py-1 hidden md:block">
                  Team Members
                </div>
                <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto md:max-h-44 gap-1 pr-1">
                  {callers.map(c => (
                    <button
                      key={c._id}
                      onClick={() => setFilter(c._id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all text-left whitespace-nowrap flex-shrink-0 md:flex-shrink ${
                        filter === c._id
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-4.5 h-4.5 rounded-full text-white flex items-center justify-center text-[9px] font-medium bg-orange-500 flex-shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Leads Table Container (White background with Slate border) */}
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            {/* Controls Bar: Search & Status / Source Filters */}
            <div className="flex items-center gap-2 p-2.5 sm:p-3 border-b border-slate-200 flex-shrink-0 flex-wrap bg-white">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads by name or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/70 text-slate-800 font-normal"
                />
              </div>

              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none cursor-pointer hover:border-slate-300"
              >
                {statuses.map(s => <option key={s}>{s}</option>)}
              </select>

              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 outline-none cursor-pointer hover:border-slate-300"
              >
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>

              <button
                onClick={fetchLeads}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                title="Refresh leads list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            {/* Table Container */}
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50/90 border-b border-slate-200 backdrop-blur-xs">
                  <tr>
                    <th className="px-3.5 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={selected.length === leads.length && leads.length > 0}
                        onChange={e => setSelected(e.target.checked ? leads.map(l => l._id) : [])}
                        className="rounded border-slate-300 accent-blue-600"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Lead Name</th>
                    <th className="px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Rating</th>
                    <th className="px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Assignee</th>
                    <th className="px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Created Date</th>
                    {(isAdmin || isCaller) && <th className="px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center">
                        <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
                        <div className="text-xs font-medium text-slate-500">Loading leads...</div>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center">
                        <div className="text-slate-300 mb-2">
                          <Users className="w-9 h-9 mx-auto" />
                        </div>
                        <div className="text-xs font-medium text-slate-500">No leads found in this view.</div>
                        <button onClick={() => navigate('/leads/new')} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
                          + Add a new lead
                        </button>
                      </td>
                    </tr>
                  ) : (
                    leads.map(lead => (
                      <tr
                        key={lead._id}
                        onClick={() => navigate(`/leads/${lead._id}`)}
                        className="transition-colors cursor-pointer group hover:bg-blue-50/20"
                      >
                        <td className="px-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.includes(lead._id)}
                            onChange={e => setSelected(prev =>
                              e.target.checked ? [...prev, lead._id] : prev.filter(id => id !== lead._id)
                            )}
                            className="rounded border-slate-300 accent-blue-600"
                          />
                        </td>

                        {/* Lead Name */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={e => toggleStar(lead, e)}
                              className={`transition-colors flex-shrink-0 ${lead.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
                            >
                              <Star className="w-3.5 h-3.5" fill={lead.isStarred ? 'currentColor' : 'none'} />
                            </button>
                            <div>
                              <div className="font-medium text-xs text-slate-800">{lead.name}</div>
                              <div className="text-[11px] font-normal text-slate-400">{lead.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-2.5">
                          <StatusBadge status={lead.status} />
                        </td>

                        {/* Rating Component */}
                        <td className="px-3.5 py-2.5">
                          <RatingStars lead={lead} onRate={handleRatingUpdate} />
                        </td>

                        {/* Assignee */}
                        <td className="px-3.5 py-2.5">
                          {lead.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4.5 h-4.5 rounded-full text-white flex items-center justify-center text-[9px] font-medium bg-orange-500 flex-shrink-0">
                                {lead.assignedTo.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span className="text-xs font-normal text-slate-700 truncate max-w-28">{lead.assignedTo.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-normal text-slate-400">—</span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="px-3.5 py-2.5 text-xs font-normal text-slate-500 whitespace-nowrap">
                          {lead.createdAt ? format(new Date(lead.createdAt), 'd MMM yyyy') : '—'}
                        </td>

                        {/* Actions */}
                        {(isAdmin || isCaller) && (
                          <td className="px-3.5 py-2.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isAdmin && (
                                <button
                                  onClick={e => handleBlock(lead, e)}
                                  className="p-1 rounded-md text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                  title="Block Lead"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete(user) && (
                                <button
                                  onClick={e => handleDelete(lead._id, e)}
                                  className="p-1 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-200 flex-shrink-0 flex-wrap gap-2 bg-white">
              <div className="flex items-center gap-3">
                <span className="text-xs font-normal text-slate-600">
                  {total > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} leads` : '0 leads'}
                </span>

                {/* Limit Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-normal">Limit:</span>
                  <select
                    value={limit}
                    onChange={e => setLimit(Number(e.target.value))}
                    className="text-xs font-medium border border-slate-200 rounded-md px-2 py-0.5 bg-white text-slate-700 outline-none cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const p = pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-6 h-6 rounded-md text-xs font-medium transition-all ${
                        p === page
                          ? 'bg-blue-600 text-white border border-blue-600'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
