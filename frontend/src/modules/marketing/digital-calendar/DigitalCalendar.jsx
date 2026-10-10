import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { digitalCalendarAPI } from '../../../services/api';
import { isCEO, isHR, isManager } from '../../../utils/permissions';
import {
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaPlus,
  FaPenToSquare,
  FaTrashCan,
  FaArrowUpRightFromSquare,
  FaCheck,
  FaClock,
  FaXmark,
  FaFilter,
  FaMagnifyingGlass,
  FaTableList,
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
  FaXTwitter,
  FaRotate,
  FaEye,
  FaUserCheck,
  FaTriangleExclamation,
  FaBullhorn,
  FaLayerGroup,
  FaLink,
  FaCircleInfo,
  FaUser,
  FaCircleCheck,
  FaHourglassHalf,
  FaCalendarPlus,
  FaCalendarCheck,
  FaShareNodes,
  FaSliders,
  FaBorderAll
} from 'react-icons/fa6';

// ── Content Types & Option Constants ──────────────────────────────────────────
const CONTENT_TYPES = [
  'Post',
  'Reel',
  'Carousel',
  'Story',
  'Poster',
  'Video',
  'Short',
  'Article',
  'Announcement',
  'Promotional',
  'Educational',
  'Testimonial',
  'Other'
];

const PLATFORM_STATUS_OPTIONS = [
  'Not Required',
  'Planned',
  'Draft',
  'In Design',
  'Ready',
  'Scheduled',
  'Posted',
  'Failed',
  'Pending'
];

const OVERALL_STATUS_OPTIONS = [
  'Planned',
  'Draft',
  'In Design',
  'Ready to Post',
  'Scheduled',
  'Posted',
  'Pending Platforms',
  'Failed',
  'Needs Approval'
];

const APPROVAL_OPTIONS = ['Pending', 'Approved', 'Rejected'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MINI_CAL_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Content Type styling pill colors
const TYPE_STYLES = {
  Post: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: '#0284c7' },
  Reel: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: '#db2777' },
  Carousel: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: '#9333ea' },
  Story: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: '#d97706' },
  Poster: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: '#059669' },
  Video: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: '#dc2626' },
  Short: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: '#e11d48' },
  Article: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: '#64748b' },
  Announcement: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: '#ea580c' },
  Promotional: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: '#4f46e5' },
  Educational: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: '#0891b2' },
  Testimonial: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: '#0d9488' },
  Other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', dot: '#6b7280' }
};

function getTypeStyle(type) {
  return TYPE_STYLES[type] || { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: '#0284c7' };
}

// Helper: Status badge styling
function getStatusStyle(status) {
  switch (status) {
    case 'Posted':
      return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', dot: '#10b981' };
    case 'Scheduled':
      return { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', dot: '#0284c7' };
    case 'Ready':
    case 'Ready to Post':
      return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', dot: '#8b5cf6' };
    case 'Planned':
      return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', dot: '#f59e0b' };
    case 'In Design':
    case 'Draft':
      return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', dot: '#3b82f6' };
    case 'Pending':
    case 'Pending Platforms':
    case 'Needs Approval':
      return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', dot: '#f97316' };
    case 'Failed':
    case 'Rejected':
      return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' };
    case 'Not Required':
    default:
      return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0', dot: '#94a3b8' };
  }
}

function getApprovalBadge(status) {
  switch (status) {
    case 'Approved':
      return { label: 'Approved', icon: '✓', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    case 'Rejected':
      return { label: 'Rejected', icon: '✕', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    case 'Pending':
    default:
      return { label: 'Needs Approval', icon: '⏳', bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' };
  }
}

// 12-Hour Time Formatter
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

// ── Smooth Synchronized Same-Direction Auto-Scroll (Horizontal) ───────────────
const UNIFIED_SCROLL_DURATION = 7.0; // In seconds - synchronized rhythm across all fields

function AutoScrollText({ children, className = '', title }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const measure = () => {
      if (!el || !txt) return;
      const diff = txt.scrollWidth - el.clientWidth;
      setOverflowDistance(diff > 3 ? diff : 0);
    };

    measure();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (txt) ro.observe(txt);
    return () => ro.disconnect();
  }, [children]);

  const isOverflowing = overflowDistance > 0;

  return (
    <div
      ref={containerRef}
      title={title || (typeof children === 'string' ? children : undefined)}
      className={`overflow-hidden relative whitespace-nowrap min-w-0 ${className}`}
    >
      <div
        ref={textRef}
        className={`inline-block w-max auto-scroll-marquee-item ${isOverflowing ? 'cursor-default' : ''}`}
        style={
          isOverflowing
            ? {
                animation: `autoScrollSameDirection ${UNIFIED_SCROLL_DURATION}s ease-in-out infinite`,
                '--max-scroll': `-${overflowDistance + 6}px`
              }
            : {}
        }
      >
        {children}
      </div>
    </div>
  );
}

// ── Smooth Auto-Scroll Flex Container (Horizontal for Badges & Multi-Items) ───
function AutoScrollContainer({ children, className = '' }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    const cnt = contentRef.current;
    if (!el || !cnt) return;

    const measure = () => {
      if (!el || !cnt) return;
      const diff = cnt.scrollWidth - el.clientWidth;
      setOverflowDistance(diff > 4 ? diff : 0);
    };

    measure();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (cnt) ro.observe(cnt);
    return () => ro.disconnect();
  }, [children]);

  const isOverflowing = overflowDistance > 0;

  return (
    <div ref={containerRef} className={`overflow-hidden relative min-w-0 ${className}`}>
      <div
        ref={contentRef}
        className={`inline-flex items-center gap-1.5 w-max auto-scroll-marquee-item ${
          isOverflowing ? 'cursor-default' : ''
        }`}
        style={
          isOverflowing
            ? {
                animation: `autoScrollSameDirection ${UNIFIED_SCROLL_DURATION}s ease-in-out infinite`,
                '--max-scroll': `-${overflowDistance + 6}px`
              }
            : {}
        }
      >
        {children}
      </div>
    </div>
  );
}

