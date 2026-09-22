import { useAuth } from '../../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { followupsAPI, notificationsAPI, authAPI } from '../../../services/api';
import logoImg from '../../../assets/aotms-global-logo.png';
import useBreakpoint from '../../../hooks/useBreakpoint';
import {
  FaHouse, FaListCheck, FaUserPlus, FaUsers, FaBullhorn, FaFileLines,
  FaWhatsapp, FaEnvelopeOpenText, FaTrophy, FaChartPie, FaFileInvoiceDollar,
  FaReceipt, FaCalendarCheck, FaLocationDot, FaPeopleGroup, FaClock,
  FaBan, FaUserGear, FaKey, FaPlug, FaCircleInfo, FaCoins, FaSitemap,
  FaCode, FaBell, FaChevronDown, FaBars, FaXmark, FaRightFromBracket,
  FaUser, FaLock, FaUserCheck
} from 'react-icons/fa6';
import { isCEO, isHR, isLimitedStaff, canViewDashboard, normalizeDesignation } from '../../../utils/permissions';


/* ─────────────────────────────────────────────────────────
   THEME — BLUE, ORANGE & CRISP WHITE
   ───────────────────────────────────────────────────────── */
const C = {
  /* Background — Crisp White Glass */
  bg:           'rgba(255, 255, 255, 0.95)',   // white glass
  bgSolid:      '#ffffff',                     // solid pure white
  bgSoft:       '#f8fafc',                     // cool calm soft surface (slate-50)
  bgHover:      'rgba(249, 115, 22, 0.10)',    // Orange hover bg

  /* Blue (Primary for Icons & Brand) */
  blue:         '#0284c7',                     // Vibrant Sky/Royal Blue for icons
  blueLt:       '#38bdf8',                     // Light Blue
  blueDk:       '#0369a1',                     // Deep Blue
  blueGlow:     'rgba(2, 132, 199, 0.35)',     // Blue glow
  blueSoft:     'rgba(2, 132, 199, 0.10)',     // Subtle blue bg

  /* Orange (Hover, Dropdown highlight, Active, Badges) */
  orange:       '#f97316',                     // Vibrant Orange
  orangeLt:     '#fb923c',                     // Light Orange
  orangeDk:     '#ea580c',                     // Deep Orange
  orangeGlow:   'rgba(249, 115, 22, 0.35)',    // Orange glow
  orangeSoft:   'rgba(249, 115, 22, 0.10)',    // Orange soft surface

  /* Text — Dark, crisp, cool and calm */
  text:         '#0f172a',                     // Slate-900 (crisp readable on white)
  textSoft:     '#475569',                     // Slate-600
  textMuted:    '#94a3b8',                     // Slate-400

  /* Borders — Clean subtle with Orange / Blue accents */
  border:       '#e2e8f0',                     // Clean slate border
  borderSoft:   '#f1f5f9',                     // Subtle border
  borderHover:  '#f97316',                     // Orange border on hover
  borderOrange: 'rgba(249, 115, 22, 0.45)',    // Orange border accent
  borderBlue:   'rgba(2, 132, 199, 0.45)',     // Blue border accent
};

// Module-level helper
function formatNotifTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/* ─────────────────────────────────────────────────────────
   GLOBAL NAVBAR STYLES (Blue icons, Orange hover & dropdown, White bg)
   ───────────────────────────────────────────────────────── */
