import React from 'react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import IntegrationsSection from './IntegrationsSection';
import PricingSection from './PricingSection';
import CtaSection from './CtaSection';
import Footer from './Footer';

const landingStyles = `
  @media (max-width: 768px) {
    .lp-logo { height: 56px !important; }
    .lp-navlink-text { display: none !important; }
    .lp-header-inner { padding: 8px 16px !important; }
    .lp-hero-section { padding: 56px 20px 64px !important; }
    .lp-hero-title { font-size: 30px !important; }
    .lp-hero-sub { font-size: 14px !important; }
    .lp-features-section, .lp-pricing-section { padding: 56px 16px !important; }
    .lp-pricing-grid { grid-template-columns: 1fr !important; }
    .lp-pricing-col { border-left: none !important; border-top: 1px solid #e2e8f0; }
    .lp-pricing-col:first-child { border-top: none !important; }
    .lp-cta-section { padding: 56px 16px !important; }
  }
  @media (max-width: 480px) {
    .lp-hero-title { font-size: 25px !important; letter-spacing: -0.5px !important; }
    .lp-hero-badge { font-size: 11px !important; padding: 5px 12px !important; }
    .lp-cta-buttons { flex-direction: column !important; width: 100%; }
    .lp-cta-buttons button { width: 100% !important; }
  }
`;

export default function Landing() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#0f172a', background: '#fff', overflowX: 'hidden' }}>
      <style>{landingStyles}</style>
      <Navbar scrollTo={scrollTo} />
      <HeroSection scrollTo={scrollTo} />
      <FeaturesSection />
      <IntegrationsSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
