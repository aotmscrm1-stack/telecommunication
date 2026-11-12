import { useAuth } from '../../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { followupsAPI, notificationsAPI } from '../../../services/api';
import leadNoteReminderService from '../../../services/leadNoteReminderService';
import logoImg from '../../../assets/aotms-global-logo.png';
import useBreakpoint from '../../../hooks/useBreakpoint';
import {
  FaHouse, FaListCheck, FaUserPlus, FaUsers, FaBullhorn,
  FaWhatsapp, FaEnvelopeOpenText, FaTrophy, FaChartPie, FaFileInvoiceDollar,
  FaReceipt, FaCalendarCheck, FaLocationDot, FaPeopleGroup, FaClock,
  FaUserGear, FaKey, FaPlug, FaCircleInfo, FaCoins, FaSitemap,
  FaCode, FaBell, FaChevronDown, FaBars, FaXmark, FaRightFromBracket,
  FaUser, FaUserCheck, FaBook, FaCalendarDays,
  FaChartLine, FaMobileScreen, FaDownload, FaPhoneVolume, FaAward
} from 'react-icons/fa6';
import { SiGooglesheets } from 'react-icons/si';
import { isCEO, isHR, isManager, canViewDashboard, canViewCallRecordings, isDigitalMarketing, canAccessDigitalCalendar, normalizeDesignation, canViewCallFollowups, canAccessMarketingLeads, canAccessDailyActivity, isTelecaller } from '../../../utils/permissions';

function GoogleSheetsIcon({ className, style }) {
  return (
    <SiGooglesheets
      className={className}
      style={{ color: '#0F9D58', ...(style || {}) }}
    />
  );
}

function WhatsAppBlastIcon({ className, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      width="1em"
      height="1em"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <polygon points="12 6 9.5 11 13 11 11.5 16 15 10 12 10 12 6" fill="currentColor" stroke="none" />
    </svg>
  );
}


/* ─────────────────────────────────────────────────────────
   THEME — BLUE, ORANGE & CRISP WHITE
   ───────────────────────────────────────────────────────── */