const navbarGlowStyles = `
  @keyframes navGlowPulse {
    0%, 100% {
      box-shadow:
        0 0 8px rgba(249, 115, 22, 0.35),
        0 0 20px rgba(2, 132, 199, 0.15),
        inset 0 0 6px rgba(249, 115, 22, 0.10);
    }
    50% {
      box-shadow:
        0 0 14px rgba(249, 115, 22, 0.55),
        0 0 30px rgba(249, 115, 22, 0.25),
        inset 0 0 10px rgba(2, 132, 199, 0.18);
    }
  }

  @keyframes bellPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.08); }
  }

  @keyframes notifBadgePulse {
    0%, 100% {
      box-shadow: 0 0 6px rgba(249, 115, 22, 0.8), 0 0 14px rgba(249, 115, 22, 0.45);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 12px rgba(249, 115, 22, 0.95), 0 0 24px rgba(249, 115, 22, 0.6);
      transform: scale(1.15);
    }
  }

  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .nav-glow-text {
    color: #0284c7;
    transition: color .25s ease, text-shadow .25s ease;
  }

  .nav-glow-text:hover {
    color: #0284c7 !important;
  }

  .nav-glow-accent-text {
    background: linear-gradient(90deg, #0284c7, #0369a1, #38bdf8, #0284c7);
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    animation: gradientShift 4s ease infinite;
    font-weight: 800;
    letter-spacing: 0.06em;
  }

  .nav-glow-btn {
    position: relative;
    transition: all .25s ease;
  }

  .nav-glow-btn:hover {
    border-color: #f97316 !important;
    box-shadow: 0 0 10px rgba(249, 115, 22, 0.35);
    transform: translateY(-1px);
  }

  .nav-glow-icon-btn {
    transition: all .25s ease;
    position: relative;
  }

  .nav-glow-icon-btn:hover {
    box-shadow:
      0 0 10px rgba(249, 115, 22, 0.45),
      0 0 20px rgba(249, 115, 22, 0.20),
      inset 0 0 6px rgba(249, 115, 22, 0.10);
    border-color: #f97316 !important;
  }

  .nav-glow-icon-btn:hover svg {
    filter: drop-shadow(0 0 5px rgba(2, 132, 199, 0.5));
    color: #0284c7 !important;
  }

  .nav-dropdown-glow {
    box-shadow:
      0 20px 50px rgba(15, 23, 42, 0.12),
      0 0 0 1.5px #f97316,
      0 8px 30px rgba(249, 115, 22, 0.12);
  }

  .nav-dropdown-item-glow {
    transition: all .2s ease;
    border: 1px solid transparent;
  }

  .nav-dropdown-item-glow:hover {
    background: rgba(2, 132, 199, 0.05) !important;
    border-color: #f97316 !important;
    box-shadow: inset 0 0 8px rgba(249, 115, 22, 0.08);
  }

  .nav-dropdown-item-glow:hover svg {
    filter: drop-shadow(0 0 4px rgba(2, 132, 199, 0.5));
    color: #0284c7 !important;
  }

  .nav-dropdown-item-glow:hover span {
    color: #0284c7 !important;
  }

  .nav-pulse-bell {
    animation: bellPulse 2.4s ease-in-out infinite;
  }
`;

