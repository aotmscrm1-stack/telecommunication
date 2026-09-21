import { useState, useEffect, useCallback } from 'react';
import {
  FiDownload, FiPhone, FiClock, FiTrendingUp, FiBarChart2,
  FiRefreshCw, FiUsers, FiCheckCircle, FiXCircle, FiCalendar,
  FiFilter, FiLayers, FiFileText, FiAward, FiUploadCloud, FiCheck
} from 'react-icons/fi';
import { RiFolderChartLine, RiFileExcel2Line } from 'react-icons/ri';
import { reportsAPI, followupsAPI, leadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart
} from 'recharts';

// ── Sunset Warm Marketing Palette ─────────────────────────────────────────────
const O = {
  primary:    '#ff8c42',
  primary3:   '#ffb877',
  deep:       '#e84a10',
  darkest:    '#c23a05',

  bg:         '#fff8f2',
  bgSoft:     '#fff0e8',
  bgSofter:   '#fff5ed',

  line:       '#ffe0cb',
  lineSoft:   '#ffe4d5',

  ink:        '#1f1206',
  inkSoft:    '#6b5546',
  muted:      '#8f7667',

  success:    '#10b981',
  successBg:  '#ecfdf5',
  successLine:'#a7f3d0',

  warning:    '#f59e0b',
  warningBg:  '#fffbeb',
  warningLine:'#fde68a',

  error:      '#ef4444',
  errorBg:    '#fef2f2',
  errorLine:  '#fecaca',

  white:      '#ffffff',
};

const CHART_PALETTE = [
  '#ff8c42', '#e84a10', '#10b981', '#3b82f6', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
];

const STATUS_COLORS = {
  'Fresh':               '#3b82f6',
  'Connected':           '#10b981',
  'Call Not Responding': '#e84a10',
  'Call Back Later':     '#f59e0b',
  'Not interested':      '#ef4444',
  'Demo Scheduled':      '#8b5cf6',
  'Demo Done':           '#14b8a6',
  'Won':                 '#16a34a',
  'Lost':                '#dc2626',
  'Blocked':             '#374151',
};

const CHART_TABS = ['Status', 'Lead source', 'Assignee', 'Rating', 'Call status', 'Number of calls placed', 'Created on'];
const REPORT_TABS = ['All', 'Tasks', 'Call Summarization', 'Bulk upload tasks', 'Leaderboard'];

