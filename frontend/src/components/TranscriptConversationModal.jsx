import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Check } from 'lucide-react';
import SpotlightCard from './ui/SpotlightCard';
import AnimatedNumber from './ui/AnimatedNumber';

// ── "Create Todo Item" Palette Constants ────────────────────────────────────
const TODO_DEEP_BLUE = '#023047';
const TODO_BLUE_GREEN = '#219ebc';
const TODO_SKY_SURFACE = '#e8f4fa';
const TODO_BORDER = '#bbdff0';
const TODO_ORANGE = '#fb8500';
const TODO_MUTED = '#5b7082';

const MemoizedAudioPlayer = React.memo(function AudioPlayerComponent({ audioUrl, mimeType, initialDuration = 0, onDurationDetected }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(initialDuration || 0);
    setLoadError(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl, initialDuration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        if (err.name !== 'AbortError') {
          setLoadError(true);
        }
      });
    }
  };

  const formatSec = (sec) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#dc2626' }}>
        <span>⚠️ Playback error</span>
        <button
          type="button"
          onClick={() => {
            setLoadError(false);
            if (audioRef.current) {
              audioRef.current.load();
              audioRef.current.play().catch(() => {});
            }
          }}
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '3px 10px',
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: '#dc2626',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime || 0);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
            const realSec = audioRef.current.duration;
            setDuration(realSec);
            if (onDurationDetected && realSec > 0) {
              onDurationDetected(Math.round(realSec));
            }
          }
        }}
        onError={() => setLoadError(true)}
      >
        <source src={audioUrl} type={mimeType || 'audio/mp4'} />
      </audio>

      {/* Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        title={isPlaying ? 'Pause' : 'Play'}
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: TODO_BLUE_GREEN,
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(33, 158, 188, 0.3)',
          padding: 0
        }}
      >
        {isPlaying ? (
          <span style={{ fontSize: 11, fontWeight: 900 }}>❚❚</span>
        ) : (
          <span style={{ fontSize: 11, marginLeft: 1.5 }}>▶</span>
        )}
      </button>

      {/* Current Time */}
      <span style={{ fontSize: 12, fontWeight: 600, color: TODO_DEEP_BLUE, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {formatSec(currentTime)}
      </span>

      {/* Seek Scrubber Bar (No Mute/Unmute or Volume Controls) */}
      <input
        type="range"
        min={0}
        max={duration || 100}
        step="0.1"
        value={currentTime}
        onChange={e => {
          const val = Number(e.target.value);
          setCurrentTime(val);
          if (audioRef.current) audioRef.current.currentTime = val;
        }}
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          height: 5,
          borderRadius: 4,
          cursor: 'pointer',
          accentColor: TODO_BLUE_GREEN,
          margin: 0,
          padding: 0
        }}
      />

      {/* Total Duration */}
      <span style={{ fontSize: 12, fontWeight: 600, color: TODO_MUTED, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {formatSec(duration)}
      </span>
    </div>
  );
});

export function parseTranscriptToConversation(rawText, agentName = 'Agent / Telecaller', customerName = 'Customer / Lead') {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const speakerRegex = /^(Agent|Caller|Executive|Customer|Lead|User|Client):\s*(.*)$/i;

  const hasExplicitSpeakers = lines.some(line => speakerRegex.test(line));

  if (hasExplicitSpeakers) {
    return lines.map((line, idx) => {
      const match = line.match(speakerRegex);
      if (match) {
        const speakerTag = match[1].toLowerCase();
        const isAgent = ['agent', 'caller', 'executive'].includes(speakerTag);
        return {
          id: idx,
          speaker: isAgent ? (agentName || 'Agent') : (customerName || 'Customer'),
          role: isAgent ? 'agent' : 'customer',
          text: match[2],
        };
      }
      return {
        id: idx,
        speaker: idx % 2 === 0 ? (agentName || 'Agent') : (customerName || 'Customer'),
        role: idx % 2 === 0 ? 'agent' : 'customer',
        text: line,
      };
    });
  }

  const sentences = rawText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return [];

  const turns = [];
  let currentTurn = [];
  let currentRole = 'agent';

  sentences.forEach((sentence, idx) => {
    currentTurn.push(sentence);
    if (sentence.includes('?') || currentTurn.length >= 2 || idx === sentences.length - 1) {
      turns.push({
        id: turns.length,
        speaker: currentRole === 'agent' ? (agentName || 'Agent / Telecaller') : (customerName || 'Customer / Lead'),
        role: currentRole,
        text: currentTurn.join(' '),
      });
      currentTurn = [];
      currentRole = currentRole === 'agent' ? 'customer' : 'agent';
    }
  });

  return turns;
}

