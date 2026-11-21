import React, { useState } from 'react';
import MiniNavbar from './MiniNavbar';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import IntegrationsSection from './IntegrationsSection';
import PricingSection from './PricingSection';
import Footer from './Footer';
import { brand, fonts, hub, ink, surface, text } from './theme';

export default function Landing() {
  // The marketing shell (mini bar, navbar, hero) runs on its own token set that
  // the accessibility toggle can swap without touching component code.
  const [highContrast, setHighContrast] = useState(false);

  // The booking form lives in the hero band — every CTA scrolls straight to it.
  const openBooking = () => {
    const target = document.getElementById('book-demo');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="nk-landing-root" data-contrast={highContrast ? 'high' : 'normal'}>
      {/* Global base styles, typography & focus treatment for the public landing page */}
      <style>{`
        /* Inter drives the product UI, Source Serif 4 the marketing headlines. */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap');

        html { scroll-behavior: smooth; }

        .nk-landing-root {
          /* Marketing shell tokens (mini navbar / navbar / hero) */
          --hs-navy: ${hub.navy};
          --hs-navy-soft: ${hub.navySoft};
          --hs-muted: ${hub.muted};
          --hs-line: ${hub.line};
          --hs-line-strong: ${hub.lineStrong};
          --hs-canvas: ${hub.canvas};
          --hs-hero-tint: ${hub.heroTint};
          --hs-orange: ${hub.orange};
          --hs-orange-hover: ${hub.orangeHover};
          --hs-orange-active: ${hub.orangeActive};
          --hs-orange-soft: ${hub.orangeSoft};
          --hs-pink-soft: ${hub.pinkSoft};
          --hs-pink-text: ${hub.pinkText};
          --hs-forest: ${hub.forest};
          --hs-forest-text: ${hub.forestText};
          --hs-craft-yellow: ${hub.craftYellow};
          --hs-craft-red: ${hub.craftRed};
          --hs-ui: ${fonts.sans};
          --hs-serif: ${fonts.serif};

          min-height: 100vh;
          width: 100%;
          margin: 0;
          padding: 0;
          background-color: ${surface.page};
          color: ${text.primary};
          font-family: ${fonts.sans};
          font-feature-settings: 'cv02', 'cv03', 'cv04', 'ss01';
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* High Contrast (accessibility) — strengthen type, borders and remove tints. */
        .nk-landing-root[data-contrast='high'] {
          --hs-navy: #000000;
          --hs-navy-soft: #0B1B26;
          --hs-muted: #1F3346;
          --hs-line: #33475B;
          --hs-line-strong: #213343;
          --hs-canvas: #FFFFFF;
          --hs-hero-tint: #FFFFFF;
          --hs-forest: #000000;
          --hs-forest-text: #FFFFFF;
          --hs-pink-text: #7A0033;
        }

        .nk-landing-root *,
        .nk-landing-root *::before,
        .nk-landing-root *::after {
          box-sizing: border-box;
        }

        .nk-landing-root ::selection {
          background: ${brand.tintStrong};
          color: ${ink[950]};
        }

        .nk-landing-root :focus-visible {
          outline: 2px solid ${hub.orange};
          outline-offset: 3px;
          border-radius: 6px;
        }

        .nk-landing-root button {
          font-family: ${fonts.sans};
        }

        /* Keep anchored sections clear of the fixed navbar */
        .nk-landing-root section[id],
        .nk-landing-root #contact {
          scroll-margin-top: 96px;
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
        }
      `}</style>

      <MiniNavbar
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast((value) => !value)}
        onContactSales={openBooking}
      />

      {/* Main navigation + hero share the marketing shell design */}
      <Navbar onBookDemo={openBooking} />

      <HeroSection onBookDemo={openBooking} />

      <FeaturesSection onBookDemo={openBooking} />
      <IntegrationsSection />
      <PricingSection />
      <Footer />
    </div>
  );
}