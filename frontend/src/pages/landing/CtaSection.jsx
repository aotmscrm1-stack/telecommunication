import React from 'react';
import { useNavigate } from 'react-router-dom';

export const CtaSection = () => {
  const navigate = useNavigate();

  return (
    <section className="lp-cta-section" style={{ padding: '70px 24px', textAlign: 'center', backgroundImage: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 55%, #ff9d5c 100%)', color: '#fff' }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 14 }}>Ready to streamline your telecom sales?</h2>
      <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 26, fontSize: 14 }}>Log in and start managing leads, calls and campaigns from one place.</p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: '#2563eb',
            color: '#fff',
            padding: '14px 32px',
            borderRadius: 9999,
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            transition: 'background-color 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Login to AOTMS
        </button>
      </div>
    </section>
  );
};

export default CtaSection;
