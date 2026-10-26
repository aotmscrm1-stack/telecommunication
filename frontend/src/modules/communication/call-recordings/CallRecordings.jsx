import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AudioLines, Table, LayoutGrid, PhoneCall, FileAudio, 
  Clock, Edit3, MoreVertical, Download, ExternalLink, RefreshCw, User, UserPlus, Sparkles, FileText,
  Maximize2, MessageSquare, Copy, Check, Volume2, Volume1, VolumeX, Trash2, Briefcase,
  Megaphone, Search, X, Link2, Unlink, Layers, Filter, CheckCircle2, Calendar as CalendarIcon,
  Columns, FileSpreadsheet, ArrowUpDown, ChevronLeft, ChevronRight, Headphones
} from 'lucide-react';
import { recordingsAPI, leadsAPI, metaLeadsAPI, campaignsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { formatISTDateTime, formatISTDate, formatISTTime } from '../../../utils/dateFormat';
import { isHR, isCEO, isManager, canViewCallRecordings } from '../../../utils/permissions';
import TranscriptConversationModal from '../../../components/TranscriptConversationModal';
import CallAnalyticsCards from './components/CallAnalyticsCards';
import CallCalendarView from './components/CallCalendarView';
import CallFilterPanel from './components/CallFilterPanel';
import CallRecordDetailsDrawer from './components/CallRecordDetailsDrawer';
import CallExportModal from './components/CallExportModal';

// ── ADVANCED CUSTOM AUDIO PLAYER (Play/Pause, Seek, Current Time, Duration, Volume, Error handling)
const MemoizedAudioPlayer = memo(function MemoizedAudioPlayer({ audioUrl, mimeType, fileExists, fileAvailable, onRetry }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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
    setDuration(0);
    setLoadError(false);
    setIsLoading(false);
    setCurrentUrlIndex(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

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
      setDuration(audioRef.current.duration || 0);
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

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatSec = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleAudioError = (e) => {
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

  // 2. Playback error state for available files (shows retry button that can actually help)
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
        gap: '6px',
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

        {/* Seek Scrubber Progress Bar - Dynamically fills remaining width without overflow */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          style={{
            flex: 1,
            minWidth: 0, // Allows input to shrink dynamically inside the card
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

        {/* Volume & Mute Controls - Dynamically fitted in card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}>
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              color: isMuted ? '#ef4444' : '#64748b',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
          >
            {isMuted || volume === 0 ? (
              <VolumeX style={{ width: '15px', height: '15px' }} />
            ) : volume < 0.5 ? (
              <Volume1 style={{ width: '15px', height: '15px' }} />
            ) : (
              <Volume2 style={{ width: '15px', height: '15px' }} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            style={{
              width: '36px',
              minWidth: '28px',
              maxWidth: '42px',
              height: '4px',
              accentColor: '#0284c7',
              cursor: 'pointer',
              flexShrink: 0,
              margin: 0,
              padding: 0,
            }}
          />
        </div>
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

  // 1. Meta Lead
  if (rec.linkType === 'meta_lead' || rec.metaLeadId) {
    const name = rec.metaLeadName || rec.leadName || 'Meta Lead';
    const camp = rec.campaignName || rec.metaLeadCampaign;
    const phone = rec.metaLeadPhone || rec.leadPhone;
    return {
      isLinked: true,
      type: 'meta_lead',
      name: name,
      badgeLabel: 'Meta Lead',
      subDetail: camp ? `Campaign: ${camp}` : (phone ? `📞 ${phone}` : ''),
      badgeColor: '#7c3aed',
      badgeBg: '#f3e8ff',
      badgeBorder: '#ddd6fe',
      avatarBg: '#ede9fe',
      avatarColor: '#6d28d9',
      avatarIcon: 'M',
    };
  }

  // 2. Campaign
  if (rec.linkType === 'campaign' || rec.campaignId || (rec.campaignName && !rec.leadId)) {
    const name = rec.campaignName || rec.leadName || 'Campaign';
    return {
      isLinked: true,
      type: 'campaign',
      name: name,
      badgeLabel: 'Campaign',
      subDetail: 'Marketing Campaign',
      badgeColor: '#ea580c',
      badgeBg: '#ffedd5',
      badgeBorder: '#fed7aa',
      avatarBg: '#ffedd5',
      avatarColor: '#c2410c',
      avatarIcon: 'C',
    };
  }

  // 3. Normal Lead
  if (rec.linkType === 'lead' || rec.leadId || rec.lead) {
    const name = rec.leadName || rec.lead?.name || 'Lead';
    const phone = rec.leadPhone || rec.lead?.phone;
    return {
      isLinked: true,
      type: 'lead',
      name: name,
      badgeLabel: 'Normal Lead',
      subDetail: phone ? `📞 ${phone}` : '',
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
      badgeBorder: '#bae6fd',
      avatarBg: '#e0f2fe',
      avatarColor: '#0369a1',
      avatarIcon: name ? name.charAt(0).toUpperCase() : 'L',
    };
  }

  // 4. Unlinked
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



// ── MODAL: LINK RECORDING SESSION (3 FILTERING OPTIONS) ──────────────────────
function LinkSessionModal({ recording, onClose, onLinked }) {
  const initialCategory = recording.linkType === 'campaign' || (recording.campaignRef && !recording.lead)
    ? 'campaign'
    : (recording.linkType === 'lead' || (recording.lead && !recording.metaLead)
        ? 'lead'
        : 'meta_lead');

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [metaCampaignFilter, setMetaCampaignFilter] = useState('all');

  const [metaLeads, setMetaLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [normalLeads, setNormalLeads] = useState([]);

  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [metaRes, campRes, leadsRes] = await Promise.allSettled([
          metaLeadsAPI.getAll({ limit: 150 }),
          campaignsAPI.getAll(),
          leadsAPI.getAll({ limit: 150 })
        ]);

        if (!isMounted) return;

        if (metaRes.status === 'fulfilled') {
          const list = metaRes.value.data?.leads || metaRes.value.data || [];
          setMetaLeads(Array.isArray(list) ? list : []);
        } else {
          console.warn('Could not load meta leads:', metaRes.reason);
        }

        if (campRes.status === 'fulfilled') {
          const list = campRes.value.data?.campaigns || campRes.value.data || [];
          setCampaigns(Array.isArray(list) ? list : []);
        } else {
          console.warn('Could not load campaigns:', campRes.reason);
        }

        if (leadsRes.status === 'fulfilled') {
          const list = leadsRes.value.data?.leads || leadsRes.value.data || [];
          setNormalLeads(Array.isArray(list) ? list : []);
        } else {
          console.warn('Could not load normal leads:', leadsRes.reason);
        }
      } catch (err) {
        console.error('Failed to load session linking data:', err);
        if (isMounted) setError('Failed to load records for linking.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const distinctMetaCampaigns = Array.from(
    new Set(metaLeads.map(m => m.campaign).filter(Boolean))
  );

  const handleLink = async (cat, record) => {
    if (!record) {
      // Unlink
      setLinkingId('unlink');
      setError(null);
      try {
        await recordingsAPI.linkLead(recording._id, { linkType: null });
        onLinked();
        onClose();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to unlink session.');
      } finally {
        setLinkingId(null);
      }
      return;
    }

    const recId = record._id || record.id;
    setLinkingId(recId);
    setError(null);

    try {
      if (cat === 'meta_lead') {
        const name = record.fullName || record.rawData?.full_name || record.rawData?.name || 'Meta Lead';
        const phone = record.phone || record.normalizedPhone || record.rawData?.phone_number || null;
        await recordingsAPI.linkLead(recording._id, {
          linkType: 'meta_lead',
          metaLeadId: recId,
          metaLeadName: name,
          metaLeadPhone: phone,
          campaignName: record.campaign || null,
        });
      } else if (cat === 'campaign') {
        await recordingsAPI.linkLead(recording._id, {
          linkType: 'campaign',
          campaignId: recId,
          campaignName: record.name || 'Campaign',
        });
      } else if (cat === 'lead') {
        await recordingsAPI.linkLead(recording._id, {
          linkType: 'lead',
          leadId: recId,
        });
      }
      onLinked();
      onClose();
    } catch (err) {
      console.error('Failed to link session:', err);
      setError(err.response?.data?.error || 'Failed to link session.');
    } finally {
      setLinkingId(null);
    }
  };

  const q = search.trim().toLowerCase();

  const filteredMeta = metaLeads.filter(m => {
    if (metaCampaignFilter !== 'all' && m.campaign !== metaCampaignFilter) return false;
    if (!q) return true;
    const name = (m.fullName || m.rawData?.full_name || m.rawData?.name || '').toLowerCase();
    const phone = (m.phone || m.normalizedPhone || m.rawData?.phone_number || '').toLowerCase();
    const email = (m.email || m.rawData?.email || '').toLowerCase();
    const camp = (m.campaign || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q) || camp.includes(q);
  });

  const filteredCampaigns = campaigns.filter(c => {
    if (!q) return true;
    const name = (c.name || '').toLowerCase();
    const desc = (c.description || '').toLowerCase();
    const status = (c.status || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || status.includes(q);
  });

  const filteredNormal = normalLeads.filter(l => {
    if (!q) return true;
    const name = (l.name || '').toLowerCase();
    const phone = (l.phone || '').toLowerCase();
    const email = (l.email || '').toLowerCase();
    const status = (l.status || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q) || status.includes(q);
  });

  const currentLink = getLinkInfo(recording);

  const categories = [
    {
      id: 'meta_lead',
      label: 'Meta Leads',
      count: filteredMeta.length,
      icon: Sparkles,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      activeBg: '#7c3aed',
      activeText: '#ffffff',
    },
    {
      id: 'campaign',
      label: 'Campaigns',
      count: filteredCampaigns.length,
      icon: Megaphone,
      color: '#ea580c',
      bgColor: '#fff7ed',
      borderColor: '#fed7aa',
      activeBg: '#ea580c',
      activeText: '#ffffff',
    },
    {
      id: 'lead',
      label: 'Normal Leads',
      count: filteredNormal.length,
      icon: User,
      color: '#0284c7',
      bgColor: '#f0f9ff',
      borderColor: '#bae6fd',
      activeBg: '#0284c7',
      activeText: '#ffffff',
    },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        style={{
          background: '#ffffff', borderRadius: '16px', border: `1.5px solid ${C.blue}`,
          boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.25)', width: '100%', maxWidth: '640px',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.bgSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: C.dark, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 style={{ width: '18px', height: '18px', color: C.blue }} /> Link Recording Session
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: C.textSoft }}>
              Recording: <span style={{ fontWeight: 600, color: C.dark }}>{recording.originalName || 'Audio Recording'}</span> {recording.phone ? `• 📞 ${recording.phone}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer',
              color: C.textSoft, padding: '4px', borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Current Link Status Banner */}
          {currentLink.isLinked && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '10px', background: currentLink.badgeBg,
              border: `1px solid ${currentLink.badgeBorder}`, gap: '12px'
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: '#ffffff', color: currentLink.badgeColor, padding: '2px 6px', borderRadius: '4px',
                    border: `1px solid ${currentLink.badgeBorder}`
                  }}>
                    {currentLink.badgeLabel}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentLink.name}
                  </span>
                </div>
                {currentLink.subDetail && (
                  <div style={{ fontSize: '11px', color: currentLink.badgeColor, marginTop: '2px', fontWeight: 500 }}>
                    {currentLink.subDetail}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleLink(null, null)}
                disabled={linkingId === 'unlink'}
                style={{
                  background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 12px',
                  borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0
                }}
              >
                <Unlink style={{ width: '12px', height: '12px' }} />
                <span>{linkingId === 'unlink' ? 'Unlinking...' : 'Unlink Session'}</span>
              </button>
            </div>
          )}

          {/* Filtering Category Segmented Buttons (Three Options) */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 500, color: C.textSoft, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
              Select Link Category:
            </label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
              background: '#f1f5f9', padding: '4px', borderRadius: '10px'
            }}>
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '9px 12px', borderRadius: '8px', border: 'none',
                      background: isActive ? cat.activeBg : 'transparent',
                      color: isActive ? cat.activeText : '#475569',
                      fontWeight: 500, fontSize: '12px', cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                      transition: 'all 0.18s'
                    }}
                  >
                    <IconComponent style={{ width: '14px', height: '14px' }} />
                    <span>{cat.label}</span>
                    <span style={{
                      fontSize: '10px', padding: '1px 5px', borderRadius: '10px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#64748b'
                    }}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Sub-filter controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder={
                  activeCategory === 'meta_lead'
                    ? '🔍 Search Meta leads by name, phone, email, or campaign...'
                    : activeCategory === 'campaign'
                    ? '🔍 Search campaigns by name, description, or status...'
                    : '🔍 Search normal leads by name, phone, or email...'
                }
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${C.border}`,
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Campaign dropdown for Meta Leads category */}
            {activeCategory === 'meta_lead' && distinctMetaCampaigns.length > 0 && (
              <select
                value={metaCampaignFilter}
                onChange={e => setMetaCampaignFilter(e.target.value)}
                style={{
                  padding: '9px 10px', borderRadius: '8px', border: `1px solid ${C.border}`,
                  fontSize: '12px', fontWeight: 600, background: '#ffffff', color: C.dark, outline: 'none'
                }}
              >
                <option value="all">All Campaigns ({metaLeads.length})</option>
                {distinctMetaCampaigns.map(camp => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
            )}
          </div>

          {/* Record List */}
          <div style={{ flex: 1, minHeight: '260px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.textSoft, fontSize: '13px' }}>
                ⏳ Loading {activeCategory === 'meta_lead' ? 'Meta leads' : activeCategory === 'campaign' ? 'campaigns' : 'leads'}...
              </div>
            ) : activeCategory === 'meta_lead' ? (
              /* ── 1. META LEADS LIST ── */
              filteredMeta.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.textSoft, fontSize: '13px' }}>
                  No Meta leads found matching "{search}"
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredMeta.map(lead => {
                    const leadId = lead._id || lead.id;
                    const isCurrent = (recording.linkType === 'meta_lead' && recording.metaLeadId === leadId)
                      || recording.metaLeadId === leadId;
                    const isLinkingThis = linkingId === leadId;
                    const leadName = lead.fullName || lead.rawData?.full_name || lead.rawData?.name || 'Meta Lead';
                    const leadPhone = lead.phone || lead.normalizedPhone || lead.rawData?.phone_number || lead.rawData?.phone;

                    return (
                      <div
                        key={leadId}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: '8px',
                          border: `1px solid ${isCurrent ? '#7c3aed' : C.border}`,
                          background: isCurrent ? '#f5f3ff' : '#ffffff',
                          transition: 'all 0.15s', gap: '10px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: C.dark }}>
                              {leadName}
                            </span>
                            {lead.campaign && (
                              <span style={{
                                fontSize: '10px', fontWeight: 600, background: '#ede9fe', color: '#6d28d9',
                                padding: '1px 6px', borderRadius: '4px'
                              }}>
                                {lead.campaign}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: C.textSoft, marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <span>📞 {leadPhone || 'No phone'}</span>
                            {lead.email && <span>✉️ {lead.email}</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleLink('meta_lead', lead)}
                          disabled={isCurrent || isLinkingThis}
                          style={{
                            background: isCurrent ? C.green : '#7c3aed',
                            color: '#ffffff', border: 'none', padding: '6px 12px',
                            borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                            cursor: (isCurrent || isLinkingThis) ? 'default' : 'pointer',
                            opacity: isLinkingThis ? 0.7 : 1, flexShrink: 0
                          }}
                        >
                          {isCurrent ? '✓ Linked' : isLinkingThis ? 'Linking...' : '+ Select & Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeCategory === 'campaign' ? (
              /* ── 2. CAMPAIGNS LIST ── */
              filteredCampaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.textSoft, fontSize: '13px' }}>
                  No campaigns found matching "{search}"
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredCampaigns.map(camp => {
                    const campId = camp._id || camp.id;
                    const isCurrent = (recording.linkType === 'campaign' && (recording.campaignId === campId || recording.campaignName === camp.name))
                      || recording.campaignId === campId;
                    const isLinkingThis = linkingId === campId;

                    return (
                      <div
                        key={campId}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: '8px',
                          border: `1px solid ${isCurrent ? '#ea580c' : C.border}`,
                          background: isCurrent ? '#fff7ed' : '#ffffff',
                          transition: 'all 0.15s', gap: '10px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: C.dark }}>
                              {camp.name}
                            </span>
                            {camp.status && (
                              <span style={{
                                fontSize: '10px', fontWeight: 600, background: '#ffedd5', color: '#c2410c',
                                padding: '1px 6px', borderRadius: '4px'
                              }}>
                                {camp.status}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: C.textSoft, marginTop: '2px' }}>
                            {camp.description || 'Marketing Campaign Session'} {camp.totalLeads ? `• ${camp.totalLeads} total leads` : ''}
                          </div>
                        </div>

                        <button
                          onClick={() => handleLink('campaign', camp)}
                          disabled={isCurrent || isLinkingThis}
                          style={{
                            background: isCurrent ? C.green : '#ea580c',
                            color: '#ffffff', border: 'none', padding: '6px 12px',
                            borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                            cursor: (isCurrent || isLinkingThis) ? 'default' : 'pointer',
                            opacity: isLinkingThis ? 0.7 : 1, flexShrink: 0
                          }}
                        >
                          {isCurrent ? '✓ Linked' : isLinkingThis ? 'Linking...' : '+ Select & Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ── 3. NORMAL LEADS LIST ── */
              filteredNormal.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.textSoft, fontSize: '13px' }}>
                  No normal leads found matching "{search}"
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredNormal.map(lead => {
                    const leadId = lead._id || lead.id;
                    const isCurrent = (recording.linkType === 'lead' && recording.leadId === leadId)
                      || (recording.leadId === leadId && !recording.metaLeadId && !recording.campaignId);
                    const isLinkingThis = linkingId === leadId;

                    return (
                      <div
                        key={leadId}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: '8px',
                          border: `1px solid ${isCurrent ? C.blue : C.border}`,
                          background: isCurrent ? C.blueLight : '#ffffff',
                          transition: 'all 0.15s', gap: '10px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: C.dark }}>
                              {lead.name}
                            </span>
                            {lead.status && (
                              <span style={{
                                fontSize: '10px', fontWeight: 600, background: '#e0f2fe', color: '#0369a1',
                                padding: '1px 6px', borderRadius: '4px'
                              }}>
                                {lead.status}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: C.textSoft, marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <span>📞 {lead.phone || 'No phone'}</span>
                            {lead.email && <span>✉️ {lead.email}</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleLink('lead', lead)}
                          disabled={isCurrent || isLinkingThis}
                          style={{
                            background: isCurrent ? C.green : C.blue,
                            color: '#ffffff', border: 'none', padding: '6px 12px',
                            borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                            cursor: (isCurrent || isLinkingThis) ? 'default' : 'pointer',
                            opacity: isLinkingThis ? 0.7 : 1, flexShrink: 0
                          }}
                        >
                          {isCurrent ? '✓ Linked' : isLinkingThis ? 'Linking...' : '+ Select & Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── MAIN CALL RECORDINGS PAGE ───────────────────────────────────────────────
export default function CallRecordings() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics & Calendar state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [calendarActivity, setCalendarActivity] = useState([]);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    datePreset: 'all',
    exactDate: '',
    from: '',
    to: '',
    status: 'all',
    direction: 'all',
    durationTier: 'all',
    fileAvailable: 'all',
    linkType: 'all',
    user: 'all',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6, // 2 columns x 3 rows = 6 cards per page
    total: 0,
    totalPages: 1,
  });

  // Modals & Drawers
  const [activeLinkRecording, setActiveLinkRecording] = useState(null);
  const [activeConversationRecording, setActiveConversationRecording] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Action states
  const [rematching, setRematching] = useState(false);
  const [rematchMsg, setRematchMsg] = useState(null);
  const [transcribingId, setTranscribingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isAllowed = canViewCallRecordings(user);
  const isHRUser = isHR(user) || user?.role === 'hr' || String(user?.designation || '').toUpperCase() === 'HR';
  const isCEOUser = isCEO(user) || user?.role === 'ceo' || user?.role === 'admin' || user?.role === 'superadmin';
  const canManageCRUD = isHRUser || isCEOUser || user?.role === 'admin' || user?.role === 'superadmin';
  const canViewAllRecordings = canManageCRUD || isManager(user) || user?.role === 'manager';

  const getAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const backendHost = import.meta.env.VITE_API_URL || 'https://telecommunication-l3oz.onrender.com';
    const baseUrl = backendHost.replace(/\/api\/?$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Build clean query params object
  const buildQueryParams = (pageToLoad = pagination.page, filtersToUse = filters) => {
    const params = {
      page: pageToLoad,
      limit: pagination.limit,
    };
    if (filtersToUse.search && filtersToUse.search.trim()) params.search = filtersToUse.search.trim();
    if (filtersToUse.datePreset && filtersToUse.datePreset !== 'all' && filtersToUse.datePreset !== 'custom') {
      params.datePreset = filtersToUse.datePreset;
    }
    if (filtersToUse.exactDate) params.date = filtersToUse.exactDate;
    if (filtersToUse.from) params.from = filtersToUse.from;
    if (filtersToUse.to) params.to = filtersToUse.to;
    if (filtersToUse.status && filtersToUse.status !== 'all') params.status = filtersToUse.status;
    if (filtersToUse.direction && filtersToUse.direction !== 'all') params.direction = filtersToUse.direction;
    if (filtersToUse.durationTier && filtersToUse.durationTier !== 'all') params.durationTier = filtersToUse.durationTier;
    if (filtersToUse.fileAvailable && filtersToUse.fileAvailable !== 'all') params.fileAvailable = filtersToUse.fileAvailable;
    if (filtersToUse.linkType && filtersToUse.linkType !== 'all') params.linkType = filtersToUse.linkType;
    if (filtersToUse.user && filtersToUse.user !== 'all') params.user = filtersToUse.user;

    return params;
  };

  // Fetch paginated call recordings
  const fetchRecordings = async (pageToLoad = 1, currentFilters = filters) => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = buildQueryParams(pageToLoad, currentFilters);
      let res;
      if (canViewAllRecordings) {
        res = await recordingsAPI.getAll(params);
      } else {
        res = await recordingsAPI.getMy(params);
      }

      const data = res.data || {};
      const list = Array.isArray(data.recordings) ? data.recordings : (Array.isArray(data) ? data : []);
      setRecordings(list);

      if (data.pagination) {
        setPagination({
          page: data.pagination.page || pageToLoad,
          limit: data.pagination.limit || 6,
          total: data.pagination.total || list.length,
          totalPages: data.pagination.totalPages || 1,
        });
      } else {
        setPagination(prev => ({
          ...prev,
          page: pageToLoad,
          limit: 6,
          total: list.length,
          totalPages: Math.max(1, Math.ceil(list.length / 6)),
        }));
      }
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
      const res = await recordingsAPI.getAnalyticsSummary(params);
      setSummary(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to load call analytics summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch calendar activity dots
  const fetchCalendarActivity = async (targetDate = currentCalendarMonth) => {
    if (!isAllowed) return;
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const params = {
        year,
        month,
      };
      if (filters.user && filters.user !== 'all') params.user = filters.user;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.direction && filters.direction !== 'all') params.direction = filters.direction;

      const res = await recordingsAPI.getCalendarActivity(params);
      setCalendarActivity(res.data?.activity || []);
    } catch (err) {
      console.error('Failed to load calendar activity:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAllowed) {
      fetchRecordings(1, filters);
      fetchSummary(filters);
      fetchCalendarActivity(currentCalendarMonth);
    } else {
      setLoading(false);
    }
  }, [user, isAllowed]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchRecordings(1, newFilters);
    fetchSummary(newFilters);
  };

  // Handle calendar month change
  const handleCalendarMonthChange = (newDate) => {
    setCurrentCalendarMonth(newDate);
    fetchCalendarActivity(newDate);
  };

  // Handle clicking a date on the calendar
  const handleSelectCalendarDate = (dateStr) => {
    const updated = {
      ...filters,
      exactDate: dateStr,
      datePreset: 'custom',
      from: '',
      to: '',
    };
    setFilters(updated);
    fetchRecordings(1, updated);
    fetchSummary(updated);
  };

  // Handle pagination navigation
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) return;
    fetchRecordings(newPage, filters);
    window.scrollTo({ top: 350, behavior: 'smooth' });
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
      }
    } catch (err) {
      console.error('Transcription error:', err);
      const serverErrMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      alert(`⚠️ Transcription Error:\n${serverErrMsg}\n\nTroubleshooting Check:\n1. Verify OPENAI_API_KEY is set in Render Environment Variables.\n2. Ensure your OpenAI account has active credit balance.`);
    } finally {
      setTranscribingId(null);
    }
  };

  // Delete recording
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
        fetchSummary(filters);
        fetchCalendarActivity(currentCalendarMonth);
      } else {
        throw new Error(res.data?.error || 'Failed to delete audio conversation');
      }
    } catch (err) {
      console.error('Delete audio conversation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete audio conversation.';
      alert(`⚠️ Deletion Error:\n${errorMsg}\n\nThe record has been preserved in the list so you can safely retry.`);
    } finally {
      setDeletingId(null);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          </div>
          <p style={{ fontSize: '13px', color: C.textSoft, margin: '4px 0 0 0' }}>
            Interactive Calendar & 3-Column Smart Call Cards with real-time audio playback, caller tags, and AI Whisper transcript.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
            onClick={() => setShowExportModal(true)}
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
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <FileSpreadsheet style={{ width: '14px', height: '14px', color: C.green }} />
            Export CSV
          </button>

          <button
            onClick={() => {
              fetchRecordings(pagination.page, filters);
              fetchSummary(filters);
              fetchCalendarActivity(currentCalendarMonth);
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
      <CallAnalyticsCards summary={summary} loading={summaryLoading} />

      {/* ── ADVANCED FILTER PANEL ── */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <CallFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          totalCount={pagination.total}
          loading={loading}
        />
      </div>

      {/* ── MAIN WORKSPACE: SPLIT VIEW ONLY (Calendar Left, Column-Wise 3 Cards Right) ── */}
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

      {/* ── RESPONSIVE CSS INJECTION ── */}
      <style>{`
        .call-recordings-split-layout {
          display: grid;
          grid-template-columns: 460px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .call-recordings-calendar-sticky {
          position: sticky;
          top: 20px;
          width: 100%;
        }
        .call-records-responsive-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 1550px) {
          .call-recordings-split-layout {
            grid-template-columns: 430px minmax(0, 1fr);
            gap: 20px;
          }
          .call-records-responsive-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }
        }
        @media (max-width: 1350px) {
          .call-recordings-split-layout {
            grid-template-columns: 400px minmax(0, 1fr);
            gap: 16px;
          }
          .call-records-responsive-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 1100px) {
          .call-recordings-split-layout {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .call-recordings-calendar-sticky {
            position: static !important;
          }
          .call-records-responsive-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 720px) {
          .call-records-responsive-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="call-recordings-split-layout">
        {/* ── LEFT COLUMN: Interactive Calendar (Increased Width: 460px) ── */}
        <div className="call-recordings-calendar-sticky">
          <CallCalendarView
            activityData={calendarActivity}
            calendarActivity={calendarActivity}
            selectedDate={filters.exactDate}
            onSelectDate={handleSelectCalendarDate}
            viewMode="month"
            onViewModeChange={() => {}}
            currentMonth={currentCalendarMonth}
            onMonthChange={handleCalendarMonthChange}
          />

          {/* Quick Active Date Filter Card under Calendar (Compact) */}
          {filters.exactDate && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#0369a1' }}>Active Filter</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0c4a6e', marginTop: '1px' }}>
                  📅 {filters.exactDate}
                </div>
              </div>
              <button
                onClick={() => handleFilterChange({ ...filters, exactDate: '' })}
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#0284c7',
                  background: '#ffffff',
                  border: '1px solid #bae6fd',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                Clear ×
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Column-Wise 3 Cards ── */}
        <div style={{ minWidth: 0 }}>
          {/* Header Bar above 3-column cards */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#ffffff',
            borderRadius: '10px',
            border: `1px solid ${C.border}`,
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall style={{ width: '16px', height: '16px', color: C.blue }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: C.dark }}>
                {filters.exactDate ? `Calls on ${filters.exactDate}` : 'All Call Records'}
              </span>
              <span style={{ fontSize: '12px', color: C.textSoft, fontWeight: 500 }}>
                ({recordings.length} calls displayed)
              </span>
            </div>

            {filters.exactDate && (
              <button
                onClick={() => handleFilterChange({ ...filters, exactDate: '' })}
                style={{
                  fontSize: '11px',
                  color: C.blueDark,
                  background: C.blueLight,
                  border: '1px solid #bae6fd',
                  padding: '3px 9px',
                  borderRadius: '5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Show All Days ×
              </button>
            )}
          </div>

          {/* Loading or Empty State */}
          {loading ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: `1px solid ${C.border}`,
              padding: '60px 20px',
              textAlign: 'center',
              color: C.textSoft,
              fontSize: '14px',
            }}>
              <RefreshCw style={{ width: '22px', height: '22px', animation: 'spin 1s linear infinite', margin: '0 auto 10px auto', color: C.blue }} />
              Loading call records...
            </div>
          ) : recordings.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: `1px solid ${C.border}`,
              padding: '60px 20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: C.dark }}>No call records found</div>
              <div style={{ fontSize: '13px', color: C.textSoft, marginTop: '4px' }}>
                {filters.exactDate
                  ? `No calls logged on ${filters.exactDate}. Click another date on the calendar.`
                  : 'Try selecting a different filter or clearing search.'}
              </div>
            </div>
          ) : (
            /* 3-COLUMN CARDS GRID (Responsive Across All Devices) */
            <div className="call-records-responsive-grid">
              {recordings.map((rec) => {
                const recId = rec._id || rec.id;
                const linkInfo = getLinkInfo(rec);
                const rawAudio = rec.cloudinaryUrl || rec.streamUrl || rec.url || rec.audioUrl;
                const audioUrl = getAudioUrl(rawAudio);
                const leadInitial = linkInfo.name ? linkInfo.name.trim().charAt(0).toUpperCase() : 'M';
                const callerDesignation = rec.userDesignation || rec.userDepartment || 'HR';
                const audioFilename = rec.originalName || (rawAudio ? rawAudio.split('/').pop().split('?')[0] : 'Audio Conversation');

                return (
                  <div
                    key={recId}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.03)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    {/* 1. TOP HEADER: Avatar + Name + Badge + Phone + Edit Link + Menu */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      {/* Left: Avatar + Details */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '15px',
                          flexShrink: 0,
                        }}>
                          {leadInitial}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '15px',
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {linkInfo.name || 'Unknown Contact'}
                          </div>

                          <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-block',
                              background: linkInfo.badgeBg || '#e0f2fe',
                              color: linkInfo.badgeColor || '#0284c7',
                              border: `1px solid ${linkInfo.badgeBorder || '#bae6fd'}`,
                              borderRadius: '6px',
                              padding: '1px 8px',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}>
                              {linkInfo.badgeLabel || 'Lead'}
                            </span>
                          </div>

                          <div style={{
                            marginTop: '3px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <span style={{ color: '#e11d48', fontSize: '11px' }}>📞</span>
                            <span>{rec.phone || linkInfo.subDetail || 'No phone'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Edit Link Button + ⋮ Menu */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {canManageCRUD && (
                          <button
                            onClick={() => setActiveLinkRecording(rec)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              color: '#0284c7',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            <Link2 style={{ width: '12px', height: '12px' }} />
                            {linkInfo.isLinked ? 'Edit Link' : 'Link'}
                          </button>
                        )}

                        <ThreeDotsMenu
                          audioUrl={audioUrl}
                          originalName={rec.originalName}
                          onDelete={canManageCRUD ? () => handleDeleteRecording(rec) : undefined}
                        />
                      </div>
                    </div>

                    {/* 2. CALLER BOX: 👤 Caller: Raja Sri [HR] */}
                    <div style={{
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      padding: '7px 11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: '#475569',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User style={{ width: '13px', height: '13px', color: '#0284c7' }} />
                        <span>Caller: <span style={{ color: '#0f172a', fontWeight: 600 }}>{rec.userName || 'Assigned Caller'}</span></span>
                      </div>
                      <span style={{
                        background: '#e2e8f0',
                        color: '#475569',
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}>
                        {callerDesignation}
                      </span>
                    </div>

                    {/* 3. FILENAME ROW: 🎧 7731864136%202026-10-23%2015-41-... */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      <Headphones style={{ width: '15px', height: '15px', color: '#0284c7', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={audioFilename}>
                        {audioFilename}
                      </span>
                    </div>

                    {/* 4. DATE & TIME BOX: 🕒 23 Oct 2026, 06:45 pm IST */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '7px 11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: 500,
                    }}>
                      <Clock style={{ width: '13px', height: '13px', color: '#94a3b8' }} />
                      <span>{rec.recordedAt ? formatISTDateTime(rec.recordedAt) : `${rec.callDate || ''} ${rec.callTime || ''}`}</span>
                    </div>

                    {/* 5. PHONE PILL: 📞 7731864136 */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '5px 11px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#0f172a',
                      alignSelf: 'flex-start',
                    }}>
                      <PhoneCall style={{ width: '13px', height: '13px', color: '#16a34a' }} />
                      <span>{rec.phone || 'N/A'}</span>
                    </div>

                    {/* 6. VOICE AUDIO PLAYER */}
                    <div style={{ marginTop: '2px' }}>
                      <MemoizedAudioPlayer
                        audioUrl={audioUrl}
                        mimeType={rec.mimeType}
                        fileExists={rec.fileExists}
                        fileAvailable={rec.fileAvailable}
                        onRetry={() => fetchRecordings(pagination.page, filters)}
                      />
                    </div>

                    {/* 7. AI WHISPER TRANSCRIPT BOX */}
                    <div style={{
                      background: '#f0f9ff',
                      border: '1px solid #e0f2fe',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginTop: '2px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0284c7', fontWeight: 600, fontSize: '12px' }}>
                          <Sparkles style={{ width: '13px', height: '13px', color: '#0284c7' }} />
                          <span>AI Whisper Transcript:</span>
                        </div>

                        {rec.transcript ? (
                          <button
                            onClick={() => setActiveConversationRecording(rec)}
                            style={{
                              background: '#e0f2fe',
                              border: 'none',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <ExternalLink style={{ width: '10px', height: '10px' }} />
                            Chat View
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTranscribe(recId)}
                            disabled={transcribingId === recId}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #bae6fd',
                              color: '#0284c7',
                              padding: '2px 8px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: transcribingId === recId ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Sparkles style={{ width: '10px', height: '10px' }} />
                            {transcribingId === recId ? 'Transcribing...' : 'Transcribe'}
                          </button>
                        )}
                      </div>

                      {rec.transcript ? (
                        <div style={{
                          fontSize: '12px',
                          color: '#334155',
                          lineHeight: 1.5,
                          maxHeight: '75px',
                          overflowY: 'auto',
                          borderRight: '3px solid #38bdf8',
                          paddingRight: '6px',
                        }}>
                          {rec.transcript}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          No transcript yet. Click Transcribe to generate AI text.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PAGINATION CONTROLS ── */}
          {pagination.total > 0 && (
            <div style={{
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 18px',
              background: '#ffffff',
              borderRadius: '10px',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: '13px', color: C.textSoft }}>
                Showing <span style={{ fontWeight: 600, color: C.dark }}>{Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}</span> to{' '}
                <span style={{ fontWeight: 600, color: C.dark }}>{Math.min(pagination.total, pagination.page * pagination.limit)}</span> of{' '}
                <span style={{ fontWeight: 600, color: C.dark }}>{pagination.total}</span> calls
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: pagination.page <= 1 ? '#f8fafc' : '#ffffff',
                    color: pagination.page <= 1 ? '#94a3b8' : C.dark,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft style={{ width: '14px', height: '14px' }} />
                  Previous
                </button>

                <span style={{ fontSize: '12px', fontWeight: 500, color: C.dark, padding: '0 6px' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: pagination.page >= pagination.totalPages ? '#f8fafc' : '#ffffff',
                    color: pagination.page >= pagination.totalPages ? '#94a3b8' : C.dark,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                  <ChevronRight style={{ width: '14px', height: '14px' }} />
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

        {/* AI Transcript Full Conversation Modal */}
        {activeConversationRecording && (
          <TranscriptConversationModal
            recording={activeConversationRecording}
            onClose={() => setActiveConversationRecording(null)}
          />
        )}

        {/* Export CSV Modal */}
        {showExportModal && (
          <CallExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            filters={filters}
            totalCount={pagination.total}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
