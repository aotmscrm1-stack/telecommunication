import React from 'react';
import { useNavigate } from 'react-router-dom';

export const HeroSection = ({ scrollTo }) => {
  const navigate = useNavigate();

  return (
    <section className="lp-hero-section" style={{ background: 'var(--btn-gradient)', backgroundImage: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 55%, #ff9d5c 100%)', padding: '90px 24px 100px', textAlign: 'center', color: '#fff' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div className="lp-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 600, marginBottom: 22 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86efac' }} />
          All-in-one Telecom Sales CRM
        </div>
        <h1 className="lp-hero-title" style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 18 }}>
          Manage Leads, Calls & Campaigns <br /> with <span style={{ background: 'linear-gradient(90deg, #fff 0%, #ffe8d6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AOTMS CRM</span>
        </h1>
        <p className="lp-hero-sub" style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 34 }}>
          One dashboard for leads, dialer, call recordings, WhatsApp, automations and real integrations with the tools your telecom sales team already uses.
        </p>
        <div className="lp-cta-buttons" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/login')} style={{ background: '#fff', color: '#e8672a', border: 'none', padding: '14px 30px', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Get Started
          </button>
          <button onClick={() => scrollTo('pricing')} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '14px 30px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            View Pricing
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
