import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Phone, 
  User, 
  Clock, 
  Calendar, 
  FileAudio, 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  Link2, 
  Sparkles, 
  Trash2, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft 
} from 'lucide-react';
import { formatISTDateTime, formatISTDate, formatISTTime } from '../../../../utils/dateFormat';

export default function CallRecordDetailsDrawer({
  recording,
  onClose,
  onLinkSession,
  onDelete,
  onTranscribe,
  transcribing = false,
  canManageCRUD = false,
  audioPlayerComponent
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  if (!recording) return null;

  const handleCopyPhone = () => {
    if (recording.phone) {
      navigator.clipboard.writeText(recording.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleCopyTranscript = () => {
    if (recording.transcript) {
      navigator.clipboard.writeText(recording.transcript);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }
  };

  const isMissed = recording.callStatus === 'missed' || recording.callStatus === 'no_answer' || recording.callStatus === 'failed';
  const durationText = recording.duration 
    ? (recording.duration >= 60 ? `${Math.floor(recording.duration / 60)}m ${recording.duration % 60}s` : `${recording.duration}s`)
    : '0s';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      display: 'flex',
      justifyContent: 'flex-end',
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)'
    }}>
      {/* Background Overlay click to close */}
      <div style={{ flex: 1 }} onClick={onClose} />

      {/* Drawer Container */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1101,
          overflow: 'hidden'
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isMissed ? '#ffedd5' : '#dcfce7',
                color: isMissed ? '#c2410c' : '#15803d'
              }}>
                {recording.callStatus || 'completed'}
              </span>

              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '2px 6px',
                borderRadius: '6px',
                background: '#e0f2fe',
                color: '#0369a1',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                {recording.direction === 'inbound' ? (
                  <><ArrowDownLeft style={{ width: '10px', height: '10px' }} /> Inbound</>
                ) : (
                  <><ArrowUpRight style={{ width: '10px', height: '10px' }} /> Outbound</>
                )}
              </span>
            </div>

            <h3 style={{ margin: '6px 0 0 0', fontSize: '17px', fontWeight: 600, color: '#0f172a' }}>
              {recording.leadName || 'Call Record Details'}
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* ── BODY SCROLLABLE ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Audio Player Card */}
          {recording.url ? (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileAudio style={{ width: '14px', height: '14px', color: '#1a73e8' }} /> Audio Recording
              </div>
              {audioPlayerComponent}
            </div>
          ) : (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              ⚠️ Audio recording file is not available for this session.
            </div>
          )}

          {/* Contact & Phone Section */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>
              Contact Information
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Phone Number:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    {recording.phone || 'No phone recorded'}
                  </span>
                  {recording.phone && (
                    <button
                      onClick={handleCopyPhone}
                      title="Copy phone"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: copiedPhone ? '#16a34a' : '#64748b'
                      }}
                    >
                      {copiedPhone ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Contact / Lead:</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {recording.leadName || 'Unassigned'}
                </span>
              </div>

              {recording.leadId && (
                <div style={{ marginTop: '6px', textAlign: 'right' }}>
                  <a
                    href={`/leads/${recording.leadId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#1a73e8',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Open Lead Profile <ExternalLink style={{ width: '12px', height: '12px' }} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Session Metadata Grid */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>
              Call Information
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Call Date:</span>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', marginTop: '2px' }}>
                  {recording.callDate || formatISTDate(recording.recordedAt)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Call Time:</span>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', marginTop: '2px' }}>
                  {recording.callTime || formatISTTime(recording.recordedAt)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Talk Duration:</span>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', marginTop: '2px' }}>
                  {durationText}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Agent / Caller:</span>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', marginTop: '2px' }}>
                  {recording.userName || 'Unknown Agent'}
                </div>
              </div>
            </div>
          </div>

          {/* Linked Category Section */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                CRM Session Link
              </div>
              {onLinkSession && (
                <button
                  onClick={() => onLinkSession(recording)}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1a73e8',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Link2 style={{ width: '12px', height: '12px' }} />
                  {recording.linkType ? 'Edit Link' : 'Link Session'}
                </button>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#334155' }}>
              {recording.linkType === 'lead' ? (
                <span>Linked to Normal Lead: <span style={{ fontWeight: 600 }}>{recording.leadName}</span></span>
              ) : recording.linkType === 'meta_lead' ? (
                <span>Linked to Meta Lead: <span style={{ fontWeight: 600 }}>{recording.metaLeadName || recording.leadName}</span></span>
              ) : recording.linkType === 'campaign' ? (
                <span>Linked to Campaign: <span style={{ fontWeight: 600 }}>{recording.campaignName || 'Campaign'}</span></span>
              ) : (
                <span style={{ color: '#ea580c', fontWeight: 600 }}>Unlinked session (auto-match available)</span>
              )}
            </div>
          </div>

          {/* Transcript / Call IQ Section */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles style={{ width: '14px', height: '14px', color: '#7c3aed' }} /> AI Speech-to-Text Transcript
              </div>

              {recording.transcript ? (
                <button
                  onClick={handleCopyTranscript}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: copiedTranscript ? '#16a34a' : '#1a73e8',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedTranscript ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
                  {copiedTranscript ? 'Copied' : 'Copy'}
                </button>
              ) : onTranscribe ? (
                <button
                  onClick={() => onTranscribe(recording._id)}
                  disabled={transcribing}
                  style={{
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    color: '#7c3aed',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: transcribing ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles style={{ width: '12px', height: '12px' }} />
                  {transcribing ? 'Transcribing...' : 'Transcribe Audio'}
                </button>
              ) : null}
            </div>

            {recording.transcript ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#334155',
                lineHeight: 1.6,
                maxHeight: '220px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {recording.transcript}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                No speech-to-text transcript generated yet for this recording.
              </div>
            )}
          </div>

          {/* Delete Action (Restricted) */}
          {canManageCRUD && onDelete && (
            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <button
                onClick={() => {
                  if (confirm('Permanently delete this call recording and audio file?')) {
                    onDelete(recording);
                    onClose();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 style={{ width: '14px', height: '14px' }} /> Delete Call Record
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
