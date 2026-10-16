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

// ── Compact Notes Component (Renders only when notes exist) ───────────────────
function AutoScrollNotes({ text }) {
  if (!text || !text.trim()) return null;

  return (
    <div
      className="text-xs text-slate-600 bg-slate-50/90 px-3 py-2 rounded-xl border border-slate-200/80 font-medium relative mb-2.5 flex items-start gap-2"
      title={text}
    >
      <span className="text-slate-400 shrink-0 text-xs mt-0.5">📝</span>
      <span className="line-clamp-2 leading-relaxed text-slate-600 flex-1">
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
      const count = (it.contents && it.contents.length > 0) ? it.contents.length : 1;
      map[dateKey] = (map[dateKey] || 0) + count;
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

    // 5 Status Filter Tabs (checks all sub-contents if present)
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
  }, [items, selectedDateFilter, filterStatus, filterType, filterPlatform, filterEmployee, searchQuery]);

  // Open edit modal
  const handleEditClick = (item, initialActiveIndex = 0) => {
    setSelectedItemId(item._id);
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
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 m-0">
                  Digital Calendar
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs">
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
              <span className="px-3 text-xs font-medium text-slate-800 min-w-[130px] text-center select-none tracking-wide">
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
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
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
              {/* 5 Status Filter Tabs (Replacing top metric cards) */}
              <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-2xs overflow-x-auto gap-1">
                {/* 1. Total Items */}
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
                  <span>Total Items</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    filterStatus === 'all' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.total}
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

                {/* 3. Live / Posted */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('posted')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                    filterStatus === 'posted'
                      ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <FaCheck className={`w-3.5 h-3.5 ${filterStatus === 'posted' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>Live / Posted</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    filterStatus === 'posted' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {statusCounts.posted}
                  </span>
                </button>

                {/* 4. In Progress */}
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

                {/* 5. Needs Approval */}
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                {/* Marketing Content Cards */}
                {filteredItems.map(item => {
                  const allContents = (item.contents && item.contents.length > 0)
                    ? item.contents
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
                        x_time: item.x_time
                      }];

                  const activeSubIdx = cardSubIndexMap[item._id] !== undefined
                    ? Math.min(cardSubIndexMap[item._id], allContents.length - 1)
                    : 0;
                  const currentItem = allContents[activeSubIdx] || allContents[0];

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

                  return (
                    <div
                      key={item._id}
                      onClick={() => handleEditClick(item, activeSubIdx)}
                      className="content-card-elevated bg-white rounded-3xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col relative cursor-pointer group transition-all"
                      style={{
                        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)'
                      }}
                    >
                      {/* 1. Header: Date Pill + Content Type Badge + Action Controls */}
                      <div className="flex items-center justify-between gap-1.5 mb-2.5">
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
                            onClick={() => handleEditClick(item, allContents.length)}
                            title="Add another content to this day"
                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                          >
                            <FaPlus className="w-3 h-3" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleEditClick(item, activeSubIdx)}
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

                      {/* 2. Multi-Content Switcher (if > 1 content) */}
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
                            onClick={() => handleEditClick(item, allContents.length)}
                            title="Add another content to this day"
                            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-white rounded-lg transition cursor-pointer shrink-0"
                          >
                            <FaPlus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      {/* 3. Content Title */}
                      <h4
                        title={currentItem.content_title}
                        className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug line-clamp-2 mt-0.5 mb-2"
                      >
                        {currentItem.content_title || 'Untitled Content'}
                      </h4>

                      {/* 4. Overall Status & Approval Badges */}
                      <div className="flex items-center flex-wrap gap-1.5 mb-2.5">
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

                      {/* 5. Notes / Description (Renders only if present) */}
                      <AutoScrollNotes text={currentItem.notes} />

                      {/* 6. Platform Breakdown & Posting Times */}
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

                            return (
                              <div
                                key={pIdx}
                                className={`p-1.5 rounded-xl border flex flex-col justify-between gap-1 transition-all shadow-3xs min-h-[46px] ${
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

                                {/* Bottom: Status Tag + Time */}
                                <div className="flex items-center justify-between gap-1 w-full pt-0.5 border-t border-slate-100/70 min-w-0">
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
                                  {pf.time && !isOff && (
                                    <span className="text-[8.5px] text-slate-500 font-medium shrink-0 ml-1 flex items-center gap-0.5">
                                      <FaClock className="w-2 h-2 text-slate-400" />
                                      {formatTime12h(pf.time)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 7. Card Footer: Responsible Person + Drive Link */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
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
                      onClick={() => handleEditClick(parentItem, sIdx)}
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
                            {sub.instagram_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(sub.instagram_time)}</div>
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
                            {sub.facebook_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(sub.facebook_time)}</div>
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
                            {sub.youtube_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(sub.youtube_time)}</div>
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
                            {sub.linkedin_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(sub.linkedin_time)}</div>
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
                            {sub.x_time && (
                              <div className="text-[10px] text-slate-400 font-medium">{formatTime12h(sub.x_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium"
                          style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                        >
                          {sub.overall_status}
                        </span>
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
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium"
                          style={{ background: app.bg, color: app.text, border: `1px solid ${app.border}` }}
                        >
                          {app.icon} {app.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(parentItem, sIdx)}
                            title="Edit this item"
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                          >
                            <FaPenToSquare className="w-3.5 h-3.5" />
                          </button>
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

// ── Content Form Modal Component ──────────────────────────────────────────────
function ContentFormModal({ isEdit, initialData, employees, onClose, onSuccess }) {
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
                    {contents.length > 1 && (
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
            {contents.length > 1 && (
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
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
                Approval Status
              </label>
              <select
                value={activeContent.approval_status}
                onChange={e => handleActiveChange('approval_status', e.target.value)}
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
              <label className="text-xs font-medium text-slate-700 uppercase tracking-wider block mb-1">
                Overall Status
              </label>
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
