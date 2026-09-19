import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { followupsAPI, notificationsAPI, authAPI } from '../../services/api';
import logoImg from '../../assets/aotms-global-logo.png';
import useBreakpoint from '../../hooks/useBreakpoint';
import {
  FaHouse, FaListCheck, FaUserPlus, FaUsers, FaBullhorn, FaFileLines,
  FaWhatsapp, FaEnvelopeOpenText, FaTrophy, FaChartPie, FaFileInvoiceDollar,
  FaReceipt, FaCalendarCheck, FaLocationDot, FaPeopleGroup, FaClock,
  FaBan, FaUserGear, FaKey, FaPlug, FaCircleInfo, FaCoins, FaSitemap,
  FaCode, FaBell, FaChevronDown, FaBars, FaXmark, FaRightFromBracket,
  FaUser, FaLock
} from 'react-icons/fa6';

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

  return (
    <div className="fixed inset-0 bg-[#040704]/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#0c160c] border border-[#72ff47]/30 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-100"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e441e]">
          <h3 className="font-medium text-[#72ff47] text-base">Change Password</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#1e441e] flex items-center justify-center text-slate-400 hover:text-slate-200">
            <FaXmark className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-normal text-[#8bc088] uppercase tracking-wider mb-1 block">Current Password</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-[#040704] border border-[#356033] rounded-xl p-2.5 pr-10 text-sm text-slate-100 focus:outline-none focus:border-[#72ff47]" placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">{eyeIcon(showCurrent)}</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-normal text-[#8bc088] uppercase tracking-wider mb-1 block">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-[#040704] border border-[#356033] rounded-xl p-2.5 pr-10 text-sm text-slate-100 focus:outline-none focus:border-[#72ff47]" placeholder="At least 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">{eyeIcon(showNew)}</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-normal text-[#8bc088] uppercase tracking-wider mb-1 block">Confirm New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-[#040704] border border-[#356033] rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#72ff47]" placeholder="Re-enter new password" autoComplete="new-password" />
            </div>
          </div>

          {error && <p className="text-xs text-rose-400 font-normal">{error}</p>}
          {success && <p className="text-xs text-[#72ff47] font-normal">✓ Password changed successfully!</p>}

          <div className="flex gap-2.5 mt-5">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 font-normal text-sm border border-[#356033] text-slate-300 hover:bg-[#1e441e]">Cancel</button>
            <button type="submit" disabled={saving || success} className="flex-1 rounded-xl py-2.5 font-normal text-sm bg-[#119822] hover:bg-[#18d531] text-white shadow-xs justify-center flex items-center">
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function Topbar() {
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
    } catch (e) {}
  }, [user]);

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

  // ── 5 Top Navigation Bar Dropdown Categories with Premium Evergreen Green Theme ─────────────
  const topDropdownGroups = [
    {
      title: 'Information',
      icon: FaCircleInfo,
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: FaHouse },
        { label: 'Task', path: '/tasks', icon: FaListCheck },
      ]
    },
    {
      title: 'Marketing & Campaigns',
      icon: FaBullhorn,
      items: [
        { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
        { label: 'All Leads', path: '/leads', icon: FaUsers },
        { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
        { label: 'Message Templates', path: '/message-templates', icon: FaFileLines },
        { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
        { label: 'Email CRM & Template Center', path: '/email', icon: FaEnvelopeOpenText },
        { label: '🏆 Leaderboard', path: '/leaderboard', icon: FaTrophy },
        { label: 'Reports & Analytics', path: '/reports', icon: FaChartPie },
      ]
    },
    {
      title: 'Finance',
      icon: FaCoins,
      items: [
        { label: 'Offer letter', path: '/offer-letter', icon: FaFileInvoiceDollar },
        { label: 'Payslip', path: '/payslips', icon: FaReceipt },
        { label: 'Quotation', path: '/quotation', icon: FaFileInvoiceDollar },
        { label: 'Invoice', path: '/invoice', icon: FaReceipt },
      ]
    },
    {
      title: 'Management',
      icon: FaSitemap,
      items: [
        { label: 'Attendance Records', path: '/admin/attendance-records', icon: FaCalendarCheck, adminOnly: true },
        { label: 'Live Employee Tracking', path: '/admin/employee-tracking', icon: FaLocationDot, adminOnly: true },
        { label: 'Team Operations', path: '/team-operations', icon: FaPeopleGroup },
        { label: 'Idle Leads', path: '/stale-leads', icon: FaClock },
        { label: 'Blocklist', path: '/blocklist', icon: FaBan },
        { label: 'Users', path: '/users', icon: FaUserGear },
      ]
    },
    {
      title: 'Developer',
      icon: FaCode,
      items: [
        { label: 'Access Tokens', path: '/access-tokens', icon: FaKey },
        { label: 'Integrations', path: '/integrations', icon: FaPlug },
      ]
    },
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
      <header className="fixed top-0 inset-x-0 z-50 h-20 flex px-0 select-none drop-shadow-2xl">
        
        {/* Left Side Extension Bar */}
        <div className="flex-1 h-12 bg-gradient-to-r from-[#040704] via-[#152614] to-[#152614] z-20 relative min-w-0 border-b border-[#72ff47]/20">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke="#72ff47" strokeOpacity={0.25} strokeWidth={1} />
            <line x1="0" y1="44.5" x2="100%" y2="44.5" stroke="#72ff47" strokeOpacity={0.12} strokeWidth={0.5} />
          </svg>
        </div>

        {/* Center Notch Navbar Container */}
        <div className="flex h-20 relative z-10 shrink-0 -ml-px">
          
          {/* Left Slice (Curved Corner Notch - Height 80px) */}
          <div className="w-[45px] sm:w-[55px] h-full relative shrink-0">
            <div 
              className="absolute inset-0 bg-gradient-to-b from-[#152614] via-[#1e441e] to-[#152614]" 
              style={{ clipPath: "path('M0 0 H55 V80 C28 80 28 48 0 48 Z')" }} 
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 55 80">
              <path d="M0 47.5 C28 47.5 28 79.5 55 79.5" fill="none" stroke="#72ff47" strokeOpacity={0.3} strokeWidth={1} />
              <path d="M0 44.5 C28 44.5 28 76.5 55 76.5" fill="none" stroke="#72ff47" strokeOpacity={0.15} strokeWidth={0.5} />
            </svg>
          </div>

          {/* Center Content Slice */}
          <div className="flex-1 h-full relative min-w-0 -ml-px">
             <div className="absolute inset-0 bg-gradient-to-r from-[#152614] via-[#1e441e] to-[#152614]">
                 <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                   <line x1="0" y1="79.5" x2="100%" y2="79.5" stroke="#72ff47" strokeOpacity={0.3} strokeWidth={1} />
                   <line x1="0" y1="76.5" x2="100%" y2="76.5" stroke="#72ff47" strokeOpacity={0.15} strokeWidth={0.5} />
                 </svg>
             </div>

             {/* Content Area */}
             <div className="relative w-full h-full flex items-center justify-between pb-1 px-4 sm:px-8 gap-3 sm:gap-6">
               
               {/* Mobile Hamburger Button */}
               <button 
                 className="lg:hidden p-2 rounded-xl bg-[#1e441e] hover:bg-[#356033] text-slate-100 transition-colors"
                 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                 aria-label="Toggle menu"
               >
                 {mobileMenuOpen ? <FaXmark className="w-5 h-5 text-[#72ff47]" /> : <FaBars className="w-5 h-5 text-[#72ff47]" />}
               </button>

               {/* Logo Center */}
               <div className="flex items-center shrink-0">
                 <Link to="/dashboard" className="flex items-center gap-2 group">
                   <img src={logoImg} alt="AOTMS Logo" className="h-9 sm:h-11 object-contain group-hover:scale-105 transition-transform" />
                 </Link>
               </div>

               {/* Desktop 5 Top Navigation Dropdowns */}
               <nav ref={navDropdownRef} className="hidden lg:flex gap-1.5 xl:gap-3 shrink-0 items-center">
                 {topDropdownGroups.map(group => {
                   const GroupIcon = group.icon;
                   const isOpen = activeDropdown === group.title;
                   const isGroupActive = group.items.some(item => location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path.length > 1));

                   return (
                     <div key={group.title} className="relative">
                       <motion.button
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         onClick={() => setActiveDropdown(isOpen ? null : group.title)}
                         className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-normal transition-all ${
                           isGroupActive || isOpen
                             ? 'bg-[#1e441e] text-[#72ff47] border border-[#72ff47]/40 shadow-sm'
                             : 'text-[#c5e0c4] hover:text-white hover:bg-[#1e441e]/60 border border-transparent'
                         }`}
                       >
                         <GroupIcon className="w-3.5 h-3.5 text-[#72ff47]" />
                         <span className="tracking-wide">{group.title}</span>
                         <FaChevronDown className={`w-3 h-3 text-[#8bc088] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#72ff47]' : ''}`} />
                       </motion.button>

                       <AnimatePresence>
                         {isOpen && (
                           <motion.div
                             initial={{ opacity: 0, y: 10, scale: 0.95 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             exit={{ opacity: 0, y: 10, scale: 0.95 }}
                             transition={{ duration: 0.15 }}
                             className="absolute left-0 top-12 w-60 bg-[#0c160c]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#72ff47]/30 z-50 overflow-hidden py-2"
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
                                     className={`flex items-center gap-3 px-4 py-2.5 text-xs font-normal cursor-pointer transition-colors ${
                                       active ? 'bg-[#1e441e] text-[#72ff47] border-l-4 border-[#72ff47]' : 'text-[#c5e0c4] hover:bg-[#1e441e]/80 hover:text-white'
                                     }`}
                                   >
                                     <ItemIcon className={`w-4 h-4 ${active ? 'text-[#72ff47]' : 'text-[#8bc088]'}`} />
                                     <span className="tracking-normal">{item.label}</span>
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

               {/* Right Actions: Time, Notifications, Profile */}
               <div className="flex items-center gap-3 shrink-0">
                 {!isMobile && (
                   <div className="text-right hidden sm:block">
                     <div className="text-xs font-medium text-slate-100 leading-tight">{timeStr}</div>
                     <div className="text-[10px] font-normal text-[#8bc088]">{dateStr}</div>
                   </div>
                 )}

                 {/* Call Followups */}
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => navigate('/tasks?tab=Call+Followups')}
                   title="View Call Followups"
                   className="w-9 h-9 rounded-full border border-[#356033] hover:border-[#72ff47]/60 text-slate-200 hover:text-white bg-[#152614]/80 hover:bg-[#1e441e] flex items-center justify-center transition-all hidden sm:flex"
                 >
                   <FaClock className="w-4 h-4 text-[#72ff47]" />
                 </motion.button>

                 {/* Notifications Bell */}
                 <div ref={bellRef} className="relative">
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => { setShowNotifications(prev => !prev); setShowProfile(false); }}
                     className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative ${
                       showNotifications ? 'bg-[#1e441e] border border-[#72ff47] text-[#72ff47]' : 'border border-[#356033] text-slate-200 hover:bg-[#1e441e]'
                     }`}
                   >
                     <FaBell className="w-4 h-4 text-[#72ff47]" />
                     {unreadCount > 0 && (
                       <span className="w-2.5 h-2.5 bg-rose-500 rounded-full absolute top-1 right-1 border-2 border-[#040704]" />
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
                         className="absolute right-0 top-12 w-80 bg-[#0c160c]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#72ff47]/30 z-50 overflow-hidden"
                       >
                         <div className="p-3 border-b border-[#1e441e] flex items-center justify-between bg-[#040704]/80">
                           <div className="flex items-center gap-2">
                             <span className="font-medium text-xs text-slate-200">Notifications</span>
                             {unreadCount > 0 && (
                               <span className="bg-[#119822] text-white text-[10px] font-normal px-1.5 py-0.2 rounded-full">
                                 {unreadCount}
                               </span>
                             )}
                           </div>
                           {unreadCount > 0 && (
                             <button onClick={markAllRead} className="text-[11px] font-normal text-[#72ff47] hover:underline">
                               Mark all read
                             </button>
                           )}
                         </div>

                         <div className="max-h-72 overflow-y-auto divide-y divide-[#1e441e]/60">
                           {notifications.length === 0 ? (
                             <div className="p-6 text-center text-xs text-[#8bc088]">
                               <FaBell className="w-6 h-6 text-[#356033] mx-auto mb-1.5" />
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
                                   n.read ? 'bg-[#0c160c] hover:bg-[#1e441e]/60' : 'bg-[#1e441e]/80 hover:bg-[#1e441e]'
                                 }`}
                               >
                                 <div className="w-7 h-7 rounded-xl bg-[#1e441e] border border-[#356033] flex items-center justify-center shrink-0 text-[#72ff47] mt-0.5">
                                   <FaBell className="w-3.5 h-3.5" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center justify-between gap-1 mb-0.5">
                                     <span className="text-xs font-normal text-slate-100 truncate">{n.title}</span>
                                     <span className="text-[10px] text-[#8bc088] shrink-0">{n.time}</span>
                                   </div>
                                   <p className="text-[11px] text-[#c5e0c4] line-clamp-2 leading-snug">{n.message}</p>
                                 </div>
                               </div>
                             ))
                           )}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>

                 {/* User Logo Profile Avatar Tile */}
                 <div ref={profileRef} className="relative">
                   <motion.button
                     whileHover={{ scale: 1.03 }}
                     whileTap={{ scale: 0.97 }}
                     onClick={() => { setShowProfile(prev => !prev); setShowNotifications(false); }}
                     className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-[#152614] hover:bg-[#1e441e] border border-[#356033] transition-all text-slate-100"
                   >
                     <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#119822] via-[#2a7221] to-[#31cb00] text-white font-medium text-xs flex items-center justify-center shadow-md">
                       {initials}
                     </div>
                     {!isMobile && (
                       <div className="text-left leading-tight hidden xl:block">
                         <div className="text-xs font-medium truncate max-w-[100px] text-slate-100">{user?.name || 'User'}</div>
                         <div className="text-[9px] font-normal uppercase text-[#72ff47] tracking-wider">{roleLabel}</div>
                       </div>
                     )}
                     <FaChevronDown className="w-3 h-3 text-[#8bc088]" />
                   </motion.button>

                   <AnimatePresence>
                     {showProfile && (
                       <motion.div
                         ref={profileDropRef}
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         transition={{ duration: 0.15 }}
                         className="absolute right-0 top-12 w-64 bg-[#0c160c]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#72ff47]/30 z-50 overflow-hidden p-3"
                       >
                         <div className="p-3 bg-[#040704]/90 rounded-xl border border-[#1e441e] mb-2">
                           <div className="flex items-center justify-between mb-1">
                             <span className="font-medium text-sm text-slate-100 truncate">{user?.name || 'User'}</span>
                             <span className="text-[10px] font-normal bg-[#119822] text-white px-2 py-0.5 rounded-full uppercase">
                               Pro
                             </span>
                           </div>
                           <div className="inline-block text-[10px] font-normal text-[#72ff47] bg-[#1e441e] border border-[#356033] rounded-full px-2 py-0.2 mb-1.5">
                             {roleLabel}
                           </div>
                           <p className="text-[11px] text-[#8bc088] truncate flex items-center gap-1.5 font-normal">
                             <FaUser className="w-3 h-3 text-[#72ff47]" />
                             {user?.email || 'user@example.com'}
                           </p>
                         </div>

                         <div className="space-y-0.5">
                           {profileMenuItems.map((item, idx) => (
                             <div
                               key={idx}
                               onClick={item.onClick}
                               className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-normal cursor-pointer transition-colors ${
                                 item.danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-[#c5e0c4] hover:bg-[#1e441e]'
                               }`}
                             >
                               <span className={item.danger ? 'text-rose-400' : 'text-[#72ff47]'}>{item.icon}</span>
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

          {/* Right Slice (Curved Corner Notch - Height 80px) */}
          <div className="w-[45px] sm:w-[55px] h-full relative shrink-0 -ml-px">
            <div 
              className="absolute inset-0 bg-gradient-to-b from-[#152614] via-[#1e441e] to-[#152614]" 
              style={{ clipPath: "path('M0 0 H55 V48 C28 48 28 80 0 80 Z')" }} 
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 55 80">
              <path d="M0 79.5 C28 79.5 28 47.5 55 47.5" fill="none" stroke="#72ff47" strokeOpacity={0.3} strokeWidth={1} />
              <path d="M0 44.5 C28 44.5 28 76.5 55 76.5" fill="none" stroke="#72ff47" strokeOpacity={0.15} strokeWidth={0.5} />
            </svg>
          </div>

        </div>

        {/* Right Side Extension Bar */}
        <div className="flex-1 h-12 bg-gradient-to-r from-[#152614] via-[#152614] to-[#040704] z-20 relative min-w-0 border-b border-[#72ff47]/20 -ml-px">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="47.5" x2="100%" y2="47.5" stroke="#72ff47" strokeOpacity={0.25} strokeWidth={1} />
            <line x1="0" y1="44.5" x2="100%" y2="44.5" stroke="#72ff47" strokeOpacity={0.12} strokeWidth={0.5} />
          </svg>
        </div>

      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-20 z-40 bg-[#0c160c] text-slate-100 p-4 lg:hidden border-b border-[#72ff47]/30 max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            <div className="space-y-4">
              {topDropdownGroups.map(group => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.title} className="bg-[#040704]/90 p-3 rounded-2xl border border-[#1e441e]">
                    <div className="flex items-center gap-2 text-xs font-normal text-[#72ff47] uppercase mb-2">
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
                              className="flex items-center gap-2 p-2 rounded-xl bg-[#1e441e] hover:bg-[#356033] text-xs font-normal cursor-pointer text-[#c5e0c4]"
                            >
                              <ItemIcon className="w-3.5 h-3.5 text-[#72ff47]" />
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