export default function TranscriptConversationModal({ recording, onClose, onTranscribe, transcribing = false, onDurationDetected }) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!recording) return null;

  const rawAudioUrl = recording.cloudinaryUrl || recording.streamUrl || recording.url || recording.audioUrl;
  const getAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const backendHost = import.meta.env.VITE_API_URL || 'https://telecommunication-l3oz.onrender.com';
    const baseUrl = backendHost.replace(/\/api\/?$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  const audioUrl = getAudioUrl(rawAudioUrl);
  const isCloudinaryAudio = !!(audioUrl && (audioUrl.includes('cloudinary.com') || audioUrl.includes('res.cloudinary.com')));
  const isAudioAvailable = !!audioUrl && (isCloudinaryAudio || (recording.fileExists !== false && recording.fileAvailable !== false));

  const rawLeadName =
    recording.metaLeadName ||
    recording.leadName ||
    recording.lead?.name ||
    recording.contactName ||
    'Customer / Lead';
  const leadName = String(rawLeadName).replace(/^(?:p|l):[\d]+\s*/i, '').trim() || 'Customer / Lead';
  const agentName = recording.userName || recording.user?.name || 'Telecaller Agent';
  const campaignName = recording.campaignName || recording.campaign?.name || '';

  const conversationTurns = parseTranscriptToConversation(recording.transcript, agentName, leadName);
  const q = searchQuery.trim().toLowerCase();
  const filteredTurns = q
    ? conversationTurns.filter(
        t =>
          String(t.text || '').toLowerCase().includes(q) ||
          String(t.speaker || '').toLowerCase().includes(q)
      )
    : conversationTurns;

  const handleCopy = () => {
    navigator.clipboard.writeText(recording.transcript || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 48, 71, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1100,
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
          maxWidth: 500,
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
            Chat View Session
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
          {/* 1. Recording & Lead Info Card (ReactBits SpotlightCard) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE }}>
                Lead & Recording Details
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
                {campaignName ? `📢 ${campaignName}` : 'AI Whisper Chat'}
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
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: TODO_DEEP_BLUE,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {leadName}
                </div>
                <div style={{
                  fontSize: 12,
                  color: TODO_MUTED,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap'
                }}>
                  {recording.phone && <span>📞 {recording.phone}</span>}
                  <span>👤 Caller: <strong style={{ color: TODO_DEEP_BLUE }}>{agentName}</strong></span>
                </div>
                {recording.originalName && (
                  <div style={{
                    fontSize: 11.5,
                    color: TODO_BLUE_GREEN,
                    marginTop: 4,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    🎧 {recording.originalName}
                  </div>
                )}
              </div>
            </SpotlightCard>
          </div>

          {/* 2. Voice Audio Player Card */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
              Voice Recording Playback
            </label>
            <div
              style={{
                border: `1px solid ${TODO_BORDER}`,
                borderRadius: 8,
                padding: '10px 12px',
                background: '#fff'
              }}
            >
              {!isAudioAvailable ? (
                <div style={{ fontSize: 12.5, color: TODO_MUTED, fontStyle: 'italic' }}>
                  Audio stream unavailable — transcript preserved below.
                </div>
              ) : (
                <MemoizedAudioPlayer
                  audioUrl={audioUrl}
                  mimeType={recording.mimeType}
                  initialDuration={recording.duration || 0}
                  onDurationDetected={realSec => {
                    if (onDurationDetected) {
                      onDurationDetected(recording._id || recording.id, realSec);
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* 3. Search Within Conversation */}
          {conversationTurns.length > 0 && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE, display: 'block', marginBottom: 6 }}>
                Filter Conversation
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search keywords or speaker in chat..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    border: `1px solid ${TODO_BORDER}`,
                    borderRadius: 8,
                    padding: '9px 30px 9px 12px',
                    fontSize: 13.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: TODO_DEEP_BLUE,
                    background: '#fff'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
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
          )}

          {/* 4. AI Whisper Conversation Chat — WhatsApp Bubble Layout on Clean White Background */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE }}>
                AI Whisper Conversation Chat
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
                <AnimatedNumber value={filteredTurns.length} /> Messages
              </span>
            </div>

            {/* Clean White Background Chat Container with WhatsApp Left/Right Bubble Layout */}
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${TODO_BORDER}`,
                backgroundColor: '#ffffff',
                maxHeight: 300,
                minHeight: 200,
                overflowY: 'auto',
                padding: '12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxSizing: 'border-box',
                width: '100%'
              }}
            >
              {filteredTurns.length === 0 ? (
                <div
                  style={{
                    padding: '36px 14px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: TODO_MUTED
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    {recording.transcript
                      ? 'No messages match your search filter.'
                      : 'No AI transcript generated for this call session yet.'}
                  </div>
                  {!recording.transcript && onTranscribe && (
                    <button
                      type="button"
                      onClick={() => onTranscribe(recording._id || recording.id)}
                      disabled={transcribing}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: 'none',
                        background: TODO_BLUE_GREEN,
                        color: '#fff',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: transcribing ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Sparkles style={{ width: 13, height: 13 }} />
                      {transcribing ? 'Transcribing Audio...' : 'Generate AI Transcript'}
                    </button>
                  )}
                </div>
              ) : (
                filteredTurns.map((turn, idx) => {
                  const isAgent = turn.role === 'agent';
                  const baseMin = 10 + Math.floor(idx / 2);
                  const sec = (idx * 17) % 60;
                  const msgTime = `${String(baseMin).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

                  return (
                    <div
                      key={turn.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-end' : 'flex-start',
                        width: '100%',
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          maxWidth: '84%',
                          minWidth: '125px',
                          background: isAgent ? TODO_SKY_SURFACE : '#f8fafc',
                          border: `1px solid ${isAgent ? TODO_BORDER : '#e2e8f0'}`,
                          color: TODO_DEEP_BLUE,
                          padding: '8px 11px 6px 11px',
                          borderRadius: isAgent ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                          boxShadow: '0 1px 2px rgba(2, 48, 71, 0.04)',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Speaker Name Header Inside Bubble */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            marginBottom: 3
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: isAgent ? TODO_BLUE_GREEN : '#0f172a'
                            }}
                          >
                            {isAgent ? `👤 ${turn.speaker}` : `🗣️ ${turn.speaker}`}
                          </span>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 600,
                              color: TODO_MUTED,
                              textTransform: 'uppercase'
                            }}
                          >
                            {isAgent ? 'Agent' : 'Lead'}
                          </span>
                        </div>

                        {/* Message Text */}
                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: TODO_DEEP_BLUE,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            paddingBottom: 2
                          }}
                        >
                          {turn.text}
                        </div>

                        {/* Bottom-Right Timestamp (Single/Double Tick Removed) */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            marginTop: 2
                          }}
                        >
                          <span style={{ fontSize: 10, color: TODO_MUTED, lineHeight: 1 }}>
                            {msgTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

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
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!recording.transcript}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              borderRadius: 8,
              background: TODO_ORANGE,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: !recording.transcript ? 'not-allowed' : 'pointer',
              opacity: !recording.transcript ? 0.65 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            {copied ? <Check style={{ width: 15, height: 15 }} /> : <Copy style={{ width: 15, height: 15 }} />}
            {copied ? 'Copied!' : 'Copy Transcript'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
