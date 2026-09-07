import React from 'react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    name: 'Quarterly', price: 899, cycle: 'billed quarterly', highlight: false,
  },
  {
    name: 'Annual', price: 499, cycle: 'billed annually', highlight: true, save: 44,
  },
];

const CORE_FEATURES = [
  'Excel upload & bulk import', '1-click dialer, call recording', 'Follow-ups & tasks',
  'Reports & leaderboard', 'Workflow automations', 'WhatsApp messaging', 'Integrations (Facebook, JustDial, 99acres...)',
  'Role-based access & permission templates',
];

export const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="lp-pricing-section" style={{ padding: '90px 24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 10 }}>Simple, Transparent Pricing</h2>
        <p style={{ color: '#64748b', fontSize: 15 }}>Sales CRM Pricing — pick the plan that fits your team.</p>
      </div>

      <div className="lp-pricing-grid" style={{ border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr' }}>
        <div className="lp-pricing-col" style={{ padding: '32px 28px', background: '#fbfdff' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>Core CRM</h3>
          {CORE_FEATURES.map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13.5, color: '#334155' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              {c}
            </div>
          ))}
        </div>

        {PLANS.map((p) => (
          <div key={p.name} className="lp-pricing-col" style={{
            padding: '32px 20px', textAlign: 'center', position: 'relative',
            background: p.highlight ? 'var(--theme-surface-tint)' : '#fff',
            borderLeft: '1px solid #e2e8f0',
          }}>
            {p.highlight && (
              <div style={{ position: 'absolute', top: 14, right: 14, background: '#fde68a', color: '#92400e', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>
                Save {p.save}%
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-primary-dark)', marginBottom: 10 }}>{p.name}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#0f172a' }}>&#8377;{p.price}</div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 20 }}>/user/mo<br />({p.cycle})</div>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                background: p.highlight ? 'var(--btn-gradient)' : '#fff',
                color: p.highlight ? '#fff' : 'var(--theme-primary-dark)',
                border: p.highlight ? 'none' : '1.5px solid var(--theme-primary)',
              }}
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
