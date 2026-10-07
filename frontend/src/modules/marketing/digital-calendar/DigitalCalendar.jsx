import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { digitalCalendarAPI } from '../../../services/api';
import { isCEO, isHR, isManager } from '../../../utils/permissions';
import {
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
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
  FaTriangleExclamation
} from 'react-icons/fa6';

// ── Color Theme Constants ─────────────────────────────────────────────────────
const THEME = {
  deepBlue: '#0f172a',
  blue: '#0284c7',
  blueLight: '#38bdf8',
  blueSoft: '#f0f9ff',
  orange: '#f97316',
  orangeSoft: '#fff7ed',
  slateBg: '#f8fafc',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  textMain: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8'
};

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

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
      return { label: '✓ Approved', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    case 'Rejected':
      return { label: '✕ Rejected', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    case 'Pending':
    default:
      return { label: '⏳ Needs Approval', bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' };
  }
}

// 12-Hour Time Formatter / Helper
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  // If already formatted like "07:00 PM", return it
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

export default function DigitalCalendar() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Current calendar viewing month & year (defaults to actual current date)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth()); // 0-indexed

  // UI State
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'management'
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
  const [selectedDateFilter, setSelectedDateFilter] = useState(null);

  // Filters State
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterApproval, setFilterApproval] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDateItemsModal, setShowDateItemsModal] = useState(null); // { dateStr, items }
  const [editingItem, setEditingItem] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState(null);

  // Authorization flags
  const canManageAll = isCEO(user) || isManager(user) || user?.role === 'admin';
  const canDeleteContent = isCEO(user) || user?.role === 'admin' || isManager(user);

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

  // Fetch Calendar Content & Stats
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year: currentYear,
        month: currentMonth + 1,
        responsible: filterEmployee !== 'all' ? filterEmployee : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        overall_status: filterStatus !== 'all' ? filterStatus : undefined,
        approval_status: filterApproval !== 'all' ? filterApproval : undefined,
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

        // Auto-select first item or preserve selected item if exists
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
  }, [currentYear, currentMonth, filterEmployee, filterType, filterStatus, filterApproval, filterPlatform, searchQuery]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected item object lookup
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find(it => it._id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateFilter(null);
  };

  // Build the monthly calendar matrix
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Overflow from previous month
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

    // Days in current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateStr,
        fullDate: new Date(currentYear, currentMonth, i)
      });
    }

    // Overflow into next month to complete 6 weeks (42 cells) or 5 weeks (35 cells)
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

  // Group items by date string (YYYY-MM-DD) with strict deduplication
  const itemsByDate = useMemo(() => {
    const map = {};
    const seen = new Set();
    items.forEach(item => {
      if (!item.content_date) return;
      const d = new Date(item.content_date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const uniqueKey = `${(item.content_title || '').trim().toLowerCase()}_${dateKey}`;
      if (seen.has(uniqueKey)) return;
      seen.add(uniqueKey);

      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    });
    return map;
  }, [items]);

  // Check if a date is today
  const isToday = (dayObj) => {
    const n = new Date();
    return (
      dayObj.fullDate.getFullYear() === n.getFullYear() &&
      dayObj.fullDate.getMonth() === n.getMonth() &&
      dayObj.fullDate.getDate() === n.getDate()
    );
  };

  // Open add modal for empty date click
  const handleCellClick = (dayObj, e) => {
    // If clicked on empty space or cell container
    if (e.target.closest('.event-card-item')) return;
    setPrefilledDate(dayObj.dateStr);
    setShowAddModal(true);
  };

  // Open edit modal and immediately select item in right-side details panel
  const handleEditClick = (item) => {
    if (item?._id) {
      setSelectedItemId(item._id);
    }
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

  return (
    <div
      className="w-full min-h-screen text-slate-800"
      style={{
        background: '#f8fafc',
        padding: '24px 24px 48px',
        margin: '0 auto',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* ── 1. Page Header (Full Width, No Left Sidebar) ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
            >
              <FaCalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 m-0">
                Digital Calendar
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 m-0 mt-0.5">
                Plan, schedule and track all marketing content across social platforms.
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FaCalendarDays className="w-3.5 h-3.5" />
              Calendar View
            </button>
            <button
              onClick={() => setViewMode('management')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'management'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FaTableList className="w-3.5 h-3.5" />
              Management View
            </button>
          </div>

          {/* Month Navigation for Quick Jump */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm px-2 py-1">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
            >
              <FaChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[130px] text-center select-none">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
            >
              <FaChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={handleGoToToday}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 rounded-xl shadow-sm transition"
          >
            Today
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:text-sky-600 hover:border-sky-400 rounded-xl shadow-sm transition"
          >
            <FaRotate className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {/* + Add Content CTA */}
          <button
            onClick={() => {
              setPrefilledDate(new Date().toISOString().split('T')[0]);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-orange-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <FaPlus className="w-3.5 h-3.5" />
            + Add Content
          </button>
        </div>
      </div>

      {/* ── 2. Summary Metric Cards (5 Compact Dynamic Cards) ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        {/* Total Content */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Content</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats.totalContent}
            </span>
            <span className="text-xs text-slate-400 font-medium">All items</span>
          </div>
        </div>

        {/* Scheduled */}
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-sky-700 text-xs font-semibold uppercase tracking-wider">
            <span>Scheduled</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-600">
              {stats.scheduled}
            </span>
            <span className="text-xs text-sky-500 font-medium">Upcoming</span>
          </div>
        </div>

        {/* Posted */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <span>Posted</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {stats.posted}
            </span>
            <span className="text-xs text-emerald-500 font-medium">Published</span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase tracking-wider">
            <span>Pending</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              {stats.pending}
            </span>
            <span className="text-xs text-amber-500 font-medium">In progress</span>
          </div>
        </div>

        {/* Needs Approval */}
        <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between hover:shadow-md transition col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-orange-700 text-xs font-semibold uppercase tracking-wider">
            <span>Needs Approval</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-orange-600">
              {stats.needsApproval}
            </span>
            <span className="text-xs text-orange-500 font-medium">Pending review</span>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Bar ───────────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <FaMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search content, employee, notes..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Employee filter */}
        <select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          <option value="all">All Employees</option>
          {marketingEmployees.map(emp => (
            <option key={emp._id} value={emp._id}>
              {emp.name} ({emp.designation || 'Marketing'})
            </option>
          ))}
        </select>

        {/* Content Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          <option value="all">All Content Types</option>
          {CONTENT_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {/* Overall Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          <option value="all">All Status</option>
          {OVERALL_STATUS_OPTIONS.map(st => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Approval filter */}
        <select
          value={filterApproval}
          onChange={e => setFilterApproval(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          <option value="all">All Approvals</option>
          <option value="Pending">Needs Approval</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        {/* Platform filter */}
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          <option value="all">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="linkedin">LinkedIn</option>
          <option value="x">X / Twitter</option>
        </select>

        {/* Clear Filters button */}
        {(filterEmployee !== 'all' ||
          filterType !== 'all' ||
          filterStatus !== 'all' ||
          filterApproval !== 'all' ||
          filterPlatform !== 'all' ||
          searchQuery) && (
          <button
            onClick={() => {
              setFilterEmployee('all');
              setFilterType('all');
              setFilterStatus('all');
              setFilterApproval('all');
              setFilterPlatform('all');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── 4. Main Body: Calendar / Management + Right Details Panel ───────── */}
      {viewMode === 'calendar' ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* Left / Center 72%: Interactive Monthly Calendar Grid */}
          <div className="w-full lg:w-[72%] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Calendar Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {DAYS_SHORT.map((day, idx) => (
                <div
                  key={day}
                  className={`py-3 text-center text-xs font-bold tracking-wider ${
                    idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100">
              {calendarDays.map((dayObj, index) => {
                const dayItems = itemsByDate[dayObj.dateStr] || [];
                const isTodayDate = isToday(dayObj);
                const hasSelectedEvent = selectedItem && dayItems.some(it => it._id === selectedItem._id);

                return (
                  <div
                    key={`${dayObj.dateStr}-${index}`}
                    onClick={(e) => {
                      if (dayItems.length === 0) {
                        setPrefilledDate(dayObj.dateStr);
                        setShowAddModal(true);
                      }
                    }}
                    className={`min-h-[120px] sm:min-h-[140px] p-1.5 sm:p-2 bg-white flex flex-col justify-between transition-colors relative group/cell ${
                      !dayObj.isCurrentMonth ? 'bg-slate-50/60 opacity-60' : ''
                    } ${hasSelectedEvent ? 'ring-2 ring-sky-500/40 bg-sky-50/20' : ''}`}
                  >
                    {/* Top Row: Date Number & Add Button */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex items-center justify-center text-xs font-bold rounded-lg w-6 h-6 ${
                          isTodayDate
                            ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                            : dayObj.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {dayObj.dayNumber}
                      </span>

                      {/* Visible + button on top right of date cell */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrefilledDate(dayObj.dateStr);
                          setShowAddModal(true);
                        }}
                        title={`Add content on ${dayObj.dateStr}`}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-100 active:scale-95 transition-all cursor-pointer"
                      >
                        <FaPlus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Content Items inside Cell */}
                    {dayItems.length > 0 && (
                      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                        {dayItems.slice(0, 2).map(item => {
                          const isSelected = selectedItemId === item._id;
                          const statusStyle = getStatusStyle(item.overall_status);

                          return (
                            <div
                              key={item._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item._id);
                              }}
                              className={`group/card event-card-item rounded-lg p-1.5 sm:p-2 text-left text-xs transition-all border shadow-xs cursor-pointer relative ${
                                isSelected
                                  ? 'border-sky-500 bg-sky-50 shadow-md ring-2 ring-sky-400/50'
                                  : 'hover:border-slate-300 hover:shadow-xs bg-white'
                              }`}
                              style={{
                                borderColor: isSelected ? '#0284c7' : statusStyle.border,
                                borderLeftWidth: '3.5px',
                                borderLeftColor: statusStyle.dot
                              }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="font-semibold text-slate-900 truncate leading-tight text-xs flex-1">
                                  {item.content_title}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(item);
                                  }}
                                  title="Edit this content"
                                  className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-100 rounded transition shrink-0 -mt-0.5 -mr-0.5 cursor-pointer"
                                >
                                  <FaPenToSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                                <span className="text-sky-700 font-semibold px-1.5 py-0.5 rounded bg-sky-50 border border-sky-100">
                                  {item.content_type}
                                </span>
                                <span
                                  className="font-medium px-1 rounded truncate max-w-[85px] flex items-center gap-1"
                                  style={{ color: statusStyle.text }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusStyle.dot }}></span>
                                  {item.overall_status}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* If more than 2 items, show +X more badge */}
                        {dayItems.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDateItemsModal({
                                dateStr: dayObj.dateStr,
                                items: dayItems
                              });
                            }}
                            className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md py-0.5 px-1.5 text-center transition"
                          >
                            + {dayItems.length - 2} more
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty month indicator */}
            {items.length === 0 && !loading && (
              <div className="p-8 text-center bg-white">
                <p className="text-slate-500 text-sm font-medium">
                  {searchQuery || filterEmployee !== 'all' || filterType !== 'all'
                    ? 'No content matches your filters or search.'
                    : `No content scheduled for ${MONTH_NAMES[currentMonth]} ${currentYear}.`}
                </p>
                <button
                  onClick={() => {
                    setPrefilledDate(new Date().toISOString().split('T')[0]);
                    setShowAddModal(true);
                  }}
                  className="mt-3 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  + Add First Content
                </button>
              </div>
            )}
          </div>

          {/* Right 28%: Right-Side Content Details Panel (Sticky & Interactive) */}
          <div className="w-full lg:w-[28%] lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
            {selectedItem ? (
              <div className="flex flex-col gap-4">
                {/* Header title */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Content Details
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditClick(selectedItem)}
                      title="Edit content"
                      className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                    >
                      <FaPenToSquare className="w-3.5 h-3.5" />
                    </button>
                    {canDeleteContent && (
                      <button
                        onClick={() => handleDeleteClick(selectedItem)}
                        title="Delete content"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <FaTrashCan className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Content Topic & Type */}
                <div>
                  <div className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-md bg-sky-100 text-sky-700 mb-1.5">
                    {selectedItem.content_type}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {selectedItem.content_title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <FaCalendarDays className="w-3.5 h-3.5 text-sky-500" />
                    <span>
                      {new Date(selectedItem.content_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}{' '}
                      • {selectedItem.day || new Date(selectedItem.content_date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                  </p>
                </div>

                {/* Status & Responsible Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Overall Status
                    </span>
                    {(() => {
                      const st = getStatusStyle(selectedItem.overall_status);
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }}></span>
                          {selectedItem.overall_status}
                        </span>
                      );
                    })()}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Approval
                    </span>
                    {(() => {
                      const app = getApprovalBadge(selectedItem.approval_status);
                      return (
                        <span
                          className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: app.bg, color: app.text, border: `1px solid ${app.border}` }}
                        >
                          {app.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Responsible Person
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                        {(selectedItem.responsible_employee?.name || selectedItem.responsible_employee_name || 'M')
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        {selectedItem.responsible_employee?.displayName ||
                          selectedItem.responsible_employee?.name ||
                          selectedItem.responsible_employee_name ||
                          'Unassigned'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Social Media Platform Tracking ── */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    Social Media Status
                  </span>
                  <div className="space-y-2">
                    {/* Instagram */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                          <FaInstagram className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">Instagram</span>
                          <span className="text-[10px] text-slate-400">
                            {selectedItem.instagram_time ? formatTime12h(selectedItem.instagram_time) : 'No time set'}
                          </span>
                        </div>
                      </div>
                      {(() => {
                        const st = getStatusStyle(selectedItem.instagram_status);
                        return (
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                          >
                            {selectedItem.instagram_status || 'Not Required'}
                          </span>
                        );
                      })()}
                    </div>

                    {/* YouTube */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                          <FaYoutube className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">YouTube</span>
                          <span className="text-[10px] text-slate-400">
                            {selectedItem.youtube_time ? formatTime12h(selectedItem.youtube_time) : 'No time set'}
                          </span>
                        </div>
                      </div>
                      {(() => {
                        const st = getStatusStyle(selectedItem.youtube_status);
                        return (
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                          >
                            {selectedItem.youtube_status || 'Not Required'}
                          </span>
                        );
                      })()}
                    </div>

                    {/* LinkedIn */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FaLinkedinIn className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">LinkedIn</span>
                          <span className="text-[10px] text-slate-400">
                            {selectedItem.linkedin_time ? formatTime12h(selectedItem.linkedin_time) : 'No time set'}
                          </span>
                        </div>
                      </div>
                      {(() => {
                        const st = getStatusStyle(selectedItem.linkedin_status);
                        return (
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                          >
                            {selectedItem.linkedin_status || 'Not Required'}
                          </span>
                        );
                      })()}
                    </div>

                    {/* X / Twitter */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center">
                          <FaXTwitter className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">X / Twitter</span>
                          <span className="text-[10px] text-slate-400">
                            {selectedItem.x_time ? formatTime12h(selectedItem.x_time) : 'No time set'}
                          </span>
                        </div>
                      </div>
                      {(() => {
                        const st = getStatusStyle(selectedItem.x_status);
                        return (
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                          >
                            {selectedItem.x_status || 'Not Required'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Live / Folder Link */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Live / Folder Link
                  </span>
                  {selectedItem.live_folder_link ? (
                    <a
                      href={selectedItem.live_folder_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs rounded-xl border border-sky-200 transition"
                    >
                      <FaArrowUpRightFromSquare className="w-3 h-3" />
                      Open Link
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic block py-1">No link added</span>
                  )}
                </div>

                {/* Notes */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Notes
                  </span>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedItem.notes || <span className="text-slate-400 italic">No notes provided.</span>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleEditClick(selectedItem)}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                  >
                    Edit Content
                  </button>
                  {canDeleteContent && (
                    <button
                      onClick={() => handleDeleteClick(selectedItem)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center mb-3">
                  <FaCalendarDays className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Select a content item</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Click any calendar event or cell to inspect full social platform details.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── 5. Management View (Excel Sheet 2 Style Table) ─────────────────── */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <FaTableList className="w-4 h-4 text-sky-600" />
              Management Overview Table
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing {items.length} content items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Day</th>
                  <th className="py-3 px-4">Content / Topic</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Instagram</th>
                  <th className="py-3 px-3">YouTube</th>
                  <th className="py-3 px-3">LinkedIn</th>
                  <th className="py-3 px-3">X / Twitter</th>
                  <th className="py-3 px-3">Overall</th>
                  <th className="py-3 px-4">Responsible</th>
                  <th className="py-3 px-3">Approval</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const st = getStatusStyle(item.overall_status);
                  const app = getApprovalBadge(item.approval_status);

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-sky-50/40 transition cursor-pointer"
                      onClick={() => {
                        setSelectedItemId(item._id);
                        setViewMode('calendar');
                      }}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {new Date(item.content_date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                        {item.day || new Date(item.content_date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">
                        {item.content_title}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {item.content_type}
                        </span>
                      </td>

                      {/* Instagram */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.instagram_status && item.instagram_status !== 'Not Required' ? (
                          <div>
                            <span className="font-semibold text-pink-600">{item.instagram_status}</span>
                            {item.instagram_time && (
                              <div className="text-[10px] text-slate-400">{formatTime12h(item.instagram_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* YouTube */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.youtube_status && item.youtube_status !== 'Not Required' ? (
                          <div>
                            <span className="font-semibold text-red-600">{item.youtube_status}</span>
                            {item.youtube_time && (
                              <div className="text-[10px] text-slate-400">{formatTime12h(item.youtube_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* LinkedIn */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.linkedin_status && item.linkedin_status !== 'Not Required' ? (
                          <div>
                            <span className="font-semibold text-blue-600">{item.linkedin_status}</span>
                            {item.linkedin_time && (
                              <div className="text-[10px] text-slate-400">{formatTime12h(item.linkedin_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* X / Twitter */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.x_status && item.x_status !== 'Not Required' ? (
                          <div>
                            <span className="font-semibold text-slate-800">{item.x_status}</span>
                            {item.x_time && (
                              <div className="text-[10px] text-slate-400">{formatTime12h(item.x_time)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                        >
                          {item.overall_status}
                        </span>
                      </td>

                      {/* Responsible */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                        {item.responsible_employee?.displayName ||
                          item.responsible_employee?.name ||
                          item.responsible_employee_name ||
                          'Unassigned'}
                      </td>

                      {/* Approval */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{ background: app.bg, color: app.text, border: `1px solid ${app.border}` }}
                        >
                          {app.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(item)}
                            title="Edit"
                            className="p-1.5 text-slate-500 hover:text-sky-600 rounded transition"
                          >
                            <FaPenToSquare className="w-3.5 h-3.5" />
                          </button>
                          {canDeleteContent && (
                            <button
                              onClick={() => handleDeleteClick(item)}
                              title="Delete"
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition"
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
                    <td colSpan={12} className="text-center py-10 text-slate-500 font-medium">
                      No content items found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Add / Edit Content Modal ─────────────────────────────────────── */}
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

      {/* ── 7. Delete Confirmation Modal ────────────────────────────────────── */}
      {showDeleteModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <FaTriangleExclamation className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 m-0">Confirm Deletion</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
              Are you sure you want to delete <strong>&quot;{editingItem.content_title}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition"
              >
                Delete Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Date Multi-Items Modal (Pop-up when clicking +X more) ────────── */}
      {showDateItemsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                <FaCalendarDays className="w-4 h-4 text-sky-600" />
                All Content on {showDateItemsModal.dateStr}
              </h3>
              <button
                onClick={() => setShowDateItemsModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {showDateItemsModal.items.map(item => {
                const st = getStatusStyle(item.overall_status);
                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      setSelectedItemId(item._id);
                      setShowDateItemsModal(null);
                    }}
                    className="p-3 bg-slate-50 hover:bg-sky-50 rounded-xl border border-slate-200 cursor-pointer transition flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 m-0 truncate">{item.content_title}</h4>
                      <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                        {item.content_type} • {item.responsible_employee_name || 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
                        style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                      >
                        {item.overall_status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDateItemsModal(null);
                          handleEditClick(item);
                        }}
                        title="Edit"
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-100 rounded-lg transition"
                      >
                        <FaPenToSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
        responsible_employee_name: initialData.responsible_employee?.displayName || initialData.responsible_employee?.name || initialData.responsible_employee_name || '',
        approval_status: initialData.approval_status || 'Pending',
        overall_status: initialData.overall_status || 'Planned',
        live_folder_link: initialData.live_folder_link || '',
        notes: initialData.notes || '',

        // Platform Trackings
        instagram_status: initialData.instagram_status || 'Not Required',
        instagram_time: initialData.instagram_time || '',

        youtube_status: initialData.youtube_status || 'Not Required',
        youtube_time: initialData.youtube_time || '',

        linkedin_status: initialData.linkedin_status || 'Not Required',
        linkedin_time: initialData.linkedin_time || '',

        x_status: initialData.x_status || 'Not Required',
        x_time: initialData.x_time || ''
      });
    }
  }, [initialData]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResponsibleChange = (empId) => {
    const selected = employees.find(e => e._id === empId);
    setFormData(prev => ({
      ...prev,
      responsible_employee: empId || null,
      responsible_employee_name: selected ? selected.name : ''
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
            <FaCalendarDays className="w-4 h-4 text-sky-600" />
            {isEdit ? 'Edit Marketing Content' : '+ Add Marketing Content'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Title / Topic */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Content / Topic <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.content_title}
              onChange={e => handleChange('content_title', e.target.value)}
              placeholder="e.g. Hackathon Team Reel, Cyber Security Tips..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition"
            />
          </div>

          {/* Date, Type & Responsible Person */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.content_date}
                onChange={e => handleChange('content_date', e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={e => handleChange('content_type', e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {CONTENT_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Responsible Person
              </label>
              <select
                value={formData.responsible_employee || ''}
                onChange={e => handleResponsibleChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.designation || 'Marketing'})
                  </option>
                ))}
              </select>
            </div>
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
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 cursor-pointer"
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
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {OVERALL_STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Social Media Posting Status & Times ─────────────────────────── */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Social Media Posting Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Instagram */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-pink-600 font-bold text-xs">
                  <FaInstagram className="w-4 h-4" />
                  <span>Instagram</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.instagram_status}
                      onChange={e => handleChange('instagram_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Posting Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 07:00 PM"
                      value={formData.instagram_time}
                      onChange={e => handleChange('instagram_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* YouTube */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                  <FaYoutube className="w-4 h-4" />
                  <span>YouTube</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.youtube_status}
                      onChange={e => handleChange('youtube_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Posting Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 07:00 PM"
                      value={formData.youtube_time}
                      onChange={e => handleChange('youtube_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* LinkedIn */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                  <FaLinkedinIn className="w-4 h-4" />
                  <span>LinkedIn</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.linkedin_status}
                      onChange={e => handleChange('linkedin_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Posting Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 07:10 PM"
                      value={formData.linkedin_time}
                      onChange={e => handleChange('linkedin_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* X / Twitter */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <FaXTwitter className="w-4 h-4" />
                  <span>X / Twitter</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Status</label>
                    <select
                      value={formData.x_status}
                      onChange={e => handleChange('x_status', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    >
                      {PLATFORM_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Posting Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 06:40 PM"
                      value={formData.x_time}
                      onChange={e => handleChange('x_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live / Folder Link */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Live / Folder Link
            </label>
            <input
              type="url"
              value={formData.live_folder_link}
              onChange={e => handleChange('live_folder_link', e.target.value)}
              placeholder="https://drive.google.com/... or Canva / post link"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Add any internal instructions, post copy notes, or review status..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Content' : 'Save Content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
