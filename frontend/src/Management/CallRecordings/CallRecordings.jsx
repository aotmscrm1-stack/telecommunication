import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AudioLines, Table, LayoutGrid, PhoneCall, FileAudio, 
  Clock, Edit3, MoreVertical, Download, ExternalLink, RefreshCw, User, UserPlus, Sparkles, FileText
} from 'lucide-react';
import { recordingsAPI, leadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatISTDateTime } from '../../utils/dateFormat';

// ── COLOR PALETTE ────────────────────────────────────────────────────────────
const C = {
  blue: '#0284c7',
  blueDark: '#0369a1',
  blueLight: '#e0f2fe',
  blueSoft: 'rgba(2, 132, 199, 0.08)',
  orange: '#f97316',
  orangeDark: '#ea580c',
  orangeLight: '#ffedd5',
  dark: '#0f172a',
  bgSoft: '#f8fafc',
  border: '#e2e8f0',
  textSoft: '#64748b',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  greenBorder: '#bbf7d0',
};

// ── THREE DOTS MENU DROPDOWN ────────────────────────────────────────────────
function ThreeDotsMenu({ audioUrl, originalName }) {
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

  if (!audioUrl) return null;

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
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', padding: '6px', width: '150px',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MODAL: MANUALLY LINK LEAD / CONTACT ─────────────────────────────────────
function ManualLinkLeadModal({ recording, onClose, onLinked }) {
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      try {
        const res = await leadsAPI.getAll({ limit: 100 });
        const list = res.data?.leads || res.data || [];
        setLeads(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load leads for linking:', err);
        setError('Failed to fetch leads list.');
      } finally {
        setLoading(false);
      }
    }
    loadLeads();
  }, []);

  const handleLink = async (leadId) => {
    setLinkingId(leadId || 'unlink');
    setError(null);
    try {
      await recordingsAPI.linkLead(recording._id, leadId || null);
      onLinked();
      onClose();
    } catch (err) {
      console.error('Link lead failed:', err);
      setError(err.response?.data?.error || 'Failed to update lead link.');
    } finally {
      setLinkingId(null);
    }
  };

  const filteredLeads = leads.filter(l => {
    const q = search.toLowerCase();
    return (
      (l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q) ||
      (l.email || '').toLowerCase().includes(q)
    );
  });

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
          boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.25)', width: '100%', maxWidth: '500px',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.bgSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.dark, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus style={{ width: '16px', height: '16px', color: C.blue }} /> Manually Link Lead / Contact
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: C.textSoft }}>
              Recording: <strong>{recording.originalName}</strong> {recording.phone ? `(${recording.phone})` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: C.textSoft }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          <input
            type="text"
            placeholder="🔍 Search lead by name, phone, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.border}`,
              fontSize: '13px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box'
            }}
          />

          {recording.leadId && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '8px', background: C.orangeLight, border: `1px solid ${C.orange}`,
              marginBottom: '14px'
            }}>
              <span style={{ fontSize: '12px', color: C.orangeDark, fontWeight: 600 }}>
                Currently Linked: <strong>{recording.leadName || 'Lead'}</strong>
              </span>
              <button
                onClick={() => handleLink(null)}
                disabled={linkingId === 'unlink'}
                style={{
                  background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px',
                  borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Unlink Lead
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.textSoft, fontSize: '14px' }}>
              ⏳ Loading contacts & leads list...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.textSoft, fontSize: '13px' }}>
              No leads match "{search}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredLeads.map(lead => {
                const isCurrent = recording.leadId === lead._id;
                const isLinkingThis = linkingId === lead._id;
                return (
                  <div
                    key={lead._id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: '8px', border: `1px solid ${isCurrent ? C.blue : C.border}`,
                      background: isCurrent ? C.blueLight : '#ffffff', transition: 'all 0.15s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: C.dark }}>
                        {lead.name}
                      </div>
                      <div style={{ fontSize: '11px', color: C.textSoft, marginTop: '2px' }}>
                        📞 {lead.phone || 'No phone'} {lead.status ? `• Status: ${lead.status}` : ''}
                      </div>
                    </div>

                    <button
                      onClick={() => handleLink(lead._id)}
                      disabled={isCurrent || isLinkingThis}
                      style={{
                        background: isCurrent ? C.green : C.blue,
                        color: '#ffffff', border: 'none', padding: '6px 12px',
                        borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        cursor: (isCurrent || isLinkingThis) ? 'default' : 'pointer',
                        opacity: isLinkingThis ? 0.7 : 1
                      }}
                    >
                      {isCurrent ? '✓ Linked' : isLinkingThis ? 'Linking...' : '+ Select & Link'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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

  const canManageCRUD = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'hr' || user?.role === 'ceo';
  const canViewAllRecordings = canManageCRUD || user?.role === 'manager';

  const handleTranscribe = async (recId) => {
    setTranscribingId(recId);
    try {
      const res = await recordingsAPI.transcribe(recId, true);
      if (res.data?.transcript) {
        setRecordings(prev => prev.map(r => (r._id === recId || r.id === recId) ? { ...r, transcript: res.data.transcript, transcriptStatus: 'done' } : r));
      }
    } catch (err) {
      console.error('Transcription error:', err);
      alert(err.response?.data?.error || 'Failed to transcribe audio with OpenAI Whisper. Please verify OPENAI_API_KEY in backend .env.');
    } finally {
      setTranscribingId(null);
    }
  };

  const fetchRecordings = async () => {
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
    fetchRecordings();
  }, [user]);

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

  const filteredRecordings = recordings.filter(rec => {
    const leadName = rec.leadName || rec.lead?.name || '';
    const phone = rec.phone || rec.leadPhone || rec.lead?.phone || '';
    const filename = rec.originalName || '';

    const matchesSearch =
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      filename.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const hasLead = !!(rec.leadId || rec.lead);
    if (filterType === 'matched') return hasLead;
    if (filterType === 'unmatched') return !hasLead;

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
            Listen, search, and manually assign synced call recordings to CRM leads & contacts.
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
          <div style={{ color: C.textSoft, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matched Leads</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: C.green, marginTop: '2px' }}>
            {recordings.filter(r => !!(r.leadId || r.lead)).length}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '12px', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ color: C.textSoft, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unlinked Calls</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: C.orange, marginTop: '2px' }}>
            {recordings.filter(r => !(r.leadId || r.lead)).length}
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
            const audioUrl = getAudioUrl(rec.url);
            const hasLead = !!(rec.leadId || rec.lead);
            const leadName = rec.leadName || rec.lead?.name;
            const firstLetter = hasLead && leadName ? leadName.charAt(0).toUpperCase() : '?';

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
                  display: 'flex', flexDirection: 'column', gap: '10px'
                }}
              >
                {/* 1. TOP LINE: Lead (Circle Avatar + Name) | Link Lead (Edit Icon) | Three Dots Menu */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  
                  {/* Lead Circle Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: hasLead ? C.blueLight : C.orangeLight,
                      color: hasLead ? C.blue : C.orangeDark,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', border: `1px solid ${hasLead ? C.blue : C.orange}`,
                      flexShrink: 0
                    }}>
                      {firstLetter}
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: C.dark, lineHeight: 1.2 }}>
                        {hasLead ? leadName : 'Unlinked Contact'}
                      </div>
                      <div style={{ fontSize: '10px', color: hasLead ? C.green : C.orange, fontWeight: 600, marginTop: '2px' }}>
                        {hasLead ? '✓ Matched Lead' : '⚠️ Unlinked Call'}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Edit Link Lead & Three Dots Menu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Edit Link Lead Icon (Admin & HR only) */}
                    {canManageCRUD && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveLinkRecording(rec)}
                        title={hasLead ? "Change Lead" : "Link Lead"}
                        style={{
                          background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: '6px',
                          width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: C.blue, transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
                        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                      >
                        <Edit3 style={{ width: '13px', height: '13px' }} />
                      </motion.button>
                    )}

                    {/* Three Dots Menu for Download & Open */}
                    <ThreeDotsMenu audioUrl={audioUrl} originalName={rec.originalName} />
                  </div>
                </div>

                {/* 2. SECOND LINE: Call Record Name */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileAudio style={{ width: '14px', height: '14px', color: C.blue, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.originalName}>
                    {rec.originalName || 'Call Recording'}
                  </span>
                </div>

                {/* 3. THIRD LINE: NEW LINE for Date & Time */}
                <div style={{ fontSize: '11px', color: C.textSoft, display: 'flex', alignItems: 'center', gap: '6px', background: C.bgSoft, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <Clock style={{ width: '12px', height: '12px', color: '#94a3b8', flexShrink: 0 }} />
                  <span>{rec.recordedAt ? formatISTDateTime(rec.recordedAt) : `${rec.callDate || ''} ${rec.callTime || ''}`}</span>
                </div>

                {/* 4. FOURTH LINE: Phone Number with PhoneCall Icon */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.dark, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ background: '#f1f5f9', border: `1px solid ${C.border}`, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace' }}>
                    <PhoneCall style={{ width: '13px', height: '13px', color: C.green }} />
                    <span>{rec.phone || 'No Phone Number'}</span>
                  </div>
                </div>

                {/* 5. FIFTH LINE: Audio Container */}
                <div style={{ background: C.bgSoft, borderRadius: '8px', padding: '6px', border: `1px solid ${C.border}` }}>
                  {audioUrl ? (
                    <audio controls style={{ width: '100%', height: '32px' }} preload="metadata">
                      <source src={audioUrl} type={rec.mimeType || 'audio/mp4'} />
                      <source src={audioUrl} type="audio/mp4" />
                      <source src={audioUrl} type="audio/mpeg" />
                      Your browser does not support audio playback.
                    </audio>
                  ) : (
                    <span style={{ color: '#dc2626', fontSize: '11px' }}>No audio file available</span>
                  )}
                </div>

                {/* 6. SIXTH LINE: AI Whisper Transcription */}
                <div style={{ marginTop: '2px' }}>
                  {rec.transcript ? (
                    <div style={{
                      background: '#f8fafc', padding: '8px 10px', borderRadius: '8px',
                      border: `1px solid ${C.border}`, fontSize: '11px', color: '#334155'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: C.blue, marginBottom: '4px' }}>
                        <Sparkles style={{ width: '12px', height: '12px' }} />
                        <span>AI Whisper Transcript:</span>
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
                  <th style={{ padding: '14px 16px' }}>Lead / Contact</th>
                  <th style={{ padding: '14px 16px' }}>Phone Number</th>
                  <th style={{ padding: '14px 16px' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px' }}>Audio Player</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecordings.map((rec) => {
                  const audioUrl = getAudioUrl(rec.url);
                  const hasLead = !!(rec.leadId || rec.lead);
                  const leadName = rec.leadName || rec.lead?.name;

                  return (
                    <tr key={rec._id || rec.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: C.dark }}>
                          {hasLead ? leadName : 'Unlinked Contact'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {rec.originalName}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        📞 {rec.phone || 'N/A'}
                      </td>

                      <td style={{ padding: '14px 16px', color: C.textSoft, fontSize: '12px' }}>
                        {rec.recordedAt ? formatISTDateTime(rec.recordedAt) : `${rec.callDate || ''} ${rec.callTime || ''}`}
                      </td>

                      <td style={{ padding: '14px 16px', minWidth: '300px' }}>
                        {audioUrl ? (
                          <audio controls style={{ width: '100%', height: '32px' }} preload="metadata">
                            <source src={audioUrl} type={rec.mimeType || 'audio/mp4'} />
                            <source src={audioUrl} type="audio/mp4" />
                            <source src={audioUrl} type="audio/mpeg" />
                          </audio>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: '11px' }}>No audio</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {canManageCRUD && (
                            <button
                              onClick={() => setActiveLinkRecording(rec)}
                              style={{ background: C.blueLight, color: C.blue, border: `1px solid ${C.blue}`, padding: '4px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                            >
                              ✏️ Link Lead
                            </button>
                          )}
                          <ThreeDotsMenu audioUrl={audioUrl} originalName={rec.originalName} />
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

      {/* ── MANUAL LINK LEAD MODAL ── */}
      <AnimatePresence>
        {activeLinkRecording && (
          <ManualLinkLeadModal
            recording={activeLinkRecording}
            onClose={() => setActiveLinkRecording(null)}
            onLinked={fetchRecordings}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
