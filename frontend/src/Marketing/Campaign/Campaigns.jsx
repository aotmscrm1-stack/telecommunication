import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { campaignsAPI, usersAPI, leadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FiPlus, FiRefreshCw, FiSearch, FiLayers, FiUsers, FiCalendar,
  FiFlag, FiBarChart2, FiTrash2, FiArrowRight, FiX, FiCheck,
  FiCheckCircle, FiAlertTriangle, FiClock, FiChevronDown,
  FiShuffle, FiTarget, FiActivity, FiEye, FiArrowUpRight, FiFilter
} from 'react-icons/fi';
import { RiMegaphoneLine, RiFolderChartLine } from 'react-icons/ri';

// ── Sunset Warm Marketing Palette (Harmonized with AllLeads & AddLead) ────────
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

// ── UI Helper Components ──────────────────────────────────────────────────────
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

// Circular progress indicator with warm gradient
function ProgressCircle({ value = 0 }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;

  const color = pct === 100 ? O.success : pct >= 70 ? O.deep : pct >= 40 ? O.primary : '#fb7185';
  const trackColor = pct === 100 ? O.successBg : O.bgSoft;

  return (
    <div className="flex items-center gap-2">
      <svg width="42" height="42" viewBox="0 0 42 42" className="flex-shrink-0">
        <circle cx="21" cy="21" r={r} fill="none" stroke={trackColor} strokeWidth="3.5" />
        <circle
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 21 21)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="21" y="25" textAnchor="middle" fontSize="9" fill={color} fontWeight="800">
          {pct}%
        </text>
      </svg>
    </div>
  );
}

