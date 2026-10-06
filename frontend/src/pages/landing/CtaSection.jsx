import React from 'react';
import { useNavigate } from 'react-router-dom';

export const CtaSection = () => {
  const navigate = useNavigate();

  return (
    <section className="lp-cta-section" style={{ padding: '70px 24px', textAlign: 'center', backgroundImage: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 55%, #ff9d5c 100%)', color: '#fff' }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 14 }}>Ready to streamline your telecom sales?</h2>
      <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 26, fontSize: 14 }}>Log in and start managing leads, calls and campaigns from one place.</p>
      <button onClick={() => navigate('/login')} style={{ background: '#fff', color: '#e8672a', border: 'none', padding: '14px 34px', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
        Login to AOTMS
      </button>
    </section>
  );
};

export default CtaSection;
