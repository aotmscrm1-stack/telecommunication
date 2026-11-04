import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  Flame, 
  Zap, 
  Leaf,
  Plus, 
  Trash2, 
  Edit3, 
  CheckSquare, 
  Check,
  ListTodo,
  AlertTriangle,
  ChevronDown,
  Repeat,
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  CalendarCheck2,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { isExecutive, isHR, canEditTask, canDeleteTask, canEditOrDeleteTask, canMarkCompleteTask } from '../../../utils/permissions';
import { followupsAPI, todosAPI } from '../../../services/api';

// Helper to get YYYY-MM-DD in local IST time
function getLocalDateKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// Authoritative date key for completed todos (strictly completion date first)
export function getCompletedTodoDateKey(t) {
  if (!t) return '';
  if (t.completedAt) {
    const k = getLocalDateKey(t.completedAt);
    if (k) return k;
  }
  if (t.initialScheduledAt) {
    const k = getLocalDateKey(t.initialScheduledAt);
    if (k) return k;
  }
  if (t.createdAt) {
    const k = getLocalDateKey(t.createdAt);
    if (k) return k;
  }
  return getLocalDateKey(t.scheduledAt || t.dueDate);
}

// Helper for IST Date formatting
function formatISTDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function isTodayDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth() === today.getMonth() &&
         d.getDate() === today.getDate();
}

