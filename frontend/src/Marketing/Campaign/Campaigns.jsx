import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { campaignsAPI, usersAPI, leadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';

import {
  FiPlus, FiRefreshCw, FiSearch, FiLayers, FiUsers, FiCalendar,
  FiFlag, FiBarChart2, FiTrash2, FiArrowRight, FiX, FiCheck,
  FiCheckCircle, FiAlertTriangle, FiClock, FiChevronDown,
  FiShuffle, FiTarget, FiActivity, FiEye, FiArrowUpRight, FiFilter
} from 'react-icons/fi';
import { RiMegaphoneLine, RiFolderChartLine } from 'react-icons/ri';

// ── White, Blue, Orange Theme Design Tokens ──────────────────────────────────
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

// Circular progress indicator (Blue, Orange, Emerald)
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

// Stacked Assignee Avatars
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
            title={c.name}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: theme.bg,
              color: theme.text,
              border: `2px solid #ffffff`,
              outline: `1px solid ${theme.border}`,
              fontSize: 10,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: i === 0 ? 0 : -7,
              zIndex: shown.length - i,
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
            fontWeight: 500,
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
            style={{ color: T.blue }}
          >
            ×
          </span>
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 z-40 bg-white border rounded-xl shadow-lg p-1.5 min-w-[200px]"
          style={{ borderColor: T.border }}
        >
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{
              color: !value ? T.blue : T.muted,
              background: !value ? T.blueLight : 'transparent',
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-between"
                style={{
                  color: isSelected ? T.blue : T.text,
                  background: isSelected ? T.blueLight : 'transparent',
                }}
              >
                <div className="flex items-center gap-2">
                  {opt.dot && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.dot }} />}
                  <span>{optLabel}</span>
                </div>
                {isSelected && <FiCheck className="w-3.5 h-3.5" style={{ color: T.blue }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CAMPAIGN MODAL (WHITE, BLUE, ORANGE THEME)
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border"
        style={{ borderColor: T.border }}
      >
        {/* Top Accent Gradient Bar (Orange to Blue) */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${T.orange} 0%, ${T.blue} 100%)`
          }}
        />

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b" style={{ borderColor: T.borderSoft }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: T.orangeLight, border: `1px solid ${T.orangeBorder}` }}
              >
                <RiMegaphoneLine className="w-4 h-4" style={{ color: T.orange }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-800">
                  Create New Campaign
                </h3>
                <p className="text-xs text-slate-500 font-normal">Launch a target outreach audience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Campaign Name <span className="text-rose-500">*</span>
              </label>
              <input
                placeholder="e.g. Q4 Masterclass Outreach"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full px-3 py-2 rounded-lg border text-xs font-normal text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                style={{ borderColor: T.border }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
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
                    className="py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: form.priority === p.key ? p.bg : '#ffffff',
                      borderColor: form.priority === p.key ? p.color : T.border,
                      color: form.priority === p.key ? p.color : T.textSecondary,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Description / Strategic Goal
              </label>
              <textarea
                placeholder="Briefly describe this campaign's target leads and purpose..."
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-xs font-normal text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                style={{ borderColor: T.border }}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t" style={{ borderColor: T.borderSoft }}>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                style={{ borderColor: T.border }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 bg-blue-600"
              >
                {saving ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FiPlus className="w-3.5 h-3.5" />}
                {saving ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFER LEADS MODAL (WHITE, BLUE, ORANGE THEME)
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden border max-h-[90vh] flex flex-col"
        style={{ borderColor: T.border }}
      >
        <div style={{ height: 4, background: `linear-gradient(90deg, ${T.orange} 0%, ${T.blue} 100%)` }} />

        <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: T.borderSoft }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: T.orangeLight, border: `1px solid ${T.orangeBorder}` }}
            >
              <FiShuffle className="w-4 h-4" style={{ color: T.orange }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-800">
                Transfer Leads Between Callers
              </h3>
              <p className="text-xs text-slate-500 font-normal">Reassign calling queues in bulk</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {result ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-base text-emerald-700">Transfer Completed</h4>
                <p className="text-xs text-slate-600 font-normal mt-1">
                  <span className="font-medium text-slate-800">{result.modifiedCount}</span> lead(s) transferred from{' '}
                  <span className="font-medium text-slate-800">{result.fromCaller}</span> →{' '}
                  <span className="font-medium text-slate-800">{result.toCaller}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Source Caller (From)
                  </label>
                  <select
                    value={fromCaller}
                    onChange={e => setFromCaller(e.target.value)}
                    className="w-full p-2 rounded-lg border text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ borderColor: T.border }}
                  >
                    <option value="">Select source caller...</option>
                    {callers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Target Caller (To)
                  </label>
                  <select
                    value={toCaller}
                    onChange={e => setToCaller(e.target.value)}
                    className="w-full p-2 rounded-lg border text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ borderColor: T.border }}
                  >
                    <option value="">Select destination caller...</option>
                    {callers.filter(c => c._id !== fromCaller).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {fromCaller && (
                <div className="p-3 rounded-xl border bg-orange-50/50 flex items-center justify-between" style={{ borderColor: T.orangeBorder }}>
                  <span className="text-xs font-medium" style={{ color: T.orange }}>
                    {loadingLeads ? 'Loading assigned leads...' : `${fromLeads.length} leads assigned to selected caller`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferMode('all')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                      style={{
                        background: transferMode === 'all' ? T.orange : '#ffffff',
                        color: transferMode === 'all' ? '#ffffff' : T.textSecondary,
                        borderColor: transferMode === 'all' ? T.orange : T.border
                      }}
                    >
                      All Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferMode('select')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                      style={{
                        background: transferMode === 'select' ? T.orange : '#ffffff',
                        color: transferMode === 'select' ? '#ffffff' : T.textSecondary,
                        borderColor: transferMode === 'select' ? T.orange : T.border
                      }}
                    >
                      Select Specific
                    </button>
                  </div>
                </div>
              )}

              {transferMode === 'select' && fromLeads.length > 0 && (
                <div className="space-y-1.5 border rounded-xl p-3 max-h-48 overflow-y-auto" style={{ borderColor: T.borderSoft }}>
                  <div className="flex justify-between items-center pb-2 border-b text-[11px] font-medium text-slate-500">
                    <span>{selectedLeads.length} selected</span>
                    <button type="button" onClick={toggleAll} className="underline hover:text-slate-800">
                      {selectedLeads.length === fromLeads.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {fromLeads.map(lead => (
                    <div
                      key={lead._id}
                      onClick={() => toggleLead(lead._id)}
                      className="p-2 rounded-lg flex items-center gap-2.5 cursor-pointer text-xs transition-colors hover:bg-slate-50"
                      style={{ background: selectedLeads.includes(lead._id) ? T.blueLight : '#ffffff' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => {}}
                        className="rounded text-blue-600"
                      />
                      <div className="flex-1 truncate">
                        <span className="font-medium text-slate-800">{lead.name}</span>
                        <span className="text-slate-400 text-[11px] ml-2 font-normal">{lead.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: T.borderSoft }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border text-xs font-medium text-slate-600 hover:bg-slate-50"
                  style={{ borderColor: T.border }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={saving || !fromCaller || !toCaller || (transferMode === 'select' && selectedLeads.length === 0)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 shadow-xs"
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
// MAIN CAMPAIGNS COMPONENT (WHITE, BLUE, ORANGE)
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <RiMegaphoneLine className="w-3.5 h-3.5" /> Outreach Management
          </div>
          <div className="flex items-center gap-2.5 mt-1.5">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800">
              Campaigns
            </h1>
            <button
              onClick={loadCampaigns}
              title="Refresh Campaigns"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Organize student lists, assign callers, and track calling progress across target batches.
          </p>
        </div>

        {/* Action Buttons (Orange & Blue) */}
        <div className="flex items-center gap-2.5">
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <button
              onClick={() => setShowTransfer(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium text-orange-700 bg-orange-50/70 border-orange-200 hover:bg-orange-100 transition-colors shadow-xs"
            >
              <FiShuffle className="w-3.5 h-3.5" /> Transfer Leads
            </button>
          )}

          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all active:scale-[0.98]"
          >
            <FiPlus className="w-3.5 h-3.5" /> Create New Campaign
          </button>
        </div>
      </div>

      {/* ── Summary Stats Cards (White, Blue, Orange, Emerald) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'Total Campaigns',
            value: campaigns.length,
            icon: <RiFolderChartLine className="w-4.5 h-4.5 text-blue-600" />,
            bg: T.blueLight,
            border: T.blueBorder,
            suffix: ' Batches'
          },
          {
            label: 'Total Leads Assigned',
            value: fmtLeads(totalLeadsAll),
            icon: <FiUsers className="w-4.5 h-4.5 text-orange-600" />,
            bg: T.orangeLight,
            border: T.orangeBorder,
            suffix: ' Leads'
          },
          {
            label: 'Active Calling Drives',
            value: activeCampaigns,
            icon: <FiActivity className="w-4.5 h-4.5 text-emerald-600" />,
            bg: T.emeraldLight,
            border: T.emeraldBorder,
            suffix: ' In Progress'
          },
          {
            label: 'Average Completion',
            value: avgProgress,
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
              placeholder="Search campaigns by title..."
              className="w-full text-xs font-normal text-slate-800 bg-transparent focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700">
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
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {(priorityFilter || dateFilter || assigneeFilter || createdByFilter) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: T.borderSoft }}>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Active:</span>
            {priorityFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Priority: {priorityFilter}
                <FiX className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setPriorityFilter('')} />
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
            {createdByFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Creator: {allCreators.find(c => (c._id || c) === createdByFilter)?.name || createdByFilter}
                <FiX className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setCreatedByFilter('')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Campaigns Table (White, Blue, Orange) ── */}
      <div className="rounded-xl border bg-white shadow-xs overflow-hidden" style={{ borderColor: T.border }}>
        {loading ? (
          <div className="text-center py-16">
            <FiRefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-medium text-slate-500">Loading outreach campaigns...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${T.border}` }}>
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
                {filtered.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/campaigns/${c._id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Name with Orange/Blue branding badge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-medium text-xs shadow-2xs flex-shrink-0"
                          style={{
                            background: T.orangeLight,
                            color: T.orange,
                            border: `1px solid ${T.orangeBorder}`
                          }}
                        >
                          {c.name?.slice(0, 1).toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-xs sm:text-sm text-slate-800 truncate flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <FiArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                          </div>
                          {c.description && (
                            <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs mt-0.5">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {c.priority ? (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5 capitalize"
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
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>

                    {/* Assignee Avatars */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <AssigneeAvatars callers={c.assignedCallers} />
                    </td>

                    {/* Total Leads */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-xs sm:text-sm text-slate-800">
                        {fmtLeads(c.totalLeads || 0)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {c.called || 0} called
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <ProgressCircle value={c.progress || 0} />
                    </td>

                    {/* Created On */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-xs font-normal bg-slate-50 border border-slate-200 text-slate-500">
                        {timeAgo(c.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/campaigns/${c._id}`)}
                          title="View Analytics & Detail"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <FiBarChart2 className="w-3.5 h-3.5" />
                        </button>
                        {canDelete(user) && (
                          <button
                            onClick={(e) => handleDeleteCampaign(c, e)}
                            title="Delete Campaign"
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-2.5">
                        <RiMegaphoneLine className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="font-medium text-sm text-slate-700">No campaigns found</div>
                      <p className="text-xs text-slate-400 font-normal mt-1">
                        {search || priorityFilter || dateFilter || assigneeFilter || createdByFilter
                          ? 'Try adjusting your search criteria or active filters.'
                          : 'Create your first campaign to begin distributing leads!'}
                      </p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="mt-3.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
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
          <div className="px-4 py-2.5 border-t flex items-center justify-between text-xs text-slate-500 font-normal" style={{ borderColor: T.borderSoft, background: '#f8fafc' }}>
            <span>
              Showing <span className="font-medium text-slate-800">{filtered.length}</span> of <span className="font-medium text-slate-800">{campaigns.length}</span> total campaigns
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
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