import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  CheckCircle2,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import CalendarStatusLegend from './CalendarStatusLegend';

const DAYS_OF_WEEK = [
  { short: 'Su', full: 'Sunday', weekend: true },
  { short: 'Mo', full: 'Monday' },
  { short: 'Tu', full: 'Tuesday' },
  { short: 'We', full: 'Wednesday' },
  { short: 'Th', full: 'Thursday' },
  { short: 'Fr', full: 'Friday' },
  { short: 'Sa', full: 'Saturday', weekend: true },
];

export default function ActivityCalendar({
  selectedDate,
  onSelectDate,
  currentMonth,
  onChangeMonth,
  calendarDays = [],
  loading = false,
  isDirty = false,
}) {
  const [direction, setDirection] = useState(0);

  // Parse currentMonth string "YYYY-MM"
  const [yearStr, monthStr] = (currentMonth || new Date().toISOString().slice(0, 7)).split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  const monthDate = new Date(year, month, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long' });
  const yearFormatted = monthDate.getFullYear();

  // Map of activityDate -> { status, callsAttempted }
  const statusMap = useMemo(() => {
    const map = {};
    if (Array.isArray(calendarDays)) {
      calendarDays.forEach((item) => {
        if (item && item.date) {
          map[item.date] = item;
        }
      });
    }
    return map;
  }, [calendarDays]);

  // Generate calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const todayStr = new Date().toISOString().slice(0, 10);

  const prevMonth = () => {
    setDirection(-1);
    const prev = new Date(year, month - 1, 1);
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${prev.getFullYear()}-${m}`);
  };

  const nextMonth = () => {
    setDirection(1);
    const next = new Date(year, month + 1, 1);
    const m = String(next.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${next.getFullYear()}-${m}`);
  };

  const jumpToToday = () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (ym !== currentMonth) {
      setDirection(ym > currentMonth ? 1 : -1);
      onChangeMonth(ym);
    }
    handleDateClick(todayStr);
  };

  const handleDateClick = (dateStr) => {
    if (dateStr === selectedDate) return;
    if (isDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes on the current activity form. Do you want to switch dates without saving?'
      );
      if (!confirmLeave) return;
    }
    onSelectDate(dateStr);
  };

  const renderStatusDot = (status, isSelected) => {
    if (isSelected) {
      return (
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      );
    }
    if (status === 'submitted' || status === 'reviewed') {
      return (
        <span
          className="w-2 h-2 rounded-full bg-emerald-500"
          title="Submitted / Approved"
        />
      );
    }
    if (status === 'draft') {
      return (
        <span
          className="w-2 h-2 rounded-full bg-amber-400"
          title="Draft Saved"
        />
      );
    }
    if (status === 'needs_correction') {
      return (
        <span
          className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
          title="Correction Requested"
        />
      );
    }
    return <span className="w-1.5 h-1.5 rounded-full bg-slate-200" title="No Report" />;
  };

  // Month Statistics
  const monthStats = useMemo(() => {
    let submitted = 0;
    let draft = 0;
    let needsCorrection = 0;

    Object.values(statusMap).forEach((st) => {
      if (st.status === 'submitted' || st.status === 'reviewed') submitted++;
      else if (st.status === 'draft') draft++;
      else if (st.status === 'needs_correction') needsCorrection++;
    });

    const completionRate = daysInMonth > 0 ? Math.round((submitted / daysInMonth) * 100) : 0;

    return {
      submitted,
      draft,
      needsCorrection,
      completionRate,
    };
  }, [statusMap, daysInMonth]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Main Calendar Card — Clean and Neat */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-4 relative">
        {/* Top Header: Month, Year, Navigation Buttons */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-600">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-800 text-base sm:text-lg tracking-tight">
                  {monthName}
                </span>
                <span className="font-bold text-sky-600 text-base sm:text-lg">
                  {yearFormatted}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                {monthStats.submitted} days approved
              </p>
            </div>
          </div>

          {/* Month Controls — Clean and Flat */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={jumpToToday}
              className="px-3 py-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors border border-sky-200 flex items-center gap-1.5 cursor-pointer"
              title="Jump to Today"
            >
              <RotateCcw className="w-3 h-3 text-sky-500" />
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={nextMonth}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS_OF_WEEK.map((d) => (
            <div
              key={d.short}
              className={`text-[11px] font-bold uppercase py-1 rounded-lg ${
                d.weekend ? 'text-rose-400 font-extrabold' : 'text-slate-400'
              }`}
              title={d.full}
            >
              {d.short}
            </div>
          ))}
        </div>

        {/* Calendar Grid — Clean, Steady, No Hover Jumping */}
        <div className="relative min-h-[250px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMonth}
              initial={{ opacity: 0, x: direction * 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -15 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-7 gap-1.5"
            >
              {/* Empty leading cells */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-11 rounded-2xl" />
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayStr = String(dayNum).padStart(2, '0');
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${dayStr}`;

                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const dayStatus = statusMap[dateStr]?.status;
                const callsLogged = statusMap[dateStr]?.callsAttempted;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDateClick(dateStr)}
                    className={`h-11 rounded-2xl flex flex-col items-center justify-between py-1.5 px-1 transition-colors relative cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-extrabold shadow-sm ring-2 ring-sky-300 ring-offset-1 z-10'
                        : isToday
                        ? 'bg-sky-50 text-sky-800 font-bold border-2 border-sky-400 hover:bg-sky-100'
                        : 'text-slate-700 bg-slate-50/60 hover:bg-slate-100 border border-slate-100'
                    }`}
                    title={`${dateStr}${dayStatus ? ` • Status: ${dayStatus}` : ''}${
                      callsLogged ? ` • Calls: ${callsLogged}` : ''
                    }`}
                  >
                    <span
                      className={`text-[12px] leading-tight ${
                        isSelected ? 'font-black text-white' : isToday ? 'font-bold' : 'font-semibold'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <div className="flex items-center justify-center h-2.5">
                      {renderStatusDot(dayStatus, isSelected)}
                    </div>

                    {/* Today indicator dot in corner */}
                    {isToday && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-500" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 2. Month KPI Stats Grid — Clean Flat Style */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          {/* Approved / Submitted */}
          <div className="bg-emerald-50/70 rounded-2xl p-2.5 border border-emerald-200 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Approved</span>
            </div>
            <div className="text-base font-black text-emerald-800">
              <AnimatedNumber value={monthStats.submitted} />
            </div>
          </div>

          {/* Drafts */}
          <div className="bg-amber-50/70 rounded-2xl p-2.5 border border-amber-200 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">
              <FileText className="w-3 h-3 text-amber-600" />
              <span>Drafts</span>
            </div>
            <div className="text-base font-black text-amber-800">
              <AnimatedNumber value={monthStats.draft} />
            </div>
          </div>

          {/* Correction */}
          <div className="bg-rose-50/70 rounded-2xl p-2.5 border border-rose-200 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-0.5">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              <span>Review</span>
            </div>
            <div className="text-base font-black text-rose-800">
              <AnimatedNumber value={monthStats.needsCorrection} />
            </div>
          </div>
        </div>

        {/* Monthly Submission Rate Bar */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
              <span>Monthly Consistency</span>
            </span>
            <span className="text-sky-700 font-extrabold">{monthStats.completionRate}%</span>
          </div>
          <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, monthStats.completionRate)}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
            />
          </div>
        </div>

        {/* Status Legend */}
        <CalendarStatusLegend />
      </div>
    </div>
  );
}
