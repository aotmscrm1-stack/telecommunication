import React, { useState } from 'react';
import MiniNavbar from './MiniNavbar';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import IntegrationsSection from './IntegrationsSection';
import PricingSection from './PricingSection';
import FaqSection from './FaqSection';
import Footer from './Footer';
import { fonts, hub } from './theme';

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
          /* Landing-page tokens — one palette for every section. */
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
          --hs-orange-tint: ${hub.orangeTint};
          --hs-orange-line: ${hub.orangeLine};
          --hs-orange-mark: ${hub.orangeMark};
          --hs-pink-soft: ${hub.pinkSoft};
          --hs-pink-text: ${hub.pinkText};
          --hs-forest: ${hub.forest};
          --hs-forest-soft: ${hub.forestSoft};
          --hs-forest-text: ${hub.forestText};
          --hs-forest-deep: ${hub.forestDeep};
          --hs-forest-band: ${hub.forestGradient};
          --hs-white: ${hub.white};
          --hs-craft-yellow: ${hub.craftYellow};
          --hs-craft-red: ${hub.craftRed};
          --hs-ui: ${fonts.sans};
          --hs-serif: ${fonts.serif};

          min-height: 100vh;
          width: 100%;
          margin: 0;
          padding: 0;
          background-color: ${hub.white};
          color: ${hub.navy};
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
          --hs-white: #FFFFFF;
          --hs-orange-soft: #FFFFFF;
          --hs-orange-tint: transparent;
          --hs-orange-line: #33475B;
          /* Marker strokes must vanish, never become a dark band behind dark type. */
          --hs-orange-mark: transparent;
          --hs-pink-soft: #FFFFFF;
          --hs-forest: #000000;
          --hs-forest-soft: #000000;
          --hs-forest-text: #FFFFFF;
          --hs-forest-deep: #000000;
          --hs-forest-band: #000000;
          --hs-pink-text: #7A0033;
        }

        .nk-landing-root *,
        .nk-landing-root *::before,
        .nk-landing-root *::after {
          box-sizing: border-box;
        }

        .nk-landing-root ::selection {
          background: ${hub.orangeSoft};
          color: ${hub.navy};
        }

        .nk-landing-root :focus-visible {
          outline: 2px solid ${hub.orange};
          outline-offset: 3px;
          border-radius: 6px;
        }

        .nk-landing-root button {
          font-family: ${fonts.sans};
        }

        /* Section eyebrow chip — same treatment as the hero label. */
        .nk-landing-root .hs-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          background: var(--hs-white);
          border: 1px solid var(--hs-line-strong);
          border-radius: 4px;
          color: var(--hs-navy);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: .07em;
        }

        .nk-landing-root .hs-eyebrow svg {
          color: var(--hs-orange-active);
        }

        /* Keep anchored sections clear of the fixed mini bar (48px) + navbar (78px) */
        .nk-landing-root section[id],
        .nk-landing-root #features,
        .nk-landing-root #integrations,
        .nk-landing-root #contact {
          scroll-margin-top: 126px;
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
      <FaqSection />
      <Footer onBookDemo={openBooking} />
    </div>
  );
}