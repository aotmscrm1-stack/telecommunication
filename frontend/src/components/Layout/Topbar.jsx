import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { followupsAPI, notificationsAPI, authAPI } from '../../services/api';
import logoImg from '../../assets/aotms-global-logo.png';
import useBreakpoint from '../../hooks/useBreakpoint';
import { useSidebar } from '../../context/SidebarContext';
import {
  Home, Users, CheckSquare, Mail, Megaphone, BarChart3, Bell, Clock, Settings,
  User, Key, LogOut, Shield, Menu, X, ChevronDown, Sparkles, Info, UserPlus,
  FileText, MessageCircle, Trophy, CreditCard, FileCheck, Receipt, FileSpreadsheet,
  Briefcase, Calendar, Activity, Layers, ShieldAlert, UserCheck, Code2, Cpu
} from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#a8dadc]"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h3 className="font-extrabold text-[#1d3557] text-base">Change Password</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#f1faee] flex items-center justify-center text-gray-400 hover:text-[#1d3557]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Current Password</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{eyeIcon(showCurrent)}</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" placeholder="At least 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{eyeIcon(showNew)}</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#457b9d] uppercase tracking-wider mb-1 block">Confirm New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field w-full border border-[#a8dadc] rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#457b9d]" placeholder="Re-enter new password" autoComplete="new-password" />
            </div>
          </div>

          {error && <p className="text-xs text-[#e63946] font-bold">{error}</p>}
          {success && <p className="text-xs text-emerald-600 font-bold">✓ Password changed successfully!</p>}

          <div className="flex gap-2.5 mt-5">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 font-bold text-sm border border-[#a8dadc] text-[#1d3557] hover:bg-[#f1faee]">Cancel</button>
            <button type="submit" disabled={saving || success} className="flex-1 rounded-xl py-2.5 font-bold text-sm bg-[#457b9d] hover:bg-[#1d3557] text-white shadow-xs justify-center flex items-center">
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
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
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
  const gearRef = useRef(null);
  const gearDropRef = useRef(null);
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
      if (gearDropRef.current && !gearDropRef.current.contains(e.target) && gearRef.current && !gearRef.current.contains(e.target)) {
        setShowWorkspaceSettings(false);
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
  const isAdminLike = user?.role === 'admin' || user?.role === 'manager';

  // ── 5 Top Navigation Bar Dropdown Categories ────────────────────────────────
  const topDropdownGroups = [
    {
      title: 'Information',
      icon: Info,
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: Home },
        { label: 'Task', path: '/tasks', icon: CheckSquare },
      ]
    },
    {
      title: 'Marketing & Campaigns',
      icon: Megaphone,
      items: [
        { label: 'Add Leads', path: '/leads/new', icon: UserPlus },
        { label: 'All Leads', path: '/leads', icon: Users },
        { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
        { label: 'Message Templates', path: '/message-templates', icon: FileText },
        { label: 'WhatsApp', path: '/whatsapp', icon: MessageCircle },
        { label: 'Email CRM', path: '/email', icon: Mail },
        { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
        { label: 'Reports', path: '/reports', icon: BarChart3 },
      ]
    },
    {
      title: 'Finance',
      icon: CreditCard,
      items: [
        { label: 'Offer letter', path: '/offer-letter', icon: FileCheck },
        { label: 'Payslip', path: '/payslips', icon: Receipt },
        { label: 'Quotation', path: '/quotation', icon: FileSpreadsheet },
        { label: 'Invoice', path: '/invoice', icon: CreditCard },
      ]
    },
    {
      title: 'Management',
      icon: Briefcase,
      items: [
        { label: 'Attendance Records', path: '/admin/attendance-records', icon: Calendar, adminOnly: true },
        { label: 'Live Employee Tracking', path: '/admin/employee-tracking', icon: Activity, adminOnly: true },
        { label: 'Team Operations', path: '/team-operations', icon: Layers },
        { label: 'Idle Leads', path: '/stale-leads', icon: Clock },
        { label: 'Blocklist', path: '/blocklist', icon: ShieldAlert },
        { label: 'Users', path: '/users', icon: UserCheck },
      ]
    },
    {
      title: 'Developer',
      icon: Code2,
      items: [
        { label: 'Access Tokens', path: '/access-tokens', icon: Key },
        { label: 'Integrations', path: '/integrations', icon: Cpu },
      ]
    },
  ];

  const profileMenuItems = [
    { label: 'Profile', icon: <User className="w-4 h-4" />, onClick: () => { setShowProfile(false); navigate('/profile'); } },
    { label: 'Change Password', icon: <Key className="w-4 h-4" />, onClick: () => { setShowProfile(false); setShowChangePassword(true); } },
    { label: 'Message Templates', icon: <FileText className="w-4 h-4" />, onClick: () => { setShowProfile(false); navigate('/message-templates'); } },
    { label: 'Blocklist', icon: <ShieldAlert className="w-4 h-4" />, onClick: () => { setShowProfile(false); navigate('/blocklist'); } },
    { label: 'Logout', icon: <LogOut className="w-4 h-4" />, onClick: () => { setShowProfile(false); logout(); }, danger: true },
  ];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-16 flex px-0 select-none drop-shadow-lg">
        
        {/* Left Side Extension Bar */}
        <div className="flex-1 h-10 bg-gradient-to-r from-[#0c1623] via-[#1d3557] to-[#1d3557] z-20 relative min-w-0 border-b border-[#a8dadc]/20">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="#a8dadc" strokeOpacity={0.15} strokeWidth={1} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="#a8dadc" strokeOpacity={0.08} strokeWidth={0.5} />
          </svg>
        </div>

        {/* Center Notch Navbar Container */}
        <div className="flex h-16 relative z-10 shrink-0 -ml-px">
          
          {/* Left Slice (Curved Corner Notch) */}
          <div className="w-[40px] sm:w-[50px] h-full relative shrink-0">
            <div 
              className="absolute inset-0 bg-gradient-to-b from-[#1d3557] via-[#1d3557] to-[#162b46]" 
              style={{ clipPath: "path('M0 0 H50 V64 C25 64 25 40 0 40 Z')" }} 
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="#a8dadc" strokeOpacity={0.25} strokeWidth={1} />
              <path d="M0 36.5 C25 36.5 25 60.5 50 60.5" fill="none" stroke="#a8dadc" strokeOpacity={0.12} strokeWidth={0.5} />
            </svg>
          </div>

          {/* Center Content Slice */}
          <div className="flex-1 h-full relative min-w-0 -ml-px">
             <div className="absolute inset-0 bg-gradient-to-r from-[#1d3557] via-[#29495e] to-[#1d3557]">
                 <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                   <line x1="0" y1="63.5" x2="100%" y2="63.5" stroke="#a8dadc" strokeOpacity={0.25} strokeWidth={1} />
                   <line x1="0" y1="60.5" x2="100%" y2="60.5" stroke="#a8dadc" strokeOpacity={0.12} strokeWidth={0.5} />
                 </svg>
             </div>

             {/* Content Area */}
             <div className="relative w-full h-full flex items-end justify-between pb-2 px-3 sm:px-6 gap-2 sm:gap-4">
               
               {/* Mobile Hamburger Button */}
               <button 
                 className="lg:hidden mb-1 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                 aria-label="Toggle menu"
               >
                 {mobileMenuOpen ? <X className="w-5 h-5 text-[#a8dadc]" /> : <Menu className="w-5 h-5 text-[#a8dadc]" />}
               </button>

               {/* Logo Center */}
               <div className="flex items-center shrink-0 mb-1">
                 <Link to="/dashboard" className="flex items-center gap-2 group">
                   <img src={logoImg} alt="AOTMS Logo" className="h-7 sm:h-8 object-contain group-hover:scale-105 transition-transform" />
                 </Link>
               </div>

               {/* Desktop 5 Top Navigation Dropdowns */}
               <nav ref={navDropdownRef} className="hidden lg:flex gap-1 xl:gap-2 mb-1 shrink-0 items-center">
                 {topDropdownGroups.map(group => {
                   const GroupIcon = group.icon;
                   const isOpen = activeDropdown === group.title;
                   const isGroupActive = group.items.some(item => location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path.length > 1));

                   return (
                     <div key={group.title} className="relative">
                       <motion.button
                         whileHover={{ scale: 1.03 }}
                         whileTap={{ scale: 0.97 }}
                         onClick={() => setActiveDropdown(isOpen ? null : group.title)}
                         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                           isGroupActive || isOpen
                             ? 'bg-[#a8dadc] text-[#1d3557] shadow-sm font-bold'
                             : 'text-white/90 hover:text-white hover:bg-white/15'
                         }`}
                       >
                         <GroupIcon className="w-3.5 h-3.5" />
                         <span>{group.title}</span>
                         <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                       </motion.button>

                       <AnimatePresence>
                         {isOpen && (
                           <motion.div
                             initial={{ opacity: 0, y: 10, scale: 0.95 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             exit={{ opacity: 0, y: 10, scale: 0.95 }}
                             transition={{ duration: 0.15 }}
                             className="absolute left-0 top-11 w-56 bg-white rounded-2xl shadow-2xl border border-[#a8dadc] z-50 overflow-hidden py-2"
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
                                     className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                                       active ? 'bg-[#f1faee] text-[#457b9d] border-l-4 border-[#457b9d]' : 'text-[#1d3557] hover:bg-[#f1faee]'
                                     }`}
                                   >
                                     <ItemIcon className={`w-4 h-4 ${active ? 'text-[#457b9d]' : 'text-gray-400'}`} />
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

               {/* Right Actions: Time, Notifications, Profile */}
               <div className="flex items-center gap-2 sm:gap-3 mb-1 shrink-0">
                 {!isMobile && (
                   <div className="text-right hidden sm:block">
                     <div className="text-xs font-black text-white leading-tight">{timeStr}</div>
                     <div className="text-[10px] font-semibold text-[#a8dadc]">{dateStr}</div>
                   </div>
                 )}

                 {/* Call Followups */}
                 <motion.button
                   whileHover={{ scale: 1.08 }}
                   whileTap={{ scale: 0.92 }}
                   onClick={() => navigate('/tasks?tab=Call+Followups')}
                   title="View Call Followups"
                   className="w-8 h-8 rounded-full border border-[#a8dadc]/40 hover:border-white text-white/90 hover:text-white bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hidden sm:flex"
                 >
                   <Clock className="w-4 h-4" />
                 </motion.button>

                 {/* Notifications Bell */}
                 <div ref={bellRef} className="relative">
                   <motion.button
                     whileHover={{ scale: 1.08 }}
                     whileTap={{ scale: 0.92 }}
                     onClick={() => { setShowNotifications(prev => !prev); setShowProfile(false); }}
                     className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${
                       showNotifications ? 'bg-[#a8dadc] text-[#1d3557]' : 'border border-[#a8dadc]/40 text-white hover:bg-white/20'
                     }`}
                   >
                     <Bell className="w-4 h-4" />
                     {unreadCount > 0 && (
                       <span className="w-2.5 h-2.5 bg-[#e63946] rounded-full absolute top-0.5 right-0.5 border-2 border-[#1d3557]" />
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
                         className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-[#a8dadc] z-50 overflow-hidden"
                       >
                         <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-[#f1faee]/80">
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
                                   <Bell className="w-3.5 h-3.5" />
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
                     className="flex items-center gap-2 p-1 pr-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-[#a8dadc]/30 transition-all text-white"
                   >
                     <div className="w-7 h-7 rounded-xl bg-[#a8dadc] text-[#1d3557] font-black text-xs flex items-center justify-center shadow-xs">
                       {initials}
                     </div>
                     {!isMobile && (
                       <div className="text-left leading-tight hidden xl:block">
                         <div className="text-xs font-extrabold truncate max-w-[100px] text-white">{user?.name || 'User'}</div>
                         <div className="text-[9px] font-bold uppercase text-[#a8dadc] tracking-wider">{roleLabel}</div>
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

                         <div className="space-y-0.5">
                           {profileMenuItems.map((item, idx) => (
                             <div
                               key={idx}
                               onClick={item.onClick}
                               className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                 item.danger ? 'text-[#e63946] hover:bg-red-50' : 'text-[#1d3557] hover:bg-[#f1faee]'
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
          </div>

          {/* Right Slice (Curved Corner Notch) */}
          <div className="w-[40px] sm:w-[50px] h-full relative shrink-0 -ml-px">
            <div 
              className="absolute inset-0 bg-gradient-to-b from-[#1d3557] via-[#1d3557] to-[#162b46]" 
              style={{ clipPath: "path('M0 0 H50 V40 C25 40 25 64 0 64 Z')" }} 
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 50 64">
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="#a8dadc" strokeOpacity={0.25} strokeWidth={1} />
              <path d="M0 60.5 C25 60.5 25 36.5 50 36.5" fill="none" stroke="#a8dadc" strokeOpacity={0.12} strokeWidth={0.5} />
            </svg>
          </div>

        </div>

        {/* Right Side Extension Bar */}
        <div className="flex-1 h-10 bg-gradient-to-r from-[#1d3557] via-[#1d3557] to-[#0c1623] z-20 relative min-w-0 border-b border-[#a8dadc]/20 -ml-px">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="#a8dadc" strokeOpacity={0.15} strokeWidth={1} />
            <line x1="0" y1="36.5" x2="100%" y2="36.5" stroke="#a8dadc" strokeOpacity={0.08} strokeWidth={0.5} />
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
            className="fixed inset-x-0 top-16 z-40 bg-[#1d3557] text-white p-4 lg:hidden border-b border-[#a8dadc]/40 max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            <div className="space-y-4">
              {topDropdownGroups.map(group => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.title} className="bg-white/5 p-3 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#a8dadc] uppercase mb-2">
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
                              className="flex items-center gap-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                            >
                              <ItemIcon className="w-3.5 h-3.5 text-[#a8dadc]" />
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