/* ─────────────────────────────────────────────────────────
   Change Password Modal (obsidian emerald & electric lime)
   ───────────────────────────────────────────────────────── */
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
         style={{ background: 'rgba(15, 23, 42, 0.65)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md p-6 rounded-2xl"
        style={{
          background: C.bgSolid,
          border: `1.5px solid ${C.orange}`,
          boxShadow: `0 30px 80px rgba(15, 23, 42, 0.25), 0 0 30px ${C.orangeGlow}`,
          color: C.text,
        }}
      >
        <div className="flex items-center justify-between mb-4 pb-3"
             style={{ borderBottom: `1px solid ${C.border}` }}>
          <h3 className="font-semibold text-base nav-glow-accent-text">Change Password</h3>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ color: C.textSoft }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.bgHover; e.currentTarget.style.color = C.orange; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSoft; }}>
            <FaXmark className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                   style={{ color: C.textSoft }}>
              Current Password
            </label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl p-2.5 pr-10 text-sm transition-all outline-none"
                style={{ background: C.bgSoft, border: `1px solid ${C.border}`, color: C.text }}
                onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 3px ${C.orangeGlow}`; }}
                onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowCurrent(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: C.blue }}>
                {eyeIcon(showCurrent)}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                   style={{ color: C.textSoft }}>
              New Password
            </label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full rounded-xl p-2.5 pr-10 text-sm transition-all outline-none"
                style={{ background: C.bgSoft, border: `1px solid ${C.border}`, color: C.text }}
                onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 3px ${C.orangeGlow}`; }}
                onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                placeholder="At least 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: C.blue }}>
                {eyeIcon(showNew)}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1 block"
                   style={{ color: C.textSoft }}>
              Confirm New Password
            </label>
            <input type={showNew ? 'text' : 'password'} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl p-2.5 text-sm transition-all outline-none"
              style={{ background: C.bgSoft, border: `1px solid ${C.border}`, color: C.text }}
              onFocus={(e) => { e.target.style.borderColor = C.orange; e.target.style.boxShadow = `0 0 0 3px ${C.orangeGlow}`; }}
              onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              placeholder="Re-enter new password" autoComplete="new-password" />
          </div>

          {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
          {success && <p className="text-xs font-medium nav-glow-accent-text">✓ Password changed successfully!</p>}

          <div className="flex gap-2.5 mt-5">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl py-2.5 font-medium text-sm transition-all"
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSoft }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.bgHover; e.currentTarget.style.color = C.orange; e.currentTarget.style.borderColor = C.orange; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSoft; e.currentTarget.style.borderColor = C.border; }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || success}
              className="flex-1 rounded-xl py-2.5 font-semibold text-sm nav-glow-btn"
              style={{
                background: `linear-gradient(135deg, ${C.orangeLt}, ${C.orange}, ${C.orangeDk})`,
                color: '#ffffff',
                boxShadow: `0 0 16px ${C.orangeGlow}`,
              }}>
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const [now, setNow] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const alertedIds = useRef(new Set());

  const bellRef = useRef(null);
  const dropRef = useRef(null);
  const profileRef = useRef(null);
  const profileDropRef = useRef(null);
  const navDropdownRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const pollNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsAPI.getAll({ limit: 30 });
      const dbNotifs = (res.data.notifications || []).map(n => ({
        id: n._id, type: n.type, title: n.title, message: n.message,
        time: formatNotifTime(n.createdAt), read: n.read,
        leadId: n.lead?._id || n.lead, data: n.data || {},
      }));
      setNotifications(dbNotifs);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {}
  }, [user]);

  const pollDueCallbacks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await followupsAPI.getAll({ type: 'call_followup', status: 'upcoming', forMe: 'true' });
      const all = res.data.followups || [];
      const now = new Date();
      const due = all.filter(f => {
        const t = new Date(f.scheduledAt);
        return t <= now && !alertedIds.current.has(f._id);
      });
      if (due.length > 0) {
        due.forEach(f => alertedIds.current.add(f._id));
        const newNotifs = due.map(f => ({
          id: 'cb_' + f._id, type: 'callback_due',
          title: '📞 Callback Due Now!',
          message: `Call ${f.lead?.name || 'lead'} (${f.lead?.phone || ''}) — scheduled callback`,
          time: 'now', read: false, leadId: f.lead?._id,
          followupId: f._id, ephemeral: true,
        }));
        setNotifications(prev => [...newNotifs, ...prev.filter(n => !n.ephemeral || alertedIds.current.has(n.followupId))]);
        setUnreadCount(prev => prev + newNotifs.length);
      }
    } catch (e) {}
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
      if (dropRef.current && !dropRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileDropRef.current && !profileDropRef.current.contains(e.target) && profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (navDropdownRef.current && !navDropdownRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try { await notificationsAPI.markAllRead(); } catch (e) {}
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id) => {
    if (String(id).startsWith('cb_')) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    try { await notificationsAPI.markRead(id); } catch (e) {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const notifTarget = (n) => {
    const taskTypes = ['task_created', 'task_assigned', 'task_edited', 'task_overdue', 'task_reminder'];
    if (taskTypes.includes(n.type)) return `/tasks?tab=${encodeURIComponent(n.data?.taskType === 'todo' ? 'Todo' : 'Call Followups')}`;
    if (n.type === 'callback_due') return n.leadId ? `/leads/${n.leadId}` : '/tasks?tab=Call Followups';
    if (n.leadId) return `/leads/${n.leadId}`;
    return null;
  };

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee';

  const isLimited = isLimitedStaff(user);
  const displayDesignation = user?.displayName || user?.designation || roleLabel;

  // Designation Navigation Rules:
  // 1. CEO & HR: Full navigation, Dashboard shown under Information.
  // 2. Remaining All: Dashboard is removed completely. Only Task is shown, along with Email CRM & Attendance.
  const hasDashboard = canViewDashboard(user);

  const topDropdownGroups = !hasDashboard ? [
    {
      title: 'TODO List',
      icon: FaListCheck,
      items: [
        { label: 'TODO List', path: '/tasks', icon: FaListCheck },
      ]
    },
    {
      title: 'Email CRM',
      icon: FaEnvelopeOpenText,
      items: [
        { label: 'Email CRM', path: '/email', icon: FaEnvelopeOpenText },
      ]
    },
    {
      title: 'Attendance',
      icon: FaCalendarCheck,
      items: [
        { label: 'Attendance', path: '/admin/attendance-records', icon: FaCalendarCheck },
      ]
    }
  ] : [
    { title: 'Information', icon: FaCircleInfo, items: [
      { label: 'Dashboard', path: '/dashboard', icon: FaHouse },
      { label: 'Task', path: '/tasks', icon: FaListCheck },
    ]},
    { title: 'Marketing', icon: FaBullhorn, items: [
      { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
      { label: 'All Leads', path: '/leads', icon: FaUsers },
      { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
      { label: 'Message Templates', path: '/message-templates', icon: FaFileLines },
      { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
      { label: 'Leaderboard', path: '/leaderboard', icon: FaTrophy },
      { label: 'Reports', path: '/reports', icon: FaChartPie },
    ]},
    { title: 'Finance', icon: FaCoins, items: [
      { label: 'Offer letter', path: '/offer-letter', icon: FaFileInvoiceDollar },
      { label: 'Payslip', path: '/payslips', icon: FaReceipt },
      { label: 'Quotation', path: '/quotation', icon: FaFileInvoiceDollar },
      { label: 'Invoice', path: '/invoice', icon: FaReceipt },
    ]},
    { title: 'Management', icon: FaSitemap, items: [
      { label: 'Attendance', path: '/admin/attendance-records', icon: FaCalendarCheck },
      { label: 'Live Tracking', path: '/admin/employee-tracking', icon: FaLocationDot, adminOnly: !isHR(user) && !isCEO(user) },
      { label: 'Email CRM', path: '/email', icon: FaEnvelopeOpenText },
      { label: 'Team Ops', path: '/team-operations', icon: FaPeopleGroup },
      { label: 'Idle Leads', path: '/stale-leads', icon: FaClock },
      { label: 'Blocklist', path: '/blocklist', icon: FaBan },
      { label: 'Users', path: '/users', icon: FaUserGear },
      { label: 'Approvals', path: '/accept', icon: FaUserCheck },
    ]},
    { title: 'Developer', icon: FaCode, items: [
      { label: 'Access Tokens', path: '/access-tokens', icon: FaKey },
      { label: 'Integrations', path: '/integrations', icon: FaPlug },
    ]},
  ];

  const profileMenuItems = [
    { label: 'Profile', icon: <FaUser className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); navigate('/profile'); } },
    { label: 'Change Password', icon: <FaLock className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); setShowChangePassword(true); } },
    ...(!isLimited ? [
      { label: 'Message Templates', icon: <FaFileLines className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); navigate('/message-templates'); } },
      { label: 'Blocklist', icon: <FaBan className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); navigate('/blocklist'); } },
    ] : []),
    { label: 'Logout', icon: <FaRightFromBracket className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); logout(); }, danger: true },
  ];

  return (
    <>
      <style>{navbarGlowStyles}</style>

      <header className="fixed top-0 inset-x-0 z-50 h-20 flex px-0 select-none"
              style={{
                filter: 'drop-shadow(0 6px 20px rgba(15, 23, 42, 0.08)) drop-shadow(0 1px 4px rgba(249, 115, 22, 0.12))',
              }}>

        {/* Left Extension Bar */}
        <div className="flex-1 h-12 z-20 relative min-w-0"
             style={{
               background: C.bg,
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)',
               borderBottom: `1px solid ${C.border}`,
             }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke={C.orange} strokeOpacity={0.7} strokeWidth={1} />
            <line x1="0" y1="44.5" x2="100%" y2="44.5" stroke={C.blue} strokeOpacity={0.4} strokeWidth={0.5} />
          </svg>
        </div>

        {/* Center Notch */}
        <div className="flex h-20 relative z-10 shrink-0 -ml-px">

          {/* Left Slice */}
          <div className="w-[55px] h-full relative shrink-0">
            <div className="absolute inset-0"
                 style={{
                   background: C.bg,
                   backdropFilter: 'blur(20px)',
                   WebkitBackdropFilter: 'blur(20px)',
                   clipPath: "path('M0 0 H55 V80 C28 80 28 48 0 48 Z')",
                 }} />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 55 80">
              <path d="M0 47.5 C28 47.5 28 79.5 55 79.5" fill="none" stroke={C.orange} strokeOpacity={0.7} strokeWidth={1} />
              <path d="M0 44.5 C28 44.5 28 76.5 55 76.5" fill="none" stroke={C.blue} strokeOpacity={0.4} strokeWidth={0.5} />
            </svg>
          </div>

          {/* Center Content */}
          <div className="flex-1 h-full relative min-w-0 -ml-px">
            <div className="absolute inset-0"
                 style={{
                   background: C.bg,
                   backdropFilter: 'blur(20px)',
                   WebkitBackdropFilter: 'blur(20px)',
                 }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <line x1="0" y1="79.5" x2="100%" y2="79.5" stroke={C.orange} strokeOpacity={0.7} strokeWidth={1} />
                <line x1="0" y1="76.5" x2="100%" y2="76.5" stroke={C.blue} strokeOpacity={0.4} strokeWidth={0.5} />
              </svg>
            </div>

            <div className="relative w-full h-full flex items-center justify-between pb-1 px-4 sm:px-8 gap-3 sm:gap-6">

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-xl nav-glow-icon-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                style={{
                  background: C.bgSoft,
                  border: `1px solid ${mobileMenuOpen ? C.orange : C.border}`,
                  color: mobileMenuOpen ? C.orange : C.blue,
                }}
              >
                {mobileMenuOpen
                  ? <FaXmark className="w-5 h-5" style={{ color: C.orange }} />
                  : <FaBars className="w-5 h-5" style={{ color: C.blue }} />}
              </button>

              {/* Logo */}
              <div className="flex items-center shrink-0">
                <Link to={hasDashboard ? "/dashboard" : "/tasks"} className="flex items-center gap-2 group">
                  <img
                    src={logoImg}
                    alt="AOTMS Logo"
                    className="h-9 sm:h-11 object-contain transition-all"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.25))' }}
                  />
                </Link>
              </div>

              {/* Desktop nav */}
              <nav ref={navDropdownRef} className="hidden lg:flex gap-1.5 xl:gap-3 shrink-0 items-center">
                {topDropdownGroups.map(group => {
                  const GroupIcon = group.icon;
                  const isOpen = activeDropdown === group.title;
                  const isGroupActive = group.items.some(item => location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path.length > 1));

                  return (
                    <div key={group.title} className="relative">
                      <motion.button
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (group.items.length === 1) {
                            setActiveDropdown(null);
                            navigate(group.items[0].path);
                          } else {
                            setActiveDropdown(isOpen ? null : group.title);
                          }
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all nav-glow-btn"
                        style={{
                          background: (isOpen || isGroupActive) ? C.blueSoft : 'transparent',
                          color: C.blue,
                          border: `1px solid ${(isOpen || isGroupActive) ? C.orange : 'transparent'}`,
                          boxShadow: (isOpen || isGroupActive) ? `0 0 10px ${C.orangeGlow}` : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isOpen && !isGroupActive) {
                            e.currentTarget.style.borderColor = C.orange;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isOpen && !isGroupActive) {
                            e.currentTarget.style.borderColor = 'transparent';
                          }
                        }}
                      >
                        <GroupIcon
                          className="nav-group-icon w-3.5 h-3.5 transition-colors duration-200"
                          style={{
                            color: C.blue,
                            filter: `drop-shadow(0 0 3px ${C.blueGlow})`
                          }}
                        />
                        <span className="tracking-wide" style={{ color: C.blue }}>{group.title}</span>
                        {group.items.length > 1 && (
                          <FaChevronDown
                            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            style={{ color: C.blue }}
                          />
                        )}
                      </motion.button>

                      <AnimatePresence>
                        {isOpen && group.items.length > 1 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-12 w-60 rounded-2xl z-50 overflow-hidden py-2 nav-dropdown-glow"
                            style={{
                              background: C.bgSolid,
                              border: `1.5px solid ${C.orange}`,
                              boxShadow: `0 20px 50px rgba(15, 23, 42, 0.12), 0 0 20px ${C.orangeGlow}`,
                            }}
                          >
                            <div className="h-0.5 w-full -mt-2 mb-1" style={{ background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLt}, ${C.blue})` }} />
                            {group.items
                              .filter(item => !item.adminOnly || user?.role === 'admin' || isCEO(user) || isHR(user) || item.path.includes('attendance'))
                              .map(item => {
                                const ItemIcon = item.icon;
                                const active = location.pathname === item.path;
                                return (
                                  <div
                                    key={item.path}
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      navigate(item.path);
                                    }}
                                    className={`flex items-center gap-3 px-4 py-2.5 text-xs font-medium cursor-pointer transition-all nav-dropdown-item-glow mx-1 rounded-xl ${
                                      active ? 'border-l-4' : ''
                                    }`}
                                    style={{
                                      color: C.blue,
                                      border: `1px solid ${active ? C.orange : 'transparent'}`,
                                      background: active ? C.blueSoft : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!active) {
                                        e.currentTarget.style.borderColor = C.orange;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!active) {
                                        e.currentTarget.style.borderColor = 'transparent';
                                      }
                                    }}
                                  >
                                    <ItemIcon
                                      className="w-4 h-4 transition-colors"
                                      style={{
                                        color: C.blue,
                                        filter: `drop-shadow(0 0 3px ${C.blueGlow})`,
                                      }}
                                    />
                                    <span style={{ color: C.blue }}>{item.label}</span>
                                  </div>
                                );
                              })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-3 shrink-0">
                {!isMobile && (
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold leading-tight nav-glow-text" style={{ color: C.text }}>{timeStr}</div>
                    <div className="text-[10px] font-medium" style={{ color: C.textMuted }}>{dateStr}</div>
                  </div>
                )}

                {/* Call Followups */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/tasks?tab=Call+Followups')}
                  title="View Call Followups"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hidden sm:flex nav-glow-icon-btn"
                  style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}
                >
                  <FaClock className="w-4 h-4 transition-colors" style={{ color: C.blue }} />
                </motion.button>

                {/* Notifications */}
                <div ref={bellRef} className="relative">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowNotifications(prev => !prev); setShowProfile(false); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all relative nav-glow-icon-btn"
                    style={{
                      background: showNotifications ? C.blueSoft : C.bgSoft,
                      border: `1px solid ${showNotifications ? C.orange : C.border}`,
                    }}
                  >
                    <FaBell className="w-4 h-4 transition-colors" style={{ color: C.blue }} />
                    {unreadCount > 0 && (
                      <span
                        className="w-2.5 h-2.5 rounded-full absolute top-1 right-1 border-2"
                        style={{
                          background: C.orange,
                          borderColor: C.bgSolid,
                          animation: 'notifBadgePulse 1.6s ease-in-out infinite',
                        }}
                      />
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
                        className="absolute right-0 top-12 w-80 rounded-2xl z-50 overflow-hidden nav-dropdown-glow"
                        style={{
                          background: C.bgSolid,
                          border: `1.5px solid ${C.orange}`,
                          boxShadow: `0 20px 50px rgba(15, 23, 42, 0.12), 0 0 20px ${C.orangeGlow}`,
                        }}
                      >
                        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLt}, ${C.blue})` }} />
                        <div className="p-3 flex items-center justify-between"
                             style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}` }}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs" style={{ color: C.blue }}>Notifications</span>
                            {unreadCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full"
                                    style={{ background: C.orange, color: '#ffffff', boxShadow: `0 0 10px ${C.orangeGlow}` }}>
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead}
                                    className="text-[11px] font-semibold hover:underline"
                                    style={{ color: C.blue }}>
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs" style={{ color: C.textMuted }}>
                              <FaBell className="w-6 h-6 mx-auto mb-1.5" style={{ color: C.blue }} />
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
                                className="p-3 flex gap-2.5 cursor-pointer transition-all nav-dropdown-item-glow border border-transparent rounded-xl"
                                style={{
                                  background: n.read ? 'transparent' : 'rgba(2, 132, 199, 0.04)',
                                  borderBottom: `1px solid ${C.border}`,
                                }}
                              >
                                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                     style={{
                                       background: 'rgba(2, 132, 199, 0.10)',
                                       border: `1px solid rgba(2, 132, 199, 0.25)`,
                                     }}>
                                  <FaBell className="w-3.5 h-3.5 transition-colors" style={{ color: C.blue }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <span className="text-xs font-semibold truncate" style={{ color: C.blue }}>{n.title}</span>
                                    <span className="text-[10px] shrink-0" style={{ color: C.textMuted }}>{n.time}</span>
                                  </div>
                                  <p className="text-[11px] line-clamp-2 leading-snug" style={{ color: C.textSoft }}>{n.message}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile */}
                <div ref={profileRef} className="relative">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setShowProfile(prev => !prev); setShowNotifications(false); }}
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl transition-all nav-glow-icon-btn"
                    style={{
                      background: showProfile ? C.blueSoft : C.bgSoft,
                      border: `1px solid ${showProfile ? C.orange : C.border}`,
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl font-semibold text-xs flex items-center justify-center overflow-hidden shrink-0"
                         style={{
                           background: `linear-gradient(135deg, ${C.blue}, ${C.blueDk}, ${C.orange})`,
                           boxShadow: `0 0 12px ${C.blueGlow}`,
                           color: '#ffffff',
                         }}>
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user?.name || 'User'}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    {!isMobile && (
                      <div className="text-left leading-tight hidden xl:block">
                        <div className="text-xs font-semibold truncate max-w-[100px]" style={{ color: C.blue }}>{user?.name || 'User'}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.blueDk }}>{displayDesignation}</div>
                      </div>
                    )}
                    <FaChevronDown className="w-3 h-3 transition-colors" style={{ color: C.blue }} />
                  </motion.button>

                  <AnimatePresence>
                    {showProfile && (
                      <motion.div
                        ref={profileDropRef}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-64 rounded-2xl z-50 overflow-hidden p-3 nav-dropdown-glow"
                        style={{
                          background: C.bgSolid,
                          border: `1.5px solid ${C.orange}`,
                          boxShadow: `0 20px 50px rgba(15, 23, 42, 0.12), 0 0 20px ${C.orangeGlow}`,
                        }}
                      >
                        <div className="h-0.5 w-full -mt-3 mb-2.5 -mx-3 px-3" style={{ background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLt}, ${C.blue})` }} />
                        <div className="p-3 rounded-xl mb-2 flex items-center gap-3"
                             style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}>
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs"
                               style={{
                                 background: `linear-gradient(135deg, ${C.blue}, ${C.blueDk}, ${C.orange})`,
                                 boxShadow: `0 0 12px ${C.blueGlow}`,
                                 color: '#ffffff',
                               }}>
                            {user?.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user?.name || 'User'}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-semibold text-sm truncate" style={{ color: C.blue }}>{user?.name || 'User'}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: C.orangeSoft, color: C.orange, border: `1px solid ${C.orange}` }}>
                                PRO
                              </span>
                            </div>
                            <div className="inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.2 mb-1" style={{ color: C.blueDk }}>
                              {displayDesignation}
                            </div>
                            <p className="text-[11px] truncate flex items-center gap-1.5 font-medium" style={{ color: C.blue }}>
                              <FaUser className="w-3 h-3 shrink-0" style={{ color: C.blue }} />
                              <span className="truncate">{user?.email || 'user@example.com'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          {profileMenuItems.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={item.onClick}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all nav-dropdown-item-glow"
                              style={{
                                color: item.danger ? '#ef4444' : C.blue,
                              }}
                            >
                              <span style={{ color: item.danger ? '#ef4444' : C.blue }}>{item.icon}</span>
                              <span style={{ color: item.danger ? '#ef4444' : C.blue }}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </div>

          {/* Right Slice */}
          <div className="w-[55px] h-full relative shrink-0 -ml-px">
            <div className="absolute inset-0"
                 style={{
                   background: C.bg,
                   backdropFilter: 'blur(20px)',
                   WebkitBackdropFilter: 'blur(20px)',
                   clipPath: "path('M0 0 H55 V48 C28 48 28 80 0 80 Z')",
                 }} />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 55 80">
              <path d="M0 79.5 C28 79.5 28 47.5 55 47.5" fill="none" stroke={C.orange} strokeOpacity={0.7} strokeWidth={1} />
              <path d="M0 44.5 C28 44.5 28 76.5 55 76.5" fill="none" stroke={C.blue} strokeOpacity={0.4} strokeWidth={0.5} />
            </svg>
          </div>

        </div>

        {/* Right Extension Bar */}
        <div className="flex-1 h-12 z-20 relative min-w-0 -ml-px"
             style={{
               background: C.bg,
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)',
               borderBottom: `1px solid ${C.border}`,
             }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke={C.orange} strokeOpacity={0.7} strokeWidth={1} />
            <line x1="0" y1="44.5" x2="100%" y2="44.5" stroke={C.blue} strokeOpacity={0.4} strokeWidth={0.5} />
          </svg>
        </div>

      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-20 z-40 p-4 lg:hidden border-b max-h-[85vh] overflow-y-auto nav-dropdown-glow"
            style={{ background: C.bgSolid, borderBottom: `2px solid ${C.orange}`, color: C.text }}
          >
            <div className="space-y-4">
              {topDropdownGroups.map(group => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.title} className="p-3 rounded-2xl"
                       style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase mb-2"
                         style={{ color: C.blue }}>
                      <GroupIcon className="w-4 h-4" style={{ color: C.blue }} />
                      <span>{group.title}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items
                        .filter(item => !item.adminOnly || user?.role === 'admin' || isCEO(user) || isHR(user) || item.path.includes('attendance'))
                        .map(item => {
                          const ItemIcon = item.icon;
                          return (
                            <div
                              key={item.path}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                navigate(item.path);
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl text-xs font-medium cursor-pointer transition-all nav-dropdown-item-glow"
                              style={{
                                background: '#ffffff',
                                border: `1px solid ${C.border}`,
                                color: C.blue,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = C.orange;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = C.border;
                              }}
                            >
                              <ItemIcon className="w-3.5 h-3.5 transition-colors" style={{ color: C.blue }} />
                              <span className="truncate" style={{ color: C.blue }}>{item.label}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
}