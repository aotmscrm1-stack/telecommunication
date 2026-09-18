import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, usersAPI, blocklistAPI, leadStagesAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Search, Plus, RefreshCw, Download, Star, Trash2, Ban,
  BarChart2, ChevronLeft, ChevronRight, Users, CheckCircle
} from 'lucide-react';

// Brand Color Palette Tokens
const OXFORD_NAVY  = '#1d3557';
const CERULEAN     = '#457b9d';
const FROSTED_BLUE = '#a8dadc';
const HONEYDEW      = '#f1faee';
const PUNCH_RED     = '#e63946';

const PALETTE_COLORS = [OXFORD_NAVY, CERULEAN, '#6097b9', '#315a93', '#88b1cb', PUNCH_RED, '#3b82f6', '#10b981'];

const FALLBACK_STATUSES = ['All', 'Fresh', 'Connected', 'Call Not Responding', 'Call Back Later', 'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost', 'Blocked'];
const SOURCES = ['All', 'Manual', 'Facebook', 'WhatsApp', 'Website', 'Excel'];

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
              className={`w-4 h-4 transition-all duration-150 ${
                isFilled
                  ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function Leads() {
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
  const [limit, setLimit] = useState(50); // Extended default limit to 50 items
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [source, setSource] = useState('All');
  const [filter, setFilter] = useState(isAdmin ? 'all' : 'mine');
  const [selected, setSelected] = useState([]);
  const [callers, setCallers] = useState([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  const [statusStats, setStatusStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [statuses, setStatuses] = useState(FALLBACK_STATUSES);
  const [ratingToast, setRatingToast] = useState('');

  // Load callers for admin
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
    }).catch(() => {});
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
      // Optimistic update
      setLeads(prev => prev.map(l => l._id === lead._id ? { ...l, rating: newRating } : l));
      await leadsAPI.update(lead._id, { rating: newRating });
      setRatingToast(`Rating updated to ${newRating} star${newRating > 1 ? 's' : ''} for ${lead.name}`);
      setTimeout(() => setRatingToast(''), 2500);
    } catch (err) {
      console.error(err);
      fetchLeads(); // revert on failure
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
    } catch (e) { alert('Export failed'); }
  };

  const pages = Math.ceil(total / limit) || 1;

  return (
    <div className="leads-shell flex flex-col" style={{ height: 'calc(100vh - 64px)', padding: '20px' }}>
      <style>{`
        @media (max-width: 640px) {
          .leads-shell { height: auto !important; min-height: calc(100vh - 56px); padding: 12px !important; }
        }
      `}</style>

      {/* Floating Rating Toast Notification */}
      {ratingToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: OXFORD_NAVY, color: '#ffffff',
          borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 10px 25px rgba(29, 53, 87, 0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span style={{ color: '#f59e0b' }}>★</span> {ratingToast}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-4 flex-wrap gap-3 border-b border-[#a8dadc] mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: OXFORD_NAVY }}>All Leads</h1>
          <p className="text-xs font-semibold mt-0.5" style={{ color: CERULEAN }}>{total} total records in database</p>
        </div>

        {/* Top Header Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCharts(v => !v)}
            style={{
              background: showCharts ? OXFORD_NAVY : '#ffffff',
              color: showCharts ? '#ffffff' : CERULEAN,
              borderColor: FROSTED_BLUE,
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border shadow-sm transition-all hover:translate-y-[-1px]"
          >
            <BarChart2 className="w-4 h-4" />
            Charts & Analytics
          </button>
          
          <button
            onClick={handleExport}
            style={{ background: '#ffffff', color: OXFORD_NAVY, borderColor: FROSTED_BLUE }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border shadow-sm transition-all hover:bg-[#f1faee]"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddMenu(v => !v)}
              style={{ background: `linear-gradient(135deg, ${OXFORD_NAVY} 0%, ${CERULEAN} 100%)` }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all shadow-md hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              Add Lead
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {showAddMenu && (
              <div
                style={{
                  position: 'absolute', right: 0, top: '110%', background: '#ffffff',
                  border: `1px solid ${FROSTED_BLUE}`, borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(29, 53, 87, 0.15)', minWidth: 210, zIndex: 300, overflow: 'hidden'
                }}
                onMouseLeave={() => setShowAddMenu(false)}
              >
                <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: CERULEAN, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `1px solid ${HONEYDEW}` }}>Add Lead Options</div>
                {[
                  { label: 'Add Single Lead', to: '/leads/new', icon: '👤' },
                  { label: 'Add From Excel', to: '/bulk-import', icon: '📊' },
                  { label: 'Add From Integration', to: '/integrations', icon: '🔗' },
                ].map(item => (
                  <div
                    key={item.to}
                    onClick={() => { setShowAddMenu(false); navigate(item.to); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: OXFORD_NAVY }}
                    onMouseEnter={e => e.currentTarget.style.background = HONEYDEW}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <span>{item.icon}</span>{item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Panel */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0 pb-4">
          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: FROSTED_BLUE }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: OXFORD_NAVY }}>Lead Status Distribution</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: HONEYDEW, color: CERULEAN }}>Bar Visualization</span>
            </div>
            {statsLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-7 h-7 spinner-gradient" />
              </div>
            ) : statusStats.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-xs">No chart metrics available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusStats} margin={{ top: 5, right: 5, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf8f8" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: CERULEAN }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: CERULEAN }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: `1px solid ${FROSTED_BLUE}`, fontSize: 12, color: OXFORD_NAVY }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusStats.map((_, i) => <Cell key={i} fill={PALETTE_COLORS[i % PALETTE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: FROSTED_BLUE }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: OXFORD_NAVY }}>Pipeline Ratio Breakdown</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: HONEYDEW, color: CERULEAN }}>Pie Visualization</span>
            </div>
            {statsLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-7 h-7 spinner-gradient" />
              </div>
            ) : statusStats.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-xs">No chart metrics available</div>
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
                    <Tooltip contentStyle={{ borderRadius: '10px', border: `1px solid ${FROSTED_BLUE}`, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-3 max-h-24 overflow-y-auto">
                  {statusStats.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE_COLORS[i % PALETTE_COLORS.length] }} />
                      <span className="truncate text-slate-600">{s.name}</span>
                      <span className="font-bold ml-auto" style={{ color: OXFORD_NAVY }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col md:flex-row items-stretch gap-4 flex-1 min-h-0">
        
        {/* Filter View Card */}
        <div className="w-full md:w-56 flex-shrink-0 bg-white rounded-2xl border shadow-sm p-3.5 space-y-1 overflow-y-auto max-h-56 md:max-h-none" style={{ borderColor: FROSTED_BLUE }}>
          <div className="text-xs font-bold uppercase tracking-wide px-2 mb-2.5" style={{ color: CERULEAN }}>
            {isAdmin ? 'Admin View Filters' : 'My Workspace'}
          </div>
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                filter === opt.key
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:bg-[#f1faee]'
              }`}
              style={filter === opt.key ? { background: `linear-gradient(135deg, ${OXFORD_NAVY} 0%, ${CERULEAN} 100%)` } : undefined}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${filter === opt.key ? 'bg-white' : 'bg-slate-300'}`} />
              {opt.label}
            </button>
          ))}

          {/* Employees List */}
          {isAdmin && callers.length > 0 && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: FROSTED_BLUE }}>
              <div className="text-xs font-bold uppercase tracking-wide px-2 mb-2" style={{ color: CERULEAN }}>Team Members</div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {callers.map(c => (
                  <button
                    key={c._id}
                    onClick={() => setFilter(c._id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                      filter === c._id ? 'bg-[#edf8f8] text-[#1d3557] border border-[#a8dadc]' : 'text-slate-600 hover:bg-[#f1faee]'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[#a8dadc] text-[#1d3557] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Leads Table */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden" style={{ borderColor: FROSTED_BLUE }}>
          
          {/* Search & Select Controls Bar */}
          <div className="flex items-center gap-2.5 p-3 border-b flex-shrink-0 flex-wrap" style={{ borderColor: FROSTED_BLUE, background: '#ffffff' }}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by name or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 bg-[#f1faee]/60 text-slate-800 font-medium"
                style={{ borderColor: FROSTED_BLUE }}
              />
            </div>

            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-xs font-semibold border rounded-xl px-3 py-2 bg-[#f1faee]/60 text-slate-700 outline-none"
              style={{ borderColor: FROSTED_BLUE }}
            >
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>

            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="text-xs font-semibold border rounded-xl px-3 py-2 bg-[#f1faee]/60 text-slate-700 outline-none"
              style={{ borderColor: FROSTED_BLUE }}
            >
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>

            <button
              onClick={fetchLeads}
              className="p-2 rounded-xl border bg-white text-slate-600 hover:bg-[#f1faee] transition-colors"
              style={{ borderColor: FROSTED_BLUE }}
              title="Refresh table"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 border-b" style={{ background: HONEYDEW, borderColor: FROSTED_BLUE }}>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.length === leads.length && leads.length > 0}
                      onChange={e => setSelected(e.target.checked ? leads.map(l => l._id) : [])}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: OXFORD_NAVY }}>Lead Name</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: OXFORD_NAVY }}>Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: OXFORD_NAVY }}>Rating (Interactive)</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: OXFORD_NAVY }}>Assignee</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: OXFORD_NAVY }}>Created Date</th>
                  {(isAdmin || isCaller) && <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: OXFORD_NAVY }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center">
                      <div className="w-7 h-7 spinner-gradient mx-auto mb-2" />
                      <div className="text-xs font-semibold" style={{ color: CERULEAN }}>Loading records...</div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center">
                      <div className="text-slate-300 mb-2">
                        <Users className="w-10 h-10 mx-auto" />
                      </div>
                      <div className="text-xs font-semibold text-slate-400">No leads found.</div>
                      <button onClick={() => navigate('/leads/new')} className="mt-2 text-xs font-bold hover:underline" style={{ color: CERULEAN }}>
                        + Create a new lead
                      </button>
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr
                      key={lead._id}
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      className="border-b transition-colors cursor-pointer group hover:bg-[#f1faee]/50"
                      style={{ borderColor: '#edf8f8' }}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(lead._id)}
                          onChange={e => setSelected(prev =>
                            e.target.checked ? [...prev, lead._id] : prev.filter(id => id !== lead._id)
                          )}
                          className="rounded border-slate-300"
                        />
                      </td>

                      {/* Lead Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={e => toggleStar(lead, e)}
                            className={`transition-colors flex-shrink-0 ${lead.isStarred ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}
                          >
                            <Star className="w-4 h-4" fill={lead.isStarred ? 'currentColor' : 'none'} />
                          </button>
                          <div>
                            <div className="font-bold text-xs" style={{ color: OXFORD_NAVY }}>{lead.name}</div>
                            <div className="text-[11px] font-semibold" style={{ color: CERULEAN }}>{lead.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>

                      {/* Interactive Rating Component with Hover voting effect */}
                      <td className="px-4 py-3">
                        <RatingStars lead={lead} onRate={handleRatingUpdate} />
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-3">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#a8dadc] text-[#1d3557] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {lead.assignedTo.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-28">{lead.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-300">Unassigned</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3 text-xs font-medium text-slate-500">
                        {lead.createdAt ? format(new Date(lead.createdAt), 'd MMM yyyy') : '—'}
                      </td>

                      {/* Actions */}
                      {(isAdmin || isCaller) && (
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isAdmin && (
                              <button
                                onClick={e => handleBlock(lead, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                title="Block Lead"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={e => handleDelete(lead._id, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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

          {/* Footer Controls & Limit Extension (1 to 50) */}
          <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0 flex-wrap gap-2" style={{ borderColor: FROSTED_BLUE, background: '#ffffff' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold" style={{ color: CERULEAN }}>
                {total > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} leads` : '0 leads'}
              </span>

              {/* Items Per Page Limit Selector (Extended to 50 as requested) */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Limit:</span>
                <select
                  value={limit}
                  onChange={e => setLimit(Number(e.target.value))}
                  className="text-xs font-bold border rounded-lg px-2 py-1 bg-[#f1faee] text-slate-700 outline-none"
                  style={{ borderColor: FROSTED_BLUE }}
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
                className="p-1.5 rounded-lg border text-slate-500 hover:bg-[#f1faee] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: FROSTED_BLUE }}
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
                      background: p === page ? OXFORD_NAVY : '#ffffff',
                      color: p === page ? '#ffffff' : CERULEAN,
                      border: `1px solid ${FROSTED_BLUE}`
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-1.5 rounded-lg border text-slate-500 hover:bg-[#f1faee] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: FROSTED_BLUE }}
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