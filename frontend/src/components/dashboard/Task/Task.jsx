import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { followupsAPI, leadsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { formatISTDateTime } from '../../../utils/dateFormat';
import { isLimitedStaff, isDeveloper, getTaskAssignorOptions, filterTeamDropdownUsers } from '../../../utils/permissions';

// Theme Palette Constants
const COLOR_DEEP_BLUE = '#023047';
const COLOR_BLUE_GREEN = '#219ebc';
const COLOR_SKY_LIGHT = '#8ecae6';
const COLOR_SKY_SURFACE = '#e8f4fa';
const COLOR_BORDER = '#bbdff0';
const COLOR_AMBER = '#ffb703';
const COLOR_ORANGE = '#fb8500';
const COLOR_MUTED = '#5b7082';

const STATUS_CONFIG = {
  upcoming:  { bg: '#e8f4fa', text: '#145d70', border: '#bbdff0', label: 'Upcoming' },
  pending:   { bg: '#e8f4fa', text: '#145d70', border: '#bbdff0', label: 'Upcoming' },
  done:      { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', label: 'Done' },
  late:      { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'Late' },
  cancelled: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', label: 'Cancelled' },
  locked:    { bg: '#fffbeb', text: '#92400e', border: '#fde68a', label: 'Locked' },
};

const PRIORITY_CONFIG = {
  high:   { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  medium: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  low:    { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', dot: '#10b981' },
};

// Check if a task is scheduled for a future day (Day-wise lock)
function isTaskLocked(scheduledAt) {
  if (!scheduledAt) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(scheduledAt) > endOfToday;
}

// ── 12-hour Time Picker ───────────────────────────────────────────────────────
function TimeInput12h({ value, onChange }) {
  const [hh24, mm] = value ? value.split(':') : ['09', '00'];
  const hh24Num = parseInt(hh24, 10) || 0;
  const period = hh24Num >= 12 ? 'PM' : 'AM';
  let hh12 = hh24Num % 12;
  if (hh12 === 0) hh12 = 12;

  const commit = (newHh12, newMm, newPeriod) => {
    let h = parseInt(newHh12, 10) % 12;
    if (newPeriod === 'PM') h += 12;
    const hhStr = String(h).padStart(2, '0');
    const mmStr = String(newMm).padStart(2, '0');
    onChange(`${hhStr}:${mmStr}`);
  };

  const selectStyle = {
    border: `1px solid ${COLOR_BORDER}`,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 14,
    fontWeight: 400,
    outline: 'none',
    background: '#fff',
    color: COLOR_DEEP_BLUE,
    cursor: 'pointer'
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        value={hh12}
        onChange={e => commit(e.target.value, mm, period)}
        style={{ ...selectStyle, width: 64 }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      <span style={{ color: COLOR_MUTED, fontWeight: 500, fontSize: 15 }}>:</span>
      <select
        value={mm}
        onChange={e => commit(hh12, e.target.value, period)}
        style={{ ...selectStyle, width: 64 }}
      >
        {Array.from({ length: 60 }, (_, i) => i).map(m => (
          <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <div style={{ display: 'flex', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
        {['AM', 'PM'].map(p => (
          <button
            type="button"
            key={p}
            onClick={() => commit(hh12, mm, p)}
            style={{
              border: 'none',
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              background: period === p ? COLOR_BLUE_GREEN : '#fff',
              color: period === p ? '#fff' : COLOR_DEEP_BLUE,
              transition: 'all 0.15s ease'
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ task, onClose, onSaved, readOnly = false }) {
  const [form, setForm] = useState({
    note: task.note || task.description || '',
    scheduledAt: task.scheduledAt ? task.scheduledAt.slice(0, 16) : '',
    priority: task.priority || 'medium',
    status: task.status || 'upcoming',
    title: task.title || task.note || task.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    setError('');
    try {
      const update = {
        note: form.note,
        title: task.type === 'todo' ? form.note : (form.title || ''),
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        priority: form.priority,
        status: form.status,
      };
      const res = await followupsAPI.update(task._id, update);
      onSaved(res.data.followup);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 48, 71, 0.45)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)', border: `1px solid ${COLOR_BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 }}>
            {readOnly ? 'Task Details' : (task.type === 'todo' ? 'Edit Todo' : 'Edit Follow-up')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: COLOR_MUTED, lineHeight: 1 }}>×</button>
        </div>

        {readOnly && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e', fontWeight: 400 }}>
            View only. You can complete this task from the list, but only managers or admins can modify details.
          </div>
        )}

        {task.lead?.name && (
          <div style={{ background: COLOR_SKY_SURFACE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '11px 14px', marginBottom: 16, fontSize: 14, color: COLOR_DEEP_BLUE, fontWeight: 500 }}>
            Lead: {task.lead.name} {task.lead.phone ? `(${task.lead.phone})` : ''}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              {task.type === 'todo' ? 'Todo Description' : 'Description / Note'}
            </label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={3}
              disabled={readOnly}
              style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontWeight: 400, resize: 'none', outline: 'none', boxSizing: 'border-box', background: readOnly ? '#f8fafc' : '#fff', color: readOnly ? '#64748b' : COLOR_DEEP_BLUE }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Due Date & Time</label>
            <div style={{ display: 'flex', gap: 10, opacity: readOnly ? 0.6 : 1, pointerEvents: readOnly ? 'none' : 'auto' }}>
              <input
                type="date"
                value={form.scheduledAt ? form.scheduledAt.slice(0, 10) : ''}
                onChange={e => {
                  const timePart = form.scheduledAt ? form.scheduledAt.slice(11, 16) : '09:00';
                  setForm(f => ({ ...f, scheduledAt: e.target.value + 'T' + timePart }));
                }}
                disabled={readOnly}
                style={{ flex: 1, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, fontWeight: 400, outline: 'none', color: COLOR_DEEP_BLUE, boxSizing: 'border-box' }}
              />
              <TimeInput12h
                value={form.scheduledAt ? form.scheduledAt.slice(11, 16) : '09:00'}
                onChange={time => {
                  const datePart = form.scheduledAt ? form.scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                  setForm(f => ({ ...f, scheduledAt: datePart + 'T' + time }));
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                disabled={readOnly}
                style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, fontWeight: 400, outline: 'none', background: readOnly ? '#f8fafc' : '#fff', color: readOnly ? '#64748b' : COLOR_DEEP_BLUE }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                disabled={readOnly}
                style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, fontWeight: 400, outline: 'none', background: readOnly ? '#f8fafc' : '#fff', color: readOnly ? '#64748b' : COLOR_DEEP_BLUE }}
              >
                <option value="upcoming">Upcoming</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 14px', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: COLOR_DEEP_BLUE }}>
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1, padding: '10px 14px', border: 'none', borderRadius: 8, background: COLOR_ORANGE, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Upload Modal (With Todo List Support & Sample Template Download) ─────────
function UploadModal({ activeTab, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const isTodoTab = activeTab === 'Todo';

  const downloadSampleTemplate = (type) => {
    let headers, rows;
    if (type === 'todo') {
      headers = ['Task', 'Due Date', 'Priority', 'Type'];
      rows = [
        ['Review broadband fiber expansion blueprint', '2026-09-25 10:00', 'high', 'todo'],
        ['Compile weekly team performance metrics', '2026-09-24 17:30', 'medium', 'todo'],
        ['Follow up on departmental software licenses', '2026-09-28 12:00', 'low', 'todo'],
      ];
    } else {
      headers = ['Note', 'Due Date', 'Priority', 'Phone', 'Type'];
      rows = [
        ['Call client regarding tariff plan upgrade', '2026-09-22 11:30', 'high', '9876543210', 'call_followup'],
        ['Follow up on enterprise router installation', '2026-09-23 15:00', 'medium', '9123456780', 'call_followup'],
      ];
    }
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type}_upload_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose an Excel or CSV file first');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await followupsAPI.import(formData);
      setResult({ count: res.data.count, total: res.data.total });
      onImported();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 48, 71, 0.45)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, padding: 26, boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)', border: `1px solid ${COLOR_BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: COLOR_SKY_SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLOR_BLUE_GREEN }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 }}>
              {isTodoTab ? 'Upload Todo List' : 'Upload Tasks / Follow-ups'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: COLOR_MUTED, lineHeight: 1 }}>×</button>
        </div>

        <p style={{ fontSize: 13, color: COLOR_MUTED, margin: '6px 0 16px', lineHeight: 1.5 }}>
          Upload multiple {isTodoTab ? 'Todo items' : 'tasks or call follow-ups'} at once via an Excel or CSV file. Download a template below if you need the exact format.
        </p>

        {/* Template Downloads */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => downloadSampleTemplate('todo')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${COLOR_BORDER}`,
              background: isTodoTab ? COLOR_SKY_SURFACE : '#fff',
              color: COLOR_DEEP_BLUE,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Todo Template (.csv)
          </button>
          <button
            type="button"
            onClick={() => downloadSampleTemplate('call_followup')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${COLOR_BORDER}`,
              background: !isTodoTab ? COLOR_SKY_SURFACE : '#fff',
              color: COLOR_DEEP_BLUE,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Follow-up Template (.csv)
          </button>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${file ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
            borderRadius: 10,
            padding: '28px 18px',
            textAlign: 'center',
            cursor: 'pointer',
            background: file ? COLOR_SKY_SURFACE : '#fbfdfe',
            transition: 'all 0.15s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={COLOR_BLUE_GREEN} strokeWidth="1.75" style={{ margin: '0 auto 10px' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 500, color: file ? COLOR_BLUE_GREEN : COLOR_DEEP_BLUE }}>
            {file ? file.name : `Click or drag your ${isTodoTab ? 'Todo list' : 'tasks'} file here`}
          </div>
          <div style={{ fontSize: 12, color: COLOR_MUTED, marginTop: 4 }}>Supports .xlsx, .xls or .csv</div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
        {result && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', marginTop: 14, color: '#065f46', fontSize: 13, fontWeight: 500 }}>
            Successfully imported {result.count} of {result.total} items.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 14px', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: COLOR_DEEP_BLUE }}>
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              style={{ flex: 1, padding: '10px 14px', border: 'none', borderRadius: 8, background: COLOR_ORANGE, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: (uploading || !file) ? 0.6 : 1 }}
            >
              {uploading ? 'Uploading...' : `Upload ${isTodoTab ? 'Todo List' : 'Tasks'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ type = 'todo', onClose, onCreated }) {
  const { user: currentUser } = useAuth();
  const [taskType, setTaskType] = useState(type === 'call_followup' ? 'call_followup' : 'todo');
  const isCallFollowup = taskType === 'call_followup';
  const canAssign = !!currentUser;

  const [note, setNote] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [priority, setPriority] = useState('medium');
  const [leadQuery, setLeadQuery] = useState('');
  const [leadResults, setLeadResults] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [repeatFrequency, setRepeatFrequency] = useState('none');
  const [repeatEndDate, setRepeatEndDate] = useState('');

  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState(currentUser?._id || '');
  const [assignedBy, setAssignedBy] = useState(currentUser?._id || '');

  useEffect(() => {
    if (!canAssign) return;
    usersAPI.getAll()
      .then(res => setUsers(res.data.users || []))
      .catch((err) => {
        console.error('Failed to load users for assignment:', err);
        setUsers([]);
      });
  }, [canAssign]);

  const assignableUsers = (() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      const list = [...users];
      if (!list.some(u => u._id === 'all')) list.push({ _id: 'all', name: 'All' });
      return list;
    }
    return getTaskAssignorOptions(currentUser, users);
  })();

  const assignedByUsers = getTaskAssignorOptions(currentUser, users);

  useEffect(() => {
    if (!assignableUsers.length) return;
    if (!assignableUsers.some(u => u._id === assignedTo)) {
      setAssignedTo(currentUser?._id || assignableUsers[0]._id);
    }
  }, [users, assignableUsers]);

  useEffect(() => {
    if (!assignedByUsers.length) return;
    if (!assignedByUsers.some(u => u._id === assignedBy)) {
      setAssignedBy(assignedByUsers[0]._id);
    }
  }, [users, assignedByUsers]);

  // Lead search
  useEffect(() => {
    if (!isCallFollowup || selectedLead || leadQuery.trim().length < 2) {
      setLeadResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await leadsAPI.getAll({ search: leadQuery.trim(), limit: 6 });
        setLeadResults(res.data.leads || []);
      } catch (err) {
        setLeadResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [leadQuery, isCallFollowup, selectedLead]);

  const handleCreate = async () => {
    setError('');
    if (!note.trim()) {
      setError('Please enter a note / description');
      return;
    }
    if (!scheduledAt) {
      setError('Please choose a due date & time');
      return;
    }
    if (repeatFrequency !== 'none' && !repeatEndDate) {
      setError('Please choose an end date for the repeating task');
      return;
    }
    if (repeatFrequency !== 'none' && new Date(repeatEndDate) < new Date(scheduledAt)) {
      setError('Repeat end date must be after the due date');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: taskType,
        title: note.trim(),
        note: note.trim(),
        description: note.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        priority,
      };
      if (isCallFollowup && selectedLead) payload.lead = selectedLead._id;
      if (canAssign) {
        let finalAssignedTo = assignedTo || currentUser._id;
        if (finalAssignedTo === 'ameen_fallback') {
          const realAmeen = users.find(u => u.name?.toLowerCase().trim() === 'ameen');
          finalAssignedTo = realAmeen ? realAmeen._id : currentUser._id;
        }
        payload.assignedTo = finalAssignedTo;

        let finalAssignedBy = assignedBy || currentUser._id;
        if (finalAssignedBy === 'ameen_fallback') {
          const realAmeen = users.find(u => u.name?.toLowerCase().trim() === 'ameen');
          finalAssignedBy = realAmeen ? realAmeen._id : currentUser._id;
        }
        payload.assignedBy = finalAssignedBy;
      }
      if (repeatFrequency !== 'none') {
        payload.recurrence = {
          frequency: repeatFrequency,
          endDate: new Date(repeatEndDate + 'T23:59:59').toISOString(),
        };
      }
      const res = await followupsAPI.create(payload);
      onCreated(res.data.followup);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 48, 71, 0.45)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)', border: `1px solid ${COLOR_BORDER}`, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 }}>
            Create {isCallFollowup ? 'Call Follow-up' : 'Todo Item'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: COLOR_MUTED, lineHeight: 1 }}>×</button>
        </div>

        {type === 'all' && (
          <div style={{ display: 'flex', background: COLOR_SKY_SURFACE, padding: 3, borderRadius: 8, border: `1px solid ${COLOR_BORDER}`, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setTaskType('todo')}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 6,
                border: 'none',
                background: taskType === 'todo' ? '#fff' : 'transparent',
                color: taskType === 'todo' ? COLOR_DEEP_BLUE : COLOR_MUTED,
                fontWeight: taskType === 'todo' ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: taskType === 'todo' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              📋 Todo Item
            </button>
            <button
              type="button"
              onClick={() => setTaskType('call_followup')}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 6,
                border: 'none',
                background: taskType === 'call_followup' ? '#fff' : 'transparent',
                color: taskType === 'call_followup' ? COLOR_DEEP_BLUE : COLOR_MUTED,
                fontWeight: taskType === 'call_followup' ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: taskType === 'call_followup' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              📞 Call Follow-up
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {isCallFollowup && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Link to Lead (Optional)</label>
              {selectedLead ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: COLOR_SKY_SURFACE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 14, color: COLOR_DEEP_BLUE, fontWeight: 500 }}>
                    {selectedLead.name} {selectedLead.phone ? `(${selectedLead.phone})` : ''}
                  </span>
                  <button type="button" onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: COLOR_MUTED, cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Type name or phone to search leads..."
                    value={leadQuery}
                    onChange={e => setLeadQuery(e.target.value)}
                    style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: COLOR_DEEP_BLUE }}
                  />
                  {searching && <div style={{ fontSize: 12, color: COLOR_MUTED, marginTop: 4 }}>Searching leads...</div>}
                  {leadResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                      {leadResults.map(l => (
                        <div
                          key={l._id}
                          onClick={() => { setSelectedLead(l); setLeadResults([]); setLeadQuery(''); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f4f8' }}
                          onMouseEnter={e => e.currentTarget.style.background = COLOR_SKY_SURFACE}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontWeight: 500, color: COLOR_DEEP_BLUE }}>{l.name}</span>
                          <span style={{ color: COLOR_MUTED, marginLeft: 8 }}>{l.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              {isCallFollowup ? 'Follow-up Details' : 'Todo Task Description'}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder={isCallFollowup ? 'What should this call be about?' : 'What needs to be accomplished?'}
              style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontWeight: 400, resize: 'none', outline: 'none', boxSizing: 'border-box', color: COLOR_DEEP_BLUE }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Due Date & Time</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="date"
                value={scheduledAt ? scheduledAt.slice(0, 10) : ''}
                onChange={e => {
                  const timePart = scheduledAt ? scheduledAt.slice(11, 16) : '09:00';
                  setScheduledAt(e.target.value + 'T' + timePart);
                }}
                style={{ flex: 1, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: COLOR_DEEP_BLUE }}
              />
              <TimeInput12h
                value={scheduledAt ? scheduledAt.slice(11, 16) : '09:00'}
                onChange={time => {
                  const datePart = scheduledAt ? scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                  setScheduledAt(datePart + 'T' + time);
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: COLOR_DEEP_BLUE }}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Recurrence</label>
            <select
              value={repeatFrequency}
              onChange={e => setRepeatFrequency(e.target.value)}
              style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: COLOR_DEEP_BLUE }}
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {repeatFrequency !== 'none' && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 4 }}>Repeat Until</label>
                <input
                  type="date"
                  value={repeatEndDate}
                  min={scheduledAt ? scheduledAt.slice(0, 10) : undefined}
                  onChange={e => setRepeatEndDate(e.target.value)}
                  style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: COLOR_DEEP_BLUE }}
                />
              </div>
            )}
          </div>

          {canAssign && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Assigned To</label>
                <select
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: COLOR_DEEP_BLUE }}
                >
                  {assignableUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {u._id === 'all'
                        ? 'All'
                        : `${u.name}${u._id === currentUser?._id ? ' (You)' : (u.displayName || u.designation ? ` (${u.displayName || u.designation})` : '')}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: COLOR_DEEP_BLUE, display: 'block', marginBottom: 6 }}>Assigned By</label>
                <select
                  value={assignedBy}
                  onChange={e => setAssignedBy(e.target.value)}
                  style={{ width: '100%', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: COLOR_DEEP_BLUE }}
                >
                  {assignedByUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {u._id === 'all'
                        ? 'All'
                        : `${u.name}${u._id === currentUser?._id ? ' (You)' : (u.displayName || u.designation ? ` (${u.displayName || u.designation})` : '')}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 14px', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: COLOR_DEEP_BLUE }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            style={{ flex: 1, padding: '10px 14px', border: 'none', borderRadius: 8, background: COLOR_ORANGE, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Creating...' : `Create ${isCallFollowup ? 'Follow-up' : 'Todo'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Download Helper ───────────────────────────────────────────────────────────
function downloadCSV(tasks, tab) {
  const headers = ['Type', 'Lead Name', 'Phone', 'Description / Note', 'Assignee', 'Assigned By', 'Status', 'Due Date (IST)', 'Priority'];
  const rows = tasks.map(t => [
    t.type === 'todo' ? 'Todo' : 'Call Follow-up',
    t.lead?.name || '',
    t.lead?.phone || '',
    t.title || t.note || t.description || '',
    t.assignedTo?.name || '',
    (t.assignedBy?.name || t.assignedBy) === 'all' ? 'All' : (t.assignedBy?.name || ''),
    t.status || '',
    t.scheduledAt ? formatISTDateTime(t.scheduledAt) : '',
    t.priority || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tab.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Task Component ───────────────────────────────────────────────────────
export default function Task() {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isLimited = isLimitedStaff(currentUser);

  const [activeTab, setActiveTab] = useState(() => {
    if (isLimited) return 'Todo';
    const tab = searchParams.get('tab');
    if (tab) {
      const lower = tab.toLowerCase();
      if (lower === 'todo' || lower === 'todo list' || lower === 'todos') return 'Todo';
      if (lower === 'call followups' || lower === 'call_followup' || lower === 'calls') return 'Call Followups';
      if (lower === 'tasks' || lower === 'all' || lower === 'all tasks') return 'Tasks';
      return tab;
    }
    return 'Tasks';
  });

  useEffect(() => {
    if (isLimited) {
      if (activeTab !== 'Todo') setActiveTab('Todo');
      return;
    }
    const tab = searchParams.get('tab');
    if (tab) {
      const lower = tab.toLowerCase();
      let matchedTab = tab;
      if (lower === 'todo' || lower === 'todo list' || lower === 'todos') matchedTab = 'Todo';
      else if (lower === 'call followups' || lower === 'call_followup' || lower === 'calls') matchedTab = 'Call Followups';
      else if (lower === 'tasks' || lower === 'all' || lower === 'all tasks') matchedTab = 'Tasks';

      if (matchedTab !== activeTab) {
        setActiveTab(matchedTab);
      }
    }
  }, [searchParams, isLimited, activeTab]);

  const [forFilter, setForFilter] = useState(() => {
    if (isLimitedStaff(currentUser)) return 'Me';
    return (currentUser?.role === 'admin' || currentUser?.role === 'manager') ? 'Team' : 'Me';
  });

  useEffect(() => {
    if (isLimitedStaff(currentUser) && forFilter !== 'Me') {
      setForFilter('Me');
    }
  }, [currentUser, forFilter]);

  const [dueFilter, setDueFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(['pending', 'late', 'cancelled']);
  const [historyMode, setHistoryMode] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdditional, setShowAdditional] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');
  const [editingTask, setEditingTask] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [descriptionPopup, setDescriptionPopup] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamMemberFilter, setTeamMemberFilter] = useState('');
  const [showTeamDrop, setShowTeamDrop] = useState(false);
  const teamDropRef = useRef(null);
  const canDelete = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const [markingCompleteId, setMarkingCompleteId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page to 1 whenever tab or any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, forFilter, dueFilter, statusFilter, priorityFilter, teamMemberFilter, historyMode]);

  const canEditTask = () => currentUser?.role !== 'caller' && currentUser?.role !== 'employee';

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let queryType;
      if (activeTab === 'Todo') queryType = 'todo';
      else if (activeTab === 'Call Followups') queryType = 'call_followup';
      else queryType = undefined; // 'Tasks' loads all tasks

      if (historyMode) {
        const res = await followupsAPI.getAll({
          forMe: forFilter === 'Me',
          due: dueFilter ? dueFilter.toLowerCase().replace(' ', '_') : undefined,
          status: 'done',
          type: queryType,
          ...(teamMemberFilter ? { callerId: teamMemberFilter } : {}),
        });
        let items = res.data.followups || res.data.tasks || [];
        items = items.filter(t => t.status === 'done');
        if (priorityFilter) items = items.filter(t => t.priority === priorityFilter);
        setTasks(items);
        return;
      }

      const isAll = statusFilter.length === 3;
      const wantsLate = statusFilter.includes('late');
      const wantsPending = statusFilter.includes('pending');
      const wantsCancelled = statusFilter.includes('cancelled');

      const dbStatuses = [];
      if (wantsPending || wantsLate) dbStatuses.push('upcoming');
      if (wantsCancelled) dbStatuses.push('cancelled');

      const res = await followupsAPI.getAll({
        forMe: forFilter === 'Me',
        due: dueFilter ? dueFilter.toLowerCase().replace(' ', '_') : undefined,
        status: dbStatuses.join(','),
        type: queryType,
        ...(teamMemberFilter ? { callerId: teamMemberFilter } : {}),
      });
      let items = res.data.followups || res.data.tasks || [];
      items = items.filter(t => t.status !== 'done');

      if (!isAll) {
        if (wantsLate && !wantsPending) {
          items = items.filter(t =>
            (t.status === 'cancelled' && wantsCancelled) ||
            (t.status === 'upcoming' && new Date(t.scheduledAt) < new Date())
          );
        } else if (wantsPending && !wantsLate) {
          items = items.filter(t =>
            (t.status === 'cancelled' && wantsCancelled) ||
            (t.status === 'upcoming' && new Date(t.scheduledAt) >= new Date())
          );
        }
      }

      if (priorityFilter) {
        items = items.filter(t => t.priority === priorityFilter);
      }
      setTasks(items);
    } catch (err) {
      console.error(err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, forFilter, dueFilter, statusFilter, priorityFilter, teamMemberFilter, historyMode]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Listen for global tasks-updated events (e.g. from check-in modal)
  useEffect(() => {
    const handleTasksUpdated = () => {
      fetchTasks();
    };
    window.addEventListener('tasks-updated', handleTasksUpdated);
    return () => window.removeEventListener('tasks-updated', handleTasksUpdated);
  }, [fetchTasks]);

  useEffect(() => {
    usersAPI.getAll().then(r => {
      const all = r.data.users || [];
      setTeamUsers(filterTeamDropdownUsers(all));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (teamDropRef.current && !teamDropRef.current.contains(e.target)) setShowTeamDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchTasksRef = useRef(fetchTasks);
  useEffect(() => { fetchTasksRef.current = fetchTasks; }, [fetchTasks]);
  const additionalRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (additionalRef.current && !additionalRef.current.contains(e.target)) setShowAdditional(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleEditSaved = (updated) => {
    setTasks(prev => {
      if (!historyMode && updated.status === 'done') {
        return prev.filter(t => t._id !== updated._id);
      }
      if (historyMode && updated.status !== 'done') {
        return prev.filter(t => t._id !== updated._id);
      }
      return prev.map(t => t._id === updated._id ? { ...t, ...updated } : t);
    });
    setEditingTask(null);
  };

  const handleMarkComplete = async (taskId) => {
    setMarkingCompleteId(taskId);
    try {
      await followupsAPI.update(taskId, { status: 'done' });
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      console.error('Failed to mark task complete:', err);
      alert(err.response?.data?.message || 'Failed to mark task complete');
    } finally {
      setMarkingCompleteId(null);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      setDeletingTaskId(taskId);
      await followupsAPI.delete(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Sort Tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortField === 'dueDate') {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return sortDir === 'asc' ? ta - tb : tb - ta;
    }
    if (sortField === 'lead') {
      const la = (a.lead?.name || a.type || '').toLowerCase();
      const lb = (b.lead?.name || b.type || '').toLowerCase();
      return sortDir === 'asc' ? la.localeCompare(lb) : lb.localeCompare(la);
    }
    if (sortField === 'description') {
      const da = (a.title || a.note || a.description || '').toLowerCase();
      const db = (b.title || b.note || b.description || '').toLowerCase();
      return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
    }
    if (sortField === 'assignee') {
      const aa = (a.assignedTo?.name || a.assignee?.name || '').toLowerCase();
      const ab = (b.assignedTo?.name || b.assignee?.name || '').toLowerCase();
      return sortDir === 'asc' ? aa.localeCompare(ab) : ab.localeCompare(aa);
    }
    if (sortField === 'assignedBy') {
      const ba = ((a.assignedBy?.name || a.assignedBy) === 'all' ? 'All' : (a.assignedBy?.name || '')).toLowerCase();
      const bb = ((b.assignedBy?.name || b.assignedBy) === 'all' ? 'All' : (b.assignedBy?.name || '')).toLowerCase();
      return sortDir === 'asc' ? ba.localeCompare(bb) : bb.localeCompare(ba);
    }
    if (sortField === 'priority') {
      const order = { high: 3, medium: 2, low: 1 };
      const pa = order[a.priority] || 0;
      const pb = order[b.priority] || 0;
      return sortDir === 'asc' ? pa - pb : pb - pa;
    }
    if (sortField === 'status') {
      const sa = (a.status || '').toLowerCase();
      const sb = (b.status || '').toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    }
    return 0;
  });

  // Pagination calculations
  const totalItems = sortedTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

  return (
    <div style={{ padding: '28px 32px', background: '#f4f8fb', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Description Popup */}
      {descriptionPopup && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(2, 48, 71, 0.45)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setDescriptionPopup(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, padding: 26, boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)', border: `1px solid ${COLOR_BORDER}` }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0 }}>Task Description</h3>
              <button onClick={() => setDescriptionPopup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: COLOR_MUTED, lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', fontWeight: 400 }}>{descriptionPopup}</p>
          </div>
        </div>
      )}

      {editingTask && (
        <EditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={handleEditSaved}
          readOnly={!canEditTask(editingTask)}
        />
      )}

      {showUploadModal && (
        <UploadModal
          activeTab={activeTab}
          onClose={() => setShowUploadModal(false)}
          onImported={fetchTasks}
        />
      )}

      {showAddModal && (
        <AddTaskModal
          type={activeTab === 'Call Followups' ? 'call_followup' : activeTab === 'Todo' ? 'todo' : 'all'}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            fetchTasksRef.current();
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: COLOR_DEEP_BLUE, margin: 0, letterSpacing: '-0.01em' }}>
            {activeTab === 'Todo'
              ? 'Todo List & Actions'
              : activeTab === 'Call Followups'
              ? 'Call Follow-up Management'
              : 'Tasks & Todo Management'}
          </h1>
          <p style={{ fontSize: 14, color: COLOR_MUTED, margin: '4px 0 0', fontWeight: 400 }}>
            {activeTab === 'Todo'
              ? 'Organize daily to-dos, shift tasks, and internal assignments'
              : activeTab === 'Call Followups'
              ? 'Track call follow-ups, customer schedules, and lead commitments'
              : 'Overview of all tasks, shift goals, and call follow-up commitments'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Refresh button */}
          <button
            onClick={fetchTasks}
            title="Refresh tasks"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: `1px solid ${COLOR_BORDER}`,
              background: '#fff',
              color: COLOR_BLUE_GREEN,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(2, 48, 71, 0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/>
            </svg>
          </button>

          {!historyMode && (
            <>
              {/* New Task / Todo CTA */}
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: COLOR_ORANGE,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#fff',
                  fontWeight: 500,
                  padding: '9px 18px',
                  boxShadow: '0 2px 8px rgba(251, 133, 0, 0.25)',
                  transition: 'background 0.15s ease'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {activeTab === 'Todo' ? 'New Todo' : activeTab === 'Call Followups' ? 'New Follow-up' : 'New Task'}
              </button>

              {/* Upload Todo List / Tasks Form Button */}
              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: COLOR_SKY_SURFACE,
                  border: `1px solid ${COLOR_BORDER}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: COLOR_BLUE_GREEN,
                  fontWeight: 500,
                  padding: '9px 16px',
                  transition: 'all 0.15s ease'
                }}
                title={activeTab === 'Todo' ? 'Open Todo List Excel/CSV Upload Form' : 'Open Tasks Upload Form'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {activeTab === 'Todo' ? 'Upload Todo List' : 'Upload Tasks'}
              </button>
            </>
          )}

          {/* Export CSV */}
          <button
            onClick={() => downloadCSV(tasks, activeTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: '#fff',
              border: `1px solid ${COLOR_BORDER}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              color: COLOR_DEEP_BLUE,
              fontWeight: 500,
              padding: '9px 16px',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLOR_BLUE_GREEN} strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLOR_BORDER}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(isLimited ? ['Todo'] : ['Tasks', 'Todo', 'Call Followups']).map(tab => {
            const isActive = !historyMode && activeTab === tab;
            const tabLabel = tab === 'Tasks' ? 'Tasks' : tab === 'Todo' ? 'Todo List' : 'Call Followups';
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setHistoryMode(false); }}
                style={{
                  padding: '11px 22px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 500,
                  color: isActive ? COLOR_DEEP_BLUE : COLOR_MUTED,
                  borderBottom: isActive ? `3px solid ${COLOR_BLUE_GREEN}` : '3px solid transparent',
                  marginBottom: -1,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {tab === 'Tasks' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                ) : tab === 'Call Followups' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                )}
                {tabLabel}
              </button>
            );
          })}
        </div>

        {/* History tab */}
        <button
          onClick={() => setHistoryMode(p => !p)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '11px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            color: historyMode ? COLOR_DEEP_BLUE : COLOR_MUTED,
            borderBottom: historyMode ? `3px solid ${COLOR_AMBER}` : '3px solid transparent',
            marginBottom: -1,
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
          </svg>
          Completed History
        </button>
      </div>

      {historyMode && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '11px 16px', marginBottom: 16, fontSize: 13, color: '#065f46', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Showing completed tasks. To reopen any task, edit it and update status to Upcoming.</span>
        </div>
      )}

      {/* Filters bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap', background: '#fff', padding: '12px 18px', borderRadius: 10, border: `1px solid ${COLOR_BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: COLOR_MUTED, fontWeight: 500 }}>Filter For:</span>
          <button
            onClick={() => setForFilter('Me')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: forFilter === 'Me' ? COLOR_BLUE_GREEN : COLOR_SKY_SURFACE,
              color: forFilter === 'Me' ? '#fff' : COLOR_DEEP_BLUE,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            My {activeTab === 'Todo' ? 'Todos' : 'Tasks'}
          </button>
          {!isLimitedStaff(currentUser) && (
            <div ref={teamDropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setForFilter('Team'); setShowTeamDrop(p => !p); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: forFilter === 'Team' ? COLOR_BLUE_GREEN : COLOR_SKY_SURFACE,
                  color: forFilter === 'Team' ? '#fff' : COLOR_DEEP_BLUE,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {teamMemberFilter ? (teamUsers.find(u => u._id === teamMemberFilter)?.name || 'Team') : 'Team'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points={showTeamDrop ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                </svg>
              </button>
              {showTeamDrop && (
                <div style={{
                  position: 'absolute', top: '115%', left: 0, zIndex: 300,
                  background: '#fff', border: `1px solid ${COLOR_BORDER}`, borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(2, 48, 71, 0.12)', minWidth: 200, padding: '6px 0'
                }}>
                  <div
                    onClick={() => { setTeamMemberFilter(''); setShowTeamDrop(false); }}
                    style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: !teamMemberFilter ? COLOR_BLUE_GREEN : COLOR_DEEP_BLUE, fontWeight: 500, background: !teamMemberFilter ? COLOR_SKY_SURFACE : 'transparent' }}
                  >
                    All (HR, CTO, MD)
                  </div>
                  {teamUsers.map(u => (
                    <div
                      key={u._id}
                      onClick={() => { setTeamMemberFilter(u._id); setShowTeamDrop(false); }}
                      style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: teamMemberFilter === u._id ? COLOR_BLUE_GREEN : COLOR_DEEP_BLUE, fontWeight: 400, background: teamMemberFilter === u._id ? COLOR_SKY_SURFACE : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLOR_SKY_SURFACE, color: COLOR_DEEP_BLUE, fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.name}</div>
                        {u.designation && <div style={{ fontSize: 11, color: COLOR_MUTED }}>{u.designation}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 22, background: COLOR_BORDER }} />

        {/* Due date filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: COLOR_MUTED, fontWeight: 500 }}>Due:</span>
          <select
            value={dueFilter || ''}
            onChange={e => setDueFilter(e.target.value || null)}
            style={{
              border: `1px solid ${dueFilter ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 400,
              background: dueFilter ? COLOR_SKY_SURFACE : '#fff',
              color: COLOR_DEEP_BLUE,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Time</option>
            {['Today', 'Tomorrow', 'This Week', 'Overdue'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {!historyMode && (
          <>
            <div style={{ width: 1, height: 22, background: COLOR_BORDER }} />

            {/* Status filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: COLOR_MUTED, fontWeight: 500 }}>Status:</span>
              <select
                value={statusFilter.length === 1 ? statusFilter[0] : statusFilter.length === 3 ? 'all' : 'custom'}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'all') setStatusFilter(['pending', 'late', 'cancelled']);
                  else if (val === 'pending') setStatusFilter(['pending']);
                  else if (val === 'late') setStatusFilter(['late']);
                  else if (val === 'cancelled') setStatusFilter(['cancelled']);
                }}
                style={{
                  border: `1px solid ${statusFilter.length < 3 ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 400,
                  background: statusFilter.length < 3 ? COLOR_SKY_SURFACE : '#fff',
                  color: COLOR_DEEP_BLUE,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Upcoming</option>
                <option value="late">Overdue / Late</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </>
        )}

        <div style={{ width: 1, height: 22, background: COLOR_BORDER }} />

        {/* Priority Filter */}
        <div ref={additionalRef} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <span style={{ fontSize: 14, color: COLOR_MUTED, fontWeight: 500 }}>Priority:</span>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            style={{
              border: `1px solid ${priorityFilter ? COLOR_BLUE_GREEN : COLOR_BORDER}`,
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 400,
              background: priorityFilter ? COLOR_SKY_SURFACE : '#fff',
              color: COLOR_DEEP_BLUE,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div style={{ flex: 1 }} />

        {/* Total found badge */}
        <div style={{ fontSize: 13, color: COLOR_MUTED, fontWeight: 400 }}>
          <span style={{ color: COLOR_DEEP_BLUE, fontWeight: 500 }}>{totalItems}</span> {activeTab === 'Todo' ? 'todos' : 'tasks'} found
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ background: '#fff', border: `1px solid ${COLOR_BORDER}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(2, 48, 71, 0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${COLOR_BORDER}` }}>
              {[
                ...(activeTab === 'Tasks' ? [{ label: 'Type / Lead', field: 'lead' }] : []),
                ...(activeTab === 'Call Followups' ? [{ label: 'Lead', field: 'lead' }] : []),
                { label: activeTab === 'Todo' ? 'Todo Description' : 'Description', field: 'description' },
                { label: 'Assignee', field: 'assignee' },
                { label: 'Assigned By', field: 'assignedBy' },
                { label: 'Status', field: 'status' },
                { label: 'Due Date', field: 'dueDate' },
                { label: 'Priority', field: 'priority' },
                { label: 'Actions', field: null },
              ].map(col => (
                <th
                  key={col.label}
                  onClick={() => col.field && handleSort(col.field)}
                  style={{
                    padding: '14px 18px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: sortField === col.field ? COLOR_BLUE_GREEN : COLOR_MUTED,
                    cursor: col.field ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {col.label}
                    {col.field && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {sortField === col.field && sortDir === 'asc' ? (
                          <polyline points="18 15 12 9 6 15"/>
                        ) : (
                          <polyline points="6 9 12 15 18 9"/>
                        )}
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={activeTab === 'Todo' ? 7 : 8} style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div className="spinner-gradient" style={{ width: 28, height: 28, margin: '0 auto' }} />
                  <p style={{ fontSize: 14, color: COLOR_MUTED, marginTop: 12 }}>Loading {activeTab === 'Todo' ? 'todos' : 'tasks'}...</p>
                </td>
              </tr>
            ) : paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'Todo' ? 7 : 8} style={{ padding: '80px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, color: COLOR_DEEP_BLUE, fontWeight: 500 }}>
                    No {activeTab === 'Todo' ? 'Todos' : activeTab === 'Call Followups' ? 'Call Follow-ups' : 'Tasks'} Found
                  </div>
                  <p style={{ fontSize: 14, color: COLOR_MUTED, margin: '6px 0 0', fontWeight: 400 }}>
                    {historyMode
                      ? `No completed ${activeTab === 'Todo' ? 'todos' : 'tasks'} in history`
                      : `You're all caught up! Create a new ${activeTab === 'Todo' ? 'todo' : 'task'} or upload an Excel/CSV list.`}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task, i) => {
                const locked = isTaskLocked(task.scheduledAt);
                const isLate = !locked && task.status === 'upcoming' && new Date(task.scheduledAt) < new Date();
                const displayKey = locked ? 'locked' : (isLate ? 'late' : (task.status || 'upcoming'));
                const statusMeta = STATUS_CONFIG[displayKey] || STATUS_CONFIG.upcoming;
                const priorityMeta = PRIORITY_CONFIG[task.priority || 'medium'] || PRIORITY_CONFIG.medium;

                return (
                  <tr
                    key={task._id || i}
                    style={{ borderBottom: `1px solid #f1f5f9`, transition: 'background 0.1s ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fbfe'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Type / Lead for All Tasks Tab */}
                    {activeTab === 'Tasks' && (
                      <td style={{ padding: '14px 18px', fontSize: 14, color: COLOR_DEEP_BLUE }}>
                        {task.type === 'todo' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: 6,
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: 12,
                            fontWeight: 500,
                            border: '1px solid #bae6fd'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                            Todo
                          </span>
                        ) : task.lead?._id ? (
                          <div
                            onClick={() => navigate(`/leads/${task.lead._id}`)}
                            style={{ cursor: 'pointer' }}
                            title="Open lead details"
                          >
                            <div style={{ fontWeight: 500, color: COLOR_BLUE_GREEN, textDecoration: 'none' }}>
                              {task.lead.name}
                            </div>
                            <div style={{ fontSize: 13, color: COLOR_MUTED, marginTop: 2 }}>{task.lead.phone}</div>
                          </div>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: 6,
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: 12,
                            fontWeight: 500,
                            border: '1px solid #fde68a'
                          }}>
                            📞 Call Follow-up
                          </span>
                        )}
                      </td>
                    )}

                    {/* Lead for Call Followups Tab */}
                    {activeTab === 'Call Followups' && (
                      <td style={{ padding: '14px 18px', fontSize: 14, color: COLOR_DEEP_BLUE }}>
                        {task.lead?._id ? (
                          <div
                            onClick={() => navigate(`/leads/${task.lead._id}`)}
                            style={{ cursor: 'pointer' }}
                            title="Open lead details"
                          >
                            <div style={{ fontWeight: 500, color: COLOR_BLUE_GREEN, textDecoration: 'none' }}>
                              {task.lead.name}
                            </div>
                            <div style={{ fontSize: 13, color: COLOR_MUTED, marginTop: 2 }}>{task.lead.phone}</div>
                          </div>
                        ) : (
                          <div style={{ color: COLOR_MUTED }}>—</div>
                        )}
                      </td>
                    )}

                    {/* Description */}
                    <td style={{ padding: '14px 18px', fontSize: 14, color: '#334155', maxWidth: 280 }}>
                      <div
                        onClick={() => setDescriptionPopup(task.title || task.note || task.description || '')}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          fontWeight: 400
                        }}
                        title="Click to view complete details"
                      >
                        {task.title || task.note || task.description || '—'}
                      </div>
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: COLOR_SKY_SURFACE,
                          border: `1px solid ${COLOR_BORDER}`,
                          color: COLOR_DEEP_BLUE,
                          fontSize: 11,
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {(task.assignedTo?.name || task.assignee?.name || 'ME').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 14, color: COLOR_DEEP_BLUE, fontWeight: 400 }}>
                          {task.assignedTo?.name || task.assignee?.name || 'Me'}
                        </span>
                      </div>
                    </td>

                    {/* Assigned By */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(task.assignedBy?.name || task.assignedBy === 'all' || task.assignedBy === 'All') ? (
                          <>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              color: '#92400e',
                              fontSize: 11,
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {((task.assignedBy?.name || task.assignedBy) === 'all' || (task.assignedBy?.name || task.assignedBy) === 'All')
                                ? 'ALL'
                                : (task.assignedBy?.name || '').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 14, color: COLOR_DEEP_BLUE, fontWeight: 400 }}>
                              {((task.assignedBy?.name || task.assignedBy) === 'all' || (task.assignedBy?.name || task.assignedBy) === 'All')
                                ? 'All'
                                : task.assignedBy.name}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 14, color: COLOR_MUTED }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: statusMeta.bg,
                        color: statusMeta.text,
                        border: `1px solid ${statusMeta.border}`,
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {locked
                          ? `Locked (${new Date(task.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`
                          : (isLate ? 'Late' : (statusMeta.label || task.status))}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '14px 18px', fontSize: 14, color: COLOR_DEEP_BLUE, whiteSpace: 'nowrap' }}>
                      {task.scheduledAt ? formatISTDateTime(task.scheduledAt) : '—'}
                    </td>

                    {/* Priority Badge */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: priorityMeta.bg,
                        color: priorityMeta.text,
                        border: `1px solid ${priorityMeta.border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        textTransform: 'capitalize'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityMeta.dot }} />
                        {task.priority || 'low'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Edit or View */}
                        <button
                          title={canEditTask(task) ? 'Edit Task' : 'View Task Details'}
                          onClick={() => setEditingTask(task)}
                          style={{
                            background: '#fff',
                            border: `1px solid ${COLOR_BORDER}`,
                            borderRadius: 6,
                            padding: '6px 8px',
                            cursor: 'pointer',
                            color: COLOR_DEEP_BLUE,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {canEditTask(task) ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLOR_BLUE_GREEN} strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLOR_BLUE_GREEN} strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>

                        {/* Complete button */}
                        {!historyMode && (
                          <button
                            title={locked ? `Locked until ${new Date(task.scheduledAt).toLocaleDateString('en-IN')}` : 'Mark Complete'}
                            onClick={() => !locked && handleMarkComplete(task._id)}
                            disabled={locked || markingCompleteId === task._id}
                            style={{
                              background: '#fff',
                              border: `1px solid ${locked ? '#e2e8f0' : '#a7f3d0'}`,
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: locked ? 'not-allowed' : 'pointer',
                              color: locked ? '#94a3b8' : '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: (locked || markingCompleteId === task._id) ? 0.5 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {locked ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        )}

                        {/* Delete button (Admin / Manager) */}
                        {canDelete && (
                          <button
                            title="Delete Task"
                            onClick={() => handleDelete(task._id)}
                            disabled={deletingTaskId === task._id}
                            style={{
                              background: '#fff',
                              border: '1px solid #fecaca',
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: deletingTaskId === task._id ? 0.5 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4h6v2"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Pagination Bar (1 of N, Previous / Next) ────────────────────────── */}
        {!loading && totalItems > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: '#fff',
            borderTop: `1px solid ${COLOR_BORDER}`,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 13, color: COLOR_MUTED, fontWeight: 400 }}>
                Showing <strong style={{ color: COLOR_DEEP_BLUE, fontWeight: 500 }}>{startIndex + 1}</strong> to <strong style={{ color: COLOR_DEEP_BLUE, fontWeight: 500 }}>{endIndex}</strong> of <strong style={{ color: COLOR_DEEP_BLUE, fontWeight: 500 }}>{totalItems}</strong> {activeTab === 'Todo' ? 'todos' : 'tasks'}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: COLOR_MUTED, fontWeight: 400 }}>Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    border: `1px solid ${COLOR_BORDER}`,
                    borderRadius: 6,
                    fontSize: 13,
                    background: '#fff',
                    color: COLOR_DEEP_BLUE,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: `1px solid ${currentPage <= 1 ? '#e2e8f0' : COLOR_BORDER}`,
                  background: currentPage <= 1 ? '#f8fafc' : '#fff',
                  color: currentPage <= 1 ? '#94a3b8' : COLOR_DEEP_BLUE,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Previous
              </button>

              {/* Page Indicator (1 of N) */}
              <div style={{
                fontSize: 13,
                color: COLOR_DEEP_BLUE,
                padding: '6px 12px',
                borderRadius: 6,
                background: COLOR_SKY_SURFACE,
                border: `1px solid ${COLOR_BORDER}`,
                fontWeight: 500
              }}>
                {currentPage} of {totalPages}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: `1px solid ${currentPage >= totalPages ? '#e2e8f0' : COLOR_BORDER}`,
                  background: currentPage >= totalPages ? '#f8fafc' : '#fff',
                  color: currentPage >= totalPages ? '#94a3b8' : COLOR_DEEP_BLUE,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Next
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
