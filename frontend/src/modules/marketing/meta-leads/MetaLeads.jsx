import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { metaLeadsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AssignMembersModal from './AssignMembersModal';
import LeadDetailsPage, { cleanLeadName } from '../../../components/LeadDetails/LeadDetailsPage';
import leadNoteReminderService, { isStatusRequiringNote, leadHasNote } from '../../../services/leadNoteReminderService';
import AutoScrollText from '../../../components/common/AutoScrollText';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';


import {
  FiPlus, FiRefreshCw, FiSearch, FiLayers, FiUsers, FiCalendar,
  FiFlag, FiBarChart2, FiTrash2, FiArrowRight, FiX, FiCheck,
  FiCheckCircle, FiAlertTriangle, FiClock, FiChevronDown, FiChevronLeft, FiChevronRight,
  FiTarget, FiActivity, FiEye, FiArrowUpRight, FiFilter,
  FiDownload, FiPhoneCall, FiMail, FiUserPlus, FiShield
} from 'react-icons/fi';
import { RiMegaphoneLine, RiFolderChartLine } from 'react-icons/ri';
import { FaWhatsapp } from 'react-icons/fa';

// ── Design Tokens (Exact Match to Campaigns.jsx & CampaignDetail.jsx) ─────────
const ORANGE = '#ea580c';
const ORANGE_LIGHT = '#fff7ed';
const ORANGE_BORDER = '#ffedd5';
const ORANGE_HOVER = '#c2410c';

const BLUE = '#2563eb';
const BLUE_LIGHT = '#eff6ff';
const BLUE_BORDER = '#dbeafe';

const TEXT = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

const STATUS_COLORS = {
  Positive: '#10b981',
  Negative: '#ef4444',
  Fresh: '#ea580c',
  New: '#ea580c',
  Connected: '#2563eb',
  Contacted: '#2563eb',
  'Not Answered': '#f59e0b',
  'Call Back': '#0ea5e9',
  'Call Not Responding': '#f97316',
  'Call Back Later': '#3b82f6',
  'Not interested': '#64748b',
  'Demo Scheduled': '#0284c7',
  'Demo Done': '#1d4ed8',
  Won: '#16a34a',
  Converted: '#16a34a',
  Lost: '#ef4444',
  Discarded: '#ef4444',
  Blocked: '#334155',
  Enrolled: '#059669',
  Interested: '#d97706',
};

const PIE_COLORS = ['#10b981', '#ef4444', '#f97316', '#2563eb', '#3b82f6', '#0284c7'];

export const POSITIVE_STATUSES = [
  "Agreed to Office visit's but no luck",
  "Interested/Need time(After few months) waiting for parents approval",
  "office visit's",
  "Demo attended",
  "Demo not attended-Call Back",
  "time issues/Fee issues",
  "Call back/We will Call",
  "Not answering-call back/whats app text"
];

export const NEGATIVE_STATUSES = [
  "Not interested/Time pass",
  "WN-SO-ON",
  "joined another institute/jobs"
];

// Lead Positive / Negative Helper Classification
function isLeadPositive(lead) {
  const st = String(lead?.status || '').toLowerCase().trim();
  if (st === 'positive' || st === 'converted' || st === 'won' || st === 'interested' || st === 'enrolled' || st === 'demo scheduled' || st === 'demo done' || st === 'connected') {
    return true;
  }
  return POSITIVE_STATUSES.some(p => p.toLowerCase().trim() === st);
}

function isLeadNegative(lead) {
  const st = String(lead?.status || '').toLowerCase().trim();
  if (st === 'negative' || st === 'discarded' || st === 'lost' || st === 'blocked' || st === 'not interested' || st === 'not answered' || st === 'call not responding') {
    return true;
  }
  return NEGATIVE_STATUSES.some(n => n.toLowerCase().trim() === st);
}

// ── UI Helpers Matching Campaigns.jsx & CampaignDetail.jsx ───────────────────
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

function Avatar({ name, size = 30, bg = ORANGE_LIGHT, color = ORANGE }) {
  const initials = name && typeof name === 'string'
    ? name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'L';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color, fontWeight: 700,
      fontSize: size * 0.38, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, border: `1px solid ${BORDER}`,
    }}>
      {initials}
    </div>
  );
}

function MiniStatus({ status }) {
  const isPos = isLeadPositive({ status });
  const isNeg = isLeadNegative({ status });
  const color = isPos ? '#059669' : isNeg ? '#dc2626' : (STATUS_COLORS[status] || '#64748b');
  const bg = isPos ? '#ecfdf5' : isNeg ? '#fff1f2' : `${color}18`;
  const border = isPos ? '#a7f3d0' : isNeg ? '#fecdd3' : `${color}33`;

  return (
    <span style={{
      background: bg,
      color,
      borderRadius: 16,
      padding: '2px 8px',
      fontSize: 10.5,
      fontWeight: 700,
      border: `1px solid ${border}`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      maxWidth: 160,
      overflow: 'hidden',
      whiteSpace: 'nowrap'
    }} title={status || 'New'}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <AutoScrollText text={status || 'New'} maxWidth={125} />
    </span>
  );
}

function StatCard({ label, value, color = TEXT, bg = '#fff', borderColor = BORDER }) {
  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      padding: '7px 8px',
      border: `1px solid ${borderColor}`,
      textAlign: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 1, fontWeight: 400 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value ?? '—'}</div>
    </div>
  );
}

// Circular progress indicator (Matching Campaigns.jsx)
function ProgressCircle({ value = 0 }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;

  const color = pct === 100 ? '#10b981' : pct >= 70 ? BLUE : pct >= 40 ? ORANGE : '#ef4444';
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
        <text x="19" y="22" textAnchor="middle" fontSize="9" fill={color} fontWeight="600">
          {pct}%
        </text>
      </svg>
    </div>
  );
}

