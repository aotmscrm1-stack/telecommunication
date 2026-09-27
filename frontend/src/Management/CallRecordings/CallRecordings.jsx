import { useState, useEffect } from 'react';
import { recordingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatISTDateTime } from '../../utils/dateFormat';

const COLOR_PRIMARY = '#0284c7';
const COLOR_DARK = '#0f172a';
const COLOR_BG_LIGHT = '#f8fafc';
const COLOR_BORDER = '#e2e8f0';
const COLOR_ORANGE = '#f97316';

export default function CallRecordings() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'matched', 'unmatched'
  const [error, setError] = useState(null);
  const [rematching, setRematching] = useState(false);
  const [rematchMsg, setRematchMsg] = useState(null);

  const fetchRecordings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Admins/Managers can fetch all, staff fetch their own
      const isAdmin = user?.role === 'admin' || user?.role === 'manager';
      const res = isAdmin ? await recordingsAPI.getAll() : await recordingsAPI.getMy();
      
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
      setRematchMsg(`Rematch completed: ${res.data?.matched || 0} leads newly matched!`);
      fetchRecordings();
    } catch (err) {
      console.error('Rematch error:', err);
      setRematchMsg('Rematch operation failed.');
    } finally {
      setRematching(false);
    }
  };

  const filteredRecordings = recordings.filter(rec => {
    const leadName = rec.lead?.name || '';
    const phone = rec.phone || rec.lead?.phone || '';
    const filename = rec.originalName || '';

    const matchesSearch = 
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      filename.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'matched') return !!rec.lead;
    if (filterType === 'unmatched') return !rec.lead;

    return true;
  });

  const getAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Prepend API base or backend origin if relative
    const backendHost = import.meta.env.VITE_API_URL || 'https://telecommunication-l3oz.onrender.com';
    const baseUrl = backendHost.replace(/\/api\/?$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header section */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: '16px', marginBottom: '24px', background: '#ffffff', padding: '20px 24px',
        borderRadius: '12px', border: `1px solid ${COLOR_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLOR_DARK, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: '#e0f2fe', color: COLOR_PRIMARY, width: '40px', height: '40px',
              borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              🎙️
            </span>
            Call Recordings Hub
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Listen, view, and manage voice call recordings synced from mobile devices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {isAdmin && (
            <button
              onClick={handleRematch}
              disabled={rematching}
              style={{
                background: COLOR_ORANGE, color: '#ffffff', border: 'none', padding: '10px 18px',
                borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: rematching ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', opacity: rematching ? 0.7 : 1
              }}
            >
              🔄 {rematching ? 'Matching...' : 'Auto-Match Leads'}
            </button>
          )}

          <button
            onClick={fetchRecordings}
            style={{
              background: COLOR_PRIMARY, color: '#ffffff', border: 'none', padding: '10px 18px',
              borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            ⚡ Refresh List
          </button>
        </div>
      </div>

      {rematchMsg && (
        <div style={{
          background: '#eff6ff', color: '#1e40af', padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', fontSize: '14px', border: '1px solid #bfdbfe'
        }}>
          {rematchMsg}
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px'
      }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: `1px solid ${COLOR_BORDER}` }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Total Recordings</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: COLOR_DARK, marginTop: '4px' }}>{recordings.length}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: `1px solid ${COLOR_BORDER}` }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Matched with Leads</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
            {recordings.filter(r => !!r.lead).length}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: `1px solid ${COLOR_BORDER}` }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Unmatched Calls</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: COLOR_ORANGE, marginTop: '4px' }}>
            {recordings.filter(r => !r.lead).length}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{
        background: '#fff', padding: '16px 20px', borderRadius: '12px', border: `1px solid ${COLOR_BORDER}`,
        marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <input
          type="text"
          placeholder="🔍 Search by lead name, phone number, or filename..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 300px', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${COLOR_BORDER}`,
            fontSize: '14px', outline: 'none'
          }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: filterType === 'all' ? COLOR_PRIMARY : '#f1f5f9',
              color: filterType === 'all' ? '#ffffff' : '#475569'
            }}
          >
            All Recordings
          </button>
          <button
            onClick={() => setFilterType('matched')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: filterType === 'matched' ? '#16a34a' : '#f1f5f9',
              color: filterType === 'matched' ? '#ffffff' : '#475569'
            }}
          >
            Matched Only
          </button>
          <button
            onClick={() => setFilterType('unmatched')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: filterType === 'unmatched' ? COLOR_ORANGE : '#f1f5f9',
              color: filterType === 'unmatched' ? '#ffffff' : '#475569'
            }}
          >
            Unmatched
          </button>
        </div>
      </div>

      {/* Main List Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: '12px', border: `1px solid ${COLOR_BORDER}` }}>
          <div style={{ fontSize: '16px', color: '#64748b' }}>⏳ Loading synced call recordings...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: `1px solid ${COLOR_BORDER}` }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔇</div>
          <h3 style={{ margin: '0 0 6px 0', color: COLOR_DARK }}>No Call Recordings Found</h3>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            {searchTerm ? 'No recordings match your search filter.' : 'Sync call recordings from your mobile app to see them listed here.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${COLOR_BORDER}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: COLOR_BG_LIGHT, borderBottom: `1px solid ${COLOR_BORDER}`, color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Lead / Contact</th>
                  <th style={{ padding: '14px 16px' }}>Phone Number</th>
                  <th style={{ padding: '14px 16px' }}>Recorded Date & Time</th>
                  <th style={{ padding: '14px 16px' }}>Audio Player</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecordings.map((rec) => {
                  const audioUrl = getAudioUrl(rec.url);
                  return (
                    <tr key={rec._id || rec.id} style={{ borderBottom: `1px solid ${COLOR_BORDER}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        {rec.lead ? (
                          <div style={{ fontWeight: 600, color: COLOR_DARK }}>
                            <span style={{ color: '#16a34a', marginRight: '6px' }}>👤</span>
                            {rec.lead.name || 'Matched Lead'}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            <span style={{ color: COLOR_ORANGE, marginRight: '6px' }}>⚠️</span>
                            Unlinked Contact
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {rec.originalName}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155' }}>
                        {rec.phone ? (
                          <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            📞 {rec.phone}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>N/A</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>
                        {rec.recordedAt ? formatISTDateTime(rec.recordedAt) : `${rec.callDate || ''} ${rec.callTime || ''}`}
                      </td>

                      <td style={{ padding: '14px 16px', minWidth: '320px' }}>
                        {audioUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <audio controls style={{ width: '100%', height: '38px' }} preload="metadata">
                              <source src={audioUrl} type={rec.mimeType || 'audio/mp4'} />
                              <source src={audioUrl} type="audio/mp4" />
                              <source src={audioUrl} type="audio/mpeg" />
                              Your browser does not support the audio player.
                            </audio>
                          </div>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: '12px' }}>No audio URL</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {audioUrl && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <a
                              href={audioUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#f0fdf4', color: '#16a34a', padding: '6px 12px',
                                borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '12px',
                                display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #bbf7d0'
                              }}
                            >
                              ▶️ Open
                            </a>
                            <a
                              href={audioUrl}
                              download={rec.originalName || 'recording.m4a'}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#e0f2fe', color: COLOR_PRIMARY, padding: '6px 12px',
                                borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '12px',
                                display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #bae6fd'
                              }}
                            >
                              ⬇️ Download
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