// Stacked Assignee Avatars
function AssigneeAvatars({ callers }) {
  const avatarColors = [
    { bg: '#fff0e8', text: O.deep, border: '#ffd8be' },
    { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    { bg: '#fdf4ff', text: '#c026d3', border: '#f5d0fe' },
  ];

  if (!callers || callers.length === 0) {
    return <span className="text-xs text-stone-400 font-medium">—</span>;
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
            title={c.name}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: theme.bg,
              color: theme.text,
              border: `2px solid #ffffff`,
              outline: `1px solid ${theme.border}`,
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: i === 0 ? 0 : -8,
              zIndex: shown.length - i,
              boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
            }}
          >
            {c.name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
        );
      })}
      {extra > 0 && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: O.deep,
            background: O.bgSoft,
            borderRadius: 20,
            padding: '2px 7px',
            marginLeft: 6,
            border: `1px solid ${O.line}`
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

// Filter Dropdown Component
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
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shadow-sm"
        style={{
          background: active ? O.bgSoft : '#ffffff',
          borderColor: active ? O.deep : O.line,
          color: active ? O.deep : O.inkSoft,
        }}
      >
        {icon && <span className="opacity-80">{icon}</span>}
        <span>{active ? value : label}</span>
        {active ? (
          <span
            onClick={e => { e.stopPropagation(); onChange(''); }}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-orange-200/50 text-xs font-bold ml-0.5"
            style={{ color: O.deep }}
          >
            ×
          </span>
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 text-stone-400" />
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 z-40 bg-white border rounded-xl shadow-xl p-1.5 min-w-[200px]"
          style={{ borderColor: O.line, boxShadow: '0 12px 32px rgba(232, 74, 16, 0.12)' }}
        >
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            className="px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            style={{
              color: !value ? O.deep : O.inkSoft,
              background: !value ? O.bgSoft : 'transparent',
            }}
          >
            All / Reset
          </div>
          {options.map(opt => {
            const optVal = opt.value || opt;
            const optLabel = opt.label || opt;
            const isSelected = value === optVal;
            return (
              <div
                key={optVal}
                onClick={() => { onChange(optVal); setOpen(false); }}
                className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between"
                style={{
                  color: isSelected ? O.deep : O.ink,
                  background: isSelected ? O.bgSoft : 'transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  {opt.dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.dot }} />}
                  <span>{optLabel}</span>
                </div>
                {isSelected && <FiCheck className="w-3.5 h-3.5" style={{ color: O.deep }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CAMPAIGN MODAL (THEMED)
// ─────────────────────────────────────────────────────────────────────────────
function CreateCampaignModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await campaignsAPI.create({
        name: form.name.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border"
        style={{ borderColor: O.line }}
      >
        {/* Top Accent Gradient Bar */}
        <div
          style={{
            height: 5,
            background: `linear-gradient(90deg, ${O.primary} 0%, ${O.deep} 50%, ${O.darkest} 100%)`
          }}
        />

        <div className="p-6 md:p-7">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: O.lineSoft }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: O.bgSoft, border: `1px solid ${O.line}` }}
              >
                <RiMegaphoneLine className="w-5 h-5" style={{ color: O.deep }} />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: O.ink }}>
                  Create New Campaign
                </h3>
                <p className="text-xs text-stone-500">Launch a target outreach audience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-orange-50 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="e.g. Q4 Masterclass Outreach"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-stone-50/70 focus:bg-white focus:outline-none transition-all"
                style={{ borderColor: O.line }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Campaign Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'high', label: 'High', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                  { key: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                  { key: 'low', label: 'Low', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p.key }))}
                    className="py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: form.priority === p.key ? p.bg : '#ffffff',
                      borderColor: form.priority === p.key ? p.color : O.line,
                      color: form.priority === p.key ? p.color : O.inkSoft,
                      boxShadow: form.priority === p.key ? `0 2px 8px ${p.border}` : 'none'
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Description / Strategic Goal
              </label>
              <textarea
                placeholder="Briefly describe this campaign's target leads and purpose..."
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-stone-50/70 focus:bg-white focus:outline-none transition-all resize-none"
                style={{ borderColor: O.line }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: O.lineSoft }}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                style={{ borderColor: O.line }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)`,
                  boxShadow: '0 4px 16px rgba(232, 74, 16, 0.3)'
                }}
              >
                {saving ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlus className="w-4 h-4" />}
                {saving ? 'Creating Campaign...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFER LEADS MODAL (THEMED)
// ─────────────────────────────────────────────────────────────────────────────
function TransferLeadsModal({ onClose }) {
  const [callers, setCallers] = useState([]);
  const [fromCaller, setFromCaller] = useState('');
  const [toCaller, setToCaller] = useState('');
  const [fromLeads, setFromLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [loadingCallers, setLoadingCallers] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [transferMode, setTransferMode] = useState('all');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    usersAPI.getAll().then(res => {
      setCallers((res.data.users || []).filter(u => (u.role === 'employee' || u.role === 'caller') && u.isActive));
    }).catch(() => { }).finally(() => setLoadingCallers(false));
  }, []);

  useEffect(() => {
    if (!fromCaller) { setFromLeads([]); setSelectedLeads([]); return; }
    setLoadingLeads(true);
    setSelectedLeads([]);
    leadsAPI.getByCallerAll(fromCaller)
      .then(res => setFromLeads(res.data.leads || []))
      .catch(() => setFromLeads([]))
      .finally(() => setLoadingLeads(false));
  }, [fromCaller]);

  const toggleLead = (id) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedLeads.length === fromLeads.length) setSelectedLeads([]);
    else setSelectedLeads(fromLeads.map(l => l._id));
  };

  const handleTransfer = async () => {
    if (!fromCaller || !toCaller) return alert('Select both callers');
    if (fromCaller === toCaller) return alert('Source and destination callers cannot be the same');
    const leadsToTransfer = transferMode === 'select' ? selectedLeads : [];
    if (transferMode === 'select' && leadsToTransfer.length === 0) return alert('Select at least one lead');
    setSaving(true);
    try {
      const payload = { fromCallerId: fromCaller, toCallerId: toCaller };
      if (transferMode === 'select') payload.leadIds = leadsToTransfer;
      const res = await leadsAPI.transferLeads(payload);
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border max-h-[90vh] flex flex-col"
        style={{ borderColor: O.line }}
      >
        <div style={{ height: 5, background: `linear-gradient(90deg, ${O.primary} 0%, ${O.deep} 100%)` }} />

        <div className="p-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: O.lineSoft }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: O.bgSoft, border: `1px solid ${O.line}` }}
            >
              <FiShuffle className="w-5 h-5" style={{ color: O.deep }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: O.ink }}>
                Transfer Leads Between Callers
              </h3>
              <p className="text-xs text-stone-500">Reassign calling queues in bulk</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {result ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <FiCheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-emerald-700">Transfer Completed!</h4>
                <p className="text-xs text-stone-600 mt-1">
                  <strong style={{ color: O.deep }}>{result.modifiedCount}</strong> lead(s) transferred from{' '}
                  <strong style={{ color: O.ink }}>{result.fromCaller}</strong> →{' '}
                  <strong style={{ color: O.ink }}>{result.toCaller}</strong>
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Source Caller (From)
                  </label>
                  <select
                    value={fromCaller}
                    onChange={e => setFromCaller(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs bg-stone-50 focus:bg-white"
                    style={{ borderColor: O.line }}
                  >
                    <option value="">Select source caller...</option>
                    {callers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Target Caller (To)
                  </label>
                  <select
                    value={toCaller}
                    onChange={e => setToCaller(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs bg-stone-50 focus:bg-white"
                    style={{ borderColor: O.line }}
                  >
                    <option value="">Select destination caller...</option>
                    {callers.filter(c => c._id !== fromCaller).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {fromCaller && (
                <div className="p-3 rounded-xl border bg-orange-50/50 flex items-center justify-between" style={{ borderColor: O.line }}>
                  <span className="text-xs font-bold" style={{ color: O.deep }}>
                    {loadingLeads ? 'Loading assigned leads...' : `${fromLeads.length} leads assigned to selected caller`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferMode('all')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border"
                      style={{
                        background: transferMode === 'all' ? O.deep : '#ffffff',
                        color: transferMode === 'all' ? '#ffffff' : O.inkSoft,
                        borderColor: transferMode === 'all' ? O.deep : O.line
                      }}
                    >
                      All Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferMode('select')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border"
                      style={{
                        background: transferMode === 'select' ? O.deep : '#ffffff',
                        color: transferMode === 'select' ? '#ffffff' : O.inkSoft,
                        borderColor: transferMode === 'select' ? O.deep : O.line
                      }}
                    >
                      Select Specific
                    </button>
                  </div>
                </div>
              )}

              {transferMode === 'select' && fromLeads.length > 0 && (
                <div className="space-y-2 border rounded-xl p-3 max-h-48 overflow-y-auto" style={{ borderColor: O.lineSoft }}>
                  <div className="flex justify-between items-center pb-2 border-b text-[11px] font-bold text-stone-500">
                    <span>{selectedLeads.length} selected</span>
                    <button type="button" onClick={toggleAll} className="underline hover:text-stone-800">
                      {selectedLeads.length === fromLeads.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {fromLeads.map(lead => (
                    <div
                      key={lead._id}
                      onClick={() => toggleLead(lead._id)}
                      className="p-2 rounded-lg flex items-center gap-2.5 cursor-pointer text-xs transition-colors"
                      style={{ background: selectedLeads.includes(lead._id) ? O.bgSoft : '#ffffff' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => {}}
                        className="rounded"
                      />
                      <div className="flex-1 truncate">
                        <span className="font-bold" style={{ color: O.ink }}>{lead.name}</span>
                        <span className="text-stone-400 text-[11px] ml-2">{lead.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: O.lineSoft }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-50"
                  style={{ borderColor: O.line }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={saving || !fromCaller || !toCaller || (transferMode === 'select' && selectedLeads.length === 0)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
                >
                  {saving ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CAMPAIGNS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Campaigns() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');

  // Transfer Leads modal state
  const [showTransfer, setShowTransfer] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignsAPI.getAll();
      const raw = res.data.campaigns || [];
      const withProgress = raw.map(c => {
        const breakdown = c.statusBreakdown || [];
        let total = 0, called = 0, won = 0;
        breakdown.forEach(s => {
          total += s.count;
          if (s._id !== 'Fresh') called += s.count;
          if (s._id === 'Won') won += s.count;
        });
        const totalLeads = total || c.totalLeads || 0;
        const progress = totalLeads > 0 ? Math.round((called / totalLeads) * 100) : 0;
        return { ...c, totalLeads, called, won, progress };
      });
      setCampaigns(withProgress);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  const allAssignees = [...new Map(
    campaigns.flatMap(c => c.assignedCallers || []).map(a => [a._id, a])
  ).values()];

  const allCreators = [...new Map(
    campaigns.filter(c => c.createdBy).map(c => [c.createdBy._id || c.createdBy, c.createdBy])
  ).values()];

  const dateRanges = {
    'Today': 1,
    'Last 7 days': 7,
    'Last 30 days': 30,
    'Last 3 months': 90,
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  let filtered = campaigns.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter && c.priority !== priorityFilter) return false;
    if (dateFilter && dateRanges[dateFilter]) {
      const cutoff = Date.now() - dateRanges[dateFilter] * 24 * 60 * 60 * 1000;
      if (new Date(c.createdAt).getTime() < cutoff) return false;
    }
    if (assigneeFilter) {
      const has = (c.assignedCallers || []).some(a => (a._id || a) === assigneeFilter);
      if (!has) return false;
    }
    if (createdByFilter) {
      const creator = c.createdBy?._id || c.createdBy;
      if (creator !== createdByFilter) return false;
    }
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (sortField === 'createdAt') { av = new Date(av); bv = new Date(bv); }
    if (sortField === 'totalLeads' || sortField === 'progress') { av = Number(av) || 0; bv = Number(bv) || 0; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDeleteCampaign = async (campaign, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete campaign "${campaign.name}"? This will remove it from any linked leads.`)) return;
    try {
      await campaignsAPI.delete(campaign._id);
      await loadCampaigns();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const totalLeadsAll = campaigns.reduce((s, c) => s + (c.totalLeads || 0), 0);
  const avgProgress = campaigns.length > 0 ? Math.round(campaigns.reduce((s, c) => s + (c.progress || 0), 0) / campaigns.length) : 0;
  const activeCampaigns = campaigns.filter(c => (c.progress || 0) < 100).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: O.deep }}>
            <RiMegaphoneLine className="w-4 h-4" /> Outreach Management
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-2xl md:text-3xl font-black" style={{ color: O.ink }}>
              Campaigns
            </h1>
            <button
              onClick={loadCampaigns}
              title="Refresh Campaigns"
              className="p-1.5 rounded-xl border hover:bg-orange-50 transition-colors"
              style={{ borderColor: O.line, color: O.deep }}
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs md:text-sm text-stone-500 mt-0.5">
            Organize lead lists, assign callers, and track calling progress across target batches.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <button
              onClick={() => setShowTransfer(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-orange-50 transition-colors shadow-sm"
              style={{ borderColor: O.line, color: O.deep, background: '#ffffff' }}
            >
              <FiShuffle className="w-4 h-4" /> Transfer Leads
            </button>
          )}

          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)`,
              boxShadow: '0 4px 16px rgba(232, 74, 16, 0.3)'
            }}
          >
            <FiPlus className="w-4 h-4 stroke-[2.5]" /> Create New Campaign
          </button>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Campaigns',
            value: campaigns.length,
            icon: <RiFolderChartLine className="w-5 h-5" style={{ color: O.deep }} />,
            bg: O.bgSoft,
            border: O.line,
            suffix: ' Batches'
          },
          {
            label: 'Total Leads Assigned',
            value: fmtLeads(totalLeadsAll),
            icon: <FiUsers className="w-5 h-5 text-blue-600" />,
            bg: '#eff6ff',
            border: '#bfdbfe',
            suffix: ' Leads'
          },
          {
            label: 'Active Calling Drives',
            value: activeCampaigns,
            icon: <FiActivity className="w-5 h-5 text-emerald-600" />,
            bg: '#ecfdf5',
            border: '#a7f3d0',
            suffix: ' In Progress'
          },
          {
            label: 'Average Completion',
            value: avgProgress,
            icon: <FiTarget className="w-5 h-5 text-amber-600" />,
            bg: '#fffbeb',
            border: '#fde68a',
            suffix: '%'
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border bg-white shadow-sm flex items-center gap-3.5 transition-transform hover:-translate-y-0.5"
            style={{ borderColor: O.line }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
            >
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-black" style={{ color: O.ink }}>
                {stat.value}{stat.suffix.startsWith('%') ? '%' : ''}
              </div>
              <div className="text-xs font-semibold text-stone-500">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="p-4 rounded-2xl border bg-white shadow-sm space-y-3" style={{ borderColor: O.line }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div
            className="flex-1 min-w-[220px] flex items-center gap-2.5 px-3.5 py-2 rounded-xl border bg-stone-50/70 focus-within:bg-white focus-within:border-orange-500 transition-all"
            style={{ borderColor: O.line }}
          >
            <FiSearch className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns by title..."
              className="w-full text-xs font-medium bg-transparent focus:outline-none"
              style={{ color: O.ink }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-700">
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <FilterDropdown
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            icon={<FiFlag className="w-3.5 h-3.5" />}
            options={[
              { label: 'High Priority', value: 'high', dot: '#ef4444' },
              { label: 'Medium Priority', value: 'medium', dot: '#f59e0b' },
              { label: 'Low Priority', value: 'low', dot: '#10b981' },
            ]}
          />

          <FilterDropdown
            label="Date Created"
            value={dateFilter}
            onChange={setDateFilter}
            icon={<FiCalendar className="w-3.5 h-3.5" />}
            options={['Today', 'Last 7 days', 'Last 30 days', 'Last 3 months']}
          />

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

          <FilterDropdown
            label="Created By"
            value={createdByFilter ? (typeof allCreators.find(c => (c._id || c) === createdByFilter) === 'object' ? allCreators.find(c => (c._id || c) === createdByFilter)?.name : createdByFilter) : ''}
            onChange={(val) => {
              if (!val) { setCreatedByFilter(''); return; }
              const found = allCreators.find(c => c.name === val);
              setCreatedByFilter(found?._id || val);
            }}
            icon={<FiFilter className="w-3.5 h-3.5" />}
            options={allCreators.filter(c => c && c.name).map(c => ({ label: c.name, value: c.name }))}
          />

          {(priorityFilter || dateFilter || assigneeFilter || createdByFilter || search) && (
            <button
              onClick={() => {
                setPriorityFilter('');
                setDateFilter('');
                setAssigneeFilter('');
                setCreatedByFilter('');
                setSearch('');
              }}
              className="text-xs font-bold px-3 py-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {(priorityFilter || dateFilter || assigneeFilter || createdByFilter) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: O.lineSoft }}>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Active:</span>
            {priorityFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100/70 text-orange-800 border border-orange-200">
                Priority: {priorityFilter}
                <FiX className="w-3 h-3 cursor-pointer" onClick={() => setPriorityFilter('')} />
              </span>
            )}
            {dateFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100/70 text-orange-800 border border-orange-200">
                Date: {dateFilter}
                <FiX className="w-3 h-3 cursor-pointer" onClick={() => setDateFilter('')} />
              </span>
            )}
            {assigneeFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100/70 text-orange-800 border border-orange-200">
                Assignee: {allAssignees.find(a => a._id === assigneeFilter)?.name || assigneeFilter}
                <FiX className="w-3 h-3 cursor-pointer" onClick={() => setAssigneeFilter('')} />
              </span>
            )}
            {createdByFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100/70 text-orange-800 border border-orange-200">
                Creator: {allCreators.find(c => (c._id || c) === createdByFilter)?.name || createdByFilter}
                <FiX className="w-3 h-3 cursor-pointer" onClick={() => setCreatedByFilter('')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Campaigns Table ── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: O.line }}>
        {loading ? (
          <div className="text-center py-16">
            <FiRefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: O.deep }} />
            <p className="text-xs font-bold text-stone-500">Loading outreach campaigns...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr style={{ background: O.bgSofter, borderBottom: `1px solid ${O.line}` }}>
                  {[
                    { label: 'Campaign Title', field: 'name' },
                    { label: 'Priority', field: 'priority' },
                    { label: 'Team Assignees', field: null },
                    { label: 'Total Leads', field: 'totalLeads' },
                    { label: 'Outreach Progress', field: 'progress' },
                    { label: 'Created On', field: 'createdAt' },
                    { label: 'Actions', field: null },
                  ].map((col, idx) => (
                    <th
                      key={col.label || idx}
                      onClick={() => col.field && handleSort(col.field)}
                      className={`py-3.5 px-4 font-bold uppercase tracking-wider whitespace-nowrap ${col.field ? 'cursor-pointer select-none hover:text-orange-600' : ''}`}
                      style={{ color: sortField === col.field ? O.deep : O.inkSoft }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {col.field && (
                          <span className="text-stone-400">
                            {sortField === col.field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: O.lineSoft }}>
                {filtered.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/campaigns/${c._id}`)}
                    className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                  >
                    {/* Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0"
                          style={{
                            background: O.bgSoft,
                            color: O.deep,
                            border: `1.5px solid ${O.line}`
                          }}
                        >
                          {c.name?.slice(0, 1).toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate flex items-center gap-1.5" style={{ color: O.ink }}>
                            <span>{c.name}</span>
                            <FiArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                          </div>
                          {c.description && (
                            <p className="text-[11px] text-stone-500 truncate max-w-xs mt-0.5">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {c.priority ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 capitalize"
                          style={{
                            background: c.priority === 'high' ? '#fef2f2' : c.priority === 'medium' ? '#fffbeb' : '#ecfdf5',
                            color: c.priority === 'high' ? '#dc2626' : c.priority === 'medium' ? '#d97706' : '#059669',
                            border: `1px solid ${c.priority === 'high' ? '#fecaca' : c.priority === 'medium' ? '#fde68a' : '#a7f3d0'}`
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: c.priority === 'high' ? '#dc2626' : c.priority === 'medium' ? '#d97706' : '#059669' }}
                          />
                          {c.priority}
                        </span>
                      ) : (
                        <span className="text-stone-400 font-medium">—</span>
                      )}
                    </td>

                    {/* Assignee Avatars */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <AssigneeAvatars callers={c.assignedCallers} />
                    </td>

                    {/* Total Leads */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-bold text-sm" style={{ color: O.ink }}>
                        {fmtLeads(c.totalLeads || 0)}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {c.called || 0} called
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="py-4 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <ProgressCircle value={c.progress || 0} />
                    </td>

                    {/* Created On */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-50 border border-stone-200/80 text-stone-600">
                        {timeAgo(c.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/campaigns/${c._id}`)}
                          title="View Analytics & Detail"
                          className="p-2 rounded-xl border hover:bg-orange-50 transition-colors"
                          style={{ borderColor: O.line, color: O.deep }}
                        >
                          <FiBarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCampaign(c, e)}
                          title="Delete Campaign"
                          className="p-2 rounded-xl border hover:bg-red-50 text-red-600 border-red-200 transition-colors"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-stone-400">
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3" style={{ border: `1px solid ${O.line}` }}>
                        <RiMegaphoneLine className="w-6 h-6" style={{ color: O.deep }} />
                      </div>
                      <div className="font-bold text-sm text-stone-700">No campaigns found</div>
                      <p className="text-xs text-stone-400 mt-1">
                        {search || priorityFilter || dateFilter || assigneeFilter || createdByFilter
                          ? 'Try adjusting your search criteria or active filters.'
                          : 'Create your first campaign to begin distributing leads!'}
                      </p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
                      >
                        + Create First Campaign
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-stone-500 font-medium" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
            <span>
              Showing <strong style={{ color: O.deep }}>{filtered.length}</strong> of <strong>{campaigns.length}</strong> total campaigns
            </span>
            <span className="text-[11px] text-stone-400">
              Click any row to view campaign leads & detail
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateCampaignModal
            onClose={() => setShowCreate(false)}
            onSuccess={loadCampaigns}
          />
        )}
        {showTransfer && (
          <TransferLeadsModal
            onClose={() => setShowTransfer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}