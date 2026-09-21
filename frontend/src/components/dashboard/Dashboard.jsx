import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { leadsAPI, followupsAPI, reportsAPI, usersAPI, attendanceAPI, trackingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import geoTracker from '../../services/geoTracker';
import LiveMap from '../tracking/LiveMap';
import StatusBadge from '../common/StatusBadge';
import GradientWaves from './GradientWaves';
import {
  FaUsers, FaMoneyBillWave, FaChartLine, FaCalendarCheck, FaPhone,
  FaTrophy, FaLocationDot, FaBuilding, FaMagnifyingGlass, FaRotate, FaFilter,
  FaCircleCheck, FaEye, FaMapLocationDot, FaUserTie, FaChartPie,
  FaClock, FaXmark, FaCheck, FaPhoneVolume, FaCalendarDays, FaFileLines,
  FaChevronRight, FaBullhorn, FaArrowTrendUp, FaTowerCell, FaArrowUpRightFromSquare,
  FaArrowUp, FaArrowDown, FaPlus, FaCalendar, FaCreditCard, FaWifi,
  FaLock, FaUserCheck, FaCoins, FaGaugeHigh, FaUserGroup, FaFileInvoiceDollar,
  FaReceipt, FaGlobe, FaMugHot, FaPlay, FaStop, FaBolt, FaRocket,
  FaHeadset, FaBriefcase, FaHandshake, FaMicrophone, FaVideo,
  FaPause, FaLaptopCode, FaSatelliteDish, FaChevronDown, FaBoltLightning,
  FaInbox, FaPaperPlane, FaFilterCircleXmark, FaStar, FaListUl, FaTableList,
  FaEnvelope, FaUser, FaCopy,
} from 'react-icons/fa6';

/* ─────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────── */
const GRADIENT = 'var(--btn-gradient, linear-gradient(135deg, #bef264 0%, #a3e635 55%, #65a30d 100%))';

function formatHms(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00:00';
  const t = Math.floor(seconds);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatTime12h(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDurationText(sec) {
  if (sec == null || isNaN(sec) || sec <= 0) return '0m';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
function formatLeadTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function getLiveStatusBadge(status) {
  switch (status) {
    case 'ON_DUTY':    return { bg: 'rgba(190, 242, 100, 0.15)', color: '#bef264', dot: '#bef264', label: 'On Duty' };
    case 'ON_CALL':    return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', dot: '#38bdf8', label: 'On Call' };
    case 'ON_BREAK':   return { bg: 'rgba(250, 204, 21, 0.15)', color: '#facc15', dot: '#facc15', label: 'On Break' };
    case 'COMPLETED':  return { bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', dot: '#22c55e', label: 'Completed' };
    case 'ACTIVE':     return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', dot: '#22c55e', label: 'Active GPS' };
    case 'NOT_STARTED':return { bg: 'rgba(255, 255, 255, 0.08)', color: 'rgba(220, 252, 231, 0.65)', dot: '#94a3b8', label: 'Not Started' };
    default:           return { bg: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', dot: '#f43f5e', label: 'Offline' };
  }
}

/* ─────────────────────────────────────────────────────────
   THEME TOKENS — OBSIDIAN EMERALD & ELECTRIC LIME (matches HeroSection)
   ───────────────────────────────────────────────────────── */
const ATT = {
  primary:     '#65a30d',   // GreenYellow readable dark lime
  primary2:    '#0f172a',   // dark slate
  primaryBg:   'rgba(173, 255, 47, 0.18)',
  primarySoft: 'rgba(173, 255, 47, 0.28)',
  primaryDeep: '#4d7c0f',

  accent:      '#16a34a',   // emerald green
  accentBg:    'rgba(22, 163, 74, 0.12)',
  accentSoft:  'rgba(22, 163, 74, 0.22)',
  accentDeep:  '#15803d',

  amber:       '#d97706',
  amberBg:     'rgba(251, 191, 36, 0.16)',
  amberDeep:   '#b45309',

  sky:         '#0284c7',
  skyBg:       'rgba(56, 189, 248, 0.14)',
  skySoft:     'rgba(56, 189, 248, 0.24)',
  skyDeep:     '#0369a1',

  red:         '#ef4444',
  redBg:       'rgba(239, 68, 68, 0.12)',
  redDeep:     '#b91c1c',

  green:       '#16a34a',
  greenBg:     'rgba(34, 197, 94, 0.14)',
  greenDeep:   '#15803d',

  ink:         '#0f172a',
  inkSoft:     '#334155',
  muted:       '#64748b',
  line:        '#e2e8f0',
  card:        '#ffffff',
  cardSoft:    '#f8fafc',
};

const T = {
  /* Cool and calm White container theme */
  bg:          '#f8fafc',
  bgSolid:     '#ffffff',
  card:        '#ffffff',
  cardSoft:    '#f8fafc',
  cardGlass:   'rgba(255, 255, 255, 0.96)',
  ink:         '#0f172a',
  inkSoft:     '#334155',
  muted:       '#64748b',
  line:        '#e2e8f0',
  lineSoft:    '#f1f5f9',
  glassBorder: '1px solid #e2e8f0',
  greenYellowBorder: '1.5px solid #adff2f',
  glassShadow: '0 4px 24px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',

  /* Cool and calm GreenYellow / Emerald color palette */
  orange:      '#65a30d',      // readable dark lime
  orange2:     '#adff2f',      // GreenYellow
  limeGlow:    'rgba(173, 255, 47, 0.40)',
  teal:        '#10b981',      // emerald green
  emeraldGlow: 'rgba(16, 185, 129, 0.25)',
  sky:         '#0284c7',      // cyan
  green:       '#16a34a',      // green
  amber:       '#d97706',      // amber
  amberGlow:   'rgba(251, 191, 36, 0.25)',
  red:         '#ef4444',      // alert red
  coral:       '#f43f5e',      // coral
  blue:        '#0284c7',      // cyan
  blueGlow:    'rgba(56, 189, 248, 0.25)',
  violet:      '#7c3aed',      // purple
  violetGlow:  'rgba(167, 139, 250, 0.25)',
};

/* ─────────────────────────────────────────────────────────
   EMPLOYEE TRACKING CARD — REDESIGNED UX
   ───────────────────────────────────────────────────────── */
function EmployeeTrackingCard() {
  const { user } = useAuth();
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastSyncText, setLastSyncText] = useState('');
  const [showSimModal, setShowSimModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [liveWorkSeconds, setLiveWorkSeconds] = useState(0);
  const [liveBreakSeconds, setLiveBreakSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // overview | breaks | location

  const status = attendanceRecord?.status || 'NOT_STARTED';
  const isTracking = status === 'ON_DUTY';
  const isOnBreak = status === 'ON_BREAK';
  const isCompletedToday = status === 'COMPLETED';

  /* ── Data fetching + timers (unchanged) ─────────── */
  useEffect(() => {
    let isMounted = true;
    attendanceAPI.getCurrentStatus()
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.attendance) {
          const att = res.data.attendance;
          setAttendanceRecord(att);
          if (att.latestLocation?.latitude) setPosition(att.latestLocation);
          else if (att.endLocation?.latitude) setPosition(att.endLocation);
          if (att.status === 'ON_DUTY') geoTracker.startTracking().catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setInitialLoading(false); });

    const unsub = geoTracker.subscribe((state) => {
      if (!isMounted) return;
      if (state.position) setPosition(state.position);
      if (state.error && isTracking) setError(state.error);
    });

    return () => { isMounted = false; unsub(); };
  }, [isTracking]);

  useEffect(() => {
    if (!attendanceRecord || (!isTracking && !isOnBreak)) {
      if (isCompletedToday && attendanceRecord) {
        setLiveWorkSeconds(attendanceRecord.actualWorkSeconds || 0);
        setLiveBreakSeconds(0);
      }
      return;
    }
    const update = () => {
      const now = Date.now();
      const startMs = new Date(attendanceRecord.startTime).getTime();
      const breaks = Array.isArray(attendanceRecord.breaks) ? attendanceRecord.breaks : [];
      let compSec = 0, activeBreak = null;
      breaks.forEach((b) => {
        if (b.status === 'COMPLETED' && b.endTime) {
          compSec += Math.max(0, Math.floor((new Date(b.endTime) - new Date(b.startTime)) / 1000));
        } else if (b.status === 'ACTIVE') activeBreak = b;
      });
      if (isOnBreak && activeBreak) {
        const bStart = new Date(activeBreak.startTime).getTime();
        setLiveBreakSeconds(Math.max(0, Math.floor((now - bStart) / 1000)));
        setLiveWorkSeconds(Math.max(0, Math.floor((bStart - startMs) / 1000) - compSec));
      } else if (isTracking) {
        setLiveWorkSeconds(Math.max(0, Math.floor((now - startMs) / 1000) - compSec));
        setLiveBreakSeconds(0);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [attendanceRecord, isTracking, isOnBreak, isCompletedToday]);

  useEffect(() => {
    if (!isTracking) { setLastSyncText('Not syncing'); return; }
    const id = setInterval(() => {
      if (geoTracker.lastSentTime > 0) {
        const diff = Math.floor((Date.now() - geoTracker.lastSentTime) / 1000);
        setLastSyncText(diff < 2 ? 'Just now' : diff < 60 ? `${diff}s ago` : `${Math.floor(diff / 60)}m ago`);
      } else setLastSyncText('Waiting for GPS...');
    }, 1000);
    return () => clearInterval(id);
  }, [isTracking]);

  const getGpsFix = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation unsupported.'));
    navigator.geolocation.getCurrentPosition(resolve, reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });

  const handleStartAttendance = async () => {
    setError(''); setActionLoading('start');
    try {
      let lat = null, lng = null, accuracy = 10, speed = 0, heading = 0;
      try {
        const pos = await getGpsFix();
        lat = pos.coords.latitude; lng = pos.coords.longitude;
        accuracy = pos.coords.accuracy || 10;
        speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6 * 10) / 10 : 0;
        heading = pos.coords.heading || 0;
      } catch (e) {
        if (e.code === 1) throw new Error('Location permission denied.');
      }
      const res = await attendanceAPI.start({ latitude: lat, longitude: lng, accuracy, speed, heading, platform: navigator.platform || '' });
      setAttendanceRecord(res.data?.attendance);
      if (res.data?.attendance?.latestLocation) setPosition(res.data.attendance.latestLocation);
      try { await geoTracker.startTracking(); } catch {}
    } catch (err) { setError(err.message || 'Failed to start.'); }
    finally { setActionLoading(''); }
  };
  const handleStartBreak = async () => {
    setError(''); setActionLoading('break');
    try { setAttendanceRecord((await attendanceAPI.startBreak({})).data?.attendance); }
    catch (e) { setError(e.message || 'Failed.'); } finally { setActionLoading(''); }
  };
  const handleResumeWork = async () => {
    setError(''); setActionLoading('resume');
    try { setAttendanceRecord((await attendanceAPI.resumeBreak({})).data?.attendance); }
    catch (e) { setError(e.message || 'Failed.'); } finally { setActionLoading(''); }
  };
  const handleStopAttendance = async () => {
    setError(''); setActionLoading('stop');
    try {
      const cur = geoTracker.lastPosition || position || {};
      setAttendanceRecord((await attendanceAPI.stop({ latitude: cur.latitude, longitude: cur.longitude, accuracy: cur.accuracy || 0 })).data?.attendance);
      await geoTracker.stopTracking().catch(() => {});
    } catch (e) { setError(e.message || 'Failed.'); } finally { setActionLoading(''); }
  };

  const completedBreaksCount = (attendanceRecord?.breaks || []).filter((b) => b?.status === 'COMPLETED').length;
  const activeBreakNum = (attendanceRecord?.breaks || []).find((b) => b?.status === 'ACTIVE')?.breakNumber || (completedBreaksCount + 1);

  const totalShift = liveWorkSeconds + liveBreakSeconds;
  const efficiency = totalShift > 0
    ? Math.min(100, Math.max(15, Math.round((liveWorkSeconds / totalShift) * 100)))
    : (isCompletedToday ? 94 : 86);

  const statusCfg = {
    online:  { label: 'On Duty',       color: '#365314', bg: 'rgba(173, 255, 47, 0.25)', dot: '#65a30d' },
    break:   { label: 'On Break',      color: '#b45309', bg: 'rgba(251, 191, 36, 0.20)', dot: '#f59e0b' },
    done:    { label: 'Completed',     color: '#047857', bg: 'rgba(16, 185, 129, 0.20)', dot: '#10b981' },
    offline: { label: 'Not Started',   color: '#64748b', bg: 'rgba(148, 163, 184, 0.15)', dot: '#94a3b8' },
  };
  const cfg = isTracking ? statusCfg.online : isOnBreak ? statusCfg.break : isCompletedToday ? statusCfg.done : statusCfg.offline;

  /* ═════════════════════════════════════════════════════
     RENDER — NEW CLEAN UX
     ═════════════════════════════════════════════════════ */
  return (
    <div className="rounded-3xl border overflow-hidden h-full flex flex-col transition-all duration-300"
         style={{
           background: T.card,
           border: T.glassBorder,
           borderTop: '2.5px solid #adff2f',
           boxShadow: T.glassShadow,
           color: T.ink,
         }}>

      {/* ── TOP BAR: status + live pulse ──────────── */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3"
           style={{ background: T.cardSoft, borderBottom: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: cfg.dot }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: cfg.dot }} />
          </span>
          <span className="text-[13px] font-bold tracking-tight truncate"
                style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[11.5px] font-medium truncate hidden sm:inline" style={{ color: T.muted }}>
            {isTracking ? '· Live GPS sending to managers'
             : isOnBreak ? `· Break #${activeBreakNum} active`
             : isCompletedToday ? '· Shift logged for today'
             : '· Tap Start to begin shift'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSimModal(true)}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: T.orange }}
            title="Developer simulation"
          >
            🧪
          </button>
        </div>
      </div>

      {/* ── HERO TIMER SECTION ─────────────────────── */}
      <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1" style={{ color: T.muted }}>
            {isTracking ? 'Working now' : isOnBreak ? 'On break' : isCompletedToday ? 'Total today' : 'Get started'}
          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[38px] leading-none font-black tracking-tighter font-mono text-slate-900">
              {formatHms(liveWorkSeconds)}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}>
              {efficiency}% productive
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-[11.5px]" style={{ color: T.inkSoft }}>
            <span className="flex items-center gap-1 font-medium">
              <FaClock className="w-3 h-3" style={{ color: T.orange }} />
              {formatDurationText(liveWorkSeconds)} focus
            </span>
            <span className="w-1 h-1 rounded-full" style={{ background: T.line }} />
            <span className="flex items-center gap-1 font-medium">
              <FaMugHot className="w-3 h-3" style={{ color: '#d97706' }} />
              {formatDurationText(liveBreakSeconds)} break
            </span>
          </div>
        </div>

        {/* Circular efficiency ring */}
        <div className="relative w-[70px] h-[70px] shrink-0 hidden sm:block">
          <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
            <circle cx="35" cy="35" r="30" fill="none" stroke="#f1f5f9" strokeWidth="7" />
            <circle cx="35" cy="35" r="30" fill="none" stroke="#84cc16" strokeWidth={7}
                    strokeLinecap="round"
                    strokeDasharray={`${(efficiency / 100) * 188.5} 188.5`}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[13px] font-black" style={{ color: '#365314' }}>{efficiency}%</span>
          </div>
        </div>
      </div>

      {/* ── ACTION BAR ─────────────────────────────── */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleStartAttendance}
          disabled={!!actionLoading || initialLoading || simulating || isTracking || isOnBreak}
          className="rounded-xl py-3 text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all"
          style={{
            background: (isTracking || isOnBreak) ? '#f1f5f9' : 'linear-gradient(135deg, #bef264 0%, #a3e635 60%, #84cc16 100%)',
            color: (isTracking || isOnBreak) ? '#94a3b8' : '#0f172a',
            cursor: (isTracking || isOnBreak) ? 'not-allowed' : 'pointer',
            boxShadow: (isTracking || isOnBreak) ? 'none' : '0 4px 14px rgba(163,230,53,.35)',
            border: (isTracking || isOnBreak) ? `1px solid ${T.line}` : '1px solid #84cc16',
          }}
        >
          {actionLoading === 'start' ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FaPlay className="w-3 h-3" />}
          Start
        </motion.button>

        {isOnBreak ? (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleResumeWork}
            disabled={!!actionLoading || initialLoading || simulating}
            className="rounded-xl py-3 text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #bef264 0%, #a3e635 60%, #84cc16 100%)',
              color: '#0f172a',
              boxShadow: '0 4px 14px rgba(163,230,53,.35)',
              border: '1px solid #84cc16',
            }}>
            {actionLoading === 'resume' ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FaPlay className="w-3 h-3" />}
            Resume
          </motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleStartBreak}
            disabled={!!actionLoading || initialLoading || simulating || !isTracking}
            className="rounded-xl py-3 text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: !isTracking ? '#f1f5f9' : '#fef08a',
              color: !isTracking ? '#94a3b8' : '#854d0e',
              cursor: !isTracking ? 'not-allowed' : 'pointer',
              boxShadow: !isTracking ? 'none' : '0 4px 12px rgba(250,204,21,.25)',
              border: !isTracking ? `1px solid ${T.line}` : '1px solid #fde047',
            }}>
            {actionLoading === 'break' ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FaMugHot className="w-3 h-3" />}
            Break
          </motion.button>
        )}

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleStopAttendance}
          disabled={!!actionLoading || initialLoading || simulating || (!isTracking && !isOnBreak)}
          className="rounded-xl py-3 text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all"
          style={{
            background: (!isTracking && !isOnBreak) ? '#f1f5f9' : '#fee2e2',
            color: (!isTracking && !isOnBreak) ? '#94a3b8' : '#b91c1c',
            cursor: (!isTracking && !isOnBreak) ? 'not-allowed' : 'pointer',
            boxShadow: (!isTracking && !isOnBreak) ? 'none' : '0 4px 12px rgba(239,68,68,.25)',
            border: (!isTracking && !isOnBreak) ? `1px solid ${T.line}` : '1px solid #fca5a5',
          }}>
          {actionLoading === 'stop' ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FaStop className="w-3 h-3" />}
          Stop
        </motion.button>
      </div>

      {/* ── TABS ───────────────────────────────────── */}
      <div className="px-5" style={{ borderBottom: `1px solid ${T.line}` }}>
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: FaChartPie },
            { id: 'breaks',   label: 'Breaks',   icon: FaMugHot, badge: (attendanceRecord?.breaks || []).length },
            { id: 'location', label: 'Location', icon: FaLocationDot },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="relative px-3 py-2.5 text-[12.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              style={{
                color: activeTab === t.id ? T.orange : T.muted,
              }}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge > 0 && (
                <span className="ml-0.5 px-1.5 rounded-full text-[9.5px] font-black"
                      style={{
                        background: activeTab === t.id ? T.orange : 'rgba(190, 242, 100, 0.15)',
                        color: activeTab === t.id ? '#0a1500' : T.orange,
                      }}>
                  {t.badge}
                </span>
              )}
              {activeTab === t.id && (
                <motion.div
                  layoutId="active-tab-bar"
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: T.orange }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">

          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-3 gap-2.5"
            >
              {[
                { label: 'Focus',      value: formatDurationText(liveWorkSeconds),                color: '#4d7c0f', bg: 'rgba(173, 255, 47, 0.16)', icon: FaClock },
                { label: 'Break',      value: formatDurationText(liveBreakSeconds),               color: '#b45309', bg: 'rgba(251, 191, 36, 0.14)', icon: FaMugHot },
                { label: 'Total',      value: formatDurationText(liveWorkSeconds + liveBreakSeconds), color: '#047857', bg: 'rgba(16, 185, 129, 0.14)', icon: FaCalendarCheck },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                     style={{ background: s.bg, border: `1px solid ${T.line}` }}>
                  <div className="w-8 h-8 mx-auto rounded-xl grid place-items-center mb-1.5 bg-white shadow-xs"
                       style={{ color: s.color }}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider"
                       style={{ color: s.color, opacity: 0.9 }}>
                    {s.label}
                  </div>
                  <div className="text-[15px] font-black tracking-tight mt-0.5"
                       style={{ color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}

              <div className="col-span-3 mt-2">
                <div className="rounded-2xl p-3.5 flex items-center gap-3"
                     style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                  <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                       style={{ background: cfg.bg, color: cfg.color }}>
                    <FaTowerCell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                      {isTracking ? 'Attendance started' : isCompletedToday ? 'Attendance complete' : 'Status'}
                    </div>
                    <div className="text-[12.5px] font-semibold text-slate-900 mt-0.5 truncate">
                      {attendanceRecord?.startTime
                        ? `Started at ${formatTime12h(attendanceRecord.startTime)}`
                        : 'Not started yet today'}
                      {attendanceRecord?.endTime && ` · Ended at ${formatTime12h(attendanceRecord.endTime)}`}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Breaks */}
          {activeTab === 'breaks' && (
            <motion.div
              key="breaks"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {(!attendanceRecord?.breaks || attendanceRecord.breaks.length === 0) ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto rounded-2xl grid place-items-center mb-2"
                       style={{ background: T.cardSoft, color: T.muted }}>
                    <FaMugHot className="w-5 h-5" />
                  </div>
                  <div className="text-[12.5px] font-bold text-slate-900">No breaks yet</div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.muted }}>Take a break to recharge</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {attendanceRecord.breaks.map((b, i) => {
                    const active = b.status === 'ACTIVE';
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{
                          background: active ? 'rgba(251, 191, 36, 0.12)' : T.cardSoft,
                          border: `1px solid ${active ? '#f59e0b' : T.line}`,
                        }}
                      >
                        <div className="w-8 h-8 rounded-full grid place-items-center shrink-0"
                             style={{
                                background: active ? '#f59e0b' : 'rgba(173, 255, 47, 0.25)',
                                color: active ? '#ffffff' : '#365314',
                              }}>
                          {active ? <FaClock className="w-3.5 h-3.5" /> : <FaCheck className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-slate-900">
                            Break #{b.breakNumber}
                            {active && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                                    style={{ background: '#f59e0b', color: '#ffffff' }}>
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px]" style={{ color: T.muted }}>
                            {formatTime12h(b.startTime)}
                            {b.endTime ? ` – ${formatTime12h(b.endTime)} (${formatDurationText(b.duration)})` : ' – In progress'}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: Location */}
          {activeTab === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
            >
              <div className="rounded-2xl p-4" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl grid place-items-center shrink-0"
                       style={{ background: 'rgba(173, 255, 47, 0.22)', color: '#365314' }}>
                    <FaLocationDot className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                      Current Location
                    </div>
                    <div className="text-[14px] font-black tracking-tight text-slate-900 mt-0.5 truncate">
                      {position?.trackingStatus === 'AT_OFFICE'
                        ? 'Pothuri Towers'
                        : position?.road || (position?.latitude
                          ? `${position.latitude.toFixed(3)}, ${position.longitude.toFixed(3)}`
                          : 'Vijayawada, AP')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl p-3 text-center" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                  <div className="w-8 h-8 mx-auto rounded-xl grid place-items-center mb-1.5 bg-white shadow-xs" style={{ color: T.teal }}>
                    <FaGaugeHigh className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>Speed</div>
                  <div className="text-[13px] font-black text-slate-900 mt-0.5">
                    {position?.speed != null && position.speed > 0 ? `${position.speed} km/h` : '0'}
                  </div>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                  <div className="w-8 h-8 mx-auto rounded-xl grid place-items-center mb-1.5 bg-white shadow-xs" style={{ color: '#0284c7' }}>
                    <FaSatelliteDish className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>Accuracy</div>
                  <div className="text-[13px] font-black text-slate-900 mt-0.5">
                    ±{Math.round(position?.accuracy || 5)}m
                  </div>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                  <div className="w-8 h-8 mx-auto rounded-xl grid place-items-center mb-1.5 bg-white shadow-xs" style={{ color: T.orange }}>
                    <FaRotate className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.muted }}>Sync</div>
                  <div className="text-[12px] font-black text-slate-900 mt-0.5 truncate">
                    {lastSyncText?.replace(' ago', '')}
                  </div>
                </div>
              </div>

              <div className="rounded-xl px-3.5 py-2.5 flex items-start gap-2"
                   style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                <FaLock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: T.orange }} />
                <span className="text-[11px] leading-relaxed font-semibold" style={{ color: T.inkSoft }}>
                  Location shared securely with authorized managers only.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ERROR BAR */}
      {error && (
        <div className="mx-5 mb-4 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2"
             style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444' }}>
          <span className="text-[11.5px] font-semibold truncate" style={{ color: '#fca5a5' }}>
            ⚠️ {error}
          </span>
          <button onClick={handleStartAttendance}
                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer shrink-0"
                  style={{ background: '#ef4444', color: '#fff' }}>
            Retry
          </button>
        </div>
      )}

      {/* SIM MODAL */}
      {showSimModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl"
               style={{ background: '#01150f', border: `1px solid ${T.line}`, color: '#ffffff' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="m-0 text-[15px] font-bold text-white">🧪 Simulate Route</h3>
              <button onClick={() => setShowSimModal(false)} className="bg-transparent border-none text-lg cursor-pointer" style={{ color: T.muted }}>✕</button>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: T.inkSoft }}>
              Simulates a field journey from Pothuri Towers through M.G. Road.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowSimModal(false)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{ background: T.cardSoft, border: `1px solid ${T.line}`, color: T.inkSoft }}>Cancel</button>
              <button
                onClick={async () => {
                  setSimulating(true);
                  try {
                    const wps = [
                      { lat: 16.499614, lng: 80.648500, speed: 0, heading: 0 },
                      { lat: 16.500214, lng: 80.649300, speed: 16, heading: 60 },
                      { lat: 16.501014, lng: 80.651300, speed: 32, heading: 75 },
                      { lat: 16.502214, lng: 80.654700, speed: 42, heading: 70 },
                      { lat: 16.503014, lng: 80.657100, speed: 0, heading: 70 },
                      { lat: 16.504414, lng: 80.660500, speed: 36, heading: 60 },
                      { lat: 16.505914, lng: 80.663500, speed: 0, heading: 60 },
                    ];
                    for (const wp of wps) {
                      await trackingAPI.devSimulate({ targetUserId: user?._id, latitude: wp.lat, longitude: wp.lng, speed: wp.speed, heading: wp.heading });
                      setPosition({ latitude: wp.lat, longitude: wp.lng, speed: wp.speed, heading: wp.heading, accuracy: 5 });
                      await new Promise((r) => setTimeout(r, 3000));
                    }
                  } catch (e) { setError(e.message || 'Simulation error'); }
                  finally { setSimulating(false); setShowSimModal(false); }
                }}
                disabled={simulating}
                className="flex-1 py-2 border-none rounded-lg text-xs font-bold cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)',
                  color: '#0a1500',
                  opacity: simulating ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(163,230,53,.35)'
                }}>
                {simulating ? 'Simulating...' : '▶ Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ─────────────────────────────────────────────────────────
   LIVE LEAD DATA — GRAPH STYLE
   ───────────────────────────────────────────────────────── */
function LiveLeadPanel() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [range, setRange] = useState('7d');
  const [mode, setMode] = useState('area'); // 'area' | 'bar' | 'line'
  const [viewType, setViewType] = useState('feed'); // 'feed' | 'graph'
  const [leadSearch, setLeadSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLead, setSelectedLead] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(null);

  const fetchLeads = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        leadsAPI.getAll({ limit: 100, page: 1, sort: '-createdAt' }).catch(() => ({ data: null })),
        leadsAPI.getStats().catch(() => ({ data: null })),
      ]);

      const list = leadsRes?.data?.leads || leadsRes?.data?.data || leadsRes?.data || [];
      const total = leadsRes?.data?.total || (Array.isArray(list) ? list.length : 0);
      setLeads(Array.isArray(list) ? list : []);
      setDbTotal(total);
      if (statsRes?.data) setDbStats(statsRes.data);
      setLastUpdated(Date.now());
    } catch (e) {
      console.warn('Error fetching live leads from DB:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    const id = setInterval(() => fetchLeads(true), 25000);
    return () => clearInterval(id);
  }, []);

  // Filtered leads for Live Feed
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = leadSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.leadSource && l.leadSource.toLowerCase().includes(q)) ||
        (l.assignedTo?.name && l.assignedTo.name.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'All' ||
        (l.status && l.status.toLowerCase() === statusFilter.toLowerCase());

      return matchSearch && matchStatus;
    });
  }, [leads, leadSearch, statusFilter]);

  // Graph aggregation data
  const graphData = useMemo(() => {
    const now = new Date();
    const buckets = [];

    if (range === '7d') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        buckets.push({ label: days[d.getDay()], start: d.getTime(), end: next.getTime(), leads: 0, won: 0 });
      }
    } else if (range === '30d') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        buckets.push({ label: `${d.getDate()}`, start: d.getTime(), end: next.getTime(), leads: 0, won: 0 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const end = new Date(now); end.setDate(now.getDate() - i * 7); end.setHours(23, 59, 59, 999);
        const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
        buckets.push({ label: `W${12 - i}`, start: start.getTime(), end: end.getTime(), leads: 0, won: 0 });
      }
    }

    leads.forEach((lead) => {
      const t = new Date(lead.createdAt).getTime();
      if (isNaN(t)) return;
      const b = buckets.find((bk) => t >= bk.start && t <= bk.end);
      if (!b) return;
      b.leads += 1;
      const s = String(lead.status || '').toLowerCase();
      if (s.includes('won') || s.includes('closed')) b.won += 1;
    });

    return buckets;
  }, [leads, range]);

  // Database Overview counts
  const statsOverview = useMemo(() => {
    const total = dbTotal || leads.length;
    const fresh = dbStats?.globalCounts?.fresh ?? leads.filter(l => l.status === 'Fresh').length;
    const won = dbStats?.globalCounts?.won ?? leads.filter(l => String(l.status || '').toLowerCase().includes('won')).length;
    const active = dbStats?.globalCounts?.active ?? leads.filter(l => ['Connected', 'Call Back Later', 'Demo Scheduled', 'Demo Done'].includes(l.status)).length;
    const peak = Math.max(0, ...graphData.map((d) => d.leads));
    return { total, fresh, won, active, peak };
  }, [dbTotal, dbStats, leads, graphData]);

  const handleCopyPhone = (phone, e) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-3xl h-full flex flex-col min-h-[580px] transition-all duration-300"
      style={{
        background: T.card,
        border: T.glassBorder,
        borderTop: '2.5px solid #adff2f',
        boxShadow: T.glassShadow,
        padding: 22,
        color: T.ink,
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 8, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-10 h-10 rounded-xl grid place-items-center relative shrink-0"
            style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}
          >
            <FaBoltLightning className="w-4 h-4" />
            <motion.span
              animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl"
              style={{ border: '2px solid #84cc16' }}
            />
          </motion.div>
          <div>
            <div className="text-[14.5px] font-bold flex items-center gap-2 text-slate-900">
              Live Lead Data
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold"
                    style={{ background: 'rgba(173, 255, 47, 0.22)', color: '#365314' }}>
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#65a30d' }}
                />
                LIVE · MongoDB ({statsOverview.total})
              </span>
            </div>
            <div className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>
              Auto-synced · {formatLeadTime(new Date(lastUpdated))}
            </div>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Feed / Graph Mode Switcher */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
            <button
              onClick={() => setViewType('feed')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold cursor-pointer transition"
              style={viewType === 'feed'
                ? { background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0a1500', boxShadow: '0 3px 10px rgba(163,230,53,.35)' }
                : { color: T.inkSoft, background: 'transparent' }}
            >
              <FaListUl className="w-3 h-3" />
              <span>Live Feed</span>
              <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-black"
                    style={{ background: viewType === 'feed' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)' }}>
                {filteredLeads.length}
              </span>
            </button>
            <button
              onClick={() => setViewType('graph')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold cursor-pointer transition"
              style={viewType === 'graph'
                ? { background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0a1500', boxShadow: '0 3px 10px rgba(163,230,53,.35)' }
                : { color: T.inkSoft, background: 'transparent' }}
            >
              <FaChartLine className="w-3 h-3" />
              <span>Trends</span>
            </button>
          </div>

          {/* Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchLeads(true)}
            className="w-8.5 h-8.5 rounded-xl grid place-items-center cursor-pointer transition"
            style={{ background: T.cardSoft, color: T.orange, border: `1px solid ${T.line}` }}
            title="Refresh database leads"
          >
            <FaRotate className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>

          {/* Add New Lead */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/leads/new')}
            className="w-8.5 h-8.5 rounded-xl grid place-items-center cursor-pointer transition"
            style={{ background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0a1500', boxShadow: '0 3px 10px rgba(163,230,53,.35)' }}
            title="Add Lead"
          >
            <FaPlus className="w-3 h-3" />
          </motion.button>

          {/* View All Leads Page */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/leads')}
            className="w-8.5 h-8.5 rounded-xl grid place-items-center cursor-pointer transition"
            style={{ background: T.cardSoft, color: T.orange, border: `1px solid ${T.line}` }}
            title="Go to full Leads Manager"
          >
            <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* ── 4 DATABASE OVERVIEW METRIC TILES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { label: 'Total in DB', value: statsOverview.total, color: T.orange, icon: FaInbox, filterKey: 'All' },
          { label: 'Fresh Leads', value: statsOverview.fresh, color: T.blue,   icon: FaBolt, filterKey: 'Fresh' },
          { label: 'In Pipeline', value: statsOverview.active, color: T.amber, icon: FaPhoneVolume, filterKey: 'Connected' },
          { label: 'Won Deals',   value: statsOverview.won,   color: T.green,  icon: FaTrophy, filterKey: 'Won' },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            onClick={() => { setStatusFilter(k.filterKey); if (viewType !== 'feed') setViewType('feed'); }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            whileHover={{ y: -2, boxShadow: `0 6px 16px ${k.color}30` }}
            whileTap={{ scale: 0.97 }}
            className={`rounded-2xl p-2.5 flex items-center gap-2 cursor-pointer transition-all ${
              statusFilter === k.filterKey && viewType === 'feed'
                ? 'ring-2 ring-offset-1 ring-offset-[#01150f]'
                : ''
            }`}
            style={{
              background: T.cardSoft,
              border: `1px solid ${T.line}`,
              ringColor: k.color,
            }}
            title={`Click to filter by ${k.label}`}
          >
            <div className="w-7.5 h-7.5 rounded-xl grid place-items-center shrink-0"
                 style={{ background: `${k.color}20`, color: k.color }}>
              <k.icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-bold uppercase tracking-wider truncate" style={{ color: T.muted }}>
                {k.label}
              </div>
              <div className="text-[15px] font-black tracking-tight leading-none mt-0.5" style={{ color: k.color }}>
                {k.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── MAIN CONTENT AREA (FEED vs GRAPH) ── */}
      <div className="w-full flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-14 gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="w-9 h-9 rounded-full"
              style={{ border: `3px solid rgba(190, 242, 100, 0.20)`, borderTopColor: T.orange }}
            />
            <span className="text-[12px] font-semibold" style={{ color: T.muted }}>
              Fetching live leads from database...
            </span>
          </div>
        ) : viewType === 'feed' ? (
          /* ── LIVE LEADS DATABASE FEED ── */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-3">
              {/* Search Bar */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 max-w-sm"
                   style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                <FaMagnifyingGlass className="w-3.5 h-3.5 shrink-0" style={{ color: T.muted }} />
                <input
                  type="text"
                  placeholder="Search lead by name, phone, source..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-[12px] w-full text-white placeholder:text-gray-400"
                />
                {leadSearch && (
                  <button onClick={() => setLeadSearch('')} className="hover:text-white" style={{ color: T.muted }}>
                    <FaXmark className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[11px]">
                {['All', 'Fresh', 'Connected', 'Demo Scheduled', 'Won', 'Lost'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className="px-2.5 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition text-[11px]"
                    style={statusFilter === st
                      ? { background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0a1500' }
                      : { background: T.cardSoft, color: T.inkSoft, border: `1px solid ${T.line}` }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Leads List Stream */}
            <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-2">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-dashed" style={{ borderColor: T.line }}>
                  <FaInbox className="w-8 h-8 mx-auto mb-2" style={{ color: T.muted }} />
                  <div className="text-[13px] font-bold text-slate-900">No matching leads found</div>
                  <div className="text-[11px] mt-1" style={{ color: T.muted }}>Try adjusting your search query or status filter.</div>
                  {(leadSearch || statusFilter !== 'All') && (
                    <button
                      onClick={() => { setLeadSearch(''); setStatusFilter('All'); }}
                      className="mt-3 px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                      style={{ background: 'rgba(173, 255, 47, 0.22)', color: '#365314', border: `1px solid ${T.line}` }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredLeads.slice(0, 35).map((lead) => (
                  <motion.div
                    key={lead._id}
                    whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                    onClick={() => setSelectedLead(lead)}
                    className="p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition hover:bg-lime-50/40"
                    style={{
                      background: '#f8fafc',
                      border: `1px solid ${T.line}`,
                    }}
                  >
                    {/* Left: Avatar + Lead Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl grid place-items-center font-bold text-[13px] shrink-0"
                           style={{ background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0f172a' }}>
                        {lead.name?.[0]?.toUpperCase() || 'L'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[13px] text-slate-900 truncate">
                            {lead.name}
                          </span>
                          {lead.isStarred && <FaStar className="w-3 h-3 text-amber-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: T.muted }}>
                          <span className="font-mono font-medium" style={{ color: T.inkSoft }}>{lead.phone}</span>
                          <span>•</span>
                          <span>{formatLeadTime(lead.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Badges & Tags */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <StatusBadge status={lead.status} />
                      {lead.leadSource && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: 'rgba(173, 255, 47, 0.20)', color: '#365314' }}>
                          {lead.leadSource}
                        </span>
                      )}
                      {lead.assignedTo?.name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#047857' }}>
                          <FaUser className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[80px]">{lead.assignedTo.name}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#b45309' }}>
                          Unassigned
                        </span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleCopyPhone(lead.phone, e)}
                        className="w-7.5 h-7.5 rounded-lg grid place-items-center hover:bg-white/10 transition"
                        style={{ color: T.muted }}
                        title={copiedPhone === lead.phone ? 'Copied!' : 'Copy Phone'}
                      >
                        {copiedPhone === lead.phone ? <FaCheck className="w-3 h-3 text-emerald-400" /> : <FaCopy className="w-3 h-3" />}
                      </button>
                      <a
                        href={`tel:${lead.phone}`}
                        className="w-7.5 h-7.5 rounded-lg grid place-items-center text-emerald-400 hover:bg-emerald-500/20 transition"
                        title="Call lead"
                      >
                        <FaPhone className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                        style={{ background: T.cardSoft, color: T.orange, border: `1px solid ${T.line}` }}
                      >
                        <FaEye className="w-3 h-3" />
                        <span className="hidden md:inline">Details</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ── ANALYTICS GRAPH VIEW ── */
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 p-1 rounded-full" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                {[{id:'7d',label:'7D'},{id:'30d',label:'30D'},{id:'90d',label:'90D'}].map((r) => (
                  <button key={r.id} onClick={() => setRange(r.id)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition"
                    style={range === r.id
                      ? { background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0a1500', boxShadow: '0 2px 8px rgba(163,230,53,.35)' }
                      : { color: T.inkSoft, background: 'transparent' }}>
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 p-1 rounded-full" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                {[{id:'area',label:'Area'},{id:'bar',label:'Bar'},{id:'line',label:'Line'}].map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition"
                    style={mode === m.id
                      ? { background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0a1500', boxShadow: '0 2px 8px rgba(163,230,53,.35)' }
                      : { color: T.inkSoft, background: 'transparent' }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                {mode === 'area' ? (
                  <AreaChart data={graphData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="llArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.orange} stopOpacity={0.45} />
                        <stop offset="95%" stopColor={T.orange} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="llWon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.green} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={T.green} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false} />
                    <XAxis dataKey="label" stroke={T.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={T.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ stroke: T.orange, strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{ background: '#01150f', border: `1px solid ${T.line}`, borderRadius: 12, fontSize: 12, boxShadow: '0 10px 25px rgba(0,0,0,.6)', color: '#ffffff' }}
                    />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke={T.orange} strokeWidth={2.5} fillOpacity={1} fill="url(#llArea)" />
                    <Area type="monotone" dataKey="won"   name="Won"   stroke={T.green}  strokeWidth={2}   fillOpacity={1} fill="url(#llWon)" />
                  </AreaChart>
                ) : mode === 'bar' ? (
                  <BarChart data={graphData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false} />
                    <XAxis dataKey="label" stroke={T.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={T.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(190, 242, 100, 0.08)' }}
                      contentStyle={{ background: '#01150f', border: `1px solid ${T.line}`, borderRadius: 12, fontSize: 12, boxShadow: '0 10px 25px rgba(0,0,0,.6)', color: '#ffffff' }}
                    />
                    <Bar dataKey="leads" name="Leads" radius={[10, 10, 0, 0]}>
                      {graphData.map((entry, i) => (
                        <Cell key={i} fill={entry.leads === statsOverview.peak ? T.orange : `${T.orange}88`} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={graphData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false} />
                    <XAxis dataKey="label" stroke={T.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={T.muted} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#01150f', border: `1px solid ${T.line}`, borderRadius: 12, fontSize: 12, boxShadow: '0 10px 25px rgba(0,0,0,.6)', color: '#ffffff' }} />
                    <Line type="monotone" dataKey="leads" name="Leads" stroke={T.orange} strokeWidth={3} dot={{ r: 3, fill: T.orange }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="won" name="Won" stroke={T.green} strokeWidth={2} dot={{ r: 3, fill: T.green }} activeDot={{ r: 5 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER STATUS BAR ── */}
      <div className="flex items-center gap-4 mt-3 pt-3 text-[11.5px]" style={{ borderTop: `1px solid ${T.line}` }}>
        <div className="flex items-center gap-1.5" style={{ color: T.inkSoft }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: T.orange }} />
          <span>Total Database Leads: <strong className="text-white">{statsOverview.total}</strong></span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: T.inkSoft }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: T.green }} />
          <span>Won: <strong className="text-white">{statsOverview.won}</strong></span>
        </div>
        <div className="ml-auto flex items-center gap-1.5" style={{ color: T.muted }}>
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: T.orange }}
          />
          Live MongoDB Connected
        </div>
      </div>

      {/* ── LEAD DETAILS MODAL ── */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="rounded-3xl p-6 w-full max-w-lg shadow-2xl text-white max-h-[90vh] overflow-y-auto"
              style={{
                background: '#01150f',
                border: `1px solid ${T.line}`,
                boxShadow: '0 25px 60px rgba(0,0,0,.7)',
              }}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl grid place-items-center font-bold text-lg shrink-0 shadow-sm"
                       style={{ background: 'linear-gradient(135deg, #bef264, #a3e635, #16a34a)', color: '#0a1500' }}>
                    {selectedLead.name?.[0]?.toUpperCase() || 'L'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[17px] text-white m-0">
                        {selectedLead.name}
                      </h3>
                      {selectedLead.isStarred && <FaStar className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={selectedLead.status} />
                      <span className="text-[11px]" style={{ color: T.muted }}>ID: {selectedLead._id?.slice(-6)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 grid place-items-center cursor-pointer"
                  style={{ color: T.muted }}
                >
                  <FaXmark className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body - Database Fields */}
              <div className="py-4 space-y-4 text-[12.5px]">
                {/* Contact Information */}
                <div className="p-3.5 rounded-2xl space-y-2"
                     style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.orange }}>Contact Details</div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: T.muted }}>Phone:</span>
                    <div className="flex items-center gap-2 font-mono font-semibold text-white">
                      <span>{selectedLead.phone}</span>
                      <a href={`tel:${selectedLead.phone}`} className="text-emerald-400 hover:underline">
                        <FaPhone className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  {selectedLead.alternatePhone && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: T.muted }}>Alt Phone:</span>
                      <span className="font-mono text-white">{selectedLead.alternatePhone}</span>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: T.muted }}>Email:</span>
                      <span className="text-white">{selectedLead.email}</span>
                    </div>
                  )}
                  {selectedLead.location && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: T.muted }}>Location:</span>
                      <span className="text-white font-medium">{selectedLead.location}</span>
                    </div>
                  )}
                </div>

                {/* Pipeline & Source Information */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: T.orange }}>Lead Source</div>
                    <div className="font-bold text-white text-[13px] mt-1">
                      {selectedLead.leadSource || 'Manual'}
                    </div>
                    {selectedLead.sourceSheetName && (
                      <div className="text-[10.5px] mt-0.5" style={{ color: T.muted }}>Sheet: {selectedLead.sourceSheetName}</div>
                    )}
                  </div>
                  <div className="p-3 rounded-2xl" style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: T.orange }}>Budget</div>
                    <div className="font-bold text-white text-[13px] mt-1">
                      {selectedLead.budget ? `₹${selectedLead.budget.toLocaleString('en-IN')}` : 'Not Specified'}
                    </div>
                  </div>
                </div>

                {/* Assignment & Call Stats */}
                <div className="p-3.5 rounded-2xl space-y-2"
                     style={{ background: T.cardSoft, border: `1px solid ${T.line}` }}>
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: T.orange }}>Assigned Agent & Activity</div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: T.muted }}>Assigned To:</span>
                    <span className="font-semibold text-white">
                      {selectedLead.assignedTo?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: T.muted }}>Total Calls Made:</span>
                    <span className="font-bold" style={{ color: T.orange }}>{selectedLead.totalCalls || 0} calls</span>
                  </div>
                  {selectedLead.lastCalledAt && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: T.muted }}>Last Called:</span>
                      <span className="text-white font-medium">{new Date(selectedLead.lastCalledAt).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span style={{ color: T.muted }}>Date Added:</span>
                    <span className="text-white">{new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3" style={{ borderTop: `1px solid ${T.line}` }}>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-xl text-[12.5px] font-semibold cursor-pointer transition"
                  style={{ background: T.cardSoft, border: `1px solid ${T.line}`, color: T.inkSoft }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/leads/${selectedLead._id}`)}
                  className="px-4 py-2 rounded-xl text-[12.5px] font-bold cursor-pointer transition flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #bef264 0%, #a3e635 55%, #65a30d 100%)',
                    color: '#0a1500',
                    boxShadow: '0 4px 16px rgba(163,230,53,.35)'
                  }}
                >
                  <span>Open Full Lead Profile</span>
                  <FaArrowUpRightFromSquare className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN DASHBOARD
   ───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [employeesActivityData, setEmployeesActivityData] = useState({
    dates: {}, office: {}, totalEmployees: 0, activeEmployees: 0, employees: [],
  });
  const [activitySearch, setActivitySearch] = useState('');
  const [detailModalEmployee, setDetailModalEmployee] = useState(null);
  const [mapModalEmployee, setMapModalEmployee] = useState(null);

  const isSuperAdmin = user?.role === 'admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const fetchData = async () => {
    setFetchError(null);
    try {
      if (isAdmin || isSuperAdmin) {
        const [statsRes, adminRes, usersRes, activityRes] = await Promise.all([
          leadsAPI.getStats().catch(e => { throw new Error(`leads/stats: ${e.response?.data?.message || e.message}`); }),
          reportsAPI.adminAnalysis().catch(() => ({ data: null })),
          usersAPI.getAll().catch(e => { throw new Error(`users: ${e.response?.data?.message || e.message}`); }),
          reportsAPI.getEmployeesLiveActivity().catch(() => ({ data: null })),
        ]);
        setStats(statsRes.data);
        if (adminRes.data) setAdminStats(adminRes.data);
        setCallers(usersRes.data.users?.filter(u => u.role === 'employee' || u.role === 'caller') || []);
        if (activityRes?.data?.ok) setEmployeesActivityData(activityRes.data);
      } else {
        setStats((await leadsAPI.getStats()).data);
      }
    } catch (e) { setFetchError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.role) fetchData(); }, [user?.role]);

  const filteredActivityEmployees = useMemo(() => {
    const list = employeesActivityData.employees || [];
    if (!activitySearch.trim()) return list;
    const q = activitySearch.toLowerCase().trim();
    return list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  }, [employeesActivityData.employees, activitySearch]);

  const actualDemosCombined = adminStats?.demosScheduledThisMonth || stats?.byStatus?.['Demo Scheduled'] || 0;
  const activeStaffList = employeesActivityData.employees || [];
  const activeCount = employeesActivityData.activeEmployees || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: T.bg }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          className="w-11 h-11 rounded-full"
          style={{ border: '4px solid rgba(190, 242, 100, 0.18)', borderTopColor: T.orange }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-7 relative overflow-x-hidden" style={{ background: '#f8fafc', color: T.ink, fontFamily: 'Inter, sans-serif' }}>

      <div className="relative z-10">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-slate-900">
              Welcome back, <span style={{ color: '#4d7c0f' }}>{user?.name || 'Ameen'}!</span>
            </h1>
            <p className="text-[13.5px] mt-1" style={{ color: T.muted }}>
              Here's what's happening in your workspace today.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition"
              style={{ background: '#ffffff', border: `1px solid ${T.line}`, color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <FaFilter className="w-3.5 h-3.5" style={{ color: T.orange }} /> Filters
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition"
              style={{ background: '#ffffff', border: `1px solid ${T.line}`, color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <FaFileLines className="w-3.5 h-3.5" style={{ color: T.orange }} /> Exports
            </motion.button>
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/leads/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition"
              style={{
                background: 'linear-gradient(135deg, #bef264 0%, #a3e635 60%, #84cc16 100%)',
                color: '#0f172a',
                border: '1px solid #84cc16',
                boxShadow: '0 4px 14px rgba(163,230,53,.35)',
              }}>
              <FaPlus className="w-3 h-3" /> Add card
            </motion.button>
          </div>
        </div>

        {/* ── EXTRA COLOR WHITE GLASS KPI STRIP ───── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Cyan Glass Card: Active Pipeline */}
          <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 350 }}
            className="rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all bg-white"
            style={{
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #0284c7',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pipeline Flow</span>
              <div className="w-8 h-8 rounded-xl grid place-items-center"
                   style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7' }}>
                <FaChartLine className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 mb-1">
              {stats?.totalLeads ? stats.totalLeads.toLocaleString() : '1,420'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-700">
              <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px]"
                    style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.30)' }}>
                +14.8%
              </span>
              <span className="text-slate-500 truncate">vs previous month</span>
            </div>
          </motion.div>

          {/* Electric Lime Glass Card: Team On-Duty */}
          <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 350 }}
            className="rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all bg-white"
            style={{
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #adff2f',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Team Duty</span>
              <div className="w-8 h-8 rounded-xl grid place-items-center"
                   style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>
                <FaUsers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 mb-1">
              {activeCount} <span className="text-[16px] font-bold text-slate-500">/ {activeStaffList.length || 8}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
              <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1"
                    style={{ background: 'rgba(173, 255, 47, 0.25)', border: '1px solid rgba(163, 230, 53, 0.50)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" /> Live GPS
              </span>
              <span className="text-slate-500 truncate">active in field & desk</span>
            </div>
          </motion.div>

          {/* Radiant Purple / Violet Glass Card: Demos Scheduled */}
          <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 350 }}
            className="rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all bg-white"
            style={{
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #7c3aed',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Demos Booked</span>
              <div className="w-8 h-8 rounded-xl grid place-items-center"
                   style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#7c3aed' }}>
                <FaCalendarCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 mb-1">
              {actualDemosCombined}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple-700">
              <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px]"
                    style={{ background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.35)' }}>
                92% Show
              </span>
              <span className="text-slate-500 truncate">scheduled this month</span>
            </div>
          </motion.div>

          {/* Vibrant Emerald Glass Card: Deal Conversion */}
          <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 350 }}
            className="rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all bg-white"
            style={{
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #10b981',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Win Velocity</span>
              <div className="w-8 h-8 rounded-xl grid place-items-center"
                   style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                <FaCoins className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 mb-1">
              78.4%
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="px-1.5 py-0.5 rounded-full font-bold text-[10px]"
                    style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                Top Tier
              </span>
              <span className="text-slate-500 truncate">closing cycle rating</span>
            </div>
          </motion.div>
        </div>

        {/* ── TWO COLUMNS: ATTENDANCE + LIVE LEAD DATA ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <EmployeeTrackingCard />
          <LiveLeadPanel />
        </div>

        {/* ── BOTTOM ROW: TEAM ACTIVITY + DEMOS ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          <motion.div whileHover={{ y: -3 }} className="rounded-3xl transition-all duration-300"
            style={{
              background: '#ffffff',
              border: `1px solid ${T.line}`,
              borderTop: '2.5px solid #adff2f',
              boxShadow: T.glassShadow,
              padding: 22,
            }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-[14.5px] font-bold flex items-center gap-2 text-slate-900">
                <FaTowerCell className="w-4 h-4" style={{ color: '#4d7c0f' }} /> Team Activity
              </div>
              <div className="text-[11.5px] mt-0.5 text-slate-500">Live presence, GPS & attendance</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                   style={{ background: '#f8fafc', border: `1px solid ${T.line}` }}>
                <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Search staff..." value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-[12px] w-28 sm:w-36 text-slate-900 placeholder:text-slate-400" />
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/admin/employee-tracking')}
                className="w-9 h-9 rounded-xl grid place-items-center cursor-pointer transition"
                style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>
                <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] text-left">
              <thead>
                <tr style={{ color: '#64748b', borderBottom: `1px solid ${T.line}` }}>
                  <th className="pb-3 font-semibold">Employee</th>
                  <th className="pb-3 text-center font-semibold">Status</th>
                  <th className="pb-3 text-center font-semibold">Calls</th>
                  <th className="pb-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivityEmployees.slice(0, 6).map((emp) => {
                  const badge = getLiveStatusBadge(emp.liveStatus);
                  return (
                    <tr key={emp._id} className="transition-colors hover:bg-lime-50/60 cursor-pointer"
                        style={{ borderBottom: `1px solid ${T.line}` }}
                        onClick={() => setDetailModalEmployee(emp)}>
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-[12px] shrink-0"
                                style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>
                            {emp.name?.[0]?.toUpperCase() || 'E'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{emp.name}</div>
                            <div className="text-[10.5px] text-slate-500">{emp.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                              style={{ background: badge.bg, color: badge.color }}>
                          <motion.span animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                            transition={{ duration: 1.8, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="text-center font-bold text-slate-900">{emp.calls?.today?.count || 0}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}
                            onClick={(e) => { e.stopPropagation(); setDetailModalEmployee(emp); }}
                            className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition"
                            style={{ background: '#f8fafc', border: `1px solid ${T.line}`, color: '#334155' }}>
                            Profile
                          </motion.button>
                          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}
                            onClick={(e) => { e.stopPropagation(); setMapModalEmployee(emp); }}
                            className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0f172a' }}>
                            Map
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="rounded-3xl flex flex-col gap-6 transition-all duration-300"
          style={{
            background: '#ffffff',
            border: `1px solid ${T.line}`,
            borderTop: '2.5px solid #adff2f',
            boxShadow: T.glassShadow,
            padding: 22,
          }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center"
                     style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>
                  <FaCalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-900">Demos Scheduled</div>
                  <div className="text-[11px] text-slate-500">This month</div>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/tasks')}
                className="w-9 h-9 rounded-xl grid place-items-center cursor-pointer transition"
                style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>
                <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
              </motion.button>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-[30px] font-black tracking-tight text-slate-900">{actualDemosCombined}</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>Live</span>
            </div>
          </div>

          <div className="pt-4" style={{ borderTop: `1px solid ${T.line}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-bold text-slate-900">Team Presence</div>
                <div className="text-[11px] text-slate-500">{activeCount} active now</div>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/users')}
                className="w-9 h-9 rounded-xl grid place-items-center cursor-pointer transition"
                style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>
                <FaArrowUpRightFromSquare className="w-3.5 h-3.5" />
              </motion.button>
            </div>
            <div className="flex items-center -space-x-3">
              {activeStaffList.slice(0, 5).map((emp, i) => (
                <motion.div key={emp._id || i} whileHover={{ scale: 1.15, zIndex: 10 }}
                  onClick={() => setDetailModalEmployee(emp)}
                  className="w-10 h-10 rounded-full grid place-items-center font-bold text-[12px] cursor-pointer"
                  style={{ background: '#f1f5f9', color: '#365314', border: '2px solid #adff2f' }}
                  title={emp.name}>
                  {emp.name?.[0]?.toUpperCase() || 'E'}
                </motion.div>
              ))}
              {activeStaffList.length > 5 && (
                <div className="w-10 h-10 rounded-full grid place-items-center font-bold text-[12px]"
                     style={{ background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)', color: '#0f172a', border: '2px solid #adff2f' }}>
                  +{activeStaffList.length - 5}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {mapModalEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
               style={{ background: 'rgba(15, 23, 42, 0.55)' }}
               onClick={() => setMapModalEmployee(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-4xl h-[80vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#ffffff', border: `1px solid ${T.line}`, borderTop: '3px solid #adff2f' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="p-4 flex items-center justify-between"
                   style={{ background: '#f8fafc', borderBottom: `1px solid ${T.line}` }}>
                <div className="flex items-center gap-3">
                  <FaMapLocationDot className="w-5 h-5" style={{ color: '#4d7c0f' }} />
                  <div>
                    <div className="text-[14px] font-bold text-slate-900">Live Map — {mapModalEmployee.name}</div>
                    <div className="text-[12px] text-slate-500">
                      {mapModalEmployee.location?.formattedAddress || 'Tracking live'}
                    </div>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setMapModalEmployee(null)} className="cursor-pointer text-slate-400 hover:text-slate-700">
                  <FaXmark className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="flex-1 relative">
                <LiveMap employees={[mapModalEmployee]} selectedEmployee={mapModalEmployee}
                  onSelectEmployee={() => {}} officeConfig={employeesActivityData.office} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailModalEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
               style={{ background: 'rgba(15, 23, 42, 0.55)' }}
               onClick={() => setDetailModalEmployee(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#ffffff', border: `1px solid ${T.line}`, borderTop: '3px solid #adff2f' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="p-5 flex items-center justify-between"
                   style={{ background: '#f8fafc', borderBottom: `1px solid ${T.line}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full grid place-items-center font-bold text-[14px]"
                       style={{ background: 'rgba(173, 255, 47, 0.25)', color: '#365314' }}>
                    {detailModalEmployee.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-slate-900">{detailModalEmployee.name}</div>
                    <div className="text-[12px] text-slate-500">{detailModalEmployee.email}</div>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setDetailModalEmployee(null)} className="cursor-pointer text-slate-400 hover:text-slate-700">
                  <FaXmark className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="p-6 overflow-y-auto flex flex-col gap-4 text-[12.5px]">
                <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: `1px solid ${T.line}` }}>
                  <div className="text-[12px] font-bold uppercase mb-2" style={{ color: '#4d7c0f' }}>Today's Attendance</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>Start: <strong className="text-slate-900">{detailModalEmployee.todayAttendance?.startTimeFormatted || 'Not Started'}</strong></div>
                    <div>End: <strong className="text-slate-900">{detailModalEmployee.todayAttendance?.endTimeFormatted || '—'}</strong></div>
                    <div>Duration: <strong className="text-slate-900">{detailModalEmployee.todayAttendance?.durationFormatted || '00:00:00'}</strong></div>
                    <div>Actual: <strong style={{ color: '#4d7c0f' }}>{detailModalEmployee.todayAttendance?.formattedActualWork || '0m'}</strong></div>
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: '#ffffff', border: `1px solid ${T.line}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold uppercase flex items-center gap-2 text-slate-900">
                      <FaLocationDot style={{ color: '#4d7c0f' }} /> Live GPS
                    </span>
                    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}
                      onClick={() => { const t = detailModalEmployee; setDetailModalEmployee(null); setMapModalEmployee(t); }}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #bef264, #a3e635)', color: '#0f172a' }}>
                      <FaMapLocationDot /> View Map
                    </motion.button>
                  </div>
                  <div className="font-medium text-slate-800">
                    {detailModalEmployee.location?.formattedAddress || 'Location unavailable'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}