import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AudioLines, Table, LayoutGrid, PhoneCall, FileAudio, 
  Clock, Edit3, MoreVertical, Download, ExternalLink, RefreshCw, User, UserPlus, Sparkles, FileText,
  Maximize2, MessageSquare, Copy, Check, Volume2, Volume1, VolumeX, Trash2, Briefcase,
  Megaphone, Search, X, Link2, Unlink, Layers, Filter, CheckCircle2
} from 'lucide-react';
import { recordingsAPI, leadsAPI, metaLeadsAPI, campaignsAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { formatISTDateTime } from '../../../utils/dateFormat';
import { isHR, isCEO, isManager, canViewCallRecordings } from '../../../utils/permissions';
import TranscriptConversationModal from '../../../components/TranscriptConversationModal';

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
  if (!audioUrl || fileExists === false || fileAvailable === false) {
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
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.dark, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 style={{ width: '18px', height: '18px', color: C.blue }} /> Link Recording Session
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: C.textSoft }}>
              Recording: <strong>{recording.originalName || 'Audio Recording'}</strong> {recording.phone ? `• 📞 ${recording.phone}` : ''}
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
                    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: '#ffffff', color: currentLink.badgeColor, padding: '2px 6px', borderRadius: '4px',
                    border: `1px solid ${currentLink.badgeBorder}`
                  }}>
                    {currentLink.badgeLabel}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
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
            <label style={{ fontSize: '11px', fontWeight: 700, color: C.textSoft, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' }}>
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
                      fontWeight: 700, fontSize: '12px', cursor: 'pointer',
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
                            <span style={{ fontWeight: 700, fontSize: '13px', color: C.dark }}>
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
                            borderRadius: '6px', fontSize: '11px', fontWeight: 700,
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
                            <span style={{ fontWeight: 700, fontSize: '13px', color: C.dark }}>
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
                            borderRadius: '6px', fontSize: '11px', fontWeight: 700,
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
                            <span style={{ fontWeight: 700, fontSize: '13px', color: C.dark }}>
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
                            borderRadius: '6px', fontSize: '11px', fontWeight: 700,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'matched', 'unmatched'
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [error, setError] = useState(null);
  const [rematching, setRematching] = useState(false);
  const [rematchMsg, setRematchMsg] = useState(null);
  const [activeLinkRecording, setActiveLinkRecording] = useState(null);
  const [transcribingId, setTranscribingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeConversationRecording, setActiveConversationRecording] = useState(null);

  const isAllowed = canViewCallRecordings(user);

  const isHRUser = isHR(user) || user?.role === 'hr' || String(user?.designation || '').toUpperCase() === 'HR';
  const isCEOUser = isCEO(user) || user?.role === 'ceo' || user?.role === 'admin' || user?.role === 'superadmin';
  const canManageCRUD = isHRUser || isCEOUser || user?.role === 'admin' || user?.role === 'superadmin';
  const canViewAllRecordings = canManageCRUD || isManager(user) || user?.role === 'manager';

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

  const fetchRecordings = async () => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = canViewAllRecordings ? await recordingsAPI.getAll() : await recordingsAPI.getMy();
      const list = res.data?.recordings || res.data || [];
      setRecordings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load call recordings:', err);
      setError('Failed to fetch call recordings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      fetchRecordings();
    } else {
      setLoading(false);
    }
  }, [user, isAllowed]);

  if (!isAllowed) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', maxWidth: '600px', margin: '40px auto', border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: C.dark, marginBottom: '8px' }}>Access Restricted</h2>
        <p style={{ fontSize: '14px', color: C.textSoft, lineHeight: 1.6, margin: 0 }}>
          The Call Recordings module is visible and accessible only to HR and Admin accounts.
        </p>
      </div>
    );
  }

  const handleRematch = async () => {
    setRematching(true);
    setRematchMsg(null);
    try {
      const res = await recordingsAPI.rematchLeads();
      setRematchMsg(`Auto-match completed: ${res.data?.matched || 0} leads newly linked!`);
      fetchRecordings();
    } catch (err) {
      console.error('Rematch error:', err);
      setRematchMsg('Auto-match operation failed.');
    } finally {
      setRematching(false);
    }
  };

  const handleDeleteRecording = async (rec) => {
    const recId = rec._id || rec.id;
    if (!recId) return;
    if (deletingId) return; // Prevent double-clicks while deletion is in flight

    const fileName = rec.originalName || 'this recording';
    const confirmDelete = window.confirm(
      `Delete this audio conversation permanently?\nThe linked audio recording in Cloudinary/server storage and the conversation/transcript record in MongoDB will be deleted. This action cannot be undone.\n\nFile: ${fileName}`
    );
    if (!confirmDelete) return;

    setDeletingId(recId);
    try {
      const res = await recordingsAPI.delete(recId);
      if (res.data?.success) {
        // Remove item from UI state only after the backend confirms complete deletion
        setRecordings(prev => prev.filter(r => (r._id || r.id) !== recId));
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

  const filteredRecordings = recordings.filter(rec => {
    const linkInfo = getLinkInfo(rec);
    const leadName = linkInfo.name || rec.leadName || rec.lead?.name || '';
    const phone = rec.phone || rec.leadPhone || rec.lead?.phone || rec.metaLeadPhone || '';
    const filename = rec.originalName || '';
    const campName = rec.campaignName || rec.metaLeadCampaign || '';

    const matchesSearch =
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'matched') return linkInfo.isLinked;
    if (filterType === 'unmatched') return !linkInfo.isLinked;

    return true;
  });

  const getAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const backendHost = import.meta.env.VITE_API_URL || 'https://telecommunication-l3oz.onrender.com';
    const baseUrl = backendHost.replace(/\/api\/?$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* ── HEADER CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: '#1a73e8',
          padding: '24px 28px', borderRadius: '16px', color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(26, 115, 232, 0.35)', marginBottom: '24px',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
            <span>Marketing Call Intelligence</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AudioLines style={{ width: '28px', height: '28px' }} /> Call Recordings Hub
          </h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.9, fontSize: '14px', maxWidth: '600px' }}>
            Listen, search, and manually assign synced call recordings to CRM leads, campaigns & contacts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {canManageCRUD && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRematch}
              disabled={rematching}
              style={{
                background: C.orange, color: '#ffffff', border: 'none', padding: '10px 18px',
                borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: rematching ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', opacity: rematching ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)'
              }}
            >
              <RefreshCw style={{ width: '14px', height: '14px' }} className={rematching ? 'animate-spin' : ''} />
              {rematching ? 'Matching...' : 'Auto-Match Leads'}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchRecordings}
            style={{
              background: 'rgba(255,255,255,0.2)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(10px)', padding: '10px 18px', borderRadius: '10px', fontWeight: 700,
              fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            ⚡ Refresh List
          </motion.button>
        </div>
      </motion.div>

      {rematchMsg && (
        <div style={{
          background: C.greenLight, color: C.green, padding: '12px 18px', borderRadius: '10px',
          marginBottom: '20px', fontSize: '14px', fontWeight: 600, border: `1px solid ${C.greenBorder}`
        }}>
          ✅ {rematchMsg}
        </div>
      )}

      {/* ── STATS BAR ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px'
      }}>
        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '12px', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ color: C.textSoft, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Recordings</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: C.dark, marginTop: '2px' }}>{recordings.length}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '12px', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ color: C.textSoft, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linked Sessions</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: C.green, marginTop: '2px' }}>
            {recordings.filter(r => getLinkInfo(r).isLinked).length}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '12px', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ color: C.textSoft, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unlinked Calls</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: C.orange, marginTop: '2px' }}>
            {recordings.filter(r => !getLinkInfo(r).isLinked).length}
          </div>
        </div>
      </div>

      {/* ── SEARCH & VIEW MODE SWITCH ── */}
      <div style={{
        background: '#fff', padding: '14px 18px', borderRadius: '14px', border: `1px solid ${C.border}`,
        marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <input
          type="text"
          placeholder="🔍 Search lead name, phone number, or filename..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 260px', padding: '9px 14px', borderRadius: '8px', border: `1px solid ${C.border}`,
            fontSize: '13px', outline: 'none'
          }}
        />

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Filter Status Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '7px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: filterType === 'all' ? C.blue : '#f1f5f9',
                color: filterType === 'all' ? '#ffffff' : C.textSoft
              }}
            >
              All Calls
            </button>
            <button
              onClick={() => setFilterType('matched')}
              style={{
                padding: '7px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: filterType === 'matched' ? C.green : '#f1f5f9',
                color: filterType === 'matched' ? '#ffffff' : C.textSoft
              }}
            >
              Matched
            </button>
            <button
              onClick={() => setFilterType('unmatched')}
              style={{
                padding: '7px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: filterType === 'unmatched' ? C.orange : '#f1f5f9',
                color: filterType === 'unmatched' ? '#ffffff' : C.textSoft
              }}
            >
              Unlinked
            </button>
          </div>

          {/* View Mode Switcher (Card vs Table) */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setViewMode('card')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: viewMode === 'card' ? '#ffffff' : 'transparent',
                color: viewMode === 'card' ? C.blue : C.textSoft,
                boxShadow: viewMode === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <LayoutGrid style={{ width: '14px', height: '14px' }} /> Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? C.blue : C.textSoft,
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Table style={{ width: '14px', height: '14px' }} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* ── RECORDINGS LIST ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: '14px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '16px', color: C.textSoft, fontWeight: 600 }}>⏳ Loading call recordings...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#fef2f2', color: '#dc2626', borderRadius: '14px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '14px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>🔇</div>
          <h3 style={{ margin: '0 0 6px 0', color: C.dark, fontSize: '18px' }}>No Call Recordings Found</h3>
          <p style={{ color: C.textSoft, fontSize: '14px', margin: 0 }}>
            {searchTerm ? 'No recordings match your search query.' : 'Sync call recordings from your mobile app to view and play them here.'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        
        /* ── COMPACT CARD GRID (With Framer-Motion Animations) ── */
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px'
        }}>
          {filteredRecordings.map((rec, index) => {
            const audioUrl = getAudioUrl(rec.cloudinaryUrl || rec.url);
            const linkInfo = getLinkInfo(rec);

            return (
              <motion.div
                key={rec._id || rec.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                whileHover={{ scale: 1.015, y: -2 }}
                style={{
                  background: '#ffffff', borderRadius: '12px', border: `1px solid ${C.border}`,
                  padding: '14px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  overflow: 'hidden', boxSizing: 'border-box'
                }}
              >
                {/* 1. TOP LINE: Linked Session (Avatar + Name + Badge) | Link Session Button | Three Dots Menu */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  
                  {/* Avatar + Name + Subtitle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: linkInfo.avatarBg,
                      color: linkInfo.avatarColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '12px', border: `1px solid ${linkInfo.badgeBorder}`,
                      flexShrink: 0
                    }}>
                      {linkInfo.avatarIcon}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 700, fontSize: '13px', color: C.dark, lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }} title={linkInfo.name}>
                        {linkInfo.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          color: linkInfo.badgeColor,
                          background: linkInfo.badgeBg,
                          border: `1px solid ${linkInfo.badgeBorder}`,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          {linkInfo.badgeLabel}
                        </span>
                        {linkInfo.subDetail && (
                          <span style={{ fontSize: '10px', color: C.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={linkInfo.subDetail}>
                            {linkInfo.subDetail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Link Session Action Button & Three Dots Menu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {canManageCRUD && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveLinkRecording(rec)}
                        title={linkInfo.isLinked ? "Edit linked lead or campaign" : "Link this recording session to Meta Leads, Campaigns, or Normal Leads"}
                        style={{
                          background: linkInfo.isLinked ? '#f8fafc' : C.orangeLight,
                          border: `1px solid ${linkInfo.isLinked ? C.border : C.orange}`,
                          borderRadius: '8px',
                          padding: '5px 9px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '4px',
                          cursor: 'pointer',
                          color: linkInfo.isLinked ? C.blue : C.orangeDark,
                          boxShadow: linkInfo.isLinked ? 'none' : '0 2px 6px rgba(249, 115, 22, 0.2)',
                          transition: 'all 0.15s'
                        }}
                      >
                        <Link2 style={{ width: '11px', height: '11px' }} />
                        <span>{linkInfo.isLinked ? "Edit Link" : "Link Session"}</span>
                      </motion.button>
                    )}

                    {/* Three Dots Menu for Download, Open, & Delete */}
                    <ThreeDotsMenu
                      audioUrl={audioUrl}
                      originalName={rec.originalName}
                      onDelete={canManageCRUD ? () => handleDeleteRecording(rec) : undefined}
                    />
                  </div>
                </div>

                {/* Caller Profile Badge (Employee / Caller Tracking) */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f1f5f9', padding: '5px 8px', borderRadius: '6px', fontSize: '11px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontWeight: 600 }}>
                    <User style={{ width: '12px', height: '12px', color: C.blue }} />
                    <span>Caller: <strong style={{ color: C.dark }}>{rec.userName || 'Assigned Caller'}</strong></span>
                  </div>
                  {rec.userDepartment || rec.userDesignation ? (
                    <span style={{ fontSize: '10px', color: '#64748b', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                      {rec.userDepartment || rec.userDesignation}
                    </span>
                  ) : null}
                </div>

                {/* 2. SECOND LINE: Call Record Name */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileAudio style={{ width: '14px', height: '14px', color: C.blue, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.originalName}>
                    {rec.originalName || 'Call Recording'}
                  </span>
                </div>

                {/* 3. THIRD LINE: Date & Time */}
                <div style={{ fontSize: '11px', color: C.textSoft, display: 'flex', alignItems: 'center', gap: '6px', background: C.bgSoft, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <Clock style={{ width: '12px', height: '12px', color: '#94a3b8', flexShrink: 0 }} />
                  <span>{rec.recordedAt ? formatISTDateTime(rec.recordedAt) : `${rec.callDate || ''} ${rec.callTime || ''}`}</span>
                </div>

                {/* 4. FOURTH LINE: Phone Number */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.dark, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ background: '#f1f5f9', border: `1px solid ${C.border}`, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace' }}>
                    <PhoneCall style={{ width: '13px', height: '13px', color: C.green }} />
                    <span>{rec.phone || 'No Phone Number'}</span>
                  </div>
                </div>

                {/* 5. FIFTH LINE: Audio Container */}
                <div style={{ background: C.bgSoft, borderRadius: '8px', padding: '6px 8px', border: `1px solid ${C.border}`, overflow: 'hidden', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
                  <MemoizedAudioPlayer audioUrl={audioUrl} mimeType={rec.mimeType} fileExists={rec.fileExists} fileAvailable={rec.fileAvailable} onRetry={fetchRecordings} />
                </div>

                {/* 6. SIXTH LINE: AI Whisper Transcription */}
                <div style={{ marginTop: '2px' }}>
                  {rec.transcript ? (
                    <div style={{
                      background: '#f8fafc', padding: '8px 10px', borderRadius: '8px',
                      border: `1px solid ${C.border}`, fontSize: '11px', color: '#334155'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: C.blue }}>
                          <Sparkles style={{ width: '12px', height: '12px' }} />
                          <span>AI Whisper Transcript:</span>
                        </div>
                        <button
                          onClick={() => setActiveConversationRecording(rec)}
                          title="Open Fullscreen Chat Conversation View"
                          style={{
                            background: C.blueLight, color: C.blue, border: 'none', borderRadius: '4px',
                            padding: '2px 7px', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          <Maximize2 style={{ width: '11px', height: '11px' }} /> Chat View
                        </button>
                      </div>
                      <div style={{ maxHeight: '80px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {rec.transcript}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTranscribe(rec._id || rec.id)}
                      disabled={transcribingId === (rec._id || rec.id)}
                      style={{
                        background: C.blueSoft, color: C.blue, border: `1px solid ${C.blue}`,
                        padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                        cursor: transcribingId === (rec._id || rec.id) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px', width: '100%', justifyContent: 'center'
                      }}
                    >
                      <Sparkles style={{ width: '12px', height: '12px' }} className={transcribingId === (rec._id || rec.id) ? 'animate-spin' : ''} />
                      {transcribingId === (rec._id || rec.id) ? 'Transcribing with Whisper...' : 'Transcribe with AI (Whisper)'}
                    </button>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>

      ) : (

        /* ── TABLE VIEW FALLBACK ── */
        <div style={{ background: '#fff', borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}`, color: C.textSoft, fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Linked Session / Entity</th>
                  <th style={{ padding: '14px 16px' }}>Caller Profile</th>
                  <th style={{ padding: '14px 16px' }}>Phone Number</th>
                  <th style={{ padding: '14px 16px' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px' }}>Audio Player</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecordings.map((rec) => {
                  const audioUrl = getAudioUrl(rec.cloudinaryUrl || rec.url);
                  const linkInfo = getLinkInfo(rec);

                  return (
                    <tr key={rec._id || rec.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: linkInfo.avatarBg,
                            color: linkInfo.avatarColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '11px', border: `1px solid ${linkInfo.badgeBorder}`,
                            flexShrink: 0
                          }}>
                            {linkInfo.avatarIcon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: C.dark }}>
                              {linkInfo.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span style={{
                                fontSize: '10px',
                                color: linkInfo.badgeColor,
                                background: linkInfo.badgeBg,
                                border: `1px solid ${linkInfo.badgeBorder}`,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: 700
                              }}>
                                {linkInfo.badgeLabel}
                              </span>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {linkInfo.subDetail || rec.originalName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User style={{ width: '13px', height: '13px', color: C.blue }} />
                          <span style={{ fontWeight: 600, color: C.dark, fontSize: '12px' }}>
                            {rec.userName || 'Assigned Caller'}
                          </span>
                        </div>
                        {rec.userDepartment || rec.userDesignation ? (
                          <div style={{ fontSize: '10px', color: C.textSoft, marginTop: '2px' }}>
                            {rec.userDepartment || rec.userDesignation}
                          </div>
                        ) : null}
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                         {rec.phone || 'N/A'}
                      </td>

                      <td style={{ padding: '14px 16px', color: C.textSoft, fontSize: '12px' }}>
                        {rec.recordedAt ? formatISTDateTime(rec.recordedAt) : `${rec.callDate || ''} ${rec.callTime || ''}`}
                      </td>

                      <td style={{ padding: '14px 16px', minWidth: '300px' }}>
                        <MemoizedAudioPlayer audioUrl={audioUrl} mimeType={rec.mimeType} fileExists={rec.fileExists} fileAvailable={rec.fileAvailable} onRetry={fetchRecordings} />
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {canManageCRUD && (
                            <button
                              onClick={() => setActiveLinkRecording(rec)}
                              style={{
                                background: linkInfo.isLinked ? C.blueLight : C.orangeLight,
                                color: linkInfo.isLinked ? C.blue : C.orangeDark,
                                border: `1px solid ${linkInfo.isLinked ? C.blue : C.orange}`,
                                padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '11px',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <Link2 style={{ width: '12px', height: '12px' }} />
                              {linkInfo.isLinked ? ' Edit Link' : ' Link Session'}
                            </button>
                          )}
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
        </div>
      )}

      {/* ── MODALS ── */}
      <AnimatePresence>
        {activeLinkRecording && (
          <LinkSessionModal
            recording={activeLinkRecording}
            onClose={() => setActiveLinkRecording(null)}
            onLinked={fetchRecordings}
          />
        )}
        {activeConversationRecording && (
          <TranscriptConversationModal
            recording={activeConversationRecording}
            onClose={() => setActiveConversationRecording(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