// ── Smooth Auto-Scroll Notes Component (Horizontal Unified Scroller) ───────────
function AutoScrollNotes({ text }) {
  if (!text) return <div className="mb-3 h-[38px]" />;

  return (
    <div
      className="text-[11px] text-slate-600 bg-slate-50/80 px-2.5 py-2 rounded-xl border border-slate-200/70 font-medium h-[38px] relative mb-3 group/notes flex items-center min-w-0 overflow-hidden"
      title={text}
    >
      <AutoScrollText className="w-full text-[11px] text-slate-600 font-medium">
        {text}
      </AutoScrollText>
    </div>
  );
}

export default function DigitalCalendar() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Current calendar viewing month & year
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-indexed

  // UI View Modes
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' (Left Mini Cal + Middle Cards) | 'management' (Table View)
  const [timeTab, setTimeTab] = useState('all'); // 'all' | 'today' | 'upcoming' | 'review'

  // Data State
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalContent: 0,
    scheduled: 0,
    posted: 0,
    pending: 0,
    needsApproval: 0
  });
  const [marketingEmployees, setMarketingEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState(null); // 'YYYY-MM-DD' or null

  // Filters State
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState(null);

  // Authorization flags
  const canDeleteContent = isCEO(user) || user?.role === 'admin' || isManager(user);

  // Holidays State for Mini Calendar Marking (Does not affect main cards feed)
  const [holidays, setHolidays] = useState([]);

  // Fetch Marketing Employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await digitalCalendarAPI.getEmployees();
      if (res.data?.ok && res.data?.employees) {
        setMarketingEmployees(res.data.employees);
      }
    } catch (err) {
      console.error('Error loading marketing employees:', err);
    }
  }, []);

  // Fetch Indian Holidays in background strictly for mini calendar markers
  const fetchHolidays = useCallback(async () => {
    try {
      const res = await digitalCalendarAPI.getGoogleEvents({
        calendarId: 'indian_holidays',
        year: currentYear,
        month: currentMonth + 1
      });
      if (res.data?.ok && res.data?.data) {
        setHolidays(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load holidays for mini calendar:', err);
    }
  }, [currentYear, currentMonth]);

  // Fetch Calendar Content & Stats
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year: currentYear,
        month: currentMonth + 1,
        responsible: filterEmployee !== 'all' ? filterEmployee : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        platform: filterPlatform !== 'all' ? filterPlatform : undefined,
        search: searchQuery.trim() || undefined
      };

      const [itemsRes, statsRes] = await Promise.all([
        digitalCalendarAPI.getAll(params),
        digitalCalendarAPI.getStats({ year: currentYear, month: currentMonth + 1 })
      ]);

      if (itemsRes.data?.ok) {
        const loadedItems = itemsRes.data.data || [];
        setItems(loadedItems);

        if (loadedItems.length > 0) {
          setSelectedItemId(prevId => {
            const exists = loadedItems.some(it => it._id === prevId);
            return exists ? prevId : loadedItems[0]._id;
          });
        } else {
          setSelectedItemId(null);
        }
      }

      if (statsRes.data?.ok && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error('Failed to load digital calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, filterEmployee, filterType, filterPlatform, searchQuery]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedDateFilter(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedDateFilter(null);
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSelectedDateFilter(todayStr);
  };

  // Build the Mini Calendar Grid Days for Left Sidebar
  const miniCalendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month overflow
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateStr,
        fullDate: new Date(prevYear, prevMonth, dayNum)
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateStr,
        fullDate: new Date(currentYear, currentMonth, i)
      });
    }

    // Next month overflow to complete 5 or 6 rows (35 or 42 cells)
    const targetLength = days.length <= 35 ? 35 : 42;
    let nextMonthDay = 1;
    while (days.length < targetLength) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`;
      days.push({
        dayNumber: nextMonthDay,
        isCurrentMonth: false,
        dateStr,
        fullDate: new Date(nextYear, nextMonth, nextMonthDay)
      });
      nextMonthDay++;
    }

    return days;
  }, [currentYear, currentMonth]);

  // Group items by date string for count badges in mini calendar
  const itemsCountByDate = useMemo(() => {
    const map = {};
    items.forEach(it => {
      if (!it.content_date) return;
      const d = new Date(it.content_date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map[dateKey] = (map[dateKey] || 0) + 1;
    });
    return map;
  }, [items]);

  // Group holidays by date string for holiday dots in mini calendar
  const holidaysByDate = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      const rawDate = h.content_date || h.start;
      if (!rawDate) return;
      let dateKey = '';
      if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        dateKey = rawDate.slice(0, 10);
      } else {
        const d = new Date(rawDate);
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(h);
    });
    return map;
  }, [holidays]);

  // Dynamic Live Counts for the 5 Status Filters
  const statusCounts = useMemo(() => {
    let total = items.length;
    let scheduled = 0;
    let posted = 0;
    let inProgress = 0;
    let needsApproval = 0;

    items.forEach(it => {
      const st = it.overall_status;
      if (st === 'Posted') {
        posted++;
      } else if (st === 'Scheduled') {
        scheduled++;
      } else if (['In Design', 'Draft', 'Planned', 'Pending', 'Pending Platforms'].includes(st)) {
        inProgress++;
      }
      if (it.approval_status === 'Pending' || st === 'Needs Approval') {
        needsApproval++;
      }
    });

    return { total, scheduled, posted, inProgress, needsApproval };
  }, [items]);

  // Filtered Cards to display in Middle Area
  const filteredItems = useMemo(() => {
    let list = [...items];

    // Selected Date Filter from left mini calendar
    if (selectedDateFilter) {
      list = list.filter(it => {
        if (!it.content_date) return false;
        const d = new Date(it.content_date);
        const itDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return itDateStr === selectedDateFilter;
      });
    }

    // 5 Status Filter Tabs
    if (filterStatus === 'scheduled') {
      list = list.filter(it => it.overall_status === 'Scheduled');
    } else if (filterStatus === 'posted') {
      list = list.filter(it => it.overall_status === 'Posted');
    } else if (filterStatus === 'in_progress') {
      list = list.filter(it => ['In Design', 'Draft', 'Planned', 'Pending', 'Pending Platforms'].includes(it.overall_status));
    } else if (filterStatus === 'needs_approval') {
      list = list.filter(it => it.approval_status === 'Pending' || it.overall_status === 'Needs Approval');
    }

    // Client search fallback (supports searching by title, notes, employee name, or display name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(it =>
        (it.content_title || '').toLowerCase().includes(q) ||
        (it.notes || '').toLowerCase().includes(q) ||
        (it.responsible_employee_name || '').toLowerCase().includes(q) ||
        (it.responsible_employee?.name || '').toLowerCase().includes(q) ||
        (it.responsible_employee?.displayName || '').toLowerCase().includes(q) ||
        (it.content_type || '').toLowerCase().includes(q) ||
        (it.overall_status || '').toLowerCase().includes(q)
      );
    }

    // Sort by content_date ascending
    return list.sort((a, b) => new Date(a.content_date) - new Date(b.content_date));
  }, [items, selectedDateFilter, filterStatus, searchQuery]);

  // Open edit modal
  const handleEditClick = (item) => {
    setSelectedItemId(item._id);
    setEditingItem(item);
    setShowEditModal(true);
  };

  // Open delete confirmation modal
  const handleDeleteClick = (item) => {
    setEditingItem(item);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!editingItem?._id) return;
    try {
      await digitalCalendarAPI.delete(editingItem._id);
      setShowDeleteModal(false);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete content');
    }
  };

  const hasActiveFilters =
    filterEmployee !== 'all' ||
    filterType !== 'all' ||
    filterStatus !== 'all' ||
    filterPlatform !== 'all' ||
    selectedDateFilter !== null ||
    Boolean(searchQuery.trim());

  return (
    <div
      className="w-full min-h-screen text-slate-800"
      style={{
        background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 160px, #ffffff 100%)',
        padding: '24px 28px 60px',
        margin: '0 auto',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* ── Custom Micro-Animation Styles ── */}
      <style>{`
        .content-card-elevated {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s;
        }
        .content-card-elevated:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px -6px rgba(2, 132, 199, 0.18), 0 4px 10px rgba(15, 23, 42, 0.04);
        }
        .mini-day-cell {
          transition: all 0.15s ease;
        }
        .mini-day-cell:hover {
          transform: scale(1.1);
        }
        .metric-card-elevated {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .metric-card-elevated:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px -4px rgba(2, 132, 199, 0.12);
        }
        @keyframes autoScrollSameDirection {
          0%, 20% {
            transform: translateX(0);
            opacity: 1;
          }
          75%, 88% {
            transform: translateX(var(--max-scroll, -20px));
            opacity: 1;
          }
          92% {
            transform: translateX(var(--max-scroll, -20px));
            opacity: 0;
          }
          94% {
            transform: translateX(0);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .auto-scroll-marquee-item:hover {
          animation-play-state: paused !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── 1. Page Header (Modern Glass with Orange/Blue Brand Accent) ── */}
      <div
        className="rounded-3xl p-5 sm:p-6 mb-6 shadow-sm border border-slate-200/80 backdrop-blur-md relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 249, 255, 0.90))',
          boxShadow: '0 8px 30px -4px rgba(2, 132, 199, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03)'
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left Title & Description */}
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg relative shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #f97316 100%)',
                boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)'
              }}
            >
              <FaCalendarDays className="w-6 h-6" />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 m-0">
                  Digital Calendar
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs">
                  Info Hub
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium m-0 mt-1">
                Plan, schedule, review and track social media content across Instagram, YouTube, LinkedIn & X.
              </p>
            </div>
          </div>

          {/* Header Right Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* View Mode Switcher: Calendar vs Table View */}
            <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200 rounded-xl shadow-xs shrink-0">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaCalendarDays className={`w-3.5 h-3.5 ${viewMode === 'calendar' ? 'text-sky-600' : 'text-slate-400'}`} />
                Calendar Cards
              </button>
              <button
                onClick={() => setViewMode('management')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'management'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaTableList className={`w-3.5 h-3.5 ${viewMode === 'management' ? 'text-sky-600' : 'text-slate-400'}`} />
                Table View
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center bg-white border border-slate-200/90 rounded-xl shadow-xs px-2 py-1 shrink-0">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition active:scale-95 cursor-pointer"
              >
                <FaChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 min-w-[130px] text-center select-none tracking-wide">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition active:scale-95 cursor-pointer"
              >
                <FaChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Group: Today, Refresh & Add Content (Kept directly beside each other) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Today Jump */}
              <button
                onClick={handleGoToToday}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Today
              </button>

              {/* Refresh */}
              <button
                onClick={fetchData}
                title="Refresh Data"
                className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:text-sky-600 hover:border-sky-400 hover:bg-sky-50/50 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <FaRotate className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
              </button>

              {/* Add Content CTA Button */}
              <button
                onClick={() => {
                  setPrefilledDate(new Date().toISOString().split('T')[0]);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)',
                  border: '1px solid rgba(249, 115, 22, 0.4)'
                }}
              >
                <FaPlus className="w-3.5 h-3.5" />
                <span>Add Content</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Main Workspace: Calendar Mode (Left Mini-Cal + Middle Cards Feed) ─ */}
      {viewMode === 'calendar' ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* ─── LEFT SIDEBAR: Mini Calendar + Filter Categories (Reference Style) ─── */}
          <div className="w-full lg:w-[310px] shrink-0 flex flex-col gap-4">
            {/* 1. Mini Calendar Widget */}
            <div
              className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm relative overflow-hidden"
              style={{
                boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.08)'
              }}
            >
              {/* Header with Month Jump */}
              <div className="flex items-center justify-between mb-3.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <FaChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <FaChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Weekday Row */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1 select-none">
                {MINI_CAL_DAYS.map(day => (
                  <span key={day} className="text-[10px] font-black text-slate-400 py-1">
                    {day}
                  </span>
                ))}
              </div>

              {/* Date Matrix */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {miniCalendarDays.map((dObj, idx) => {
                  const count = itemsCountByDate[dObj.dateStr] || 0;
                  const hasContent = count > 0;
                  const dayHolidays = holidaysByDate[dObj.dateStr] || [];
                  const hasHoliday = dayHolidays.length > 0;
                  const holidayNames = dayHolidays.map(h => h.summary || h.content_title || h.name).filter(Boolean);
                  const isSelected = selectedDateFilter === dObj.dateStr;
                  const now = new Date();
                  const isTodayDate =
                    dObj.fullDate.getFullYear() === now.getFullYear() &&
                    dObj.fullDate.getMonth() === now.getMonth() &&
                    dObj.fullDate.getDate() === now.getDate();

                  return (
                    <button
                      key={`${dObj.dateStr}-${idx}`}
                      type="button"
                      onClick={() => {
                        if (selectedDateFilter === dObj.dateStr) {
                          setSelectedDateFilter(null);
                        } else {
                          setSelectedDateFilter(dObj.dateStr);
                        }
                      }}
                      title={
                        hasHoliday && hasContent
                          ? `Holiday: ${holidayNames.join(', ')} • ${count} my content item(s)`
                          : hasHoliday
                          ? `Holiday: ${holidayNames.join(', ')}`
                          : hasContent
                          ? `${count} my content item(s)`
                          : undefined
                      }
                      className={`mini-day-cell h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-xs font-bold relative transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-md ring-2 ring-sky-500 scale-105'
                          : isTodayDate
                          ? 'bg-sky-50 text-sky-700 font-extrabold ring-2 ring-sky-500'
                          : dObj.isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-[11px]">{dObj.dayNumber}</span>
                      {/* Indicator Dots: Blue for content, Amber for holiday */}
                      {hasContent && !hasHoliday && (
                        <span
                          className={`w-1 h-1 rounded-full absolute bottom-1 ${
                            isSelected ? 'bg-sky-300' : 'bg-sky-500'
                          }`}
                        />
                      )}
                      {hasHoliday && !hasContent && (
                        <span
                          className={`w-1 h-1 rounded-full absolute bottom-1 ${
                            isSelected ? 'bg-amber-300' : 'bg-amber-500'
                          }`}
                        />
                      )}
                      {hasHoliday && hasContent && (
                        <div className="flex items-center gap-0.5 absolute bottom-0.5">
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-sky-300' : 'bg-sky-500'}`} />
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mini Calendar Indicator Legend */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold px-1 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>My Events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Holiday</span>
                </div>
              </div>

              {/* Clear Date Filter Button (if filtered) */}
              {selectedDateFilter && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-[11px] font-bold text-sky-700 truncate block">
                      Selected: {new Date(selectedDateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {holidaysByDate[selectedDateFilter]?.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 truncate block">
                        🎉 {holidaysByDate[selectedDateFilter].map(h => h.summary || h.content_title).join(', ')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter(null)}
                    className="text-[10px] font-extrabold text-rose-600 hover:underline cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>



            {/* 2. Platform Filters (Interactive Sidebar Reference List) */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Platforms
                </span>
                {filterPlatform !== 'all' && (
                  <button
                    onClick={() => setFilterPlatform('all')}
                    className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                  >
                    All
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {[
                  { id: 'all', label: 'All Platforms', icon: FaBorderAll, color: 'text-slate-600' },
                  { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-pink-600' },
                  { id: 'youtube', label: 'YouTube', icon: FaYoutube, color: 'text-red-600' },
                  { id: 'linkedin', label: 'LinkedIn', icon: FaLinkedinIn, color: 'text-blue-600' },
                  { id: 'x', label: 'X / Twitter', icon: FaXTwitter, color: 'text-slate-900' }
                ].map(p => {
                  const active = filterPlatform === p.id;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFilterPlatform(p.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                        <span>{p.label}</span>
                      </div>
                      {active && <FaCheck className="w-3 h-3 text-sky-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Content Type Filters */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Content Types
                </span>
                {filterType !== 'all' && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All
                </button>
                {CONTENT_TYPES.slice(0, 8).map(type => {
                  const active = filterType === type;
                  const tStyle = getTypeStyle(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(active ? 'all' : type)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                        active
                          ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                          : `${tStyle.bg} ${tStyle.text} ${tStyle.border} hover:opacity-80`
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Marketing Team Members (Reference Avatar Group) */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Marketing Team
                </span>
                {filterEmployee !== 'all' && (
                  <button
                    onClick={() => setFilterEmployee('all')}
                    className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                  >
                    All
                  </button>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                {marketingEmployees.slice(0, 8).map(emp => {
                  const active = filterEmployee === emp._id;
                  const personName = emp.actualName || emp.name || 'Marketing Member';
                  const personDisplayName = emp.displayName || emp.designation || 'Marketing';

                  return (
                    <button
                      key={emp._id}
                      type="button"
                      onClick={() => setFilterEmployee(active ? 'all' : emp._id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer border ${
                        active
                          ? 'bg-sky-50 text-sky-900 border-sky-300 shadow-2xs'
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {emp.avatar ? (
                          <img
                            src={emp.avatar}
                            alt={personName}
                            className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                          >
                            {(personName || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {personName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block truncate">
                            {personDisplayName}
                          </span>
                        </div>
                      </div>
                      {active && <FaCheck className="w-3 h-3 text-sky-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── MIDDLE MAIN AREA: Content Cards Stream / Grid (Reference Center) ─── */}
          <div className="flex-1 w-full flex flex-col gap-4">
            {/* Top Toolbar: Status Filters, Search & Reset */}
            <div
              className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3"
              style={{ boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.06)' }}
            >
              {/* 5 Status Filter Tabs (Replacing top metric cards) */}
              <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-2xs overflow-x-auto gap-1">
                {/* 1. Total Items */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <FaLayerGroup className={`w-3.5 h-3.5 ${filterStatus === 'all' ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>Total Items</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'all' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.total}
                  </span>
                </button>

                {/* 2. Scheduled */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('scheduled')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filterStatus === 'scheduled'
                      ? 'bg-white text-sky-700 shadow-sm border border-sky-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <FaClock className={`w-3.5 h-3.5 ${filterStatus === 'scheduled' ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>Scheduled</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'scheduled' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.scheduled}
                  </span>
                </button>

                {/* 3. Live / Posted */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('posted')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filterStatus === 'posted'
                      ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <FaCheck className={`w-3.5 h-3.5 ${filterStatus === 'posted' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Live / Posted</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'posted' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.posted}
                  </span>
                </button>

                {/* 4. In Progress */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('in_progress')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filterStatus === 'in_progress'
                      ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <FaPenToSquare className={`w-3.5 h-3.5 ${filterStatus === 'in_progress' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>In Progress</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'in_progress' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.inProgress}
                  </span>
                </button>

                {/* 5. Needs Approval */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('needs_approval')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filterStatus === 'needs_approval'
                      ? 'bg-white text-orange-700 shadow-sm border border-orange-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <FaHourglassHalf className={`w-3.5 h-3.5 ${filterStatus === 'needs_approval' ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span>Needs Approval</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'needs_approval' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.needsApproval}
                  </span>
                </button>
              </div>

              {/* Search Box & Active Reset */}
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative flex-1">
                  <FaMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search task, topic, or person..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setFilterEmployee('all');
                      setFilterType('all');
                      setFilterStatus('all');
                      setFilterPlatform('all');
                      setSelectedDateFilter(null);
                      setSearchQuery('');
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition whitespace-nowrap cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Date Filter Active Banner */}
            {selectedDateFilter && (
              <div className="p-3 bg-gradient-to-r from-sky-50 to-blue-50/60 border border-sky-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <FaCalendarDays className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="text-xs font-extrabold text-slate-900">
                    Showing content for{' '}
                    <span className="text-sky-700">
                      {new Date(selectedDateFilter).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                    {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                  </span>
                  {selectedDateFilter && holidaysByDate[selectedDateFilter]?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      🎉 {holidaysByDate[selectedDateFilter].map(h => h.summary || h.content_title).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(null)}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                >
                  Show All Dates
                </button>
              </div>
            )}

            {/* ── Content Cards Grid ── */}
            {loading ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <FaRotate className="w-6 h-6 animate-spin text-sky-600 mx-auto mb-3" />
                <span className="text-xs font-bold text-slate-500">Loading calendar items...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3 text-xl">
                  <FaCalendarDays />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 m-0">No Events Scheduled</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 mb-4">
                  There are no marketing schedules or events matching the selected date and filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPrefilledDate(selectedDateFilter || new Date().toISOString().split('T')[0]);
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  <FaPlus className="w-3 h-3" />
                  <span>Schedule Content Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Marketing Content Cards */}
                {filteredItems.map(item => {
                  const typeStyle = getTypeStyle(item.content_type);
                  const statusStyle = getStatusStyle(item.overall_status);
                  const approvalStyle = getApprovalBadge(item.approval_status);

                  // All 4 Platforms List - Always showing complete social media information
                  const platformList = [
                    {
                      name: 'Instagram',
                      icon: FaInstagram,
                      status: item.instagram_status || 'Not Required',
                      time: item.instagram_time,
                      color: 'text-pink-600',
                      badgeBg: 'bg-pink-50/70',
                      border: 'border-pink-200/80',
                      iconBg: 'bg-pink-100/60'
                    },
                    {
                      name: 'YouTube',
                      icon: FaYoutube,
                      status: item.youtube_status || 'Not Required',
                      time: item.youtube_time,
                      color: 'text-red-600',
                      badgeBg: 'bg-red-50/70',
                      border: 'border-red-200/80',
                      iconBg: 'bg-red-100/60'
                    },
                    {
                      name: 'LinkedIn',
                      icon: FaLinkedinIn,
                      status: item.linkedin_status || 'Not Required',
                      time: item.linkedin_time,
                      color: 'text-blue-600',
                      badgeBg: 'bg-blue-50/70',
                      border: 'border-blue-200/80',
                      iconBg: 'bg-blue-100/60'
                    },
                    {
                      name: 'X / Twitter',
                      icon: FaXTwitter,
                      status: item.x_status || 'Not Required',
                      time: item.x_time,
                      color: 'text-slate-900',
                      badgeBg: 'bg-slate-100/70',
                      border: 'border-slate-300/80',
                      iconBg: 'bg-slate-200/60'
                    }
                  ];

                  const formattedItemDate = new Date(item.content_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={item._id}
                      onClick={() => handleEditClick(item)}
                      className="content-card-elevated bg-white rounded-3xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between relative cursor-pointer group"
                      style={{
                        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)'
                      }}
                    >
                      <div>
                        {/* 1. Card Top Bar: Type Badge, Overall Status, Approval & Edit Controls */}
                        <div className="flex items-start justify-between gap-1.5 mb-2.5">
                          <AutoScrollContainer className="flex-1 min-w-0 py-0.5">
                            {/* Content Type */}
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black tracking-wide border shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                            >
                              {item.content_type}
                            </span>

                            {/* Overall Status Badge */}
                            <span
                              className="px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs shrink-0"
                              style={{
                                background: statusStyle.bg,
                                color: statusStyle.text,
                                border: `1px solid ${statusStyle.border}`
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot }} />
                              {item.overall_status}
                            </span>

                            {/* Approval Status */}
                            <span
                              className="px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shrink-0"
                              style={{
                                background: approvalStyle.bg,
                                color: approvalStyle.text,
                                border: `1px solid ${approvalStyle.border}`
                              }}
                            >
                              <span>{approvalStyle.icon}</span>
                              <span>{approvalStyle.label}</span>
                            </span>
                          </AutoScrollContainer>

                          {/* Top Right Action Icons */}
                          <div className="flex items-center gap-1 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEditClick(item)}
                              title="Edit content"
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            >
                              <FaPenToSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            {canDeleteContent && (
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(item)}
                                title="Delete content"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <FaTrashCan className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. Content Title - Auto Scroll if large */}
                        <div className="mb-1">
                          <AutoScrollText className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
                            {item.content_title}
                          </AutoScrollText>
                        </div>

                        {/* 3. Date & Schedule Row - Auto Scroll if large */}
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mt-1.5 mb-2.5">
                          <FaCalendarDays className="w-3 h-3 text-sky-500 shrink-0" />
                          <AutoScrollText className="text-[11px] font-bold text-slate-500 flex-1 min-w-0">
                            {formattedItemDate} • {item.day || new Date(item.content_date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </AutoScrollText>
                        </div>

                        {/* 4. Notes / Description - Auto Scroll if large */}
                        <AutoScrollNotes text={item.notes} />

                        {/* 5. Platform Breakdown & Posting Times - Auto Scroll text on overflow */}
                        <div className="space-y-1.5 mb-3.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                            Social Media Platforms & Times
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {platformList.map((pf, pIdx) => {
                              const PfIcon = pf.icon;
                              const isOff = pf.status === 'Not Required' || !pf.status;
                              const pfSt = getStatusStyle(pf.status);

                              return (
                                <div
                                  key={pIdx}
                                  className={`p-1.5 rounded-xl border flex flex-col justify-between gap-1 transition-all shadow-3xs min-h-[50px] ${
                                    isOff
                                      ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                                      : `${pf.badgeBg} ${pf.border}`
                                  }`}
                                >
                                  {/* Top: Icon + Full Name (Auto-scrolls if long) */}
                                  <div className="flex items-center gap-1.5 w-full min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                        isOff ? 'bg-slate-100 text-slate-400' : `${pf.iconBg} ${pf.color}`
                                      }`}
                                    >
                                      <PfIcon className="w-2.5 h-2.5" />
                                    </div>
                                    <div className="w-full min-w-0 overflow-hidden">
                                      <AutoScrollText
                                        className={`text-[11px] font-bold leading-tight ${
                                          isOff ? 'text-slate-400' : 'text-slate-800'
                                        }`}
                                      >
                                        {pf.name}
                                      </AutoScrollText>
                                    </div>
                                  </div>

                                  {/* Bottom: Status Tag + Time */}
                                  <div className="flex items-center justify-between gap-1 w-full pt-0.5 border-t border-slate-100/70 min-w-0">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      <AutoScrollText className="w-full">
                                        <span
                                          className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md inline-block shadow-3xs"
                                          style={{
                                            background: isOff ? '#f1f5f9' : pfSt.bg,
                                            color: isOff ? '#94a3b8' : pfSt.text,
                                            border: `1px solid ${isOff ? '#e2e8f0' : pfSt.border}`
                                          }}
                                        >
                                          {isOff ? 'Not Req' : pf.status}
                                        </span>
                                      </AutoScrollText>
                                    </div>
                                    {pf.time && !isOff && (
                                      <span className="text-[8.5px] text-slate-500 font-bold block shrink-0 ml-1">
                                        {formatTime12h(pf.time)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 6. Card Footer: Responsible Person + Drive Link */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-1">
                        {/* Responsible Member: Actual Name + Display Name with Auto-Scroll */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.responsible_employee?.avatar ? (
                            <img
                              src={item.responsible_employee.avatar}
                              alt={item.responsible_employee?.name || item.responsible_employee_name || 'M'}
                              className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                            >
                              {(item.responsible_employee?.name || item.responsible_employee_name || 'M')
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <AutoScrollText className="text-xs font-bold text-slate-800">
                              {item.responsible_employee?.actualName ||
                                item.responsible_employee?.name ||
                                item.responsible_employee_name ||
                                'Unassigned'}
                            </AutoScrollText>
                            {(item.responsible_employee?.displayName || item.responsible_employee?.designation) && (
                              <AutoScrollText className="text-[10px] text-slate-500 font-medium">
                                {item.responsible_employee?.displayName || item.responsible_employee?.designation}
                              </AutoScrollText>
                            )}
                          </div>
                        </div>

                        {/* Live Drive Link (if provided) */}
                        {item.live_folder_link && (
                          <a
                            href={item.live_folder_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="px-2 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition flex items-center gap-1 shrink-0"
                          >
                            <FaLink className="w-2.5 h-2.5" />
                            <span className="hidden sm:inline">Asset</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── 4. Comprehensive Management / Table View ───────────────────────── */
        <div
          className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden flex flex-col"
          style={{ boxShadow: '0 12px 35px -6px rgba(2, 132, 199, 0.09)' }}
        >
          {/* Table Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-gradient-to-r from-sky-50/70 via-white to-blue-50/60 flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-900 tracking-tight">
              All Marketing Content Items ({items.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Topic / Content Title</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-3">Day</th>
                  <th className="py-3.5 px-3">Instagram</th>
                  <th className="py-3.5 px-3">YouTube</th>
                  <th className="py-3.5 px-3">LinkedIn</th>
                  <th className="py-3.5 px-3">X (Twitter)</th>
                  <th className="py-3.5 px-3">Overall Status</th>
                  <th className="py-3.5 px-4">Responsible</th>
                  <th className="py-3.5 px-3">Approval</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.map(item => {
                  const t = getTypeStyle(item.content_type);
                  const st = getStatusStyle(item.overall_status);
                  const app = getApprovalBadge(item.approval_status);

                  return (
                    <tr
                      key={item._id}
                      onClick={() => handleEditClick(item)}
                      className="hover:bg-sky-50/40 transition cursor-pointer"
                    >
                      {/* Title */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[220px] truncate">
                        {item.content_title}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${t.bg} ${t.text} border ${t.border}`}>
                          {item.content_type}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-slate-700">
                        {new Date(item.content_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Day */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-semibold">
                        {item.day || new Date(item.content_date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>

                      {/* Instagram */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {item.instagram_status && item.instagram_status !== 'Not Required' ? (
                          <div>
                            <span className="font-bold text-pink-600">{item.instagram_status}</span>
                            {item.instagram_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(item.instagram_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* YouTube */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {item.youtube_status && item.youtube_status !== 'Not Required' ? (
                          <div>
                            <span className="font-bold text-red-600">{item.youtube_status}</span>
                            {item.youtube_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(item.youtube_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* LinkedIn */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {item.linkedin_status && item.linkedin_status !== 'Not Required' ? (
                          <div>
                            <span className="font-bold text-blue-600">{item.linkedin_status}</span>
                            {item.linkedin_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(item.linkedin_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* X / Twitter */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {item.x_status && item.x_status !== 'Not Required' ? (
                          <div>
                            <span className="font-bold text-slate-900">{item.x_status}</span>
                            {item.x_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(item.x_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
                          style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                        >
                          {item.overall_status}
                        </span>
                      </td>

                      {/* Responsible Person: Name + Display Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {item.responsible_employee?.actualName ||
                            item.responsible_employee?.name ||
                            item.responsible_employee_name ||
                            'Unassigned'}
                        </div>
                        {(item.responsible_employee?.displayName || item.responsible_employee?.designation) && (
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {item.responsible_employee?.displayName || item.responsible_employee?.designation}
                          </div>
                        )}
                      </td>

                      {/* Approval */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold"
                          style={{ background: app.bg, color: app.text, border: `1px solid ${app.border}` }}
                        >
                          {app.icon} {app.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(item)}
                            title="Edit"
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                          >
                            <FaPenToSquare className="w-3.5 h-3.5" />
                          </button>
                          {canDeleteContent && (
                            <button
                              onClick={() => handleDeleteClick(item)}
                              title="Delete"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <FaTrashCan className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-slate-500 font-bold">
                      No content items found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Add / Edit Content Form Modal ─────────────────────────────────── */}
      {(showAddModal || showEditModal) && (
        <ContentFormModal
          isEdit={showEditModal}
          initialData={showEditModal ? editingItem : { content_date: prefilledDate }}
          employees={marketingEmployees}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setEditingItem(null);
            setPrefilledDate(null);
          }}
          onSuccess={(savedItem) => {
            setShowAddModal(false);
            setShowEditModal(false);
            setEditingItem(null);
            setPrefilledDate(null);
            if (savedItem?._id) {
              setItems(prev => {
                const exists = prev.some(it => it._id === savedItem._id);
                if (exists) {
                  return prev.map(it => (it._id === savedItem._id ? savedItem : it));
                }
                return [...prev, savedItem];
              });
              setSelectedItemId(savedItem._id);
            }
            fetchData();
          }}
        />
      )}

      {/* ── 6. Delete Confirmation Modal ─────────────────────────────────────── */}
      {showDeleteModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <FaTriangleExclamation className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 m-0">Confirm Deletion</h3>
                <p className="text-xs text-slate-500 font-medium m-0">Permanent content removal</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
              Are you sure you want to delete <strong>&quot;{editingItem.content_title}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
              >
                Delete Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Content Form Modal Component ──────────────────────────────────────────────
function ContentFormModal({ isEdit, initialData, employees, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    content_title: initialData?.content_title || '',
    content_type: initialData?.content_type || 'Post',
    content_date: initialData?.content_date
      ? new Date(initialData.content_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    responsible_employee: initialData?.responsible_employee?._id || initialData?.responsible_employee || '',
    responsible_employee_name: initialData?.responsible_employee_name || '',
    approval_status: initialData?.approval_status || 'Pending',
    overall_status: initialData?.overall_status || 'Planned',
    live_folder_link: initialData?.live_folder_link || '',
    notes: initialData?.notes || '',

    // Platform Trackings
    instagram_status: initialData?.instagram_status || 'Not Required',
    instagram_time: initialData?.instagram_time || '',

    youtube_status: initialData?.youtube_status || 'Not Required',
    youtube_time: initialData?.youtube_time || '',

    linkedin_status: initialData?.linkedin_status || 'Not Required',
    linkedin_time: initialData?.linkedin_time || '',

    x_status: initialData?.x_status || 'Not Required',
    x_time: initialData?.x_time || ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        content_title: initialData.content_title || '',
        content_type: initialData.content_type || 'Post',
        content_date: initialData.content_date
          ? new Date(initialData.content_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        responsible_employee: initialData.responsible_employee?._id || initialData.responsible_employee || '',
        responsible_employee_name: initialData.responsible_employee?.actualName || initialData.responsible_employee?.name || initialData.responsible_employee?.displayName || initialData.responsible_employee_name || '',
        approval_status: initialData.approval_status || 'Pending',
        overall_status: initialData.overall_status || 'Planned',
        live_folder_link: initialData.live_folder_link || '',
        notes: initialData.notes || '',

        // Platform Trackings
        instagram_status: initialData?.instagram_status || 'Not Required',
        instagram_time: initialData?.instagram_time || '',

        youtube_status: initialData?.youtube_status || 'Not Required',
        youtube_time: initialData?.youtube_time || '',

        linkedin_status: initialData?.linkedin_status || 'Not Required',
        linkedin_time: initialData?.linkedin_time || '',

        x_status: initialData?.x_status || 'Not Required',
        x_time: initialData?.x_time || ''
      });
    }
  }, [initialData]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showResponsibleDropdown, setShowResponsibleDropdown] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const responsibleDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (responsibleDropdownRef.current && !responsibleDropdownRef.current.contains(event.target)) {
        setShowResponsibleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedEmployee = useMemo(() => {
    if (!formData.responsible_employee) return null;
    return (employees || []).find(e => String(e._id) === String(formData.responsible_employee)) || null;
  }, [employees, formData.responsible_employee]);

  const selectedDisplayName =
    selectedEmployee
      ? (selectedEmployee.actualName || selectedEmployee.name || selectedEmployee.displayName)
      : formData.responsible_employee_name;

  const selectedDisplayRole =
    selectedEmployee
      ? (selectedEmployee.displayName || selectedEmployee.designation)
      : '';

  const filteredEmployees = useMemo(() => {
    const list = employees || [];
    if (!employeeSearch.trim()) return list;
    const q = employeeSearch.toLowerCase();
    return list.filter(emp => {
      const name = (emp.actualName || emp.name || '').toLowerCase();
      const role = (emp.displayName || emp.designation || '').toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [employees, employeeSearch]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResponsibleChange = (empId) => {
    const selected = (employees || []).find(e => String(e._id) === String(empId));
    setFormData(prev => ({
      ...prev,
      responsible_employee: empId || null,
      responsible_employee_name: selected ? (selected.actualName || selected.name || selected.displayName) : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.content_title.trim()) {
      setError('Content title/topic is required.');
      return;
    }
    if (!formData.content_date) {
      setError('Content date is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEdit && initialData?._id) {
        const res = await digitalCalendarAPI.update(initialData._id, formData);
        if (res.data?.ok) {
          onSuccess(res.data.data);
        }
      } else {
        const res = await digitalCalendarAPI.create(formData);
        if (res.data?.ok) {
          onSuccess(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save content item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden relative">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/60 via-slate-50 to-orange-50/60">
          <h3 className="text-base font-extrabold text-slate-900 m-0 flex items-center gap-2.5">
            <FaCalendarDays className="w-4 h-4 text-sky-600" />
            {isEdit ? 'Edit Content Item' : '+ Schedule New Content'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold">
              {error}
            </div>
          )}

          {/* Title / Topic */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Content Topic / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.content_title}
              onChange={e => handleChange('content_title', e.target.value)}
              placeholder="e.g. Website Design Optimization, Cyber Security Reel..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition font-medium"
            />
          </div>

          {/* Date & Content Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.content_date}
                onChange={e => handleChange('content_date', e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 focus:bg-white transition font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={e => handleChange('content_type', e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                {CONTENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Responsible Person (Bounded Custom Select Component) */}
          <div className="relative" ref={responsibleDropdownRef}>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Responsible Person
            </label>

            <button
              type="button"
              onClick={() => setShowResponsibleDropdown(prev => !prev)}
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 border ${
                showResponsibleDropdown
                  ? 'border-sky-500 ring-2 ring-sky-100 bg-white'
                  : selectedDisplayName
                  ? 'border-sky-300'
                  : 'border-slate-200'
              } rounded-2xl transition font-medium flex items-center justify-between cursor-pointer text-left`}
            >
              {selectedDisplayName ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedEmployee?.avatar ? (
                    <img
                      src={selectedEmployee.avatar}
                      alt={selectedDisplayName}
                      className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                    >
                      {(selectedDisplayName || 'M').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-slate-900 truncate">
                    {selectedDisplayName}
                  </span>
                  {selectedDisplayRole && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200/80 shrink-0">
                      {selectedDisplayRole}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <FaUser className="w-3.5 h-3.5 text-slate-400" />
                  <span>Select Marketing Member</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {selectedDisplayName && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="Clear member"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResponsibleChange('');
                      setShowResponsibleDropdown(false);
                    }}
                    className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <FaXmark className="w-3 h-3" />
                  </span>
                )}
                <FaChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    showResponsibleDropdown ? 'rotate-180 text-sky-600' : ''
                  }`}
                />
              </div>
            </button>

            {/* Bounded Dropdown Menu - Strictly bounded inside input boundaries */}
            {showResponsibleDropdown && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                style={{
                  boxShadow: '0 12px 30px -4px rgba(2, 132, 199, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)'
                }}
              >
                {/* Search Bar (if 3+ members) */}
                {(employees || []).length > 3 && (
                  <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                    <div className="relative">
                      <FaMagnifyingGlass className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search marketing member..."
                        value={employeeSearch}
                        onChange={e => setEmployeeSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}

                {/* Option List */}
                <div className="max-h-56 overflow-y-auto">
                  {/* Unassigned / None Option */}
                  <button
                    type="button"
                    onClick={() => {
                      handleResponsibleChange('');
                      setShowResponsibleDropdown(false);
                      setEmployeeSearch('');
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition cursor-pointer border-b border-slate-100 ${
                      !formData.responsible_employee
                        ? 'bg-sky-50 text-sky-800 font-bold'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xs">
                        —
                      </span>
                      <span>Unassigned / None</span>
                    </div>
                    {!formData.responsible_employee && (
                      <FaCheck className="w-3 h-3 text-sky-600" />
                    )}
                  </button>

                  {filteredEmployees.map(emp => {
                    const personName = emp.actualName || emp.name;
                    const personDisplay = emp.displayName || emp.designation;
                    const isSelected = String(formData.responsible_employee) === String(emp._id);

                    return (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => {
                          handleResponsibleChange(emp._id);
                          setShowResponsibleDropdown(false);
                          setEmployeeSearch('');
                        }}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2.5 transition cursor-pointer border-b border-slate-50 last:border-0 ${
                          isSelected
                            ? 'bg-sky-50/90 text-sky-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {emp.avatar ? (
                            <img
                              src={emp.avatar}
                              alt={personName}
                              className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                            >
                              {(personName || 'M').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate">
                            <span className="text-xs font-bold block truncate">
                              {personName}
                            </span>
                            {personDisplay && (
                              <span className="text-[10px] text-slate-500 font-medium block truncate">
                                {personDisplay}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <FaCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {filteredEmployees.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-slate-400">
                      No matching team members found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Approval & Overall Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Approval Status
              </label>
              <select
                value={formData.approval_status}
                onChange={e => handleChange('approval_status', e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                {APPROVAL_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === 'Pending' ? 'Needs Approval' : opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Overall Status
              </label>
              <select
                value={formData.overall_status}
                onChange={e => handleChange('overall_status', e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                {OVERALL_STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Social Media Posting Breakdown ── */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FaBullhorn className="w-3.5 h-3.5 text-sky-600" />
              Social Media Platforms Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Instagram */}
              <div className="p-3.5 bg-gradient-to-br from-pink-50/50 to-white rounded-2xl border border-pink-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-pink-600 font-extrabold text-xs">
                  <FaInstagram className="w-4 h-4" />
                  <span>Instagram</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.instagram_status}
                      onChange={e => handleChange('instagram_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 07:00 PM"
                      value={formData.instagram_time}
                      onChange={e => handleChange('instagram_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* YouTube */}
              <div className="p-3.5 bg-gradient-to-br from-red-50/50 to-white rounded-2xl border border-red-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-red-600 font-extrabold text-xs">
                  <FaYoutube className="w-4 h-4" />
                  <span>YouTube</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.youtube_status}
                      onChange={e => handleChange('youtube_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 07:00 PM"
                      value={formData.youtube_time}
                      onChange={e => handleChange('youtube_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* LinkedIn */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/50 to-white rounded-2xl border border-blue-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs">
                  <FaLinkedinIn className="w-4 h-4" />
                  <span>LinkedIn</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.linkedin_status}
                      onChange={e => handleChange('linkedin_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 07:10 PM"
                      value={formData.linkedin_time}
                      onChange={e => handleChange('linkedin_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* X / Twitter */}
              <div className="p-3.5 bg-gradient-to-br from-slate-100/50 to-white rounded-2xl border border-slate-200 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                  <FaXTwitter className="w-4 h-4" />
                  <span>X / Twitter</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.x_status}
                      onChange={e => handleChange('x_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 06:40 PM"
                      value={formData.x_time}
                      onChange={e => handleChange('x_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live / Folder Link */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Live Link / Google Drive Asset Folder
            </label>
            <input
              type="url"
              value={formData.live_folder_link}
              onChange={e => handleChange('live_folder_link', e.target.value)}
              placeholder="https://drive.google.com/... or Canva post link"
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 focus:bg-white transition font-medium"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Internal Notes / Copy Instructions
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Add any internal instructions, hashtags, or campaign remarks..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 focus:bg-white transition font-medium"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 4px 15px rgba(2, 132, 199, 0.35)'
              }}
            >
              {saving ? 'Saving...' : isEdit ? 'Update Content' : 'Save & Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
