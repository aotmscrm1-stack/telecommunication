import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { digitalCalendarAPI } from '../../../services/api';
import {
  isCEO,
  isHR,
  isManager,
  canDeleteDigitalCalendar,
  canApproveDigitalCalendar,
  canCompleteDigitalCalendar
} from '../../../utils/permissions';
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
  FaFacebook,
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
const FULL_WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const str = String(timeStr).trim();
  if (str.toUpperCase().includes('AM') || str.toUpperCase().includes('PM')) return str;
  const parts = str.split(':');
  if (parts.length < 2) return str;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

// Convert any time string ('07:00 PM', '7:00 PM', '19:00', etc.) to 24-hour 'HH:mm' for <input type="time">
function to24HourTime(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  const match24 = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24) {
    return `${String(match24[1]).padStart(2, '0')}:${match24[2]}`;
  }
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (match12) {
    let [_, hours, minutes, ampm] = match12;
    let h = parseInt(hours, 10);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === 'PM' && h < 12) h += 12;
      if (upper === 'AM' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${minutes}`;
  }
  return '';
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

// ── Compact Notes Component (Guaranteed uniform h-[36px]) ───────────────────
function AutoScrollNotes({ text }) {
  if (!text || !text.trim()) {
    return (
      <div className="h-[36px] px-3 rounded-xl border border-dashed border-slate-200/70 font-medium mb-2.5 flex items-center gap-2 text-slate-400 text-[11px] select-none bg-slate-50/40">
        <span className="text-slate-300 text-xs">📝</span>
        <span className="italic text-slate-400/80">No notes added</span>
      </div>
    );
  }

  return (
    <div
      className="h-[36px] text-xs text-slate-600 bg-slate-50/90 px-3 py-1.5 rounded-xl border border-slate-200/80 font-medium relative mb-2.5 flex items-center gap-2 overflow-hidden"
      title={text}
    >
      <span className="text-slate-400 shrink-0 text-xs">📝</span>
      <span className="truncate leading-normal text-slate-600 flex-1 text-[11px]">
        {text}
      </span>
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

  // UI View Modes: 'calendar' (Remaining Cards) | 'management' (Table View) | 'completed' (Completed & Posted Cards)
  const [viewMode, setViewMode] = useState('calendar');
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
  const [cardSubIndexMap, setCardSubIndexMap] = useState({}); // { [itemId]: activeSubIndex }

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
  const [timeUpdateModal, setTimeUpdateModal] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Interactive Header Calendar Dropdown Popover (Shows Dates & Days)
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef(null);

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setShowDateDropdown(false);
      }
    }
    if (showDateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateDropdown]);

  // Authorization flags: marketing team members cannot delete; only admin should have delete
  const canDeleteContent = canDeleteDigitalCalendar(user);
  const canApproveContent = canApproveDigitalCalendar(user);
  const canCompleteContent = canCompleteDigitalCalendar(user);

  // Quick action state (approve / completed loading indicator per item & subIndex)
  const [actionLoadingKey, setActionLoadingKey] = useState(null);

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
      const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
      const validSubItems = subItems.filter(sub => {
        if (viewMode === 'calendar') return sub.overall_status !== 'Posted';
        if (viewMode === 'completed') return sub.overall_status === 'Posted';
        return true;
      });
      if (validSubItems.length > 0) {
        map[dateKey] = (map[dateKey] || 0) + validSubItems.length;
      }
    });
    return map;
  }, [items, viewMode]);

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

  // Dynamic Live Counts for Status Filters & Switcher Tabs
  const statusCounts = useMemo(() => {
    let total = 0;
    let scheduled = 0;
    let posted = 0;
    let inProgress = 0;
    let needsApproval = 0;

    items.forEach(it => {
      const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
      total += subItems.length;

      subItems.forEach(sub => {
        const st = sub.overall_status;
        if (st === 'Posted') {
          posted++;
        } else if (st === 'Scheduled') {
          scheduled++;
        } else if (['In Design', 'Draft', 'Planned', 'Pending', 'Pending Platforms'].includes(st)) {
          inProgress++;
        }
        if (sub.approval_status === 'Pending' || st === 'Needs Approval') {
          needsApproval++;
        }
      });
    });

    const remaining = total - posted;
    return { total, scheduled, posted, inProgress, needsApproval, remaining };
  }, [items]);

  // Platform posted counts for completed view toolbar
  const postedPlatformCounts = useMemo(() => {
    const counts = { instagram: 0, facebook: 0, youtube: 0, linkedin: 0, x: 0 };
    items.forEach(it => {
      const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
      subItems.forEach(sub => {
        if (sub.overall_status === 'Posted') {
          if (sub.instagram_status === 'Posted') counts.instagram++;
          if (sub.facebook_status === 'Posted') counts.facebook++;
          if (sub.youtube_status === 'Posted') counts.youtube++;
          if (sub.linkedin_status === 'Posted') counts.linkedin++;
          if (sub.x_status === 'Posted') counts.x++;
        }
      });
    });
    return counts;
  }, [items]);

  // Filtered Cards to display in Middle Area
  const filteredItems = useMemo(() => {
    let list = [...items];

    // Filter by viewMode:
    // 'calendar' keeps remaining (non-Posted) items;
    // 'completed' keeps posted (completed) items;
    // 'management' retains all items.
    if (viewMode === 'calendar') {
      list = list.filter(it => {
        const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
        return subItems.some(s => s.overall_status !== 'Posted');
      });
    } else if (viewMode === 'completed') {
      list = list.filter(it => {
        const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
        return subItems.some(s => s.overall_status === 'Posted');
      });
    }

    // Selected Date Filter from left mini calendar
    if (selectedDateFilter) {
      list = list.filter(it => {
        if (!it.content_date) return false;
        const d = new Date(it.content_date);
        const itDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return itDateStr === selectedDateFilter;
      });
    }

    // Status Filter Tabs (checks all sub-contents if present)
    if (filterStatus !== 'all') {
      list = list.filter(it => {
        const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
        if (filterStatus === 'scheduled') {
          return subItems.some(s => s.overall_status === 'Scheduled');
        } else if (filterStatus === 'posted') {
          return subItems.some(s => s.overall_status === 'Posted');
        } else if (filterStatus === 'in_progress') {
          return subItems.some(s => ['In Design', 'Draft', 'Planned', 'Pending', 'Pending Platforms'].includes(s.overall_status));
        } else if (filterStatus === 'needs_approval') {
          return subItems.some(s => s.approval_status === 'Pending' || s.overall_status === 'Needs Approval');
        }
        return true;
      });
    }

    // Content Type filter
    if (filterType !== 'all') {
      list = list.filter(it => {
        const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
        return subItems.some(s => s.content_type === filterType);
      });
    }

    // Platform filter
    if (filterPlatform !== 'all') {
      const p = filterPlatform.toLowerCase();
      list = list.filter(it => {
        const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
        return subItems.some(s => {
          if (p === 'instagram') return s.instagram_status && s.instagram_status !== 'Not Required';
          if (p === 'facebook') return s.facebook_status && s.facebook_status !== 'Not Required';
          if (p === 'youtube') return s.youtube_status && s.youtube_status !== 'Not Required';
          if (p === 'linkedin') return s.linkedin_status && s.linkedin_status !== 'Not Required';
          if (p === 'x' || p === 'twitter') return s.x_status && s.x_status !== 'Not Required';
          return true;
        });
      });
    }

    // Responsible Employee filter
    if (filterEmployee !== 'all') {
      list = list.filter(it => {
        const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
        return subItems.some(s => {
          const empId = s.responsible_employee?._id || s.responsible_employee;
          return String(empId) === String(filterEmployee);
        });
      });
    }

    // Client search fallback (supports searching across all sub-contents)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(it => {
        const subItems = (it.contents && it.contents.length > 0) ? it.contents : [it];
        return subItems.some(s =>
          (s.content_title || '').toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q) ||
          (s.responsible_employee_name || '').toLowerCase().includes(q) ||
          (s.responsible_employee?.name || '').toLowerCase().includes(q) ||
          (s.responsible_employee?.displayName || '').toLowerCase().includes(q) ||
          (s.content_type || '').toLowerCase().includes(q) ||
          (s.overall_status || '').toLowerCase().includes(q)
        );
      });
    }

    // Sort by content_date ascending
    return list.sort((a, b) => new Date(a.content_date) - new Date(b.content_date));
  }, [items, viewMode, selectedDateFilter, filterStatus, filterType, filterPlatform, filterEmployee, searchQuery]);

  // Open preview modal (read-only for completed & posted tasks)
  const handlePreviewClick = (item, initialActiveIndex = 0) => {
    if (!item?._id) return;
    setSelectedItemId(item._id);
    setPreviewItem({ ...item, initialActiveIndex });
  };

  // Open edit modal (redirects to preview if task is already completed & posted)
  const handleEditClick = (item, initialActiveIndex = 0) => {
    if (!item?._id) return;
    setSelectedItemId(item._id);
    const allContents = (item.contents && item.contents.length > 0) ? item.contents : [item];
    const target = allContents[initialActiveIndex] || allContents[0];
    if (target?.overall_status === 'Posted' || item?.overall_status === 'Posted') {
      handlePreviewClick(item, initialActiveIndex);
      return;
    }
    setEditingItem({ ...item, initialActiveIndex });
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

  // Direct approval action (Admin only)
  const handleDirectApprove = async (item, subIdx = 0, e) => {
    if (e) e.stopPropagation();
    if (!item?._id) return;
    const key = `${item._id}-${subIdx}-approve`;
    setActionLoadingKey(key);

    try {
      const res = await digitalCalendarAPI.approve(item._id, subIdx);
      if (res.data?.data) {
        setItems(prev => prev.map(it => (it._id === item._id ? res.data.data : it)));
      } else {
        // Fallback optimistic update
        setItems(prev => prev.map(it => {
          if (it._id !== item._id) return it;
          const updatedContents = (it.contents && it.contents.length > 0)
            ? it.contents.map((c, i) => i === subIdx ? { ...c, approval_status: 'Approved', overall_status: (c.overall_status === 'Needs Approval' || c.overall_status === 'Planned') ? 'Ready to Post' : c.overall_status } : c)
            : [];
          return {
            ...it,
            approval_status: 'Approved',
            overall_status: (it.overall_status === 'Needs Approval' || it.overall_status === 'Planned') ? 'Ready to Post' : it.overall_status,
            contents: updatedContents
          };
        }));
      }
    } catch (err) {
      console.error('Error approving content item:', err);
      alert(err.response?.data?.message || 'Failed to approve content');
      fetchData();
    } finally {
      setActionLoadingKey(null);
    }
  };

  // Helper to execute completion with optional updated times
  const executeComplete = async (item, subIdx = 0, timesToUpdate = null) => {
    if (!item?._id) return;
    const key = `${item._id}-${subIdx}-complete`;
    setActionLoadingKey(key);

    try {
      const res = await digitalCalendarAPI.complete(item._id, subIdx, timesToUpdate);
      if (res.data?.data) {
        setItems(prev => prev.map(it => (it._id === item._id ? res.data.data : it)));
      } else {
        // Fallback optimistic update
        setItems(prev => prev.map(it => {
          if (it._id !== item._id) return it;
          const updatedContents = (it.contents && it.contents.length > 0)
            ? it.contents.map((c, i) => {
                if (i !== subIdx) return c;
                const updated = {
                  ...c,
                  overall_status: 'Posted',
                  approval_status: 'Approved',
                  instagram_status: c.instagram_status && c.instagram_status !== 'Not Required' ? 'Posted' : c.instagram_status,
                  facebook_status: c.facebook_status && c.facebook_status !== 'Not Required' ? 'Posted' : c.facebook_status,
                  youtube_status: c.youtube_status && c.youtube_status !== 'Not Required' ? 'Posted' : c.youtube_status,
                  linkedin_status: c.linkedin_status && c.linkedin_status !== 'Not Required' ? 'Posted' : c.linkedin_status,
                  x_status: c.x_status && c.x_status !== 'Not Required' ? 'Posted' : c.x_status
                };
                if (timesToUpdate) {
                  ['instagram', 'facebook', 'youtube', 'linkedin', 'x'].forEach(pf => {
                    const t = timesToUpdate[`${pf}_time`] || timesToUpdate[pf];
                    if (t) updated[`${pf}_time`] = t;
                  });
                }
                return updated;
              })
            : [];
          return {
            ...it,
            overall_status: 'Posted',
            approval_status: 'Approved',
            contents: updatedContents
          };
        }));
      }
      setTimeUpdateModal(null);
    } catch (err) {
      console.error('Error marking content as completed:', err);
      alert(err.response?.data?.message || 'Failed to mark content as completed');
      fetchData();
    } finally {
      setActionLoadingKey(null);
    }
  };

  // Direct completed action (Marketing team member / Admin) -> checks if time is kept near social media status
  const handleDirectComplete = (item, subIdx = 0, e) => {
    if (e) e.stopPropagation();
    if (!item?._id) return;

    const allContents = (item.contents && item.contents.length > 0)
      ? item.contents
      : [item];
    const targetContent = allContents[subIdx] || allContents[0];

    const platformsToCheck = [
      {
        id: 'instagram',
        label: 'Instagram',
        icon: FaInstagram,
        color: 'text-pink-600',
        badgeBg: 'bg-pink-50/70',
        border: 'border-pink-200/80',
        iconBg: 'bg-pink-100/60'
      },
      {
        id: 'facebook',
        label: 'Facebook',
        icon: FaFacebook,
        color: 'text-blue-700',
        badgeBg: 'bg-blue-50/70',
        border: 'border-blue-200/80',
        iconBg: 'bg-blue-100/60'
      },
      {
        id: 'youtube',
        label: 'YouTube',
        icon: FaYoutube,
        color: 'text-red-600',
        badgeBg: 'bg-red-50/70',
        border: 'border-red-200/80',
        iconBg: 'bg-red-100/60'
      },
      {
        id: 'linkedin',
        label: 'LinkedIn',
        icon: FaLinkedinIn,
        color: 'text-blue-600',
        badgeBg: 'bg-blue-50/70',
        border: 'border-blue-200/80',
        iconBg: 'bg-blue-100/60'
      },
      {
        id: 'x',
        label: 'X / Twitter',
        icon: FaXTwitter,
        color: 'text-slate-900',
        badgeBg: 'bg-slate-100/70',
        border: 'border-slate-300/80',
        iconBg: 'bg-slate-200/60'
      }
    ];

    // Filter platforms that are active (status is NOT 'Not Required')
    const activePlatforms = platformsToCheck.filter(pf => {
      const st = targetContent[`${pf.id}_status`];
      return st && st !== 'Not Required';
    });

    // Check if any active platform is missing a posting time
    const missingTimePlatforms = activePlatforms.filter(pf => {
      const t = targetContent[`${pf.id}_time`];
      return !t || !String(t).trim();
    });

    // If time is not kept for any active platform, prompt to update time!
    if (activePlatforms.length > 0 && missingTimePlatforms.length > 0) {
      setTimeUpdateModal({
        item,
        subIdx,
        targetContent,
        activePlatforms,
        times: {
          instagram_time: targetContent.instagram_time || '',
          facebook_time: targetContent.facebook_time || '',
          youtube_time: targetContent.youtube_time || '',
          linkedin_time: targetContent.linkedin_time || '',
          x_time: targetContent.x_time || ''
        }
      });
      return;
    }

    // Otherwise all active platforms already have time kept -> complete directly
    executeComplete(item, subIdx);
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

      {/* ── 1. Page Header (All controls strictly in ONE ROW) ── */}
      <div
        className="rounded-3xl p-3 sm:p-4 mb-5 shadow-sm border border-slate-200/80 backdrop-blur-md relative z-30"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 249, 255, 0.90))',
          boxShadow: '0 8px 30px -4px rgba(2, 132, 199, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03)'
        }}
      >
        <div className="flex items-center justify-between gap-3 w-full flex-nowrap">
          {/* Left Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md relative shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #f97316 100%)',
                boxShadow: '0 6px 16px rgba(2, 132, 199, 0.3)'
              }}
            >
              <FaCalendarDays className="w-5 h-5" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-nowrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0 whitespace-nowrap">
                  Digital Calendar
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-orange-50 text-orange-600 border border-orange-200/80 shrink-0">
                  Info Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium m-0 truncate hidden 2xl:block">
                Plan, schedule, review & track social media content.
              </p>
            </div>
          </div>

          {/* Right Controls: STRICTLY ONE ROW (View Switcher + Calendar Navigator + Today + Refresh + Add Content) */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {/* 1. View Mode Switcher: Calendar Cards vs Table View vs Completed */}
            <div className="flex items-center p-0.5 sm:p-1 bg-slate-100/90 border border-slate-200 rounded-xl shadow-xs shrink-0 flex-nowrap">
              <button
                type="button"
                onClick={() => {
                  setViewMode('calendar');
                  setFilterStatus('all');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'calendar'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <FaCalendarDays className={`w-3.5 h-3.5 ${viewMode === 'calendar' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>Calendar Cards</span>
                {statusCounts.remaining > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    viewMode === 'calendar' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.remaining}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('management')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'management'
                    ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <FaTableList className={`w-3.5 h-3.5 ${viewMode === 'management' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>Table View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('completed');
                  setFilterStatus('all');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'completed'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <FaCircleCheck className={`w-3.5 h-3.5 ${viewMode === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Completed</span>
                {statusCounts.posted > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    viewMode === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.posted}
                  </span>
                )}
              </button>
            </div>

            {/* 2. Calendar Navigator with Interactive Dates & Days Dropdown */}
            <div className="relative shrink-0 z-40" ref={dateDropdownRef}>
              <div className="flex items-center bg-white border border-slate-200/90 hover:border-sky-300 rounded-xl shadow-xs px-1 py-1 shrink-0 transition">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition active:scale-95 cursor-pointer"
                >
                  <FaChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowDateDropdown(prev => !prev)}
                  title="Touch or click to select dates and days"
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer select-none ${
                    selectedDateFilter
                      ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-2xs font-bold'
                      : 'text-slate-800 hover:text-sky-600 hover:bg-slate-100'
                  }`}
                >
                  <FaCalendarDays className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="tracking-wide whitespace-nowrap">
                    {selectedDateFilter ? (
                      <>
                        {new Date(selectedDateFilter + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </>
                    ) : (
                      `${MONTH_NAMES[currentMonth].slice(0, 3)} ${currentYear}`
                    )}
                  </span>
                  <FaChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${showDateDropdown ? 'rotate-180 text-sky-600' : ''}`} />
                </button>

                {selectedDateFilter && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDateFilter(null);
                    }}
                    title="Clear date filter (Show all dates)"
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <FaXmark className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Next Month"
                  className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition active:scale-95 cursor-pointer"
                >
                  <FaChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dates & Days Dropdown Popover */}
              {showDateDropdown && (
                <div
                  className="absolute top-full mt-2 right-0 z-50 w-[320px] sm:w-[350px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(2, 132, 199, 0.1)'
                  }}
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                        <FaCalendarDays className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          {MONTH_NAMES[currentMonth]} {currentYear}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Dates & Days
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Previous Month"
                      >
                        <FaChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Next Month"
                      >
                        <FaChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDateDropdown(false)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer ml-1"
                        title="Close"
                      >
                        <FaXmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Weekday / Days Header Row */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 select-none">
                    {FULL_WEEK_DAYS.map(day => (
                      <span key={day} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1 bg-slate-50/90 rounded-md">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Dates & Days Interactive Grid Matrix */}
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
                      const dayOfWeekShort = dObj.fullDate.toLocaleDateString('en-US', { weekday: 'short' });

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
                              ? `${dayOfWeekShort}, ${dObj.dayNumber}: Holiday (${holidayNames.join(', ')}) • ${count} content item(s)`
                              : hasHoliday
                              ? `${dayOfWeekShort}, ${dObj.dayNumber}: Holiday (${holidayNames.join(', ')})`
                              : hasContent
                              ? `${dayOfWeekShort}, ${dObj.dayNumber}: ${count} content item(s)`
                              : `${dayOfWeekShort}, ${dObj.dayNumber} ${MONTH_NAMES[dObj.fullDate.getMonth()]}`
                          }
                          className={`mini-day-cell h-9 w-9 mx-auto rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer p-0.5 ${
                            isSelected
                              ? 'bg-sky-600 text-white font-bold shadow-md ring-2 ring-sky-400 scale-105'
                              : isTodayDate
                              ? 'bg-sky-50 text-sky-700 font-bold ring-2 ring-sky-500'
                              : dObj.isCurrentMonth
                              ? 'text-slate-700 hover:bg-sky-50 hover:text-sky-700'
                              : 'text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[11px] font-semibold leading-tight">{dObj.dayNumber}</span>
                          <span className={`text-[7.5px] font-medium leading-none uppercase ${
                            isSelected ? 'text-sky-100' : isTodayDate ? 'text-sky-600' : 'text-slate-400'
                          }`}>
                            {dayOfWeekShort}
                          </span>
                          {/* Dot indicators: Sky for content, Amber for holiday */}
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {hasHoliday && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} />}
                            {hasContent && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-sky-500'}`} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Popover Footer Bar with Quick Actions */}
                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        handleGoToToday();
                      }}
                      className="flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                    >
                      <FaClock className="w-3 h-3" />
                      <span>Today ({today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateFilter(null);
                      }}
                      className={`font-medium transition cursor-pointer text-xs ${
                        selectedDateFilter ? 'text-rose-600 hover:text-rose-800 font-semibold' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {selectedDateFilter ? 'Clear (Show All)' : 'All Month'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDateDropdown(false)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Today Jump Button */}
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 rounded-xl shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              Today
            </button>

            {/* 4. Refresh Button */}
            <button
              type="button"
              onClick={fetchData}
              title="Refresh Data"
              className="p-2 text-slate-600 bg-white border border-slate-200 hover:text-sky-600 hover:border-sky-400 hover:bg-sky-50/50 rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              <FaRotate className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            </button>

            {/* 5. Add Content CTA Button */}
            <button
              type="button"
              onClick={() => {
                setPrefilledDate(selectedDateFilter || new Date().toISOString().split('T')[0]);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 6px 16px rgba(249, 115, 22, 0.35)',
                border: '1px solid rgba(249, 115, 22, 0.4)'
              }}
            >
              <FaPlus className="w-3.5 h-3.5" />
              <span>Add Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Main Workspace: Calendar Cards & Completed Modes (Sidebar + Cards Feed) ─ */}
      {(viewMode === 'calendar' || viewMode === 'completed') ? (
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
                <span className="text-xs font-semibold text-slate-900 tracking-wide uppercase">
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
                  <span key={day} className="text-[10px] font-semibold text-slate-400 py-1">
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
                      className={`mini-day-cell h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-xs font-medium relative transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-md ring-2 ring-sky-500 scale-105'
                          : isTodayDate
                          ? 'bg-sky-50 text-sky-700 font-semibold ring-2 ring-sky-500'
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
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium px-1 select-none">
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
                    <span className="text-[11px] font-medium text-sky-700 truncate block">
                      Selected: {new Date(selectedDateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {holidaysByDate[selectedDateFilter]?.length > 0 && (
                      <span className="text-[10px] font-medium text-amber-700 truncate block">
                        🎉 {holidaysByDate[selectedDateFilter].map(h => h.summary || h.content_title).join(', ')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter(null)}
                    className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>



            {/* 2. Platform Filters (Interactive Sidebar Reference List) */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Platforms
                </span>
                {filterPlatform !== 'all' && (
                  <button
                    onClick={() => setFilterPlatform('all')}
                    className="text-[10px] text-sky-600 font-medium hover:underline cursor-pointer"
                  >
                    All
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {[
                  { id: 'all', label: 'All Platforms', icon: FaBorderAll, color: 'text-slate-600' },
                  { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-pink-600' },
                  { id: 'facebook', label: 'Facebook', icon: FaFacebook, color: 'text-blue-700' },
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
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
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Content Types
                </span>
                {filterType !== 'all' && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="text-[10px] text-sky-600 font-medium hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
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
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
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
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Marketing Team
                </span>
                {filterEmployee !== 'all' && (
                  <button
                    onClick={() => setFilterEmployee('all')}
                    className="text-[10px] text-sky-600 font-medium hover:underline cursor-pointer"
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
                            className="w-7 h-7 rounded-lg text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                          >
                            {(personName || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <span className="text-xs font-medium text-slate-800 block truncate">
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
              {/* Status Filter Tabs (Dynamic for Calendar Cards vs Completed View) */}
              {viewMode === 'completed' ? (
                <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-2xs overflow-x-auto gap-1">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white shadow-sm whitespace-nowrap">
                    <FaCircleCheck className="w-3.5 h-3.5" />
                    <span>Completed Tasks</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                      {statusCounts.posted}
                    </span>
                  </div>
                  {/* Quick platform filter pills for completed view */}
                  {[
                    { id: 'all', label: 'All', count: statusCounts.posted },
                    { id: 'instagram', label: 'Instagram', count: postedPlatformCounts.instagram, icon: FaInstagram, color: 'text-pink-600' },
                    { id: 'facebook', label: 'Facebook', count: postedPlatformCounts.facebook, icon: FaFacebook, color: 'text-blue-700' },
                    { id: 'youtube', label: 'YouTube', count: postedPlatformCounts.youtube, icon: FaYoutube, color: 'text-red-600' },
                    { id: 'linkedin', label: 'LinkedIn', count: postedPlatformCounts.linkedin, icon: FaLinkedinIn, color: 'text-blue-600' },
                    { id: 'x', label: 'X', count: postedPlatformCounts.x, icon: FaXTwitter, color: 'text-slate-900' }
                  ].map(pf => {
                    const isSel = filterPlatform === pf.id;
                    const PfIcon = pf.icon;
                    return (
                      <button
                        key={pf.id}
                        type="button"
                        onClick={() => setFilterPlatform(pf.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                          isSel
                            ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                      >
                        {PfIcon && <PfIcon className={`w-3 h-3 ${pf.color}`} />}
                        <span>{pf.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                          isSel ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {pf.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-2xs overflow-x-auto gap-1">
                  {/* 1. Remaining Items */}
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      filterStatus === 'all'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <FaLayerGroup className={`w-3.5 h-3.5 ${filterStatus === 'all' ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>All Active</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      filterStatus === 'all' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {statusCounts.remaining}
                    </span>
                  </button>

                  {/* 2. Scheduled */}
                  <button
                    type="button"
                    onClick={() => setFilterStatus('scheduled')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      filterStatus === 'scheduled'
                        ? 'bg-white text-sky-700 shadow-sm border border-sky-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <FaClock className={`w-3.5 h-3.5 ${filterStatus === 'scheduled' ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>Scheduled</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      filterStatus === 'scheduled' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {statusCounts.scheduled}
                    </span>
                  </button>

                  {/* 3. In Progress */}
                  <button
                    type="button"
                    onClick={() => setFilterStatus('in_progress')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      filterStatus === 'in_progress'
                        ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <FaPenToSquare className={`w-3.5 h-3.5 ${filterStatus === 'in_progress' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>In Progress</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      filterStatus === 'in_progress' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {statusCounts.inProgress}
                    </span>
                  </button>

                  {/* 4. Needs Approval */}
                  <button
                    type="button"
                    onClick={() => setFilterStatus('needs_approval')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                      filterStatus === 'needs_approval'
                        ? 'bg-white text-orange-700 shadow-sm border border-orange-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <FaHourglassHalf className={`w-3.5 h-3.5 ${filterStatus === 'needs_approval' ? 'text-orange-600' : 'text-slate-400'}`} />
                    <span>Needs Approval</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      filterStatus === 'needs_approval' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {statusCounts.needsApproval}
                    </span>
                  </button>
                </div>
              )}

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
                    className="px-3 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition whitespace-nowrap cursor-pointer"
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
                  <span className="text-xs font-semibold text-slate-900">
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-800">
                    {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                  </span>
                  {selectedDateFilter && holidaysByDate[selectedDateFilter]?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      🎉 {holidaysByDate[selectedDateFilter].map(h => h.summary || h.content_title).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(null)}
                  className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                >
                  Show All Dates
                </button>
              </div>
            )}

            {/* ── Content Cards Grid ── */}
            {loading ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <FaRotate className="w-6 h-6 animate-spin text-sky-600 mx-auto mb-3" />
                <span className="text-xs font-medium text-slate-500">Loading calendar items...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3 text-xl">
                  <FaCalendarDays />
                </div>
                <h3 className="text-base font-semibold text-slate-900 m-0">No Events Scheduled</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 mb-4">
                  There are no marketing schedules or events matching the selected date and filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPrefilledDate(selectedDateFilter || new Date().toISOString().split('T')[0]);
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  <FaPlus className="w-3 h-3" />
                  <span>Schedule Content Now</span>
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl ${
                  viewMode === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'
                }`}>
                  {viewMode === 'completed' ? <FaCircleCheck /> : <FaCalendarDays />}
                </div>
                <h3 className="text-base font-semibold text-slate-900 m-0">
                  {viewMode === 'completed' ? 'No Completed Tasks Yet' : 'No Active Tasks Scheduled'}
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 mb-4">
                  {viewMode === 'completed'
                    ? 'Tasks marked as completed by the marketing team will appear here.'
                    : 'There are no active marketing schedules matching your filters.'}
                </p>
                {viewMode === 'completed' ? (
                  <button
                    type="button"
                    onClick={() => setViewMode('calendar')}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition cursor-pointer"
                  >
                    <FaCalendarDays className="w-3 h-3" />
                    <span>View Calendar Cards</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPrefilledDate(selectedDateFilter || new Date().toISOString().split('T')[0]);
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition cursor-pointer"
                  >
                    <FaPlus className="w-3 h-3" />
                    <span>Schedule Content Now</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
                {/* Marketing Content Cards (Standardized uniform card sizes across completed & remaining tasks) */}
                {filteredItems.map(item => {
                  const rawContents = (item.contents && item.contents.length > 0)
                    ? item.contents.map((c, i) => ({ ...c, _originalIdx: i }))
                    : [{
                        _id: item._id,
                        content_title: item.content_title,
                        content_type: item.content_type,
                        responsible_employee: item.responsible_employee,
                        responsible_employee_name: item.responsible_employee_name,
                        approval_status: item.approval_status,
                        overall_status: item.overall_status,
                        live_folder_link: item.live_folder_link,
                        notes: item.notes,
                        instagram_status: item.instagram_status,
                        instagram_time: item.instagram_time,
                        facebook_status: item.facebook_status,
                        facebook_time: item.facebook_time,
                        youtube_status: item.youtube_status,
                        youtube_time: item.youtube_time,
                        linkedin_status: item.linkedin_status,
                        linkedin_time: item.linkedin_time,
                        x_status: item.x_status,
                        x_time: item.x_time,
                        _originalIdx: 0
                      }];

                  const allContents = rawContents.filter(sub => {
                    if (viewMode === 'calendar') return sub.overall_status !== 'Posted';
                    if (viewMode === 'completed') return sub.overall_status === 'Posted';
                    return true;
                  });

                  if (allContents.length === 0) return null;

                  const activeSubIdx = cardSubIndexMap[item._id] !== undefined
                    ? Math.min(cardSubIndexMap[item._id], allContents.length - 1)
                    : 0;
                  const currentItem = allContents[activeSubIdx] || allContents[0];
                  const targetOriginalIdx = currentItem?._originalIdx ?? 0;

                  const typeStyle = getTypeStyle(currentItem.content_type);
                  const statusStyle = getStatusStyle(currentItem.overall_status);
                  const approvalStyle = getApprovalBadge(currentItem.approval_status);

                  // Platforms List - Showing information for currently selected content
                  const platformList = [
                    {
                      name: 'Instagram',
                      icon: FaInstagram,
                      status: currentItem.instagram_status || 'Not Required',
                      time: currentItem.instagram_time,
                      color: 'text-pink-600',
                      badgeBg: 'bg-pink-50/70',
                      border: 'border-pink-200/80',
                      iconBg: 'bg-pink-100/60'
                    },
                    {
                      name: 'Facebook',
                      icon: FaFacebook,
                      status: currentItem.facebook_status || 'Not Required',
                      time: currentItem.facebook_time,
                      color: 'text-blue-700',
                      badgeBg: 'bg-blue-50/70',
                      border: 'border-blue-200/80',
                      iconBg: 'bg-blue-100/60'
                    },
                    {
                      name: 'YouTube',
                      icon: FaYoutube,
                      status: currentItem.youtube_status || 'Not Required',
                      time: currentItem.youtube_time,
                      color: 'text-red-600',
                      badgeBg: 'bg-red-50/70',
                      border: 'border-red-200/80',
                      iconBg: 'bg-red-100/60'
                    },
                    {
                      name: 'LinkedIn',
                      icon: FaLinkedinIn,
                      status: currentItem.linkedin_status || 'Not Required',
                      time: currentItem.linkedin_time,
                      color: 'text-blue-600',
                      badgeBg: 'bg-blue-50/70',
                      border: 'border-blue-200/80',
                      iconBg: 'bg-blue-100/60'
                    },
                    {
                      name: 'X / Twitter',
                      icon: FaXTwitter,
                      status: currentItem.x_status || 'Not Required',
                      time: currentItem.x_time,
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

                  const isCurrentItemPosted = currentItem.overall_status === 'Posted';

                  return (
                    <div
                      key={item._id}
                      onClick={() => (isCurrentItemPosted ? handlePreviewClick(item, targetOriginalIdx) : handleEditClick(item, targetOriginalIdx))}
                      className="content-card-elevated bg-white rounded-3xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col justify-between relative cursor-pointer group transition-all h-full min-h-[490px]"
                      style={{
                        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)'
                      }}
                    >
                      {/* Top Body Section */}
                      <div>
                        {/* 1. Header: Date Pill + Content Type Badge + Action Controls */}
                        <div className="flex items-center justify-between gap-1.5 mb-2.5 min-h-[28px]">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            {/* Content Type Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold tracking-wide border shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                            >
                              {currentItem.content_type}
                            </span>

                            {/* Date Pill */}
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-600 bg-slate-100/90 border border-slate-200/80 shrink-0">
                              <FaCalendarDays className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                              <span>{formattedItemDate}</span>
                              <span className="text-slate-400 font-normal">•</span>
                              <span className="text-slate-500">{item.day || new Date(item.content_date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            </span>
                          </div>

                          {/* Top Right Action Icons */}
                          <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                            {/* Quick Add Content to this Day */}
                            <button
                              type="button"
                              onClick={() => handleEditClick(item, (item.contents?.length || 1))}
                              title="Add another content to this day"
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                            >
                              <FaPlus className="w-3 h-3" />
                            </button>

                            {/* Edit or Preview Button */}
                            {isCurrentItemPosted ? (
                              <button
                                type="button"
                                onClick={() => handlePreviewClick(item, targetOriginalIdx)}
                                title="Preview content details (Completed & Posted)"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <FaEye className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleEditClick(item, targetOriginalIdx)}
                                title="Edit content"
                                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                              >
                                <FaPenToSquare className="w-3.5 h-3.5" />
                              </button>
                            )}

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

                        {/* 2. Multi-Content Switcher (if > 1 content in current view) */}
                        {allContents.length > 1 && (
                          <div
                            className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 mb-2.5 overflow-x-auto no-scrollbar shadow-3xs"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-semibold uppercase text-slate-500 pl-1.5 shrink-0 flex items-center gap-1">
                              <FaLayerGroup className="w-2.5 h-2.5 text-sky-600" />
                              <span>Contents:</span>
                            </span>
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              {allContents.map((sub, sIdx) => {
                                const isSel = activeSubIdx === sIdx;
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => setCardSubIndexMap(prev => ({ ...prev, [item._id]: sIdx }))}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold transition cursor-pointer shrink-0 ${
                                      isSel
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : 'bg-white hover:bg-slate-200/70 text-slate-700 border border-slate-200/60'
                                    }`}
                                  >
                                    <span>#{sIdx + 1}</span>
                                    <span className="truncate max-w-[65px]">{sub.content_type}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEditClick(item, (item.contents?.length || 1))}
                              title="Add another content to this day"
                              className="p-1 text-sky-600 hover:text-sky-800 hover:bg-white rounded-lg transition cursor-pointer shrink-0"
                            >
                              <FaPlus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {/* 3. Content Title (Guaranteed min-h-[40px] for consistent alignment) */}
                        <h4
                          title={currentItem.content_title}
                          className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug line-clamp-2 mt-0.5 mb-2 min-h-[40px] flex items-center"
                        >
                          {currentItem.content_title || 'Untitled Content'}
                        </h4>

                        {/* 4. Overall Status & Approval Badges (Guaranteed min-h-[26px]) */}
                        <div className="flex items-center flex-wrap gap-1.5 mb-2 min-h-[26px]">
                          {/* Overall Status Badge */}
                          <span
                            className="px-2 py-0.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shadow-2xs shrink-0"
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.text,
                              border: `1px solid ${statusStyle.border}`
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot }} />
                            <span>{currentItem.overall_status}</span>
                          </span>

                          {/* Approval Status */}
                          <span
                            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-2xs shrink-0"
                            style={{
                              background: approvalStyle.bg,
                              color: approvalStyle.text,
                              border: `1px solid ${approvalStyle.border}`
                            }}
                          >
                            <span>{approvalStyle.icon}</span>
                            <span>{approvalStyle.label}</span>
                          </span>
                        </div>

                        {/* 4b. Standardized Action / Completion Status Slot (Guaranteed uniform h-[34px] across all cards) */}
                        <div className="w-full h-[34px] flex items-center mb-2.5" onClick={e => e.stopPropagation()}>
                          {isCurrentItemPosted ? (
                            <div className="w-full h-full flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-300 shadow-2xs">
                              <FaCircleCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Completed & Posted</span>
                            </div>
                          ) : canApproveContent && currentItem.approval_status !== 'Approved' ? (
                            <button
                              type="button"
                              disabled={actionLoadingKey === `${item._id}-${targetOriginalIdx}-approve`}
                              onClick={(e) => handleDirectApprove(item, targetOriginalIdx, e)}
                              title="Directly approve content in admin panel"
                              className="w-full h-full flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer"
                            >
                              {actionLoadingKey === `${item._id}-${targetOriginalIdx}-approve` ? (
                                <FaRotate className="w-3 h-3 text-emerald-600 animate-spin" />
                              ) : (
                                <FaCheck className="w-3 h-3 text-emerald-600" />
                              )}
                              <span>Approve Content</span>
                            </button>
                          ) : canCompleteContent && currentItem.approval_status === 'Approved' ? (
                            <button
                              type="button"
                              disabled={actionLoadingKey === `${item._id}-${targetOriginalIdx}-complete`}
                              onClick={(e) => handleDirectComplete(item, targetOriginalIdx, e)}
                              title="Click to mark completed (turns content and social platforms into Posted)"
                              className="w-full h-full flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer"
                            >
                              {actionLoadingKey === `${item._id}-${targetOriginalIdx}-complete` ? (
                                <FaRotate className="w-3 h-3 text-sky-600 animate-spin" />
                              ) : (
                                <FaCircleCheck className="w-3 h-3 text-sky-600" />
                              )}
                              <span>Mark Completed</span>
                            </button>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200/80">
                              <FaClock className="w-3 h-3 text-slate-400" />
                              <span>{currentItem.approval_status === 'Pending' ? 'Waiting for Approval' : currentItem.overall_status || 'In Progress'}</span>
                            </div>
                          )}
                        </div>

                        {/* 5. Notes / Description (Uniform h-[36px] on every card) */}
                        <AutoScrollNotes text={currentItem.notes} />

                        {/* 6. Platform Breakdown & Posting Times (Standardized h-[48px] per platform cell) */}
                        <div className="space-y-1.5 mb-3">
                          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
                            Social Media Platforms & Times
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {platformList.map((pf, pIdx) => {
                              const PfIcon = pf.icon;
                              const isOff = pf.status === 'Not Required' || !pf.status;
                              const pfSt = getStatusStyle(pf.status);
                              const isLastOdd = pIdx === 4; // 5th item (X / Twitter) spans 2 columns to fill row
                              const pfDisplayTime = pf.time || (pf.status === 'Posted' && (currentItem?.updatedAt || item?.updatedAt) ? formatTime12h(currentItem?.updatedAt || item?.updatedAt) : '');

                              return (
                                <div
                                  key={pIdx}
                                  className={`h-[48px] p-1.5 rounded-xl border flex flex-col justify-between gap-0.5 transition-all shadow-3xs ${
                                    isLastOdd ? 'col-span-2' : ''
                                  } ${
                                    isOff
                                      ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                                      : `${pf.badgeBg} ${pf.border}`
                                  }`}
                                >
                                  {/* Top: Icon + Full Name */}
                                  <div className="flex items-center gap-1.5 w-full min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                        isOff ? 'bg-slate-100 text-slate-400' : `${pf.iconBg} ${pf.color}`
                                      }`}
                                    >
                                      <PfIcon className="w-2.5 h-2.5" />
                                    </div>
                                    <span
                                      title={pf.name}
                                      className={`text-[11px] font-medium leading-tight truncate ${
                                        isOff ? 'text-slate-400' : 'text-slate-800'
                                      }`}
                                    >
                                      {pf.name}
                                    </span>
                                  </div>

                                  {/* Bottom: Status Tag + Time (Guaranteed h-[18px]) */}
                                  <div className="h-[18px] flex items-center justify-between gap-1 w-full pt-0.5 border-t border-slate-100/70 min-w-0">
                                    <span
                                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md inline-block shadow-3xs truncate max-w-[80px]"
                                      style={{
                                        background: isOff ? '#f1f5f9' : pfSt.bg,
                                        color: isOff ? '#94a3b8' : pfSt.text,
                                        border: `1px solid ${isOff ? '#e2e8f0' : pfSt.border}`
                                      }}
                                    >
                                      {isOff ? 'Not Req' : pf.status}
                                    </span>
                                    {pfDisplayTime && !isOff ? (
                                      <span className="text-[8.5px] text-slate-500 font-medium shrink-0 ml-1 flex items-center gap-0.5">
                                        <FaClock className="w-2 h-2 text-slate-400" />
                                        {formatTime12h(pfDisplayTime)}
                                      </span>
                                    ) : (
                                      <span className="text-[8.5px] text-slate-300 font-medium shrink-0 select-none">
                                        --:--
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 7. Card Footer: Responsible Person + Drive Link (Pinned at bottom with uniform h-[44px]) */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto h-[44px]">
                        {/* Responsible Member */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {currentItem.responsible_employee?.avatar ? (
                            <img
                              src={currentItem.responsible_employee.avatar}
                              alt={currentItem.responsible_employee?.name || currentItem.responsible_employee_name || 'M'}
                              className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded-lg text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                            >
                              {(currentItem.responsible_employee?.name || currentItem.responsible_employee_name || 'M')
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 truncate">
                            <span
                              title={currentItem.responsible_employee?.actualName || currentItem.responsible_employee?.name || currentItem.responsible_employee_name || 'Unassigned'}
                              className="text-xs font-medium text-slate-800 block truncate"
                            >
                              {currentItem.responsible_employee?.actualName ||
                                currentItem.responsible_employee?.name ||
                                currentItem.responsible_employee_name ||
                                'Unassigned'}
                            </span>
                            {(currentItem.responsible_employee?.displayName || currentItem.responsible_employee?.designation) && (
                              <span
                                title={currentItem.responsible_employee?.displayName || currentItem.responsible_employee?.designation}
                                className="text-[10px] text-slate-500 font-medium block truncate"
                              >
                                {currentItem.responsible_employee?.displayName || currentItem.responsible_employee?.designation}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Live Drive Link (if provided) */}
                        {currentItem.live_folder_link && (
                          <a
                            href={currentItem.live_folder_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="px-2 py-1 text-[11px] font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition flex items-center gap-1 shrink-0"
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
            <span className="text-base font-semibold text-slate-900 tracking-tight">
              All Marketing Content Items ({statusCounts.total})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Topic / Content Title</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-3">Day</th>
                  <th className="py-3.5 px-3">Instagram</th>
                  <th className="py-3.5 px-3">Facebook</th>
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
                {items.flatMap(item => {
                  const allContents = (item.contents && item.contents.length > 0)
                    ? item.contents
                    : [item];
                  return allContents.map((sub, sIdx) => ({
                    parentItem: item,
                    sub,
                    sIdx,
                    totalSubs: allContents.length,
                    rowKey: `${item._id}-${sIdx}`
                  }));
                }).map(({ parentItem, sub, sIdx, totalSubs, rowKey }) => {
                  const t = getTypeStyle(sub.content_type);
                  const st = getStatusStyle(sub.overall_status);
                  const app = getApprovalBadge(sub.approval_status);

                  return (
                    <tr
                      key={rowKey}
                      onClick={() => (sub.overall_status === 'Posted' ? handlePreviewClick(parentItem, sIdx) : handleEditClick(parentItem, sIdx))}
                      className="hover:bg-sky-50/40 transition cursor-pointer"
                    >
                      {/* Title */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[220px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {totalSubs > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
                              #{sIdx + 1} of {totalSubs}
                            </span>
                          )}
                          <span className="truncate">{sub.content_title}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${t.bg} ${t.text} border ${t.border}`}>
                          {sub.content_type}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-slate-700">
                        {new Date(parentItem.content_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Day */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-semibold">
                        {parentItem.day || new Date(parentItem.content_date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>

                      {/* Instagram */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {sub.instagram_status && sub.instagram_status !== 'Not Required' ? (
                          <div>
                            <span className="font-medium text-pink-600">{sub.instagram_status}</span>
                            {(sub.instagram_time || (sub.instagram_status === 'Posted' && item.updatedAt)) && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatTime12h(sub.instagram_time || item.updatedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>

                      {/* Facebook */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {sub.facebook_status && sub.facebook_status !== 'Not Required' ? (
                          <div>
                            <span className="font-medium text-blue-700">{sub.facebook_status}</span>
                            {(sub.facebook_time || (sub.facebook_status === 'Posted' && item.updatedAt)) && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatTime12h(sub.facebook_time || item.updatedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>

                      {/* YouTube */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {sub.youtube_status && sub.youtube_status !== 'Not Required' ? (
                          <div>
                            <span className="font-medium text-red-600">{sub.youtube_status}</span>
                            {(sub.youtube_time || (sub.youtube_status === 'Posted' && item.updatedAt)) && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatTime12h(sub.youtube_time || item.updatedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>

                      {/* LinkedIn */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {sub.linkedin_status && sub.linkedin_status !== 'Not Required' ? (
                          <div>
                            <span className="font-medium text-blue-600">{sub.linkedin_status}</span>
                            {(sub.linkedin_time || (sub.linkedin_status === 'Posted' && item.updatedAt)) && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatTime12h(sub.linkedin_time || item.updatedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>

                      {/* X / Twitter */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {sub.x_status && sub.x_status !== 'Not Required' ? (
                          <div>
                            <span className="font-medium text-slate-900">{sub.x_status}</span>
                            {(sub.x_time || (sub.x_status === 'Posted' && item.updatedAt)) && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatTime12h(sub.x_time || item.updatedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                          >
                            {sub.overall_status}
                          </span>
                          {canCompleteContent && sub.approval_status === 'Approved' && sub.overall_status !== 'Posted' && (
                            <button
                              type="button"
                              disabled={actionLoadingKey === `${parentItem._id}-${sIdx}-complete`}
                              onClick={(e) => handleDirectComplete(parentItem, sIdx, e)}
                              title="Mark as completed (Turns into Posted)"
                              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 transition active:scale-95 cursor-pointer shadow-3xs flex items-center gap-1 whitespace-nowrap"
                            >
                              {actionLoadingKey === `${parentItem._id}-${sIdx}-complete` ? (
                                <FaRotate className="w-2.5 h-2.5 text-sky-600 animate-spin" />
                              ) : (
                                <FaCircleCheck className="w-2.5 h-2.5 text-sky-600" />
                              )}
                              <span>Complete</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Responsible Person: Name + Display Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {sub.responsible_employee?.actualName ||
                            sub.responsible_employee?.name ||
                            sub.responsible_employee_name ||
                            'Unassigned'}
                        </div>
                        {(sub.responsible_employee?.displayName || sub.responsible_employee?.designation) && (
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {sub.responsible_employee?.displayName || sub.responsible_employee?.designation}
                          </div>
                        )}
                      </td>

                      {/* Approval */}
                      <td className="py-3.5 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium"
                            style={{ background: app.bg, color: app.text, border: `1px solid ${app.border}` }}
                          >
                            {app.icon} {app.label}
                          </span>
                          {canApproveContent && sub.approval_status !== 'Approved' && (
                            <button
                              type="button"
                              disabled={actionLoadingKey === `${parentItem._id}-${sIdx}-approve`}
                              onClick={(e) => handleDirectApprove(parentItem, sIdx, e)}
                              title="Directly approve content as Admin"
                              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition active:scale-95 cursor-pointer shadow-3xs flex items-center gap-1 whitespace-nowrap"
                            >
                              {actionLoadingKey === `${parentItem._id}-${sIdx}-approve` ? (
                                <FaRotate className="w-2.5 h-2.5 text-emerald-600 animate-spin" />
                              ) : (
                                <FaCheck className="w-2.5 h-2.5 text-emerald-600" />
                              )}
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {sub.overall_status === 'Posted' ? (
                            <button
                              type="button"
                              onClick={() => handlePreviewClick(parentItem, sIdx)}
                              title="Preview content details (Completed & Posted)"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            >
                              <FaEye className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditClick(parentItem, sIdx)}
                              title="Edit this item"
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            >
                              <FaPenToSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeleteContent && (
                            <button
                              onClick={() => handleDeleteClick(parentItem)}
                              title="Delete content card"
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
                    <td colSpan={12} className="text-center py-12 text-slate-500 font-medium">
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
          canDeleteContent={canDeleteContent}
          canApproveContent={canApproveContent}
          canCompleteContent={canCompleteContent}
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

      {/* ── 6. Delete Confirmation Modal (Strictly Admin only) ─────────────────── */}
      {showDeleteModal && editingItem && canDeleteContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <FaTriangleExclamation className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 m-0">Confirm Deletion</h3>
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
                className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
              >
                Delete Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Update Social Media Posting Time Modal (When marking Completed) ──── */}
      {timeUpdateModal && (
        <UpdateTimeModal
          modalData={timeUpdateModal}
          isLoading={actionLoadingKey === `${timeUpdateModal.item?._id}-${timeUpdateModal.subIdx}-complete`}
          onClose={() => setTimeUpdateModal(null)}
          onOpenFullEdit={() => {
            const it = timeUpdateModal.item;
            const idx = timeUpdateModal.subIdx;
            setTimeUpdateModal(null);
            handleEditClick(it, idx);
          }}
          onConfirm={(updatedTimes) => {
            executeComplete(timeUpdateModal.item, timeUpdateModal.subIdx, updatedTimes);
          }}
        />
      )}

      {/* ── 8. Content Preview Modal (Read-Only when Completed & Posted) ──────── */}
      {previewItem && (
        <ContentPreviewModal
          item={previewItem}
          initialActiveIndex={previewItem.initialActiveIndex || 0}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

// ── Platform Time Input with Instant Click-to-Open Time Picker ────────────────
function PlatformTimeInput({
  value,
  onChange,
  focusBorderClass = 'focus:border-sky-500',
  textColorClass = 'text-sky-600'
}) {
  const inputRef = useRef(null);

  const openPicker = () => {
    if (inputRef.current) {
      try {
        if (typeof inputRef.current.showPicker === 'function') {
          inputRef.current.showPicker();
        } else {
          inputRef.current.focus();
        }
      } catch (err) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative group cursor-pointer" onClick={openPicker}>
      <input
        ref={inputRef}
        type="time"
        value={to24HourTime(value)}
        onChange={e => {
          const val = e.target.value;
          onChange(val ? formatTime12h(val) : '');
        }}
        onClick={e => {
          try {
            if (typeof e.currentTarget.showPicker === 'function') {
              e.currentTarget.showPicker();
            }
          } catch (err) {}
        }}
        onFocus={e => {
          try {
            if (typeof e.currentTarget.showPicker === 'function') {
              e.currentTarget.showPicker();
            }
          } catch (err) {}
        }}
        className={`w-full px-2 py-1.5 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:outline-none ${focusBorderClass} font-medium cursor-pointer transition-colors shadow-2xs`}
        style={{ colorScheme: 'light' }}
      />
      {value && (
        <span className={`text-[9.5px] ${textColorClass} font-medium block mt-0.5 truncate`}>
          {formatTime12h(value)}
        </span>
      )}
    </div>
  );
}

// ── Update Social Media Posting Time Modal (When marketing team clicks Completed) ──
function UpdateTimeModal({ modalData, isLoading, onClose, onOpenFullEdit, onConfirm }) {
  const { item, targetContent, activePlatforms = [] } = modalData;

  const getCurrentTimeFormatted = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const [times, setTimes] = useState(() => {
    const defaultTime = getCurrentTimeFormatted();
    return {
      instagram_time: targetContent?.instagram_time || defaultTime,
      facebook_time: targetContent?.facebook_time || defaultTime,
      youtube_time: targetContent?.youtube_time || defaultTime,
      linkedin_time: targetContent?.linkedin_time || defaultTime,
      x_time: targetContent?.x_time || defaultTime
    };
  });

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Identify which active platforms are still missing time
  const missingPlatforms = activePlatforms.filter(pf => {
    const t = times[`${pf.id}_time`];
    return !t || !String(t).trim();
  });

  const allFilled = missingPlatforms.length === 0;

  const handleTimeChange = (platformId, val) => {
    setTimes(prev => ({
      ...prev,
      [`${platformId}_time`]: val
    }));
  };

  const handleApplyToAllActive = (val) => {
    if (!val) return;
    const formatted = formatTime12h(val);
    setTimes(prev => {
      const next = { ...prev };
      activePlatforms.forEach(pf => {
        next[`${pf.id}_time`] = formatted;
      });
      return next;
    });
  };

  const handleApplyCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const str = `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
    handleApplyToAllActive(str);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setHasAttemptedSubmit(true);
    if (!allFilled) return;
    onConfirm(times);
  };

  const formattedItemDate = item?.content_date
    ? new Date(item.content_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const itemDay = item?.day || (item?.content_date ? new Date(item.content_date).toLocaleDateString('en-US', { weekday: 'short' }) : '');

  const empName =
    targetContent?.responsible_employee?.actualName ||
    targetContent?.responsible_employee?.name ||
    targetContent?.responsible_employee_name ||
    'Unassigned';

  const empAvatar = targetContent?.responsible_employee?.avatar;
  const empInitial = (empName.charAt(0) || 'M').toUpperCase();

  const typeStyle = getTypeStyle(targetContent?.content_type);

  // Platforms marked as Not Required (for clarity)
  const allPlatforms = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'x', label: 'X / Twitter' }
  ];
  const notRequiredPlatforms = allPlatforms.filter(
    p => !activePlatforms.some(ap => ap.id === p.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 my-6 overflow-hidden relative"
        style={{
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)'
        }}
      >
        {/* 1. Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/80 via-white to-amber-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs shrink-0">
              <FaClock className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0 leading-tight">
                Update Social Media Posting Times
              </h3>
              <p className="text-[11px] text-slate-500 font-medium m-0 mt-0.5">
                Time is required near social media status to complete this content
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Content Summary Card */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold tracking-wide border shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
              >
                {targetContent?.content_type}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-600 bg-white border border-slate-200/80">
                <FaCalendarDays className="w-2.5 h-2.5 text-sky-600" />
                <span>{formattedItemDate}</span>
                {itemDay && (
                  <>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-slate-500">{itemDay}</span>
                  </>
                )}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 m-0">
              {targetContent?.content_title || 'Untitled Content'}
            </h4>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-xs text-slate-600">
              {empAvatar ? (
                <img
                  src={empAvatar}
                  alt={empName}
                  className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full text-white font-semibold text-[10px] flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                >
                  {empInitial}
                </div>
              )}
              <span className="truncate font-medium">{empName}</span>
            </div>
          </div>

          {/* Alert / Prompt Notification */}
          <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-200/90 flex items-start gap-2.5">
            <FaTriangleExclamation className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              Posting time is missing near social media status for {missingPlatforms.length} active platform(s).
              Please update the time below. Once all active times are kept, you can click on Complete.
            </div>
          </div>

          {/* Quick Time Presets Bar */}
          <div className="p-3 bg-sky-50/60 rounded-2xl border border-sky-100 space-y-2">
            <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-sky-900">
              <span className="flex items-center gap-1">
                <FaClock className="w-3 h-3 text-sky-600" />
                <span>Quick Time Presets:</span>
              </span>
              <button
                type="button"
                onClick={handleApplyCurrentTime}
                className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>⏰ Use Current Time</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyToAllActive(preset)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white hover:bg-sky-100/70 text-slate-700 border border-sky-200 shadow-3xs transition cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Active Platforms Time Fields */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <span>Active Social Media Platforms ({activePlatforms.length})</span>
              <span className="text-[11px] text-slate-400 lowercase font-normal">
                {allFilled ? 'All times kept' : `${missingPlatforms.length} missing`}
              </span>
            </div>

            <div className="space-y-2">
              {activePlatforms.map(pf => {
                const PfIcon = pf.icon;
                const currentTime = times[`${pf.id}_time`];
                const isSet = Boolean(currentTime && currentTime.trim());
                const currentStatus = targetContent[`${pf.id}_status`] || 'Planned';
                const st = getStatusStyle(currentStatus);

                return (
                  <div
                    key={pf.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-3xs ${
                      isSet
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : 'bg-white border-amber-300 ring-2 ring-amber-100/70'
                    }`}
                  >
                    {/* Platform Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${pf.iconBg} ${pf.color}`}
                      >
                        <PfIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 leading-tight">
                          {pf.label}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded-md inline-block shadow-3xs"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                          >
                            {currentStatus}
                          </span>
                          {isSet ? (
                            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                              <FaCircleCheck className="w-2.5 h-2.5" />
                              <span>Time kept</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5 animate-pulse">
                              <FaTriangleExclamation className="w-2.5 h-2.5" />
                              <span>Time required</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Input with native picker & instant click */}
                    <div className="w-36 shrink-0">
                      <PlatformTimeInput
                        value={currentTime}
                        onChange={val => handleTimeChange(pf.id, val)}
                        focusBorderClass={isSet ? 'focus:border-emerald-500' : 'focus:border-amber-500'}
                        textColorClass={isSet ? 'text-emerald-700' : 'text-amber-700'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inactive / Not Required Note */}
            {notRequiredPlatforms.length > 0 && (
              <p className="text-[11px] text-slate-400 font-medium m-0 pt-1 flex items-center gap-1">
                <FaCircleInfo className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  {notRequiredPlatforms.map(p => p.label).join(', ')} marked as Not Required (no time needed).
                </span>
              </p>
            )}
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
          {(!allFilled || hasAttemptedSubmit) && !allFilled && (
            <div className="text-[11px] font-semibold text-amber-700 text-center bg-amber-100/60 py-1.5 px-3 rounded-xl border border-amber-200">
              ⚠️ Please update posting time for:{' '}
              {missingPlatforms.map(p => p.label).join(', ')} to enable Complete.
            </div>
          )}

          <div className="flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 border border-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {onOpenFullEdit && (
                <button
                  type="button"
                  onClick={onOpenFullEdit}
                  disabled={isLoading}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-sky-700 hover:bg-sky-100 border border-sky-200 transition cursor-pointer"
                >
                  Open Full Editor
                </button>
              )}

              <button
                type="button"
                disabled={!allFilled || isLoading}
                onClick={handleSubmit}
                title={!allFilled ? 'Update time for all active platforms to complete' : 'Click to complete and mark as posted'}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 shadow-xs ${
                  !allFilled || isLoading
                    ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-md hover:shadow-lg cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <>
                    <FaRotate className="w-3 h-3 animate-spin" />
                    <span>Updating & Completing...</span>
                  </>
                ) : (
                  <>
                    <FaCircleCheck className="w-3.5 h-3.5" />
                    <span>✓ Complete & Mark as Posted</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Content Preview Modal (Read-Only Preview for Completed & Posted Tasks) ───
function ContentPreviewModal({ item, initialActiveIndex = 0, onClose }) {
  const allContents = (item?.contents && item.contents.length > 0)
    ? item.contents
    : [item];

  const [activeSubIdx, setActiveSubIdx] = useState(() =>
    Math.min(initialActiveIndex || 0, allContents.length - 1)
  );

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);

  const currentSub = allContents[activeSubIdx] || allContents[0];

  const formattedDate = item?.content_date
    ? new Date(item.content_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const itemDay = item?.day || (item?.content_date ? new Date(item.content_date).toLocaleDateString('en-US', { weekday: 'short' }) : '');

  const typeStyle = getTypeStyle(currentSub?.content_type);
  const statusStyle = getStatusStyle(currentSub?.overall_status || 'Posted');
  const approvalStyle = getApprovalBadge(currentSub?.approval_status || 'Approved');

  const empName =
    currentSub?.responsible_employee?.actualName ||
    currentSub?.responsible_employee?.name ||
    currentSub?.responsible_employee?.displayName ||
    currentSub?.responsible_employee_name ||
    'Unassigned';

  const empAvatar = currentSub?.responsible_employee?.avatar;
  const empEmail = currentSub?.responsible_employee?.email;
  const empDesignation = currentSub?.responsible_employee?.designation || 'Marketing Team';
  const empInitial = (empName.charAt(0) || 'M').toUpperCase();

  const platformList = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: FaInstagram,
      status: currentSub?.instagram_status || 'Not Required',
      time: currentSub?.instagram_time,
      color: 'text-pink-600',
      badgeBg: 'bg-pink-50/70',
      border: 'border-pink-200/80',
      iconBg: 'bg-pink-100/60'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: FaFacebook,
      status: currentSub?.facebook_status || 'Not Required',
      time: currentSub?.facebook_time,
      color: 'text-blue-700',
      badgeBg: 'bg-blue-50/70',
      border: 'border-blue-200/80',
      iconBg: 'bg-blue-100/60'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: FaYoutube,
      status: currentSub?.youtube_status || 'Not Required',
      time: currentSub?.youtube_time,
      color: 'text-red-600',
      badgeBg: 'bg-red-50/70',
      border: 'border-red-200/80',
      iconBg: 'bg-red-100/60'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: FaLinkedinIn,
      status: currentSub?.linkedin_status || 'Not Required',
      time: currentSub?.linkedin_time,
      color: 'text-blue-600',
      badgeBg: 'bg-blue-50/70',
      border: 'border-blue-200/80',
      iconBg: 'bg-blue-100/60'
    },
    {
      id: 'x',
      name: 'X / Twitter',
      icon: FaXTwitter,
      status: currentSub?.x_status || 'Not Required',
      time: currentSub?.x_time,
      color: 'text-slate-900',
      badgeBg: 'bg-slate-100/70',
      border: 'border-slate-300/80',
      iconBg: 'bg-slate-200/60'
    }
  ];

  const handleCopyLink = () => {
    if (currentSub?.live_folder_link) {
      navigator.clipboard.writeText(currentSub.live_folder_link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyNotes = () => {
    if (currentSub?.notes) {
      navigator.clipboard.writeText(currentSub.notes);
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 my-6 overflow-hidden relative flex flex-col"
        style={{
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)'
        }}
      >
        {/* 1. Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <FaEye className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 m-0 leading-tight">
                  Content Preview
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 border border-emerald-300 flex items-center gap-1">
                  <FaCircleCheck className="w-2.5 h-2.5" />
                  <span>Completed & Posted</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium m-0 mt-0.5">
                Read-only details • This task has been finalized and published
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Multi-Content Switcher (if > 1 content on this day) */}
        {allContents.length > 1 && (
          <div className="px-6 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-semibold uppercase text-slate-500 flex items-center gap-1 shrink-0">
              <FaLayerGroup className="w-2.5 h-2.5 text-sky-600" />
              <span>Contents:</span>
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              {allContents.map((sub, sIdx) => {
                const isSel = activeSubIdx === sIdx;
                const isSubPosted = sub.overall_status === 'Posted';
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setActiveSubIdx(sIdx)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                      isSel
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    <span>#{sIdx + 1}</span>
                    <span className="truncate max-w-[80px]">{sub.content_type}</span>
                    {isSubPosted && <span className="text-[9px] text-emerald-300 font-normal">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Modal Body: Read-only Presentation */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Read-Only Status Banner */}
          <div className="p-3 bg-emerald-50/90 rounded-2xl border border-emerald-200/90 flex items-start gap-2.5">
            <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed font-medium">
              This task is <strong>Completed & Posted</strong>. All details below are published and locked to prevent accidental changes.
            </div>
          </div>

          {/* Title & Metadata Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Content Type Pill */}
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold tracking-wide border shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
              >
                {currentSub?.content_type}
              </span>

              {/* Date Pill */}
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200">
                <FaCalendarDays className="w-3 h-3 text-sky-600 shrink-0" />
                <span>{formattedDate}</span>
                {itemDay && (
                  <>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-slate-600 font-medium">{itemDay}</span>
                  </>
                )}
              </span>

              {/* Overall Status */}
              <span
                className="px-2.5 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-3xs"
                style={{
                  background: statusStyle.bg,
                  color: statusStyle.text,
                  border: `1px solid ${statusStyle.border}`
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot }} />
                <span>{currentSub?.overall_status || 'Posted'}</span>
              </span>

              {/* Approval Status */}
              <span
                className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-3xs"
                style={{
                  background: approvalStyle.bg,
                  color: approvalStyle.text,
                  border: `1px solid ${approvalStyle.border}`
                }}
              >
                <span>{approvalStyle.icon}</span>
                <span>{approvalStyle.label}</span>
              </span>
            </div>

            {/* Content Title */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug m-0 pt-1">
              {currentSub?.content_title || 'Untitled Content'}
            </h2>
          </div>

          {/* Responsible Marketing Executive */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {empAvatar ? (
                <img
                  src={empAvatar}
                  alt={empName}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-3xs shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-3xs"
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                >
                  {empInitial}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Responsible Executive
                </span>
                <div className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                  {empName}
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  {empDesignation} {empEmail ? `• ${empEmail}` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Platforms & Posting Times */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              Social Media Platforms & Posting Times
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {platformList.map((pf, pIdx) => {
                const PfIcon = pf.icon;
                const isOff = pf.status === 'Not Required' || !pf.status;
                const isLastOdd = pIdx === 4; // X spans 2 cols on tablet/desktop
                const fallbackTime = (pf.status === 'Posted' && (currentSub?.updatedAt || item?.updatedAt))
                  ? formatTime12h(currentSub?.updatedAt || item?.updatedAt)
                  : '';
                const displayTime = pf.time || fallbackTime;

                return (
                  <div
                    key={pIdx}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-all shadow-3xs ${
                      isLastOdd ? 'sm:col-span-2' : ''
                    } ${
                      isOff
                        ? 'bg-slate-50/60 border-slate-200/60 opacity-60'
                        : `${pf.badgeBg} ${pf.border}`
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isOff ? 'bg-slate-100 text-slate-400' : `${pf.iconBg} ${pf.color}`
                        }`}
                      >
                        <PfIcon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isOff ? 'text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {pf.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isOff
                            ? 'bg-slate-100 text-slate-400 border border-slate-200'
                            : 'bg-emerald-100/80 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {isOff ? 'Not Required' : `✓ ${pf.status}`}
                      </span>
                      {displayTime && !isOff && (
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 flex items-center gap-1 shadow-3xs">
                          <FaClock className="w-2.5 h-2.5 text-sky-600" />
                          <span>{formatTime12h(displayTime)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Google Drive / Asset Folder Link */}
          {currentSub?.live_folder_link && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Google Drive / Assets Folder
              </span>
              <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FaLink className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-xs text-sky-800 font-medium truncate">
                    {currentSub.live_folder_link}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white hover:bg-sky-100 text-sky-700 border border-sky-200 transition cursor-pointer"
                  >
                    {copiedLink ? '✓ Copied' : 'Copy'}
                  </button>
                  <a
                    href={currentSub.live_folder_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-3xs transition cursor-pointer"
                  >
                    <span>Open Link</span>
                    <FaArrowUpRightFromSquare className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Notes / Description / Caption */}
          {currentSub?.notes && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Notes & Captions
                </span>
                <button
                  type="button"
                  onClick={handleCopyNotes}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                >
                  {copiedNotes ? '✓ Caption Copied' : 'Copy Text'}
                </button>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium max-h-36 overflow-y-auto">
                {currentSub.notes}
              </div>
            </div>
          )}
        </div>

        {/* 4. Modal Footer: Locked notice + Close button ONLY */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <span className="text-slate-400">🔒</span>
            <span>Completed & Posted content cannot be edited</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 shadow-sm transition active:scale-95 cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Content Form Modal Component ──────────────────────────────────────────────
function ContentFormModal({ isEdit, initialData, employees, canDeleteContent, canApproveContent, canCompleteContent, onClose, onSuccess }) {
  const createEmptyContent = (empId = null, empName = '') => ({
    _id: null,
    content_title: '',
    content_type: 'Post',
    responsible_employee: empId,
    responsible_employee_name: empName,
    approval_status: 'Pending',
    overall_status: 'Planned',
    live_folder_link: '',
    notes: '',
    instagram_status: 'Not Required',
    instagram_time: '',
    facebook_status: 'Not Required',
    facebook_time: '',
    youtube_status: 'Not Required',
    youtube_time: '',
    linkedin_status: 'Not Required',
    linkedin_time: '',
    x_status: 'Not Required',
    x_time: ''
  });

  const [contentDate, setContentDate] = useState(() => {
    return initialData?.content_date
      ? new Date(initialData.content_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
  });

  const [contents, setContents] = useState(() => {
    if (initialData?.contents && initialData.contents.length > 0) {
      return initialData.contents.map(c => ({
        _id: c._id || null,
        content_title: c.content_title || '',
        content_type: c.content_type || 'Post',
        responsible_employee: c.responsible_employee?._id || c.responsible_employee || '',
        responsible_employee_name:
          c.responsible_employee?.actualName ||
          c.responsible_employee?.name ||
          c.responsible_employee?.displayName ||
          c.responsible_employee_name ||
          '',
        approval_status: c.approval_status || 'Pending',
        overall_status: c.overall_status || 'Planned',
        live_folder_link: c.live_folder_link || '',
        notes: c.notes || '',
        instagram_status: c.instagram_status || 'Not Required',
        instagram_time: c.instagram_time || '',
        facebook_status: c.facebook_status || 'Not Required',
        facebook_time: c.facebook_time || '',
        youtube_status: c.youtube_status || 'Not Required',
        youtube_time: c.youtube_time || '',
        linkedin_status: c.linkedin_status || 'Not Required',
        linkedin_time: c.linkedin_time || '',
        x_status: c.x_status || 'Not Required',
        x_time: c.x_time || ''
      }));
    }
    if (initialData?.content_title) {
      return [
        {
          _id: initialData._id || null,
          content_title: initialData.content_title || '',
          content_type: initialData.content_type || 'Post',
          responsible_employee: initialData.responsible_employee?._id || initialData.responsible_employee || '',
          responsible_employee_name:
            initialData.responsible_employee?.actualName ||
            initialData.responsible_employee?.name ||
            initialData.responsible_employee?.displayName ||
            initialData.responsible_employee_name ||
            '',
          approval_status: initialData.approval_status || 'Pending',
          overall_status: initialData.overall_status || 'Planned',
          live_folder_link: initialData.live_folder_link || '',
          notes: initialData.notes || '',
          instagram_status: initialData?.instagram_status || 'Not Required',
          instagram_time: initialData?.instagram_time || '',
          facebook_status: initialData?.facebook_status || 'Not Required',
          facebook_time: initialData?.facebook_time || '',
          youtube_status: initialData?.youtube_status || 'Not Required',
          youtube_time: initialData?.youtube_time || '',
          linkedin_status: initialData?.linkedin_status || 'Not Required',
          linkedin_time: initialData?.linkedin_time || '',
          x_status: initialData?.x_status || 'Not Required',
          x_time: initialData?.x_time || ''
        }
      ];
    }
    return [createEmptyContent()];
  });

  const [activeContentIndex, setActiveContentIndex] = useState(() => {
    if (initialData?.initialActiveIndex !== undefined) {
      return initialData.initialActiveIndex;
    }
    return 0;
  });

  useEffect(() => {
    if (initialData) {
      if (initialData.content_date) {
        setContentDate(new Date(initialData.content_date).toISOString().split('T')[0]);
      }
      if (initialData.contents && initialData.contents.length > 0) {
        setContents(
          initialData.contents.map(c => ({
            _id: c._id || null,
            content_title: c.content_title || '',
            content_type: c.content_type || 'Post',
            responsible_employee: c.responsible_employee?._id || c.responsible_employee || '',
            responsible_employee_name:
              c.responsible_employee?.actualName ||
              c.responsible_employee?.name ||
              c.responsible_employee?.displayName ||
              c.responsible_employee_name ||
              '',
            approval_status: c.approval_status || 'Pending',
            overall_status: c.overall_status || 'Planned',
            live_folder_link: c.live_folder_link || '',
            notes: c.notes || '',
            instagram_status: c.instagram_status || 'Not Required',
            instagram_time: c.instagram_time || '',
            facebook_status: c.facebook_status || 'Not Required',
            facebook_time: c.facebook_time || '',
            youtube_status: c.youtube_status || 'Not Required',
            youtube_time: c.youtube_time || '',
            linkedin_status: c.linkedin_status || 'Not Required',
            linkedin_time: c.linkedin_time || '',
            x_status: c.x_status || 'Not Required',
            x_time: c.x_time || ''
          }))
        );
      } else if (initialData.content_title) {
        setContents([
          {
            _id: initialData._id || null,
            content_title: initialData.content_title || '',
            content_type: initialData.content_type || 'Post',
            responsible_employee: initialData.responsible_employee?._id || initialData.responsible_employee || '',
            responsible_employee_name:
              initialData.responsible_employee?.actualName ||
              initialData.responsible_employee?.name ||
              initialData.responsible_employee?.displayName ||
              initialData.responsible_employee_name ||
              '',
            approval_status: initialData.approval_status || 'Pending',
            overall_status: initialData.overall_status || 'Planned',
            live_folder_link: initialData.live_folder_link || '',
            notes: initialData.notes || '',
            instagram_status: initialData?.instagram_status || 'Not Required',
            instagram_time: initialData?.instagram_time || '',
            facebook_status: initialData?.facebook_status || 'Not Required',
            facebook_time: initialData?.facebook_time || '',
            youtube_status: initialData?.youtube_status || 'Not Required',
            youtube_time: initialData?.youtube_time || '',
            linkedin_status: initialData?.linkedin_status || 'Not Required',
            linkedin_time: initialData?.linkedin_time || '',
            x_status: initialData?.x_status || 'Not Required',
            x_time: initialData?.x_time || ''
          }
        ]);
      }
      if (initialData.initialActiveIndex !== undefined) {
        setActiveContentIndex(initialData.initialActiveIndex);
      }
    }
  }, [initialData]);

  // Ensure activeContentIndex is within bounds
  const safeActiveIndex = Math.min(activeContentIndex, Math.max(0, contents.length - 1));
  const activeContent = contents[safeActiveIndex] || createEmptyContent();

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
    if (!activeContent.responsible_employee) return null;
    return (employees || []).find(e => String(e._id) === String(activeContent.responsible_employee)) || null;
  }, [employees, activeContent.responsible_employee]);

  const selectedDisplayName =
    selectedEmployee
      ? (selectedEmployee.actualName || selectedEmployee.name || selectedEmployee.displayName)
      : activeContent.responsible_employee_name || '';

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

  const handleActiveChange = (field, value) => {
    setContents(prev => {
      const next = [...prev];
      if (!next[safeActiveIndex]) return prev;
      // Content marked as Posted is locked and cannot be changed
      if (next[safeActiveIndex].overall_status === 'Posted') {
        return prev;
      }
      next[safeActiveIndex] = {
        ...next[safeActiveIndex],
        [field]: value
      };
      return next;
    });
  };

  const handleActiveResponsibleChange = (empId) => {
    const selected = (employees || []).find(e => String(e._id) === String(empId));
    setContents(prev => {
      const next = [...prev];
      if (!next[safeActiveIndex]) return prev;
      next[safeActiveIndex] = {
        ...next[safeActiveIndex],
        responsible_employee: empId || null,
        responsible_employee_name: selected ? (selected.actualName || selected.name || selected.displayName) : ''
      };
      return next;
    });
  };

  const handleAddContent = () => {
    const newCnt = createEmptyContent(activeContent.responsible_employee, activeContent.responsible_employee_name);
    setContents(prev => {
      const next = [...prev, newCnt];
      setActiveContentIndex(next.length - 1);
      return next;
    });
  };

  const handleRemoveContent = (indexToRemove, e) => {
    if (e) e.stopPropagation();
    if (contents.length <= 1) return;
    setContents(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (safeActiveIndex >= next.length) {
        setActiveContentIndex(Math.max(0, next.length - 1));
      } else if (safeActiveIndex === indexToRemove) {
        setActiveContentIndex(Math.max(0, indexToRemove - 1));
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contentDate) {
      setError('Content date is required.');
      return;
    }

    // Validate that every content has a title
    for (let i = 0; i < contents.length; i++) {
      if (!contents[i].content_title || !contents[i].content_title.trim()) {
        setActiveContentIndex(i);
        setError(`Content #${i + 1} requires a content topic / title.`);
        return;
      }
    }

    // Validate that if any content is marked as Posted, active social media platforms have time set
    for (let i = 0; i < contents.length; i++) {
      const c = contents[i];
      if (c.overall_status === 'Posted') {
        const missing = ['instagram', 'facebook', 'youtube', 'linkedin', 'x'].filter(pf => {
          const st = c[`${pf}_status`];
          const tm = c[`${pf}_time`];
          return st && st !== 'Not Required' && (!tm || !String(tm).trim());
        });
        if (missing.length > 0) {
          const pfNames = {
            instagram: 'Instagram',
            facebook: 'Facebook',
            youtube: 'YouTube',
            linkedin: 'LinkedIn',
            x: 'X / Twitter'
          };
          setActiveContentIndex(i);
          setError(`Content #${i + 1} is marked as Posted, but posting time is missing near social media status for: ${missing.map(m => pfNames[m] || m).join(', ')}. Please update time before saving.`);
          return;
        }
      }
    }

    setSaving(true);
    setError('');

    const payload = {
      content_date: contentDate,
      contents: contents.map(c => ({
        ...c,
        content_title: c.content_title.trim(),
        responsible_employee: c.responsible_employee || null,
        live_folder_link: (c.live_folder_link || '').trim(),
        notes: (c.notes || '').trim()
      })),
      // Also provide primary fields for backwards compatibility:
      content_title: contents[0].content_title.trim(),
      content_type: contents[0].content_type,
      responsible_employee: contents[0].responsible_employee || null,
      responsible_employee_name: contents[0].responsible_employee_name,
      approval_status: contents[0].approval_status,
      overall_status: contents[0].overall_status,
      live_folder_link: (contents[0].live_folder_link || '').trim(),
      notes: (contents[0].notes || '').trim(),
      instagram_status: contents[0].instagram_status,
      instagram_time: contents[0].instagram_time,
      facebook_status: contents[0].facebook_status,
      facebook_time: contents[0].facebook_time,
      youtube_status: contents[0].youtube_status,
      youtube_time: contents[0].youtube_time,
      linkedin_status: contents[0].linkedin_status,
      linkedin_time: contents[0].linkedin_time,
      x_status: contents[0].x_status,
      x_time: contents[0].x_time
    };

    try {
      if (isEdit && initialData?._id) {
        const res = await digitalCalendarAPI.update(initialData._id, payload);
        if (res.data?.ok) {
          onSuccess(res.data.data);
        }
      } else {
        const res = await digitalCalendarAPI.create(payload);
        if (res.data?.ok) {
          onSuccess(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save content schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden relative">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/60 via-slate-50 to-orange-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs">
              <FaCalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 m-0 leading-tight">
                {isEdit ? 'Edit Content Schedule' : '+ Schedule Content for Day'}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold m-0 mt-0.5">
                Add 1, 2, 3 or more contents per day within this same card
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium flex items-center gap-2">
              <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Date Picker Row & Item Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
                Scheduled Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={contentDate}
                onChange={e => setContentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            <div className="sm:self-end flex items-center gap-2 pb-0.5">
              <div className="px-3 py-2 rounded-xl bg-sky-100/70 border border-sky-200 text-sky-800 text-xs font-medium flex items-center gap-1.5 shadow-2xs">
                <FaLayerGroup className="w-3.5 h-3.5 text-sky-600" />
                <span>{contents.length} Content{contents.length > 1 ? 's' : ''} in this Card</span>
              </div>
            </div>
          </div>

          {/* 2. Contents Selector Tab Bar with "+ Add Another Content" */}
          <div className="p-3 bg-gradient-to-r from-sky-50/70 via-slate-50 to-orange-50/60 rounded-2xl border border-sky-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 uppercase tracking-wider">
                <FaLayerGroup className="w-3.5 h-3.5 text-sky-600" />
                <span>Contents for this Day's Card:</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Click tabs to switch • Add 2nd, 3rd, etc. below
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {contents.map((cnt, idx) => {
                const isCurrent = safeActiveIndex === idx;
                const cStyle = getTypeStyle(cnt.content_type);
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveContentIndex(idx)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs select-none ${
                      isCurrent
                        ? 'bg-sky-600 text-white border-sky-700 ring-2 ring-sky-200 font-semibold shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 font-medium'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                        isCurrent ? 'bg-white text-sky-700 shadow-2xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs max-w-[130px] truncate">
                      {cnt.content_title || `Content #${idx + 1}`}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-medium ${
                        isCurrent ? 'bg-sky-700 text-white' : `${cStyle.bg} ${cStyle.text}`
                      }`}
                    >
                      {cnt.content_type}
                    </span>
                    {canDeleteContent && contents.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveContent(idx, e)}
                        title={`Delete Content #${idx + 1}`}
                        className={`p-1 rounded transition cursor-pointer ml-0.5 ${
                          isCurrent
                            ? 'hover:bg-sky-700 text-sky-200 hover:text-white'
                            : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                        }`}
                      >
                        <FaTrashCan className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* + Add Another Content CTA Button */}
              <button
                type="button"
                onClick={handleAddContent}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-dashed border-orange-300 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 shadow-2xs"
              >
                <FaPlus className="w-3 h-3 text-orange-600" />
                <span>+ Add Another Content</span>
              </button>
            </div>
          </div>

          {/* 3. Active Content Form Header */}
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>Editing Content #{safeActiveIndex + 1} of {contents.length}</span>
            </div>
            {canDeleteContent && contents.length > 1 && (
              <button
                type="button"
                onClick={(e) => handleRemoveContent(safeActiveIndex, e)}
                className="text-rose-600 hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <FaTrashCan className="w-2.5 h-2.5" />
                <span>Remove Content #{safeActiveIndex + 1}</span>
              </button>
            )}
          </div>

          {/* Locked Notification if this content tab is already Posted */}
          {activeContent.overall_status === 'Posted' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-900 font-medium shadow-3xs">
              <div className="flex items-center gap-2">
                <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Content #{safeActiveIndex + 1} is <strong>Completed & Posted</strong> and locked from editing.
                </span>
              </div>
              <span className="px-2.5 py-1 bg-white text-emerald-700 border border-emerald-300 rounded-xl text-[11px] font-semibold shadow-3xs flex items-center gap-1 shrink-0">
                🔒 Read-Only
              </span>
            </div>
          )}

          {/* 4. Content Topic / Title */}
          <div>
            <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
              Content #{safeActiveIndex + 1} Topic / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={activeContent.content_title}
              onChange={e => handleActiveChange('content_title', e.target.value)}
              placeholder="e.g. Website Design Optimization, Cyber Security Reel..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition font-medium"
            />
          </div>

          {/* 5. Content Type */}
          <div>
            <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
              Content Type
            </label>
            <select
              value={activeContent.content_type}
              onChange={e => handleActiveChange('content_type', e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
            >
              {CONTENT_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Responsible Person */}
          <div className="relative" ref={responsibleDropdownRef}>
            <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
              Responsible Person (Content #{safeActiveIndex + 1})
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
                      className="w-6 h-6 rounded-lg text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                    >
                      {(selectedDisplayName || 'M').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-slate-900 truncate">
                    {selectedDisplayName}
                  </span>
                  {selectedDisplayRole && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-100 text-sky-800 border border-sky-200/80 shrink-0">
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
                      handleActiveResponsibleChange('');
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

            {/* Bounded Dropdown Menu */}
            {showResponsibleDropdown && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                style={{
                  boxShadow: '0 12px 30px -4px rgba(2, 132, 199, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)'
                }}
              >
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

                <div className="max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      handleActiveResponsibleChange('');
                      setShowResponsibleDropdown(false);
                      setEmployeeSearch('');
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition cursor-pointer border-b border-slate-100 ${
                      !activeContent.responsible_employee
                        ? 'bg-sky-50 text-sky-800 font-medium'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xs">
                        —
                      </span>
                      <span>Unassigned / None</span>
                    </div>
                    {!activeContent.responsible_employee && (
                      <FaCheck className="w-3 h-3 text-sky-600" />
                    )}
                  </button>

                  {filteredEmployees.map(emp => {
                    const personName = emp.actualName || emp.name;
                    const personDisplay = emp.displayName || emp.designation;
                    const isSelected = String(activeContent.responsible_employee) === String(emp._id);

                    return (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => {
                          handleActiveResponsibleChange(emp._id);
                          setShowResponsibleDropdown(false);
                          setEmployeeSearch('');
                        }}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2.5 transition cursor-pointer border-b border-slate-50 last:border-0 ${
                          isSelected
                            ? 'bg-sky-50/90 text-sky-900 font-medium'
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
                              className="w-7 h-7 rounded-lg text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #f97316 100%)' }}
                            >
                              {(personName || 'M').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate">
                            <span className="text-xs font-medium block truncate">
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

          {/* 7. Approval & Overall Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block">
                  Approval Status
                </label>
                {canApproveContent && activeContent.approval_status !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleActiveChange('approval_status', 'Approved');
                      if (activeContent.overall_status === 'Needs Approval' || activeContent.overall_status === 'Planned') {
                        handleActiveChange('overall_status', 'Ready to Post');
                      }
                    }}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FaCheck className="w-2.5 h-2.5" />
                    <span>Approve Now</span>
                  </button>
                )}
              </div>
              <select
                disabled={!canApproveContent}
                value={activeContent.approval_status}
                onChange={e => handleActiveChange('approval_status', e.target.value)}
                className={`w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 font-medium ${
                  !canApproveContent ? 'opacity-70 cursor-not-allowed bg-slate-100' : 'cursor-pointer'
                }`}
              >
                {APPROVAL_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === 'Pending' ? 'Needs Approval' : opt}
                  </option>
                ))}
              </select>
              {!canApproveContent && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Only admin can approve content
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block">
                  Overall Status
                </label>
                {canCompleteContent && activeContent.approval_status === 'Approved' && activeContent.overall_status !== 'Posted' && (
                  <button
                    type="button"
                    onClick={() => {
                      const missing = ['instagram', 'facebook', 'youtube', 'linkedin', 'x'].filter(pf => {
                        const st = activeContent[`${pf}_status`];
                        const tm = activeContent[`${pf}_time`];
                        return st && st !== 'Not Required' && (!tm || !String(tm).trim());
                      });
                      if (missing.length > 0) {
                        const pfNames = {
                          instagram: 'Instagram',
                          facebook: 'Facebook',
                          youtube: 'YouTube',
                          linkedin: 'LinkedIn',
                          x: 'X / Twitter'
                        };
                        setError(`Please update posting time near social media status for: ${missing.map(m => pfNames[m] || m).join(', ')} before marking as Posted.`);
                        return;
                      }
                      handleActiveChange('overall_status', 'Posted');
                      ['instagram', 'facebook', 'youtube', 'linkedin', 'x'].forEach(pf => {
                        if (activeContent[`${pf}_status`] && activeContent[`${pf}_status`] !== 'Not Required') {
                          handleActiveChange(`${pf}_status`, 'Posted');
                        }
                      });
                    }}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FaCircleCheck className="w-2.5 h-2.5" />
                    <span>Mark as Posted</span>
                  </button>
                )}
              </div>
              <select
                value={activeContent.overall_status}
                onChange={e => handleActiveChange('overall_status', e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                {OVERALL_STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              {canCompleteContent && activeContent.approval_status !== 'Approved' && (
                <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                  * Content requires admin approval before it can be completed/posted
                </span>
              )}
            </div>
          </div>

          {/* 8. Social Media Platforms Breakdown */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FaBullhorn className="w-3.5 h-3.5 text-sky-600" />
              Social Media Platforms Breakdown (Content #{safeActiveIndex + 1})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Instagram */}
              <div className="p-3.5 bg-gradient-to-br from-pink-50/50 to-white rounded-2xl border border-pink-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-pink-600 font-semibold text-xs">
                  <FaInstagram className="w-4 h-4" />
                  <span>Instagram</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={activeContent.instagram_status}
                      onChange={e => handleActiveChange('instagram_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-pink-500 font-medium cursor-pointer"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Time</label>
                    <PlatformTimeInput
                      value={activeContent.instagram_time}
                      onChange={val => handleActiveChange('instagram_time', val)}
                      focusBorderClass="focus:border-pink-500"
                      textColorClass="text-pink-600"
                    />
                  </div>
                </div>
              </div>

              {/* Facebook */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/50 to-white rounded-2xl border border-blue-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs">
                  <FaFacebook className="w-4 h-4" />
                  <span>Facebook</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={activeContent.facebook_status}
                      onChange={e => handleActiveChange('facebook_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Time</label>
                    <PlatformTimeInput
                      value={activeContent.facebook_time}
                      onChange={val => handleActiveChange('facebook_time', val)}
                      focusBorderClass="focus:border-blue-500"
                      textColorClass="text-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* YouTube */}
              <div className="p-3.5 bg-gradient-to-br from-red-50/50 to-white rounded-2xl border border-red-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-red-600 font-semibold text-xs">
                  <FaYoutube className="w-4 h-4" />
                  <span>YouTube</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={activeContent.youtube_status}
                      onChange={e => handleActiveChange('youtube_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 font-medium cursor-pointer"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Time</label>
                    <PlatformTimeInput
                      value={activeContent.youtube_time}
                      onChange={val => handleActiveChange('youtube_time', val)}
                      focusBorderClass="focus:border-red-500"
                      textColorClass="text-red-600"
                    />
                  </div>
                </div>
              </div>

              {/* LinkedIn */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/50 to-white rounded-2xl border border-blue-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs">
                  <FaLinkedinIn className="w-4 h-4" />
                  <span>LinkedIn</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={activeContent.linkedin_status}
                      onChange={e => handleActiveChange('linkedin_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Time</label>
                    <PlatformTimeInput
                      value={activeContent.linkedin_time}
                      onChange={val => handleActiveChange('linkedin_time', val)}
                      focusBorderClass="focus:border-blue-500"
                      textColorClass="text-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* X / Twitter */}
              <div className="p-3.5 bg-gradient-to-br from-slate-100/50 to-white rounded-2xl border border-slate-200 space-y-2.5 shadow-xs sm:col-span-2 sm:max-w-[calc(50%-0.45rem)]">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                  <FaXTwitter className="w-4 h-4" />
                  <span>X / Twitter</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={activeContent.x_status}
                      onChange={e => handleActiveChange('x_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 font-medium cursor-pointer"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Time</label>
                    <PlatformTimeInput
                      value={activeContent.x_time}
                      onChange={val => handleActiveChange('x_time', val)}
                      focusBorderClass="focus:border-slate-500"
                      textColorClass="text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 9. Live / Folder Link */}
          <div className="pt-2">
            <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
              Live Link / Google Drive Asset Folder (Content #{safeActiveIndex + 1})
            </label>
            <input
              type="url"
              value={activeContent.live_folder_link}
              onChange={e => handleActiveChange('live_folder_link', e.target.value)}
              placeholder="https://drive.google.com/... or Canva post link"
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 focus:bg-white transition font-medium"
            />
          </div>

          {/* 10. Notes */}
          <div>
            <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
              Internal Notes / Copy Instructions (Content #{safeActiveIndex + 1})
            </label>
            <textarea
              rows={3}
              value={activeContent.notes}
              onChange={e => handleActiveChange('notes', e.target.value)}
              placeholder="Add any internal instructions, hashtags, or campaign remarks..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-sky-500 focus:bg-white transition font-medium"
            />
          </div>

          {/* 11. Modal Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleAddContent}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <FaPlus className="w-3 h-3 text-orange-600" />
              <span>+ Add Another Content for this Day</span>
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-xs font-medium text-white rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  boxShadow: '0 4px 15px rgba(2, 132, 199, 0.35)'
                }}
              >
                {saving
                  ? 'Saving...'
                  : isEdit
                  ? `Update Card (${contents.length} Items)`
                  : `Save & Schedule Card (${contents.length} Items)`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
