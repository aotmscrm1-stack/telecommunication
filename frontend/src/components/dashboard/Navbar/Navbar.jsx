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
  FaUser, FaLock
} from 'react-icons/fa6';

/* ─────────────────────────────────────────────────────────
   THEME — OBSIDIAN EMERALD & ELECTRIC LIME (matches HeroSection)
   ───────────────────────────────────────────────────────── */
const C = {
  /* Background — White color plan */
  bg:           'rgba(255, 255, 255, 0.94)',   // white glass
  bgSolid:      '#ffffff',                     // solid white
  bgSoft:       '#f8fafc',                     // cool calm soft surface
  bgHover:      'rgba(173, 255, 47, 0.18)',    // GreenYellow hover

  /* GreenYellow Accent */
  accent:       '#65a30d',                     // readable dark lime for icons/badges
  accentLt:     '#adff2f',                     // GreenYellow
  accentDk:     '#4d7c0f',                     // deep green
  accentGlow:   'rgba(173, 255, 47, 0.45)',    // GreenYellow glow
  accentSoft:   'rgba(173, 255, 47, 0.18)',    // GreenYellow soft bg

  /* Emerald Green Accent */
  green:        '#16a34a',                     // emerald green
  greenLt:      '#22c55e',                     // light green
  greenGlow:    'rgba(22, 163, 74, 0.35)',     // emerald glow

  /* Text — Dark, crisp, cool and calm */
  text:         '#0f172a',                     // slate-900
  textSoft:     '#475569',                     // slate-600
  textMuted:    '#94a3b8',                     // slate-400

  /* Borders — GreenYellow Edge */
  border:       '#adff2f',                     // GreenYellow edge
  borderSoft:   'rgba(173, 255, 47, 0.45)',
  borderHover:  '#84cc16',
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
   GLOBAL NAVBAR STYLES (obsidian emerald + lime glow)
   ───────────────────────────────────────────────────────── */
const navbarGlowStyles = `
  @keyframes navGlowPulse {
    0%, 100% {
      box-shadow:
        0 0 8px rgba(190, 242, 100, 0.35),
        0 0 20px rgba(190, 242, 100, 0.15),
        inset 0 0 6px rgba(34, 197, 94, 0.10);
    }
    50% {
      box-shadow:
        0 0 14px rgba(190, 242, 100, 0.55),
        0 0 34px rgba(190, 242, 100, 0.25),
        inset 0 0 10px rgba(34, 197, 94, 0.18);
    }
  }

  @keyframes bellPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.08); }
  }

  @keyframes notifBadgePulse {
    0%, 100% {
      box-shadow: 0 0 6px rgba(190, 242, 100, 0.8), 0 0 14px rgba(190, 242, 100, 0.45);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 12px rgba(190, 242, 100, 0.95), 0 0 24px rgba(190, 242, 100, 0.6);
      transform: scale(1.15);
    }
  }

  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .nav-glow-text {
    color: #ffffff;
    text-shadow:
      0 0 4px rgba(190, 242, 100, 0.35),
      0 0 10px rgba(190, 242, 100, 0.18);
    transition: color .3s ease, text-shadow .3s ease;
  }

  .nav-glow-text:hover {
    color: #ffffff;
    text-shadow:
      0 0 6px rgba(190, 242, 100, 0.75),
      0 0 18px rgba(190, 242, 100, 0.45),
      0 0 34px rgba(190, 242, 100, 0.25);
  }

  .nav-glow-accent-text {
    background: linear-gradient(90deg, #bef264, #a3e635, #4ade80, #22c55e, #bef264);
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
    transition: all .3s ease;
  }

  .nav-glow-btn:hover {
    box-shadow:
      0 0 12px rgba(190, 242, 100, 0.55),
      0 0 26px rgba(190, 242, 100, 0.25);
    transform: translateY(-1px);
  }

  .nav-glow-icon-btn {
    transition: all .3s ease;
    position: relative;
  }

  .nav-glow-icon-btn:hover {
    box-shadow:
      0 0 10px rgba(190, 242, 100, 0.6),
      0 0 22px rgba(190, 242, 100, 0.3),
      inset 0 0 6px rgba(34, 197, 94, 0.15);
    border-color: rgba(190, 242, 100, 0.7) !important;
  }

  .nav-glow-icon-btn:hover svg {
    filter: drop-shadow(0 0 6px rgba(190, 242, 100, 0.9));
  }

  .nav-dropdown-glow {
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(190, 242, 100, 0.20),
      0 0 30px rgba(190, 242, 100, 0.14);
  }

  .nav-dropdown-item-glow:hover {
    background: rgba(190, 242, 100, 0.10) !important;
    box-shadow:
      inset 0 0 12px rgba(190, 242, 100, 0.15),
      0 0 10px rgba(190, 242, 100, 0.18);
  }

  .nav-dropdown-item-glow:hover svg {
    filter: drop-shadow(0 0 6px rgba(190, 242, 100, 0.9));
    color: #bef264 !important;
  }

  .nav-dropdown-item-glow:hover span {
    color: #ffffff !important;
    text-shadow: 0 0 6px rgba(190, 242, 100, 0.6);
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
         style={{ background: 'rgba(5, 29, 16, 0.75)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md p-6 rounded-2xl"
        style={{
          background: C.bgSolid,
          border: `1px solid ${C.border}`,
          boxShadow: `0 30px 80px rgba(0,0,0,.7), 0 0 40px ${C.accentGlow}`,
          color: C.text,
        }}
      >
        <div className="flex items-center justify-between mb-4 pb-3"
             style={{ borderBottom: `1px solid ${C.border}` }}>
          <h3 className="font-semibold text-base nav-glow-accent-text">Change Password</h3>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ color: C.textSoft }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.bgHover; e.currentTarget.style.color = C.accent; }}
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
                onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`; }}
                onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowCurrent(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: C.textSoft }}>
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
                onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`; }}
                onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                placeholder="At least 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: C.textSoft }}>
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
              onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`; }}
              onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              placeholder="Re-enter new password" autoComplete="new-password" />
          </div>

          {error && <p className="text-xs font-medium" style={{ color: '#ff5c8a' }}>{error}</p>}
          {success && <p className="text-xs font-medium nav-glow-accent-text">✓ Password changed successfully!</p>}

          <div className="flex gap-2.5 mt-5">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl py-2.5 font-medium text-sm transition-all"
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textSoft }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.bgHover; e.currentTarget.style.color = C.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSoft; }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || success}
              className="flex-1 rounded-xl py-2.5 font-semibold text-sm nav-glow-btn"
              style={{
                background: `linear-gradient(135deg, ${C.accentLt}, ${C.accent}, ${C.accentDk})`,
                color: '#0a1f10',
                boxShadow: `0 0 20px ${C.accentGlow}`,
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

  const topDropdownGroups = [
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
      { label: 'Attendance', path: '/admin/attendance-records', icon: FaCalendarCheck, adminOnly: true },
      { label: 'Live Tracking', path: '/admin/employee-tracking', icon: FaLocationDot, adminOnly: true },
      { label: 'Email CRM', path: '/email', icon: FaEnvelopeOpenText },
      { label: 'Team Ops', path: '/team-operations', icon: FaPeopleGroup },
      { label: 'Idle Leads', path: '/stale-leads', icon: FaClock },
      { label: 'Blocklist', path: '/blocklist', icon: FaBan },
      { label: 'Users', path: '/users', icon: FaUserGear },
    ]},
    { title: 'Developer', icon: FaCode, items: [
      { label: 'Access Tokens', path: '/access-tokens', icon: FaKey },
      { label: 'Integrations', path: '/integrations', icon: FaPlug },
    ]},
  ];

  const profileMenuItems = [
    { label: 'Profile', icon: <FaUser className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); navigate('/profile'); } },
    { label: 'Change Password', icon: <FaLock className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); setShowChangePassword(true); } },
    { label: 'Message Templates', icon: <FaFileLines className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); navigate('/message-templates'); } },
    { label: 'Blocklist', icon: <FaBan className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); navigate('/blocklist'); } },
    { label: 'Logout', icon: <FaRightFromBracket className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); logout(); }, danger: true },
  ];

  return (
    <>
      <style>{navbarGlowStyles}</style>

      <header className="fixed top-0 inset-x-0 z-50 h-20 flex px-0 select-none"
              style={{
                filter: 'drop-shadow(0 8px 24px rgba(1, 21, 15, 0.65)) drop-shadow(0 2px 10px rgba(190, 242, 100, 0.15))',
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
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke={C.accent} strokeOpacity={0.6} strokeWidth={1} />
            <line x1="0" y1="44.5" x2="100%" y2="44.5" stroke={C.green} strokeOpacity={0.35} strokeWidth={0.5} />
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
              <path d="M0 47.5 C28 47.5 28 79.5 55 79.5" fill="none" stroke={C.accent} strokeOpacity={0.6} strokeWidth={1} />
              <path d="M0 44.5 C28 44.5 28 76.5 55 76.5" fill="none" stroke={C.green} strokeOpacity={0.35} strokeWidth={0.5} />
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
                <line x1="0" y1="79.5" x2="100%" y2="79.5" stroke={C.accent} strokeOpacity={0.6} strokeWidth={1} />
                <line x1="0" y1="76.5" x2="100%" y2="76.5" stroke={C.green} strokeOpacity={0.35} strokeWidth={0.5} />
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
                  border: `1px solid ${C.border}`,
                  color: C.accent,
                }}
              >
                {mobileMenuOpen
                  ? <FaXmark className="w-5 h-5" style={{ color: C.accent }} />
                  : <FaBars className="w-5 h-5" style={{ color: C.accent }} />}
              </button>

              {/* Logo */}
              <div className="flex items-center shrink-0">
                <Link to="/dashboard" className="flex items-center gap-2 group">
                  <img
                    src={logoImg}
                    alt="AOTMS Logo"
                    className="h-9 sm:h-11 object-contain transition-all"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(190, 242, 100, 0.45))' }}
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
                        onClick={() => setActiveDropdown(isOpen ? null : group.title)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all nav-glow-btn"
                        style={{
                          background: (isGroupActive || isOpen) ? C.accentSoft : 'transparent',
                          color: (isGroupActive || isOpen) ? C.accent : C.textSoft,
                          border: `1px solid ${(isGroupActive || isOpen) ? 'rgba(190, 242, 100, 0.5)' : 'transparent'}`,
                          textShadow: (isGroupActive || isOpen) ? '0 0 8px rgba(190, 242, 100, 0.7)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isGroupActive && !isOpen) {
                            e.currentTarget.style.background = 'rgba(190, 242, 100, 0.08)';
                            e.currentTarget.style.color = C.text;
                            e.currentTarget.style.border = `1px solid ${C.borderHover}`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isGroupActive && !isOpen) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = C.textSoft;
                            e.currentTarget.style.border = `1px solid transparent`;
                          }
                        }}
                      >
                        <GroupIcon className="w-3.5 h-3.5" style={{ color: C.accent, filter: 'drop-shadow(0 0 4px rgba(190, 242, 100, 0.7))' }} />
                        <span className="tracking-wide">{group.title}</span>
                        <FaChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          style={{ color: isOpen ? C.accent : C.textSoft }}
                        />
                      </motion.button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-12 w-60 rounded-2xl z-50 overflow-hidden py-2 nav-dropdown-glow"
                            style={{
                              background: C.bgSolid,
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            {group.items
                              .filter(item => !item.adminOnly || user?.role === 'admin')
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
                                    className={`flex items-center gap-3 px-4 py-2.5 text-xs font-medium cursor-pointer transition-all nav-dropdown-item-glow ${
                                      active ? 'border-l-4' : ''
                                    }`}
                                    style={{
                                      color: active ? C.accent : C.textSoft,
                                      borderLeftColor: active ? C.accent : 'transparent',
                                      background: active ? C.accentSoft : 'transparent',
                                    }}
                                  >
                                    <ItemIcon className="w-4 h-4" style={{ color: active ? C.accent : C.textSoft }} />
                                    <span>{item.label}</span>
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
                  <FaClock className="w-4 h-4" style={{ color: C.accent }} />
                </motion.button>

                {/* Notifications */}
                <div ref={bellRef} className="relative">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowNotifications(prev => !prev); setShowProfile(false); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all relative nav-glow-icon-btn"
                    style={{
                      background: showNotifications ? C.accentSoft : C.bgSoft,
                      border: `1px solid ${showNotifications ? C.accent : C.border}`,
                    }}
                  >
                    <FaBell className="w-4 h-4" style={{ color: C.accent }} />
                    {unreadCount > 0 && (
                      <span
                        className="w-2.5 h-2.5 rounded-full absolute top-1 right-1 border-2"
                        style={{
                          background: C.accent,
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
                        style={{ background: C.bgSolid, border: `1px solid ${C.border}` }}
                      >
                        <div className="p-3 flex items-center justify-between"
                             style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}` }}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs nav-glow-text" style={{ color: C.text }}>Notifications</span>
                            {unreadCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full"
                                    style={{ background: C.accent, color: '#0a1f10', boxShadow: `0 0 10px ${C.accentGlow}` }}>
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead}
                                    className="text-[11px] font-semibold hover:underline nav-glow-text"
                                    style={{ color: C.accent }}>
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs" style={{ color: C.textMuted }}>
                              <FaBell className="w-6 h-6 mx-auto mb-1.5" style={{ color: C.border }} />
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
                                className="p-3 flex gap-2.5 cursor-pointer transition-all nav-dropdown-item-glow"
                                style={{
                                  background: n.read ? 'transparent' : 'rgba(190, 242, 100, 0.08)',
                                  borderBottom: `1px solid ${C.borderSoft}`,
                                }}
                              >
                                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                     style={{
                                       background: 'rgba(190, 242, 100, 0.12)',
                                       border: `1px solid ${C.border}`,
                                     }}>
                                  <FaBell className="w-3.5 h-3.5" style={{ color: C.accent }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <span className="text-xs font-semibold truncate" style={{ color: C.text }}>{n.title}</span>
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
                      background: C.bgSoft,
                      border: `1px solid ${showProfile ? C.accent : C.border}`,
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl font-semibold text-xs flex items-center justify-center"
                         style={{
                           background: `linear-gradient(135deg, ${C.accentLt}, ${C.accent}, ${C.green})`,
                           boxShadow: `0 0 12px ${C.accentGlow}`,
                           color: '#0a1f10',
                         }}>
                      {initials}
                    </div>
                    {!isMobile && (
                      <div className="text-left leading-tight hidden xl:block">
                        <div className="text-xs font-semibold truncate max-w-[100px] nav-glow-text" style={{ color: C.text }}>{user?.name || 'User'}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider nav-glow-accent-text">{roleLabel}</div>
                      </div>
                    )}
                    <FaChevronDown className="w-3 h-3" style={{ color: C.textSoft }} />
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
                        style={{ background: C.bgSolid, border: `1px solid ${C.border}` }}
                      >
                        <div className="p-3 rounded-xl mb-2"
                             style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm truncate" style={{ color: C.text }}>{user?.name || 'User'}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full nav-glow-accent-text">
                              PRO
                            </span>
                          </div>
                          <div className="inline-block text-[10px] font-semibold rounded-full px-2 py-0.2 mb-1.5 nav-glow-accent-text">
                            {roleLabel}
                          </div>
                          <p className="text-[11px] truncate flex items-center gap-1.5 font-medium" style={{ color: C.textSoft }}>
                            <FaUser className="w-3 h-3" style={{ color: C.accent }} />
                            {user?.email || 'user@example.com'}
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          {profileMenuItems.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={item.onClick}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all nav-dropdown-item-glow"
                              style={{
                                color: item.danger ? '#ff5c8a' : C.textSoft,
                              }}
                            >
                              <span style={{ color: item.danger ? '#ff5c8a' : C.accent }}>{item.icon}</span>
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
              <path d="M0 79.5 C28 79.5 28 47.5 55 47.5" fill="none" stroke={C.accent} strokeOpacity={0.6} strokeWidth={1} />
              <path d="M0 44.5 C28 44.5 28 76.5 55 76.5" fill="none" stroke={C.green} strokeOpacity={0.35} strokeWidth={0.5} />
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
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke={C.accent} strokeOpacity={0.6} strokeWidth={1} />
            <line x1="0" y1="44.5" x2="100%" y2="44.5" stroke={C.green} strokeOpacity={0.35} strokeWidth={0.5} />
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
            style={{ background: C.bgSolid, borderColor: C.border, color: C.text }}
          >
            <div className="space-y-4">
              {topDropdownGroups.map(group => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.title} className="p-3 rounded-2xl"
                       style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase mb-2"
                         style={{ color: C.accent, textShadow: '0 0 6px rgba(190, 242, 100, 0.6)' }}>
                      <GroupIcon className="w-4 h-4" />
                      <span>{group.title}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items
                        .filter(item => !item.adminOnly || user?.role === 'admin')
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
                                background: C.accentSoft,
                                border: `1px solid ${C.border}`,
                                color: C.textSoft,
                              }}
                            >
                              <ItemIcon className="w-3.5 h-3.5" style={{ color: C.accent }} />
                              <span className="truncate">{item.label}</span>
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