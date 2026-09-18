import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { followupsAPI, notificationsAPI, authAPI } from '../../services/api';
import logoImg from '../../assets/aotms-global-logo.png';
import useBreakpoint from '../../hooks/useBreakpoint';
import { useSidebar } from '../../context/SidebarContext';
import { Home, Users, CheckSquare, Mail, Megaphone, BarChart3, Bell, Clock, Settings, User, Key, LogOut, Shield, Sliders, Menu, X, ChevronDown, Sparkles } from 'lucide-react';

// Module-level helper — no hoisting issues
function formatNotifTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ── Change Password Modal ───────────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const eyeIcon = (visible) => visible ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const inputWrapStyle = { position: 'relative' };
  const inputStyle = { width: '100%', padding: '10px 38px 10px 12px', border: '1px solid var(--theme-border-tint)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const eyeBtnStyle = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex' };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--theme-text-strongest)', margin: 0 }}>Change Password</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={inputWrapStyle}>
              <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowCurrent(p => !p)} style={eyeBtnStyle}>{eyeIcon(showCurrent)}</button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <div style={inputWrapStyle}>
              <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} placeholder="At least 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(p => !p)} style={eyeBtnStyle}>{eyeIcon(showNew)}</button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <div style={inputWrapStyle}>
              <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Re-enter new password" autoComplete="new-password" />
            </div>
          </div>

          {error && <p style={{ color: '#e53e3e', fontSize: 12, margin: 0 }}>{error}</p>}
          {success && <p style={{ color: '#22a163', fontSize: 12, margin: 0, fontWeight: 600 }}>✓ Password changed successfully!</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, border: '1px solid var(--theme-border-tint)', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--theme-text-strongest)' }}>Cancel</button>
            <button type="submit" disabled={saving || success} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 10, background: 'var(--btn-gradient, linear-gradient(90deg, #ffb37c 0%, #38bdf8 100%))', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || success) ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const { toggleMobile } = useSidebar();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const [now, setNow] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Track which followup IDs we've already alerted so we don't repeat
  const alertedIds = useRef(new Set());

  const bellRef = useRef(null);
  const dropRef = useRef(null);
  const profileRef = useRef(null);
  const profileDropRef = useRef(null);
  const gearRef = useRef(null);
  const gearDropRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Poll real notifications from backend every 30s
  const pollNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsAPI.getAll({ limit: 30 });
      const dbNotifs = (res.data.notifications || []).map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        time: formatNotifTime(n.createdAt),
        read: n.read,
        leadId: n.lead?._id || n.lead,
        data: n.data || {},
      }));
      setNotifications(dbNotifs);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {
      // silent
    }
  }, [user]);

  // Also poll DB every 60s for due callback followups (for instant alert)
  const pollDueCallbacks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await followupsAPI.getAll({
        type: 'call_followup',
        status: 'upcoming',
        forMe: 'true',
      });
      const all = res.data.followups || [];
      const now = new Date();
      const due = all.filter(f => {
        const t = new Date(f.scheduledAt);
        return t <= now && !alertedIds.current.has(f._id);
      });
      if (due.length > 0) {
        due.forEach(f => alertedIds.current.add(f._id));
        // These are in-memory only (callback due alerts)
        const newNotifs = due.map(f => ({
          id: 'cb_' + f._id,
          type: 'callback_due',
          title: '📞 Callback Due Now!',
          message: `Call ${f.lead?.name || 'lead'} (${f.lead?.phone || ''}) — scheduled callback`,
          time: 'now',
          read: false,
          leadId: f.lead?._id,
          followupId: f._id,
          ephemeral: true,
        }));
        setNotifications(prev => [...newNotifs, ...prev.filter(n => !n.ephemeral || alertedIds.current.has(n.followupId))]);
        setUnreadCount(prev => prev + newNotifs.length);
      }
    } catch (e) {
      // silent
    }
  }, [user]);

  useEffect(() => {
    pollNotifications();
    pollDueCallbacks();
    const ni = setInterval(pollNotifications, 30000);
    const ci = setInterval(pollDueCallbacks, 60000);
    return () => { clearInterval(ni); clearInterval(ci); };
  }, [pollNotifications, pollDueCallbacks]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileDropRef.current && !profileDropRef.current.contains(e.target) &&
          profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (gearDropRef.current && !gearDropRef.current.contains(e.target) &&
          gearRef.current && !gearRef.current.contains(e.target)) {
        setShowWorkspaceSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const markRead = async (id) => {
    if (String(id).startsWith('cb_')) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    try {
      await notificationsAPI.markRead(id);
    } catch (e) {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Decide which module a notification should open when clicked
  const notifTarget = (n) => {
    const taskTypes = ['task_created', 'task_assigned', 'task_edited', 'task_overdue', 'task_reminder'];
    if (taskTypes.includes(n.type)) {
      const tab = n.data?.taskType === 'todo' ? 'Todo' : 'Call Followups';
      return `/tasks?tab=${encodeURIComponent(tab)}`;
    }
    if (n.type === 'callback_due') {
      return n.leadId ? `/leads/${n.leadId}` : '/tasks?tab=Call Followups';
    }
    if (n.type === 'workflow_action') {
      return n.leadId ? `/leads/${n.leadId}` : '/dashboard';
    }
    if (n.leadId) {
      // lead_assigned, lead_status_changed, lead_updated, new_lead, call_initiated, etc.
      return `/leads/${n.leadId}`;
    }
    return null;
  };

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const notifIcon = (type) => {
    if (type === 'callback_due') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    );
    if (type === 'lead_assigned' || type === 'new_lead') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22a163" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
    );
    if (type === 'lead_status_changed') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
    );
    if (type === 'lead_updated') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--theme-primary)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    );
    if (type === 'call_initiated') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    );
    if (type === 'followup') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--theme-primary)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    );
    if (type === 'task_created') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--theme-primary)" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    );
    if (type === 'task_reminder') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    );
    if (type === 'task_overdue') return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    );
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    );
  };

  const notifBg = (type) => {
    if (type === 'callback_due') return '#fff0f0';
    if (type === 'lead_assigned' || type === 'new_lead') return '#e8f8f0';
    if (type === 'lead_status_changed') return '#fff8e6';
    if (type === 'lead_updated') return 'var(--theme-surface-tint)';
    if (type === 'call_initiated') return '#e0f7fa';
    if (type === 'followup') return 'var(--theme-surface-tint)';
    if (type === 'task_created') return 'var(--theme-surface-tint)';
    if (type === 'task_reminder') return '#fff8e6';
    if (type === 'task_overdue') return '#fff0f0';
    if (type === 'campaign') return '#fff8e6';
    return '#f3f4f6';
  };

  const notifTitleColor = (type) => {
    if (type === 'callback_due') return '#991b1b';
    if (type === 'lead_assigned' || type === 'new_lead') return '#166534';
    if (type === 'lead_status_changed') return '#92400e';
    if (type === 'call_initiated') return '#155e75';
    return 'var(--theme-text-strongest)';
  };

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Employee';

  const workspaceSettingsGroups = [
    {
      label: 'WORKSPACE',
      items: [
        { label: 'Lead Fields', path: '/fields', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>) },
        { label: 'Lead Stage', path: '/lead-stage', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>) },
        { label: 'Call Feedback', path: '/call-feedback', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>) },
        { label: 'Custom Actions', path: '/custom-actions', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>) },
        { label: 'Preferences', path: '/workspace-preferences', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>) },
      ],
    },
    {
      label: 'TEAM',
      items: [
        { label: 'Users', path: '/users', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>) },
        { label: 'Permission Templates', path: '/permission-templates', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>) },
      ],
    },
    {
      label: 'BILLING',
      items: [
        { label: 'Buy Licenses', path: '/billing/buy-licenses', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>) },
        { label: 'Transaction History', path: '/billing/transactions', icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M18.4 8.6 13 14l-3-3-3.6 3.6"/></svg>) },
      ],
    },
  ];

  const isAdminLike = user?.role === 'admin' || user?.role === 'manager';

  const profileMenuItems = [
    {
      label: 'Profile',
      icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
      onClick: () => { setShowProfile(false); navigate('/profile'); }
    },
    {
      label: 'Change Password',
      icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
      onClick: () => { setShowProfile(false); setShowChangePassword(true); }
    },
    {
      label: 'Message Templates',
      icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
      onClick: () => { setShowProfile(false); navigate('/message-templates'); }
    },
    {
      label: 'Blocklist',
      icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>),
      onClick: () => { setShowProfile(false); navigate('/blocklist'); }
    },
    {
      label: 'My Preferences',
      icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
      onClick: () => { setShowProfile(false); navigate('/my-preferences'); }
    },
    {
      label: 'Logout',
      icon: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>),
      onClick: () => { setShowProfile(false); logout(); },
      danger: true
    },
  ];

  const crmNavLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'All Leads', path: '/leads', icon: Users },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Email CRM', path: '/email', icon: Mail },
    { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-16 flex px-0 bg-transparent pointer-events-auto">
        {/* Left Side Bar Extension - Flexible width */}
        <div className="flex-1 h-12 bg-gradient-to-r from-[#1d3557] to-[#2c4d75] border-b border-[#a8dadc]/40 relative min-w-0">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke="#a8dadc" strokeOpacity={0.2} strokeWidth={0.5} />
          </svg>
        </div>

        {/* Responsive Notch Container */}
        <div className="flex h-16 relative z-10 shrink-0 -ml-px">
          {/* Left Corner Notch Slice */}
          <div className="w-[45px] h-full relative shrink-0">
            <div
              className="absolute inset-0 bg-[#2c4d75]"
              style={{ clipPath: "path('M0 0 H45 V64 C22.5 64 22.5 48 0 48 Z')" }}
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 45 64">
              <path d="M0 47.5 C22.5 47.5 22.5 63.5 45 63.5" fill="none" stroke="#a8dadc" strokeOpacity={0.3} strokeWidth={0.8} />
            </svg>
          </div>

          {/* Center Slice (Main Content Area) */}
          <div className="flex-1 h-full relative min-w-0 -ml-px bg-gradient-to-r from-[#2c4d75] via-[#37627d] to-[#457b9d] shadow-lg rounded-b-2xl border-b border-x border-[#a8dadc]/40 px-3 sm:px-6 flex items-center justify-between gap-3">
            
            {/* Left: Mobile Hamburger + Logo + Workspace Gear */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {isMobile && (
                <button
                  onClick={toggleMobile}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                  aria-label="Toggle menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}

              <Link to="/dashboard" className="flex items-center gap-2 group">
                <img
                  src={logoImg}
                  alt="AOTMS Global"
                  className="h-8 sm:h-9 object-contain group-hover:scale-105 transition-transform"
                />
              </Link>

              {isAdminLike && (
                <div ref={gearRef} className="relative">
                  <motion.button
                    whileHover={{ rotate: 45 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setShowWorkspaceSettings(prev => !prev); setShowProfile(false); setShowNotifications(false); }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      showWorkspaceSettings ? 'bg-white/30 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                    }`}
                    title="Workspace Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </motion.button>

                  <AnimatePresence>
                    {showWorkspaceSettings && (
                      <motion.div
                        ref={gearDropRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-10 w-56 bg-white rounded-2xl shadow-2xl border border-[#a8dadc] z-50 overflow-hidden py-2"
                      >
                        {workspaceSettingsGroups.map((group, gi) => (
                          <div key={group.label} className={gi > 0 ? 'border-t border-gray-100 pt-1 mt-1' : ''}>
                            <div className="px-4 py-1 text-[10px] font-extrabold text-[#457b9d] uppercase tracking-wider">
                              {group.label}
                            </div>
                            {group.items.map(item => (
                              <div
                                key={item.path}
                                onClick={() => { setShowWorkspaceSettings(false); navigate(item.path); }}
                                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#1d3557] hover:bg-[#f1faee] cursor-pointer transition-colors"
                              >
                                <span className="text-[#457b9d]">{item.icon}</span>
                                {item.label}
                              </div>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Desktop Center Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {crmNavLinks.map(link => {
                const active = location.pathname.startsWith(link.path);
                const Icon = link.icon;
                return (
                  <motion.button
                    key={link.label}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(link.path)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-white text-[#1d3557] shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            {/* Right: Clock + Notifications + Account Details Tile */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {!isMobile && (
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-extrabold text-white leading-tight">{timeStr}</div>
                  <div className="text-[10px] font-semibold text-white/70">{dateStr}</div>
                </div>
              )}

              {/* Follow-up Calls Shortcut */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/tasks?tab=Call+Followups')}
                title="View Follow-up Calls"
                className="w-8 h-8 rounded-full border border-white/30 hover:border-white text-white/90 hover:text-white bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all hidden sm:flex"
              >
                <Clock className="w-4 h-4" />
              </motion.button>

              {/* Bell Notifications */}
              <div ref={bellRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowNotifications(prev => !prev); setShowProfile(false); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${
                    showNotifications ? 'bg-white text-[#1d3557]' : 'border border-white/30 text-white hover:bg-white/15'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="w-2.5 h-2.5 bg-[#e63946] rounded-full absolute top-0.5 right-0.5 border-2 border-[#457b9d]" />
                  )}
                </motion.button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      ref={dropRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-[#a8dadc] z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-[#f1faee]/60">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-[#1d3557]">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="bg-[#457b9d] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-[11px] font-bold text-[#457b9d] hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-gray-400">
                            <Bell className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markRead(n.id);
                                const target = notifTarget(n);
                                if (target) navigate(target);
                                setShowNotifications(false);
                              }}
                              className={`p-3 flex gap-2.5 cursor-pointer transition-colors ${
                                n.read ? 'bg-white hover:bg-gray-50' : 'bg-[#f1faee]/70 hover:bg-[#f1faee]'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-xl bg-[#f1faee] border border-[#a8dadc]/50 flex items-center justify-center shrink-0 text-[#457b9d] mt-0.5">
                                {notifIcon(n.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-xs font-bold text-[#1d3557] truncate">{n.title}</span>
                                  <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
                                </div>
                                <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug">{n.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 border-t border-gray-100 bg-[#f1faee]/30 text-center">
                        <button
                          onClick={() => { navigate('/tasks?tab=Call+Followups'); setShowNotifications(false); }}
                          className="text-xs font-bold text-[#457b9d] hover:text-[#1d3557] hover:underline"
                        >
                          View all follow-up calls
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Account Details Tile & Dropdown */}
              <div ref={profileRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowProfile(prev => !prev); setShowNotifications(false); }}
                  className="flex items-center gap-2 p-1 pr-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white"
                >
                  <div className="w-7 h-7 rounded-xl bg-white text-[#1d3557] font-extrabold text-xs flex items-center justify-center shadow-xs">
                    {initials}
                  </div>
                  {!isMobile && (
                    <div className="text-left leading-tight hidden xl:block">
                      <div className="text-xs font-extrabold truncate max-w-[100px]">{user?.name || 'User'}</div>
                      <div className="text-[9px] font-bold uppercase text-white/70 tracking-wider">{roleLabel}</div>
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                </motion.button>

                <AnimatePresence>
                  {showProfile && (
                    <motion.div
                      ref={profileDropRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-11 w-64 bg-white rounded-2xl shadow-2xl border border-[#a8dadc] z-50 overflow-hidden p-3"
                    >
                      {/* User Info Header Tile */}
                      <div className="p-3 bg-[#f1faee] rounded-xl border border-[#a8dadc]/60 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-sm text-[#1d3557] truncate">{user?.name || 'User'}</span>
                          <span className="text-[10px] font-extrabold bg-[#457b9d] text-white px-2 py-0.5 rounded-full uppercase">
                            Pro
                          </span>
                        </div>
                        <div className="inline-block text-[10px] font-bold text-[#457b9d] bg-white border border-[#a8dadc]/50 rounded-full px-2 py-0.2 mb-1.5">
                          {roleLabel}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 font-medium">
                          <Mail className="w-3 h-3 text-[#457b9d]" />
                          {user?.email || 'user@example.com'}
                        </p>
                      </div>

                      {/* Profile Action Menu Items */}
                      <div className="space-y-0.5">
                        {profileMenuItems.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={item.onClick}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              item.danger
                                ? 'text-[#e63946] hover:bg-red-50'
                                : 'text-[#1d3557] hover:bg-[#f1faee]'
                            }`}
                          >
                            <span className={item.danger ? 'text-[#e63946]' : 'text-[#457b9d]'}>{item.icon}</span>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>

          {/* Right Corner Notch Slice */}
          <div className="w-[45px] h-full relative shrink-0">
            <div
              className="absolute inset-0 bg-[#457b9d]"
              style={{ clipPath: "path('M0 0 H45 V48 C22.5 48 22.5 64 0 64 Z')" }}
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 45 64">
              <path d="M0 63.5 C22.5 63.5 22.5 47.5 45 47.5" fill="none" stroke="#a8dadc" strokeOpacity={0.3} strokeWidth={0.8} />
            </svg>
          </div>
        </div>

        {/* Right Side Bar Extension - Flexible width */}
        <div className="flex-1 h-12 bg-gradient-to-r from-[#457b9d] to-[#1d3557] border-b border-[#a8dadc]/40 relative min-w-0 -ml-px">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke="#a8dadc" strokeOpacity={0.2} strokeWidth={0.5} />
          </svg>
        </div>
      </header>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
}