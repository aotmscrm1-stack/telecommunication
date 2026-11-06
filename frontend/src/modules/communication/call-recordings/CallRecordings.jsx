import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AudioLines, Table, PhoneCall, FileAudio, 
  Clock, MoreVertical, Download, ExternalLink, RefreshCw, User, Sparkles,
  Check, Trash2, Megaphone, Search, X, Link2, Unlink, Layers, CheckCircle2,
  ChevronLeft, ChevronRight, Headphones
} from 'lucide-react';
import { recordingsAPI, metaLeadsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { formatISTDateTime } from '../../../utils/dateFormat';
import { isHR, isCEO, isManager, canViewCallRecordings } from '../../../utils/permissions';
import TranscriptConversationModal from '../../../components/TranscriptConversationModal';
import EmployeeProfileModal from '../../../components/dashboard/EmployeeProfileModal';
import CallAnalyticsCards from './components/CallAnalyticsCards';
import SpotlightCard from '../../../components/ui/SpotlightCard';
import AnimatedNumber from '../../../components/ui/AnimatedNumber';
import AutoScrollText from '../../../components/common/AutoScrollText';

// ── CALLER PROFILE AVATAR (Renders user profile image with fallback initial)
function CallerAvatar({ src, name, size = 28, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || 'U').trim().charAt(0).toUpperCase();
  const validSrc =
    src && typeof src === 'string' && src.trim().length > 0 && !imgError
      ? src.trim()
      : null;

  if (validSrc) {
    return (
      <img
        src={validSrc}
        alt={name || 'Caller'}
        onError={() => setImgError(true)}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`rounded-full object-cover border border-sky-200 shadow-2xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-semibold shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}

// ── CUSTOM VOICE AUDIO PLAYER (Play/Pause, Seek Scrubber, Current Time & Total Duration — Mute/Volume Removed)
const MemoizedAudioPlayer = memo(function MemoizedAudioPlayer({
  audioUrl,
  mimeType,
  fileExists,
  fileAvailable,
  initialDuration = 0,
  onDurationDetected,
  onRetry,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);

  // Generate candidate URLs (direct Cloudinary/stream URL + remote Render fallback)
  const candidateUrls = [audioUrl];
  if (audioUrl) {
    const filename = audioUrl.split('/').pop().split('?')[0];
    const remoteStreamUrl = `https://telecommunication-l3oz.onrender.com/api/recordings/stream/${filename}`;
    if (!audioUrl.includes('telecommunication-l3oz.onrender.com') && !audioUrl.includes('res.cloudinary.com')) {
      candidateUrls.push(remoteStreamUrl);
    }
  }

  const effectiveAudioUrl = candidateUrls[currentUrlIndex] || audioUrl;

  useEffect(() => {
    // Reset player states if audio source changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(initialDuration || 0);
    setLoadError(false);
    setIsLoading(false);
    setCurrentUrlIndex(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!duration && initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [currentUrlIndex]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
          })
          .catch(err => {
            setIsLoading(false);
            if (err.name === 'AbortError') {
              console.debug('Audio play request interrupted/aborted safely.');
              return;
            }
            console.warn('Audio play error:', err);
            handleAudioError(err);
          });
      }
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      const rawDur = audioRef.current.duration;
      if (rawDur && isFinite(rawDur) && rawDur > 0) {
        setDuration(rawDur);
        if (onDurationDetected) {
          onDurationDetected(Math.round(rawDur));
        }
      }
      setIsLoading(false);
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatSec = (sec) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleAudioError = () => {
    // If first candidate failed, try fallback remote URL before giving error
    if (currentUrlIndex < candidateUrls.length - 1) {
      console.warn(`Primary audio playback failed at ${effectiveAudioUrl}. Trying fallback stream...`);
      setCurrentUrlIndex(prev => prev + 1);
      setIsLoading(true);
      return;
    }
    setLoadError(true);
    setIsLoading(false);
  };

  // 1. If audio file is missing on storage or marked unavailable, gracefully show transcript preserved badge
  const isCloudinary = !!(audioUrl && (audioUrl.includes('cloudinary.com') || audioUrl.includes('res.cloudinary.com')));
  const isAvailable = !!audioUrl && (isCloudinary || (fileExists !== false && fileAvailable !== false));

  if (!isAvailable) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: '#64748b',
        fontSize: '11px',
        background: '#f1f5f9',
        padding: '5px 10px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        fontWeight: 500,
        boxSizing: 'border-box',
        width: '100%',
        justifyContent: 'center'
      }}>
        <FileAudio style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
        <span>Audio unavailable — transcript preserved</span>
      </div>
    );
  }

  // 2. Playback error state for available files
  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', color: '#dc2626', fontSize: '11px', padding: '4px 0' }}>
        <span>⚠️ Playback error</span>
        <button
          onClick={() => {
            setLoadError(false);
            setCurrentUrlIndex(0);
            if (audioRef.current) {
              audioRef.current.load();
              audioRef.current.play().catch(() => {});
            }
          }}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden', padding: '2px 0' }}>
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlaying={() => setIsLoading(false)}
        onError={handleAudioError}
      >
        <source src={effectiveAudioUrl} type={mimeType || 'audio/mp4'} />
        Your browser does not support the audio element.
      </audio>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        minWidth: 0
      }}>
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#0284c7',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 5px rgba(2, 132, 199, 0.35)',
            transition: 'transform 0.1s',
            padding: 0,
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isPlaying ? (
            <span style={{ fontSize: '11px', fontWeight: 900 }}>❚❚</span>
          ) : (
            <span style={{ fontSize: '11px', marginLeft: '1.5px' }}>▶</span>
          )}
        </button>

        {/* Current Time */}
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#475569',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}>
          {formatSec(currentTime)}
        </span>

        {/* Seek Scrubber Progress Bar — Mute/Volume Removed */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          style={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            height: '5px',
            borderRadius: '3px',
            cursor: 'pointer',
            accentColor: '#0284c7',
            margin: 0,
            padding: 0,
          }}
        />

        {/* Total Duration */}
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748b',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}>
          {formatSec(duration)}
        </span>
      </div>
    </div>
  );
});

// ── COLOR PALETTE ────────────────────────────────────────────────────────────
const C = {
  blue: '#0284c7',
  blueDark: '#0369a1',
  blueLight: '#e0f2fe',
  blueSoft: 'rgba(2, 132, 199, 0.08)',
  orange: '#f97316',
  orangeDark: '#ea580c',
  orangeLight: '#ffedd5',
  purple: '#7c3aed',
  purpleDark: '#6d28d9',
  purpleLight: '#f3e8ff',
  purpleSoft: 'rgba(124, 58, 237, 0.08)',
  dark: '#0f172a',
  bgSoft: '#f8fafc',
  border: '#e2e8f0',
  textSoft: '#64748b',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  greenBorder: '#bbf7d0',
};

// ── RESOLVE LINK METADATA HELPER ───────────────────────────────────────────
function getLinkInfo(rec) {
  if (!rec) {
    return {
      isLinked: false,
      type: null,
      name: 'Unlinked Session',
      badgeLabel: '⚠️ Unlinked',
      subDetail: '',
      badgeColor: '#f97316',
      badgeBg: '#fff7ed',
      badgeBorder: '#fed7aa',
      avatarBg: '#fff7ed',
      avatarColor: '#ea580c',
      avatarIcon: '?',
    };
  }

  // Meta Lead (primary & legacy linked records displayed as Meta Lead)
  if (rec.linkType === 'meta_lead' || rec.metaLeadId || rec.linkType === 'lead' || rec.leadId || rec.lead) {
    const rawName = rec.metaLeadName || rec.leadName || rec.lead?.name || 'Meta Lead';
    const name = String(rawName).replace(/^(?:p|l):[\d]+\s*/i, '').trim() || 'Meta Lead';
    const camp = rec.campaignName || rec.metaLeadCampaign;
    const phone = rec.metaLeadPhone || rec.leadPhone || rec.lead?.phone;
    return {
      isLinked: true,
      type: 'meta_lead',
      name: name,
      badgeLabel: camp ? `Meta Lead • ${camp}` : 'Meta Lead',
      subDetail: camp ? `Campaign: ${camp}` : (phone ? `📞 ${phone}` : ''),
      badgeColor: '#7c3aed',
      badgeBg: '#f3e8ff',
      badgeBorder: '#ddd6fe',
      avatarBg: '#ede9fe',
      avatarColor: '#6d28d9',
      avatarIcon: name ? name.charAt(0).toUpperCase() : 'M',
    };
  }

  // Unlinked
  return {
    isLinked: false,
    type: null,
    name: 'Unlinked Session',
    badgeLabel: '⚠️ Unlinked',
    subDetail: '',
    badgeColor: '#f97316',
    badgeBg: '#fff7ed',
    badgeBorder: '#fed7aa',
    avatarBg: '#fff7ed',
    avatarColor: '#ea580c',
    avatarIcon: '?',
  };
}

