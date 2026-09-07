import React from 'react';

const INTEGRATIONS = [
  { n: 'Facebook', c: '#1877F2' }, { n: 'JustDial', c: '#E87722' }, { n: 'WhatsApp', c: '#25D366' },
  { n: '99acres', c: '#E01E1E' }, { n: 'CallerDesk', c: '#FF5722' }, { n: 'Knowlarity', c: '#6C3483' }, { n: 'Maqsam', c: '#C0392B' },
];

export const IntegrationsSection = () => {
  return (
    <section id="integrations" style={{ padding: '70px 24px', background: 'var(--theme-surface-faint)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>Connects with the platforms you already use</h2>
        <p style={{ color: '#64748b', fontSize: 15, marginBottom: 40 }}>Real, native API integrations — not just webhook stubs.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
          {INTEGRATIONS.map((it) => (
            <div key={it.n} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 18px', fontWeight: 600, fontSize: 13.5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: it.c }} />
              {it.n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