// Helper for IST DateTime formatting
function formatIST(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

// User Avatar helper
function Avatar({ user, nameFallback = 'User', size = 32 }) {
  const avatarUrl = user?.avatar || user?.profileImage || user?.photo;
  const name = user?.name || user?.displayName || nameFallback;
  const initials = (name || 'U').slice(0, 2).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      color: '#3730a3',
      fontSize: size * 0.38,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1.5px solid #c7d2fe',
      flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

// AutoScroll Name Component for Long Assignee & Assignor Names
function AutoScrollName({ prefix = '', name = '', className = '', style = {}, maxPx = 135 }) {
  const fullText = prefix ? `${prefix} ${name}` : name;
  const isLong = fullText.length > 15;

  return (
    <div 
      className={`relative overflow-hidden whitespace-nowrap ${className}`}
      style={{ maxWidth: maxPx, width: '100%', minWidth: 0, ...style }}
      title={fullText}
    >
      <style>{`
        @keyframes scroll-name-anim {
          0%, 20% { transform: translateX(0%); }
          80%, 100% { transform: translateX(min(0px, calc(-100% + ${maxPx}px))); }
        }
        .animate-autoscroll-name {
          display: inline-block;
          white-space: nowrap;
          animation: scroll-name-anim 6s ease-in-out infinite alternate;
        }
        .animate-autoscroll-name:hover {
          animation-play-state: paused;
        }
      `}</style>
      <span className={isLong ? "animate-autoscroll-name" : "truncate block"}>
        {prefix ? <span className="font-normal text-slate-400">{prefix} </span> : null}
        <span className="font-semibold text-slate-800">{name}</span>
      </span>
    </div>
  );
}

// Sub-item Checklist Component with instant MongoDB persistence & percentage calculation
function TodoChecklist({ text, task, onUpdated }) {
  const rawLines = text ? text.split('\n').map(l => l.trim()).filter(Boolean) : [];
  const hasDBChecklist = Array.isArray(task?.checklist) && task.checklist.length > 0;

  // Build items array combining DB checklist or multi-line text
  const items = hasDBChecklist
    ? task.checklist.map(c => ({
        title: (c.title || c.text || '').replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
        completed: !!c.completed,
        _id: c._id
      }))
    : rawLines.map((line) => ({
        title: line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
        completed: false
      }));

  const [isExpanded, setIsExpanded] = useState(false);
  const [checkedMap, setCheckedMap] = useState(() => {
    const initial = {};
    items.forEach((item, idx) => {
      if (item.completed) initial[idx] = true;
    });
    return initial;
  });

  // Sync state if task prop updates
  useEffect(() => {
    const nextMap = {};
    items.forEach((item, idx) => {
      if (item.completed) nextMap[idx] = true;
    });
    setCheckedMap(nextMap);
  }, [task?.checklist, task?.updatedAt]);

  const handleToggle = async (idx, e) => {
    if (e) e.stopPropagation();
    const nextState = !checkedMap[idx];
    const newMap = { ...checkedMap, [idx]: nextState };
    setCheckedMap(newMap);

    if (task?._id) {
      try {
        const updatedChecklist = items.map((item, i) => {
          const isChecked = !!newMap[i];
          return {
            title: item.title,
            completed: isChecked,
            completedAt: isChecked ? new Date().toISOString() : null
          };
        });

        // Persist checkbox selection directly into MongoDB via API
        await Promise.all([
          todosAPI.update(task._id, { checklist: updatedChecklist }).catch(() => {}),
          followupsAPI.update(task._id, { checklist: updatedChecklist }).catch(() => {})
        ]);

        if (onUpdated) onUpdated();
      } catch (err) {
        console.error('Failed to update MongoDB checklist item:', err);
      }
    }
  };

  if (items.length === 0) {
    return <span className="text-slate-400 italic text-sm">No description provided</span>;
  }

  const total = items.length;
  const checkedCount = Object.keys(checkedMap).filter(k => checkedMap[k]).length;
  const percent = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const isMultiple = total > 1;
  const hasMore = total > 2;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <style>{`
        .custom-hidden-scroll::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      {/* Sub-items Progress Bar & Percentage calculation */}
      {isMultiple && (
        <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
              <CheckSquare size={13} /> Sub-items Progress
            </span>
            <span className={`px-2 py-0.5 rounded-full font-extrabold text-[11px] ${
              percent === 100 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-indigo-50 text-indigo-700'
            }`}>
              {checkedCount} / {total} ({percent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-400 rounded-full"
              style={{
                width: `${percent}%`,
                background: percent === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #4f46e5)'
              }}
            />
          </div>
        </div>
      )}

      {/* Sub-items Container */}
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => {
          if (!isExpanded && hasMore && idx >= 2) return null;
          const isChecked = !!checkedMap[idx];
          return (
            <div
              key={idx}
              onClick={(e) => handleToggle(idx, e)}
              className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all duration-150 border ${
                isChecked 
                  ? 'bg-emerald-50/60 border-emerald-200/60 text-slate-500' 
                  : 'bg-white border-slate-200/70 hover:border-indigo-300 hover:translate-x-0.5 text-slate-800 shadow-xs'
              }`}
            >
              <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-2 border-slate-300 bg-white'
              }`}>
                {isChecked && <Check size={11} strokeWidth={3.5} />}
              </div>
              <span className={`text-xs font-medium leading-relaxed ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {item.title}
              </span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(prev => !prev);
          }}
          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            isExpanded
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs'
          }`}
        >
          <span>{isExpanded ? 'Show less' : `Show all ${total} tasks (${total - 2} more)`}</span>
          <ChevronDown 
            size={13} 
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
          />
        </button>
      )}
    </div>
  );
}

// Real-world Digital Calendar Left Sidebar Widget (Digital Calendar Architecture & Look)
function RealWorldCalendar({ 
  selectedDate, 
  onSelectDate, 
  taskCountByDate = {}, 
  totalTasksCount = 0,
  tasks = [],
  historyMode = false,
  priorityFilter = 'all',
  onSelectPriority
}) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (tasks && tasks.length > 0) {
      const tWithDate = tasks.find(t => t.scheduledAt || t.dueDate || t.createdAt);
      if (tWithDate) {
        const d = new Date(tWithDate.scheduledAt || tWithDate.dueDate || tWithDate.createdAt);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return new Date();
  });

  // Keep viewDate synced when tasks load or when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) setViewDate(d);
    } else if (tasks && tasks.length > 0) {
      const tWithDate = tasks.find(t => t.scheduledAt || t.dueDate || t.createdAt);
      if (tWithDate) {
        const d = new Date(tWithDate.scheduledAt || tWithDate.dueDate || tWithDate.createdAt);
        if (!isNaN(d.getTime())) setViewDate(d);
      }
    }
  }, [selectedDate, tasks.length]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const miniCalDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const todayKey = getLocalDateKey(today);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow);

  const handleJumpToday = () => {
    setViewDate(new Date());
    onSelectDate(todayKey);
  };

  // Compute days in month and calendar cells (35 or 42 cells)
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // Trailing days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, dayNum);
    cells.push({
      dateObj,
      dayNum,
      isCurrentMonth: false,
      dateKey: getLocalDateKey(dateObj)
    });
  }

  // Days in current month
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const dateObj = new Date(year, month, i);
    cells.push({
      dateObj,
      dayNum: i,
      isCurrentMonth: true,
      dateKey: getLocalDateKey(dateObj)
    });
  }

  // Leading days of next month to complete 35 or 42 cells
  const targetTotal = cells.length > 35 ? 42 : 35;
  const remaining = targetTotal - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const dateObj = new Date(year, month + 1, i);
    cells.push({
      dateObj,
      dayNum: i,
      isCurrentMonth: false,
      dateKey: getLocalDateKey(dateObj)
    });
  }

  // Month scheduled todos count
  const currentMonthTaskCount = useMemo(() => {
    let count = 0;
    cells.forEach(c => {
      if (c.isCurrentMonth && taskCountByDate[c.dateKey]) {
        count += taskCountByDate[c.dateKey];
      }
    });
    return count;
  }, [cells, taskCountByDate]);

  // Overall Task Statistics for Progress Card
  const { highCount, mediumCount, lowCount, doneCount, activeCount, completionPct } = useMemo(() => {
    let high = 0;
    let med = 0;
    let low = 0;
    let done = 0;
    let act = 0;

    tasks.forEach(t => {
      const isDone = t.status === 'done' || t.status === 'completed' || !!t.completedAt;
      if (isDone) {
        done++;
      } else {
        act++;
      }

      const matchMode = historyMode ? isDone : !isDone;
      if (matchMode) {
        const p = (t.priority || 'medium').toLowerCase();
        if (p === 'high') high++;
        else if (p === 'low') low++;
        else med++;
      }
    });

    const total = done + act;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      highCount: high,
      mediumCount: med,
      lowCount: low,
      doneCount: done,
      activeCount: act,
      completionPct: pct
    };
  }, [tasks, historyMode]);

  return (
    <div className="w-full lg:w-[310px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-4">
      {/* ── 1. Digital Calendar Mini Calendar Widget ── */}
      <div 
        className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm relative overflow-hidden"
        style={{
          boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.08)'
        }}
      >
        {/* Month Jump Header */}
        <div className="flex items-center justify-between mb-3.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              {monthNames[month]} {year}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {currentMonthTaskCount} {currentMonthTaskCount === 1 ? 'task' : 'tasks'} this month
            </span>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Filter Pills (All / Today / Tomorrow) */}
        <div className="grid grid-cols-3 gap-1 mb-3">
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
              !selectedDate
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All ({totalTasksCount})
          </button>
          <button
            type="button"
            onClick={handleJumpToday}
            className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
              selectedDate === todayKey
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Today ({taskCountByDate[todayKey] || 0})
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(tomorrowKey)}
            className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
              selectedDate === tomorrowKey
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tomorrow ({taskCountByDate[tomorrowKey] || 0})
          </button>
        </div>

        {/* Weekday Row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1 select-none">
          {miniCalDays.map(day => (
            <span key={day} className="text-[10px] font-semibold text-slate-400 py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Date Matrix */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {cells.map((cell, idx) => {
            const isSelected = selectedDate === cell.dateKey;
            const isToday = cell.dateKey === todayKey;
            const count = taskCountByDate[cell.dateKey] || 0;
            const hasTasks = count > 0;

            return (
              <button
                key={`${cell.dateKey}-${idx}`}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onSelectDate(null);
                  } else {
                    onSelectDate(cell.dateKey);
                    if (!cell.isCurrentMonth) {
                      setViewDate(new Date(cell.dateObj));
                    }
                  }
                }}
                className={`mini-day-cell h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-xs font-medium relative transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md ring-2 ring-sky-500 scale-105 font-bold z-10'
                    : isToday
                    ? 'bg-sky-50 text-sky-700 font-bold ring-2 ring-sky-500'
                    : cell.isCurrentMonth
                    ? 'text-slate-700 hover:bg-slate-100 font-medium'
                    : 'text-slate-300 hover:bg-slate-50'
                }`}
                title={`${cell.dateKey} (${count} todos)`}
              >
                <span className="text-[11px]">{cell.dayNum}</span>

                {/* Digital Calendar Indicator Dot */}
                {hasTasks && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${
                      isSelected
                        ? 'bg-sky-300 ring-1 ring-white'
                        : count > 3
                        ? 'bg-rose-500 ring-1 ring-white'
                        : 'bg-sky-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Mini Calendar Indicator Legend */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium px-1 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span>Scheduled Todos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Heavy (4+)</span>
          </div>
        </div>

        {/* Selected Date Summary & Clear Button */}
        {selectedDate && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-[11px] font-semibold text-sky-700 truncate block">
                Selected: {formatISTDate(selectedDate)}
              </span>
              <span className="text-[10px] text-slate-500 truncate block">
                {taskCountByDate[selectedDate] || 0} todos on this day
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer shrink-0"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Priority & Category Filters (Digital Calendar Style) ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Priority Filters
          </span>
          {priorityFilter && priorityFilter !== 'all' && onSelectPriority && (
            <button
              type="button"
              onClick={() => onSelectPriority('all')}
              className="text-[10px] text-sky-600 font-semibold hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <div className="space-y-1">
          {[
            { id: 'all', label: 'All Priorities', icon: ListTodo, color: 'text-slate-600', count: totalTasksCount },
            { id: 'high', label: 'High Priority', icon: Flame, color: 'text-red-500', count: highCount },
            { id: 'medium', label: 'Medium Priority', icon: Zap, color: 'text-amber-500', count: mediumCount },
            { id: 'low', label: 'Low Priority', icon: Leaf, color: 'text-emerald-500', count: lowCount }
          ].map(p => {
            const active = (priorityFilter || 'all') === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPriority && onSelectPriority(p.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                  <span>{p.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? 'bg-sky-200/70 text-sky-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.count}
                  </span>
                  {active && <Check className="w-3 h-3 text-sky-600" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Performance & Progress Overview Card ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Todo Progress
            </span>
          </div>
          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
            {completionPct}% Done
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* 3 Stats Overview Pills */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="text-[10px] text-slate-400 font-medium">Active</div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">{activeCount}</div>
          </div>
          <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
            <div className="text-[10px] text-emerald-600 font-medium">Done</div>
            <div className="text-xs font-bold text-emerald-700 mt-0.5">{doneCount}</div>
          </div>
          <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-100">
            <div className="text-[10px] text-rose-600 font-medium">Urgent</div>
            <div className="text-xs font-bold text-rose-700 mt-0.5">{highCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Standalone TodoList Main Component
export default function TodoList({ 
  tasks = [], 
  fetchTasks, 
  onEditTask, 
  onCompleteTask, 
  onDeleteTask,
  onDateShift,
  onNewTodo,
  historyMode = false,
  markingId = null,
  deletingId = null,
  priorityFilter: parentPriorityFilter,
  setPriorityFilter: parentSetPriorityFilter,
  resetTrigger = 0
}) {
  const { user: currentUser } = useAuth();
  
  // Default to null (All Todos) so all todos across all dates are immediately visible
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (resetTrigger) {
      setSelectedDate(null);
    }
  }, [resetTrigger]);

  // Pagination: strictly 3 cards per row * 2 rows = 6 cards per page
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [internalPriorityFilter, setInternalPriorityFilter] = useState('all');

  const priorityFilter = (parentPriorityFilter !== undefined && parentPriorityFilter !== '') 
    ? parentPriorityFilter 
    : internalPriorityFilter;
  const setPriorityFilter = parentSetPriorityFilter || setInternalPriorityFilter;

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, priorityFilter, searchQuery, historyMode]);

  // Edit, Delete & Complete Permission Helpers based on MongoDB Auth
  const canComplete = canMarkCompleteTask(currentUser);
  const checkCanEdit = (todo) => canEditTask(todo, currentUser);
  const checkCanDelete = (todo) => canDeleteTask(todo, currentUser);

  // Map of date string -> count of scheduled tasks
  const taskCountByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      // In active mode, do not count completed tasks
      if (!historyMode && (t.status === 'done' || t.status === 'completed' || t.completedAt)) {
        return;
      }
      // In history mode, do not count uncompleted tasks
      if (historyMode && t.status !== 'done' && t.status !== 'completed' && !t.completedAt) {
        return;
      }
      const k = historyMode 
        ? getCompletedTodoDateKey(t)
        : getLocalDateKey(t.scheduledAt || t.dueDate || t.createdAt);
      if (k) {
        map[k] = (map[k] || 0) + 1;
      }
    });
    return map;
  }, [tasks, historyMode]);

  // 1-Click Quick Add Handler
  const handleQuickAdd = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!quickTitle.trim()) {
      if (onNewTodo) {
        onNewTodo();
      }
      return;
    }
    setIsAdding(true);
    try {
      let scheduledTime;
      if (selectedDate) {
        scheduledTime = new Date(`${selectedDate}T09:00:00`).toISOString();
      } else {
        scheduledTime = new Date().toISOString();
      }

      const payload = {
        type: 'todo',
        title: quickTitle.trim(),
        note: quickTitle.trim(),
        description: quickTitle.trim(),
        scheduledAt: scheduledTime,
        priority: quickPriority,
        department: currentUser?.department || '',
        assignedTo: currentUser?._id,
        assignedBy: currentUser?._id,
      };

      // Save via followupsAPI (which fetchTasks reads from) and sync with todosAPI
      await Promise.all([
        followupsAPI.create(payload),
        todosAPI.create(payload).catch(() => {})
      ]);

      setQuickTitle('');
      if (fetchTasks) fetchTasks();
    } catch (err) {
      console.error('Quick Add Todo error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Filtered Todos with date filter
  const filteredTodos = tasks.filter(t => {
    if (priorityFilter !== 'all' && priorityFilter !== '' && t.priority !== priorityFilter) return false;

    // Strict Mode Separation:
    // In Active Mode: NEVER show completed tasks (tasks with done, completed, or completedAt)
    if (!historyMode) {
      if (t.status === 'done' || t.status === 'completed' || t.completedAt) {
        return false;
      }
    }
    // In History Mode: ONLY show completed tasks
    if (historyMode) {
      if (t.status !== 'done' && t.status !== 'completed' && !t.completedAt) {
        return false;
      }
    }

    // Date filter: for a particular date, strictly that particular date's tasks are visible.
    // Previous days' uncompleted todos are NOT carried forward to other days.
    if (selectedDate) {
      if (historyMode) {
        const completedDateKey = getCompletedTodoDateKey(t);
        if (completedDateKey !== selectedDate) {
          return false;
        }
      } else {
        const taskDateKey = getLocalDateKey(t.scheduledAt || t.dueDate || t.createdAt);
        if (taskDateKey !== selectedDate) {
          return false;
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const noteStr = (t.title || t.note || t.description || '').toLowerCase();
      const assigneeStr = (t.assignedTo?.name || '').toLowerCase();
      if (!noteStr.includes(q) && !assigneeStr.includes(q)) return false;
    }

    return true;
  });

  // Sort filtered todos: in history mode, newest completed first; in active mode, earliest due first
  filteredTodos.sort((a, b) => {
    if (historyMode) {
      const timeA = new Date(a.completedAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.completedAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    } else {
      const timeA = new Date(a.scheduledAt || a.dueDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.scheduledAt || b.dueDate || b.createdAt || 0).getTime();
      return timeA - timeB;
    }
  });

  // Total count matching current mode (active vs history)
  const activeModeTasks = useMemo(() => {
    return tasks.filter(t => historyMode 
      ? (t.status === 'done' || t.status === 'completed' || t.completedAt)
      : (t.status !== 'done' && t.status !== 'completed' && !t.completedAt)
    );
  }, [tasks, historyMode]);

  // Pagination calculations: exactly 6 items per page (3 per row * 2 rows)
  const totalPages = Math.max(1, Math.ceil(filteredTodos.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredTodos.length);
  const paginatedTodos = filteredTodos.slice(startIndex, endIndex);

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* 2-Column Main Layout: Left Calendar + Right Todo Content */}
      <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side: Digital Calendar Widget (Mini Calendar + Priority Filters + Progress Card) */}
        <RealWorldCalendar 
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          taskCountByDate={taskCountByDate}
          totalTasksCount={activeModeTasks.length}
          tasks={tasks}
          historyMode={historyMode}
          priorityFilter={priorityFilter}
          onSelectPriority={setPriorityFilter}
        />

        {/* Right Side: Quick Add Todo Bar + Todo Cards (3 per row, 2 rows max) + Pagination */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
          {/* ── Quick Add Todo Bar ─────────────────────────────────────────── */}
          {!historyMode && (
            <form onSubmit={handleQuickAdd} className="bg-white border border-slate-200/90 p-3 rounded-2xl shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-3">
              <input
                type="text"
                placeholder={selectedDate ? `Add Todo for ${formatISTDate(selectedDate)}...` : "Add a new Todo item (e.g. 1. data analytics)..."}
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
              
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 capitalize focus:outline-none focus:border-indigo-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>

              <button
                type="submit"
                disabled={isAdding}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                title={!quickTitle.trim() ? "Click to open New Todo dialog, or type a title to quick-add" : "Create this Todo"}
              >
                <Plus size={15} />
                {isAdding ? 'Creating...' : 'New Todo'}
              </button>
            </form>
          )}

          {/* Active Date Banner when filtered */}
          {selectedDate && (
            <div className="bg-indigo-50/90 border border-indigo-200/90 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                <CalendarCheck2 size={16} className="text-indigo-600" />
                <span>Showing {historyMode ? 'completed todos' : 'todos'} for <strong>{formatISTDate(selectedDate)}</strong> ({filteredTodos.length} {filteredTodos.length === 1 ? 'item' : 'items'})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1 text-indigo-700 hover:text-indigo-950 font-bold bg-white border border-indigo-200 px-2.5 py-1 rounded-lg text-[11px] shadow-2xs hover:bg-indigo-100/50 transition-all cursor-pointer"
              >
                <X size={12} /> Show All Dates
              </button>
            </div>
          )}

          {/* ── Todo Items Cards Grid ───────────────────────────────────────── */}
          {filteredTodos.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
              <ListTodo size={40} className="mx-auto text-slate-300 mb-3" />
              <h4 className="text-base font-semibold text-slate-700">
                {historyMode ? 'No Completed Todos Found' : 'No Todo Items Found'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {selectedDate 
                  ? (historyMode 
                      ? `There are no completed todos recorded for ${formatISTDate(selectedDate)}.` 
                      : `There are no active todos scheduled for ${formatISTDate(selectedDate)}.`)
                  : (historyMode 
                      ? "There are no completed todos matching your current criteria." 
                      : "There are no active todos matching your current criteria.")}
              </p>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="mt-3 text-xs font-semibold px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200 cursor-pointer"
                >
                  Show All Dates ({tasks.length} total)
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Strictly 3 cards per row, 2 rows max (up to 6 cards on the page) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedTodos.map(t => {
            const isLate = t.status === 'upcoming' && new Date(t.scheduledAt) < new Date();
            const assigneeObj = t.assignedTo || t.assignee;
            const assigneeName = assigneeObj?.name || 'Me';
            const assignedByObj = t.assignedBy;
            const assignedByName = (assignedByObj?.name || assignedByObj) === 'all' ? 'All' : (assignedByObj?.name || '');

            return (
              <div
                key={t._id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-lg transition-all duration-200 relative ${
                  isLate ? 'border-red-200/90 shadow-red-50' : 'border-slate-200/80 hover:border-indigo-300'
                }`}
              >
                {/* Card Top: Assignee & Priority */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar user={assigneeObj} nameFallback={assigneeName} size={36} />
                    <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                      <AutoScrollName name={assigneeName} className="text-xs font-bold text-slate-900" maxPx={130} />
                      {assignedByName && (
                        <AutoScrollName prefix="Reporting to:" name={assignedByName} className="text-[11px] font-medium text-slate-500" maxPx={130} />
                      )}
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1.5 capitalize ${
                    t.priority === 'high' 
                      ? 'bg-red-50 text-red-600 border-red-200' 
                      : t.priority === 'medium'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {t.priority === 'high' ? (
                      <><Flame size={12} className="text-red-500 flex-shrink-0" /> High</>
                    ) : t.priority === 'medium' ? (
                      <><Zap size={12} className="text-amber-500 flex-shrink-0" /> Medium</>
                    ) : (
                      <><Leaf size={12} className="text-emerald-500 flex-shrink-0" /> Low</>
                    )}
                  </span>
                </div>



                {/* Center Description / Checklist */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 min-h-[70px]">
                  <TodoChecklist 
                    text={t.title || t.note || t.description || ''} 
                    task={t} 
                    onUpdated={fetchTasks}
                  />
                </div>

                {/* Completion Audit Log Badge for Completed History */}
                {(historyMode || t.status === 'done' || t.status === 'completed') && (
                  <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-2.5 flex items-center gap-2 text-xs font-medium text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Completed {t.completedAt ? formatIST(t.completedAt) : 'Recently'}</span>
                    {t.completedBy && (
                      <span className="font-bold ml-auto text-emerald-900">by {t.completedBy.name || 'User'}</span>
                    )}
                  </div>
                )}

                {/* Card Footer: Due Date & Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar size={13} className="text-indigo-500" />
                      {t.scheduledAt ? formatIST(t.scheduledAt) : 'No due date'}
                    </span>

                    {isLate && (
                      <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle size={11} /> Overdue
                      </span>
                    )}
                  </div>

                  {/* Actions Buttons Toolbar */}
                  {(canComplete || checkCanEdit(t) || checkCanDelete(t)) && (
                    <div className="flex items-center gap-2">
                      {canComplete && t.status !== 'done' && t.status !== 'completed' && (
                        <button
                          onClick={() => onCompleteTask && onCompleteTask(t._id)}
                          disabled={markingId === t._id}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs py-2 px-3 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          {markingId === t._id ? 'Saving...' : 'Mark Complete'}
                        </button>
                      )}

                      {/* Edit Button */}
                      {checkCanEdit(t) && (
                        <button
                          onClick={() => onEditTask && onEditTask(t)}
                          className="bg-white border border-slate-200 text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                          title="Edit Todo"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}

                      {/* Delete Button */}
                      {checkCanDelete(t) && (
                        <button
                          onClick={() => onDeleteTask && onDeleteTask(t._id)}
                          disabled={deletingId === t._id}
                          className="bg-red-50 border border-red-200 text-red-600 p-2 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="Delete Todo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
                })}
              </div>

              {/* ── Next / Previous Pagination Controls (Visible if more than 6 todos) ── */}
              {filteredTodos.length > 6 && (
                <div className="flex items-center justify-between w-full bg-white border border-slate-200/90 rounded-2xl px-5 py-3 shadow-xs mt-1">
                  {/* Left side: Previous button */}
                  <button
                    type="button"
                    disabled={validPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                    <span>Previous</span>
                  </button>

                  {/* Middle: 1 / .. like this */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-sm shadow-2xs">
                      {validPage} / {totalPages}
                    </span>
                  </div>

                  {/* Right side: Next button */}
                  <button
                    type="button"
                    disabled={validPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
