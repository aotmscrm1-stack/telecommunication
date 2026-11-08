import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { integrationsAPI } from '../../../services/api';

const LOGO_COLORS = {
  facebook: '#1877F2', justdial: '#E87722', whatsapp: '#25D366',
  whatsapp_cloud: '#25D366', '99acres': '#E01E1E', callerdesk: '#FF5722',
  google_meet: '#00BCD4', google_sheets: '#ea580c', housing: '#F26522',
  indiamart: '#E31E25', knowlarity: '#6C3483', magicbricks: '#E74C3C',
  maqsam: '#C0392B',
  sulekha: '#FF6B35', tradeindia: '#0066CC', webhook: '#ea580c',
};

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
  facebook: 'facebook.com',
  justdial: 'justdial.com',
  whatsapp: 'whatsapp.com',
  whatsapp_cloud: 'whatsapp.com',
  '99acres': '99acres.com',
  callerdesk: 'callerdesk.io',
  google_meet: 'meet.google.com',
  google_sheets: 'sheets.google.com',
  housing: 'housing.com',
  indiamart: 'indiamart.com',
  knowlarity: 'knowlarity.com',
  magicbricks: 'magicbricks.com',
  maqsam: 'maqsam.com',
  sulekha: 'sulekha.com',
  tradeindia: 'tradeindia.com',
};

const CONFIG_FIELDS = {
  whatsapp_cloud: [
    { key: 'accessToken', label: 'Permanent Access Token', placeholder: 'EAAxxxxxxxx', hint: 'From Meta Business App > WhatsApp > API Setup' },
    { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '123456789', hint: 'From Meta Business App > WhatsApp > API Setup' },
    { key: 'wabaId', label: 'WhatsApp Business Account ID', placeholder: '123456789' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', placeholder: 'your_custom_verify_token', hint: 'Any random string — you set this on Meta side too' },
  ],
  whatsapp: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Enter your WhatsApp API key' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token', placeholder: 'your_verify_token' },
  ],
  knowlarity: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Your Knowlarity x-api-key', hint: 'From Knowlarity Developer Portal' },
    { key: 'accessToken', label: 'Access Token / Authorization', placeholder: 'Bearer xxxxxxxx' },
    { key: 'virtualNumber', label: 'Virtual Number (SR Number)', placeholder: '+918xxxxxxxxx' },
  ],
  callerdesk: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Your CallerDesk API key', hint: 'From CallerDesk Dashboard > API' },
    { key: 'did', label: 'DID / Virtual Number', placeholder: '+918xxxxxxxxx' },
  ],
  maqsam: [
    { key: 'apiKey', label: 'API Key', placeholder: 'Your Maqsam API key' },
    { key: 'apiSecret', label: 'API Secret', placeholder: 'Your Maqsam API secret' },
    { key: 'did', label: 'DID Number', placeholder: '+971xxxxxxxxx' },
  ],
};

const GENERIC_WEBHOOK_TYPES = ['justdial', '99acres', 'housing', 'indiamart', 'magicbricks', 'sulekha', 'tradeindia', 'webhook'];

const s = {
  card: { background: '#fff', border: '1px solid #fed7aa', borderRadius: 12, padding: 24 },
  inp: { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  lbl: { display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
};

const IntegrationLogo = ({ type, name, size = 40 }) => {
  const color = LOGO_COLORS[type] || '#ea580c';
  const initials = (name || type || '??').slice(0, 2).toUpperCase();
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
        width: size, height: size, borderRadius: 10, background: '#fff',
        border: '1px solid #fed7aa', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        padding: size * 0.14, boxSizing: 'border-box', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <img
          src={sources[srcIdx]}
          alt={name || type}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setSrcIdx(i => i + 1)}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0
    }}>
      {initials}
    </div>
  );
};

export default function IntegrationSetup() {
  const { type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [catalogItem, setCatalogItem] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [config, setConfig] = useState({});
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (catalogItem) return;
    (async () => {
      try {
        setLoading(true);
        const res = await integrationsAPI.getCatalog();
        const found = (res.data || []).find(i => i.type === type);
        setCatalogItem(found || { type, name: type, description: '' });
      } catch (err) {
        setCatalogItem({ type, name: type, description: '' });
      } finally {
        setLoading(false);
      }
    })();
  }, [type]);

  const fields = CONFIG_FIELDS[type] || [];
  const isGenericWebhook = GENERIC_WEBHOOK_TYPES.includes(type);

  const handleActivate = async () => {
    setActivating(true);
    setError('');
    try {
      const res = await integrationsAPI.create({ type, name: catalogItem.name, config });
      navigate(`/integrations/${res.data._id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate integration');
    } finally {
      setActivating(false);
    }
  };

  if (loading || !catalogItem) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner-gradient" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="is-shell" style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        @media (max-width: 640px) {
          .is-shell { padding: 14px !important; }
          .is-shell [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          .is-shell div[style*="display: flex"] { flex-wrap: wrap; row-gap: 6px; }
          .is-shell div[style*="display: flex"] > * { min-width: 0; }
        }
      `}</style>
      <button
        onClick={() => navigate('/integrations')}
        style={{ background: 'none', border: 'none', color: '#ea580c', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← Back to Integrations
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IntegrationLogo type={catalogItem.type} name={catalogItem.name} />
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{catalogItem.name}</h2>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{catalogItem.description}</div>
          </div>
        </div>
        <button
          onClick={handleActivate}
          disabled={activating}
          style={{
            padding: '10px 22px', borderRadius: 8, border: 'none', background: '#ea580c',
            color: '#fff', fontWeight: 600, fontSize: 14, cursor: activating ? 'wait' : 'pointer',
            opacity: activating ? 0.7 : 1, whiteSpace: 'nowrap'
          }}
        >
          {activating ? 'Activating...' : 'Activate Integration'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={s.card}>
        <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>Configuration</h4>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
          Click "Activate Integration" above to open and configure {catalogItem.name}.
        </p>

        {fields.length === 0 && !isGenericWebhook && (
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            No initial setup required. Click "Activate Integration" to proceed.
          </p>
        )}

        {isGenericWebhook && (
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Once activated, a unique webhook URL will be generated for {catalogItem.name}.
          </p>
        )}

        {fields.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={s.lbl}>{f.label}</label>
                <input
                  style={s.inp}
                  placeholder={f.placeholder}
                  value={config[f.key] || ''}
                  onChange={e => setConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
                {f.hint && <div style={s.hint}>{f.hint}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
