import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlushButton from '../../components/ui/button';

export const CtaSection = () => {
  const navigate = useNavigate();

  return (
    <section className="lp-cta-section" style={{ padding: '70px 24px', textAlign: 'center', backgroundImage: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 55%, #ff9d5c 100%)', color: '#fff' }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 14 }}>Ready to streamline your telecom sales?</h2>
      <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 26, fontSize: 14 }}>Log in and start managing leads, calls and campaigns from one place.</p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <PlushButton label="Login to AOTMS" onClick={() => navigate('/login')} width={240} height={58} />
      </div>
    </section>
  );
};

export default CtaSection;
