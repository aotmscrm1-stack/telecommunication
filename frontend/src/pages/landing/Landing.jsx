import React, { useState } from 'react';
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import IntegrationsSection from './IntegrationsSection';
import PricingSection from './PricingSection';
import Footer from './Footer';
import { brand, fonts, ink, surface, text } from './theme';

export default function Landing() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // The booking form lives inline in the hero — every CTA scrolls straight to it.
  const openBooking = () => {
    const target = document.getElementById('book-demo');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="nk-landing-root">
      {/* Global base styles, typography & focus treatment for the public landing page */}
      <style>{`
        /* Body + headings both use Inter — one webfont, no display family. */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        html { scroll-behavior: smooth; }

        .nk-landing-root {
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
          outline: 2px solid ${brand.base};
          outline-offset: 3px;
          border-radius: 6px;
        }

        .nk-landing-root button {
          font-family: ${fonts.sans};
        }

        /* Keep anchored sections clear of the fixed navbar */
        .nk-landing-root section[id],
        .nk-landing-root #contact {
          scroll-margin-top: 84px;
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
        }
      `}</style>

      <Navbar onBookDemo={openBooking} />

      {/* Hero rotates between the CRM pipeline and the AI telecaller story */}
      <HeroSection
        activeSlideIndex={activeSlideIndex}
        setActiveSlideIndex={setActiveSlideIndex}
        onBookDemo={openBooking}
      />

      <FeaturesSection onBookDemo={openBooking} />
      <IntegrationsSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