// Stacked Assignee Avatars (Matching Campaigns.jsx)
function AssigneeAvatars({ callers }) {
  const avatarColors = [
    { bg: BLUE_LIGHT, text: BLUE, border: BLUE_BORDER },
    { bg: ORANGE_LIGHT, text: ORANGE, border: ORANGE_BORDER },
    { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    { bg: '#f8fafc', text: '#475569', border: BORDER },
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
            color: BLUE,
            background: BLUE_LIGHT,
            borderRadius: 20,
            padding: '1px 6px',
            marginLeft: 5,
            border: `1px solid ${BLUE_BORDER}`
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
          background: active ? BLUE_LIGHT : '#ffffff',
          borderColor: active ? BLUE : BORDER,
          color: active ? BLUE : '#475569',
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
          style={{ borderColor: BORDER }}
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
// AI Calling Panel for Meta Campaigns
// ─────────────────────────────────────────────────────────────────────────────
function MetaAICallingPanel({ campaign, onStatusChange }) {
  const [aiStatus, setAiStatus] = useState(null);
  const [aiConcurrency, setAiConcurrency] = useState(5);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const refreshStatus = useCallback(async () => {
    if (!campaign) return;
    try {
      const res = await metaLeadsAPI.aiStatus(campaign);
      if (res.data?.success) {
        setAiStatus(res.data);
        if (res.data.aiConcurrencyLimit) {
          setAiConcurrency(res.data.aiConcurrencyLimit);
        }
      }
    } catch (err) {
      // silently ignore if endpoint not available yet
    }
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return;
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [campaign, refreshStatus]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await metaLeadsAPI.aiStart(campaign, { aiConcurrencyLimit: aiConcurrency });
      await refreshStatus();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start AI calling');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      await metaLeadsAPI.aiPause(campaign);
      await refreshStatus();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pause AI calling');
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = aiStatus?.aiCallingEnabled;

  return (
    <div style={{
      background: isEnabled ? '#f0fdf4' : '#ffffff',
      border: `1px solid ${isEnabled ? '#86efac' : BORDER}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color 0.2s, background 0.2s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      {/* Header row */}
      <div
        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Animated dot */}
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isEnabled ? '#16a34a' : '#94a3b8',
            boxShadow: isEnabled ? '0 0 0 3px #bbf7d0' : 'none',
            animation: isEnabled ? 'aipulse 1.5s infinite' : 'none',
            flexShrink: 0,
          }} />
          <style>{`@keyframes aipulse{0%,100%{box-shadow:0 0 0 0 #bbf7d0}50%{box-shadow:0 0 0 4px #bbf7d000}}`}</style>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: isEnabled ? '#15803d' : TEXT }}>
            AI Calling {isEnabled ? '— Active' : '— Paused'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10.5, color: MUTED, fontVariantNumeric: 'tabular-nums', fontWeight: 400 }}>
            {aiStatus?.inProgress ?? 0} active · {aiStatus?.queued ?? 0} queued
          </span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${isEnabled ? '#bbf7d0' : BORDER}` }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, margin: '8px 0' }}>
            {[
              { label: 'In Progress', value: aiStatus?.inProgress ?? 0, color: '#16a34a' },
              { label: 'Queued', value: aiStatus?.queued ?? 0, color: '#f59e0b' },
              { label: 'Done Today', value: aiStatus?.completedToday ?? 0, color: BLUE },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 9.5, color: MUTED, marginBottom: 1, fontWeight: 400 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Concurrency input (only when not active) */}
          {!isEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: MUTED, fontWeight: 400, whiteSpace: 'nowrap' }}>Concurrent calls:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={aiConcurrency}
                onChange={e => setAiConcurrency(Math.max(1, Math.min(20, Number(e.target.value))))}
                style={{
                  width: 50, padding: '4px 6px', borderRadius: 6,
                  border: `1px solid ${BORDER}`, fontSize: 11.5, color: TEXT,
                  fontWeight: 500, outline: 'none', textAlign: 'center',
                }}
              />
            </div>
          )}

          {/* Action button */}
          {isEnabled ? (
            <button
              onClick={handlePause}
              disabled={loading}
              style={{
                width: '100%', padding: '7px', borderRadius: 7,
                background: loading ? '#fef9c3' : '#fef08a',
                border: '1px solid #fde047', color: '#854d0e',
                fontSize: 11.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {loading ? (
                <>
                  <div className="spinner-gradient" style={{ width: 11, height: 11 }} />
                  Pausing…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Pause AI Calling
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              style={{
                width: '100%', padding: '7px', borderRadius: 7,
                background: loading ? '#93c5fd' : BLUE,
                border: 'none', color: '#fff',
                fontSize: 11.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {loading ? (
                <>
                  <div className="spinner-gradient" style={{ width: 11, height: 11 }} />
                  Starting…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start AI Calling
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-Time Calendar Component for Meta Leads
// Displays live real-time clock, month navigation, call activity dots & date filter
// ─────────────────────────────────────────────────────────────────────────────
function RealTimeCallCalendar({ campaign, selectedDate, onSelectDate, callDates = {}, loading = false }) {
  // Live real-time clock updating every second
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calendar month view (defaults to current real-time month)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-indexed

  // Today key: 'YYYY-MM-DD'
  const todayKey = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);

  // Live time string (e.g. "12:45:08 PM")
  const liveTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const liveDateStr = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleGoToday = () => {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
  };

  // Formatted Month Header (e.g. "October 2026")
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate calendar days grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInCurrent = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrev - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateKey = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateKey,
        isCurrentMonth: false,
        calls: callDates[dateKey] || 0
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrent; d++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
        calls: callDates[dateKey] || 0
      });
    }

    // Trailing days for complete grid (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let t = 1; t <= remaining; t++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateKey = `${nextY}-${String(nextM).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
      days.push({
        dayNum: t,
        dateKey,
        isCurrentMonth: false,
        calls: callDates[dateKey] || 0
      });
    }

    return days;
  }, [viewYear, viewMonth, callDates]);

  // Total calls in current view
  const currentMonthCalls = useMemo(() => {
    return calendarDays
      .filter(d => d.isCurrentMonth)
      .reduce((acc, d) => acc + (d.calls || 0), 0);
  }, [calendarDays]);

  const weekHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      {/* Real-time Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative', width: 7, height: 7 }}>
            <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#10b981', opacity: 0.75, animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <span style={{ position: 'relative', display: 'block', width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: TEXT }}>Real-Time Calendar</span>
        </div>
        <div style={{ fontSize: 9.5, color: MUTED, fontFamily: 'monospace', background: '#f8fafc', border: `1px solid ${BORDER}`, padding: '1.5px 5px', borderRadius: 4, fontWeight: 600 }} title="Live Time">
          {liveTimeStr}
        </div>
      </div>

      {/* Today info & Activity summary */}
      <div style={{ fontSize: 10, color: MUTED, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Today: <strong style={{ color: TEXT }}>{liveDateStr}</strong></span>
        {currentMonthCalls > 0 && (
          <span style={{ color: ORANGE, fontWeight: 700, fontSize: 9.5, background: ORANGE_LIGHT, padding: '1px 6px', borderRadius: 10, border: `1px solid ${ORANGE_BORDER}` }}>
            {currentMonthCalls} calls logged
          </span>
        )}
      </div>

      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '2px 0' }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 5, width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: TEXT, fontSize: 13, fontWeight: 600
          }}
          title="Previous Month"
        >
          ‹
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: TEXT }}>{monthName}</span>
          {(viewYear !== now.getFullYear() || viewMonth !== now.getMonth()) && (
            <button
              type="button"
              onClick={handleGoToday}
              style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 4, background: BLUE_LIGHT,
                color: BLUE, border: `1px solid ${BLUE_BORDER}`, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 5, width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: TEXT, fontSize: 13, fontWeight: 600
          }}
          title="Next Month"
        >
          ›
        </button>
      </div>

      {/* Weekday Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
        {weekHeaders.map((w, idx) => (
          <div key={idx} style={{ fontSize: 9.5, fontWeight: 700, color: idx === 0 ? '#ef4444' : MUTED }}>
            {w}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {calendarDays.map((cell, idx) => {
          const isSelected = selectedDate === cell.dateKey;
          const isToday = todayKey === cell.dateKey;
          const hasCalls = cell.calls > 0;

          // Background, border & text colors
          let bg = 'transparent';
          let border = '1px solid transparent';
          let color = cell.isCurrentMonth ? TEXT : '#cbd5e1';
          let fontWeight = 400;

          if (isSelected) {
            bg = ORANGE;
            border = `1px solid ${ORANGE_HOVER}`;
            color = '#ffffff';
            fontWeight = 700;
          } else if (isToday) {
            bg = BLUE_LIGHT;
            border = `1px solid ${BLUE}`;
            color = BLUE;
            fontWeight = 700;
          } else if (hasCalls) {
            bg = ORANGE_LIGHT;
            border = `1px solid ${ORANGE_BORDER}`;
            color = '#9a3412';
            fontWeight = 600;
          }

          return (
            <div
              key={idx}
              onClick={() => {
                // Clicking selected toggles off; clicking any cell selects that date
                onSelectDate(isSelected ? null : cell.dateKey);
              }}
              style={{
                position: 'relative',
                height: 32,
                borderRadius: 6,
                background: bg,
                border,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                boxShadow: isSelected ? '0 2px 4px rgba(234, 88, 12, 0.35)' : 'none'
              }}
              title={
                hasCalls
                  ? `${cell.calls} lead${cell.calls !== 1 ? 's' : ''} called on ${cell.dateKey} (Click to filter)`
                  : `${cell.dateKey} (No calls logged)`
              }
            >
              <span style={{ fontSize: 11, color, fontWeight, lineHeight: 1 }}>
                {cell.dayNum}
              </span>

              {/* Call indicator: count badge or small dot */}
              {hasCalls ? (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    lineHeight: 1,
                    marginTop: 2,
                    padding: '1px 3px',
                    borderRadius: 8,
                    background: isSelected ? '#ffffff' : ORANGE,
                    color: isSelected ? ORANGE : '#ffffff',
                    transform: 'scale(0.9)'
                  }}
                >
                  {cell.calls > 99 ? '99+' : cell.calls}
                </span>
              ) : isToday && !isSelected ? (
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: BLUE, marginTop: 2 }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Selected Date Filter Footer */}
      {selectedDate ? (
        <div style={{
          marginTop: 9,
          padding: '6px 8px',
          borderRadius: 6,
          background: ORANGE_LIGHT,
          border: `1px solid ${ORANGE_BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10.5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: ORANGE, fontWeight: 600 }}>
            <FiCheckCircle size={12} />
            <span>Called: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} ({callDates[selectedDate] || 0} calls)</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, fontWeight: 700, fontSize: 10.5, padding: 0 }}
            title="Clear date filter"
          >
            ✕ Clear
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 7, fontSize: 9.5, color: MUTED, textAlign: 'center', fontStyle: 'italic' }}>
          💡 Tap any highlighted date to view called students
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN META LEADS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MetaLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Overview Data
  const [campaignStats, setCampaignStats] = useState([]);
  const [totalLeadsAll, setTotalLeadsAll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Selected Campaign State (3-Panel CampaignDetail Layout)
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignLeads, setCampaignLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPages, setLeadsPages] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsSearch, setLeadsSearch] = useState('');

  // 1 & 2: ONLY Positive and Negative Dropdown Filter
  const [leadsStatusFilter, setLeadsStatusFilter] = useState('');
  const [campaignSentiment, setCampaignSentiment] = useState(null);

  // Real-Time Calendar Date Filter
  const [selectedCallDate, setSelectedCallDate] = useState(null);
  const [callDatesMap, setCallDatesMap] = useState({});
  const [callDatesLoading, setCallDatesLoading] = useState(false);

  // Mobile Tabs inside Campaign Detail ('students' | 'analytics' | 'profile')
  const [activeMobileTab, setActiveMobileTab] = useState('students');

  // Filters for Overview Table
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

  // ── Clean zero-width, mojibake, or unformatted lead names ────────────────
  const cleanLeadName = (rawName) => {
    if (!rawName || typeof rawName !== 'string') return '';
    let str = rawName;

    // 1. Remove mojibake sequences of ZWNJ / ZWJ / BOM that got decoded as Windows-1252
    str = str.replace(/â€Œ/g, '')
             .replace(/â€‹/g, '')
             .replace(/â€/g, '')
             .replace(/ï»¿/g, '');

    // 2. Remove leading/trailing or repeated â characters if they are artifacts of zero-width mojibake
    str = str.replace(/^[\sâ\u00e2\uFFFD\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]+/, '');
    str = str.replace(/[\sâ\u00e2\uFFFD\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]+$/, '');

    // 3. Remove zero-width characters (\u200B = zero width space, \uFEFF = BOM, \u200E / \u200F = directional marks)
    str = str.replace(/[\u200B\uFEFF\u200E\u200F\u2060]/g, '');

    // Remove zero-width non-joiners (\u200C) or joiners (\u200D) unless between Indic virama and Indic character
    str = str.replace(/[\u200C\u200D]+/g, (match, offset, full) => {
      const prevChar = offset > 0 ? full[offset - 1] : '';
      const nextChar = offset + match.length < full.length ? full[offset + match.length] : '';
      const isIndic = (c) => c && c.charCodeAt(0) >= 0x0900 && c.charCodeAt(0) <= 0x0D7F;
      if (isIndic(prevChar) && isIndic(nextChar)) {
        return match;
      }
      return '';
    });

    // 4. Normalize multiple spaces
    str = str.replace(/\s+/g, ' ').trim();

    // 5. If word is lowercase Latin (like "shyam"), capitalize properly ("Shyam")
    if (/^[a-z]+(\s+[a-z]+)*$/.test(str)) {
      str = str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return str;
  };

  // ── Robust Name, Phone & Email Extraction (Resolves "Unknown Lead") ────────
  const getLeadIdentifiers = (lead) => {
    if (!lead) return { name: '', phone: '', email: '', city: '' };
    const raw = lead.rawData || {};

    // 1. Phone extraction
    let phone = lead.phone || lead.normalizedPhone || raw.phone || raw.Phone || raw.phone_number || raw.mobile || raw.Mobile || raw['Phone Number'] || raw.Contact || raw['Contact Number'] || raw['Candidate Mobile'] || raw['Student Mobile'] || '';
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

    // 2. Full Name extraction
    let name = lead.fullName || lead.name || raw.name || raw.full_name || raw.fullName || raw.Name || raw['Full Name'] || raw['Candidate Name'] || raw['Student Name'] || '';
    if (!name || name === 'full_name' || name === 'name') {
      if (raw['Bhavani'] && typeof raw['Bhavani'] === 'string' && raw['Bhavani'] !== 'full_name') {
        name = raw['Bhavani'];
      }
    }
    if (!name) {
      for (const [k, v] of Object.entries(raw)) {
        if (/name|student|candidate|client|party/i.test(k) && typeof v === 'string' && v.trim() && !/ad_name|form_name|campaign_name/i.test(k) && v !== 'full_name') {
          name = v;
          break;
        }
      }
    }
    if (!name) {
      if (lead.email || raw.email) {
        name = (lead.email || raw.email).split('@')[0];
      } else if (phone) {
        const cleanDigits = String(phone).replace(/\D/g, '');
        name = `Lead ${cleanDigits.slice(-4)}`;
      } else {
        name = 'Lead';
      }
    }

    // Clean zero-width artifacts and mojibake from name
    name = cleanLeadName(name) || 'Lead';

    // 3. Email extraction
    let email = lead.email || raw.email || raw.Email || raw['Email Address'] || '';
    if (!email || !email.includes('@')) {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string' && v.includes('@') && v.includes('.')) {
          email = v;
          break;
        }
      }
    }

    // 4. City / Location extraction
    let city = lead.city || raw.city || raw.City || raw.location || raw.Location || raw.town || raw.Town || '';
    if (!city) {
      for (const [k, v] of Object.entries(raw)) {
        if (/city|location|town/i.test(k) && typeof v === 'string' && v.trim()) {
          city = v;
          break;
        }
      }
    }

    return {
      phone: String(phone).trim(),
      name: String(name).trim(),
      email: String(email).trim(),
      city: String(city).trim()
    };
  };

  // ── Fetch Campaigns Overview ───────────────────────────────────────────────
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

  // Fetch Call Dates for Selected Campaign
  const fetchCallDates = useCallback(async (campaignName) => {
    if (!campaignName) return;
    try {
      setCallDatesLoading(true);
      const res = await metaLeadsAPI.getCallDates({
        campaign: campaignName,
        tzOffset: new Date().getTimezoneOffset()
      });
      setCallDatesMap(res.data?.callDates || {});
    } catch (err) {
      console.error('Failed to load call dates:', err);
    } finally {
      setCallDatesLoading(false);
    }
  }, []);

  // ── Fetch Leads When a Specific Campaign is Selected ───────────────────────
  const fetchCampaignLeads = useCallback(async (campaignName, pg = 1) => {
    if (!campaignName) return;
    try {
      setLeadsLoading(true);
      const params = {
        campaign: campaignName,
        page: pg,
        limit: 20,
        tzOffset: new Date().getTimezoneOffset()
      };
      if (leadsSearch) params.search = leadsSearch;
      if (leadsStatusFilter) params.status = leadsStatusFilter;
      if (selectedCallDate) params.calledDate = selectedCallDate;

      const res = await metaLeadsAPI.getAll(params);
      const data = res.data || {};
      const fetched = data.leads || [];

      setCampaignLeads(fetched);
      setLeadsTotal(data.total || fetched.length);
      setLeadsPages(data.pages || 1);
      setLeadsPage(pg);
      if (data.sentiment) {
        setCampaignSentiment(data.sentiment);
      }

      if (fetched.length > 0) {
        setSelectedLead(prev => (prev && fetched.some(l => l._id === prev._id) ? prev : fetched[0]));
      } else {
        setSelectedLead(null);
      }
    } catch (err) {
      console.error('Failed to fetch leads for campaign:', err);
    } finally {
      setLeadsLoading(false);
    }
  }, [leadsSearch, leadsStatusFilter, selectedCallDate]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCallDates(selectedCampaign);
    }
  }, [selectedCampaign, fetchCallDates]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignLeads(selectedCampaign, 1);
    }
  }, [selectedCampaign, fetchCampaignLeads]);

  // Listen to open-lead-note-modal event dispatched from Sonner toast action button
  useEffect(() => {
    const handleOpenNote = (e) => {
      const targetId = e.detail?.leadId;
      if (targetId && selectedLead?._id !== targetId) {
        const found = campaignLeads.find(l => l._id === targetId || l.crmLeadId === targetId);
        if (found) {
          setSelectedLead(found);
          setActiveMobileTab('profile');
        }
      }
    };
    window.addEventListener('open-lead-note-modal', handleOpenNote);
    return () => window.removeEventListener('open-lead-note-modal', handleOpenNote);
  }, [campaignLeads, selectedLead?._id]);

  // ── Quick Update Lead Status (Positive vs Negative) ────────────────────────
  const handleSetLeadStatus = async (lead, newStatus) => {
    try {
      await metaLeadsAPI.update(lead._id, { status: newStatus });
      setStatusMessage(`Lead marked as ${newStatus}!`);

      // Optimistically update list state
      setCampaignLeads(prev => prev.map(l => l._id === lead._id ? { ...l, status: newStatus } : l));
      if (selectedLead?._id === lead._id) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
      setTimeout(() => setStatusMessage(''), 2500);
      fetchCampaigns();

      // Track 5-minute note reminder for office visit's or Demo attended
      const studentName = cleanLeadName(lead.fullName || lead.rawData?.full_name || lead.rawData?.Name || lead.name || 'Student');
      if (isStatusRequiringNote(newStatus)) {
        leadNoteReminderService.trackLead({
          id: lead._id,
          name: studentName,
          status: newStatus,
          hasExistingNote: leadHasNote(lead),
        });
      } else {
        leadNoteReminderService.resolveLead(lead._id);
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };


  // ── Sync Handler ────────────────────────────────────────────────────────────
  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setStatusMessage('Syncing Google Sheets tabs (Fetching Name, Email, Mobile, City)...');

    // Background poller to monitor execution status every 2.5s
    const pollId = setInterval(async () => {
      try {
        const res = await metaLeadsAPI.getSyncStatus();
        if (res.data && res.data.isSyncing === false) {
          clearInterval(pollId);
          setSyncing(false);
          setStatusMessage(res.data.lastStatus === 'completed' ? '✅ Google Sheets sync completed successfully!' : (res.data.message || 'Sync finished.'));
          await fetchCampaigns();
          if (selectedCampaign) await fetchCampaignLeads(selectedCampaign, 1);
          setTimeout(() => setStatusMessage(''), 8000);
        }
      } catch (_) {}
    }, 2500);

    try {
      const res = await metaLeadsAPI.triggerSync();
      clearInterval(pollId);
      setSyncing(false);
      setStatusMessage(res.data?.message || '✅ Google Sheets sync completed successfully!');
      await fetchCampaigns();
      if (selectedCampaign) {
        await fetchCampaignLeads(selectedCampaign, 1);
      }
      setTimeout(() => setStatusMessage(''), 8000);
    } catch (err) {
      clearInterval(pollId);
      setSyncing(false);
      console.error('Sync failed:', err);
      setStatusMessage(err.response?.data?.message || 'Google Sheets sync finished.');
      await fetchCampaigns();
      setTimeout(() => setStatusMessage(''), 8000);
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
      csvContent += 'Name,Phone,City,Email,Campaign,Status,Synced Date\n';
      campaignLeads.forEach(lead => {
        const { name, phone, email, city } = getLeadIdentifiers(lead);
        csvContent += `"${name}","${phone}","${city}","${email}","${lead.campaign || selectedCampaign}","${lead.status || 'New'}","${lead.syncedAt || ''}"\n`;
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

  // ── Filtered & Sorted Overview Campaigns ────────────────────────────────────
  const allAssignees = useMemo(() => {
    const map = new Map();
    campaignStats.forEach(c => {
      (c.assignedUsers || []).forEach(u => {
        if (u && u._id) map.set(u._id, u);
      });
    });
    return Array.from(map.values());
  }, [campaignStats]);

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

  // Selected Campaign Computed Data (For 3-Panel Campaign Detail View)
  const activeCampaignObj = useMemo(() => {
    return campaignStats.find(c => c.campaign === selectedCampaign) || {
      campaign: selectedCampaign || '',
      count: leadsTotal,
      newCount: 0,
      convertedCount: 0,
      assignedUsers: []
    };
  }, [campaignStats, selectedCampaign, leadsTotal]);

  const activeAssignees = useMemo(() => {
    return activeCampaignObj.assignedUsers || assignments.find(a => a.campaign === selectedCampaign)?.assignedUsers || [];
  }, [activeCampaignObj, assignments, selectedCampaign]);

  // Total student counts across the entire campaign (not per page)
  const totalCampaignStudents = useMemo(() => {
    return campaignSentiment?.total ?? activeCampaignObj.count ?? leadsTotal ?? 0;
  }, [campaignSentiment, activeCampaignObj, leadsTotal]);

  const positiveCount = useMemo(() => {
    if (campaignSentiment?.positive !== undefined) return campaignSentiment.positive;
    if (activeCampaignObj.positiveCount !== undefined) return activeCampaignObj.positiveCount;
    return campaignLeads.filter(l => isLeadPositive(l)).length;
  }, [campaignSentiment, activeCampaignObj, campaignLeads]);

  const negativeCount = useMemo(() => {
    if (campaignSentiment?.negative !== undefined) return campaignSentiment.negative;
    if (activeCampaignObj.negativeCount !== undefined) return activeCampaignObj.negativeCount;
    return campaignLeads.filter(l => isLeadNegative(l)).length;
  }, [campaignSentiment, activeCampaignObj, campaignLeads]);

  const pendingCount = useMemo(() => {
    if (campaignSentiment?.pending !== undefined) return campaignSentiment.pending;
    if (activeCampaignObj.pendingCount !== undefined) return activeCampaignObj.pendingCount;
    return Math.max(0, totalCampaignStudents - positiveCount - negativeCount);
  }, [campaignSentiment, activeCampaignObj, totalCampaignStudents, positiveCount, negativeCount]);

  const sentimentData = useMemo(() => {
    return [
      { name: 'Positive', count: positiveCount, color: '#10b981' },
      { name: 'Negative', count: negativeCount, color: '#ef4444' },
      { name: 'Pending', count: pendingCount, color: '#f97316' }
    ];
  }, [positiveCount, negativeCount, pendingCount]);

  const pieChartData = useMemo(() => {
    const active = sentimentData.filter(s => s.count > 0);
    return active.length > 0 ? active : [{ name: 'Pending', count: 1, color: '#f1f5f9' }];
  }, [sentimentData]);

  // Metrics
  const totalCampaignsCount = campaignStats.length;
  const activeDrives = campaignStats.filter(c => (c.count || 0) > 0).length;
  const totalConverted = campaignStats.reduce((acc, c) => acc + (c.convertedCount || 0), 0);
  const avgCompletion = totalLeadsAll > 0 ? Math.round((totalConverted / totalLeadsAll) * 100) : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: VIEW 2 - 3-PANEL CAMPAIGN DETAIL (Exact Match to CampaignDetail.jsx)
  // ═══════════════════════════════════════════════════════════════════════════
  if (selectedCampaign) {
    return (
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 h-[calc(100vh-64px)] flex flex-col box-border font-sans">
        
        {/* Mobile-Only Tab Navigation */}
        <div className="flex md:hidden items-center justify-between mb-2.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
          <button
            onClick={() => setActiveMobileTab('students')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              activeMobileTab === 'students' ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Students ({campaignLeads.length})
          </button>
          <button
            onClick={() => setActiveMobileTab('analytics')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              activeMobileTab === 'analytics' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveMobileTab('profile')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              activeMobileTab === 'profile' ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Profile
          </button>
        </div>

        {/* Main Responsive 3-Panel Card Shell */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* ─── LEFT PANEL: Student List ───────────────────────────────────── */}
          <div className={`w-full md:w-72 xl:w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden min-h-0 ${
            activeMobileTab === 'students' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Back + Campaign Summary Card */}
            <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${BORDER}` }}>
              <button
                onClick={() => setSelectedCampaign(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 11.5, color: MUTED, marginBottom: 8, padding: 0, fontWeight: 500
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back to Campaigns
              </button>

              {/* Campaign Summary Card */}
              <div style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: ORANGE, background: ORANGE_LIGHT, padding: '2px 8px', borderRadius: 8, border: `1px solid ${ORANGE_BORDER}` }}>
                    @{selectedCampaign.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => {
                      fetchCampaigns();
                      fetchCampaignLeads(selectedCampaign, leadsPage);
                    }}
                    title="Refresh Campaign"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, padding: 2 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-5" /></svg>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                  <StatCard label="Total" value={totalCampaignStudents} color={BLUE} bg={BLUE_LIGHT} borderColor={BLUE_BORDER} />
                  <StatCard label="Positive" value={positiveCount} color="#10b981" bg="#ecfdf5" borderColor="#a7f3d0" />
                  <StatCard label="Negative" value={negativeCount} color="#ef4444" bg="#fff1f2" borderColor="#fecdd3" />
                  <StatCard label="Callers" value={activeAssignees.length} color={TEXT} bg="#fff" borderColor={BORDER} />
                </div>
              </div>
            </div>

            {/* Search + 1 & 2: ONLY Positive & Negative Dropdown */}
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 6, background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '5px 8px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  value={leadsSearch}
                  onChange={e => setLeadsSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchCampaignLeads(selectedCampaign, 1); }}
                  placeholder="Search students..."
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: 11.5, color: TEXT, width: '100%', fontWeight: 400 }}
                />
              </div>

              {/* ONLY Positive / Negative Dropdown Filter */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={leadsStatusFilter}
                  onChange={e => { setLeadsStatusFilter(e.target.value); setLeadsPage(1); }}
                  style={{
                    flex: 1,
                    fontSize: 11.5,
                    padding: '5px 8px',
                    border: `1px solid ${isLeadPositive({ status: leadsStatusFilter }) ? '#a7f3d0' : isLeadNegative({ status: leadsStatusFilter }) ? '#fecdd3' : BORDER}`,
                    borderRadius: 6,
                    color: isLeadPositive({ status: leadsStatusFilter }) ? '#059669' : isLeadNegative({ status: leadsStatusFilter }) ? '#dc2626' : TEXT,
                    background: isLeadPositive({ status: leadsStatusFilter }) ? '#ecfdf5' : isLeadNegative({ status: leadsStatusFilter }) ? '#fff1f2' : '#fff',
                    outline: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Leads</option>
                  <option value="Pending">🟡 Pending Leads ({pendingCount})</option>
                  <optgroup label="🟢 Positive">
                    <option value="Positive">All Positive</option>
                    {POSITIVE_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🔴 Negative">
                    <option value="Negative">All Negative</option>
                    {NEGATIVE_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                </select>

                {isAdmin && (
                  <button
                    onClick={() => handleOpenAssignModal(selectedCampaign)}
                    title="Assign Members"
                    style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <FiUserPlus size={12} />
                    Assign
                  </button>
                )}
              </div>

              <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span>{leadsTotal} student{leadsTotal !== 1 ? 's' : ''}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {leadsStatusFilter && (
                    <button
                      onClick={() => setLeadsStatusFilter('')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: leadsStatusFilter === 'Positive' ? '#ecfdf5' : leadsStatusFilter === 'Negative' ? '#fff1f2' : '#fff7ed',
                        color: leadsStatusFilter === 'Positive' ? '#059669' : leadsStatusFilter === 'Negative' ? '#dc2626' : '#ea580c',
                        border: `1px solid ${leadsStatusFilter === 'Positive' ? '#a7f3d0' : leadsStatusFilter === 'Negative' ? '#fecdd3' : '#fed7aa'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Click to clear status filter and show all leads"
                    >
                      <span>{leadsStatusFilter} Leads</span>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>✕</span>
                    </button>
                  )}
                  {selectedCallDate && (
                    <button
                      onClick={() => setSelectedCallDate(null)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: ORANGE_LIGHT,
                        color: ORANGE,
                        border: `1px solid ${ORANGE_BORDER}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Click to clear date filter and show all leads"
                    >
                      <FiCalendar size={10} />
                      <span>{new Date(selectedCallDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>✕</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Call Date Indicator Banner */}
              {selectedCallDate && (
                <div style={{
                  marginTop: 6,
                  padding: '5px 8px',
                  borderRadius: 6,
                  background: ORANGE_LIGHT,
                  border: `1px solid ${ORANGE_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10.5,
                  color: ORANGE
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                    <FiCalendar size={12} />
                    <span>Called on {new Date(selectedCallDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCallDate(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, fontWeight: 700, fontSize: 10.5, padding: 0 }}
                    title="View all students"
                  >
                    View All ✕
                  </button>
                </div>
              )}
            </div>

            {/* Student List */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {leadsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
                  <FiRefreshCw className="animate-spin text-blue-600" size={24} />
                </div>
              ) : campaignLeads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 14px', color: MUTED }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: 6, margin: '0 auto' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  <div style={{ fontSize: 11.5, fontWeight: 500 }}>
                    {selectedCallDate ? (
                      <div>
                        <div>No leads called on {new Date(selectedCallDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <button
                          type="button"
                          onClick={() => setSelectedCallDate(null)}
                          style={{ marginTop: 8, fontSize: 11, color: BLUE, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                        >
                          View all campaign leads
                        </button>
                      </div>
                    ) : leadsStatusFilter ? (
                      `No ${leadsStatusFilter} leads found`
                    ) : (
                      'No students found'
                    )}
                  </div>
                </div>
              ) : (
                campaignLeads.map(lead => {
                  const { name, phone, email, city } = getLeadIdentifiers(lead);
                  const isSelected = selectedLead?._id === lead._id;
                  const isPos = isLeadPositive(lead);
                  const isNeg = isLeadNegative(lead);

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
                        padding: '9px 12px',
                        borderBottom: `1px solid #f1f5f9`,
                        cursor: 'pointer',
                        background: isSelected ? ORANGE_LIGHT : '#fff',
                        borderLeft: isSelected ? `3px solid ${ORANGE}` : '3px solid transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar name={name} size={28} bg={isSelected ? '#fed7aa' : (isPos ? '#ecfdf5' : isNeg ? '#fff1f2' : ORANGE_LIGHT)} color={isPos ? '#059669' : isNeg ? '#dc2626' : ORANGE} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {name}
                            </div>
                          </div>
                          <div style={{ fontSize: 10.5, color: MUTED, fontFamily: 'monospace', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                            <span style={{ flexShrink: 0 }}>{phone || 'No phone'}</span>
                            {city && <span style={{ fontFamily: 'inherit', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {city}</span>}
                          </div>
                        </div>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                      </div>

                      {/* Status Badge & Call Date Badge */}
                      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        {(isPos || isNeg) ? (
                          <MiniStatus status={lead.status} />
                        ) : <div />}
                        {lead.lastCallAt ? (
                          <span style={{ fontSize: 9.5, color: MUTED, display: 'flex', alignItems: 'center', gap: 3, background: '#f8fafc', padding: '1px 5px', borderRadius: 4, border: `1px solid ${BORDER}` }} title={`Last called: ${new Date(lead.lastCallAt).toLocaleString()}`}>
                            <FiPhoneCall size={9} style={{ color: ORANGE }} />
                            <span>{new Date(lead.lastCallAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                          </span>
                        ) : lead.callNotes?.length > 0 ? (
                          <span style={{ fontSize: 9.5, color: MUTED, display: 'flex', alignItems: 'center', gap: 3, background: '#f8fafc', padding: '1px 5px', borderRadius: 4, border: `1px solid ${BORDER}` }} title={`${lead.callNotes.length} call session(s)`}>
                            <FiPhoneCall size={9} style={{ color: BLUE }} />
                            <span>{new Date(lead.callNotes[lead.callNotes.length - 1].date || lead.callNotes[0].date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {leadsPages > 1 && (
              <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
                <button
                  onClick={() => fetchCampaignLeads(selectedCampaign, Math.max(1, leadsPage - 1))}
                  disabled={leadsPage === 1}
                  style={{
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 8px',
                    fontSize: 10.5, cursor: leadsPage === 1 ? 'not-allowed' : 'pointer', color: leadsPage === 1 ? '#cbd5e1' : TEXT, fontWeight: 500
                  }}
                >
                  ‹ Prev
                </button>
                <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 400 }}>{leadsPage} / {leadsPages}</span>
                <button
                  onClick={() => fetchCampaignLeads(selectedCampaign, Math.min(leadsPages, leadsPage + 1))}
                  disabled={leadsPage === leadsPages}
                  style={{
                    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 8px',
                    fontSize: 10.5, cursor: leadsPage === leadsPages ? 'not-allowed' : 'pointer', color: leadsPage === leadsPages ? '#cbd5e1' : TEXT, fontWeight: 500
                  }}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>

          {/* ─── MIDDLE PANEL: Real-Time Calendar & Lead Sentiment ─────────────── */}
          <div className={`w-full md:w-64 xl:w-72 flex-shrink-0 bg-slate-50/70 border-r border-slate-200 overflow-y-auto p-3 flex flex-col gap-3 min-h-0 ${
            activeMobileTab === 'analytics' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* 1. Real-Time Calendar (Placed ABOVE Lead Sentiment) */}
            <RealTimeCallCalendar
              campaign={selectedCampaign}
              selectedDate={selectedCallDate}
              onSelectDate={(date) => setSelectedCallDate(date)}
              callDates={callDatesMap}
              loading={callDatesLoading}
            />

            {/* 2. Lead Sentiment (Placed BELOW the Calendar) */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: TEXT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Lead Sentiment
              </div>
              {sentimentData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={105}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={44}
                        innerRadius={22}
                        dataKey="count"
                      >
                        {pieChartData.map((s, i) => (
                          <Cell key={s.name} fill={s.color || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                    {sentimentData.map((s) => {
                      const isActive = leadsStatusFilter === s.name;
                      return (
                        <div
                          key={s.name}
                          onClick={() => {
                            setLeadsStatusFilter(prev => prev === s.name ? '' : s.name);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: 6,
                            background: isActive ? `${s.color}18` : 'transparent',
                            border: `1px solid ${isActive ? s.color : 'transparent'}`,
                            transition: 'all 0.15s ease'
                          }}
                          className="hover:bg-slate-50"
                          title={`Click to filter ${s.name} leads on the left`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ color: isActive ? s.color : '#475569', fontWeight: isActive ? 700 : 500 }}>{s.name}</span>
                            {isActive && (
                              <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: s.color, color: '#fff', fontWeight: 700 }}>
                                Active
                              </span>
                            )}
                          </div>
                          <span style={{ fontWeight: 700, color: isActive ? s.color : TEXT }}>{s.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: MUTED, fontSize: 11, padding: '16px 0', fontWeight: 400 }}>No sentiment data yet</div>
              )}
            </div>

            {/* AI Calling Panel */}
            <MetaAICallingPanel
              campaign={selectedCampaign}
              onStatusChange={() => fetchCampaignLeads(selectedCampaign, leadsPage)}
            />

            {/* Assigned Callers */}
            {activeAssignees.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 10px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: TEXT, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE }} />
                    Assigned Callers
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenAssignModal(selectedCampaign)}
                      style={{ fontSize: 10.5, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {activeAssignees.map(caller => (
                  <div key={caller._id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <Avatar name={caller.name} size={24} bg={BLUE_LIGHT} color={BLUE} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, color: TEXT, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {caller.name}
                      </div>
                      {caller.designation && (
                        <div style={{ fontSize: 10, color: MUTED }}>{caller.designation}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── RIGHT PANEL: Lead Detail (Embedded LeadDetailsPage) ─────────── */}
          <div className={`flex-1 min-w-0 bg-white overflow-y-auto min-h-0 ${
            activeMobileTab === 'profile' ? 'flex flex-col' : 'hidden md:flex flex-col'
          }`}>
            {selectedLead ? (
              <LeadDetailsPage
                key={selectedLead._id}
                leadId={selectedLead.crmLeadId || selectedLead._id}
                metaLeadId={selectedLead._id}
                metaLeadData={selectedLead}
                isMetaLead={true}
                embedded
                onDeleted={() => {
                  setSelectedLead(null);
                  fetchCampaignLeads(selectedCampaign, leadsPage);
                  fetchCampaigns();
                }}
                onChange={(updated) => {
                  if (updated) {
                    setSelectedLead(prev => ({ ...prev, ...updated }));
                    setCampaignLeads(prev => prev.map(l => (l._id === updated._id || l._id === updated.metaLeadId) ? { ...l, ...updated } : l));
                  }
                  fetchCampaignLeads(selectedCampaign, leadsPage);
                  fetchCampaigns();
                }}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, flexDirection: 'column', gap: 8, padding: 32 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>Select a student to view details</span>
              </div>
            )}
          </div>

        </div>

        {/* Assign Members Modal */}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: VIEW 1 - CAMPAIGNS OVERVIEW TABLE (Matching Campaigns.jsx)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <RiMegaphoneLine className="w-3.5 h-3.5" /> Meta Leads Outreach
          </div>
          <div className="flex items-center gap-2.5 mt-1.5">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-800">
              Meta Leads Campaigns
            </h1>
            <button
              onClick={fetchCampaigns}
              title="Refresh Campaigns"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Organize Meta Google Sheet campaigns, assign callers, and track calling progress across target batches.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => handleOpenAssignModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium text-orange-700 bg-orange-50/70 border-orange-200 hover:bg-orange-100 transition-colors shadow-xs"
            >
              <FiUserPlus className="w-3.5 h-3.5" /> Assign Members
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors"
            style={{ borderColor: BORDER }}
          >
            <FiDownload className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Google Sheets in progress...' : 'Sync Leads Now'}
          </button>
        </div>
      </div>

      {/* Sync Status Toast */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <FiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── Summary Stats Cards (White, Blue, Orange, Emerald Matching Campaigns.jsx) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'Total Meta Campaigns',
            value: totalCampaignsCount,
            icon: <RiFolderChartLine className="w-4.5 h-4.5 text-blue-600" />,
            bg: BLUE_LIGHT,
            border: BLUE_BORDER,
            suffix: ' Batches'
          },
          {
            label: 'Total Leads Ingested',
            value: fmtLeads(totalLeadsAll),
            icon: <FiUsers className="w-4.5 h-4.5 text-orange-600" />,
            bg: ORANGE_LIGHT,
            border: ORANGE_BORDER,
            suffix: ' Leads'
          },
          {
            label: 'Active Calling Drives',
            value: activeDrives,
            icon: <FiActivity className="w-4.5 h-4.5 text-emerald-600" />,
            bg: '#ecfdf5',
            border: '#a7f3d0',
            suffix: ' In Progress'
          },
          {
            label: 'Average Completion',
            value: avgCompletion,
            icon: <FiTarget className="w-4.5 h-4.5 text-blue-600" />,
            bg: '#f1f5f9',
            border: BORDER,
            suffix: '%'
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border bg-white shadow-xs flex items-center gap-3 transition-transform hover:-translate-y-0.5"
            style={{ borderColor: BORDER }}
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
      <div className="p-3.5 rounded-xl border bg-white shadow-xs space-y-2.5" style={{ borderColor: BORDER }}>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div
            className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50/70 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
            style={{ borderColor: BORDER }}
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

          <FilterDropdown
            label="Last Synced"
            value={dateFilter}
            onChange={setDateFilter}
            icon={<FiCalendar className="w-3.5 h-3.5" />}
            options={['Today', 'Last 7 days', 'Last 30 days']}
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
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
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
      <div className="rounded-xl border bg-white shadow-xs overflow-hidden" style={{ borderColor: BORDER }}>
        {loading ? (
          <div className="text-center py-16">
            <FiRefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-medium text-slate-500">Loading Meta outreach campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: BLUE_LIGHT, border: `1px solid ${BLUE_BORDER}` }}
            >
              <RiFolderChartLine className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">No Meta Campaigns Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {search || statusFilter || assigneeFilter
                ? 'No campaigns matched your active filters. Try resetting the filters.'
                : 'Sync your live Google Sheets (Fetching Name, Email, Mobile, City) directly into the CRM.'}
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
                <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
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
                        <span style={{ color: sortField === col.field ? BLUE : undefined }}>{col.label}</span>
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
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
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
                              background: ORANGE_LIGHT,
                              color: ORANGE,
                              border: `1px solid ${ORANGE_BORDER}`
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
                            background: c.count > 0 ? '#ecfdf5' : ORANGE_LIGHT,
                            color: c.count > 0 ? '#059669' : ORANGE,
                            border: `1px solid ${c.count > 0 ? '#a7f3d0' : ORANGE_BORDER}`
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

      {/* Assign Members Modal */}
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
