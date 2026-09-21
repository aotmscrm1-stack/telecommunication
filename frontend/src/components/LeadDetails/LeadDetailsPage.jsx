import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, PhoneOff, Mail, MapPin, Award, IndianRupee, Globe, User, Calendar, Tag, Star, Edit3, Save, X, Plus, Clock, MessageCircle, Copy, Check, Trash2, BookOpen, Zap, Sparkles, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import api, { leadsAPI, campaignsAPI, usersAPI, coursesAPI, followupsAPI, blocklistAPI, leadStagesAPI, messageTemplatesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';
import StatusBadge from '../common/StatusBadge';
import { formatDistanceToNow, format } from 'date-fns';

const PALETTE = {
  navy: '#1d3557',
  cerulean: '#457b9d',
  frosted: '#a8dadc',
  honeydew: '#f1faee',
  red: '#e63946',
};

const FALLBACK_STATUSES = ['Fresh', 'Connected', 'Call Not Responding', 'Call Back Later', 'Not interested', 'Demo Scheduled', 'Demo Done', 'Won', 'Lost'];
const SOURCES = ['Manual', 'Facebook', 'WhatsApp', 'Website', 'Excel', 'Referral'];
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

function AddNoteModal({ onClose, onSubmit }) {
  const [note, setNote] = useState('');
  const [type, setType] = useState('note');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#a8dadc]"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f1faee] flex items-center justify-center text-[#457b9d]">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[#1d3557] text-base">Add Note / Activity</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#f1faee] flex items-center justify-center text-gray-400 hover:text-[#1d3557] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2 mb-4">
          {['note', 'whatsapp'].map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`text-xs px-3.5 py-1.5 rounded-xl capitalize font-bold transition-all ${type === t ? 'bg-[#1d3557] text-white shadow-xs' : 'bg-[#f1faee] text-[#457b9d] hover:bg-[#a8dadc]/40'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          className="input-field resize-none w-full border border-[#a8dadc] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#457b9d] text-sm bg-gray-50/50 focus:bg-white transition-all"
          rows={4}
          placeholder="Write activity notes..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 font-bold text-sm border border-[#a8dadc] text-[#1d3557] hover:bg-[#f1faee] transition-all">Cancel</button>
          <button
            onClick={() => onSubmit(note, type)}
            className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-[#457b9d] hover:bg-[#1d3557] text-white transition-all shadow-xs flex items-center justify-center"
            disabled={!note.trim()}
          >
            Save Activity
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LogCallModal({ lead, onClose, onSubmit }) {
  const [form, setForm] = useState({ callStatus: 'connected', duration: 0, note: '', transcript: '' });

  const handleSubmit = () => {
    const combinedNote = form.transcript.trim()
      ? `${form.note}${form.note ? '\n\n' : ''}Transcript:\n${form.transcript.trim()}`
      : form.note;
    onSubmit({ callStatus: form.callStatus, duration: form.duration, note: combinedNote });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#a8dadc]"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f1faee] flex items-center justify-center text-[#457b9d]">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[#1d3557] text-base">Log Call — {lead.name}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#f1faee] flex items-center justify-center text-gray-400 hover:text-[#1d3557] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wide mb-1 block">Call Status</label>
            <select className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d] bg-white font-semibold text-[#1d3557]" value={form.callStatus} onChange={e => setForm({ ...form, callStatus: e.target.value })}>
              <option value="connected">Connected</option>
              <option value="no_answer">No Answer</option>
              <option value="busy">Busy</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wide mb-1 block">Duration (seconds)</label>
            <input type="number" className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" value={form.duration} onChange={e => setForm({ ...form, duration: +e.target.value })} min={0} />
          </div>
          <div>
            <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wide mb-1 block">Call Summary Note</label>
            <textarea className="input-field w-full border border-[#a8dadc] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d] resize-none" rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Write call feedback notes..." />
          </div>
          <div>
            <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wide mb-1 block">
              Transcript <span className="text-gray-400 font-normal">(optional — enables Call IQ audit)</span>
            </label>
            <textarea className="input-field w-full border border-[#a8dadc] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d] resize-none" rows={3} value={form.transcript} onChange={e => setForm({ ...form, transcript: e.target.value })} placeholder={"Paste call transcript here..."} />
          </div>
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 font-bold text-sm border border-[#a8dadc] text-[#1d3557] hover:bg-[#f1faee]">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-[#457b9d] hover:bg-[#1d3557] text-white shadow-xs justify-center flex items-center">Save Call Log</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Initiate Call Modal ───────────────────────────────────────────────────────
function InitiateCallModal({ lead, callers, currentUser, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const isCaller = currentUser?.role === 'employee' || currentUser?.role === 'caller';
  const [selectedCaller, setSelectedCaller] = useState(
    isCaller ? currentUser?._id : (lead?.assignedTo?._id || '')
  );

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await leadsAPI.initiateCall(lead._id, selectedCaller || undefined);
      setResult({ success: true, message: res.data.message });
      if (onSuccess) onSuccess();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Failed to send notification' });
    } finally {
      setLoading(false);
    }
  };

  const callersList = callers.filter(c => c.role === 'employee' || c.role === 'caller');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                <path d="M16 5.3a5 5 0 0 1 0 6.4" stroke="#16a34a" strokeOpacity="0.6"/>
                <path d="M19 3a9 9 0 0 1 0 11" stroke="#16a34a" strokeOpacity="0.35"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">📲 Initiate Call</h3>
              <p className="text-xs text-gray-500">Send notification to caller's mobile app</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Lead</p>
            <p className="font-bold text-gray-800 text-lg">{lead?.name}</p>
            <p className="text-gray-500 font-mono text-sm">{lead?.phone}</p>
            {lead?.assignedTo?.name && (
              <p className="text-xs text-indigo-600 font-semibold mt-1">Assigned to: {lead.assignedTo.name}</p>
            )}
          </div>

          {isCaller ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <p className="text-indigo-700 text-sm font-semibold">
                📱 Sending to your mobile: <span className="font-bold">{currentUser?.name}</span>
              </p>
              <p className="text-indigo-500 text-xs mt-1">The notification will appear on your phone</p>
            </div>
          ) : callersList.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Send notification to</label>
              <select
                value={selectedCaller}
                onChange={e => setSelectedCaller(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Assigned Caller ({lead?.assignedTo?.name || 'None'}) --</option>
                {callersList.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-blue-700 text-xs leading-relaxed">
              💡 The caller will receive a push notification on their mobile app showing this lead's name and phone number. They can tap it to call directly.
            </p>
          </div>

          {result && (
            <div className={`rounded-xl p-4 border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-semibold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? '✅ ' : '❌ '}{result.message}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold text-sm">
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M16 5.3a5 5 0 0 1 0 6.4" strokeOpacity="0.6"/><path d="M19 3a9 9 0 0 1 0 11" strokeOpacity="0.4"/></svg>Send Notification</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Callback Time Picker Modal ────────────────────────────────────────────────
function CallbackTimeModal({ lead, currentUser, onClose, onScheduled }) {
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
      const res = await followupsAPI.create({
        lead: lead._id,
        assignedTo: lead.assignedTo?._id || currentUser?._id,
        scheduledAt: scheduledAt.toISOString(),
        type: 'call_followup',
        status: 'upcoming',
        note: note || ('Callback scheduled for ' + lead.name),
      });
      onScheduled(res.data.followup, scheduledAt);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule callback');
    } finally {
      setSaving(false);
    }
  };

  const scheduledAt = getScheduledAt();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Schedule Callback</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          For <strong>{lead.name}</strong> ({lead.phone}) — pick a time to be reminded to call back.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setSelected(p.minutes); setManualDate(''); setManualTime(''); }}
              className={`py-2 rounded-xl text-xs font-bold border transition-all ${selected === p.minutes ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Or set manually</p>
          <div className="flex gap-2">
            <input type="date" value={manualDate} min={new Date().toISOString().split('T')[0]}
              onChange={e => { setManualDate(e.target.value); setSelected(null); }}
              className="flex-1 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <input type="time" value={manualTime}
              onChange={e => { setManualTime(e.target.value); setSelected(null); }}
              className="flex-1 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-xl p-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
          rows={2} placeholder="Add a note (optional)..." value={note} onChange={e => setNote(e.target.value)}
        />
        {scheduledAt && !isNaN(scheduledAt.getTime()) && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-xs text-orange-700 font-semibold">
            Callback at: {scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2.5">
          <button onClick={onClose} className="btn-secondary flex-1 rounded-xl py-2.5 font-semibold text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving || !scheduledAt || isNaN(scheduledAt?.getTime())}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule Demo Date Modal ──────────────────────────────────────────────────
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Schedule Demo</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          For <strong>{lead.name}</strong> ({lead.phone}) — pick when the demo will happen.
        </p>
        <div className="flex gap-2 mb-4">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2.5">
          <button onClick={onClose} className="btn-secondary flex-1 rounded-xl py-2.5 font-semibold text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving...' : 'Schedule Demo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Send WhatsApp Template Modal ─────────────────────────────────────────────
function SendWhatsAppTemplateModal({ lead, onClose, onSuccess }) {
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

      await api.post('/integrations/whatsapp/send-template-direct', {
        leadId: lead._id,
        to: lead.phone,
        templateName,
        languageCode,
        headerImageUrl,
        messageText: bodyText,
      });

      setSuccessMsg(`Successfully sent WhatsApp template "${selectedTemplate.name || selectedTemplate.shortcut}" to ${lead.name}!`);
      if (onSuccess) onSuccess();
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Send WhatsApp Template</h3>
              <p className="text-xs text-emerald-700">To: <span className="font-semibold">{lead.name}</span> ({lead.phone})</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-semibold">
              ⚠️ {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 text-xs text-green-700 font-semibold">
              ✅ {successMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Search Template</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by template name or content..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {filteredTemplates.map(t => {
                const isSelected = (selectedTemplate?._id && selectedTemplate?._id === t._id) || (selectedTemplate?.shortcut && selectedTemplate?.shortcut === t.shortcut);
                const isMediaHeader = t.headerType === 'Media' || t.components?.some(c => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format));
                const imageUrl = t.mediaUrl || t.imageUrl;
                return (
                  <div
                    key={t._id || t.name}
                    onClick={() => setSelectedTemplate(t)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                        {t.name || t.shortcut}
                        {t.status && (
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-extrabold uppercase ${
                            t.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {t.status}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">{t.category || t.language || 'Utility'}</span>
                    </div>

                    {isMediaHeader && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-emerald-200 bg-gray-900 max-h-28 flex items-center justify-center">
                        {imageUrl ? (
                          <img src={imageUrl} alt="Header" className="w-full object-cover h-24" />
                        ) : (
                          <div className="text-[10px] text-white/70 py-3">📷 Media Header Attached</div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                      {t.message || t.content || 'Template message content'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 font-semibold text-xs">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !selectedTemplate}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            {sending ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
            ) : (
              <><MessageCircle className="w-4 h-4" />Send Template Now</>
            )}
          </button>
        </div>
      </div>
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

// ── Shared Lead Details Component ─────────────────────────────────────────────
export default function LeadDetailsPage({
  leadId,
  embedded = false,
  showBackButton = !embedded,
  backLabel = 'Back to Leads',
  onBack,
  onDeleted,
  onChange,
}) {
  const id = leadId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'manager' || user?.role === 'admin';
  const isCaller = user?.role === 'employee' || user?.role === 'caller';

  const [lead, setLead] = useState(null);
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
  const [blockingAction, setBlockingAction] = useState(false);

  const [activityFilter, setActivityFilter] = useState('all');

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  const fetchLeadDetails = async () => {
    try {
      const [res, followupsRes] = await Promise.all([
        leadsAPI.getOne(id),
        followupsAPI.getAll({ leadId: id }),
      ]);
      setLead(res.data.lead);
      setLeadFollowups(followupsRes.data.followups || []);
      onChange?.(res.data.lead);
      const l = res.data.lead;
      setEditForm({
        name: l.name || '',
        phone: l.phone || '',
        alternatePhone: l.alternatePhone || '',
        email: l.email || '',
        status: l.status || 'Fresh',
        rating: l.rating || 0,
        leadSource: l.leadSource || 'Manual',
        courseInterest: l.courseInterest?._id || l.courseInterest || '',
        mode: l.mode || '',
        budget: l.budget > 0 ? l.budget : '',
        location: l.location || '',
        lastQualification: l.lastQualification || '',
        assignedTo: l.assignedTo?._id || '',
        campaign: l.campaign?._id || '',
      });
    } catch (err) {
      console.error('Failed to load lead details:', err);
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
    if (!lead?.phone) return;
    blocklistAPI.check(lead.phone).then(res => {
      setIsBlocked(res.data.blocked);
      setBlockEntryId(res.data.entry?._id || null);
    }).catch(() => {});
  }, [lead?.phone]);

  const handleBlockToggle = async () => {
    setBlockingAction(true);
    try {
      if (isBlocked) {
        if (blockEntryId) await blocklistAPI.remove(blockEntryId);
        else await blocklistAPI.removeByPhone(lead.phone);
        if (lead.status === 'Blocked') {
          await leadsAPI.updateStatus(lead._id, { status: 'Fresh' });
          setLead(prev => prev ? { ...prev, status: 'Fresh' } : prev);
        }
        setIsBlocked(false);
        setBlockEntryId(null);
      } else {
        const res = await blocklistAPI.add({ phone: lead.phone, name: lead.name, reason: 'Blocked from lead profile' });
        setIsBlocked(true);
        setBlockEntryId(res.data.entry?._id || null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (err.response?.status === 400 && err.response?.data?.entry) {
        setIsBlocked(true);
        setBlockEntryId(err.response.data.entry._id);
      } else {
        alert(isBlocked ? 'Failed to unblock: ' + msg : 'Failed to block: ' + msg);
      }
    }
    setBlockingAction(false);
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
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Demo Scheduled') {
      setShowDemoModal(true);
      return;
    }
    try {
      const res = await leadsAPI.updateStatus(lead._id, { status: newStatus });
      setLead(res.data.lead);
      setEditForm(prev => ({ ...prev, status: newStatus }));
    } catch (err) { console.error(err); }
  };

  const handleScheduleDemo = async (demoScheduledDate) => {
    const res = await leadsAPI.updateStatus(lead._id, { status: 'Demo Scheduled', demoScheduledDate: demoScheduledDate.toISOString() });
    setLead(res.data.lead);
    setEditForm(prev => ({ ...prev, status: 'Demo Scheduled' }));
    setShowDemoModal(false);
  };

  const handleRatingChange = async (newRating) => {
    try {
      const res = await leadsAPI.update(lead._id, { rating: newRating });
      setLead(res.data.lead);
      setEditForm(prev => ({ ...prev, rating: newRating }));
    } catch (err) { console.error(err); }
  };

  const handleDeleteLead = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      await leadsAPI.delete(lead._id);
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

  const handleLogManualCall = async (form) => {
    setSavingInfo(true);
    try {
      await leadsAPI.logCall(lead._id, form);
      setShowLogCallModal(false);
      await fetchLeadDetails();
    } catch (err) { console.error(err); }
    finally { setSavingInfo(false); }
  };

  const handleCallbackScheduled = async (followup, scheduledAt) => {
    setShowCallbackModal(false);
    try {
      await leadsAPI.updateStatus(lead._id, { status: 'Call Back Later' });
      await fetchLeadDetails();
    } catch (err) { console.error(err); }
  };

  const handleAddNote = async (note, type) => {
    setSavingInfo(true);
    try {
      await leadsAPI.addNote(lead._id, { note, type });
      setShowNoteModal(false);
      await fetchLeadDetails();
    } catch (err) { console.error(err); }
    finally { setSavingInfo(false); }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const data = { ...editForm, budget: editForm.budget !== '' ? +editForm.budget : 0, assignedTo: editForm.assignedTo || null, campaign: editForm.campaign || null, courseInterest: editForm.courseInterest || null };
      const res = await leadsAPI.update(lead._id, data);
      setLead(res.data.lead);
      setIsEditingInfo(false);
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
      className={embedded ? 'h-full bg-[#f1faee]/30 overflow-y-auto' : 'min-h-screen bg-[#f1faee]/30 pb-12'}
    >
      {/* Top Navigation Banner */}
      <div className="bg-white/95 border-b border-[#a8dadc] px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          {showBackButton && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => (onBack ? onBack() : navigate('/leads'))}
              className="w-9 h-9 rounded-xl border border-[#a8dadc] hover:bg-[#f1faee] flex items-center justify-center text-[#1d3557] transition-all shadow-2xs"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </motion.button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold text-[#1d3557] truncate tracking-tight">{lead.name}</h2>
              <motion.button
                whileHover={{ scale: 1.25, rotate: 15 }}
                whileTap={{ scale: 0.85 }}
                onClick={handleToggleStar}
                className="text-yellow-400 focus:outline-none"
              >
                <Star className={`w-5 h-5 ${lead.isStarred ? 'fill-yellow-400 drop-shadow-xs' : 'text-gray-300'}`} />
              </motion.button>

              {/* Status Badge */}
              <StatusBadge status={lead.status} />

              {/* ── AI state badges ── */}
              {isAILocked && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 shadow-2xs animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  AI Calling Now
                </span>
              )}
              {isAIQueued && (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200 shadow-2xs">
                  <Clock className="w-3 h-3 text-blue-500" />
                  Queued for AI
                </span>
              )}
            </div>
            <p className="text-xs text-[#457b9d] font-mono font-medium mt-0.5 opacity-90">ID: {lead._id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Initiate Call Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowInitiateCallModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs"
            title="Send call notification to mobile app"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Initiate Call</span>
          </motion.button>

          {/* Send WhatsApp Template Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowSendTemplateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#457b9d] hover:bg-[#1d3557] text-white rounded-xl text-xs font-extrabold transition-all shadow-xs"
            title="Send WhatsApp Template to student"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Send Template</span>
          </motion.button>

          {/* Status Dropdown */}
          <select
            value={lead.status}
            onChange={e => handleStatusChange(e.target.value)}
            className="text-xs font-bold border border-[#a8dadc] rounded-xl px-3 py-2 bg-[#f1faee] text-[#1d3557] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#457b9d] transition-all hover:border-[#457b9d]"
          >
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {canDelete(user) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeleteLead}
              className="w-9 h-9 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-[#e63946] flex items-center justify-center transition-all shadow-2xs"
              title="Delete Lead"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-[#a8dadc] shadow-xs overflow-hidden transition-all hover:shadow-md">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-[#f1faee]/50">
              <h3 className="font-extrabold text-[#1d3557] text-sm uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-[#457b9d]" /> Basic Information
              </h3>
              {!isEditingInfo ? (
                <button
                  onClick={() => setIsEditingInfo(true)}
                  className="text-xs font-bold text-[#457b9d] hover:text-[#1d3557] transition-colors flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-[#a8dadc]/30"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Info
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingInfo(false)}
                  className="text-xs font-bold text-[#e63946] hover:text-red-700 transition-colors flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleSaveInfo}>
              <div className="p-5 space-y-4">
                {isEditingInfo ? (
                  <div className="space-y-3.5">
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
                          <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">
                            {label}{locked && <span className="normal-case font-medium text-gray-400"> (Super Admin only)</span>}
                          </label>
                          <input
                            type={type}
                            className={`input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d] ${locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                            value={editForm[field]}
                            onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                            required={required}
                            readOnly={locked}
                          />
                        </div>
                      );
                    })}
                    <div>
                      <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Budget (INR)</label>
                      <input type="number" className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" value={editForm.budget} onChange={e => setEditForm({ ...editForm, budget: e.target.value })} placeholder="Enter budget amount" min={0} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Lead Source</label>
                      <select className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" value={editForm.leadSource} onChange={e => setEditForm({ ...editForm, leadSource: e.target.value })}>
                        {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {isAdmin && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Assignee</label>
                          <select className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" value={editForm.assignedTo} onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}>
                            <option value="">Unassigned</option>
                            {callers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Campaign</label>
                          <select className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" value={editForm.campaign} onChange={e => setEditForm({ ...editForm, campaign: e.target.value })}>
                            <option value="">No Campaign</option>
                            {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={savingInfo}
                      className="w-full justify-center rounded-xl py-2.5 font-bold text-sm bg-[#457b9d] hover:bg-[#1d3557] text-white shadow-xs mt-4 flex items-center gap-2 transition-colors"
                    >
                      <Save className="w-4 h-4" /> Save Details
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {[
                      { icon: Phone, label: 'Phone', value: lead.phone, copyable: true },
                      { icon: Phone, label: 'Alternate Phone', value: lead.alternatePhone || '—', copyable: !!lead.alternatePhone },
                      { icon: Mail, label: 'Email', value: lead.email || '—' },
                      { icon: MapPin, label: 'Location', value: lead.location || '—' },
                      { icon: Award, label: 'Qualification', value: lead.lastQualification || '—' },
                      { icon: IndianRupee, label: 'Budget', value: lead.budget ? `₹${lead.budget.toLocaleString()}` : '—' },
                      { icon: Globe, label: 'Source', value: lead.leadSource },
                      { icon: User, label: 'Campaign', value: lead.campaign?.name || 'None' },
                      { icon: User, label: 'Assignee', value: lead.assignedTo?.name || 'Unassigned' },
                    ].map(({ icon: Icon, label, value, copyable }) => (
                      <div key={label} className="flex items-start gap-3 text-sm p-2 rounded-xl hover:bg-[#f1faee]/60 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-[#f1faee] border border-[#a8dadc]/60 flex items-center justify-center flex-shrink-0 text-[#457b9d] mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-extrabold text-[#457b9d] uppercase tracking-wider">{label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="font-bold text-[#1d3557] break-all">{value}</p>
                            {copyable && value !== '—' && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(value)}
                                className="text-gray-400 hover:text-[#457b9d] transition-colors flex-shrink-0"
                              >
                                {copiedText === value ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between px-2">
                      <span className="text-xs font-bold text-[#1d3557]">Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(r => (
                          <motion.button
                            whileHover={{ scale: 1.25 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            key={r}
                            onClick={() => handleRatingChange(r)}
                            className="focus:outline-none"
                          >
                            <Star className={`w-4.5 h-4.5 ${r <= lead.rating ? 'fill-yellow-400 text-yellow-400 drop-shadow-2xs' : 'text-gray-200'}`} />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-6">
          {isCalling && <CallTimer onStop={handleCallEnded} />}
          <AIStateBanner lead={lead} />

          {/* Course Section */}
          <div className="bg-white rounded-2xl border border-[#a8dadc] shadow-xs overflow-hidden transition-all hover:shadow-md">
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-[#f1faee]/50 flex items-center justify-between">
              <h3 className="font-extrabold text-[#1d3557] text-sm uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#457b9d]" /> Course Interest & Mode
              </h3>
            </div>
            <div className="p-5">
              {isEditingInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Course Target</label>
                    <select
                      className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]"
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
                      {courses.map(c => <option key={c._id} value={c._id}>{c.name} (₹{c.cost.toLocaleString()})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Learning Mode</label>
                    <select className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" value={editForm.mode} onChange={e => setEditForm({ ...editForm, mode: e.target.value })}>
                      <option value="">Select Mode</option>
                      {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 bg-[#f1faee]/60 border border-[#a8dadc]/60 rounded-2xl p-5 flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#457b9d]/10 text-[#457b9d] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-extrabold text-[#457b9d] uppercase tracking-widest">Selected Course</p>
                      <h4 className="text-lg font-extrabold text-[#1d3557]">{lead.courseInterest?.name || 'No Course Selected'}</h4>
                      {lead.courseInterest?.description && <p className="text-xs text-gray-600 leading-relaxed pt-1">{lead.courseInterest.description}</p>}
                      {lead.courseInterest?.duration && (
                        <div className="inline-flex items-center gap-1 bg-white border border-[#a8dadc] text-[10px] font-bold text-[#457b9d] px-2.5 py-0.5 rounded-full mt-2.5 shadow-2xs">
                          <Clock className="w-3 h-3" /> {lead.courseInterest.duration}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest">Course Fee</p>
                      <h4 className="text-3xl font-extrabold text-emerald-900 mt-1">
                        {lead.courseInterest?.cost ? `₹${lead.courseInterest.cost.toLocaleString()}` : '—'}
                      </h4>
                      {lead.budget > 0 && (
                        <p className="text-xs text-emerald-700 mt-1 font-bold">Budget: ₹{lead.budget.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-emerald-200/40 mt-3 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase">Learning Mode</span>
                      {lead.mode ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">{lead.mode}</span>
                      ) : <span className="text-xs text-gray-400 italic">Not set</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Center */}
          <div className="bg-white rounded-2xl border border-[#a8dadc] shadow-xs p-5 relative overflow-hidden transition-all hover:shadow-md">
            {isBlocked && (
              <div className="absolute inset-0 bg-red-50/95 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center">
                <ShieldAlert className="w-8 h-8 text-[#e63946]" />
                <span className="text-sm font-extrabold text-[#e63946]">Phone Number Blocked — Actions Disabled</span>
                <span className="text-xs text-red-700">Unblock this lead to re-enable communication actions.</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-[#1d3557] text-sm uppercase tracking-wider">Quick Action Center</h3>
              <button
                onClick={handleBlockToggle}
                disabled={blockingAction}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isBlocked ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-red-50 text-[#e63946] border border-red-200 hover:bg-red-100'
                }`}
              >
                {isBlocked ? 'Unblock Phone' : 'Block Phone'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Phone, label: 'CALL NOW', action: () => setShowInitiateCallModal(true), bg: 'bg-emerald-600 hover:bg-emerald-700 text-white', disabled: isBlocked },
                { icon: MessageCircle, label: 'SEND TEMPLATE', action: () => setShowSendTemplateModal(true), bg: 'bg-[#457b9d] hover:bg-[#1d3557] text-white', disabled: isBlocked },
                { icon: Clock, label: 'CALLBACK LATER', action: () => setShowCallbackModal(true), bg: 'bg-[#f1faee] hover:bg-[#a8dadc]/40 text-[#1d3557] border border-[#a8dadc]', disabled: isBlocked },
                { icon: Plus, label: 'ADD NOTE', action: () => setShowNoteModal(true), bg: 'bg-[#f1faee] hover:bg-[#a8dadc]/40 text-[#457b9d] border border-[#a8dadc]', disabled: isBlocked },
              ].map(({ icon: Icon, label, action, bg, disabled }) => (
                <motion.button
                  key={label}
                  whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -2 }}
                  whileTap={{ scale: disabled ? 1 : 0.97 }}
                  onClick={action}
                  disabled={disabled}
                  className={`flex flex-col items-center justify-center gap-2 py-3.5 px-3 rounded-2xl font-extrabold transition-all text-center shadow-xs ${bg} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] tracking-wider uppercase">{label}</span>
                </motion.button>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <button
                disabled={isBlocked}
                onClick={() => setShowLogCallModal(true)}
                className="text-xs font-bold text-[#457b9d] hover:text-[#1d3557] hover:underline transition-colors disabled:opacity-40"
              >
                + Log call records manually
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-2xl border border-[#a8dadc] shadow-xs p-6 transition-all hover:shadow-md">
            <h3 className="font-extrabold text-[#1d3557] text-sm uppercase tracking-wider mb-4 pb-3 border-b border-gray-100">
              Activity & Calling History
            </h3>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { key: 'all', label: 'All Activities' },
                { key: 'call', label: 'Calls' },
                { key: 'followup', label: 'Callback Later' },
                { key: 'note', label: 'Notes' },
              ].map(tab => {
                let count = 0;
                if (tab.key === 'all') count = (lead.activities?.length || 0) + leadFollowups.length;
                else if (tab.key === 'followup') count = leadFollowups.length;
                else count = lead.activities?.filter(a => a.type === tab.key).length || 0;

                const isActive = activityFilter === tab.key;
                return (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    key={tab.key}
                    onClick={() => setActivityFilter(tab.key)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive ? 'bg-[#1d3557] text-white shadow-xs' : 'bg-[#f1faee] text-[#457b9d] hover:bg-[#a8dadc]/40 border border-[#a8dadc]'
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-[#a8dadc]/40 text-[#1d3557]'
                    }`}>
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Timeline Items */}
            <div className="relative border-l-2 border-[#a8dadc]/60 ml-4 space-y-6">
              {(() => {
                if (activityFilter === 'followup') {
                  if (leadFollowups.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm font-medium">No callback scheduled yet.</p>
                      </div>
                    );
                  }
                  return leadFollowups.map((f, i) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      key={f._id || i}
                      className="relative pl-6"
                    >
                      <div className="absolute -left-3.5 top-0 w-7 h-7 rounded-full bg-white border border-[#a8dadc] shadow-2xs flex items-center justify-center text-amber-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="bg-[#f1faee]/60 rounded-2xl p-4 border border-[#a8dadc] shadow-2xs">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="font-extrabold text-sm text-[#1d3557]">📅 Callback Scheduled</div>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            f.status === 'upcoming' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {f.status === 'upcoming' ? '⏳ Upcoming' : '✅ Done'}
                          </span>
                        </div>
                        {f.note && (
                          <p className="text-xs text-gray-700 italic mt-2 bg-white border border-[#a8dadc]/50 rounded-xl p-2.5">"{f.note}"</p>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-[10px] text-[#457b9d] font-bold">
                          <span>ASSIGNED TO: {f.assignedTo?.name || 'Unassigned'}</span>
                          {f.scheduledAt && <span>{format(new Date(f.scheduledAt), 'dd MMM yyyy, hh:mm a')}</span>}
                        </div>
                      </div>
                    </motion.div>
                  ));
                }

                const activityItems = activityFilter === 'all'
                  ? (lead.activities || [])
                  : (lead.activities || []).filter(a => a.type === activityFilter);

                const followupItems = activityFilter === 'all'
                  ? leadFollowups.map(f => ({
                      _followup: true,
                      _id: f._id,
                      type: 'followup',
                      description: f.note || 'Callback scheduled',
                      createdAt: f.createdAt,
                      scheduledAt: f.scheduledAt,
                      status: f.status,
                      performedBy: f.assignedTo,
                    }))
                  : [];

                const allItems = [...activityItems, ...followupItems].sort(
                  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );

                if (allItems.length === 0) {
                  return (
                    <div className="text-center py-10">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm font-medium">No activity history logged yet.</p>
                    </div>
                  );
                }

                return allItems.map((a, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    key={a._id || i}
                    className="relative pl-6"
                  >
                    <div className="absolute -left-3.5 top-0 w-7 h-7 rounded-full bg-white border border-[#a8dadc] shadow-2xs flex items-center justify-center">
                      {a._followup ? <Clock className="w-4 h-4 text-amber-500" /> : activityIcon(a.type)}
                    </div>
                    <div className="rounded-2xl p-4 bg-[#f1faee]/40 border border-[#a8dadc] shadow-2xs hover:border-[#457b9d] transition-colors">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="font-extrabold text-sm text-[#1d3557]">
                          {a._followup ? (
                            <span className="flex items-center gap-2">
                              Callback Scheduled
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                {a.status === 'upcoming' ? '⏳ Upcoming' : '✅ Done'}
                              </span>
                            </span>
                          ) : a.type === 'call' ? (
                            <span>Logged Call — {fmtDuration(a.callDuration)} ({a.callStatus?.toUpperCase() || 'CONNECTED'})</span>
                          ) : a.type === 'status_change' ? (
                            <span className="text-[#457b9d]">{a.description}</span>
                          ) : (
                            <span>{a.description}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 font-semibold">{a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}</span>
                      </div>
                      {a._followup && a.scheduledAt && (
                        <p className="text-xs text-amber-800 font-bold mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                          ⏰ Due: {format(new Date(a.scheduledAt), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      )}
                      {!a._followup && a.type === 'call' && a.description && (
                        <div className="mt-2 bg-white border border-[#a8dadc]/60 rounded-xl p-3">
                          <p className="text-xs text-gray-700 italic">"{a.description}"</p>
                          <button
                            onClick={() => setRunCallIqActivityId(a._id)}
                            className="mt-2 text-xs font-extrabold text-[#457b9d] hover:text-[#1d3557] flex items-center gap-1.5 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Run Call IQ Audit
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-[10px] text-[#457b9d] font-extrabold">
                        <span>BY: {a.performedBy?.name || 'System / Unassigned'}</span>
                        {a.createdAt && <span>{format(new Date(a.createdAt), 'dd MMM yyyy, hh:mm a')}</span>}
                      </div>
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {showNoteModal && <AddNoteModal onClose={() => setShowNoteModal(false)} onSubmit={handleAddNote} />}
        {showLogCallModal && <LogCallModal lead={lead} onClose={() => setShowLogCallModal(false)} onSubmit={handleLogManualCall} />}
        {showCallbackModal && lead && <CallbackTimeModal lead={lead} currentUser={user} onClose={() => setShowCallbackModal(false)} onScheduled={handleCallbackScheduled} />}
        {showDemoModal && lead && <ScheduleDemoModal lead={lead} onClose={() => setShowDemoModal(false)} onSave={handleScheduleDemo} />}
        {showInitiateCallModal && (
          <InitiateCallModal
            lead={lead}
            callers={callers}
            currentUser={user}
            onClose={() => setShowInitiateCallModal(false)}
            onSuccess={fetchLeadDetails}
          />
        )}
        {showSendTemplateModal && (
          <SendWhatsAppTemplateModal
            lead={lead}
            onClose={() => setShowSendTemplateModal(false)}
            onSuccess={fetchLeadDetails}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}