function fmtDuration(sec) {
  if (!sec) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Metric Stat Card ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, theme = 'orange' }) {
  const themes = {
    orange: { bg: '#fff0e8', text: O.deep, border: '#ffd8be' },
    green:  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    blue:   { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    purple: { bg: '#fdf4ff', text: '#9333ea', border: '#f5d0fe' },
  };
  const t = themes[theme] || themes.orange;

  return (
    <div
      className="p-4 rounded-2xl border bg-white shadow-sm transition-transform hover:-translate-y-0.5"
      style={{ borderColor: O.line }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.text }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">
          {sub}
        </span>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-black" style={{ color: O.ink }}>
          {value}
        </div>
        <div className="text-xs font-semibold text-stone-500 mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard Tab Component ─────────────────────────────────────────────────
function LeaderboardTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    setLoading(true);
    reportsAPI.leaderboard({ period })
      .then(res => {
        const raw = res.data?.leaderboard || [];
        setData(raw.map(item => ({
          _id: item.user?._id || item._id,
          name: item.user?.name || item.name || 'Unknown',
          calls: item.totalCalls || 0,
          duration: item.totalDuration || 0,
          connected: item.connectedCalls || 0,
          sales: item.sales || 0,
        })));
      })
      .catch(err => { console.error(err); setData([]); })
      .finally(() => setLoading(false));
  }, [period]);

  const fmtD = (s) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const chartData = data.map(d => ({ name: d.name.split(' ')[0], calls: d.calls, sales: d.sales }));

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {['day', 'week', 'month', 'year'].map(p => {
          const active = period === p;
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-1.5 text-xs font-bold rounded-xl transition-all uppercase"
              style={{
                background: active ? `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` : '#ffffff',
                color: active ? '#ffffff' : O.inkSoft,
                border: `1px solid ${active ? O.deep : O.line}`,
                boxShadow: active ? '0 2px 8px rgba(232, 74, 16, 0.25)' : 'none',
              }}
            >
              {p}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <FiRefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-14 text-stone-400 text-xs font-medium bg-white rounded-2xl border" style={{ borderColor: O.line }}>
          No calls recorded for this timeframe.
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: O.line }}>
            <h3 className="font-bold text-sm mb-4" style={{ color: O.ink }}>Calls by Telecaller</h3>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fef3eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: O.muted }} />
                <YAxis tick={{ fontSize: 11, fill: O.muted }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="calls" name="Total Calls" fill={O.primary} radius={[6, 6, 0, 0]} />
                <Bar dataKey="sales" name="Sales Won" fill={O.success} radius={[6, 6, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rankings Table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: O.line }}>
            <div className="px-5 py-3.5 border-b" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
              <h3 className="font-bold text-sm" style={{ color: O.ink }}>Caller Performance Rankings</h3>
            </div>
            <div className="divide-y" style={{ borderColor: O.lineSoft }}>
              {data.map((c, i) => (
                <div key={c._id || i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-orange-50/50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#ffedd5' : O.bgSoft,
                      color: i === 0 ? '#b45309' : i === 1 ? '#475569' : i === 2 ? '#c2410c' : O.deep,
                      border: `1px solid ${O.line}`
                    }}
                  >
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs" style={{ color: O.ink }}>{c.name}</div>
                    <div className="text-[11px] text-stone-400">{c.calls} calls · {fmtD(c.duration)} talk time</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black" style={{ color: O.deep }}>{c.calls}</div>
                    <div className="text-[10px] text-stone-400">Calls</div>
                  </div>
                  {c.sales > 0 && (
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-600">{c.sales}</div>
                      <div className="text-[10px] text-stone-400">Won</div>
                    </div>
                  )}
                  <div className="w-24 hidden md:block">
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${O.primary} 0%, ${O.deep} 100%)`,
                          width: `${Math.min(100, (c.calls / (data[0]?.calls || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Lead View Charts Section ──────────────────────────────────────────────────
function LeadViewCharts({ summary }) {
  const [chartTab, setChartTab] = useState('Status');
  const [chartType, setChartType] = useState('Bar');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [total, setTotal] = useState(0);
  const [assigneeId, setAssigneeId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    reportsAPI.leadViewFilters().then(res => {
      setAssignees(res.data.assignees || []);
      setSources(res.data.sources || []);
    }).catch(console.error);
  }, []);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { tab: chartTab };
      if (assigneeId) params.assigneeId = assigneeId;
      if (statusFilter) params.status = statusFilter;
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const res = await reportsAPI.leadView(params);
      setChartData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [chartTab, assigneeId, statusFilter, dateRange.start, dateRange.end]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  const handleExportChart = () => {
    if (!chartData.length) return;
    const csv = ['Label,Count', ...chartData.map(d => `"${d.name}",${d.value}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-chart-${chartTab.toLowerCase().replace(/ /g, '-')}.csv`;
    a.click();
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm" style={{ borderColor: O.line }}>
      {/* Header Row */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-2" style={{ borderColor: O.lineSoft }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: O.bgSoft, color: O.deep }}>
            <FiLayers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: O.ink }}>Lead Distribution Analytics</h3>
            <span className="text-[11px] text-stone-400">{total.toLocaleString()} leads mapped</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChart}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-xl hover:bg-orange-50 transition-colors"
            style={{ borderColor: O.line, color: O.deep }}
          >
            <FiDownload className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-4 overflow-x-auto flex gap-1" style={{ borderColor: O.lineSoft }}>
        {CHART_TABS.map(tab => {
          const active = chartTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setChartTab(tab)}
              className="px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all"
              style={{
                borderColor: active ? O.deep : 'transparent',
                color: active ? O.deep : O.muted,
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-3 px-5 py-3 border-b flex-wrap text-xs" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-500">Assignee:</span>
          <select
            value={assigneeId}
            onChange={e => setAssigneeId(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 bg-white text-stone-700 font-medium focus:outline-none"
            style={{ borderColor: O.line }}
          >
            <option value="">All Callers</option>
            {assignees.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-500">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 bg-white text-stone-700 font-medium focus:outline-none"
            style={{ borderColor: O.line }}
          >
            <option value="">All Stages</option>
            {['Fresh', 'Connected', 'Call Not Responding', 'Call Back Later', 'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost', 'Blocked'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FiCalendar className="w-3.5 h-3.5 text-stone-400" />
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
            className="border rounded-lg px-2 py-1 bg-white text-stone-700 focus:outline-none text-xs"
            style={{ borderColor: O.line }}
          />
          <span className="text-stone-400">–</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
            className="border rounded-lg px-2 py-1 bg-white text-stone-700 focus:outline-none text-xs"
            style={{ borderColor: O.line }}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={chartType}
            onChange={e => setChartType(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 bg-white text-stone-700 font-bold focus:outline-none"
            style={{ borderColor: O.line }}
          >
            <option>Bar</option>
            <option>Pie</option>
            <option>Area</option>
          </select>
          <button
            onClick={fetchChartData}
            className="p-2 rounded-lg border bg-white hover:bg-orange-50 transition-colors"
            style={{ borderColor: O.line, color: O.deep }}
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Render Chart */}
      <div className="p-5">
        {loading ? (
          <div className="flex justify-center items-center h-56">
            <FiRefreshCw className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-56 text-stone-400 text-xs font-medium">
            No chart data available for current selection.
          </div>
        ) : (
          <>
            {chartType === 'Bar' && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fef3eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: O.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: O.muted }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12 }} />
                  <Bar dataKey="value" name="Leads" fill={O.primary} radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartType === 'Pie' && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <ResponsiveContainer width={240} height={200}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={2} dataKey="value">
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {chartData.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.name] || CHART_PALETTE[i % CHART_PALETTE.length] }} />
                      <span className="text-stone-600 truncate max-w-[110px]">{s.name}</span>
                      <span className="font-bold ml-auto" style={{ color: O.ink }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {chartType === 'Area' && (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <defs>
                    <linearGradient id="sunsetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={O.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={O.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fef3eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: O.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: O.muted }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke={O.deep} strokeWidth={2.5} fillOpacity={1} fill="url(#sunsetGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN REPORTS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab, setActiveTab] = useState('All');
  const [summary, setSummary] = useState(null);
  const [statusChartData, setStatusChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-tabs data
  const [tasksData, setTasksData] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [callsList, setCallsList] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [uploadsList, setUploadsList] = useState(() => JSON.parse(localStorage.getItem('aotms_bulk_uploads') || '[]'));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, stRes] = await Promise.all([
        reportsAPI.summary(),
        reportsAPI.leadStatus(),
      ]);
      setSummary(sumRes.data);
      const statuses = stRes.data?.breakdown || [];
      setStatusChartData(statuses.map(s => ({ name: s._id || 'Unknown', value: s.count })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (activeTab === 'Tasks') {
      setTasksLoading(true);
      followupsAPI.getAll({ limit: 50 })
        .then(res => setTasksData(res.data.followups || []))
        .catch(console.error)
        .finally(() => setTasksLoading(false));
    }
    if (activeTab === 'Call Summarization') {
      setCallsLoading(true);
      reportsAPI.callsList()
        .then(res => setCallsList(res.data?.calls || []))
        .catch(console.error)
        .finally(() => setCallsLoading(false));
    }
  }, [activeTab]);

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await followupsAPI.delete(id);
      setTasksData(prev => prev.filter(t => t._id !== id));
    } catch (e) { alert('Failed to delete task'); }
  };

  const handleExportLeads = async () => {
    try {
      const res = await leadsAPI.exportCSV({});
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${Date.now()}.csv`;
      a.click();
    } catch (e) { alert('Export failed'); }
  };

  const handleExportLeaderboard = async () => {
    try {
      const res = await reportsAPI.leaderboard({ period: 'all' });
      const lb = res.data?.leaderboard || [];
      const csv = ['Rank,Name,Total Calls,Total Duration (min),Sales Won',
        ...lb.map((r, i) => `${i + 1},"${r.user?.name || ''}",${r.totalCalls || 0},${Math.floor((r.totalDuration || 0) / 60)},${r.sales || 0}`)
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leaderboard.csv';
      a.click();
    } catch (e) { alert('Export failed'); }
  };

  const today = summary?.today || {};
  const week = summary?.week || {};

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: O.deep }}>
            <RiFolderChartLine className="w-4 h-4" /> CRM Intelligence & Metrics
          </div>
          <h1 className="text-2xl md:text-3xl font-black mt-0.5" style={{ color: O.ink }}>
            Reports & Analytics
          </h1>
          <p className="text-xs md:text-sm text-stone-500 mt-0.5">
            Monitor real-time pipeline velocity, calling outreach, and caller leaderboards.
          </p>
        </div>

        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold hover:bg-orange-50 transition-colors shadow-sm self-start sm:self-auto"
          style={{ borderColor: O.line, color: O.deep, background: '#ffffff' }}
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* ── Report Tabs ── */}
      <div className="flex gap-1.5 border-b pb-1 overflow-x-auto" style={{ borderColor: O.line }}>
        {REPORT_TABS.map(tab => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
              style={{
                background: active ? `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` : '#ffffff',
                color: active ? '#ffffff' : O.inkSoft,
                border: `1px solid ${active ? O.deep : O.line}`,
                boxShadow: active ? '0 2px 8px rgba(232, 74, 16, 0.25)' : 'none',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── All Tab Content ── */}
      {activeTab === 'All' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={FiPhone} label="Calls Placed Today" value={today.count || 0} sub={fmtDuration(today.duration)} theme="orange" />
            <StatCard icon={FiCheckCircle} label="Connected Today" value={today.connected || 0} sub="Answered calls" theme="green" />
            <StatCard icon={FiClock} label="Talk Time Today" value={fmtDuration(today.duration)} sub="Total duration" theme="purple" />
            <StatCard icon={FiTrendingUp} label="Calls This Week" value={week.count || 0} sub={fmtDuration(week.duration)} theme="blue" />
          </div>

          {/* Lead View Charts */}
          <LeadViewCharts summary={summary} />

          {/* Status Distribution Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: O.line }}>
              <h3 className="font-bold text-sm mb-4" style={{ color: O.ink }}>Stage Distribution</h3>
              {statusChartData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-stone-300 text-xs font-medium">No leads data</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={statusChartData} margin={{ top: 5, right: 5, left: -20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fef3eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: O.muted }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: O.muted }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12 }} />
                    <Bar dataKey="value" name="Leads" radius={[5, 5, 0, 0]}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: O.line }}>
              <h3 className="font-bold text-sm mb-4" style={{ color: O.ink }}>Pipeline Breakdown</h3>
              {statusChartData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-stone-300 text-xs font-medium">No leads data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2} dataKey="value">
                        {statusChartData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${O.line}`, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {statusChartData.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.name] || CHART_PALETTE[i % CHART_PALETTE.length] }} />
                        <span className="text-stone-500 truncate">{s.name}</span>
                        <span className="font-bold ml-auto" style={{ color: O.ink }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Export Reports */}
          <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: O.line }}>
            <h3 className="font-bold text-sm mb-3" style={{ color: O.ink }}>Export Raw Datasets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'Full Leads Database', onClick: handleExportLeads, icon: FiUsers },
                { name: 'Call Summary Log', onClick: () => setActiveTab('Call Summarization'), icon: FiPhone },
                { name: 'Campaign Report', onClick: () => alert('Use Marketing Campaigns tab for detailed metrics.'), icon: FiTrendingUp },
                { name: 'Leaderboard CSV', onClick: handleExportLeaderboard, icon: FiBarChart2 }
              ].map(r => (
                <button
                  key={r.name}
                  onClick={r.onClick}
                  className="flex items-center gap-2.5 p-3 rounded-xl border hover:bg-orange-50 transition-colors text-left"
                  style={{ borderColor: O.line }}
                >
                  <r.icon className="w-4 h-4 flex-shrink-0" style={{ color: O.deep }} />
                  <span className="text-xs font-bold" style={{ color: O.ink }}>{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks Tab ── */}
      {activeTab === 'Tasks' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: O.line }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
            <h3 className="font-bold text-sm" style={{ color: O.ink }}>Follow-up Tasks Queue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr style={{ background: O.bgSofter, borderBottom: `1px solid ${O.line}` }}>
                  {['Task Note', 'Target Lead', 'Assigned To', 'Status', 'Due Date', 'Priority', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: O.inkSoft }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: O.lineSoft }}>
                {tasksLoading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-stone-400">Loading tasks...</td></tr>
                ) : tasksData.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-stone-400">No scheduled tasks found.</td></tr>
                ) : (
                  tasksData.map((task, i) => (
                    <tr key={task._id || i} className="hover:bg-orange-50/40">
                      <td className="px-4 py-3 font-bold" style={{ color: O.ink }}>{task.note || task.title || '—'}</td>
                      <td className="px-4 py-3 text-stone-600">{task.lead?.name || '—'}</td>
                      <td className="px-4 py-3 text-stone-600">{task.assignedTo?.name || 'Me'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            background: task.status === 'done' ? '#ecfdf5' : '#fffbeb',
                            color: task.status === 'done' ? '#059669' : '#d97706',
                          }}
                        >
                          {task.status || 'upcoming'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-mono">
                        {task.scheduledAt ? new Date(task.scheduledAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 capitalize text-stone-600">{task.priority || 'medium'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteTask(task._id)} className="text-red-500 hover:text-red-700 p-1">
                          <FiXCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Call Summarization Tab ── */}
      {activeTab === 'Call Summarization' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: O.line }}>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
            <h3 className="font-bold text-sm" style={{ color: O.ink }}>Call Log & Audio Intelligence</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr style={{ background: O.bgSofter, borderBottom: `1px solid ${O.line}` }}>
                  {['Lead Contact', 'Call Timestamp', 'Duration', 'Call Outcome', 'AI Conversation Summary'].map(h => (
                    <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: O.inkSoft }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: O.lineSoft }}>
                {callsLoading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-stone-400">Loading call history...</td></tr>
                ) : callsList.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-stone-400">No calls recorded yet.</td></tr>
                ) : (
                  callsList.map((call, i) => (
                    <tr key={i} className="hover:bg-orange-50/40">
                      <td className="px-4 py-3">
                        <div className="font-bold" style={{ color: O.ink }}>{call.leadName}</div>
                        <div className="text-[11px] font-mono text-stone-400">{call.leadPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                        {call.date ? new Date(call.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-700">{fmtDuration(call.duration)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            background: call.status === 'connected' ? '#ecfdf5' : '#fef2f2',
                            color: call.status === 'connected' ? '#059669' : '#dc2626'
                          }}
                        >
                          {call.status || 'no answer'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 max-w-sm truncate" title={call.summary}>
                        {call.summary || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Tasks Tab ── */}
      {activeTab === 'Bulk upload tasks' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: O.line }}>
          <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-2" style={{ borderColor: O.lineSoft }}>
            <div>
              <h3 className="font-bold text-sm" style={{ color: O.ink }}>Bulk Upload Task History</h3>
              <p className="text-xs text-stone-400">Ingest tasks from spreadsheet documents</p>
            </div>
            <label
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer hover:brightness-105 transition-all shadow-sm"
              style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
            >
              <FiUploadCloud className="w-4 h-4" />
              Upload Excel / CSV
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await followupsAPI.import(formData);
                    const newUpload = {
                      fileName: file.name,
                      uploadedAt: new Date().toISOString(),
                      tasksCreated: `${res.data.count} / ${res.data.total}`,
                      status: 'Completed'
                    };
                    const existing = JSON.parse(localStorage.getItem('aotms_bulk_uploads') || '[]');
                    const updated = [newUpload, ...existing];
                    localStorage.setItem('aotms_bulk_uploads', JSON.stringify(updated));
                    setUploadsList(updated);
                    alert(`✅ Bulk upload complete: ${res.data.count} of ${res.data.total} tasks created.`);
                  } catch (err) {
                    const newUpload = {
                      fileName: file.name,
                      uploadedAt: new Date().toISOString(),
                      tasksCreated: '0',
                      status: 'Failed'
                    };
                    const existing = JSON.parse(localStorage.getItem('aotms_bulk_uploads') || '[]');
                    const updated = [newUpload, ...existing];
                    localStorage.setItem('aotms_bulk_uploads', JSON.stringify(updated));
                    setUploadsList(updated);
                    alert('Failed: ' + (err.response?.data?.message || err.message));
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr style={{ background: O.bgSofter, borderBottom: `1px solid ${O.line}` }}>
                  {['Spreadsheet Name', 'Upload Timestamp', 'Tasks Created', 'Execution Status'].map(h => (
                    <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider" style={{ color: O.inkSoft }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: O.lineSoft }}>
                {uploadsList.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-stone-400">No bulk upload tasks recorded.</td></tr>
                ) : (
                  uploadsList.map((up, i) => (
                    <tr key={i} className="hover:bg-orange-50/40">
                      <td className="px-4 py-3 font-bold" style={{ color: O.ink }}>{up.fileName}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {up.uploadedAt ? new Date(up.uploadedAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-mono">{up.tasksCreated}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1"
                          style={{
                            background: up.status === 'Completed' ? '#ecfdf5' : '#fef2f2',
                            color: up.status === 'Completed' ? '#059669' : '#dc2626'
                          }}
                        >
                          {up.status === 'Completed' ? <FiCheck className="w-3 h-3" /> : null}
                          {up.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Leaderboard Tab ── */}
      {activeTab === 'Leaderboard' && <LeaderboardTab />}
    </div>
  );
}