import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, trackingAPI } from '../services/api';
import LiveMap from '../components/tracking/LiveMap';

const GRADIENT = 'var(--btn-gradient, linear-gradient(90deg, #ffb37c 0%, #38bdf8 100%))';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';

// Helper to get local date (YYYY-MM-DD)
function getTodayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format date display (e.g. "18-09-2026")
function formatDateDisplay(isoStr) {
  if (!isoStr) return '—';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoStr;
}

// Helper to format friendly header date (e.g. "Friday, 18 September 2026")
function formatHeaderDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AttendanceRecords() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Date and filter states
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [startDate, setStartDate] = useState(getTodayIso());
  const [endDate, setEndDate] = useState(getTodayIso());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ON_DUTY, COMPLETED, NOT_STARTED, INCOMPLETE

  // Data states
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    currentlyOnDuty: 0,
    completedAttendance: 0,
    incompleteAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Modals state
  const [detailModalRecord, setDetailModalRecord] = useState(null);
  const [historyModalEmployee, setHistoryModalEmployee] = useState(null);
  const [employeeHistoryData, setEmployeeHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mapModalRecord, setMapModalRecord] = useState(null);

  // Fetch summary and records for selected date / filters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (isRangeMode) {
        params.fromDate = startDate;
        params.toDate = endDate;
      } else {
        params.date = selectedDate;
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const [summaryRes, recordsRes] = await Promise.allSettled([
        attendanceAPI.getSummary({ date: isRangeMode ? endDate : selectedDate }),
        attendanceAPI.getRecords(params),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.ok) {
        setSummary(summaryRes.value.data.summary);
      }
      if (recordsRes.status === 'fulfilled' && recordsRes.value.data?.ok) {
        setRecords(recordsRes.value.data.records || []);
      }
    } catch (err) {
      console.error('[AttendanceRecords Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isRangeMode, startDate, endDate, statusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date navigation handlers
  const handlePrevDay = () => {
    const cur = new Date(selectedDate + 'T00:00:00');
    cur.setDate(cur.getDate() - 1);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate + 'T00:00:00');
    cur.setDate(cur.getDate() + 1);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleToday = () => {
    setSelectedDate(getTodayIso());
  };

  // Export CSV handler
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {};
      if (isRangeMode) {
        params.fromDate = startDate;
        params.toDate = endDate;
      } else {
        params.date = selectedDate;
      }
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await attendanceAPI.exportCSV(params);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AOTMS_Attendance_${isRangeMode ? `${startDate}_to_${endDate}` : selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export CSV Error]:', err);
      alert('Failed to export attendance records: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  // Load individual employee history modal
  const handleOpenEmployeeHistory = async (empId) => {
    try {
      setHistoryLoading(true);
      setHistoryModalEmployee(empId);
      const res = await attendanceAPI.getEmployeeHistory(empId);
      if (res.data?.ok) {
        setEmployeeHistoryData(res.data);
      }
    } catch (err) {
      console.error('[Employee History Fetch Error]:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filtered records client-side check if needed
  const filteredRecords = useMemo(() => {
    return records;
  }, [records]);

  // Status badge style helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ON_DUTY':
        return {
          bg: '#ecfdf5',
          color: '#059669',
          border: '#a7f3d0',
          dot: '#10b981',
          label: 'On Duty',
          icon: '🟢',
        };
      case 'COMPLETED':
        return {
          bg: '#eff6ff',
          color: '#2563eb',
          border: '#bfdbfe',
          dot: '#3b82f6',
          label: 'Completed',
          icon: '✅',
        };
      case 'INCOMPLETE':
        return {
          bg: '#fff7ed',
          color: '#c2410c',
          border: '#fed7aa',
          dot: '#f97316',
          label: 'Incomplete',
          icon: '⚠️',
        };
      case 'NOT_STARTED':
      default:
        return {
          bg: '#f1f5f9',
          color: '#64748b',
          border: '#e2e8f0',
          dot: '#94a3b8',
          label: 'Not Started',
          icon: '⚪',
        };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── 1. Top Header & Title Bar ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: '#ffffff',
          padding: '18px 24px',
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#059669',
            }}
          >
            📋
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT_MAIN }}>
              Employee Attendance Records
            </h2>
            <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📅 {isRangeMode ? `${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}` : formatHeaderDate(selectedDate)}</span>
              {!isRangeMode && selectedDate === getTodayIso() && (
                <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>
                  Today
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions: Date Picker & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Single Date vs Range Toggle */}
          <button
            onClick={() => setIsRangeMode(!isRangeMode)}
            style={{
              background: isRangeMode ? '#e0f2fe' : '#f8fafc',
              color: isRangeMode ? '#0369a1' : '#475569',
              border: `1px solid ${isRangeMode ? '#bae6fd' : BORDER}`,
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isRangeMode ? '📆 Date Range Active' : '🗓️ Date Range'}
          </button>

          {!isRangeMode ? (
            /* Day Navigator */
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '2px' }}>
              <button
                onClick={handlePrevDay}
                title="Previous Day"
                style={{ background: 'none', border: 'none', padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                ◀ Prev Day
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  border: 'none',
                  background: '#ffffff',
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: TEXT_MAIN,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <button
                onClick={handleNextDay}
                title="Next Day"
                style={{ background: 'none', border: 'none', padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                Next Day ▶
              </button>
              <button
                onClick={handleToday}
                style={{
                  background: selectedDate === getTodayIso() ? '#e2e8f0' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  margin: '0 4px',
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#334155',
                }}
              >
                Today
              </button>
            </div>
          ) : (
            /* Date Range Picker */
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 8px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: 'none', background: '#ffffff', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: TEXT_MAIN }}
              />
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: 'none', background: '#ffffff', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: TEXT_MAIN }}
              />
            </div>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            style={{
              background: '#ffffff',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: exporting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            {exporting ? 'Exporting...' : '📥 Export CSV'}
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            title="Refresh Attendance Data"
            style={{
              background: '#ffffff',
              color: '#334155',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── 2. Dashboard Summary KPI Cards (5 Cards) ───────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
        }}
      >
        {/* Card 1: Total Employees */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            👥
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>
              Total Employees
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: TEXT_MAIN, marginTop: 2 }}>
              {summary.totalEmployees}
            </div>
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: '#0284c7',
            }}
          >
            📅
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
              Present Today
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
              {summary.presentToday}
            </div>
          </div>
        </div>

        {/* Card 3: Currently On Duty */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: '#059669',
            }}
          >
            🟢
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
              Currently On Duty
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 2 }}>
              {summary.currentlyOnDuty}
            </div>
          </div>
        </div>

        {/* Card 4: Completed Attendance */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: '#2563eb',
            }}
          >
            ✅
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
              Completed
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
              {summary.completedAttendance}
            </div>
          </div>
        </div>

        {/* Card 5: Incomplete Attendance */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#fff7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: '#c2410c',
            }}
          >
            ⚠️
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>
              Incomplete / Open
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#c2410c', marginTop: 2 }}>
              {summary.incompleteAttendance}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Section ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#f8fafc',
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: '8px 14px',
            minWidth: 280,
            flex: '1 1 300px',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by employee name, employee ID, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13,
              width: '100%',
              color: TEXT_MAIN,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Status' },
            { key: 'ON_DUTY', label: '🟢 On Duty' },
            { key: 'COMPLETED', label: '✅ Completed' },
            { key: 'NOT_STARTED', label: '⚪ Not Started' },
            { key: 'INCOMPLETE', label: '⚠️ Incomplete' },
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === pill.key ? '#0284c7' : '#f8fafc',
                color: statusFilter === pill.key ? '#ffffff' : '#475569',
                border: `1px solid ${statusFilter === pill.key ? '#0284c7' : BORDER}`,
                transition: 'all 0.15s',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Main Attendance Records Table ─────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: '#f8fafc',
                  borderBottom: `1px solid ${BORDER}`,
                  color: TEXT_MUTED,
                  fontWeight: 700,
                  fontSize: 11.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '14px 18px' }}>Employee Name</th>
                <th style={{ padding: '14px 14px' }}>Employee ID</th>
                <th style={{ padding: '14px 14px' }}>Date</th>
                <th style={{ padding: '14px 14px' }}>Day</th>
                <th style={{ padding: '14px 14px' }}>Start Time</th>
                <th style={{ padding: '14px 14px' }}>End Time</th>
                <th style={{ padding: '14px 14px' }}>Duration</th>
                <th style={{ padding: '14px 14px' }}>Start Location</th>
                <th style={{ padding: '14px 14px' }}>Latest Location</th>
                <th style={{ padding: '14px 14px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ padding: '60px 0', textAlign: 'center', color: TEXT_MUTED }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div className="w-8 h-8 spinner-gradient" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #0284c7', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Loading attendance records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '60px 20px', textAlign: 'center', color: TEXT_MUTED }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_MAIN }}>No attendance records found</div>
                    <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 4 }}>
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try adjusting your search query or status filter.'
                        : 'No employees recorded attendance for the selected date.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const badge = getStatusBadge(rec.status);
                  const isNotStarted = rec.status === 'NOT_STARTED';

                  return (
                    <tr
                      key={rec._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.12s',
                        background: '#ffffff',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* Employee Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: '#e0f2fe',
                              color: '#0284c7',
                              fontWeight: 800,
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #bae6fd',
                              flexShrink: 0,
                            }}
                          >
                            {(rec.employeeName || 'E').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div
                              onClick={() => handleOpenEmployeeHistory(rec.employeeId)}
                              style={{ fontWeight: 700, color: '#0284c7', cursor: 'pointer', textDecoration: 'none' }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              title="Click to view employee's complete attendance history"
                            >
                              {rec.employeeName}
                            </div>
                            <div style={{ fontSize: 11, color: TEXT_MUTED }}>{rec.email || rec.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td style={{ padding: '14px 14px', fontWeight: 700, color: '#334155' }}>
                        <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 12 }}>
                          {rec.employeeCode || 'EMP-001'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 14px', color: TEXT_MAIN, fontWeight: 600 }}>
                        {formatDateDisplay(rec.date)}
                      </td>

                      {/* Day */}
                      <td style={{ padding: '14px 14px', color: TEXT_MUTED }}>
                        {rec.day}
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: '14px 14px', fontWeight: 700, color: isNotStarted ? '#94a3b8' : '#0f172a' }}>
                        {rec.startTimeFormatted || '—'}
                      </td>

                      {/* End Time */}
                      <td style={{ padding: '14px 14px', fontWeight: 700, color: rec.endTimeFormatted === '—' ? '#94a3b8' : '#0f172a' }}>
                        {rec.endTimeFormatted || '—'}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '14px 14px' }}>
                        {rec.status === 'ON_DUTY' ? (
                          <span style={{ color: '#059669', fontWeight: 800, background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                            Active
                          </span>
                        ) : (
                          <span style={{ color: isNotStarted ? '#94a3b8' : '#334155', fontWeight: 600 }}>
                            {rec.durationFormatted || '—'}
                          </span>
                        )}
                      </td>

                      {/* Start Location */}
                      <td style={{ padding: '14px 14px', maxWidth: 160 }}>
                        {rec.startLocation?.road ? (
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#0369a1', fontWeight: 600 }} title={rec.startLocation.formattedAddress || rec.startLocation.road}>
                            📍 {rec.startLocation.road}
                          </div>
                        ) : rec.startLocation?.latitude ? (
                          <div style={{ fontSize: 11.5, color: TEXT_MUTED }}>
                            {rec.startLocation.latitude.toFixed(4)}, {rec.startLocation.longitude.toFixed(4)}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      {/* Latest Location */}
                      <td style={{ padding: '14px 14px', maxWidth: 160 }}>
                        {rec.latestLocation?.road ? (
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: rec.status === 'ON_DUTY' ? '#059669' : '#334155', fontWeight: 600 }} title={rec.latestLocation.formattedAddress || rec.latestLocation.road}>
                            {rec.status === 'ON_DUTY' ? '🟢 ' : '📍 '}
                            {rec.latestLocation.road}
                          </div>
                        ) : rec.latestLocation?.latitude ? (
                          <div style={{ fontSize: 11.5, color: TEXT_MUTED }}>
                            {rec.latestLocation.latitude.toFixed(4)}, {rec.latestLocation.longitude.toFixed(4)}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: 14,
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.dot }} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          {/* View on Map Button */}
                          {(rec.latestLocation?.latitude || rec.startLocation?.latitude || rec.status === 'ON_DUTY') && (
                            <button
                              onClick={() => setMapModalRecord(rec)}
                              title="View on Map"
                              style={{
                                background: '#e0f2fe',
                                color: '#0284c7',
                                border: '1px solid #bae6fd',
                                borderRadius: 6,
                                padding: '5px 10px',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              🗺️ Map
                            </button>
                          )}

                          {/* View Details Button */}
                          {!isNotStarted && (
                            <button
                              onClick={() => setDetailModalRecord(rec)}
                              title="View full record details"
                              style={{
                                background: '#f8fafc',
                                color: '#475569',
                                border: `1px solid ${BORDER}`,
                                borderRadius: 6,
                                padding: '5px 10px',
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Record Details Modal ─────────────────────────────────────────── */}
      {detailModalRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: 18 }}>
                  📋
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT_MAIN }}>
                    {detailModalRecord.employeeName}
                  </h3>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {detailModalRecord.employeeCode} • {formatDateDisplay(detailModalRecord.date)} ({detailModalRecord.day})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailModalRecord(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TEXT_MUTED }}
              >
                ✕
              </button>
            </div>

            {/* Timings and Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Start Time</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                  {detailModalRecord.startTimeFormatted || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>End Time</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: detailModalRecord.endTimeFormatted === '—' ? '#94a3b8' : '#2563eb', marginTop: 2 }}>
                  {detailModalRecord.endTimeFormatted || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TEXT_MUTED, textTransform: 'uppercase' }}>Duration</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
                  {detailModalRecord.durationFormatted || '—'}
                </div>
              </div>
            </div>

            {/* Locations Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {/* Start Location */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 }}>
                  📍 Starting Location
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT_MAIN }}>
                  {detailModalRecord.startLocation?.road || 'Vijayawada, AP'}
                </div>
                {detailModalRecord.startLocation?.area && (
                  <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
                    Area: {detailModalRecord.startLocation.area}, {detailModalRecord.startLocation.city}
                  </div>
                )}
                {detailModalRecord.startLocation?.latitude && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    GPS: {detailModalRecord.startLocation.latitude.toFixed(6)}, {detailModalRecord.startLocation.longitude.toFixed(6)} (Accuracy ±{Math.round(detailModalRecord.startLocation.accuracy || 5)}m)
                  </div>
                )}
              </div>

              {/* Latest / End Location */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: detailModalRecord.status === 'ON_DUTY' ? '#059669' : '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                  {detailModalRecord.status === 'ON_DUTY' ? '🟢 Current Live Location' : '🏁 Final Recorded Location'}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT_MAIN }}>
                  {detailModalRecord.latestLocation?.road || detailModalRecord.endLocation?.road || 'Vijayawada, AP'}
                </div>
                {(detailModalRecord.latestLocation?.area || detailModalRecord.endLocation?.area) && (
                  <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
                    Area: {detailModalRecord.latestLocation?.area || detailModalRecord.endLocation?.area}, {detailModalRecord.latestLocation?.city || 'Vijayawada'}
                  </div>
                )}
                {detailModalRecord.latestLocation?.latitude && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    GPS: {detailModalRecord.latestLocation.latitude.toFixed(6)}, {detailModalRecord.latestLocation.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDetailModalRecord(null)}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              {(detailModalRecord.latestLocation?.latitude || detailModalRecord.startLocation?.latitude) && (
                <button
                  onClick={() => {
                    const r = detailModalRecord;
                    setDetailModalRecord(null);
                    setMapModalRecord(r);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    background: GRADIENT,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🗺️ View on Map
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Full Employee History Modal ──────────────────────────────────── */}
      {historyModalEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 700,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT_MAIN }}>
                  {employeeHistoryData?.employee?.name || 'Employee'} — Complete Attendance Log
                </h3>
                <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {employeeHistoryData?.employee?.employeeCode} • {employeeHistoryData?.employee?.email}
                </div>
              </div>
              <button
                onClick={() => {
                  setHistoryModalEmployee(null);
                  setEmployeeHistoryData(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TEXT_MUTED }}
              >
                ✕
              </button>
            </div>

            {/* Overall Employee Stats */}
            {employeeHistoryData?.stats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Total Days Logged</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>
                    {employeeHistoryData.stats.totalDays}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Completed Days</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                    {employeeHistoryData.stats.completedDays}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>Total Hours Logged</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', marginTop: 2 }}>
                    {employeeHistoryData.stats.totalHours}
                  </div>
                </div>
              </div>
            )}

            {/* History Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              {historyLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                  Loading employee attendance history...
                </div>
              ) : !employeeHistoryData?.records?.length ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                  No past attendance history recorded yet for this employee.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}`, color: TEXT_MUTED, textTransform: 'uppercase', fontSize: 11 }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Day</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Start</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>End</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Duration</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeHistoryData.records.map((r) => {
                      const b = getStatusBadge(r.status);
                      return (
                        <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{formatDateDisplay(r.date)}</td>
                          <td style={{ padding: '8px 12px', color: TEXT_MUTED }}>{r.day}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>{r.startTimeFormatted}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>{r.endTimeFormatted}</td>
                          <td style={{ padding: '8px 12px' }}>{r.status === 'ON_DUTY' ? 'Active' : (r.formattedDuration || '—')}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: b.color, background: b.bg, padding: '2px 7px', borderRadius: 10, border: `1px solid ${b.border}` }}>
                              {b.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. View on Map Modal ────────────────────────────────────────────── */}
      {mapModalRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 900,
              height: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  🗺️
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: TEXT_MAIN }}>
                    {mapModalRecord.employeeName} — Location & Route
                  </h4>
                  <div style={{ fontSize: 11.5, color: TEXT_MUTED }}>
                    {mapModalRecord.employeeCode} • {mapModalRecord.latestLocation?.road || mapModalRecord.startLocation?.road || 'Vijayawada'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => {
                    navigate('/admin/employee-tracking');
                  }}
                  style={{
                    background: GRADIENT,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Open in Live Field Tracking ➔
                </button>
                <button
                  onClick={() => setMapModalRecord(null)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TEXT_MUTED }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Embedded Live Map Component */}
            <div style={{ flex: 1, position: 'relative' }}>
              <LiveMap
                employees={[
                  {
                    _id: mapModalRecord.employeeId,
                    employeeId: mapModalRecord.employeeId,
                    name: mapModalRecord.employeeName,
                    location: mapModalRecord.latestLocation || mapModalRecord.startLocation || {
                      latitude: 16.499614,
                      longitude: 80.648500,
                      trackingStatus: mapModalRecord.status === 'ON_DUTY' ? 'MOVING' : 'STOPPED',
                    },
                  },
                ]}
                selectedEmployeeId={mapModalRecord.employeeId}
                showRouteTrail={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
