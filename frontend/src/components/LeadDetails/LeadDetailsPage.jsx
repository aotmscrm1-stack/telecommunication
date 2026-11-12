import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, PhoneOff, Mail, MapPin, Award, IndianRupee, Globe, User, Calendar, Tag, Star, Edit3, Save, X, Plus, Clock, MessageCircle, Copy, Check, Trash2, BookOpen, Zap, Sparkles, ShieldAlert, CheckCircle2, ChevronRight, Volume2, Download, Mic, Maximize2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import api, { leadsAPI, campaignsAPI, usersAPI, coursesAPI, followupsAPI, blocklistAPI, leadStagesAPI, messageTemplatesAPI, metaLeadsAPI, recordingsAPI } from '../../services/api';
import leadNoteReminderService, { isStatusRequiringNote, leadHasNote, personDisplayName, resolveLeadReminderContext } from '../../services/leadNoteReminderService';
import { useAuth } from '../../context/AuthContext';
import { canDelete, isCEO } from '../../utils/permissions';
import StatusBadge from '../common/StatusBadge';
import AutoScrollText from '../common/AutoScrollText';
import { formatDistanceToNow, format } from 'date-fns';
import TranscriptConversationModal from '../TranscriptConversationModal';


export const POSITIVE_SUB_STATUSES = [
  "Agreed to Office visit's but no luck",
  "Interested/Need time(After few months) waiting for parents approval",
  "office visit's",
  "Demo attended",
  "Demo not attended-Call Back",
  "time issues/Fee issues",
  "Call back/We will Call"
];

// The call never connected - this is NOT a positive call summary. It gets its own
// amber "Call Not Answering" category in the Call Summary picker.
export const CALL_NOT_ANSWERING_SUB_STATUSES = [
  "Not answering-call back/whats app text"
];

export const NEGATIVE_SUB_STATUSES = [
  "Not interested/Time pass",
  "WN-SO-ON",
  "joined another institute/jobs"
];

export function isLeadPositive(lead) {
  const s = String(lead?.status || lead || '').trim();
  return s === 'Positive' || POSITIVE_SUB_STATUSES.includes(s);
}

export function isLeadNegative(lead) {
  const s = String(lead?.status || lead || '').trim();
  return s === 'Negative' || NEGATIVE_SUB_STATUSES.includes(s);
}

export function isLeadCallNotAnswering(lead) {
  const s = String(lead?.status || lead || '').trim();
  return s === 'Call Not Answering' || CALL_NOT_ANSWERING_SUB_STATUSES.includes(s);
}

// Clean zero-width, mojibake, or unformatted lead names
export function cleanLeadName(rawName) {
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

  // 3. Remove zero-width characters
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
}

