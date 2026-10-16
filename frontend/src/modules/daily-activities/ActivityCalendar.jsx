import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import CalendarStatusLegend from './CalendarStatusLegend';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function ActivityCalendar({
  selectedDate,
  onSelectDate,
  currentMonth,
  onChangeMonth,
  calendarDays = [],
  loading = false,
  isDirty = false,
}) {
  // Parse currentMonth string "YYYY-MM"
  const [yearStr, monthStr] = (currentMonth || new Date().toISOString().slice(0, 7)).split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  const monthDate = new Date(year, month, 1);
  const monthTitle = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

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
    const prev = new Date(year, month - 1, 1);
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${prev.getFullYear()}-${m}`);
  };

  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    const m = String(next.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${next.getFullYear()}-${m}`);
  };

  const jumpToToday = () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (ym !== currentMonth) {
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

  const renderStatusDot = (status) => {
    if (status === 'submitted' || status === 'reviewed') {
      return <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-400" title="Submitted" />;
    }
    if (status === 'draft') {
      return <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs shadow-amber-400" title="Draft" />;
    }
    if (status === 'needs_correction') {
      return <span className="w-2 h-2 rounded-full bg-orange-500 shadow-xs shadow-orange-500 animate-pulse" title="Needs Correction" />;
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
    return { submitted, draft, needsCorrection, total: submitted + draft + needsCorrection };
  }, [statusMap]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col gap-4">
      {/* Month Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-sky-600" />
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">{monthTitle}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="px-2 py-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition border border-sky-200 flex items-center gap-1"
            title="Jump to Today"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Today</span>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div
            key={day}
            className={`text-[11px] font-extrabold uppercase py-1 ${
              idx === 0 || idx === 6 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading empty cells */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10 rounded-xl" />
        ))}

        {/* Days of current month */}
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
              className={`h-11 rounded-xl flex flex-col items-center justify-between py-1.5 transition relative group cursor-pointer ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-400 font-bold'
                  : isToday
                  ? 'bg-sky-50 text-sky-800 font-bold border border-sky-300 hover:bg-sky-100'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title={`${dateStr}${dayStatus ? ` • Status: ${dayStatus}` : ''}${callsLogged ? ` • Calls: ${callsLogged}` : ''}`}
            >
              <span className="text-xs">{dayNum}</span>
              <div className="flex items-center justify-center">
                {isSelected ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                ) : (
                  renderStatusDot(dayStatus)
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Month Quick Summary */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Submitted</div>
          <div className="text-sm font-extrabold text-emerald-800">{monthStats.submitted}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-2 border border-amber-100">
          <div className="text-[10px] font-bold text-amber-700 uppercase">Drafts</div>
          <div className="text-sm font-extrabold text-amber-800">{monthStats.draft}</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-2 border border-orange-100">
          <div className="text-[10px] font-bold text-orange-700 uppercase">Correction</div>
          <div className="text-sm font-extrabold text-orange-800">{monthStats.needsCorrection}</div>
        </div>
      </div>

      {/* Status Legend */}
      <CalendarStatusLegend />
    </div>
  );
}
