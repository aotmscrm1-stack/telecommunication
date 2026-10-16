import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { integrationsAPI } from '../../../services/api';

const LOGO_COLORS = {
  justdial: '#E87722', whatsapp: '#25D366',
  whatsapp_cloud: '#25D366', '99acres': '#E01E1E', callerdesk: '#FF5722',
  housing: '#F26522',
  indiamart: '#E31E25', knowlarity: '#6C3483', magicbricks: '#E74C3C',
  maqsam: '#C0392B',
  sulekha: '#FF6B35', tradeindia: '#0066CC', webhook: 'var(--theme-primary-alt)',
  google_sheets: '#0F9D58',
};

// Official brand logos (high-res vector/SVG and CDN images)
const REAL_BRAND_LOGOS = {
  google_sheets: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg',
  whatsapp: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
  whatsapp_cloud: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
  facebook: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
  justdial: 'https://akam.cdn.jdmagicbox.com/images/icontent/jdlogos/jdlogosvg.svg',
  indiamart: 'https://utils.imimg.com/imhome_gifs/indiamart-logo1.png',
  magicbricks: 'https://img.mbstatic.com/mbimages/rent/static/images/mb-logo.svg',
  '99acres': 'https://static.99acres.com/universalapp/img/favicon.ico',
  housing: 'https://c.housingcdn.com/demand/s/common/assets/favicon.62886f4a.ico',
  callerdesk: 'https://callerdesk.io/wp-content/uploads/2021/08/callerdesk-logo.png',
  knowlarity: 'https://www.knowlarity.com/images/knowlarity-logo.svg',
  maqsam: 'https://maqsam.com/wp-content/uploads/2021/04/maqsam-logo.svg',
};

const LOGO_DOMAINS = {
  justdial: 'justdial.com',
  whatsapp: 'whatsapp.com',
  whatsapp_cloud: 'whatsapp.com',
  '99acres': '99acres.com',
  callerdesk: 'callerdesk.io',
  housing: 'housing.com',
  indiamart: 'indiamart.com',
  knowlarity: 'knowlarity.com',
  magicbricks: 'magicbricks.com',
  maqsam: 'maqsam.com',
  sulekha: 'sulekha.com',
  tradeindia: 'tradeindia.com',
  google_sheets: 'sheets.google.com',
};

const IntegrationLogo = ({ type, name, size = 36 }) => {
  const color = LOGO_COLORS[type] || 'var(--theme-primary-alt)';
  const initials = (name || type || 'IN').slice(0, 2).toUpperCase();
  const directLogo = REAL_BRAND_LOGOS[type];
  const domain = LOGO_DOMAINS[type];
  const sources = [
    ...(directLogo ? [directLogo] : []),
    ...(domain ? [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      `https://logo.clearbit.com/${domain}?size=128`
    ] : [])
  ];
  const [srcIdx, setSrcIdx] = useState(0);

  if (sources.length > 0 && srcIdx < sources.length) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8, background: '#fff',
        border: '1px solid var(--theme-border-tint)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        padding: size * 0.14, boxSizing: 'border-box', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <img
          src={sources[srcIdx]}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setSrcIdx(i => i + 1)}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0
    }}>
      {initials}
    </div>
  );
};

export default function Integrations() {
  const navigate = useNavigate();
  const [data, setData] = useState({ active: [], pending: [], available: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await integrationsAPI.getAll();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const handleActivate = (integration) => {
    // Don't activate immediately — open the setup page (Overview + Configuration)
    // so the user can review and configure it first, same as TeleCRM's flow.
    navigate(`/integrations/setup/${integration.type}`, { state: integration });
  };

  const filteredAvailable = data.available.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner-gradient" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="integrations-shell" style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        @media (max-width: 640px) {
          .integrations-shell { padding: 14px !important; }
          .integrations-shell .int-col-header { display: none !important; }
          .integrations-shell .int-row { border-bottom: 1px solid var(--theme-surface-faint5) !important; padding: 14px 12px !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--theme-text-strongest)' }}>Integrations</h2>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Integration by name"
            style={{
              width: '100%', padding: '8px 14px', border: '1px solid var(--theme-border-tint)',
              borderRadius: 8, fontSize: 14, outline: 'none', background: '#fafafa'
            }}
          />
        </div>
      </div>

      {/* Active Integrations */}
      {data.active.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
            Active Integration ({data.active.length})
          </h3>
          <div style={{ background: '#fff', border: '1px solid var(--theme-border-tint)', borderRadius: 12, overflow: 'hidden' }}>
            <div className="int-col-header" style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px', padding: '10px 20px', borderBottom: '1px solid var(--theme-surface-faint5)', background: 'var(--theme-surface-faint2)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INTEGRATIONS</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STATUS</span>
              <span></span>
            </div>
            {data.active.map((integration, idx) => (
              <div key={integration._id} className="int-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 120px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: idx < data.active.length - 1 ? '1px solid var(--theme-surface-faint5)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IntegrationLogo type={integration.type} name={integration.name} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--theme-text-strongest)' }}>{integration.name}</div>
                    {integration.totalLeadsImported > 0 && (
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{integration.totalLeadsImported} leads imported</div>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#059669', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    Active
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/integrations/${integration._id}`)}
                    style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid var(--theme-primary-alt)', background: '#fff', color: 'var(--theme-primary-alt)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Setup */}
      {data.pending && data.pending.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
            Pending Setup ({data.pending.length})
          </h3>
          <div style={{ background: '#fff', border: '1px solid var(--theme-border-tint)', borderRadius: 12, overflow: 'hidden' }}>
            <div className="int-col-header" style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px', padding: '10px 20px', borderBottom: '1px solid var(--theme-surface-faint5)', background: 'var(--theme-surface-faint2)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INTEGRATIONS</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STATUS</span>
              <span></span>
            </div>
            {data.pending.map((integration, idx) => (
              <div key={integration._id} className="int-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 140px',
                padding: '14px 20px', alignItems: 'center',
                borderBottom: idx < data.pending.length - 1 ? '1px solid var(--theme-surface-faint5)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IntegrationLogo type={integration.type} name={integration.name} />
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--theme-text-strongest)' }}>{integration.name}</div>
                </div>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', color: '#b45309', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                    Pending
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/integrations/${integration._id}`)}
                    style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid var(--theme-primary-alt)', background: '#fff', color: 'var(--theme-primary-alt)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    Continue setup
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Integrations */}
      <section>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
          Available Integration ({filteredAvailable.length})
        </h3>
        <div style={{ background: '#fff', border: '1px solid var(--theme-border-tint)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--theme-surface-faint5)', background: 'var(--theme-surface-faint2)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INTEGRATIONS</span>
          </div>
          {filteredAvailable.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No integrations found</div>
          ) : (
            filteredAvailable.map((integration, idx) => (
              <div key={integration.type} style={{
                display: 'flex', alignItems: 'center', padding: '14px 20px',
                borderBottom: idx < filteredAvailable.length - 1 ? '1px solid var(--theme-surface-faint5)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <IntegrationLogo type={integration.type} name={integration.name} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--theme-text-strongest)' }}>{integration.name}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>{integration.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleActivate(integration)}
                  style={{
                    padding: '6px 18px', borderRadius: 20, border: '1.5px solid var(--theme-primary-alt)',
                    background: '#fff', color: 'var(--theme-primary-alt)', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Activate now
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}