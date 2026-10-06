import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI, followupsAPI, usersAPI } from '../../services/api';
import geoTracker from '../../services/geoTracker';
import logoImg from '../../assets/aotms-global-logo.png';
import { getTaskAssigneeOptions, getTaskAssignorOptions } from '../../utils/permissions';
import { useRef } from 'react';
import {
  FiClock,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiPlay,
  FiLogOut,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiUsers,
} from 'react-icons/fi';
import { RiTimerFlashLine } from 'react-icons/ri';

/**
 * Multi-select Checkbox Dropdown for "Assigned To"
 */
function AssigneeCheckboxDropdown({ assignableUsers, selectedIds, onChange, currentUser }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = assignableUsers.filter((u) => {
    const q = search.toLowerCase();
    const name = (u.name || '').toLowerCase();
    const desig = (u.designation || '').toLowerCase();
    return name.includes(q) || desig.includes(q);
  });

  const allSelected = assignableUsers.length > 0 && assignableUsers.every((u) => selectedIds.some(id => String(id) === String(u._id)));
  const isSingleOption = assignableUsers.length <= 1;

  const toggleSelectAll = () => {
    if (allSelected) {
      const defaultId = currentUser?._id || assignableUsers[0]?._id;
      onChange(defaultId ? [defaultId] : []);
    } else {
      onChange(assignableUsers.map((u) => u._id));
    }
  };

  const toggleUser = (id) => {
    const idStr = String(id);
    if (selectedIds.some(x => String(x) === idStr)) {
      if (isSingleOption) return;
      onChange(selectedIds.filter((x) => String(x) !== idStr));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const getSummaryLabel = () => {
    if (selectedIds.length === 0) return 'Select Assignee(s)';
    if (allSelected && assignableUsers.length > 1) {
      return `All Employees (${assignableUsers.length})`;
    }
    if (selectedIds.length === 1) {
      const found = assignableUsers.find((u) => String(u._id) === String(selectedIds[0]));
      if (found) {
        return `${found.name || 'User'}${found.designation ? ` (${found.designation})` : ''}`;
      }
      return '1 Person Selected';
    }
    return `${selectedIds.length} People Selected`;
  };

  return (
    <div ref={dropRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500 flex items-center justify-between gap-1.5 shadow-xs transition-colors hover:border-slate-300"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <FiUsers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate text-left">{getSummaryLabel()}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedIds.length > 1 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              {selectedIds.length}
            </span>
          )}
          <FiChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[240px] max-w-[320px] bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Header Controls for Multi-User options */}
          {assignableUsers.length > 1 && (
            <div className="p-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-lg mb-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer accent-blue-600"
                />
                <span>Select All ({assignableUsers.length})</span>
              </label>
              <span className="text-[10px] font-medium text-slate-400">
                {selectedIds.length} selected
              </span>
            </div>
          )}

          {assignableUsers.length > 4 && (
            <div className="px-1 py-1">
              <input
                type="text"
                placeholder="🔍 Search name / role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* User List with Checkboxes */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No matching employees</div>
            ) : (
              filtered.map((u) => {
                const isChecked = selectedIds.some(id => String(id) === String(u._id));
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleUser(u._id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => { }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer accent-blue-600 shrink-0"
                    />
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 min-w-0 truncate">
                      <span className="truncate">{u.name || 'User'}</span>
                    </div>
                    {u.designation && (
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                        {u.designation}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 12-hour Time Picker Component
 */
function TimeInput12h({ value, onChange }) {
  const [hh24, mm] = value ? value.split(':') : ['09', '00'];
  const hh24Num = parseInt(hh24, 10) || 0;
  const period = hh24Num >= 12 ? 'PM' : 'AM';
  let hh12 = hh24Num % 12;
  if (hh12 === 0) hh12 = 12;

  const commit = (newHh12, newMm, newPeriod) => {
    let h = parseInt(newHh12, 10) % 12;
    if (newPeriod === 'PM') h += 12;
    const hhStr = String(h).padStart(2, '0');
    const mmStr = String(newMm).padStart(2, '0');
    onChange(`${hhStr}:${mmStr}`);
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <select
        value={hh12}
        onChange={(e) => commit(e.target.value, mm, period)}
        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-slate-400 font-bold">:</span>
      <select
        value={mm}
        onChange={(e) => commit(hh12, e.target.value, period)}
        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500"
      >
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={String(m).padStart(2, '0')}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
      <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
        {['AM', 'PM'].map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => commit(hh12, mm, p)}
            className={`px-2 py-1.5 text-xs font-semibold transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Format IST Date and Day string (e.g., Saturday, 26 September 2026)
 */
function formatISTDate(dateObj) {
  if (!dateObj) return '';
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format IST Time (e.g., 09:30:15 AM)
 */
function formatISTTime(dateObj) {
  if (!dateObj) return '00:00:00 AM';
  return dateObj.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Get greeting based on current local hour
 */
function getGreeting(dateObj) {
  const hour = dateObj.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function MandatoryAttendanceModal() {
  const { user, logout } = useAuth();

  // Modal Flow Step: 'ATTENDANCE' | 'TODO' | 'CLOSED'
  const [currentStep, setCurrentStep] = useState('CLOSED');
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(new Date());

  // Step 1: Attendance state
  const [clockingIn, setClockingIn] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);

  // Step 2: Rich Todo Item Form state
  const [taskType, setTaskType] = useState('todo'); // 'todo' | 'call_followup'
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState('09:00');
  const [priority, setPriority] = useState('medium');
  const [recurrence, setRecurrence] = useState('none');
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState(() => (user?._id ? [user._id] : []));
  const [assignedBy, setAssignedBy] = useState('');
  const [teamUsers, setTeamUsers] = useState([]);

  const [addingTask, setAddingTask] = useState(false);
  const [taskError, setTaskError] = useState(null);

  // Real-time digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch users for Assign To / Assign By dropdowns
  useEffect(() => {
    usersAPI
      .getAll()
      .then((res) => {
        const list = res.data?.users || res.data || [];
        setTeamUsers(list);
      })
      .catch(() => { });
  }, []);

  const assignedToUsers = getTaskAssigneeOptions(user, teamUsers);
  const assignedByUsers = getTaskAssignorOptions(user, teamUsers);

  useEffect(() => {
    if (!assignedToUsers || !assignedToUsers.length) return;
    setSelectedAssigneeIds((prev) => {
      const valid = prev.filter((id) => assignedToUsers.some((u) => u._id === id));
      if (valid.length > 0) return valid;
      return [assignedToUsers[0]._id];
    });
  }, [teamUsers, user]);

  useEffect(() => {
    if (!assignedByUsers || !assignedByUsers.length) return;
    if (!assignedByUsers.some((u) => u._id === assignedBy)) {
      setAssignedBy(assignedByUsers[0]._id);
    }
  }, [teamUsers, assignedBy, user]);

  // Check overall Check-in Status & Today's Todo Requirement on mount / refresh
  const evaluateCheckInStatus = useCallback(async () => {
    if (!user) {
      setCurrentStep('CLOSED');
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      const attRes = await attendanceAPI.getCurrentStatus();
      const attData = attRes.data || {};
      const isAttActiveOrDone =
        attData.active === true ||
        attData.status === 'ON_DUTY' ||
        attData.status === 'ON_BREAK' ||
        attData.status === 'COMPLETED';

      if (!isAttActiveOrDone) {
        // Attendance not started for today -> Step 1: Attendance Modal
        setCurrentStep('ATTENDANCE');
      } else {
        // Attendance active or completed -> Check if user has created at least 1 Todo item for TODAY!
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        try {
          const todoRes = await followupsAPI.getAll({ userId: user._id });
          const allItems = todoRes.data?.followups || todoRes.data?.todos || todoRes.data?.tasks || [];
          const hasTodayTodo = allItems.some((item) => {
            const isTodoItem = item.type === 'todo' || !item.type;
            const itemDate = new Date(item.createdAt || item.scheduledAt || item.dueDate);
            return isTodoItem && itemDate >= startOfToday;
          });

          if (hasTodayTodo) {
            // User ALREADY created at least 1 Todo item for today -> Close modal & allow Dashboard access
            setCurrentStep('CLOSED');
          } else {
            // Attendance active, but NO Todo created today -> Trigger Mandatory Todo Form!
            setCurrentStep('TODO');
          }
        } catch (todoErr) {
          console.warn('[MandatoryCheckIn] Todo check error:', todoErr.message);
          setCurrentStep('CLOSED');
        }
      }
    } catch (err) {
      console.warn('[MandatoryCheckIn] Evaluation error:', err.message);
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    evaluateCheckInStatus();
  }, [evaluateCheckInStatus]);

  // Listen for external updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      evaluateCheckInStatus();
    };
    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    return () => window.removeEventListener('attendance-updated', handleAttendanceUpdate);
  }, [evaluateCheckInStatus]);

  // Background location retrieval
  useEffect(() => {
    if (currentStep !== 'ATTENDANCE') return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn('[MandatoryAttendanceModal] Location fallback:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  }, [currentStep]);

  // Block background scrolling and intercept Escape key (mandatory modal constraint)
  useEffect(() => {
    if (currentStep !== 'CLOSED') {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      window.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [currentStep]);

  // ── Step 1 Action: Start Attendance -> Immediately Show "Create Todo Item" Form ──
  const handleStartAttendance = async () => {
    try {
      setClockingIn(true);
      setAttendanceError(null);

      let locationData = {
        latitude: gpsCoords?.latitude || null,
        longitude: gpsCoords?.longitude || null,
        accuracy: gpsCoords?.accuracy || 0,
        platform: navigator.platform || 'web',
      };

      if (!locationData.latitude && navigator.geolocation) {
        try {
          const freshPos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
            });
          });
          locationData.latitude = freshPos.coords.latitude;
          locationData.longitude = freshPos.coords.longitude;
          locationData.accuracy = freshPos.coords.accuracy;
        } catch (geoErr) {
          console.warn('[MandatoryAttendance] Location fallback:', geoErr.message);
        }
      }

      const res = await attendanceAPI.start(locationData);

      if (res.data?.ok) {
        geoTracker.startTracking().catch((gErr) => {
          console.warn('[MandatoryAttendance] GeoTracker start:', gErr.message);
        });

        setAttendanceSuccess(true);
        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: res.data.attendance }));

        // Transition immediately to Step 2: Mandatory Todo Creation Form
        setTimeout(() => {
          setClockingIn(false);
          setAttendanceSuccess(false);
          setCurrentStep('TODO');
        }, 500);
      } else {
        setAttendanceError(res.data?.message || 'Failed to start attendance. Please try again.');
        setClockingIn(false);
      }
    } catch (err) {
      console.error('[MandatoryAttendance] Start error:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to connect to server. Please try again.';
      setAttendanceError(msg);
      setClockingIn(false);
    }
  };

  // ── Step 2 Action: Submit Create Todo Form ──
  const handleCreateTodoSubmit = async (e) => {
    if (e) e.preventDefault();
    const desc = taskDescription.trim();
    if (!desc) {
      setTaskError('Please enter a description for the Todo Item.');
      return;
    }

    const targetAssignees = selectedAssigneeIds.length > 0 ? selectedAssigneeIds : (user?._id ? [user._id] : []);
    if (!targetAssignees || targetAssignees.length === 0) {
      setTaskError('Please select at least one person to assign this task to.');
      return;
    }

    try {
      setAddingTask(true);
      setTaskError(null);

      const scheduledAtIso = `${dueDate || new Date().toISOString().slice(0, 10)}T${dueTime || '09:00'}:00`;
      const finalAssignedBy = assignedBy || user?._id;

      const createdTasks = await Promise.all(
        targetAssignees.map(async (targetId) => {
          const payload = {
            type: taskType === 'call_followup' ? 'call_followup' : 'todo',
            title: desc,
            note: desc,
            description: desc,
            scheduledAt: new Date(scheduledAtIso).toISOString(),
            priority,
            recurrence: recurrence !== 'none' ? {
              frequency: recurrence,
              endDate: repeatEndDate ? new Date(repeatEndDate + 'T23:59:59').toISOString() : undefined,
            } : undefined,
            repeatFrequency: recurrence,
            repeatEndDate: recurrence !== 'none' && repeatEndDate ? new Date(repeatEndDate).toISOString() : undefined,
            assignedTo: targetId,
            assignedBy: finalAssignedBy === 'all' ? user?._id : finalAssignedBy,
          };
          return followupsAPI.create(payload);
        })
      );

      createdTasks.forEach((res) => {
        if (res.data?.followup) {
          window.dispatchEvent(new CustomEvent('tasks-updated', { detail: res.data.followup }));
        }
      });
      // Close modal and open workspace
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      setCurrentStep('CLOSED');
    } catch (err) {
      console.error('[MandatoryTask] Create error:', err);
      setTaskError(err.response?.data?.message || 'Failed to create Todo item. Please try again.');
    } finally {
      setAddingTask(false);
    }
  };

  if (currentStep === 'CLOSED' || checking) return null;

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'EMP';
  const roleDisplay = user?.designation || user?.role || 'Staff Member';
  const greeting = getGreeting(now);

  const isCallFollowup = taskType === 'call_followup';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 select-none"
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)', animationDelay: '1.5s' }}
          />
        </div>

        {/* Modal Window Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section with Centered Middle Logo and Mandatory Step Badge */}
          <div className="relative p-4 shrink-0 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {currentStep === 'ATTENDANCE' ? 'Step 1/2: Attendance' : 'Step 2/2: Todo Required'}
              </span>
            </div>
            <img src={logoImg} alt="AOTMS" className="h-8 object-contain" />
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <FiLogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* STEP 1: ATTENDANCE CLOCK-IN */}
            {currentStep === 'ATTENDANCE' && (
              <>
                {/* Greeting Header */}
                <div className="text-center mb-2">
                  <h2 className="text-xl font-semibold text-slate-800">
                    {greeting}, <span className="text-blue-600">{user?.name?.split(' ')[0] || 'Team'}</span> 👋
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Please clock in your attendance to open your workspace.
                  </p>
                </div>

                {/* Date & Time Box */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FiCalendar className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-[10px] text-blue-600 font-medium uppercase tracking-wider block">Today</span>
                      <span className="font-medium text-slate-800">{formatISTDate(now)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 font-mono text-sm font-semibold">
                    <FiClock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    <span>{formatISTTime(now)}</span>
                  </div>
                </div>

                {/* Employee Profile Card */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-medium text-sm overflow-hidden shrink-0 shadow-sm">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Employee'}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                        {roleDisplay}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {user?.email || 'user@example.com'}
                    </div>
                  </div>
                </div>

                {/* Shift Target Info */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3 text-xs">
                  <RiTimerFlashLine className="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Shift Target</div>
                    <div className="font-semibold text-slate-700">09:00:00 Hours</div>
                  </div>
                </div>

                {/* Error Banner */}
                {attendanceError && (
                  <div className="p-3 rounded-xl flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200">
                    <FiAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{attendanceError}</div>
                  </div>
                )}

                {/* Success Banner */}
                {attendanceSuccess && (
                  <div className="p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                    <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Attendance Clocked In! Opening Create Todo Item form...</span>
                  </div>
                )}

                {/* Start Attendance Action Button */}
                <button
                  type="button"
                  disabled={clockingIn || attendanceSuccess}
                  onClick={handleStartAttendance}
                  className="w-full py-3.5 px-4 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {clockingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Clocking In...</span>
                    </>
                  ) : attendanceSuccess ? (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      <span>Attendance Active</span>
                    </>
                  ) : (
                    <>
                      <FiPlay className="w-4 h-4 fill-current" />
                      <span>Start Attendance</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* STEP 2: CREATE TODO ITEM FORM (EXACT SPEC FROM TASK.JSX FORM) */}
            {currentStep === 'TODO' && (
              <form onSubmit={handleCreateTodoSubmit} className="space-y-4">
                {/* Type Switcher Tabs */}
                <div className="flex bg-blue-50/70 p-1 rounded-xl border border-blue-100">
                  <button
                    type="button"
                    onClick={() => setTaskType('todo')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${taskType === 'todo'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <span>📋</span>
                    <span>Todo Item</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskType('call_followup')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${taskType === 'call_followup'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <span>📞</span>
                    <span>Call Follow-up</span>
                  </button>
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isCallFollowup ? 'Follow-up Details' : 'Todo Task Description'}
                  </label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    rows={3}
                    placeholder={
                      isCallFollowup ? 'What should this call be about?' : 'What needs to be accomplished?'
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50/50 resize-none"
                  />
                </div>

                {/* Due Date & Time Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Due Date & Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500"
                    />
                    <TimeInput12h value={dueTime} onChange={setDueTime} />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Recurrence */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>

                  {recurrence !== 'none' && (
                    <div className="mt-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Repeat Until
                      </label>
                      <input
                        type="date"
                        value={repeatEndDate}
                        min={dueDate}
                        onChange={(e) => setRepeatEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Assigned To & Assigned By */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Assigned To
                    </label>
                    <AssigneeCheckboxDropdown
                      assignableUsers={assignedToUsers}
                      selectedIds={selectedAssigneeIds}
                      onChange={setSelectedAssigneeIds}
                      currentUser={user}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Assigned By
                    </label>
                    <select
                      value={assignedBy}
                      onChange={(e) => setAssignedBy(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white outline-none focus:border-blue-500"
                    >
                      {assignedByUsers.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.dropdownLabel || (String(u._id) === String(user?._id)
                            ? `${u.name || 'Account Holder'} (Account Holder)`
                            : `${u.name}${u.designation ? ` (${u.designation})` : ' (Admin)'}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Error Banner */}
                {taskError && (
                  <div className="p-3 rounded-lg flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200">
                    <FiAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{taskError}</div>
                  </div>
                )}

                {/* Action Buttons: Cancel / Create Todo */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('CLOSED')}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTask}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {addingTask ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Todo</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
            <div className="flex items-center gap-1">
              <FiShield className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift check-in policy active</span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="hover:text-red-500 transition-colors flex items-center gap-1 text-slate-500 font-medium"
            >
              <FiLogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