// ── THREE DOTS MENU DROPDOWN ────────────────────────────────────────────────
function ThreeDotsMenu({ audioUrl, originalName, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!audioUrl && !onDelete) return null;

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        title="More Options"
        style={{
          background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: '6px',
          width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: C.textSoft, transition: 'all 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
      >
        <MoreVertical style={{ width: '14px', height: '14px' }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', right: 0, top: '34px', zIndex: 100,
              background: '#ffffff', border: `1px solid ${C.border}`, borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', padding: '6px', width: '160px',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}
          >
            {audioUrl ? (
              <>
                <a
                  href={audioUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '7px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                    color: C.dark, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ExternalLink style={{ width: '13px', height: '13px', color: C.green }} /> Open Stream
                </a>

                <a
                  href={audioUrl}
                  download={originalName || 'recording.m4a'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '7px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                    color: C.dark, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Download style={{ width: '13px', height: '13px', color: C.blue }} /> Download
                </a>
              </>
            ) : null}

            {onDelete ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                style={{
                  padding: '7px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  color: '#dc2626', background: 'none', border: 'none', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  transition: 'background 0.15s', width: '100%'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 style={{ width: '13px', height: '13px', color: '#dc2626' }} /> Delete Audio
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



// ── MODAL: LINK RECORDING SESSION ("Create Todo Item" Style + ReactBits) ──────
const TODO_DEEP_BLUE = '#023047';
const TODO_BLUE_GREEN = '#219ebc';
const TODO_SKY_SURFACE = '#e8f4fa';
const TODO_BORDER = '#bbdff0';
const TODO_ORANGE = '#fb8500';
const TODO_MUTED = '#5b7082';

function LinkSessionModal({ recording, onClose, onLinked }) {
  const [search, setSearch] = useState('');
  const [metaCampaignFilter, setMetaCampaignFilter] = useState('all');

  const [metaLeads, setMetaLeads] = useState([]);
  const [allCampaignNames, setAllCampaignNames] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  // Normalize 10-digit phone for smart phone match highlighting
  const norm10 = (val) => {
    const digits = String(val || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : '';
  };
  const recPhone10 = norm10(recording.phone);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const metaRes = await metaLeadsAPI.getAll({ limit: 5000, forLinking: 'true' });
        if (!isMounted) return;

        const list = metaRes.data?.leads || metaRes.data || [];
        const safeList = Array.isArray(list) ? list : [];
        setMetaLeads(safeList);

        const serverCamps = Array.isArray(metaRes.data?.allCampaigns) ? metaRes.data.allCampaigns : [];
        const leadCamps = safeList.map(m => m.campaign).filter(Boolean);
        const mergedCamps = Array.from(new Set([...serverCamps, ...leadCamps])).sort();
        setAllCampaignNames(mergedCamps);

        // Pre-select currently linked Meta Lead or auto-matched phone lead
        const existingLinked = safeList.find(m => String(m._id || m.id) === String(recording.metaLeadId));
        if (existingLinked) {
          setSelectedLead(existingLinked);
        } else if (recPhone10) {
          const phoneMatched = safeList.find(
            m => norm10(m.phone || m.normalizedPhone || m.rawData?.phone_number || m.rawData?.phone) === recPhone10
          );
          if (phoneMatched) setSelectedLead(phoneMatched);
        }
      } catch (err) {
        console.error('Failed to load Meta Leads for session linking:', err);
        if (isMounted) setError('Failed to load Meta Leads for linking.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [recording.metaLeadId, recPhone10]);

  const campaignCounts = {};
  metaLeads.forEach(m => {
    const c = m.campaign || 'Uncategorized';
    campaignCounts[c] = (campaignCounts[c] || 0) + 1;
  });

  const distinctMetaCampaigns = allCampaignNames.length > 0
    ? allCampaignNames
    : Array.from(new Set(metaLeads.map(m => m.campaign).filter(Boolean))).sort();

  const handleUnlink = async () => {
    setUnlinking(true);
    setError('');
    try {
      await recordingsAPI.linkLead(recording._id, { linkType: null });
      onLinked();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unlink session.');
    } finally {
      setUnlinking(false);
    }
  };

  const handleSaveLink = async (leadToLink = selectedLead) => {
    if (!leadToLink) {
      setError('Please select a Meta Lead to link');
      return;
    }
    const recId = leadToLink._id || leadToLink.id;
    setSaving(true);
    setError('');

    try {
      const rawName = leadToLink.fullName || leadToLink.rawData?.full_name || leadToLink.rawData?.name || leadToLink.rawData?.['Full Name'] || 'Meta Lead';
      const name = String(rawName).replace(/^(?:p|l):[\d]+\s*/i, '').trim() || 'Meta Lead';
      const phone = leadToLink.phone || leadToLink.normalizedPhone || leadToLink.rawData?.phone_number || leadToLink.rawData?.phone || null;
      await recordingsAPI.linkLead(recording._id, {
        linkType: 'meta_lead',
        metaLeadId: recId,
        metaLeadName: name,
        metaLeadPhone: phone,
        campaignName: leadToLink.campaign || null,
      });
      onLinked();
      onClose();
    } catch (err) {
      console.error('Failed to link session:', err);
      setError(err.response?.data?.error || 'Failed to link session.');
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();

  const filteredMeta = metaLeads
    .filter(m => {
      if (metaCampaignFilter !== 'all' && m.campaign !== metaCampaignFilter) return false;
      if (!q) return true;
      const name = String(m.fullName || m.rawData?.full_name || m.rawData?.name || m.rawData?.['Full Name'] || '').toLowerCase();
      const phone = String(m.phone || m.normalizedPhone || m.rawData?.phone_number || m.rawData?.phone || '').toLowerCase();
      const email = String(m.email || m.rawData?.email || m.rawData?.Email || '').toLowerCase();
      const camp = String(m.campaign || '').toLowerCase();
      const city = String(m.city || m.rawData?.city || m.rawData?.City || '').toLowerCase();
      const status = String(m.status || '').toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        camp.includes(q) ||
        city.includes(q) ||
        status.includes(q)
      );
    })
    .sort((a, b) => {
      const aId = String(a._id || a.id);
      const bId = String(b._id || b.id);
      const aCurrent = String(recording.metaLeadId) === aId ? 1 : 0;
      const bCurrent = String(recording.metaLeadId) === bId ? 1 : 0;
      if (aCurrent !== bCurrent) return bCurrent - aCurrent;

      if (recPhone10) {
        const aPhoneMatch = norm10(a.phone || a.normalizedPhone || a.rawData?.phone_number) === recPhone10 ? 1 : 0;
        const bPhoneMatch = norm10(b.phone || b.normalizedPhone || b.rawData?.phone_number) === recPhone10 ? 1 : 0;
        if (aPhoneMatch !== bPhoneMatch) return bPhoneMatch - aPhoneMatch;
      }
      return 0;
    });

  const currentLink = getLinkInfo(recording);
  const getCleanLeadName = (lead) => {
    if (!lead) return '';
    const raw = lead.fullName || lead.rawData?.full_name || lead.rawData?.name || lead.rawData?.['Full Name'] || 'Meta Lead';
    return String(raw).replace(/^(?:p|l):[\d]+\s*/i, '').trim() || 'Meta Lead';
  };
  const getLeadPhone = (lead) => {
    if (!lead) return '';
    return lead.phone || lead.normalizedPhone || lead.rawData?.phone_number || lead.rawData?.phone || '';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 490,
          padding: 24,
          boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
          border: `1px solid ${TODO_BORDER}`,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Header — Identical to "Create Todo Item" */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
            Link Recording Session
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 22,
              color: TODO_MUTED,
              lineHeight: 1,
              padding: 0
            }}
          >
            ×
          </button>
        </div>

        {/* Form Body — Clean vertical fields matching "Create Todo Item" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {/* 1. Recording Session Info Card (ReactBits SpotlightCard) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE }}>
                Recording Session Details
              </label>
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: `1px solid ${currentLink.isLinked ? '#a7f3d0' : TODO_BORDER}`,
                  background: currentLink.isLinked ? '#ecfdf5' : TODO_SKY_SURFACE,
                  color: currentLink.isLinked ? '#065f46' : TODO_BLUE_GREEN
                }}
              >
                {currentLink.isLinked ? '✓ Linked' : 'Unlinked'}
              </span>
            </div>

            <SpotlightCard
              spotlightColor="rgba(33, 158, 188, 0.14)"
              style={{
                background: TODO_SKY_SURFACE,
                border: `1px solid ${TODO_BORDER}`,
                borderRadius: 8,
                padding: '10px 12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: TODO_DEEP_BLUE,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {recording.originalName || 'Audio Recording'}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: TODO_MUTED,
                    marginTop: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap'
                  }}>
                    {recording.phone && <span>📞 {recording.phone}</span>}
                    {recording.userName && <span>👤 {recording.userName}</span>}
                  </div>
                  {currentLink.isLinked && (
                    <div style={{ fontSize: 12, color: TODO_BLUE_GREEN, marginTop: 4, fontWeight: 500 }}>
                      Linked to: <strong>{currentLink.name}</strong>
                    </div>
                  )}
                </div>

                {currentLink.isLinked && (
                  <button
                    type="button"
                    onClick={handleUnlink}
                    disabled={unlinking}
                    style={{
                      padding: '5px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#dc2626',
                      cursor: unlinking ? 'not-allowed' : 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {unlinking ? 'Unlinking...' : 'Unlink'}
                  </button>
                )}
              </div>
            </SpotlightCard>
          </div>

          {/* 2. Campaign Filter Dropdown */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE }}>
                Campaign Filter {metaCampaignFilter !== 'all' ? `(${metaCampaignFilter})` : '(All Campaigns)'}
              </label>
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: `1px solid ${TODO_BORDER}`,
                  background: TODO_SKY_SURFACE,
                  color: TODO_BLUE_GREEN
                }}
              >
                <AnimatedNumber value={filteredMeta.length} /> Meta Leads
              </span>
            </div>

            <select
              value={metaCampaignFilter}
              onChange={e => setMetaCampaignFilter(e.target.value)}
              style={{
                width: '100%',
                border: `1px solid ${TODO_BORDER}`,
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 14,
                outline: 'none',
                color: TODO_DEEP_BLUE,
                background: '#fff',
                fontWeight: 500,
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="all">All Campaigns ({metaLeads.length})</option>
              {distinctMetaCampaigns.map(camp => (
                <option key={camp} value={camp}>
                  {camp} ({campaignCounts[camp] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Search Meta Lead Input */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              Search Meta Lead
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Type name, phone, email, or campaign to filter..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  border: `1px solid ${TODO_BORDER}`,
                  borderRadius: 8,
                  padding: '9px 30px 9px 12px',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: TODO_DEEP_BLUE,
                  background: '#fff'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: TODO_MUTED,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 4. Select Meta Lead List (Each Lead Full Width & Proper Height — Clearly Visible) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: TODO_DEEP_BLUE }}>
                Select Meta Lead ({filteredMeta.length})
              </label>
              {selectedLead && (
                <span style={{ fontSize: 11.5, color: TODO_ORANGE, fontWeight: 600 }}>
                  Selected: <strong>{getCleanLeadName(selectedLead)}</strong>
                </span>
              )}
            </div>

            <div
              style={{
                border: `1px solid ${TODO_BORDER}`,
                borderRadius: 10,
                background: '#f8fafc',
                maxHeight: 280,
                minHeight: 190,
                overflowY: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxSizing: 'border-box',
                width: '100%'
              }}
            >
              {loading ? (
                <div style={{ padding: '36px 12px', textAlign: 'center', fontSize: 13, color: TODO_MUTED }}>
                  Loading Meta Leads...
                </div>
              ) : filteredMeta.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center', fontSize: 13, color: TODO_MUTED }}>
                  No Meta Leads found matching your filter.
                </div>
              ) : (
                filteredMeta.map(lead => {
                  const leadId = lead._id || lead.id;
                  const isSelected = selectedLead && String(selectedLead._id || selectedLead.id) === String(leadId);
                  const isCurrentLinked = String(recording.metaLeadId) === String(leadId);
                  const leadName = getCleanLeadName(lead);
                  const leadPhone = getLeadPhone(lead);
                  const isPhoneMatch = recPhone10 && norm10(leadPhone) === recPhone10;

                  return (
                    <SpotlightCard
                      key={leadId}
                      spotlightColor="rgba(33, 158, 188, 0.12)"
                      onClick={() => setSelectedLead(lead)}
                      onDoubleClick={() => handleSaveLink(lead)}
                      style={{
                        flexShrink: 0,
                        width: '100%',
                        minHeight: 68,
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '11px 14px',
                        borderRadius: 9,
                        cursor: 'pointer',
                        background: isSelected ? TODO_SKY_SURFACE : '#ffffff',
                        border: `1.5px solid ${isSelected ? TODO_BLUE_GREEN : '#e2e8f0'}`,
                        boxShadow: isSelected ? '0 2px 8px rgba(33, 158, 188, 0.12)' : '0 1px 2px rgba(15, 23, 42, 0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, flex: 1, width: '100%' }}>
                        <input
                          type="radio"
                          name="selectedMetaLead"
                          checked={!!isSelected}
                          onChange={() => setSelectedLead(lead)}
                          style={{
                            cursor: 'pointer',
                            accentColor: TODO_BLUE_GREEN,
                            flexShrink: 0,
                            width: 16,
                            height: 16
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1, width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: TODO_DEEP_BLUE,
                              lineHeight: 1.35,
                              wordBreak: 'break-word'
                            }}>
                              {leadName}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                              {isPhoneMatch && (
                                <span style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  background: '#ecfdf5',
                                  color: '#065f46',
                                  border: '1px solid #a7f3d0',
                                  padding: '2px 7px',
                                  borderRadius: 5
                                }}>
                                  ⚡ Match
                                </span>
                              )}

                              {isCurrentLinked && (
                                <span style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  border: '1px solid #bae6fd',
                                  padding: '2px 7px',
                                  borderRadius: 5
                                }}>
                                  Current
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{
                            fontSize: 12,
                            color: TODO_MUTED,
                            marginTop: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            flexWrap: 'wrap'
                          }}>
                            <span style={{ fontWeight: 500, color: '#334155' }}>
                              📞 {leadPhone || 'No phone'}
                            </span>
                            {lead.campaign && (
                              <span style={{
                                fontSize: 11,
                                color: TODO_BLUE_GREEN,
                                background: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                padding: '1px 8px',
                                borderRadius: 6,
                                fontWeight: 600,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                📢 {lead.campaign}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12, marginBottom: 0 }}>{error}</p>}

        {/* Footer Buttons — Identical to "Create Todo Item" */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: `1px solid ${TODO_BORDER}`,
              borderRadius: 8,
              background: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              color: TODO_DEEP_BLUE
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSaveLink(selectedLead)}
            disabled={saving || !selectedLead}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              borderRadius: 8,
              background: TODO_ORANGE,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: (saving || !selectedLead) ? 'not-allowed' : 'pointer',
              opacity: (saving || !selectedLead) ? 0.65 : 1
            }}
          >
            {saving ? 'Linking...' : 'Link Meta Lead'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── MODAL: BULK DELETE CONFIRMATION ("Create Todo Item" Style — Shows All Target Members/Records) ──
function BulkDeleteModal({
  records,
  recordings: recordingsProp = [],
  initialSelectedIds = [],
  filterLabel,
  activeFilterLabel: activeFilterLabelProp = 'Current Filtered Records',
  onClose,
  onConfirmDelete,
  onConfirmBulkDelete,
  deleting = false,
}) {
  const recordings = Array.isArray(records) ? records : recordingsProp;
  const activeFilterLabel = filterLabel || activeFilterLabelProp;
  const handleConfirm = onConfirmDelete || onConfirmBulkDelete;

  // Pre-select either the user's checked rows, or ALL visible/filtered records (e.g. all 51 Unlinked Sessions)
  const [checkedIds, setCheckedIds] = useState(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return initialSelectedIds.map(String);
    }
    return recordings.map(r => String(r._id || r.id));
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      setCheckedIds(initialSelectedIds.map(String));
    } else if (recordings.length > 0) {
      setCheckedIds(recordings.map(r => String(r._id || r.id)));
    }
  }, [recordings.length]);

  const allRecordIds = recordings.map(r => String(r._id || r.id));
  const isAllSelected = allRecordIds.length > 0 && checkedIds.length === allRecordIds.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setCheckedIds([]);
    } else {
      setCheckedIds(allRecordIds);
    }
  };

  const toggleOne = (idStr) => {
    setCheckedIds(prev =>
      prev.includes(idStr) ? prev.filter(item => item !== idStr) : [...prev, idStr]
    );
  };

  const q = searchTerm.trim().toLowerCase();
  const visibleList = q
    ? recordings.filter(rec => {
        const info = getLinkInfo(rec);
        const caller = String(rec.userName || '').toLowerCase();
        const phone = String(rec.phone || info.subDetail || '').toLowerCase();
        const name = String(info.name || '').toLowerCase();
        const file = String(rec.originalName || '').toLowerCase();
        return caller.includes(q) || phone.includes(q) || name.includes(q) || file.includes(q);
      })
    : recordings;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.48)',
        backdropFilter: 'blur(2px)',
        zIndex: 1150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={deleting ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
          padding: 24,
          boxShadow: '0 14px 40px rgba(2, 48, 71, 0.2)',
          border: `1px solid ${TODO_BORDER}`,
          maxHeight: '92vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 style={{ width: 17, height: 17 }} />
            </div>
            <div>
              <h3 style={{ fontSize: 17.5, fontWeight: 600, color: TODO_DEEP_BLUE, margin: 0 }}>
                Bulk Delete Call Records
              </h3>
              <div style={{ fontSize: 12, color: TODO_MUTED, marginTop: 2 }}>
                Filter: <strong style={{ color: TODO_DEEP_BLUE }}>{activeFilterLabel}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            style={{
              background: 'none',
              border: 'none',
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontSize: 22,
              color: TODO_MUTED,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Summary Banner */}
        <div
          style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12.5, color: '#9a3412', fontWeight: 500 }}>
            Selected <strong style={{ fontWeight: 700 }}>{checkedIds.length}</strong> of{' '}
            <strong style={{ fontWeight: 700 }}>{recordings.length}</strong> visible records across all callers for permanent deletion.
          </div>
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={deleting}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #fdba74',
              background: '#ffffff',
              color: '#c2410c',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isAllSelected ? 'Deselect All' : `Select All (${recordings.length})`}
          </button>
        </div>

        {/* Quick Search Inside Modal */}
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter records by caller, phone, or lead name..."
            style={{
              width: '100%',
              border: `1px solid ${TODO_BORDER}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              color: TODO_DEEP_BLUE,
            }}
          />
        </div>

        {/* Scrollable List of All Visible Members / Unlinked Records */}
        <div
          style={{
            border: `1px solid ${TODO_BORDER}`,
            borderRadius: 10,
            background: '#f8fafc',
            maxHeight: 290,
            minHeight: 160,
            overflowY: 'auto',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}
        >
          {visibleList.length === 0 ? (
            <div style={{ padding: '32px 12px', textAlign: 'center', fontSize: 13, color: TODO_MUTED }}>
              No records match your search.
            </div>
          ) : (
            visibleList.map((rec, idx) => {
              const idStr = String(rec._id || rec.id);
              const isChecked = checkedIds.includes(idStr);
              const info = getLinkInfo(rec);
              const callerName = rec.userName || 'Assigned Caller';
              const callerRole = rec.userDesignation || rec.userDepartment || 'Caller';

              return (
                <div
                  key={idStr}
                  onClick={() => !deleting && toggleOne(idStr)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: isChecked ? '#fef2f2' : '#ffffff',
                    border: `1.5px solid ${isChecked ? '#fca5a5' : '#e2e8f0'}`,
                    cursor: deleting ? 'wait' : 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(idStr)}
                      disabled={deleting}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: 15,
                        height: 15,
                        accentColor: '#dc2626',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TODO_DEEP_BLUE }}>
                          #{idx + 1} • {info.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '1px 7px',
                            borderRadius: 5,
                            background: info.badgeBg,
                            color: info.badgeColor,
                            border: `1px solid ${info.badgeBorder}`,
                            flexShrink: 0,
                          }}
                        >
                          {info.badgeLabel}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: TODO_MUTED,
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>📞 {rec.phone || 'No Phone'}</span>
                        <span>
                          👤 Caller: <strong style={{ color: TODO_DEEP_BLUE }}>{callerName}</strong> ({callerRole})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Confirm / Cancel Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: `1px solid ${TODO_BORDER}`,
              borderRadius: 8,
              background: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: deleting ? 'not-allowed' : 'pointer',
              color: TODO_DEEP_BLUE,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleConfirm && handleConfirm(checkedIds)}
            disabled={deleting || checkedIds.length === 0}
            style={{
              flex: 1.3,
              padding: '10px 14px',
              border: 'none',
              borderRadius: 8,
              background: '#dc2626',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: deleting || checkedIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: deleting || checkedIds.length === 0 ? 0.65 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Trash2 style={{ width: 15, height: 15 }} />
            {deleting ? `Deleting ${checkedIds.length} Records...` : `Confirm Bulk Delete (${checkedIds.length})`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── MAIN CALL RECORDINGS PAGE (DIGITAL CALENDAR LEFT SIDEBAR + PERMANENT TABLE VIEW) ──
export default function CallRecordings() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics, Calendar & Team state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [calendarActivity, setCalendarActivity] = useState({});
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [usersList, setUsersList] = useState([]);

  // Filter state (Content & Duration removed permanently)
  const [filters, setFilters] = useState({
    search: '',
    datePreset: 'all',
    exactDate: '',
    from: '',
    to: '',
    status: 'all',
    direction: 'all',
    fileAvailable: 'all',
    linkType: 'all',
    user: 'all',
  });

  // Pagination state (10 rows per page: Showing 1 to 10 of X call records)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modals & Bulk Selection
  const [activeLinkRecording, setActiveLinkRecording] = useState(null);
  const [activeConversationRecording, setActiveConversationRecording] = useState(null);
  const [activeProfileEmployee, setActiveProfileEmployee] = useState(null);
  const [allMatchingRecordings, setAllMatchingRecordings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [linkStats, setLinkStats] = useState({ unlinked: null, linked: null, total: null });

  // Bottom-Right Toast Notification state (Success / Failed counts)
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const triggerToast = ({ title, message, successCount = 0, failedCount = 0, type = 'success' }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      id: Date.now(),
      title: title || 'Operation Completed',
      message: message || '',
      successCount,
      failedCount,
      type,
    });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 6500);
  };

  // Action states
  const [rematching, setRematching] = useState(false);
  const [rematchMsg, setRematchMsg] = useState(null);
  const [transcribingId, setTranscribingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const syncedDurationsRef = useRef(new Set());

  const isAllowed = canViewCallRecordings(user);
  const isHRUser = isHR(user) || user?.role === 'hr' || String(user?.designation || '').toUpperCase() === 'HR';
  const isCEOUser = isCEO(user) || user?.role === 'ceo' || user?.role === 'admin' || user?.role === 'superadmin';
  const canManageCRUD = isHRUser || isCEOUser || user?.role === 'admin' || user?.role === 'superadmin';
  const isManagerUser = user?.role === 'manager' || isManager(user);
  const canViewAllRecordings = canManageCRUD && !isManagerUser;

  // Helper: For Admin Panel Caller Team, include all active team members across the company
  const isAllowedCallerTeamMember = (emp) => {
    if (!emp || !emp.name) return false;
    return emp.status !== 'inactive' && emp.status !== 'deleted';
  };

  const getCallerTeamRoleLabel = (emp) => {
    const desig = String(emp.designation || '').trim();
    const dept = String(emp.department || '').trim();
    const role = String(emp.role || '').trim();
    const combined = `${desig} ${dept} ${role}`.toLowerCase();

    if (combined.includes('counsellor') || combined.includes('counselor') || combined.includes('councellor')) {
      return desig || 'Counsellor';
    }
    if (combined.includes('telecaller') || combined.includes('tele-caller') || combined.includes('tele caller')) {
      return desig || 'Telecaller';
    }
    if (combined.includes('manager')) {
      return desig || 'Manager';
    }
    if (/\bhr\b/i.test(combined) || combined.includes('human resource')) {
      return desig || 'HR';
    }
    if (combined.includes('marketing')) {
      return desig || 'Marketing';
    }
    if (combined.includes('developer')) {
      return desig || 'Developer';
    }
    if (combined.includes('trainer')) {
      return desig || 'Trainer';
    }
    return desig || dept || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Team Member');
  };

  const getAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const backendHost = import.meta.env.VITE_API_URL || 'https://telecommunication-l3oz.onrender.com';
    const baseUrl = backendHost.replace(/\/api\/?$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Build clean query params object (fetches full filtered set and slices 1-10 per page for table + full set for Bulk Delete)
  const buildQueryParams = (pageToLoad = pagination.page, filtersToUse = filters) => {
    const params = {
      page: 1,
      limit: 'all',
    };
    if (filtersToUse.search && filtersToUse.search.trim()) params.search = filtersToUse.search.trim();
    if (filtersToUse.datePreset && filtersToUse.datePreset !== 'all' && filtersToUse.datePreset !== 'custom') {
      params.datePreset = filtersToUse.datePreset;
    }
    if (filtersToUse.exactDate) params.date = filtersToUse.exactDate;
    if (filtersToUse.from) params.from = filtersToUse.from;
    if (filtersToUse.to) params.to = filtersToUse.to;
    if (filtersToUse.status && filtersToUse.status !== 'all') {
      params.status = filtersToUse.status;
    }
    if (filtersToUse.direction && filtersToUse.direction !== 'all') params.direction = filtersToUse.direction;
    if (filtersToUse.fileAvailable && filtersToUse.fileAvailable !== 'all') params.fileAvailable = filtersToUse.fileAvailable;
    if (filtersToUse.user && filtersToUse.user !== 'all') {
      params.user = filtersToUse.user;
      params.userId = filtersToUse.user;
    }

    return params;
  };

  // Fetch paginated call recordings (10 leads per page in table, full matching list preserved for Bulk Delete)
  const fetchRecordings = async (pageToLoad = 1, currentFilters = filters) => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    if (pageToLoad === 1) {
      setSelectedIds([]);
    }
    try {
      const params = buildQueryParams(pageToLoad, currentFilters);
      let res;
      if (canViewAllRecordings) {
        res = await recordingsAPI.getAll(params);
      } else {
        res = await recordingsAPI.getMy(params);
      }

      const data = res.data || {};
      const rawList = Array.isArray(data.recordings) ? data.recordings : (Array.isArray(data) ? data : []);

      // Always compute exact Linked vs Unlinked counts from full rawList
      const unlinkedCnt = rawList.filter(r => !getLinkInfo(r).isLinked).length;
      const linkedCnt = rawList.filter(r => getLinkInfo(r).isLinked).length;
      setLinkStats({
        unlinked: unlinkedCnt,
        linked: linkedCnt,
        total: rawList.length,
      });

      // Apply exact Link filtering so 100% of Unlinked / Linked records match the table badges
      let list = rawList;
      if (currentFilters.linkType === 'unlinked') {
        list = list.filter(r => !getLinkInfo(r).isLinked);
      } else if (currentFilters.linkType === 'meta_lead') {
        list = list.filter(r => getLinkInfo(r).isLinked);
      }

      setAllMatchingRecordings(list);

      const pageSize = 10;
      const totalMatching = list.length;
      const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
      const safePage = Math.min(Math.max(1, pageToLoad), totalPages);
      const pagedList = list.slice((safePage - 1) * pageSize, safePage * pageSize);

      setRecordings(pagedList);
      setPagination({
        page: safePage,
        limit: pageSize,
        total: totalMatching,
        totalPages,
      });
    } catch (err) {
      console.error('Failed to load call recordings:', err);
      setError('Failed to fetch call recordings from server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary analytics
  const fetchSummary = async (currentFilters = filters) => {
    if (!isAllowed) return;
    setSummaryLoading(true);
    try {
      const params = buildQueryParams(1, currentFilters);
      delete params.page;
      delete params.limit;
      if (currentFilters.linkType && currentFilters.linkType !== 'all') {
        params.linkType = currentFilters.linkType;
      }
      if (currentFilters.status && currentFilters.status !== 'all') {
        params.status = currentFilters.status;
      }
      const res = await recordingsAPI.getAnalyticsSummary(params);
      setSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to load call analytics summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch calendar activity dots
  const fetchCalendarActivity = async (targetDate = currentCalendarMonth, currentFilters = filters) => {
    if (!isAllowed) return;
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const params = {
        year,
        month: `${year}-${String(month).padStart(2, '0')}`,
      };
      if (currentFilters.user && currentFilters.user !== 'all') {
        params.user = currentFilters.user;
        params.userId = currentFilters.user;
      }
      if (currentFilters.status && currentFilters.status !== 'all') params.status = currentFilters.status;
      if (currentFilters.direction && currentFilters.direction !== 'all') params.direction = currentFilters.direction;

      const res = await recordingsAPI.getCalendarActivity(params);
      setCalendarActivity(res.data?.activity || {});
    } catch (err) {
      console.error('Failed to load calendar activity:', err);
    }
  };

  // Fetch team members for Left Sidebar "Caller Team" card (Only Counsellors, Telecallers, and HR)
  useEffect(() => {
    if (!isAllowed) return;
    let isMounted = true;
    usersAPI.getAll()
      .then(res => {
        if (!isMounted) return;
        const list = res.data?.users || res.data || [];
        const rawList = Array.isArray(list) ? list : [];
        const filteredTeam = rawList.filter(isAllowedCallerTeamMember);
        filteredTeam.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        setUsersList(filteredTeam);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [isAllowed]);

  // Persist real audio duration when browser <audio> metadata loads
  const handleRecordingDurationDetected = async (recId, realSec) => {
    if (!recId || !realSec || isNaN(realSec) || realSec <= 0) return;
    const roundedSec = Math.max(1, Math.round(realSec));

    setRecordings(prev =>
      prev.map(r => {
        const id = r._id || r.id;
        if (String(id) === String(recId) && r.duration !== roundedSec) {
          return { ...r, duration: roundedSec };
        }
        return r;
      })
    );

    const syncKey = `${recId}:${roundedSec}`;
    if (syncedDurationsRef.current.has(syncKey)) return;
    syncedDurationsRef.current.add(syncKey);

    try {
      await recordingsAPI.updateDuration(recId, roundedSec);
      fetchSummary(filters);
    } catch (_) {
      // Ignore if endpoint is not yet deployed on remote host; local state is already updated
    }
  };

  // Initial load
  useEffect(() => {
    if (isAllowed) {
      fetchRecordings(1, filters);
      fetchSummary(filters);
      fetchCalendarActivity(currentCalendarMonth, filters);
    } else {
      setLoading(false);
    }
  }, [user, isAllowed]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchRecordings(1, newFilters);
    fetchSummary(newFilters);
    fetchCalendarActivity(currentCalendarMonth, newFilters);
  };

  const handleResetAllFilters = () => {
    const clean = {
      search: '',
      datePreset: 'all',
      exactDate: '',
      from: '',
      to: '',
      status: 'all',
      direction: 'all',
      fileAvailable: 'all',
      linkType: 'all',
      user: 'all',
    };
    handleFilterChange(clean);
  };

  // Handle calendar month change
  const handleCalendarMonthChange = (newDate) => {
    setCurrentCalendarMonth(newDate);
    fetchCalendarActivity(newDate, filters);
  };

  // Handle clicking a date on the calendar
  const handleSelectCalendarDate = (dateStr) => {
    const isSame = filters.exactDate === dateStr;
    const updated = {
      ...filters,
      exactDate: isSame ? '' : dateStr,
      datePreset: isSame ? 'all' : 'custom',
      from: '',
      to: '',
    };
    handleFilterChange(updated);
  };

  // Handle pagination navigation
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) return;
    fetchRecordings(newPage, filters);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Auto-match leads
  const handleRematch = async () => {
    setRematching(true);
    setRematchMsg(null);
    try {
      const res = await recordingsAPI.rematchLeads();
      setRematchMsg(`Auto-match completed: ${res.data?.matched || 0} leads newly linked!`);
      fetchRecordings(pagination.page, filters);
      fetchSummary(filters);
    } catch (err) {
      console.error('Rematch error:', err);
      setRematchMsg('Auto-match operation failed.');
    } finally {
      setRematching(false);
    }
  };

  // Transcribe recording
  const handleTranscribe = async (recId) => {
    setTranscribingId(recId);
    try {
      const res = await recordingsAPI.transcribe(recId, true);
      if (res.data?.transcript) {
        setRecordings(prev => prev.map(r => (r._id === recId || r.id === recId) ? { ...r, transcript: res.data.transcript, transcriptStatus: 'done' } : r));
        setActiveConversationRecording(prev =>
          prev && (prev._id === recId || prev.id === recId)
            ? { ...prev, transcript: res.data.transcript, transcriptStatus: 'done' }
            : prev
        );
      }
    } catch (err) {
      console.error('Transcription error:', err);
      const serverErrMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      alert(`⚠️ Transcription Error:\n${serverErrMsg}\n\nTroubleshooting Check:\n1. Verify OPENAI_API_KEY is set in Render Environment Variables.\n2. Ensure your OpenAI account has active credit balance.`);
    } finally {
      setTranscribingId(null);
    }
  };

  // Delete single recording
  const handleDeleteRecording = async (rec) => {
    const recId = rec._id || rec.id;
    if (!recId) return;
    if (deletingId) return;

    const fileName = rec.originalName || 'this recording';
    const confirmDelete = window.confirm(
      `Delete this audio conversation permanently?\nThe linked audio recording in Cloudinary/server storage and the conversation/transcript record in MongoDB will be deleted. This action cannot be undone.\n\nFile: ${fileName}`
    );
    if (!confirmDelete) return;

    setDeletingId(recId);
    try {
      const res = await recordingsAPI.delete(recId);
      if (res.data?.success) {
        setRecordings(prev => prev.filter(r => (r._id || r.id) !== recId));
        setAllMatchingRecordings(prev => prev.filter(r => (r._id || r.id) !== recId));
        setSelectedIds(prev => prev.filter(id => String(id) !== String(recId)));
        fetchRecordings(pagination.page, filters);
        fetchSummary(filters);
        fetchCalendarActivity(currentCalendarMonth, filters);
        triggerToast({
          title: 'Call Recording Deleted',
          message: `${fileName} removed permanently.`,
          successCount: 1,
          failedCount: 0,
          type: 'success',
        });
      } else {
        throw new Error(res.data?.error || 'Failed to delete audio conversation');
      }
    } catch (err) {
      console.error('Delete audio conversation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete audio conversation.';
      triggerToast({
        title: 'Deletion Failed',
        message: errorMsg,
        successCount: 0,
        failedCount: 1,
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Confirm Bulk Delete (from BulkDeleteModal) with Bottom-Right Toast Notification (Success & Failed counts)
  const handleBulkDeleteConfirm = async (idsToDelete) => {
    if (!Array.isArray(idsToDelete) || idsToDelete.length === 0 || bulkDeleting) return;
    setBulkDeleting(true);

    let deletedCount = 0;
    let failedCount = 0;
    const deletedSet = new Set();

    try {
      // 1. Try dedicated bulk-delete endpoint first
      const res = await recordingsAPI.bulkDelete({ ids: idsToDelete });
      if (res.data && typeof res.data.deletedCount === 'number') {
        deletedCount = res.data.deletedCount;
        failedCount = res.data.failedCount ?? Math.max(0, idsToDelete.length - deletedCount);
        (res.data.deletedIds || idsToDelete).forEach(id => deletedSet.add(String(id)));
      } else {
        throw new Error('Fallback to individual delete batch');
      }
    } catch (_) {
      // 2. Fallback: execute individual DELETE requests in parallel batches of 8 (works even if remote server hasn't restarted)
      const BATCH_SIZE = 8;
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(id => recordingsAPI.delete(id))
        );
        results.forEach((r, idx) => {
          const targetId = String(batch[idx]);
          if (r.status === 'fulfilled' && r.value?.data?.success !== false) {
            deletedCount++;
            deletedSet.add(targetId);
          } else {
            failedCount++;
          }
        });
      }
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteModal(false);
    }

    // Update UI state immediately
    if (deletedSet.size > 0) {
      setRecordings(prev => prev.filter(r => !deletedSet.has(String(r._id || r.id))));
      setAllMatchingRecordings(prev => prev.filter(r => !deletedSet.has(String(r._id || r.id))));
      setSelectedIds([]);
      fetchRecordings(1, filters);
      fetchSummary(filters);
      fetchCalendarActivity(currentCalendarMonth, filters);
    }

    triggerToast({
      title: failedCount === 0 ? 'Bulk Delete Successful' : (deletedCount > 0 ? 'Bulk Delete Partially Completed' : 'Bulk Delete Failed'),
      message: `${deletedCount} call session(s) deleted${failedCount > 0 ? `, ${failedCount} failed` : ' permanently'}.`,
      successCount: deletedCount,
      failedCount,
      type: failedCount === 0 ? 'success' : (deletedCount > 0 ? 'warning' : 'error'),
    });
  };

  // Row selection helpers
  const toggleRowSelection = (recId) => {
    const idStr = String(recId);
    setSelectedIds(prev =>
      prev.includes(idStr) ? prev.filter(i => i !== idStr) : [...prev, idStr]
    );
  };

  const allVisibleIds = recordings.map(r => String(r._id || r.id));
  const isAllVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allVisibleIds);
    }
  };

  // ── DIGITAL CALENDAR MINI-CALENDAR HELPERS ──────────────────────────────
  const calYear = currentCalendarMonth.getFullYear();
  const calMonth = currentCalendarMonth.getMonth();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const getActivityForDate = (dateStr) => {
    if (!calendarActivity) return null;
    if (Array.isArray(calendarActivity)) {
      return calendarActivity.find(item => (item.date || item._id) === dateStr) || null;
    }
    return calendarActivity[dateStr] || null;
  };

  // ── DIGITAL CALENDAR STYLE SIDEBAR CONFIGS ──────────────────────────────
  // 1. Call Categories (Only All Call Sessions, Linked Meta Leads, Unlinked Sessions)
  const callCategoryItems = [
    {
      id: 'all_calls',
      label: 'All Call Sessions',
      icon: PhoneCall,
      color: '#0284c7',
      bgColor: '#f0f9ff',
      borderColor: '#bae6fd',
      isActive: filters.linkType === 'all' && filters.status === 'all' && filters.fileAvailable === 'all',
      onClick: () => handleFilterChange({ ...filters, linkType: 'all', status: 'all', fileAvailable: 'all' }),
    },
    {
      id: 'meta_linked',
      label: 'Linked Meta Leads',
      icon: Megaphone,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      isActive: filters.linkType === 'meta_lead',
      onClick: () => handleFilterChange({ ...filters, linkType: filters.linkType === 'meta_lead' ? 'all' : 'meta_lead', status: 'all' }),
    },
    {
      id: 'unlinked',
      label: 'Unlinked Sessions',
      icon: Unlink,
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      isActive: filters.linkType === 'unlinked',
      onClick: () => handleFilterChange({ ...filters, linkType: filters.linkType === 'unlinked' ? 'all' : 'unlinked', status: 'all' }),
    },
  ];

  const hasActiveFilters =
    filters.search ||
    filters.exactDate ||
    filters.datePreset !== 'all' ||
    filters.status !== 'all' ||
    filters.direction !== 'all' ||
    filters.fileAvailable !== 'all' ||
    filters.linkType !== 'all' ||
    filters.user !== 'all';

  // Overall Call Duration & Analytics Calculation (ensures Total Talk Time, Avg Call Duration & Unlinked Sessions are always reflected)
  const effectiveSummary = (() => {
    const sourceRecords = allMatchingRecordings.length > 0 ? allMatchingRecordings : recordings;
    const recDurationSum = sourceRecords.reduce((acc, r) => {
      const directDur = Number(r.duration);
      if (directDur && !isNaN(directDur) && directDur > 0) {
        return acc + Math.round(directDur);
      }
      const bytes = Number(r.size);
      if (bytes && !isNaN(bytes) && bytes > 0) {
        return acc + Math.max(1, Math.round(bytes / 3200));
      }
      if (r.transcript && typeof r.transcript === 'string' && r.transcript.trim().length > 0) {
        return acc + Math.max(12, Math.round(r.transcript.trim().length / 12));
      }
      return acc + (r.fileAvailable !== false ? 35 : 0);
    }, 0);

    const totalCallsCount = pagination.total || summary?.totalCalls || sourceRecords.length;
    const completedCallsCount =
      sourceRecords.length > 0
        ? sourceRecords.filter(r => !['missed', 'no_answer', 'failed', 'busy', 'rejected'].includes(r.callStatus)).length
        : (summary?.completedCalls ?? totalCallsCount);

    const visibleUnlinkedCount = sourceRecords.filter(r => !getLinkInfo(r).isLinked).length;
    const visibleLinkedCount = sourceRecords.filter(r => getLinkInfo(r).isLinked).length;

    const unlinkedCallsCount =
      filters.linkType === 'unlinked'
        ? pagination.total
        : (linkStats.unlinked ?? summary?.unlinkedCalls ?? visibleUnlinkedCount);

    const linkedCallsCount =
      filters.linkType === 'meta_lead'
        ? pagination.total
        : (linkStats.linked ?? summary?.linkedCalls ?? visibleLinkedCount);

    const backendTotalSec = Number(summary?.totalDurationSeconds || 0);
    const estimatedOverallSec =
      sourceRecords.length > 0 && totalCallsCount > sourceRecords.length
        ? Math.round((recDurationSum / sourceRecords.length) * totalCallsCount)
        : recDurationSum;

    const finalTotalDurationSeconds =
      backendTotalSec > 0
        ? Math.max(backendTotalSec, recDurationSum)
        : estimatedOverallSec;

    const backendAvgSec = Number(summary?.avgDurationSeconds || 0);
    const divisor = completedCallsCount > 0 ? completedCallsCount : totalCallsCount;
    const calculatedAvgSec = divisor > 0 ? Math.round(finalTotalDurationSeconds / divisor) : 0;
    const finalAvgDurationSeconds =
      backendAvgSec > 0 && backendTotalSec >= recDurationSum
        ? backendAvgSec
        : calculatedAvgSec;

    const answerRateStr =
      summary?.answerRate ||
      (totalCallsCount > 0 ? `${((completedCallsCount / totalCallsCount) * 100).toFixed(1)}%` : '0.0%');

    return {
      ...(summary || {}),
      totalCalls: totalCallsCount,
      completedCalls: completedCallsCount,
      unlinkedCalls: unlinkedCallsCount,
      linkedCalls: linkedCallsCount,
      totalDurationSeconds: finalTotalDurationSeconds,
      avgDurationSeconds: finalAvgDurationSeconds,
      answerRate: answerRateStr,
      hasRecordingCount: summary?.hasRecordingCount ?? totalCallsCount,
    };
  })();

  const handleAnalyticsCardClick = (filterKey) => {
    if (filterKey === 'all') {
      handleFilterChange({ ...filters, linkType: 'all', status: 'all' });
    } else if (filterKey === 'completed') {
      handleFilterChange({ ...filters, linkType: 'all', status: 'all' });
    } else if (filterKey === 'unlinked') {
      handleFilterChange({ ...filters, linkType: filters.linkType === 'unlinked' ? 'all' : 'unlinked', status: 'all' });
    }
  };

  if (!isAllowed) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', maxWidth: '600px', margin: '40px auto', border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: C.dark, marginBottom: '8px' }}>Access Restricted</h2>
        <p style={{ fontSize: '14px', color: C.textSoft, lineHeight: 1.6, margin: 0 }}>
          The Call Recordings module is visible and accessible only to HR and Admin accounts.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: C.dark, margin: 0, letterSpacing: '-0.01em' }}>
              Live Calls & Conversation Records
            </h1>
            <span style={{
              background: C.blueLight,
              color: C.blueDark,
              fontSize: '12px',
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: '9999px',
              border: '1px solid #bae6fd',
            }}>
              {pagination.total} Recorded Calls
            </span>
            {filters.linkType === 'unlinked' && (
              <span style={{
                background: '#fffbeb',
                color: '#d97706',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '9999px',
                border: '1px solid #fde68a',
              }}>
                ⚠️ {pagination.total} Unlinked Leads
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: C.textSoft, margin: '4px 0 0 0' }}>
            Digital Calendar sidebar filters & structured Call Records Table with real-time audio playback, caller tags, and AI Whisper transcript.
          </p>
        </div>

        {/* Action Buttons (Bulk Delete + Auto-Match + Refresh) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {canManageCRUD && allMatchingRecordings.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#e11d48',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title="Open Bulk Delete Modal to review and delete selected or filtered call sessions"
            >
              <Trash2 style={{ width: '14px', height: '14px' }} />
              Bulk Delete ({selectedIds.length > 0 ? selectedIds.length : allMatchingRecordings.length})
            </button>
          )}

          {canManageCRUD && (
            <button
              onClick={handleRematch}
              disabled={rematching}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#ffffff',
                border: `1px solid ${C.border}`,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: C.dark,
                cursor: rematching ? 'wait' : 'pointer',
                transition: 'all 0.15s',
              }}
              title="Automatically match unlinked call recordings to CRM leads by phone number"
            >
              <RefreshCw style={{ width: '14px', height: '14px', animation: rematching ? 'spin 1s linear infinite' : 'none' }} />
              {rematching ? 'Matching...' : 'Auto-Match Leads'}
            </button>
          )}

          <button
            onClick={() => {
              fetchRecordings(pagination.page, filters);
              fetchSummary(filters);
              fetchCalendarActivity(currentCalendarMonth, filters);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: C.blue,
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Auto-match Notification Banner */}
      {rematchMsg && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#15803d',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 style={{ width: '16px', height: '16px' }} />
            <span>{rematchMsg}</span>
          </div>
          <button
            onClick={() => setRematchMsg(null)}
            style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: '16px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── TOP KPI SUMMARY CARDS ── */}
      <div style={{ marginBottom: '20px' }}>
        <CallAnalyticsCards
          summary={effectiveSummary}
          loading={summaryLoading}
          onCardClick={handleAnalyticsCardClick}
        />
      </div>

      {error && (
        <div style={{
          padding: '16px',
          borderRadius: '10px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          marginBottom: '20px',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── MAIN WORKSPACE: DIGITAL CALENDAR STYLE LEFT SIDEBAR + PERMANENT TABLE RIGHT ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── LEFT SIDEBAR (Exact "Digital Calendar" Style: Mini Calendar, Platforms/Categories, Content Types/Duration, Teams) ── */}
        <div className="w-full lg:w-[275px] shrink-0 flex flex-col gap-4">
          {/* 1. Mini Calendar Widget (Digital Calendar Style) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => handleCalendarMonthChange(new Date(calYear, calMonth - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-slate-900">
                {monthNames[calMonth]} {calYear}
              </span>
              <button
                type="button"
                onClick={() => handleCalendarMonthChange(new Date(calYear, calMonth + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
                <div
                  key={d}
                  className={`text-[10px] font-bold tracking-wider py-1 ${
                    i === 0 || i === 6 ? 'text-rose-500' : 'text-slate-600'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-9" />
              ))}
              {Array.from({ length: daysInCalMonth }).map((_, idx) => {
                const day = idx + 1;
                const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const act = getActivityForDate(dStr);
                const hasCalls = act && act.total > 0;
                const isSelected = filters.exactDate === dStr;
                const isToday = dStr === todayStr;
                const dayOfWeek = (firstDayOfWeek + idx) % 7;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectCalendarDate(dStr)}
                    title={hasCalls ? `${act.total} call(s) on ${dStr}` : dStr}
                    className={`h-9 w-9 mx-auto flex flex-col items-center justify-center rounded-full text-xs transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white font-semibold shadow-sm'
                        : isToday
                        ? 'bg-sky-50 text-sky-600 font-semibold border border-sky-200'
                        : isWeekend
                        ? 'text-rose-500 hover:bg-rose-50/60 font-medium'
                        : 'text-slate-800 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <span>{day}</span>
                    {hasCalls && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: isSelected
                              ? '#ffffff'
                              : act.completed > 0
                              ? '#10b981'
                              : '#f43f5e'
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mini Calendar Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Recorded Calls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                <span>Today</span>
              </div>
              {filters.exactDate && (
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, exactDate: '', datePreset: 'all' })}
                  className="text-sky-600 hover:underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 2. Call Categories Filter ("Platforms" Style Card from Digital Calendar) */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Call Categories</h3>
              </div>
              {(filters.linkType !== 'all' || filters.status !== 'all' || filters.fileAvailable !== 'all') && (
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, linkType: 'all', status: 'all', fileAvailable: 'all' })}
                  className="text-[11px] font-medium text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {callCategoryItems.map(item => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                      item.isActive
                        ? 'shadow-xs'
                        : 'border-transparent hover:bg-slate-50 text-slate-600'
                    }`}
                    style={{
                      backgroundColor: item.isActive ? item.bgColor : undefined,
                      borderColor: item.isActive ? item.borderColor : 'transparent',
                      color: item.isActive ? item.color : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.bgColor, color: item.color }}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-slate-900 font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.isActive && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: item.color }}
                        >
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Caller Team (Only Counsellors, Telecallers, and HR) */}
          {canViewAllRecordings && (
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Caller Team</h3>
                </div>
                <div className="flex items-center gap-2">
                  {filters.user !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ ...filters, user: 'all' })}
                      className="text-[11px] font-medium text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {usersList.length}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {/* All Team Option */}
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, user: 'all' })}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all border cursor-pointer ${
                    filters.user === 'all'
                      ? 'bg-sky-50 border-sky-200 text-sky-900'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                      ALL
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium text-slate-900 truncate">All Callers</div>
                      <div className="text-[10px] text-slate-500 truncate">All Team Members • Entire Company</div>
                    </div>
                  </div>
                  {filters.user === 'all' && (
                    <div className="w-4 h-4 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>

                {usersList.map(emp => {
                  const empId = emp._id || emp.id;
                  const isSelected = String(filters.user) === String(empId);
                  const empAvatar = emp.avatar || emp.image || emp.profilePicture || emp.profilePhoto || '';
                  return (
                    <div
                      key={empId}
                      onClick={() => handleFilterChange({ ...filters, user: isSelected ? 'all' : empId })}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all border cursor-pointer group ${
                        isSelected
                          ? 'bg-sky-50 border-sky-200 text-sky-900'
                          : 'border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <CallerAvatar
                          src={empAvatar}
                          name={emp.name}
                          size={30}
                        />
                        <div className="truncate flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {getCallerTeamRoleLabel(emp)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setActiveProfileEmployee(emp);
                          }}
                          title={`View ${emp.name}'s Profile`}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 border border-slate-200/80 hover:border-sky-200 transition-colors cursor-pointer"
                        >
                          Profile
                        </button>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-sky-600 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT WORKSPACE: PERMANENT TABLE FORMAT FOR ALL CALL RECORDS ── */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          {/* Table Top Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <Table className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">
                    {filters.linkType === 'unlinked'
                      ? 'Unlinked Call Sessions'
                      : filters.linkType === 'meta_lead'
                      ? 'Linked Meta Lead Calls'
                      : filters.exactDate
                      ? `Call Records on ${filters.exactDate}`
                      : 'All Call Records'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                    {pagination.total} Records
                  </span>
                  {selectedIds.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                      {selectedIds.length} Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanent structured table view (10 records per page) with inline voice player, Meta Lead linking, Bulk Delete & AI Whisper transcripts
                </p>
              </div>
            </div>

            {/* Right Quick Search, Bulk Delete & Active Filter Reset */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative min-w-[220px] sm:min-w-[250px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => handleFilterChange({ ...filters, search: e.target.value })}
                  placeholder="Search lead, phone, caller, transcript..."
                  className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-all"
                />
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => handleFilterChange({ ...filters, search: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {canManageCRUD && allMatchingRecordings.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    Bulk Delete ({selectedIds.length > 0 ? selectedIds.length : allMatchingRecordings.length})
                  </span>
                </button>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Clear Filters ×
                </button>
              )}
            </div>
          </div>

          {/* Loading or Empty State */}
          {loading ? (
            <div className="py-20 px-6 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-sky-600" />
              Loading call records table...
            </div>
          ) : recordings.length === 0 ? (
            <div className="py-20 px-6 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="text-base font-semibold text-slate-800">No call records found</div>
              <div className="text-xs text-slate-500 mt-1">
                {filters.exactDate
                  ? `No calls logged on ${filters.exactDate}. Click another date on the left calendar.`
                  : 'Try selecting a different filter on the left sidebar or clearing search.'}
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            /* ── PERMANENT CALL RECORDS TABLE (Compact & Fitted to Screen with AutoScrollText & Bulk Checkboxes) ── */
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left table-auto">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    {canManageCRUD && (
                      <th className="py-3 pl-3.5 pr-1 w-8">
                        <input
                          type="checkbox"
                          checked={isAllVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          title="Select all visible call records"
                          className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                        />
                      </th>
                    )}
                    <th className="py-3 pl-2 pr-1.5 w-8">#</th>
                    <th className="py-3 px-2 w-[165px]">Meta Lead / Contact</th>
                    <th className="py-3 px-2 w-[115px]">Phone</th>
                    <th className="py-3 px-2 w-[125px]">Caller</th>
                    <th className="py-3 px-2 w-[145px]">Date & File</th>
                    <th className="py-3 px-2 w-[215px]">Voice Recording</th>
                    <th className="py-3 px-2 w-[175px]">AI Whisper Transcript</th>
                    <th className="py-3 pl-2 pr-3.5 text-right w-[105px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recordings.map((rec, index) => {
                    const recId = rec._id || rec.id;
                    const rowNum = (pagination.page - 1) * pagination.limit + index + 1;
                    const linkInfo = getLinkInfo(rec);
                    const rawAudio = rec.cloudinaryUrl || rec.streamUrl || rec.url || rec.audioUrl;
                    const audioUrl = getAudioUrl(rawAudio);
                    const leadInitial = linkInfo.name ? linkInfo.name.trim().charAt(0).toUpperCase() : 'M';
                    const callerDesignation = rec.userDesignation || rec.userDepartment || 'HR';
                    const audioFilename = rec.originalName || (rawAudio ? rawAudio.split('/').pop().split('?')[0] : 'Audio Recording');
                    const isRowSelected = selectedIds.includes(String(recId));

                    return (
                      <tr
                        key={recId}
                        className={`transition-colors align-middle ${
                          isRowSelected ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-sky-50/35'
                        }`}
                      >
                        {/* 0. Bulk Selection Checkbox */}
                        {canManageCRUD && (
                          <td className="py-3 pl-3.5 pr-1">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleRowSelection(recId)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                            />
                          </td>
                        )}

                        {/* 1. Row Index */}
                        <td className="py-3 pl-2 pr-1.5 font-semibold text-slate-400 text-[11px]">
                          {rowNum}
                        </td>

                        {/* 2. Meta Lead / Contact (AutoScrollText + Clickable to open Chat View Session) */}
                        <td className="py-3 px-2 max-w-[165px]">
                          <div
                            onClick={() => setActiveConversationRecording(rec)}
                            title="Click to open Chat View Session"
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105"
                              style={{
                                background: linkInfo.isLinked ? '#e0f2fe' : '#f1f5f9',
                                color: linkInfo.isLinked ? '#0284c7' : '#64748b',
                              }}
                            >
                              {leadInitial}
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors text-xs leading-tight">
                                <AutoScrollText
                                  text={linkInfo.name || 'Unknown Contact'}
                                  maxWidth={115}
                                />
                              </div>
                              <div className="mt-1 flex items-center">
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: linkInfo.badgeBg || '#e0f2fe',
                                    color: linkInfo.badgeColor || '#0284c7',
                                    border: `1px solid ${linkInfo.badgeBorder || '#bae6fd'}`,
                                    borderRadius: '5px',
                                    padding: '1px 6px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    maxWidth: '118px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <AutoScrollText
                                    text={linkInfo.badgeLabel || 'Lead'}
                                    maxWidth={104}
                                  />
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Phone Number */}
                        <td className="py-3 px-2 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[11.5px]">
                            <PhoneCall className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{rec.phone || linkInfo.subDetail || 'N/A'}</span>
                          </div>
                        </td>

                        {/* 4. Caller / Agent (with Profile Avatar & AutoScrollText) */}
                        <td className="py-3 px-2 max-w-[125px]">
                          {(() => {
                            const matchedEmp = usersList.find(
                              u =>
                                (rec.userId && String(u._id || u.id) === String(rec.userId)) ||
                                (u.name && rec.userName && u.name.trim().toLowerCase() === rec.userName.trim().toLowerCase())
                            );
                            const callerAvatarSrc =
                              rec.userAvatar ||
                              matchedEmp?.avatar ||
                              matchedEmp?.image ||
                              matchedEmp?.profilePicture ||
                              matchedEmp?.profilePhoto ||
                              '';
                            return (
                              <div
                                onClick={() => {
                                  if (matchedEmp) {
                                    setActiveProfileEmployee(matchedEmp);
                                  } else if (rec.userName) {
                                    setActiveProfileEmployee({
                                      _id: rec.userId,
                                      name: rec.userName,
                                      email: rec.userEmail || '',
                                      designation: callerDesignation,
                                      role: rec.userRole || 'caller',
                                      avatar: callerAvatarSrc,
                                    });
                                  }
                                }}
                                title={rec.userName ? `Click to view ${rec.userName}'s profile` : 'Assigned Caller'}
                                className="flex items-center gap-1.5 cursor-pointer group"
                              >
                                <CallerAvatar
                                  src={callerAvatarSrc}
                                  name={rec.userName || 'C'}
                                  size={26}
                                />
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <div className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors text-[11.5px] leading-tight">
                                    <AutoScrollText
                                      text={rec.userName || 'Assigned Caller'}
                                      maxWidth={85}
                                    />
                                  </div>
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9.5px] font-semibold uppercase">
                                    {callerDesignation}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* 5. Date & Audio Filename (with AutoScrollText) */}
                        <td className="py-3 px-2 max-w-[145px]">
                          <div className="flex items-center gap-1 text-slate-700 font-medium text-[11px] whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <AutoScrollText
                              text={rec.recordedAt ? formatISTDateTime(rec.recordedAt) : `${rec.callDate || ''} ${rec.callTime || ''}`}
                              maxWidth={120}
                            />
                          </div>
                          <div
                            className="flex items-center gap-1 text-[10.5px] text-slate-500 mt-1"
                            title={audioFilename}
                          >
                            <Headphones className="w-3 h-3 text-sky-600 shrink-0" />
                            <AutoScrollText
                              text={audioFilename}
                              maxWidth={118}
                            />
                          </div>
                        </td>

                        {/* 6. Inline Voice Audio Player */}
                        <td className="py-3 px-2">
                          <div className="w-[205px] max-w-[215px]">
                            <MemoizedAudioPlayer
                              audioUrl={audioUrl}
                              mimeType={rec.mimeType}
                              fileExists={rec.fileExists}
                              fileAvailable={rec.fileAvailable}
                              initialDuration={rec.duration || 0}
                              onDurationDetected={realSec => handleRecordingDurationDetected(recId, realSec)}
                              onRetry={() => fetchRecordings(pagination.page, filters)}
                            />
                          </div>
                        </td>

                        {/* 7. AI Whisper Transcript */}
                        <td className="py-3 px-2 max-w-[180px]">
                          <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-2 max-w-[175px]">
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-sky-700 whitespace-nowrap">
                                <Sparkles className="w-3 h-3 text-sky-600 shrink-0" />
                                Transcript
                              </span>
                              {rec.transcript ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveConversationRecording(rec)}
                                  className="px-1.5 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  Chat View
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTranscribe(recId)}
                                  disabled={transcribingId === recId}
                                  className="px-1.5 py-0.5 rounded bg-white border border-sky-200 hover:bg-sky-50 text-sky-700 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {transcribingId === recId ? 'Wait...' : 'Transcribe'}
                                </button>
                              )}
                            </div>
                            {rec.transcript ? (
                              <div
                                className="text-[11px] text-slate-700 line-clamp-2 leading-snug"
                                title={rec.transcript}
                              >
                                {rec.transcript}
                              </div>
                            ) : (
                              <div className="text-[10.5px] text-slate-400 italic truncate">
                                Click Transcribe for AI text
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 8. Actions (Link / Edit Link + 3-Dots Menu) */}
                        <td className="py-3 pl-2 pr-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveLinkRecording(rec)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '5px 8px',
                                borderRadius: '7px',
                                background: linkInfo.isLinked ? '#f5f3ff' : '#f0f9ff',
                                border: linkInfo.isLinked ? '1px solid #ddd6fe' : '1px solid #bae6fd',
                                color: linkInfo.isLinked ? '#7c3aed' : '#0284c7',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Link2 style={{ width: '11px', height: '11px' }} />
                              {linkInfo.isLinked ? 'Edit' : 'Link'}
                            </button>

                            <ThreeDotsMenu
                              audioUrl={audioUrl}
                              originalName={rec.originalName}
                              onDelete={canManageCRUD ? () => handleDeleteRecording(rec) : undefined}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TABLE FOOTER PAGINATION CONTROLS ── */}
          {pagination.total > 0 && (
            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(pagination.total, pagination.page * pagination.limit)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{pagination.total}</span> call records
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    pagination.page <= 1
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>

                <span className="text-xs font-semibold text-slate-700 px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    pagination.page >= pagination.totalPages
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {/* Link Session Modal */}
        {activeLinkRecording && (
          <LinkSessionModal
            recording={activeLinkRecording}
            onClose={() => setActiveLinkRecording(null)}
            onLinked={() => {
              fetchRecordings(pagination.page, filters);
              fetchSummary(filters);
            }}
          />
        )}

        {/* AI Transcript Full Conversation Modal ("Create Todo Item" Style) */}
        {activeConversationRecording && (
          <TranscriptConversationModal
            recording={activeConversationRecording}
            onClose={() => setActiveConversationRecording(null)}
            onTranscribe={handleTranscribe}
            transcribing={transcribingId === (activeConversationRecording._id || activeConversationRecording.id)}
            onDurationDetected={handleRecordingDurationDetected}
          />
        )}

        {/* Bulk Delete Modal (Shows all matching/selected members & Unlinked Sessions with Confirm) */}
        {showBulkDeleteModal && (
          <BulkDeleteModal
            records={allMatchingRecordings.length > 0 ? allMatchingRecordings : recordings}
            initialSelectedIds={
              selectedIds.length > 0
                ? selectedIds
                : (allMatchingRecordings.length > 0 ? allMatchingRecordings : recordings).map(r => String(r._id || r.id))
            }
            filterLabel={
              filters.linkType === 'unlinked'
                ? 'Unlinked Sessions'
                : filters.linkType === 'meta_lead'
                ? 'Linked Meta Leads'
                : 'Filtered Call Sessions'
            }
            onClose={() => !bulkDeleting && setShowBulkDeleteModal(false)}
            onConfirmDelete={handleBulkDeleteConfirm}
            deleting={bulkDeleting}
          />
        )}

        {/* Caller Team Member Profile Modal */}
        {activeProfileEmployee && (
          <EmployeeProfileModal
            employee={activeProfileEmployee}
            onClose={() => setActiveProfileEmployee(null)}
            onUpdated={() => {
              usersAPI.getAll().then(res => {
                const list = res.data?.users || res.data || [];
                const rawList = Array.isArray(list) ? list : [];
                const filteredTeam = rawList.filter(isAllowedCallerTeamMember);
                filteredTeam.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
                setUsersList(filteredTeam);
              }).catch(() => {});
            }}
          />
        )}
      </AnimatePresence>

      {/* ── BOTTOM-RIGHT CORNER TOAST NOTIFICATION (Success & Failed Counts) ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              right: '24px',
              bottom: '24px',
              zIndex: 99999,
              width: '380px',
              maxWidth: 'calc(100vw - 32px)',
              background: '#ffffff',
              borderRadius: '16px',
              border: toast.type === 'error'
                ? '1.5px solid #fecdd3'
                : toast.type === 'warning'
                ? '1.5px solid #fde68a'
                : '1.5px solid #bbf7d0',
              boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.22), 0 8px 20px -6px rgba(15, 23, 42, 0.1)',
              padding: '16px 18px',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: toast.type === 'error' ? '#fff1f2' : toast.type === 'warning' ? '#fffbeb' : '#ecfdf5',
                    color: toast.type === 'error' ? '#e11d48' : toast.type === 'warning' ? '#d97706' : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {toast.type === 'error' ? (
                    <X style={{ width: '20px', height: '20px' }} />
                  ) : (
                    <CheckCircle2 style={{ width: '20px', height: '20px' }} />
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                    {toast.title}
                  </div>
                  {toast.message && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                      {toast.message}
                    </div>
                  )}

                  {/* Explicit Success & Failed Counter Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      <Check style={{ width: '12px', height: '12px' }} />
                      Success: {toast.successCount ?? 0}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: (toast.failedCount ?? 0) > 0 ? '#fff1f2' : '#f8fafc',
                        color: (toast.failedCount ?? 0) > 0 ? '#e11d48' : '#64748b',
                        border: (toast.failedCount ?? 0) > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                      }}
                    >
                      <X style={{ width: '12px', height: '12px' }} />
                      Failed: {toast.failedCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setToast(null)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
