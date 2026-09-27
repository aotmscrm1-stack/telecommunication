import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Check, Volume2, X, MessageSquare, Maximize2 } from 'lucide-react';

const C = {
  blue: '#0284c7',
  blueDark: '#0369a1',
  blueLight: '#e0f2fe',
  blueSoft: '#f0f9ff',
  green: '#16a34a',
  greenLight: '#dcfce7',
  dark: '#0f172a',
  textSoft: '#64748b',
  border: '#e2e8f0',
  bgSoft: '#f8fafc',
};

const MemoizedAudioPlayer = React.memo(function AudioPlayerComponent({ audioUrl, mimeType }) {
  return (
    <audio
      controls
      controlsList="nodownload"
      preload="metadata"
      style={{ width: '100%', height: '36px', borderRadius: '8px' }}
    >
      <source src={audioUrl} type={mimeType || 'audio/mp4'} />
      Your browser does not support the audio element.
    </audio>
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

export default function TranscriptConversationModal({ recording, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!recording) return null;

  const audioUrl = recording.streamUrl || recording.url;
  const leadName = recording.leadName || recording.lead?.name || recording.contactName || 'Customer / Lead';
  const agentName = recording.userName || recording.user?.name || 'Telecaller Agent';

  const conversationTurns = parseTranscriptToConversation(recording.transcript, agentName, leadName);

  const handleCopy = () => {
    navigator.clipboard.writeText(recording.transcript || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.22 }}
        style={{
          background: '#ffffff', borderRadius: '20px', border: `1.5px solid ${C.blue}`,
          boxShadow: '0 25px 60px -12px rgba(2, 132, 199, 0.3)', width: '100%', maxWidth: '750px',
          height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${C.border}`, background: C.bgSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: C.blueLight, color: C.blue, padding: '4px 10px', borderRadius: '20px',
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>
                <MessageSquare style={{ width: '12px', height: '12px' }} /> AI Conversation Chat
              </span>
              <span style={{ fontSize: '12px', color: C.textSoft, fontWeight: 600 }}>
                📞 {recording.phone || 'No phone'}
              </span>
            </div>
            <h3 style={{ margin: '6px 0 0 0', fontSize: '17px', fontWeight: 800, color: C.dark }}>
              {recording.originalName || 'Call Recording Conversation'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleCopy}
              style={{
                background: '#ffffff', border: `1px solid ${C.border}`, padding: '6px 12px',
                borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: C.dark,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {copied ? <Check style={{ width: '14px', height: '14px', color: C.green }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
              {copied ? 'Copied!' : 'Copy Transcript'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9', border: 'none', width: '32px', height: '32px',
                borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: C.dark,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>

        {/* Audio Sticky Header Player */}
        <div style={{
          padding: '12px 24px', background: '#f0f9ff', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: '14px'
        }}>
          <div style={{ fontWeight: 700, fontSize: '12px', color: C.blueDark, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Volume2 style={{ width: '16px', height: '16px', color: C.blue }} /> Audio Player:
          </div>
          <div style={{ flex: 1 }}>
            <MemoizedAudioPlayer audioUrl={audioUrl} mimeType={recording.mimeType} />
          </div>
        </div>

        {/* Conversation Chat Body */}
        <div style={{
          padding: '20px 24px', flex: 1, overflowY: 'auto', background: '#f8fafc',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          {conversationTurns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.textSoft }}>
              No transcript text available for conversation view.
            </div>
          ) : (
            conversationTurns.map(turn => {
              const isAgent = turn.role === 'agent';
              return (
                <div
                  key={turn.id}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: isAgent ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', alignSelf: isAgent ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: C.textSoft, marginBottom: '4px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    flexDirection: isAgent ? 'row-reverse' : 'row'
                  }}>
                    <span style={{
                      background: isAgent ? C.blueLight : C.greenLight,
                      color: isAgent ? C.blue : C.green,
                      padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800
                    }}>
                      {isAgent ? '👤 AGENT' : '🗣️ CUSTOMER'}
                    </span>
                    <span>{turn.speaker}</span>
                  </div>

                  <div style={{
                    background: isAgent ? C.blue : '#ffffff',
                    color: isAgent ? '#ffffff' : C.dark,
                    padding: '12px 16px',
                    borderRadius: isAgent ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: isAgent ? 'none' : `1px solid ${C.border}`,
                    fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap'
                  }}>
                    {turn.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
