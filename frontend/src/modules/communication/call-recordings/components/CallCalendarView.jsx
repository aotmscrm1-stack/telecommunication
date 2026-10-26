import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOff, 
  CheckCircle2, 
  User, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatISTDate, formatISTTime } from '../../../../utils/dateFormat';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CallCalendarView({
  selectedDate,
  onSelectDate,
  calendarActivity = {},
  activityData,
  recordings = [],
  loading = false,
  onOpenCallDetail
}) {
  const effectiveActivity = activityData || calendarActivity || {};
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'day' | 'agenda'
  const [activeMonthDate, setActiveMonthDate] = useState(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });
  const [hoveredDay, setHoveredDay] = useState(null);

  const year = activeMonthDate.getFullYear();
  const month = activeMonthDate.getMonth(); // 0-indexed

  // Navigation handlers
  const handlePrev = () => {
    if (currentView === 'month') {
      setActiveMonthDate(new Date(year, month - 1, 1));
    } else if (currentView === 'week') {
      const prevWeek = new Date(activeMonthDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setActiveMonthDate(prevWeek);
    } else {
      const prevDay = new Date(activeMonthDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setActiveMonthDate(prevDay);
      const dayStr = prevDay.toISOString().slice(0, 10);
      onSelectDate(dayStr);
    }
  };

  const handleNext = () => {
    if (currentView === 'month') {
      setActiveMonthDate(new Date(year, month + 1, 1));
    } else if (currentView === 'week') {
      const nextWeek = new Date(activeMonthDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setActiveMonthDate(nextWeek);
    } else {
      const nextDay = new Date(activeMonthDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setActiveMonthDate(nextDay);
      const dayStr = nextDay.toISOString().slice(0, 10);
      onSelectDate(dayStr);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setActiveMonthDate(today);
    const dayStr = today.toISOString().slice(0, 10);
    onSelectDate(dayStr);
  };

  const handleDatePicker = (e) => {
    const val = e.target.value;
    if (val) {
      const d = new Date(val);
      setActiveMonthDate(d);
      onSelectDate(val);
    }
  };

  // Month grid calculation
  const monthGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dayStr = prevDate.toISOString().slice(0, 10);
      grid.push({
        dayNum,
        dayStr,
        isCurrentMonth: false,
        isPrevMonth: true,
        dateObj: prevDate
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateObj = new Date(year, month, dayNum);
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dayStr = `${year}-${mStr}-${dStr}`;
      grid.push({
        dayNum,
        dayStr,
        isCurrentMonth: true,
        dateObj
      });
    }

    // Trailing days from next month
    const remaining = (7 - (grid.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dayStr = nextDate.toISOString().slice(0, 10);
      grid.push({
        dayNum,
        dayStr,
        isCurrentMonth: false,
        isNextMonth: true,
        dateObj: nextDate
      });
    }

    return grid;
  }, [year, month]);

  // Week days calculation
  const weekDays = useMemo(() => {
    const curr = new Date(activeMonthDate);
    const dayOfWeek = curr.getDay();
    const startOfWeek = new Date(curr);
    startOfWeek.setDate(curr.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dayStr = d.toISOString().slice(0, 10);
      days.push({
        dayName: WEEKDAYS[i],
        dayNum: d.getDate(),
        dayStr,
        dateObj: d,
        isToday: dayStr === new Date().toISOString().slice(0, 10)
      });
    }
    return days;
  }, [activeMonthDate]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthName = activeMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
      padding: '14px 16px',
      marginBottom: '10px',
      position: 'relative'
    }}>
      {/* ── REACT BITS INSPIRED CALENDAR HEADER & FLOATING CONTROLS ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        paddingBottom: '10px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        {/* Left: Title & Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.15)'
          }}>
            <CalendarIcon style={{ width: '14px', height: '14px' }} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {currentView === 'day' 
                ? formatISTDate(activeMonthDate) 
                : currentView === 'week' 
                  ? `Week of ${formatISTDate(weekDays[0].dateObj)}` 
                  : monthName}
            </h2>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>
              {selectedDate ? `Selected: ${selectedDate}` : 'Click any date to filter'}
            </div>
          </div>
        </div>

        {/* Right: Floating Mode Pill & Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          {/* Animated View Mode Pills */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { id: 'month', label: 'Month' },
              { id: 'week', label: 'Week' },
              { id: 'day', label: 'Day' },
              { id: 'agenda', label: 'Agenda' },
            ].map(v => {
              const active = currentView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setCurrentView(v.id)}
                  style={{
                    border: 'none',
                    padding: '4px 9px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0284c7' : '#64748b',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleToday}
            style={{
              padding: '4px 9px',
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '11px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Today
          </motion.button>

          {/* Previous / Next chevrons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
              whileTap={{ scale: 0.94 }}
              onClick={handlePrev}
              title="Previous"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569'
              }}
            >
              <ChevronLeft style={{ width: '13px', height: '13px' }} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
              whileTap={{ scale: 0.94 }}
              onClick={handleNext}
              title="Next"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569'
              }}
            >
              <ChevronRight style={{ width: '13px', height: '13px' }} />
            </motion.button>
          </div>

          {/* Direct Date Picker Jump */}
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              value={selectedDate || ''}
              onChange={handleDatePicker}
              title="Jump to date"
              style={{
                padding: '3px 6px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                color: '#475569',
                cursor: 'pointer',
                background: '#ffffff',
                outline: 'none'
              }}
            />
          </div>

          {/* Clear Selected Date */}
          {selectedDate && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectDate(null)}
              style={{
                padding: '3px 8px',
                borderRadius: '9999px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Clear
            </motion.button>
          )}
        </div>
      </div>

      {/* ── 1. MONTH VIEW (REACT BITS COMPACT GLOW GRID) ── */}
      {currentView === 'month' && (
        <div style={{ marginTop: '8px' }}>
          {/* Weekday Labels Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '3px',
            marginBottom: '4px',
            textAlign: 'center'
          }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#94a3b8',
                padding: '2px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid (Interactive micro-cards) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '3px'
          }}>
            {monthGrid.map((cell) => {
              const isSelected = selectedDate === cell.dayStr;
              const isToday = cell.dayStr === todayStr;
              const act = effectiveActivity[cell.dayStr];
              const totalCount = act ? (act.total || act.count || 0) : 0;
              const completedCount = act ? (act.completed || 0) : 0;
              const missedCount = act ? (act.missed || 0) : 0;
              const hasActivity = totalCount > 0;

              return (
                <motion.div
                  key={cell.dayStr}
                  whileHover={{ y: -1, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onMouseEnter={() => setHoveredDay(cell.dayStr)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => {
                    onSelectDate(isSelected ? null : cell.dayStr);
                  }}
                  style={{
                    minHeight: '42px',
                    padding: '3px 4px',
                    borderRadius: '7px',
                    border: isSelected
                      ? '2px solid #0284c7'
                      : isToday
                        ? '1.5px solid #93c5fd'
                        : '1px solid #f1f5f9',
                    background: isSelected
                      ? '#eff6ff'
                      : !cell.isCurrentMonth
                        ? '#fafafa'
                        : isToday
                          ? '#f8fafc'
                          : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected
                      ? '0 2px 8px rgba(2, 132, 199, 0.2)'
                      : 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                    opacity: cell.isCurrentMonth ? 1 : 0.35,
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: isToday || isSelected ? 600 : 500,
                      color: isSelected ? '#0284c7' : isToday ? '#2563eb' : '#334155',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: isSelected ? '#dbeafe' : isToday ? '#e0f2fe' : 'transparent'
                    }}>
                      {cell.dayNum}
                    </span>

                    {/* Total call count badge */}
                    {hasActivity && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 500,
                        padding: '0 3px',
                        borderRadius: '3px',
                        background: isSelected ? '#bae6fd' : '#e0f2fe',
                        color: '#0369a1',
                        lineHeight: '12px'
                      }}>
                        {totalCount}
                      </span>
                    )}
                  </div>

                  {/* Micro Glowing Indicators */}
                  {hasActivity ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                      {completedCount > 0 && (
                        <span
                          title={`${completedCount} Connected`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: '8px',
                            fontWeight: 500,
                            color: '#15803d'
                          }}
                        >
                          <span style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: '#10b981',
                            boxShadow: '0 0 5px rgba(16, 185, 129, 0.6)'
                          }} />
                          {completedCount}
                        </span>
                      )}

                      {missedCount > 0 && (
                        <span
                          title={`${missedCount} Missed`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: '8px',
                            fontWeight: 500,
                            color: '#c2410c'
                          }}
                        >
                          <span style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: '#f59e0b',
                            boxShadow: '0 0 5px rgba(245, 158, 11, 0.6)'
                          }} />
                          {missedCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ height: '2px' }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. WEEK VIEW (REFINED) ── */}
      {currentView === 'week' && (
        <div style={{ marginTop: '10px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px'
          }}>
            {weekDays.map((d) => {
              const isSelected = selectedDate === d.dayStr;
              const act = effectiveActivity[d.dayStr] || { total: 0, completed: 0, missed: 0 };
              const dayRecordings = recordings.filter(r => (r.callDate === d.dayStr || (r.recordedAt && r.recordedAt.slice(0, 10) === d.dayStr)));

              return (
                <div
                  key={d.dayStr}
                  onClick={() => onSelectDate(isSelected ? null : d.dayStr)}
                  style={{
                    minHeight: '160px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #0284c7' : d.isToday ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ textAlign: 'center', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 500, color: '#64748b' }}>{d.dayName}</div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isSelected ? '#0284c7' : '#0f172a',
                      marginTop: '1px'
                    }}>
                      {d.dayNum}
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                      {act.total || act.count || 0} calls
                    </div>
                  </div>

                  {/* Day Call List Preview */}
                  <div style={{ flex: 1, overflowY: 'auto', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {dayRecordings.slice(0, 3).map(r => (
                      <div
                        key={r._id || r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenCallDetail) onOpenCallDetail(r);
                        }}
                        style={{
                          background: '#f8fafc',
                          padding: '4px 6px',
                          borderRadius: '5px',
                          border: '1px solid #f1f5f9',
                          fontSize: '9px'
                        }}
                      >
                        <div style={{ fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.leadName || r.phone || 'Call'}
                        </div>
                        <div style={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}>
                          <span>{r.callTime || '—'}</span>
                          <span style={{ color: r.callStatus === 'missed' ? '#ea580c' : '#16a34a', fontWeight: 500 }}>
                            {r.callStatus || 'completed'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {dayRecordings.length > 3 && (
                      <div style={{ textAlign: 'center', fontSize: '8px', color: '#0284c7', fontWeight: 500 }}>
                        +{dayRecordings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. DAY VIEW ── */}
      {currentView === 'day' && (
        <div style={{ marginTop: '10px' }}>
          <div style={{
            background: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                Hourly Call Activity: {formatISTDate(activeMonthDate)}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                {recordings.length} calls
              </span>
            </div>
            <button
              onClick={() => onSelectDate(activeMonthDate.toISOString().slice(0, 10))}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Filter to this Day
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
            {recordings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '12px' }}>
                No calls recorded on this date.
              </div>
            ) : (
              recordings.map((r) => (
                <div
                  key={r._id || r.id}
                  onClick={() => onOpenCallDetail && onOpenCallDetail(r)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0284c7'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: r.callStatus === 'missed' ? '#fff7ed' : '#f0fdf4',
                      color: r.callStatus === 'missed' ? '#ea580c' : '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {r.callStatus === 'missed' ? <PhoneOff style={{ width: '13px', height: '13px' }} /> : <PhoneCall style={{ width: '13px', height: '13px' }} />}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: '#0f172a' }}>
                        {r.leadName || 'Contact'} {r.phone ? `• ${r.phone}` : ''}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                        Agent: {r.userName || 'Assigned Agent'} {r.duration ? `• ${r.duration}s` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#334155' }}>
                      {r.callTime || formatISTTime(r.recordedAt)}
                    </div>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: r.callStatus === 'missed' ? '#ffedd5' : '#dcfce7',
                      color: r.callStatus === 'missed' ? '#c2410c' : '#15803d'
                    }}>
                      {r.callStatus || 'completed'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 4. AGENDA VIEW ── */}
      {currentView === 'agenda' && (
        <div style={{ marginTop: '10px', maxHeight: '350px', overflowY: 'auto' }}>
          {recordings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '12px' }}>
              No call history found for the current agenda range.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recordings.map((r) => (
                <div
                  key={r._id || r.id}
                  onClick={() => onOpenCallDetail && onOpenCallDetail(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#0284c7'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7', minWidth: '75px' }}>
                      {r.callDate || formatISTDate(r.recordedAt)}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        {r.leadName || r.phone || 'Call Session'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                        Caller: {r.userName || 'Employee'} • {r.callTime || formatISTTime(r.recordedAt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 500,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: r.callStatus === 'missed' ? '#fee2e2' : '#ecfdf5',
                      color: r.callStatus === 'missed' ? '#b91c1c' : '#047857'
                    }}>
                      {r.callStatus || 'completed'}
                    </span>
                    <button
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