// Interactive Positive / Call Not Answering / Negative Status Dropdown Component
export function MetaLeadStatusPicker({ status, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (POSITIVE_SUB_STATUSES.includes(status) || status === 'Positive') return 'positive';
    if (NEGATIVE_SUB_STATUSES.includes(status) || status === 'Negative') return 'negative';
    if (CALL_NOT_ANSWERING_SUB_STATUSES.includes(status)) return 'callNotAnswering';
    return 'positive';
  });
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isPos = status === 'Positive' || POSITIVE_SUB_STATUSES.includes(status);
  const isNeg = status === 'Negative' || NEGATIVE_SUB_STATUSES.includes(status);
  const isCna = CALL_NOT_ANSWERING_SUB_STATUSES.includes(status) || status === 'Call Not Answering';
  const displayStatus = (isPos || isNeg || isCna) ? status : 'Call Summary';

  const tabOptions =
    activeTab === 'positive'
      ? POSITIVE_SUB_STATUSES
      : activeTab === 'negative'
        ? NEGATIVE_SUB_STATUSES
        : CALL_NOT_ANSWERING_SUB_STATUSES;

  const optionTone =
    activeTab === 'positive'
      ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
      : activeTab === 'negative'
        ? 'bg-red-50 text-red-900 font-semibold border border-red-200'
        : 'bg-amber-50 text-amber-900 font-semibold border border-amber-200';
  const checkTone =
    activeTab === 'positive'
      ? 'text-emerald-600'
      : activeTab === 'negative'
        ? 'text-red-600'
        : 'text-amber-600';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
          isPos
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            : isCna
            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            : isNeg
            ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPos ? 'bg-emerald-500' : isCna ? 'bg-amber-500' : isNeg ? 'bg-red-500' : 'bg-slate-400'}`} />
        <AutoScrollText text={displayStatus} maxWidth={130} />
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 sm:w-[22rem] rounded-xl bg-white shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Top Tabs: Positive / Call Not Answering / Negative */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('positive')}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold leading-tight text-center transition-all ${activeTab === 'positive' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
            >
              Positive ({POSITIVE_SUB_STATUSES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('callNotAnswering')}
              title="Call Not Answering"
              className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold leading-tight text-center transition-all ${activeTab === 'callNotAnswering' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'}`}
            >
              Call Not Answering ({CALL_NOT_ANSWERING_SUB_STATUSES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('negative')}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold leading-tight text-center transition-all ${activeTab === 'negative' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-red-700 hover:bg-red-50'}`}
            >
              Negative ({NEGATIVE_SUB_STATUSES.length})
            </button>
          </div>

          {/* Sub-options of the selected category */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {tabOptions.map(opt => {
              const selected = status === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onStatusChange(opt); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selected ? optionTone : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="leading-snug pr-2">{opt}</span>
                  {selected && <Check className={`w-3.5 h-3.5 flex-shrink-0 ${checkTone}`} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const PALETTE = {
  navy: '#1d3557',
  cerulean: '#457b9d',
  frosted: '#a8dadc',
  honeydew: '#f1faee',
  red: '#e63946',
};

const FALLBACK_STATUSES = [
  'Fresh', 'Connected', 'Not Answered', 'Call Back', 'Call Not Responding', 'Call Back Later',
  'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost', 'Blocked'
];
const SOURCES = ['Manual', 'Facebook', 'WhatsApp', 'Website', 'Just Dial', 'Referral'];
const MODES = ['Online', 'Offline', 'Hybrid'];

function fmtDuration(sec) {
  if (!sec) return '0s';
  const m = Math.floor(sec / 60); const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function CallTimer({ onStop }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    ref.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(ref.current);
  }, []);
  return (
    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="w-3.5 h-3.5 bg-green-500 rounded-full animate-ping" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Call in progress</p>
        <p className="text-2xl font-mono font-bold text-green-800">{fmtDuration(elapsed)}</p>
      </div>
      <button onClick={() => onStop(elapsed)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
        <PhoneOff className="w-4 h-4" /> End Call
      </button>
    </div>
  );
}

// ── "Create Todo Item" Palette Constants ────────────────────────────────────
const TODO_DEEP_BLUE = '#023047';
const TODO_BLUE_GREEN = '#219ebc';
const TODO_SKY_SURFACE = '#e8f4fa';
const TODO_SKY_BLUE = '#219ebc';
const TODO_BORDER = '#bbdff0';
const TODO_INPUT_BORDER = '#d8e2eb';
const TODO_ORANGE = '#fb8500';
const TODO_MUTED = '#5b7082';

function AddNoteModal({ lead, onClose, onSubmit }) {
  const [note, setNote] = useState('');
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 460,
          padding: 24,
          boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
          border: `1px solid ${TODO_BORDER}`,
          boxSizing: 'border-box'
        }}
      >
        {/* Header — Identical to "Create Todo Item" */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
            Add Note
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 22,
              color: TODO_MUTED,
              lineHeight: 1,
              padding: 0
            }}
          >
            ×
          </button>
        </div>

        {/* Form Body — Clean vertical fields matching "Create Todo Item" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {lead?.name && (
            <div
              style={{
                background: TODO_SKY_SURFACE,
                border: `1px solid ${TODO_BORDER}`,
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: TODO_DEEP_BLUE }}>{lead.name}</div>
                {lead.phone && <div style={{ fontSize: 12, color: TODO_MUTED, marginTop: 2 }}>📞 {lead.phone}</div>}
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: `1px solid ${TODO_BORDER}`,
                  background: '#fff',
                  color: TODO_BLUE_GREEN
                }}
              >
                Note
              </span>
            </div>
          )}

          {/* Dedicated Date & Time Row (New Line) */}
          <div
            style={{
              background: '#f8fafc',
              border: `1px solid ${TODO_BORDER}`,
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12
            }}
          >
            <span style={{ color: TODO_MUTED, fontWeight: 500 }}>📅 Date & Time:</span>
            <span style={{ fontWeight: 600, color: TODO_DEEP_BLUE }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              Note Details *
            </label>
            <textarea
              rows={4}
              placeholder="Write activity note..."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13.5,
                borderRadius: 8,
                border: `1px solid ${TODO_INPUT_BORDER}`,
                background: '#f8fbfd',
                color: TODO_DEEP_BLUE,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Footer — Identical to "Create Todo Item" */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${TODO_INPUT_BORDER}`,
              background: '#fff',
              color: TODO_MUTED,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note, 'note')}
            disabled={!note.trim()}
            style={{
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              background: !note.trim() ? '#f8c284' : TODO_ORANGE,
              color: '#fff',
              cursor: !note.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            Save Note
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Initiate Call Modal ("Create Todo Item" Style — Auto-Triggers on Click) ──
function InitiateCallModal({ lead, callers, currentUser, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const autoTriggeredRef = useRef(false);

  const isStrictAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const [selectedCaller, setSelectedCaller] = useState(
    isStrictAdmin ? (lead?.assignedTo?._id || '') : (currentUser?._id || '')
  );

  const handleSend = async (overrideCallerId) => {
    if (!lead?._id) return;
    setLoading(true);
    setResult(null);
    try {
      const targetCaller = overrideCallerId !== undefined ? overrideCallerId : (selectedCaller || undefined);
      const res = await leadsAPI.initiateCall(lead._id, targetCaller);
      setResult({ success: true, message: res.data.message });
      if (onSuccess) onSuccess();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Failed to send call signal to mobile' });
    } finally {
      setLoading(false);
    }
  };

  // Automatically trigger the mobile call as soon as CALL NOW is clicked!
  useEffect(() => {
    if (!autoTriggeredRef.current && lead?._id) {
      autoTriggeredRef.current = true;
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      handleSend();
    }
  }, [lead?._id]);

  const callersList = callers.filter(c => c.role === 'employee' || c.role === 'caller');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 460,
          padding: 24,
          boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
          border: `1px solid ${TODO_BORDER}`,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
            Initiate Call Session
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: TODO_MUTED, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div
            style={{
              background: TODO_SKY_SURFACE,
              border: `1px solid ${TODO_BORDER}`,
              borderRadius: 8,
              padding: '12px 14px'
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 600, color: TODO_BLUE_GREEN, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Selected Lead
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TODO_DEEP_BLUE, marginTop: 3 }}>
              {lead?.name}
            </div>
            <div style={{ fontSize: 12.5, color: TODO_MUTED, fontFamily: 'monospace', marginTop: 2 }}>
              📞 {lead?.phone}
            </div>
            {lead?.assignedTo?.name && (
              <div style={{ fontSize: 12, color: TODO_BLUE_GREEN, fontWeight: 500, marginTop: 4 }}>
                Assigned to: {lead.assignedTo.name}
              </div>
            )}
          </div>

          {!isStrictAdmin ? (
            <div style={{ background: '#f8fbfd', border: `1px solid ${TODO_INPUT_BORDER}`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE }}>
                📱 Sending to your mobile: <strong>{currentUser?.name}</strong>
              </div>
              <div style={{ fontSize: 12, color: TODO_MUTED, marginTop: 2 }}>
                The notification will appear on your phone to dial immediately.
              </div>
            </div>
          ) : callersList.length > 0 && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
                Send Notification To
              </label>
              <select
                value={selectedCaller}
                onChange={e => setSelectedCaller(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 13.5,
                  borderRadius: 8,
                  border: `1px solid ${TODO_INPUT_BORDER}`,
                  background: '#f8fbfd',
                  color: TODO_DEEP_BLUE,
                  outline: 'none'
                }}
              >
                <option value="">-- Assigned Caller ({lead?.assignedTo?.name || 'None'}) --</option>
                {callersList.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
          )}

          {result && (
            <div
              style={{
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12.5,
                fontWeight: 500,
                background: result.success ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${result.success ? '#a7f3d0' : '#fecaca'}`,
                color: result.success ? '#065f46' : '#dc2626'
              }}
            >
              {result.success ? '✓ ' : '⚠️ '}{result.message}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${TODO_INPUT_BORDER}`,
              background: '#fff',
              color: TODO_MUTED,
              cursor: 'pointer'
            }}
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading}
            style={{
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              background: loading ? '#f8c284' : TODO_ORANGE,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Calling Mobile...' : result?.success ? '📞 Dial Again on Mobile' : 'Send Call Notification'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Callback Time Picker Modal ("Create Todo Item" Style) ────────────────────
function CallbackTimeModal({ lead, metaLeadId, campaign, currentUser, onClose, onScheduled }) {
  const PRESETS = [
    { label: '5 min', minutes: 5 },
    { label: '10 min', minutes: 10 },
    { label: '15 min', minutes: 15 },
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '1 day', minutes: 1440 },
  ];
  const [selected, setSelected] = useState(null);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const getScheduledAt = () => {
    if (selected !== null) return new Date(Date.now() + selected * 60000);
    if (manualDate && manualTime) return new Date(`${manualDate}T${manualTime}`);
    return null;
  };

  const handleSave = async () => {
    const scheduledAt = getScheduledAt();
    if (!scheduledAt || isNaN(scheduledAt.getTime())) {
      setError('Please select a time or enter a valid date/time.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const filledByName = currentUser?.name || 'Agent';
      const personName = lead.name || 'Lead';
      const res = await followupsAPI.create({
        lead: lead._id,
        metaLeadId: metaLeadId || undefined,
        leadName: personName,
        leadPhone: lead.phone || '',
        campaign: campaign || '',
        filledByName,
        assignedTo: lead.assignedTo?._id || currentUser?._id,
        scheduledAt: scheduledAt.toISOString(),
        type: 'call_followup',
        status: 'upcoming',
        note: note || ('Callback scheduled for ' + personName),
      });

      const campaignName = campaign || lead.campaign?.name || lead.campaign || '';
      const toastPayload = res.data?.callbackToastPayload || {
        followupId: res.data?.followup?._id || String(Date.now()),
        leadId: String(lead._id || metaLeadId || ''),
        metaLeadId: metaLeadId ? String(metaLeadId) : '',
        leadName: personName,
        leadPhone: lead.phone || '',
        campaign: campaignName,
        filledById: String(currentUser?._id || ''),
        filledByName,
        counsellorName: currentUser?.name || filledByName || 'Counsellor',
        assignedToId: String(lead.assignedTo?._id || currentUser?._id || ''),
        assignedToName: lead.assignedTo?.name || filledByName,
        scheduledAt: scheduledAt.toISOString(),
        note: note || ('Callback scheduled for ' + personName),
      };
      leadNoteReminderService.triggerCallbackToast(toastPayload, { isImmediate: true });

      onScheduled(res.data.followup, scheduledAt);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule callback');
    } finally {
      setSaving(false);
    }
  };

  const scheduledAt = getScheduledAt();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 460,
          padding: 24,
          boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
          border: `1px solid ${TODO_BORDER}`,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
            Call Back Later
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: TODO_MUTED, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div
            style={{
              background: TODO_SKY_SURFACE,
              border: `1px solid ${TODO_BORDER}`,
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: TODO_BLUE_GREEN, textTransform: 'uppercase' }}>Person Name (Lead)</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: TODO_DEEP_BLUE, marginTop: 1 }}>{lead.name}</div>
              {lead.phone && <div style={{ fontSize: 12, color: TODO_MUTED, marginTop: 2 }}>📞 {lead.phone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TODO_MUTED, textTransform: 'uppercase' }}>Form Fill By</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: TODO_DEEP_BLUE, marginTop: 1 }}>{currentUser?.name || 'Agent'}</div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              Quick Presets
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PRESETS.map(p => {
                const active = selected === p.minutes;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setSelected(p.minutes); setManualDate(''); setManualTime(''); }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 500,
                      border: `1px solid ${active ? TODO_BLUE_GREEN : TODO_INPUT_BORDER}`,
                      background: active ? TODO_SKY_SURFACE : '#f8fbfd',
                      color: active ? TODO_DEEP_BLUE : TODO_MUTED,
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
                Callback Date
              </label>
              <input
                type="date"
                value={manualDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { setManualDate(e.target.value); setSelected(null); }}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${TODO_INPUT_BORDER}`,
                  background: '#f8fbfd',
                  color: TODO_DEEP_BLUE,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
                Callback Time
              </label>
              <input
                type="time"
                value={manualTime}
                onChange={e => { setManualTime(e.target.value); setSelected(null); }}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${TODO_INPUT_BORDER}`,
                  background: '#f8fbfd',
                  color: TODO_DEEP_BLUE,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              Callback Note
            </label>
            <textarea
              rows={2}
              placeholder="Add a reminder note (optional)..."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: `1px solid ${TODO_INPUT_BORDER}`,
                background: '#f8fbfd',
                color: TODO_DEEP_BLUE,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {scheduledAt && !isNaN(scheduledAt.getTime()) && (
            <div style={{ background: TODO_SKY_SURFACE, border: `1px solid ${TODO_BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: TODO_DEEP_BLUE, fontWeight: 500 }}>
              ⏰ Callback at: <strong>{scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${TODO_INPUT_BORDER}`,
              background: '#fff',
              color: TODO_MUTED,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !scheduledAt || isNaN(scheduledAt?.getTime())}
            style={{
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              background: (saving || !scheduledAt || isNaN(scheduledAt?.getTime())) ? '#f8c284' : TODO_ORANGE,
              color: '#fff',
              cursor: (saving || !scheduledAt || isNaN(scheduledAt?.getTime())) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Schedule Callback'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Schedule Demo Date Modal ("Create Todo Item" Style) ──────────────────────
function ScheduleDemoModal({ lead, onClose, onSave }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const [date, setDate] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [time, setTime] = useState(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!date || !time) { setError('Please pick a date and time for the demo.'); return; }
    const demoScheduledDate = new Date(`${date}T${time}`);
    if (isNaN(demoScheduledDate.getTime())) { setError('Invalid date/time.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(demoScheduledDate);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule demo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 440,
          padding: 24,
          boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
          border: `1px solid ${TODO_BORDER}`,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
            Schedule Demo
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: TODO_MUTED, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ background: TODO_SKY_SURFACE, border: `1px solid ${TODO_BORDER}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: TODO_DEEP_BLUE }}>{lead.name}</div>
            <div style={{ fontSize: 12, color: TODO_MUTED, marginTop: 2 }}>📞 {lead.phone}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
                Demo Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${TODO_INPUT_BORDER}`,
                  background: '#f8fbfd',
                  color: TODO_DEEP_BLUE,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
                Demo Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${TODO_INPUT_BORDER}`,
                  background: '#f8fbfd',
                  color: TODO_DEEP_BLUE,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: '#dc2626' }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${TODO_INPUT_BORDER}`,
              background: '#fff',
              color: TODO_MUTED,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              background: saving ? '#f8c284' : TODO_ORANGE,
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Schedule Demo'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Send WhatsApp Template Modal ("Create Todo Item" Style) ──────────────────
function SendWhatsAppTemplateModal({ lead, metaLeadId, onClose, onSuccess }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await messageTemplatesAPI.getAll();
        const waTemplates = (res.data?.templates || res.data || []).filter(t => t.type === 'whatsapp' || t.category || t.components);
        setTemplates(waTemplates);
        if (waTemplates.length > 0) setSelectedTemplate(waTemplates[0]);
      } catch (err) {
        console.error('Failed to load templates', err);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setSending(true);
    setError('');
    setSuccessMsg('');
    try {
      const templateName = selectedTemplate.metaTemplateName || selectedTemplate.shortcut || selectedTemplate.name;
      const languageCode = selectedTemplate.language || selectedTemplate.languageCode || 'en_US';

      let bodyText = selectedTemplate.message || selectedTemplate.content || '';
      bodyText = bodyText.replace(/\{\{\s*name\s*\}\}/gi, lead.name || 'Student');

      const headerImageUrl = selectedTemplate.mediaUrl || selectedTemplate.imageUrl || null;

      const res = await api.post('/integrations/whatsapp/send-template-direct', {
        leadId: lead._id,
        metaLeadId: metaLeadId || undefined,
        leadName: lead.name,
        to: lead.phone,
        templateName,
        languageCode,
        headerImageUrl,
        messageText: bodyText,
      });

      setSuccessMsg(`Successfully sent WhatsApp template "${selectedTemplate.name || selectedTemplate.shortcut}" to ${lead.name}!`);
      if (onSuccess) onSuccess(res.data);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      const serverErrorMsg = err.response?.data?.message || err.message || 'Failed to send template message';
      setError(serverErrorMsg);
    } finally {
      setSending(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const name = (t.name || t.shortcut || '').toLowerCase();
    const msg = (t.message || t.content || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || msg.includes(q);
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 490,
          padding: 24,
          boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
          border: `1px solid ${TODO_BORDER}`,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
            Send WhatsApp Template
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: TODO_MUTED, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
          <div style={{ background: TODO_SKY_SURFACE, border: `1px solid ${TODO_BORDER}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: TODO_DEEP_BLUE }}>To: {lead.name}</div>
            <div style={{ fontSize: 12, color: TODO_MUTED, marginTop: 2 }}>📞 {lead.phone}</div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}
          {successMsg && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#065f46', fontWeight: 500 }}>
              ✅ {successMsg}
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              Search Template
            </label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by template name or content..."
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: `1px solid ${TODO_INPUT_BORDER}`,
                background: '#f8fbfd',
                color: TODO_DEEP_BLUE,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-gray-400">
              <div className="w-6 h-6 spinner-gradient mx-auto mb-2" />
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium">No WhatsApp templates available.</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Create templates in Message Templates module.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredTemplates.map(t => {
                const isSelected = (selectedTemplate?._id && selectedTemplate?._id === t._id) || (selectedTemplate?.shortcut && selectedTemplate?.shortcut === t.shortcut);
                const isMediaHeader = t.headerType === 'Media' || t.components?.some(c => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format));
                const imageUrl = t.mediaUrl || t.imageUrl;
                return (
                  <div
                    key={t._id || t.name}
                    onClick={() => setSelectedTemplate(t)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? TODO_BLUE_GREEN : TODO_INPUT_BORDER}`,
                      background: isSelected ? TODO_SKY_SURFACE : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontWeight: 600, fontSize: 12.5, color: TODO_DEEP_BLUE }}>
                        {t.name || t.shortcut}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: TODO_BLUE_GREEN, textTransform: 'uppercase' }}>
                        {t.category || t.language || 'Utility'}
                      </span>
                    </div>

                    {isMediaHeader && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-sky-200 bg-gray-900 max-h-24 flex items-center justify-center">
                        {imageUrl ? (
                          <img src={imageUrl} alt="Header" className="w-full object-cover h-20" />
                        ) : (
                          <div className="text-[10px] text-white/70 py-2">📷 Media Header Attached</div>
                        )}
                      </div>
                    )}

                    <p style={{ fontSize: 12, color: TODO_MUTED, margin: 0 }} className="line-clamp-2">
                      {t.message || t.content || 'Template message content'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: `1px solid ${TODO_INPUT_BORDER}`,
              background: '#fff',
              color: TODO_MUTED,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !selectedTemplate}
            style={{
              padding: '9px 20px',
              fontSize: 13.5,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              background: (sending || !selectedTemplate) ? '#f8c284' : TODO_ORANGE,
              color: '#fff',
              cursor: (sending || !selectedTemplate) ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? 'Sending...' : 'Send Template Now'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── AI State Banner ───────────────────────────────────────────────────────────
// Shows a non-intrusive info strip when the lead is currently being handled
// by the AI engine (locked = actively calling; queued = waiting for a slot).
function AIStateBanner({ lead }) {
  const isLocked = lead?.aiLock?.expiresAt && new Date(lead.aiLock.expiresAt) > new Date();
  const isQueued = !isLocked && lead?.aiCallState === 'queued';

  if (!isLocked && !isQueued) return null;

  if (isLocked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#f0fdf4', border: '1px solid #86efac',
        borderRadius: 10, padding: '8px 14px', margin: '0 0 4px',
      }}>
        {/* pulsing green dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0,
          boxShadow: '0 0 0 3px #bbf7d0',
          animation: 'aibanner-pulse 1.5s infinite',
        }} />
        <style>{`@keyframes aibanner-pulse{0%,100%{box-shadow:0 0 0 0 #bbf7d0}50%{box-shadow:0 0 0 5px #bbf7d000}}`}</style>
        <div className="flex-1">
          <span className="text-xs font-bold text-green-800">🤖 AI is calling this lead right now</span>
          {lead.aiLock.lockedBy && lead.aiLock.lockedBy !== 'ai-engine' && (
            <span className="text-xs text-green-600 ml-2">· locked by {lead.aiLock.lockedBy}</span>
          )}
        </div>
        <span className="text-[10px] text-green-600 font-semibold whitespace-nowrap">
          Until {format(new Date(lead.aiLock.expiresAt), 'hh:mm a')}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#eff6ff', border: '1px solid #bfdbfe',
      borderRadius: 10, padding: '8px 14px', margin: '0 0 4px',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span className="text-xs font-bold text-blue-800">Queued for AI callback</span>
      <span className="text-[10px] text-blue-500 ml-auto">Waiting for an available AI slot</span>
    </div>
  );
}

// ── Call Summary Detail Modal ("Create Todo Item" Style) ─────────────────────
function CallSummaryDetailModal({ activity, lead, onClose, onInitiateCall, onScheduleCallback, canDelete, onDelete }) {
  const [copied, setCopied] = useState(false);
  if (!activity) return null;

  const isRecording = Boolean(activity._recording);
  const isFollowup = Boolean(activity._followup);
  const isCall = activity.type === 'call';

  const title = isRecording
    ? 'Audio Recording Details'
    : isFollowup
    ? 'Call Back Reminder Details'
    : 'Note & Remarks Details';

  const summaryText =
    activity.description ||
    activity.note ||
    activity.rec?.transcript ||
    (isFollowup ? 'Call Back reminder scheduled for lead.' : 'No notes recorded.');

  const handleCopy = () => {
    navigator.clipboard?.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 490,
          padding: 24,
          boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
          border: `1px solid ${TODO_BORDER}`,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: TODO_MUTED, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              background: TODO_SKY_SURFACE,
              border: `1px solid ${TODO_BORDER}`,
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: TODO_DEEP_BLUE }}>{lead?.name}</div>
              {lead?.phone && <div style={{ fontSize: 12, color: TODO_MUTED, marginTop: 2 }}>📞 {lead?.phone}</div>}
            </div>
            <span
              style={{
                padding: '2px 8px',
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 4,
                border: `1px solid ${TODO_BORDER}`,
                background: '#fff',
                color: TODO_BLUE_GREEN
              }}
            >
              {isRecording ? 'Voice Call' : isFollowup ? 'Callback' : isCall ? 'Logged Call' : 'Activity Note'}
            </span>
          </div>

          {/* Timing & Agent Details */}
          <div style={{ background: '#f8fbfd', border: `1px solid ${TODO_INPUT_BORDER}`, borderRadius: 8, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
            <div>
              <span style={{ color: TODO_MUTED, display: 'block', fontSize: 11, fontWeight: 500 }}>Logged By</span>
              <span style={{ fontWeight: 600, color: TODO_DEEP_BLUE }}>
                {activity.performedBy?.name || activity.rec?.user?.name || 'Agent'}
              </span>
            </div>
            <div>
              <span style={{ color: TODO_MUTED, display: 'block', fontSize: 11, fontWeight: 500 }}>Date & Time</span>
              <span style={{ fontWeight: 600, color: TODO_DEEP_BLUE }}>
                {activity.createdAt ? format(new Date(activity.createdAt), 'dd MMM yyyy, hh:mm a') : 'Recent'}
              </span>
            </div>
            {isFollowup && activity.scheduledAt && (
              <div className="col-span-2" style={{ background: TODO_SKY_SURFACE, padding: '8px 10px', borderRadius: 6, border: `1px solid ${TODO_BORDER}`, color: TODO_DEEP_BLUE, fontWeight: 500 }}>
                ⏰ Reminder scheduled for: <strong>{format(new Date(activity.scheduledAt), 'dd MMM yyyy, hh:mm a')}</strong>
              </div>
            )}
          </div>

          {/* Audio Player if recording */}
          {isRecording && (activity.rec?.streamUrl || activity.rec?.url) && (
            <div style={{ background: '#f8fbfd', border: `1px solid ${TODO_INPUT_BORDER}`, borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
                Call Audio Recording
              </span>
              <audio
                controls
                preload="metadata"
                className="w-full h-9 rounded-lg"
                src={activity.rec.streamUrl || activity.rec.url}
              >
                Audio not supported
              </audio>
            </div>
          )}

          {/* Full Call Summary / Discussion Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE }}>
                Summary & Discussion
              </label>
              <button
                type="button"
                onClick={handleCopy}
                style={{ fontSize: 11.5, fontWeight: 600, color: TODO_BLUE_GREEN, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: 13, color: TODO_DEEP_BLUE, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: '#f8fbfd', padding: '10px 12px', borderRadius: 8, border: `1px solid ${TODO_INPUT_BORDER}` }}>
              {summaryText}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <div className="flex items-center gap-2">
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(activity)}
                style={{
                  padding: '8px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: '1px solid #fecdd3',
                  background: '#fff1f2',
                  color: '#e11d48',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Delete this history record (Admin Only)"
              >
                <Trash2 style={{ width: 14, height: 14 }} /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={onInitiateCall}
              style={{
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 8,
                border: `1px solid ${TODO_BORDER}`,
                background: TODO_SKY_SURFACE,
                color: TODO_DEEP_BLUE,
                cursor: 'pointer'
              }}
            >
              📞 Call Again
            </button>
            <button
              type="button"
              onClick={onScheduleCallback}
              style={{
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 8,
                border: `1px solid ${TODO_INPUT_BORDER}`,
                background: '#f8fbfd',
                color: TODO_DEEP_BLUE,
                cursor: 'pointer'
              }}
            >
              ⏰ Schedule Callback
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              background: TODO_ORANGE,
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function LeadDetailsPage({
  leadId,
  embedded = false,
  showBackButton = !embedded,
  backLabel = 'Back to Leads',
  onBack,
  onDeleted,
  onChange,
  isMetaLead = false,
  metaLeadId = null,
  metaLeadData = null,
}) {
  const id = leadId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'manager' || user?.role === 'admin';
  const isCaller = user?.role === 'employee' || user?.role === 'caller';
  const canDeleteHistory = Boolean(user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user));
  const [deletingActivityId, setDeletingActivityId] = useState(null);

  const [lead, setLead] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [callers, setCallers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [leadFollowups, setLeadFollowups] = useState([]);
  const [statuses, setStatuses] = useState(FALLBACK_STATUSES);

  const [isCalling, setIsCalling] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [runCallIqActivityId, setRunCallIqActivityId] = useState(null);
  const [showInitiateCallModal, setShowInitiateCallModal] = useState(false);
  const [showSendTemplateModal, setShowSendTemplateModal] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockEntryId, setBlockEntryId] = useState(null);
  const [selectedCallSummaryActivity, setSelectedCallSummaryActivity] = useState(null);
  const [blockingAction, setBlockingAction] = useState(false);
  const [activeConversationRecording, setActiveConversationRecording] = useState(null);

  const [activityFilter, setActivityFilter] = useState('all');

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  const isMeta = isMetaLead || Boolean(metaLeadId) || Boolean(metaLeadData) || String(lead?.source || '').toLowerCase().includes('meta');
  const metaRaw = metaLeadData?.rawData || lead?.rawData || {};
  const rawLeadName = (lead?.name && lead.name !== 'Unknown Lead')
    ? lead.name
    : (metaLeadData?.fullName || metaRaw.full_name || metaRaw.fullName || metaRaw.Name || metaRaw.name || metaRaw['Candidate Name'] || metaRaw['Student Name'] || metaRaw['Bhavani'] || metaRaw['Aman Shaik'] || lead?.name || '—');
  const leadName = (rawLeadName && rawLeadName !== '—') ? (cleanLeadName(rawLeadName) || rawLeadName) : '—';
  const leadPhone = lead?.phone || metaLeadData?.phone || metaRaw.phone || metaRaw.Phone || metaRaw.phone_number || metaRaw.Mobile || metaRaw.mobile || '—';
  
  const leadEmail = (() => {
    if (lead?.email && lead.email !== '—' && lead.email.includes('@')) return lead.email;
    if (metaLeadData?.email && metaLeadData.email !== '—' && metaLeadData.email.includes('@')) return metaLeadData.email;
    if (metaRaw.email && typeof metaRaw.email === 'string' && metaRaw.email.includes('@')) return metaRaw.email.trim();
    if (metaRaw.Email && typeof metaRaw.Email === 'string' && metaRaw.Email.includes('@')) return metaRaw.Email.trim();
    for (const [k, v] of Object.entries(metaRaw)) {
      if (typeof v === 'string' && v.includes('@')) return v.trim();
    }
    return '—';
  })();

  const leadCity = (() => {
    if (lead?.location && lead.location !== '—') return lead.location;
    if (metaLeadData?.city && metaLeadData.city !== '—') return metaLeadData.city;
    if (metaRaw.city && metaRaw.city.toLowerCase() !== 'city') return metaRaw.city;
    if (metaRaw.City && metaRaw.City.toLowerCase() !== 'city') return metaRaw.City;
    if (metaRaw.location && metaRaw.location.toLowerCase() !== 'location') return metaRaw.location;
    if (metaRaw.Location && metaRaw.Location.toLowerCase() !== 'location') return metaRaw.Location;
    if (metaRaw.town) return metaRaw.town;
    if (metaRaw.Town) return metaRaw.Town;
    for (const [k, v] of Object.entries(metaRaw)) {
      if (typeof v === 'string' && v.trim()) {
        const lk = k.toLowerCase().trim();
        if ((lk === 'city' || lk === 'location' || lk === 'town' || lk.includes('city')) && v.trim().toLowerCase() !== 'city' && v.trim().toLowerCase() !== 'location') {
          return v.trim();
        }
      }
    }
    return '—';
  })();

  const leadInterested = (() => {
    if (lead?.interested && lead.interested !== '—') return lead.interested;
    if (lead?.course && lead.course !== '—') return lead.course;
    if (metaLeadData?.interested && metaLeadData.interested !== '—') return metaLeadData.interested;
    if (metaLeadData?.course && metaLeadData.course !== '—') return metaLeadData.course;
    const rawCandidates = [
      metaRaw.interested,
      metaRaw.Interested,
      metaRaw.intersted,
      metaRaw.Intersted,
      metaRaw.course,
      metaRaw.Course,
      metaRaw['Interested In'],
      metaRaw['interested_in'],
      metaRaw['which_sap_module_are_you_interested_in'],
      metaRaw['which_sap_module_are_you_interested_in?'],
      metaRaw.subject,
      metaRaw.program,
      metaRaw.module,
    ];
    for (const c of rawCandidates) {
      if (typeof c === 'string' && c.trim() && !['interested', 'intersted', 'course', 'subject'].includes(c.trim().toLowerCase())) {
        return c.trim();
      }
    }
    for (const [k, v] of Object.entries(metaRaw)) {
      if (typeof v === 'string' && v.trim()) {
        const lk = k.toLowerCase().trim();
        if ((lk.includes('interest') || lk.includes('interst') || lk.includes('course') || lk.includes('module') || lk.includes('program')) && !['interested', 'intersted', 'course'].includes(v.trim().toLowerCase())) {
          return v.trim();
        }
      }
    }
    return '—';
  })();

  const fetchLeadDetails = async () => {
    try {
      const isRandom = id === 'random';
      const [res, followupsRes] = await Promise.all([
        isRandom ? leadsAPI.getRandom() : leadsAPI.getOne(id).catch(async (err) => {
          if (metaLeadData || isMeta) {
            return {
              data: {
                lead: {
                  _id: metaLeadData?._id || id,
                  name: cleanLeadName(metaLeadData?.fullName || metaRaw.full_name || metaRaw.Name || metaRaw['Bhavani'] || metaRaw['Aman Shaik'] || '—') || '—',
                  phone: metaLeadData?.phone || metaRaw.phone || metaRaw.phone_number || '—',
                  email: metaLeadData?.email || metaRaw.email || '—',
                  location: metaLeadData?.city || metaRaw.city || '—',
                  interested: metaLeadData?.interested || metaRaw.interested || metaRaw.Interested || (leadInterested !== '—' ? leadInterested : ''),
                  status: metaLeadData?.status || 'New',
                  rating: metaLeadData?.rating || 0,
                  leadSource: 'Meta Lead',
                  rawData: metaLeadData?.rawData || {},
                  campaign: metaLeadData?.campaign ? { name: metaLeadData.campaign } : null,
                  assignedTo: metaLeadData?.assignedTo || null,
                },
                recordings: []
              }
            };
          }
          try {
            const metaRes = await metaLeadsAPI.getOne(id);
            if (metaRes?.data?.lead) {
              return { data: { lead: metaRes.data.lead, recordings: [] } };
            }
          } catch (_) {}
          return { data: { lead: null, recordings: [] } };
        }),
        isRandom ? Promise.resolve({ data: { followups: [] } }) : followupsAPI.getAll({ leadId: id }).catch(() => ({ data: { followups: [] } })),
      ]);
      setLead(res.data.lead);
      setRecordings(res.data.recordings || []);
      setLeadFollowups(followupsRes.data?.followups || []);
      const l = res.data.lead || {};
      setEditForm({
        name: cleanLeadName((l.name && l.name !== 'Unknown Lead') ? l.name : (metaLeadData?.fullName || metaRaw.full_name || metaRaw.fullName || metaRaw.Name || metaRaw.name || l.name || '')),
        phone: l.phone || metaLeadData?.phone || metaRaw.phone || metaRaw.Phone || '',
        alternatePhone: l.alternatePhone || '',
        email: l.email || metaLeadData?.email || metaRaw.email || metaRaw.Email || '',
        status: l.status || metaLeadData?.status || 'Fresh',
        rating: l.rating || metaLeadData?.rating || 0,
        leadSource: l.leadSource || (isMeta ? 'Meta Lead' : 'Manual'),
        courseInterest: l.courseInterest?._id || l.courseInterest || '',
        interested: l.interested || metaLeadData?.interested || (leadInterested !== '—' ? leadInterested : ''),
        mode: l.mode || '',
        budget: l.budget > 0 ? l.budget : '',
        location: l.location || (leadCity !== '—' ? leadCity : ''),
        lastQualification: l.lastQualification || '',
        assignedTo: l.assignedTo?._id || '',
        campaign: l.campaign?._id || '',
      });
    } catch (err) {
      console.warn('Failed to load lead details from CRM API:', err?.message);
      if (metaLeadData) {
        const synth = {
          _id: metaLeadData._id,
          name: cleanLeadName(metaLeadData.fullName || metaRaw.full_name || metaRaw.Name || metaRaw['Bhavani'] || metaRaw['Aman Shaik'] || '—') || '—',
          phone: metaLeadData.phone || metaRaw.phone || metaRaw.phone_number || '—',
          email: metaLeadData.email || metaRaw.email || '—',
          location: metaLeadData.city || metaRaw.city || '—',
          interested: metaLeadData.interested || metaRaw.interested || metaRaw.Interested || (leadInterested !== '—' ? leadInterested : ''),
          status: metaLeadData.status || 'New',
          rating: metaLeadData.rating || 0,
          leadSource: 'Meta Lead',
          rawData: metaLeadData.rawData || {},
          campaign: metaLeadData.campaign ? { name: metaLeadData.campaign } : null,
          assignedTo: metaLeadData.assignedTo || null,
        };
        setLead(synth);
        setEditForm({
          name: synth.name !== '—' ? synth.name : '',
          phone: synth.phone !== '—' ? synth.phone : '',
          email: synth.email !== '—' ? synth.email : '',
          status: synth.status,
          rating: synth.rating,
          location: synth.location !== '—' ? synth.location : '',
          interested: synth.interested !== '—' ? synth.interested : '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
    campaignsAPI.getAll().then(res => setCampaigns(res.data.campaigns || [])).catch(console.error);
    coursesAPI.getAll().then(res => setCourses(res.data.courses || [])).catch(console.error);
    usersAPI.getAll().then(res => {
      setCallers((res.data.users || []).filter(u => u.role === 'employee' || u.role === 'caller' || u.role === 'manager' || u.role === 'admin'));
    }).catch(console.error);
    leadStagesAPI.get().then(res => {
      const active = (res.data.config?.statuses || [])
        .filter(s => !s.archived)
        .sort((a, b) => a.order - b.order)
        .map(s => s.name);
      if (active.length) setStatuses(active);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    const phoneToCheck = (leadPhone && leadPhone !== '—') ? leadPhone : lead?.phone;
    if (!phoneToCheck || phoneToCheck === '—') {
      setIsBlocked(lead?.status === 'Blocked' || metaLeadData?.status === 'Blocked');
      return;
    }
    blocklistAPI.check(phoneToCheck).then(res => {
      setIsBlocked(Boolean(res.data.blocked || lead?.status === 'Blocked' || metaLeadData?.status === 'Blocked'));
      setBlockEntryId(res.data.entry?._id || null);
    }).catch(() => {
      setIsBlocked(Boolean(lead?.status === 'Blocked' || metaLeadData?.status === 'Blocked'));
    });
  }, [lead?.phone, leadPhone, lead?.status, metaLeadData?.status]);

  // Reload lead details when a note or profile is updated via global modal
  useEffect(() => {
    const handleCrmLeadUpdated = (e) => {
      const targetId = e.detail?.leadId;
      const currentId = lead?._id || metaLeadId || id;
      if (!targetId || String(targetId) === String(lead?._id) || String(targetId) === String(metaLeadId) || String(targetId) === String(id) || String(targetId) === String(currentId)) {
        fetchLeadDetails();
      }
    };
    window.addEventListener('crm:lead-updated', handleCrmLeadUpdated);
    return () => window.removeEventListener('crm:lead-updated', handleCrmLeadUpdated);
  }, [lead?._id, metaLeadId, id]);

  // Open Add Note Modal if triggered from Sonner reminder toast or custom event
  useEffect(() => {
    const handleOpenNoteModal = (e) => {
      const targetId = e.detail?.leadId;
      if (!targetId || targetId === lead?._id || targetId === metaLeadId || targetId === id) {
        setShowNoteModal(true);
      }
    };
    window.addEventListener('open-lead-note-modal', handleOpenNoteModal);
    return () => window.removeEventListener('open-lead-note-modal', handleOpenNoteModal);
  }, [lead?._id, metaLeadId, id]);

  // Sync reminder tracking when lead loads or updates
  useEffect(() => {
    if (!lead) return;
    const currentId = lead._id || metaLeadId || id;
    if (isStatusRequiringNote(lead.status)) {
      if (leadHasNote(lead)) {
        leadNoteReminderService.resolveLead(currentId, leadName || lead.name);
      } else {
        // Counsellor = author of the recorded call summary, else the assigned counsellor.
        // The viewer is never used here, so an Admin/Manager opening the page does not
        // overwrite the reminder with their own name.
        const reminderContext = resolveLeadReminderContext(lead, {
          currentUser: user,
          campaignFallback: metaLeadData?.campaign,
          allowViewerFallback: false,
        });

        leadNoteReminderService.trackLead({
          id: currentId,
          name: leadName || lead.name,
          status: lead.status,
          ...reminderContext,
          hasExistingNote: false,
          isRemoteBroadcast: true,
        });
      }
    } else {
      leadNoteReminderService.resolveLead(currentId, leadName || lead.name);
    }
  }, [lead?.status, lead?.activities?.length, lead?.callNotes?.length, lead?._id, metaLeadId, id, leadName]);

  const handleBlockToggle = async () => {
    setBlockingAction(true);
    const targetPhone = (leadPhone && leadPhone !== '—') ? leadPhone : lead?.phone;
    const targetName = (leadName && leadName !== '—') ? leadName : lead?.name;
    const targetMetaId = metaLeadId || (isMetaLead ? id : null);
    try {
      if (isBlocked) {
        if (blockEntryId) {
          await blocklistAPI.remove(blockEntryId).catch(() => {});
        }
        if (targetPhone && targetPhone !== '—') {
          await blocklistAPI.removeByPhone(targetPhone).catch(() => {});
        }
        if (targetMetaId) {
          await metaLeadsAPI.update(targetMetaId, { status: 'New' }).catch(() => {});
        }
        if (lead?._id && lead.status === 'Blocked') {
          await leadsAPI.updateStatus(lead._id, { status: 'Fresh' }).catch(() => {});
        }
        const restoredStatus = isMeta ? 'New' : 'Fresh';
        setLead(prev => prev ? { ...prev, status: prev.status === 'Blocked' ? restoredStatus : prev.status } : prev);
        setIsBlocked(false);
        setBlockEntryId(null);
        onChange?.({ ...(lead || {}), _id: targetMetaId || lead?._id, status: restoredStatus, isBlocked: false });
        window.dispatchEvent(new CustomEvent('meta-lead-blocklist-changed', { detail: { phone: targetPhone, blocked: false } }));
      } else {
        if (targetPhone && targetPhone !== '—') {
          const res = await blocklistAPI.add({ phone: targetPhone, name: targetName, reason: 'Blocked from Meta Leads Campaign' });
          setBlockEntryId(res.data.entry?._id || null);
        }
        if (targetMetaId) {
          await metaLeadsAPI.update(targetMetaId, { status: 'Blocked' }).catch(() => {});
        }
        if (lead?._id && !isMeta) {
          await leadsAPI.updateStatus(lead._id, { status: 'Blocked' }).catch(() => {});
        }
        setLead(prev => prev ? { ...prev, status: 'Blocked' } : prev);
        setIsBlocked(true);
        onChange?.({ ...(lead || {}), _id: targetMetaId || lead?._id, status: 'Blocked', isBlocked: true });
        window.dispatchEvent(new CustomEvent('meta-lead-blocklist-changed', { detail: { phone: targetPhone, blocked: true } }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (err.response?.status === 400 && err.response?.data?.entry) {
        setIsBlocked(true);
        setBlockEntryId(err.response.data.entry._id);
      } else {
        alert(isBlocked ? 'Failed to unblock: ' + msg : 'Failed to block: ' + msg);
      }
    } finally {
      setBlockingAction(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleToggleStar = async () => {
    try {
      const res = await leadsAPI.update(lead._id, { isStarred: !lead.isStarred });
      setLead(prev => ({ ...prev, isStarred: res.data.lead.isStarred }));
      onChange?.(res.data.lead);
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Demo Scheduled') {
      setShowDemoModal(true);
      return;
    }
    try {
      const targetMetaId = metaLeadId || (isMetaLead ? id : null);
      if (targetMetaId) {
        await metaLeadsAPI.update(targetMetaId, { status: newStatus }).catch(() => {});
      }
      let updated = null;
      if (lead?._id) {
        try {
          const res = await leadsAPI.updateStatus(lead._id, { status: newStatus });
          updated = res.data.lead;
        } catch (_) {}
      }
      if (!updated) {
        updated = { ...(lead || {}), status: newStatus };
      }
      setLead(updated);
      setEditForm(prev => ({ ...prev, status: newStatus }));
      onChange?.(updated);

      // Track 10-minute note reminder for positive call summary
      const currentId = updated?._id || targetMetaId || id;
      if (isStatusRequiringNote(newStatus)) {
        // The counsellor who just recorded the summary owns the reminder. An
        // Admin/Director never does the calls, so for them the reminder is handed
        // to whoever actually made the call-summary change on the lead.
        const reminderLead = {
          ...(lead || {}),
          ...(updated || {}),
          activities: updated?.activities?.length ? updated.activities : lead?.activities,
          callNotes: updated?.callNotes?.length ? updated.callNotes : lead?.callNotes,
        };
        const reminderContext = resolveLeadReminderContext(reminderLead, {
          currentUser: user,
          campaignFallback: updated?.campaign?.name || updated?.campaign || metaLeadData?.campaign,
          preferViewer: true,
        });

        leadNoteReminderService.trackLead({
          id: currentId,
          name: leadName || updated.name,
          status: newStatus,
          ...reminderContext,
          hasExistingNote: leadHasNote(updated),
        });
      } else {
        leadNoteReminderService.resolveLead(currentId, leadName || updated?.name);
      }
    } catch (err) { console.error(err); }
  };

  const handleScheduleDemo = async (demoScheduledDate) => {
    const res = await leadsAPI.updateStatus(lead._id, { status: 'Demo Scheduled', demoScheduledDate: demoScheduledDate.toISOString() });
    setLead(res.data.lead);
    setEditForm(prev => ({ ...prev, status: 'Demo Scheduled' }));
    setShowDemoModal(false);
    onChange?.(res.data.lead);
  };

  const handleRatingChange = async (newRating) => {
    try {
      const res = await leadsAPI.update(lead._id, { rating: newRating });
      setLead(res.data.lead);
      setEditForm(prev => ({ ...prev, rating: newRating }));
      onChange?.(res.data.lead);
    } catch (err) { console.error(err); }
  };

  const handleDeleteLead = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      const targetMetaId = metaLeadId || (isMeta ? id : null);
      if (targetMetaId) {
        await metaLeadsAPI.delete(targetMetaId).catch(() => {});
      }
      if (lead?._id) {
        await leadsAPI.delete(lead._id).catch(() => {});
      }
      if (onDeleted) onDeleted(); else navigate('/leads');
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete lead'); }
  };

  const handleStartCall = () => { if (!isCalling) setIsCalling(true); };

  const handleCallEnded = async (duration) => {
    setIsCalling(false);
    setSavingInfo(true);
    try {
      await leadsAPI.logCall(lead._id, { duration, callStatus: 'connected', note: 'Autologged duration call' });
      await fetchLeadDetails();
    } catch (err) { console.error(err); }
    finally { setSavingInfo(false); }
  };

  const handleCallbackScheduled = async (followup, scheduledAt) => {
    setShowCallbackModal(false);
    try {
      if (!isMeta) {
        await leadsAPI.updateStatus(lead._id, { status: 'Call Back Later' });
      }
      await fetchLeadDetails();
    } catch (err) { console.error(err); }
  };

  const handleAddNote = async (note, type = 'note') => {
    setSavingInfo(true);
    try {
      const targetMetaId = metaLeadId || (isMetaLead ? id : null);
      if (lead?._id) {
        await leadsAPI.addNote(lead._id, { note, type: 'note' }).catch(() => {});
      }
      let updatedMetaLead = null;
      if (targetMetaId) {
        const metaRes = await metaLeadsAPI.update(targetMetaId, { note }).catch(() => null);
        updatedMetaLead = metaRes?.data?.lead || null;
      }
      setShowNoteModal(false);
      await fetchLeadDetails();
      if (updatedMetaLead) {
        setLead(prev => prev ? { ...prev, callNotes: updatedMetaLead.callNotes || prev.callNotes } : prev);
        onChange?.(updatedMetaLead);
      }

      // Successfully added note -> cancel 5-minute reminder
      const currentId = lead?._id || targetMetaId || id;
      leadNoteReminderService.resolveLead(currentId, leadName || lead?.name);
    } catch (err) { console.error(err); }
    finally { setSavingInfo(false); }
  };

  const handleDeleteActivityItem = async (item) => {
    if (!item) return;
    if (!canDeleteHistory) {
      alert('Only Admin has permission to delete call and activity history.');
      return;
    }

    const itemLabel = item._recording
      ? 'Audio Recording'
      : item._followup
      ? 'Call Back reminder'
      : (item.isMetaNote ? 'Campaign Note' : 'Lead Note');

    if (!window.confirm(`Are you sure you want to delete this ${itemLabel}? This action cannot be undone.`)) {
      return;
    }

    const itemId = item.rec?._id || item._id;
    setDeletingActivityId(itemId);

    try {
      if (item._recording) {
        const recordingId = item.rec?._id || item._id;
        await recordingsAPI.delete(recordingId);
        setRecordings(prev => (prev || []).filter(r => String(r._id) !== String(recordingId) && String(r.id) !== String(recordingId)));
      } else if (item._followup) {
        await followupsAPI.delete(item._id);
        setLeadFollowups(prev => (prev || []).filter(f => String(f._id) !== String(item._id) && String(f.id) !== String(item._id)));
      } else if (item.isMetaNote) {
        const targetMetaId = metaLeadId || (isMeta ? id : null) || lead?._id;
        try {
          if (targetMetaId) {
            await metaLeadsAPI.deleteCallNote(targetMetaId, item._id);
          }
        } catch (_) {
          if (targetMetaId) {
            await leadsAPI.deleteActivity(targetMetaId, item._id).catch(() => {});
          }
        }
        setLead(prev => {
          if (!prev) return prev;
          const nextCallNotes = (prev.callNotes || []).filter(cn => String(cn._id) !== String(item._id));
          const nextActivities = (prev.activities || []).filter(act => String(act._id) !== String(item._id));
          return { ...prev, callNotes: nextCallNotes, activities: nextActivities };
        });
      } else {
        const targetLeadId = lead?._id || id;
        if (targetLeadId) {
          await leadsAPI.deleteActivity(targetLeadId, item._id);
        }
        setLead(prev => {
          if (!prev) return prev;
          const nextActivities = (prev.activities || []).filter(act => String(act._id) !== String(item._id));
          const nextCallNotes = (prev.callNotes || []).filter(cn => String(cn._id) !== String(item._id));
          return { ...prev, activities: nextActivities, callNotes: nextCallNotes };
        });
      }

      if (selectedCallSummaryActivity) {
        const selId = String(selectedCallSummaryActivity._id || selectedCallSummaryActivity.rec?._id || '');
        const currentItemId = String(itemId || '');
        if (selId === currentItemId) {
          setSelectedCallSummaryActivity(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete activity item:', err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to delete activity item');
    } finally {
      setDeletingActivityId(null);
    }
  };


  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const data = { ...editForm, budget: editForm.budget !== '' ? +editForm.budget : 0, assignedTo: editForm.assignedTo || null, campaign: editForm.campaign || null, courseInterest: editForm.courseInterest || null };
      const res = await leadsAPI.update(lead._id, data);
      if (isMeta && (metaLeadId || metaLeadData?._id)) {
        await metaLeadsAPI.update(metaLeadId || metaLeadData._id, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          city: editForm.location,
          interested: editForm.interested,
        }).catch(() => {});
      }
      setLead(res.data.lead);
      setIsEditingInfo(false);
      onChange?.(res.data.lead);
    } catch (err) { alert(err.response?.data?.message || 'Failed to update lead profile information'); }
    finally { setSavingInfo(false); }
  };

  if (loading) {
    return (
      <div className={embedded ? 'h-full flex items-center justify-center bg-gray-50' : 'min-h-screen flex items-center justify-center bg-gray-50'}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 spinner-gradient" />
          <p className="text-gray-500 text-sm">Loading lead profile...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className={embedded ? 'h-full flex items-center justify-center bg-gray-50 p-6' : 'min-h-screen flex items-center justify-center bg-gray-50 p-6'}>
        <div className="text-center bg-white p-8 rounded-2xl shadow-md max-w-sm">
          <X className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 text-lg">Lead Not Found</h3>
          <p className="text-gray-500 text-sm mt-1">The lead you are trying to view does not exist or has been deleted.</p>
          {showBackButton && (
            <button onClick={() => (onBack ? onBack() : navigate('/leads'))} className="btn-primary mt-5 inline-flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> {backLabel}</button>
          )}
        </div>
      </div>
    );
  }

  const activityIcon = (type) => {
    if (type === 'call') return <Phone className="w-4 h-4 text-green-600" />;
    if (type === 'whatsapp') return <MessageCircle className="w-4 h-4 text-green-500" />;
    if (type === 'status_change') return <Tag className="w-4 h-4 text-orange-600" />;
    if (type === 'api_call') return <Zap className="w-4 h-4 text-purple-600" />;
    return <Clock className="w-4 h-4 text-indigo-600" />;
  };

  // Derived AI state flags (used in multiple places below)
  const isAILocked = lead.aiLock?.expiresAt && new Date(lead.aiLock.expiresAt) > new Date();
  const isAIQueued = !isAILocked && lead.aiCallState === 'queued';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={embedded ? 'h-full bg-slate-50/60 overflow-y-auto' : 'min-h-screen bg-slate-50/60 pb-12'}
    >
      {/* Top Navigation Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className={`mx-auto flex items-center justify-between gap-3 px-3 sm:px-6 py-2.5 flex-wrap sm:flex-nowrap ${embedded ? 'w-full' : 'max-w-5xl'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {showBackButton && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => (onBack ? onBack() : navigate('/leads'))}
                className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 truncate tracking-tight">{leadName || lead.name}</h2>

                {/* Status Badge: only show for Meta leads if an actual Positive / Call Not Answering / Negative status is set (no default Fresh/New) */}
                {(!isMeta ? Boolean(lead.status) : (isLeadPositive(lead) || isLeadNegative(lead) || isLeadCallNotAnswering(lead))) && (
                  <StatusBadge status={lead.status} />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
            {/* Status Selector: Positive / Negative with Image Sub-statuses */}
            <MetaLeadStatusPicker
              status={lead.status}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      <div className={`mx-auto ${embedded ? 'w-full px-2 sm:px-4 py-3 space-y-3.5' : 'max-w-5xl px-3 sm:px-6 py-4 space-y-3.5'}`}>
        {isCalling && <CallTimer onStop={handleCallEnded} />}
        {!isMeta && <AIStateBanner lead={lead} />}

        {/* ─── 1. Basic Information (Full Container Width, Decreased Height, Responsive Multi-Col Grid) ─── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h3 className="font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Basic Information
            </h3>
            {!isEditingInfo ? (
              <button
                onClick={() => setIsEditingInfo(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Info
              </button>
            ) : (
              <button
                onClick={() => setIsEditingInfo(false)}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-rose-50"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSaveInfo}>
            <div className="p-3 sm:p-4">
              {isEditingInfo ? (
                isMeta ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Name</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                          value={editForm.name || ''}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                        <input
                          type="email"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                          value={editForm.email || ''}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Phone</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                          value={editForm.phone || ''}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">City</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                          value={editForm.location || ''}
                          onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Interested</label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                          value={editForm.interested || ''}
                          onChange={e => setEditForm({ ...editForm, interested: e.target.value })}
                          placeholder="Course / Interested In"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={savingInfo}
                        className="px-4 py-2 rounded-lg font-medium text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Details
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                        ['Full Name', 'name', 'text', true],
                        ['Phone Number', 'phone', 'text', true],
                        ['Alternate Phone', 'alternatePhone', 'text', false],
                        ['Email', 'email', 'email', false],
                        ['Location', 'location', 'text', false],
                        ['Last Qualification', 'lastQualification', 'text', false],
                      ].map(([label, field, type, required]) => {
                        const isPhoneField = field === 'phone';
                        const locked = isPhoneField && !isSuperAdmin;
                        return (
                          <div key={field}>
                            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
                              {label}{locked && <span className="normal-case text-slate-400"> (Admin only)</span>}
                            </label>
                            <input
                              type={type}
                              className={`w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${locked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800'}`}
                              value={editForm[field]}
                              onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                              required={required}
                              readOnly={locked}
                            />
                          </div>
                        );
                      })}
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Budget (INR)</label>
                        <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" value={editForm.budget} onChange={e => setEditForm({ ...editForm, budget: e.target.value })} placeholder="Budget" min={0} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Lead Source</label>
                        <select className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" value={editForm.leadSource} onChange={e => setEditForm({ ...editForm, leadSource: e.target.value })}>
                          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {isAdmin && (
                        <>
                          <div>
                            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Assignee</label>
                            <select className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" value={editForm.assignedTo} onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}>
                              <option value="">Unassigned</option>
                              {callers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Campaign</label>
                            <select className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" value={editForm.campaign} onChange={e => setEditForm({ ...editForm, campaign: e.target.value })}>
                              <option value="">No Campaign</option>
                              {editForm.campaign && !campaigns.some(c => c._id === editForm.campaign) && (
                                <option value={editForm.campaign}>{lead.campaign?.name || editForm.campaign}</option>
                              )}
                              {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={savingInfo}
                        className="px-4 py-2 rounded-lg font-medium text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Details
                      </motion.button>
                    </div>
                  </div>
                )
              ) : (
                isMeta ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    {/* 1. Name */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 hover:border-blue-200 transition-colors min-w-0">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">Name</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-800 truncate" title={leadName}>{leadName}</span>
                      </div>
                    </div>

                    {/* 2. Email */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 hover:border-blue-200 transition-colors min-w-0">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">Email</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-slate-800 truncate" title={leadEmail}>{leadEmail}</span>
                        {leadEmail && leadEmail !== '—' && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(leadEmail)}
                            className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                          >
                            {copiedText === leadEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. Phone */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 hover:border-blue-200 transition-colors min-w-0">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">Phone</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-800 font-mono truncate" title={leadPhone}>{leadPhone}</span>
                        {leadPhone && leadPhone !== '—' && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(leadPhone)}
                            className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                          >
                            {copiedText === leadPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4. City */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 hover:border-blue-200 transition-colors min-w-0">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">City</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-slate-800 truncate" title={leadCity}>{leadCity}</span>
                      </div>
                    </div>

                    {/* 5. Interested */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 hover:border-blue-200 transition-colors min-w-0">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">Interested</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-800 truncate" title={leadInterested}>{leadInterested}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {[
                      { icon: Phone, label: 'Phone', value: lead.phone, copyable: true },
                      { icon: Phone, label: 'Alt Phone', value: lead.alternatePhone || '—', copyable: !!lead.alternatePhone },
                      { icon: Mail, label: 'Email', value: lead.email || '—' },
                      { icon: MapPin, label: 'Location', value: lead.location || '—' },
                      { icon: Award, label: 'Qualification', value: lead.lastQualification || '—' },
                      { icon: IndianRupee, label: 'Budget', value: lead.budget ? `₹${lead.budget.toLocaleString()}` : '—' },
                      { icon: Globe, label: 'Source', value: lead.leadSource },
                      { icon: User, label: 'Campaign', value: lead.campaign?.name || 'None' },
                      { icon: User, label: 'Assignee', value: lead.assignedTo?.name || 'Unassigned' },
                    ].map(({ icon: Icon, label, value, copyable }) => (
                      <div key={label} className="p-2 sm:p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 hover:border-blue-200 transition-colors min-w-0">
                        <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">{label}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium text-slate-800 truncate" title={value}>{value}</span>
                          {copyable && value !== '—' && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(value)}
                              className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                            >
                              {copiedText === value ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Inline Rating tile */}
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50/80 border border-slate-100 flex flex-col justify-center min-w-0">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Rating</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(r => (
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            key={r}
                            onClick={() => handleRatingChange(r)}
                            className="focus:outline-none"
                          >
                            <Star className={`w-3.5 h-3.5 ${r <= (lead?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </form>
        </div>

        {/* ─── Down: Course Interest & Mode (Hidden for Meta Leads) ─── */}
        {!isMeta && (
          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-600" /> Course Interest & Mode
              </h3>
            </div>
            <div className="p-3 sm:p-4">
              {isEditingInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Course Target</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                      value={editForm.courseInterest}
                      onChange={e => {
                        const selectedCourse = courses.find(c => c._id === e.target.value);
                        setEditForm(prev => ({
                          ...prev,
                          courseInterest: e.target.value,
                          budget: selectedCourse ? selectedCourse.cost : prev.budget,
                        }));
                      }}
                    >
                      <option value="">No Course Linked</option>
                      {editForm.courseInterest && !courses.some(c => c._id === editForm.courseInterest) && (
                        <option value={editForm.courseInterest}>{lead.courseInterest?.name || editForm.courseInterest}</option>
                      )}
                      {courses.map(c => <option key={c._id} value={c._id}>{c.name} (₹{c.cost.toLocaleString()})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">Learning Mode</label>
                    <select className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800" value={editForm.mode} onChange={e => setEditForm({ ...editForm, mode: e.target.value })}>
                      <option value="">Select Mode</option>
                      {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 bg-orange-50/40 border border-orange-200/60 rounded-xl p-3 sm:p-3.5 flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[10px] font-medium text-orange-600 uppercase tracking-wider">Selected Course</p>
                      <h4 className="text-sm sm:text-base font-semibold text-slate-800 truncate">{lead?.courseInterest?.name || 'No Course Selected'}</h4>
                      {lead?.courseInterest?.description && <p className="text-xs text-slate-500 line-clamp-2">{lead.courseInterest.description}</p>}
                      {lead?.courseInterest?.duration && (
                        <div className="inline-flex items-center gap-1 bg-white border border-orange-200 text-[10px] font-medium text-orange-700 px-2.5 py-0.5 rounded-full mt-1">
                          <Clock className="w-3 h-3" /> {lead.courseInterest.duration}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50/40 border border-blue-200/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">Course Fee</p>
                      <h4 className="text-lg sm:text-xl font-semibold text-blue-900 mt-0.5">
                        {lead?.courseInterest?.cost ? `₹${lead.courseInterest.cost.toLocaleString()}` : '—'}
                      </h4>
                      {lead?.budget > 0 && (
                        <p className="text-xs text-blue-700 mt-0.5 font-medium">Budget: ₹{lead.budget.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-blue-200/50 mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Mode</span>
                      <span className="font-medium text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider">{lead?.mode || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Down: Quick Action Center (Compact Size · Light Sky Blue & Light Green Theme) ─── */}
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-xs p-2.5 sm:p-3 relative overflow-hidden">
          {isBlocked && (
            <div className="mb-2.5 bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-xl p-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-rose-700">Contact Blocked — Communication Actions Disabled</div>
                  <div className="text-[11px] text-rose-600">Click Unblock Contact to restore calling, WhatsApp, and notes for this lead.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBlockToggle}
                disabled={blockingAction}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex-shrink-0"
              >
                {blockingAction ? 'Unblocking...' : '✓ Unblock Contact'}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-600" /> Quick Action Center
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBlockToggle}
                disabled={blockingAction}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  isBlocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                {blockingAction ? 'Updating...' : isBlocked ? '✓ Unblock Contact' : 'Block Contact'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {[
              { icon: Phone, label: 'CALL NOW', action: () => setShowInitiateCallModal(true), bg: 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs', iconColor: 'text-emerald-700', disabled: isBlocked },
              { icon: Clock, label: 'CALLBACK LATER', action: () => setShowCallbackModal(true), bg: 'bg-sky-50 hover:bg-sky-100/90 text-sky-800 border border-sky-300 shadow-2xs', iconColor: 'text-sky-700', disabled: isBlocked },
              { icon: MessageCircle, label: 'SEND TEMPLATE', action: () => setShowSendTemplateModal(true), bg: 'bg-teal-50 hover:bg-teal-100/90 text-teal-800 border border-teal-300 shadow-2xs', iconColor: 'text-teal-700', disabled: isBlocked },
              { icon: Plus, label: 'ADD NOTE', action: () => setShowNoteModal(true), bg: 'bg-blue-50 hover:bg-blue-100/90 text-blue-800 border border-blue-300 shadow-2xs', iconColor: 'text-blue-700', disabled: isBlocked },
            ].map(({ icon: Icon, label, action, bg, iconColor, disabled }) => (
              <motion.button
                key={label}
                whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -1 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
                onClick={action}
                disabled={disabled}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg font-bold transition-all text-center shadow-xs ${bg} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Icon className={`w-4 h-4 ${iconColor}`} />
                <span className="text-[10px] sm:text-[11px] tracking-wide uppercase font-bold">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ─── Down: Activity & Calling History (Only Notes, Call Back, Audio Record) ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Activity & Calling History
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Notes, scheduled callbacks, and call audio recordings
              </p>
            </div>
          </div>

          {(() => {
            // 1. NOTES: Combine candidate/lead remarks, agent notes, and campaign notes (deduplicated)
            const metaCallNotes = (lead.callNotes || metaLeadData?.callNotes || [])
              .filter(cn => cn
                && String(cn.outcome || '').toLowerCase() !== 'status_change'
                && !String(cn.note || '').toLowerCase().startsWith('status changed'))
              .map((cn, idx) => ({
                _id: cn._id || `meta-note-${idx}`,
                type: 'note',
                description: String(cn.note || cn.outcome || 'Note recorded'),
                createdAt: cn.date,
                // Legacy rows stored a role label in `userName`; the populated user wins.
                performedBy: { name: personDisplayName(cn.user) || personDisplayName(cn.userName) || 'Agent' },
                isMetaNote: true,
              }));

            const regularNotes = (lead.activities || [])
              .filter(a => a.type === 'note')
              .filter(a => !String(a.description || a.note || '').toLowerCase().startsWith('status changed'))
              .map((a, idx) => ({
                ...a,
                _id: a._id || `reg-note-${idx}`,
                type: 'note',
                description: String(a.description || a.note || 'Note added'),
                performedBy: typeof a.performedBy === 'object' && a.performedBy !== null
                  ? { name: a.performedBy.name || 'Agent' }
                  : { name: typeof a.performedBy === 'string' ? a.performedBy : 'Agent' },
              }));

            const seenNoteIds = new Set();
            const seenNoteFingerprints = new Set();
            const allNotes = [...metaCallNotes, ...regularNotes].filter(n => {
              const idStr = n._id ? String(n._id) : '';
              if (idStr && !idStr.startsWith('meta-note-') && !idStr.startsWith('reg-note-')) {
                if (seenNoteIds.has(idStr)) return false;
                seenNoteIds.add(idStr);
              }
              const fp = `${String(n.description || '').trim()}|${n.createdAt ? new Date(n.createdAt).toISOString().slice(0, 16) : ''}`;
              if (seenNoteFingerprints.has(fp)) return false;
              seenNoteFingerprints.add(fp);
              return true;
            });

            // 2. CALL BACK: Scheduled callbacks / followups
            const allFollowups = (leadFollowups || []).map(f => ({
              _followup: true,
              _id: f._id,
              type: 'followup',
              description: f.note || 'Callback scheduled',
              createdAt: f.createdAt,
              scheduledAt: f.scheduledAt,
              status: f.status,
              leadName: f.leadName || f.lead?.name || leadName || lead?.name,
              filledByName: f.filledByName || f.createdBy?.name || f.assignedBy?.name || f.assignedTo?.name || 'Agent',
              performedBy: f.assignedTo || f.createdBy,
            }));

            // 3. AUDIO RECORD: Voice call recordings
            const allRecordings = (recordings || []).map(rec => ({
              _recording: true,
              _id: rec._id,
              type: 'recording',
              createdAt: rec.recordedAt || rec.createdAt,
              rec,
            }));

            const activeTab = ['all', 'note', 'followup', 'recordings'].includes(activityFilter) ? activityFilter : 'all';

            const tabs = [
              { key: 'all', label: 'All Items', count: allNotes.length + allFollowups.length + allRecordings.length },
              { key: 'note', label: 'Notes', count: allNotes.length },
              { key: 'followup', label: 'Call Back', count: allFollowups.length },
              { key: 'recordings', label: 'Audio Records', count: allRecordings.length },
            ];

            const noteItems = (activeTab === 'all' || activeTab === 'note') ? allNotes : [];
            const followupItems = (activeTab === 'all' || activeTab === 'followup') ? allFollowups : [];
            const recordingItems = (activeTab === 'all' || activeTab === 'recordings') ? allRecordings : [];

            const allItems = [...noteItems, ...followupItems, ...recordingItems].sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            return (
              <>
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {tabs.map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActivityFilter(tab.key)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                      >
                        {tab.label}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Card Display Grid */}
                {allItems.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No items found</h4>
                    <p className="text-slate-400 text-xs font-normal">No notes, callbacks, or audio records match the selected filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allItems.map((a, i) => {
                      // 1. AUDIO RECORD CARD
                      if (a._recording) {
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, delay: i * 0.02 }}
                            key={`${a.type || 'item'}-${a._id || i}-${i}`}
                            onClick={() => setSelectedCallSummaryActivity(a)}
                            className="bg-white rounded-2xl border border-sky-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group hover:border-sky-300"
                          >
                            <div className="h-1 bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 w-full" />
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                    <Volume2 className="w-3.5 h-3.5 text-sky-600" /> Audio Record
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={a.rec.streamUrl || a.rec.url}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Download Audio Recording"
                                      onClick={e => e.stopPropagation()}
                                      className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-200"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                    {canDeleteHistory && (
                                      <button
                                        type="button"
                                        title="Delete Audio Recording (Admin Only)"
                                        disabled={deletingActivityId === (a.rec?._id || a._id)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteActivityItem(a);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 disabled:opacity-50 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <h4 className="text-[13px] font-bold text-slate-800 mb-1 truncate" title={a.rec.originalName}>
                                  {a.rec.originalName || 'Voice Call Recording'}
                                </h4>

                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3">
                                  <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{a.rec.phone || leadPhone}</span>
                                </div>

                                {/* Audio Player */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 mb-3">
                                  <audio
                                    onClick={e => e.stopPropagation()}
                                    controls
                                    preload="metadata"
                                    className="w-full h-8 rounded-lg"
                                    src={a.rec.streamUrl || a.rec.url}
                                  >
                                    Audio not supported
                                  </audio>
                                </div>

                                {/* AI Whisper Transcript Preview */}
                                {a.rec.transcript && (
                                  <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-2.5 text-xs mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-sky-800 flex items-center gap-1.5 text-[11px]">
                                        <Sparkles className="w-3 h-3 text-sky-600" /> Whisper Transcript
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveConversationRecording({
                                            ...a.rec,
                                            leadName: leadName !== '—' ? leadName : lead?.name,
                                            phone: leadPhone !== '—' ? leadPhone : a.rec?.phone,
                                          });
                                        }}
                                        title="Open Chat Conversation View"
                                        className="bg-white hover:bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                                      >
                                        <Maximize2 className="w-2.5 h-2.5" /> Chat View
                                      </button>
                                    </div>
                                    <p className="line-clamp-2 text-slate-600 italic text-[11px] leading-relaxed">
                                      "{a.rec.transcript}"
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium mt-2">
                                <span className="truncate max-w-[130px]">By: <strong className="text-slate-800">{a.rec.user?.name || 'Agent'}</strong></span>
                                <span>{a.createdAt ? format(new Date(a.createdAt), 'dd MMM, hh:mm a') : ''}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }

                      // 2. CALL BACK CARD
                      if (a._followup) {
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, delay: i * 0.02 }}
                            key={`${a.type || 'item'}-${a._id || i}-${i}`}
                            onClick={() => setSelectedCallSummaryActivity(a)}
                            className="bg-white rounded-2xl border border-amber-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group hover:border-amber-300"
                          >
                            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 w-full" />
                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Call Back
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                      a.status === 'upcoming'
                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    }`}>
                                      {a.status === 'upcoming' ? '⏳ Upcoming' : '✅ Done'}
                                    </span>
                                    {canDeleteHistory && (
                                      <button
                                        type="button"
                                        title="Delete Call Back (Admin Only)"
                                        disabled={deletingActivityId === a._id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteActivityItem(a);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 disabled:opacity-50 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="truncate">Person: {a.leadName || leadName || lead?.name}</span>
                                </div>

                                {a.scheduledAt && (
                                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 mb-2.5 flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="truncate">{format(new Date(a.scheduledAt), 'dd MMM yyyy, hh:mm a')}</span>
                                  </div>
                                )}

                                {a.description && (
                                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2.5 line-clamp-2 leading-relaxed mb-1">
                                    {a.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium mt-2">
                                <span className="truncate max-w-[140px]">Filled By: <strong className="text-slate-800">{a.filledByName || a.performedBy?.name || 'Agent'}</strong></span>
                                <span>{a.createdAt ? format(new Date(a.createdAt), 'dd MMM, hh:mm a') : ''}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }

                      // 3. NOTES CARD (v-card-16 inspired repository card design)
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: i * 0.02 }}
                          key={`${a.type || 'item'}-${a._id || i}-${i}`}
                          onClick={() => setSelectedCallSummaryActivity(a)}
                          className="rounded-xl border border-slate-200/90 bg-white text-slate-900 shadow-xs hover:shadow-md transition-all cursor-pointer p-4 flex flex-col justify-between gap-3 group hover:border-slate-300"
                        >
                          <div className="flex flex-col gap-2.5">
                            {/* Top Header: Icon + Title + Secondary Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                <span className="font-semibold text-sm text-slate-800 truncate">
                                  {a.isMetaNote ? 'Meta Campaign Note' : 'Lead Note'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                  {a.isMetaNote ? 'Campaign' : 'Internal'}
                                </span>
                                {canDeleteHistory && (
                                  <button
                                    type="button"
                                    title="Delete Note (Admin Only)"
                                    disabled={deletingActivityId === a._id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteActivityItem(a);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors border border-transparent hover:border-rose-200 disabled:opacity-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Description / Content */}
                            <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line line-clamp-3">
                              {a.description || 'Note recorded'}
                            </p>
                          </div>

                          {/* Note Card Footer: Agent Row + Dedicated Date/Time on NEW LINE */}
                          <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
                            {/* Line 1: Agent & Copy Button */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
                                <span className={`size-2 rounded-full ${a.isMetaNote ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                <span className="text-slate-400 font-normal">By:</span>
                                <span>{a.performedBy?.name || 'Agent'}</span>
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard?.writeText(a.description || '');
                                  alert('Note copied to clipboard');
                                }}
                                title="Copy Note text"
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Line 2 (NEW LINE): Date & Time */}
                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-slate-50/90 px-2.5 py-1 rounded-lg border border-slate-200/60">
                              <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                                <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                                {a.createdAt ? format(new Date(a.createdAt), 'dd MMM yyyy') : 'Recent'}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                {a.createdAt ? format(new Date(a.createdAt), 'hh:mm:ss a') : ''}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {showNoteModal && <AddNoteModal lead={{ name: leadName !== '—' ? leadName : lead?.name, phone: leadPhone !== '—' ? leadPhone : lead?.phone }} onClose={() => setShowNoteModal(false)} onSubmit={handleAddNote} />}
        {showCallbackModal && lead && (
          <CallbackTimeModal
            lead={{ ...lead, name: leadName !== '—' ? leadName : lead?.name, phone: leadPhone !== '—' ? leadPhone : lead?.phone }}
            metaLeadId={metaLeadId || (isMeta ? id : null)}
            campaign={metaLeadData?.campaign || lead?.campaign?.name || ''}
            currentUser={user}
            onClose={() => setShowCallbackModal(false)}
            onScheduled={handleCallbackScheduled}
          />
        )}
        {showDemoModal && lead && <ScheduleDemoModal lead={lead} onClose={() => setShowDemoModal(false)} onSave={handleScheduleDemo} />}
        {showInitiateCallModal && (
          <InitiateCallModal
            lead={{ ...lead, _id: lead?._id || metaLeadId || id, name: leadName !== '—' ? leadName : lead?.name, phone: leadPhone !== '—' ? leadPhone : lead?.phone }}
            callers={callers}
            currentUser={user}
            onClose={() => setShowInitiateCallModal(false)}
            onSuccess={fetchLeadDetails}
          />
        )}
        {showSendTemplateModal && (
          <SendWhatsAppTemplateModal
            lead={{ ...lead, _id: lead?._id || metaLeadId || id, name: leadName !== '—' ? leadName : lead?.name, phone: leadPhone !== '—' ? leadPhone : lead?.phone }}
            metaLeadId={metaLeadId || (isMeta ? id : null)}
            onClose={() => setShowSendTemplateModal(false)}
            onSuccess={(data) => {
              if (data?.metaLead) {
                setLead(prev => prev ? { ...prev, callNotes: data.metaLead.callNotes || prev.callNotes } : prev);
                onChange?.(data.metaLead);
              }
              fetchLeadDetails();
            }}
          />
        )}
        {activeConversationRecording && (
          <TranscriptConversationModal
            recording={activeConversationRecording}
            onClose={() => setActiveConversationRecording(null)}
          />
        )}
        {selectedCallSummaryActivity && (
          <CallSummaryDetailModal
            activity={selectedCallSummaryActivity}
            lead={lead}
            canDelete={canDeleteHistory}
            onDelete={handleDeleteActivityItem}
            onClose={() => setSelectedCallSummaryActivity(null)}
            onInitiateCall={() => {
              setSelectedCallSummaryActivity(null);
              setShowInitiateCallModal(true);
            }}
            onScheduleCallback={() => {
              setSelectedCallSummaryActivity(null);
              setShowCallbackModal(true);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}