const C = {
  /* Background — Crisp White Glass */
  bg: 'rgba(255, 255, 255, 0.95)',   // white glass
  bgSolid: '#ffffff',                     // solid pure white
  bgSoft: '#f8fafc',                     // cool calm soft surface (slate-50)
  bgHover: 'rgba(249, 115, 22, 0.10)',    // Orange hover bg

  /* Blue (Primary for Icons & Brand) */
  blue: '#0284c7',                     // Vibrant Sky/Royal Blue for icons
  blueLt: '#38bdf8',                     // Light Blue
  blueDk: '#0369a1',                     // Deep Blue
  blueGlow: 'rgba(2, 132, 199, 0.35)',     // Blue glow
  blueSoft: 'rgba(2, 132, 199, 0.10)',     // Subtle blue bg

  /* Orange (Hover, Dropdown highlight, Active, Badges) */
  orange: '#f97316',                     // Vibrant Orange
  orangeLt: '#fb923c',                     // Light Orange
  orangeDk: '#ea580c',                     // Deep Orange
  orangeGlow: 'rgba(249, 115, 22, 0.35)',    // Orange glow
  orangeSoft: 'rgba(249, 115, 22, 0.10)',    // Orange soft surface

  /* Text — Dark, crisp, cool and calm */
  text: '#0f172a',                     // Slate-900 (crisp readable on white)
  textSoft: '#475569',                     // Slate-600
  textMuted: '#94a3b8',                     // Slate-400

  /* Borders — Clean subtle with Orange / Blue accents */
  border: '#e2e8f0',                     // Clean slate border
  borderSoft: '#f1f5f9',                     // Subtle border
  borderHover: '#f97316',                     // Orange border on hover
  borderOrange: 'rgba(249, 115, 22, 0.45)',    // Orange border accent
  borderBlue: 'rgba(2, 132, 199, 0.45)',     // Blue border accent
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

export default function Navbar() {
  const { user, logout, metaLeadAssignment } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // Dynamic access check: Admin/Executive always has access; employee only if assigned by Admin
  const canSeeMetaLeads = isCEO(user) || isHR(user) || user?.role === 'admin' || user?.role === 'manager' || canAccessMarketingLeads(user) || Boolean(metaLeadAssignment?.hasAccess);

  const [now, setNow] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState({
    leads: false,
    whatsapp: false,
    performance: false,
  });

  const toggleSubMenu = (id, e) => {
    e.stopPropagation();
    setOpenSubMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    } catch (e) { }
  }, [user]);

  const pollDueCallbacks = useCallback(async () => {
    if (!user || !canViewCallFollowups(user)) return;
    try {
      const isUserAdmin = Boolean(user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user) || isManager(user));
      const res = await followupsAPI.getAll({ type: 'call_followup', status: 'upcoming', forMe: 'true' });
      const all = res.data.followups || [];
      const now = new Date();
      const uid = String(user._id || user.id || '');
      const due = all.filter(f => {
        const creatorId = String(f.createdBy?._id || f.createdBy || '');
        const assignedId = String(f.assignedTo?._id || f.assignedTo || '');
        if (!isUserAdmin && uid && creatorId && assignedId && creatorId !== uid && assignedId !== uid) {
          return false;
        }
        const t = new Date(f.scheduledAt);
        return t <= now && !alertedIds.current.has(f._id);
      });
      if (due.length > 0) {
        due.forEach(f => {
          alertedIds.current.add(f._id);
          const creatorId = String(f.createdBy?._id || f.createdBy || '');
          const counsellorName = f.filledByName || f.createdBy?.name || f.assignedTo?.name || (creatorId === uid ? user.name : 'Counsellor');
          const campaignName = f.campaign || f.lead?.campaign?.name || f.lead?.campaign || '';
          leadNoteReminderService.triggerCallbackToast(
            {
              followupId: String(f._id),
              leadId: String(f.lead?._id || f.lead || f.metaLeadId || ''),
              metaLeadId: f.metaLeadId ? String(f.metaLeadId) : '',
              leadName: f.leadName || f.lead?.name || 'Lead',
              leadPhone: f.leadPhone || f.lead?.phone || '',
              campaign: campaignName,
              counsellorName,
              filledById: creatorId || uid,
              filledByName: counsellorName,
              assignedToId: String(f.assignedTo?._id || f.assignedTo || ''),
              assignedToName: f.assignedTo?.name || counsellorName,
              scheduledAt: f.scheduledAt,
              note: f.note || '',
            },
            { isImmediate: false, isDueAlert: true }
          );
        });
        const newNotifs = due.map(f => ({
          id: 'cb_' + f._id, type: 'callback_due',
          title: '📞 Callback Due Now!',
          message: `Call ${f.leadName || f.lead?.name || 'lead'} (${f.leadPhone || f.lead?.phone || ''}) — scheduled callback`,
          time: 'now', read: false, leadId: f.lead?._id || f.metaLeadId,
          followupId: f._id, ephemeral: true,
        }));
        setNotifications(prev => [...newNotifs, ...prev.filter(n => !n.ephemeral || alertedIds.current.has(n.followupId))]);
        setUnreadCount(prev => prev + newNotifs.length);
      }
    } catch (e) { }
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
        setOpenSubMenus({ leads: false, whatsapp: false, performance: false });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try { await notificationsAPI.markAllRead(); } catch (e) { }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id) => {
    if (String(id).startsWith('cb_')) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    try { await notificationsAPI.markRead(id); } catch (e) { }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const notifTarget = (n) => {
    const taskTypes = ['task_created', 'task_assigned', 'task_edited', 'task_overdue', 'task_reminder'];
    if (taskTypes.includes(n.type)) return n.leadId ? `/leads/${n.leadId}` : '/todo';
    if (n.type === 'callback_due') return n.leadId ? `/leads/${n.leadId}` : '/todo';
    if (n.leadId) return `/leads/${n.leadId}`;
    return null;
  };

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee';

  const displayDesignation = user?.displayName || user?.designation || roleLabel;

  // Designation Navigation Rules:
  // 1. Telecaller / Counsellor: Navbar shows ONLY Daily Activity, Overall Marketing (Meta Leads), Attendance, Email CRM.
  // 2. CEO & HR Management: Full navigation, Dashboard shown under Information.
  // 3. Remaining All: Dashboard is removed completely. Only Task/Daily Activity, Email CRM & Attendance.
  const hasDashboard = canViewDashboard(user);
  const isMarketingStaff = isDigitalMarketing(user) || String(user?.department || '').trim().toLowerCase() === 'marketing';
  const isManagerStaff = (user?.role === 'manager' || isManager(user)) && !isMarketingStaff;
  const isCaller = !isManagerStaff && (isTelecaller(user) ||
    user?.role === 'caller' ||
    user?.role === 'telecaller' ||
    String(user?.department || '').toLowerCase().includes('telecall') ||
    String(user?.department || '').toLowerCase().includes('caller') ||
    String(user?.designation || '').toLowerCase().includes('telecall') ||
    String(user?.designation || '').toLowerCase().includes('caller') ||
    String(user?.designation || '').toLowerCase().includes('councellor') ||
    String(user?.designation || '').toLowerCase().includes('counselor') ||
    String(user?.displayName || '').toLowerCase().includes('telecall') ||
    String(user?.displayName || '').toLowerCase().includes('caller') ||
    String(user?.displayName || '').toLowerCase().includes('councellor') ||
    String(user?.displayName || '').toLowerCase().includes('counselor') ||
    (String(user?.department || '').toLowerCase().includes('hr') && String(user?.role || '').toLowerCase() === 'employee'));

  const managerNavGroups = [
    {
      title: 'TODO List',
      icon: FaListCheck,
      items: [
        { label: 'TODO List', path: '/todo', icon: FaListCheck },
      ]
    },
    {
      title: 'Marketing',
      icon: FaBullhorn,
      sections: [
        {
          id: 'leads',
          title: 'Leads',
          icon: FaUsers,
          items: [
            { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
            { label: 'All Leads', path: '/leads', icon: FaUsers },
            { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
          ]
        },
        {
          id: 'whatsapp',
          title: 'WhatsApp',
          icon: FaWhatsapp,
          items: [
            { label: 'Contact', path: '/contacts', icon: FaBook },
            { label: 'WhatsApp Blast', path: '/whatsapp-blast', icon: WhatsAppBlastIcon },
            { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
          ]
        },
        {
          id: 'meta-leads',
          title: 'Meta Leads',
          icon: GoogleSheetsIcon,
          path: '/meta-leads',
          isDirect: true,
          
        },
        {
          id: 'ai-calling',
          title: 'AI Calling',
          icon: FaPhoneVolume,
          path: '/ai-calling',
          isDirect: true,
          
        }
      ],
      items: [
        { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
        { label: 'All Leads', path: '/leads', icon: FaUsers },
        { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
        { label: 'Contact', path: '/contacts', icon: FaBook },
        { label: 'WhatsApp Blast', path: '/whatsapp-blast', icon: WhatsAppBlastIcon },
        { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
        { label: 'Meta Leads', path: '/meta-leads', icon: GoogleSheetsIcon },
        { label: 'AI Calling', path: '/ai-calling', icon: FaPhoneVolume, badge: 'AI' },
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
        { label: 'Fee Receipt', path: '/fee-receipt', icon: FaReceipt },
      ]
    },
    {
      title: 'Management',
      icon: FaSitemap,
      items: [
        { label: 'Daily Activity Schedule', path: '/daily-activity-schedule', icon: FaCalendarCheck },
        { label: 'Attendance', path: user?._id ? `/${user._id}/attendance-records` : '/attendance-records', icon: FaCalendarCheck },
        { label: 'Call Recordings', path: '/recordings', icon: FaClock },
        { label: 'Email CRM', path: user?._id ? `/${user._id}/email` : '/email', icon: FaEnvelopeOpenText },
      ]
    }
  ];

  const telecallerNavGroups = [
    {
      title: 'TODO List',
      icon: FaListCheck,
      items: [
        { label: 'TODO List', path: '/todo', icon: FaListCheck },
      ]
    },
    {
      title: 'Marketing',
      icon: FaBullhorn,
      sections: [
        {
          id: 'leads',
          title: 'Leads',
          icon: FaUsers,
          items: [
            { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
            { label: 'All Leads', path: '/leads', icon: FaUsers },
            { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
          ]
        },
        {
          id: 'whatsapp',
          title: 'WhatsApp',
          icon: FaWhatsapp,
          items: [
            { label: 'Contact', path: '/contacts', icon: FaBook },
            { label: 'WhatsApp Blast', path: '/whatsapp-blast', icon: WhatsAppBlastIcon },
            { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
          ]
        },
        {
          id: 'meta-leads',
          title: 'Meta Leads',
          icon: GoogleSheetsIcon,
          path: '/meta-leads',
          isDirect: true,
        },
        {
          id: 'ai-calling',
          title: 'AI Calling',
          icon: FaPhoneVolume,
          path: '/ai-calling',
          isDirect: true,
        },
        ...((user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user)) ? [{
          id: 'performance',
          title: 'Performance',
          icon: FaChartLine,
          items: [
            { label: 'Leaderboard', path: '/leaderboard', icon: FaTrophy },
            { label: 'Report', path: '/reports', icon: FaChartPie },
          ]
        }] : [])
      ],
      items: [
        { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
        { label: 'All Leads', path: '/leads', icon: FaUsers },
        { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
        { label: 'Contact', path: '/contacts', icon: FaBook },
        { label: 'WhatsApp Blast', path: '/whatsapp-blast', icon: WhatsAppBlastIcon },
        { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
        { label: 'Meta Leads', path: '/meta-leads', icon: GoogleSheetsIcon },
        { label: 'AI Calling', path: '/ai-calling', icon: FaPhoneVolume, badge: 'AI' },
        ...((user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user)) ? [
          { label: 'Leaderboard', path: '/leaderboard', icon: FaTrophy },
          { label: 'Report', path: '/reports', icon: FaChartPie },
        ] : []),
      ]
    },
    {
      title: 'Attendance',
      icon: FaCalendarCheck,
      items: [
        { label: 'Attendance', path: user?._id ? `/${user._id}/attendance-records` : '/attendance-records', icon: FaCalendarCheck }
      ]
    },
    {
      title: 'Email CRM',
      icon: FaEnvelopeOpenText,
      items: [
        { label: 'Email CRM', path: user?._id ? `/${user._id}/email` : '/email', icon: FaEnvelopeOpenText }
      ]
    }
  ];

  const telecallerNavWithSchedule = [
    ...telecallerNavGroups,
    {
      title: 'Activity Schedule',
      icon: FaCalendarCheck,
      items: [
        { label: 'Activity Schedule', path: user?._id ? `/${user._id}/activity-schedule` : '/activity-schedule', icon: FaCalendarCheck }
      ]
    }
  ];

  const topDropdownGroups = isCaller
    ? telecallerNavWithSchedule
    : isManagerStaff
      ? managerNavGroups
      : (!hasDashboard ? [
    ...(!isMarketingStaff ? [{
      title: 'TODO List',
      icon: FaListCheck,
      items: [
        { label: 'TODO List', path: '/todo', icon: FaListCheck },
      ]
    }] : []),
    ...(canSeeMetaLeads && !isMarketingStaff ? [{
      title: 'Marketing',
      icon: FaBullhorn,
      items: [
        { label: 'Meta Leads', path: '/meta-leads', icon: GoogleSheetsIcon },
        { label: 'AI Calling', path: '/ai-calling', icon: FaPhoneVolume },
      ]
    }] : []),
    ...(canAccessDigitalCalendar(user) ? [{
      title: 'Digital Calendar',
      icon: FaCalendarDays,
      items: [
        { label: 'Digital Calendar', path: user?._id ? `/${user._id}/digital-calendar` : '/digital-calendar', icon: FaCalendarDays },
      ]
    }] : []),
    ...(canViewCallRecordings(user) ? [{
      title: 'Call Recordings',
      icon: FaClock,
      items: [
        { label: 'Call Recordings', path: '/recordings', icon: FaClock },
      ]
    }] : []),
    {
      title: 'Email CRM',
      icon: FaEnvelopeOpenText,
      items: [
        { label: 'Email CRM', path: user?._id ? `/${user._id}/email` : '/email', icon: FaEnvelopeOpenText },
      ]
    },
    {
      title: 'Attendance',
      icon: FaCalendarCheck,
      items: [
        { label: 'Attendance', path: user?._id ? `/${user._id}/attendance-records` : '/attendance-records', icon: FaCalendarCheck },
      ]
    }
    ,
    {
      title: 'Activity Schedule',
      icon: FaCalendarCheck,
      items: [
        { label: 'Activity Schedule', path: user?._id ? `/${user._id}/activity-schedule` : '/activity-schedule', icon: FaCalendarCheck },
      ]
    }
  ] : [
    {
      title: 'Info', icon: FaCircleInfo, items: [
        { label: 'Dashboard', path: '/dashboard', icon: FaHouse },
        ...(!isMarketingStaff ? [{ label: 'TODO List', path: '/todo', icon: FaListCheck }] : []),
        { label: 'Digital Calendar', path: '/digital-calendar', icon: FaCalendarDays },
      ]
    },
    (user?.role === 'admin' || isCEO(user) || (String(user?.department || '').toUpperCase() === 'MARKETING' && user?.role === 'manager')) ? {
      title: 'Marketing',
      icon: FaBullhorn,
      sections: [
        {
          id: 'leads',
          title: 'Leads',
          icon: FaUsers,
          items: [
            { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
            { label: 'All Leads', path: '/leads', icon: FaUsers },
            { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
          ]
        },
        {
          id: 'whatsapp',
          title: 'WhatsApp',
          icon: FaWhatsapp,
          items: [
            { label: 'Contact', path: '/contacts', icon: FaBook },
            { label: 'WhatsApp Blast', path: '/whatsapp-blast', icon: WhatsAppBlastIcon },
            { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
          ]
        },
        {
          id: 'meta-leads',
          title: 'Meta Leads',
          icon: GoogleSheetsIcon,
          path: '/meta-leads',
          isDirect: true,
        },
        {
          id: 'ai-calling',
          title: 'AI Calling',
          icon: FaPhoneVolume,
          path: '/ai-calling',
          isDirect: true,
        },
        ...((user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user)) ? [{
          id: 'performance',
          title: 'Performance',
          icon: FaChartLine,
          items: [
            { label: 'Leaderboard', path: '/leaderboard', icon: FaTrophy },
            { label: 'Report', path: '/reports', icon: FaChartPie },
          ]
        }] : [])
      ],
      items: [
        { label: 'Add Leads', path: '/leads/new', icon: FaUserPlus },
        { label: 'All Leads', path: '/leads', icon: FaUsers },
        { label: 'Campaigns', path: '/campaigns', icon: FaBullhorn },
        { label: 'Contact', path: '/contacts', icon: FaBook },
        { label: 'WhatsApp Blast', path: '/whatsapp-blast', icon: WhatsAppBlastIcon },
        { label: 'WhatsApp', path: '/whatsapp', icon: FaWhatsapp },
        { label: 'Meta Leads', path: '/meta-leads', icon: GoogleSheetsIcon },
        { label: 'AI Calling', path: '/ai-calling', icon: FaPhoneVolume, badge: 'AI' },
        ...((user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user)) ? [
          { label: 'Leaderboard', path: '/leaderboard', icon: FaTrophy },
          { label: 'Report', path: '/reports', icon: FaChartPie },
        ] : []),
      ]
    } : {
      title: 'Marketing',
      icon: FaBullhorn,
      items: [
        { label: 'Meta Leads', path: '/meta-leads', icon: GoogleSheetsIcon, badge: 'Assigned Leads' },
        { label: 'AI Calling', path: '/ai-calling', icon: FaPhoneVolume, badge: 'AI' }
      ]
    },
    {
      title: 'Finance', icon: FaCoins, items: [
        { label: 'Offer letter', path: '/offer-letter', icon: FaFileInvoiceDollar },
        { label: 'Payslip', path: '/payslips', icon: FaReceipt },
        { label: 'Quotation', path: '/quotation', icon: FaFileInvoiceDollar },
        { label: 'Invoice', path: '/invoice', icon: FaReceipt },
        { label: 'Fee Receipt', path: '/fee-receipt', icon: FaReceipt },
      ]
    },
    {
      title: 'Management', icon: FaSitemap, items: [
        { label: 'Departments', path: '/admin/departments', icon: FaSitemap },
        { label: 'Client Demos Booked', path: '/demo-bookings', icon: FaCalendarCheck },
        { label: 'Daily Activity Schedule', path: '/daily-activity-schedule', icon: FaCalendarCheck },
        { label: 'Performance & Compliance', path: '/performance', icon: FaAward },
        { label: 'Attendance', path: user?._id ? `/${user._id}/attendance-records` : '/attendance-records', icon: FaCalendarCheck },
        ...(canViewCallRecordings(user) ? [{ label: 'Call Recordings', path: '/recordings', icon: FaClock }] : []),
        { label: 'Live Tracking', path: '/admin/employee-tracking', icon: FaLocationDot, adminOnly: !isHR(user) && !isCEO(user) },
        { label: 'Email CRM', path: user?._id ? `/${user._id}/email` : '/email', icon: FaEnvelopeOpenText },
      ]
    },
    {
      title: 'Developer', icon: FaCode, items: [
        { label: 'Access Tokens', path: '/access-tokens', icon: FaKey },
        { label: 'Integrations', path: '/integrations', icon: FaPlug },
        { label: 'Download APK', path: `${(import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'))}/download-apk`, icon: FaDownload, isExternal: true },
      ]
    },
  ]);

  const apkDownloadUrl = (() => {
    const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
    return `${rawApiUrl}/download-apk`;
  })();

  const handleDownloadApk = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const a = document.createElement('a');
    a.href = apkDownloadUrl;
    a.setAttribute('download', 'Telecom-CRM.apk');
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1500);
  };

  const profileMenuItems = [
    { label: 'Profile', icon: <FaUser className="w-3.5 h-3.5" />, onClick: () => { setShowProfile(false); navigate('/profile'); } },
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
                <Link
                  to={
                    hasDashboard
                      ? "/dashboard"
                      : isMarketingStaff
                        ? (canAccessDigitalCalendar(user) ? (user?._id ? `/${user._id}/digital-calendar` : "/digital-calendar") : "/meta-leads")
                        : "/todo"
                  }
                  className="flex items-center gap-2 group"
                >
                  <img
                    src={logoImg}
                    alt="AOTMS Logo"
                    className="h-9 sm:h-11 object-contain transition-all"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.25))' }}
                  />
                </Link>
              </div>

              {/* Desktop nav */}
              <nav ref={navDropdownRef} className="hidden lg:flex gap-1 xl:gap-2 shrink-0 items-center">
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
                          if (group.items.length === 1 && !group.forceDropdown) {
                            setActiveDropdown(null);
                            navigate(group.items[0].path);
                          } else {
                            setActiveDropdown(isOpen ? null : group.title);
                          }
                        }}
                        className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-xl text-xs font-semibold transition-all nav-glow-btn whitespace-nowrap"
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
                        {(group.items.length > 1 || group.forceDropdown) && (
                          <FaChevronDown
                            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            style={{ color: C.blue }}
                          />
                        )}
                      </motion.button>

                      <AnimatePresence>
                        {isOpen && (group.items.length > 1 || group.forceDropdown) && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute left-0 top-12 ${group.sections ? 'w-64' : 'w-60'} rounded-2xl z-50 overflow-hidden py-2 nav-dropdown-glow`}
                            style={{
                              background: C.bgSolid,
                              border: `1.5px solid ${C.orange}`,
                              boxShadow: `0 20px 50px rgba(15, 23, 42, 0.12), 0 0 20px ${C.orangeGlow}`,
                            }}
                          >
                            <div className="h-0.5 w-full -mt-2 mb-1" style={{ background: `linear-gradient(90deg, ${C.orange}, ${C.orangeLt}, ${C.blue})` }} />

                            {group.sections ? (
                              <div className="py-1 px-2 flex flex-col gap-2 max-h-[460px] overflow-y-auto">
                                {group.sections.map(sec => {
                                  if (sec.isDirect) {
                                    const active = location.pathname === sec.path;
                                    const DirectIcon = sec.icon;
                                    return (
                                      <div
                                        key={sec.id}
                                        onClick={() => {
                                          setActiveDropdown(null);
                                          setOpenSubMenus({ leads: false, whatsapp: false, performance: false });
                                          navigate(sec.path);
                                        }}
                                        className="flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer transition-all rounded-xl"
                                        style={{
                                          color: C.blue,
                                          background: active ? C.blueSoft : 'transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!active) e.currentTarget.style.background = C.bgHover;
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!active) e.currentTarget.style.background = 'transparent';
                                        }}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <DirectIcon
                                            className="w-4 h-4 transition-colors"
                                            style={{ color: C.blue, filter: `drop-shadow(0 0 3px ${C.blueGlow})` }}
                                          />
                                          <span style={{ color: C.blue }}>{sec.title}</span>
                                        </div>
                                        {sec.badge && (
                                          <span
                                            style={{
                                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                                              background: 'rgba(16, 185, 129, 0.12)', color: '#059669',
                                            }}
                                          >
                                            {sec.badge}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }

                                  const isOpenSub = !!openSubMenus[sec.id];
                                  const hasActiveChild = sec.items.some(it => location.pathname === it.path);
                                  const SecIcon = sec.icon;

                                  return (
                                    <div key={sec.id} className="flex flex-col gap-1.5">
                                      {/* Sub-dropdown category toggle (Border removed, clean gap) */}
                                      <div
                                        onClick={(e) => toggleSubMenu(sec.id, e)}
                                        className="flex items-center justify-between px-3 py-2 text-xs font-bold cursor-pointer transition-all select-none rounded-xl"
                                        style={{
                                          background: isOpenSub ? C.blueSoft : (hasActiveChild ? 'rgba(2, 132, 199, 0.06)' : 'transparent'),
                                          color: C.blue,
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isOpenSub) e.currentTarget.style.background = C.bgHover;
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isOpenSub) e.currentTarget.style.background = hasActiveChild ? 'rgba(2, 132, 199, 0.06)' : 'transparent';
                                        }}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <SecIcon
                                            className="w-3.5 h-3.5"
                                            style={{ color: C.blue, filter: `drop-shadow(0 0 2px ${C.blueGlow})` }}
                                          />
                                          <span>{sec.title}</span>
                                        </div>
                                        <FaChevronDown
                                          className={`w-3 h-3 transition-transform duration-200 ${isOpenSub ? 'rotate-180' : ''}`}
                                          style={{ color: isOpenSub ? C.orange : C.blue }}
                                        />
                                      </div>

                                      {/* Sub-dropdown child items (Closed by default, clean gaps, border removed) */}
                                      <AnimatePresence>
                                        {isOpenSub && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="pl-3 pr-1 py-0.5 flex flex-col gap-1.5 overflow-hidden"
                                          >
                                            {sec.items.map(subItem => {
                                              const SubIcon = subItem.icon;
                                              const isSubActive = location.pathname === subItem.path;
                                              return (
                                                <div
                                                  key={subItem.path}
                                                  onClick={() => {
                                                    setActiveDropdown(null);
                                                    setOpenSubMenus({ leads: false, whatsapp: false, performance: false });
                                                    navigate(subItem.path);
                                                  }}
                                                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                                                  style={{
                                                    background: isSubActive ? C.blueSoft : 'transparent',
                                                    color: isSubActive ? C.orangeDk : C.blue,
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    if (!isSubActive) e.currentTarget.style.background = C.bgHover;
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    if (!isSubActive) e.currentTarget.style.background = 'transparent';
                                                  }}
                                                >
                                                  <SubIcon className="w-3.5 h-3.5" style={{ color: isSubActive ? C.orange : C.blue }} />
                                                  <span>{subItem.label}</span>
                                                </div>
                                              );
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              group.items
                                .filter(item => !item.adminOnly || user?.role === 'admin' || isCEO(user) || isHR(user) || isManager(user) || user?.role === 'manager' || item.path.includes('attendance'))
                                .map(item => {
                                  const ItemIcon = item.icon;
                                  const active = location.pathname === item.path;
                                  return (
                                    <div
                                      key={item.path}
                                      onClick={() => {
                                        setActiveDropdown(null);
                                        if (item.isExternal || item.path.startsWith('http')) {
                                          window.open(item.path, '_blank');
                                        } else {
                                          navigate(item.path);
                                        }
                                      }}
                                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-medium cursor-pointer transition-all nav-dropdown-item-glow mx-1 rounded-xl ${active ? 'border-l-4' : ''
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
                                      {item.badge && (
                                        <span
                                          className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                                          style={{
                                            background: 'rgba(16, 185, 129, 0.12)',
                                            color: '#059669',
                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                          }}
                                        >
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                            )}
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



                {/* Mobile APK — icon-only action (no text label) */}
                <motion.a
                  whileHover={{ scale: 1.08, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  href={apkDownloadUrl}
                  download="Telecom-CRM.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDownloadApk}
                  title="Download Mobile App (APK)"
                  aria-label="Download Mobile App (APK)"
                  className="group relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer no-underline transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #fff7ed 100%)',
                    border: `1.5px solid ${C.borderBlue}`,
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.14)',
                  }}
                >
                  <FaMobileScreen
                    className="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
                    style={{ color: C.blue }}
                  />
                  <span
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      width: 13,
                      height: 13,
                      bottom: -2,
                      right: -2,
                      background: `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeDk} 100%)`,
                      border: `1.5px solid ${C.bgSolid}`,
                      boxShadow: `0 0 6px ${C.orangeGlow}`,
                    }}
                  >
                    <FaDownload size={7} color="#ffffff" />
                  </span>
                </motion.a>

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
              {/* Mobile App Download Banner (Direct Native Link) */}
              <a
                href={apkDownloadUrl}
                download="Telecom-CRM.apk"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-2xl flex items-center justify-between cursor-pointer border shadow-xs no-underline"
                style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #fff7ed 100%)',
                  borderColor: '#fdba74'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <FaMobileScreen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Download Mobile App APK</div>
                    <div className="text-[10px] text-slate-500 font-medium">Latest Android Release (Direct Download)</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-xs">
                  Download APK
                </span>
              </a>
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
                    {group.sections ? (
                      <div className="space-y-2">
                        {group.sections.map(sec => {
                          if (sec.isDirect) {
                            const DirectIcon = sec.icon;
                            return (
                              <div
                                key={sec.id}
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  navigate(sec.path);
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                                style={{ background: '#ffffff', color: C.blue }}
                              >
                                <div className="flex items-center gap-2">
                                  <DirectIcon className="w-3.5 h-3.5" style={{ color: C.blue }} />
                                  <span>{sec.title}</span>
                                </div>
                                {sec.badge && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                                    {sec.badge}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          const SecIcon = sec.icon;
                          return (
                            <div key={sec.id} className="p-2.5 rounded-xl bg-white flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                                <SecIcon className="w-3.5 h-3.5 text-sky-600" />
                                <span>{sec.title}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {sec.items.map(subItem => {
                                  const SubIcon = subItem.icon;
                                  return (
                                    <div
                                      key={subItem.path}
                                      onClick={() => {
                                        setMobileMenuOpen(false);
                                        navigate(subItem.path);
                                      }}
                                      className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer hover:bg-orange-50 text-sky-700"
                                    >
                                      <SubIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                      <span className="truncate">{subItem.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.items
                          .filter(item => !item.adminOnly || user?.role === 'admin' || isCEO(user) || isHR(user) || isManager(user) || user?.role === 'manager' || item.path.includes('attendance'))
                          .map(item => {
                            const ItemIcon = item.icon;
                            return (
                              <div
                                key={item.path}
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  if (item.isExternal || item.path.startsWith('http')) {
                                    window.open(item.path, '_blank');
                                  } else {
                                    navigate(item.path);
                                  }
                                }}
                                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium cursor-pointer transition-all nav-dropdown-item-glow ${group.items.length === 1 ? 'col-span-2' : ''}`}
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
                                {item.badge && (
                                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}