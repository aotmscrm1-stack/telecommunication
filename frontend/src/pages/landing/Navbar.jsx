import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animate } from 'animejs';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import aotmsLogo from '../../assets/aotms-global-logo.png';
import {
  border,
  brand,
  fonts,
  gradients,
  layout,
  radii,
  shadows,
  surface,
  text,
  transitions,
} from './theme';

const EASE = transitions.ease;

/* ═══════════════════════════════════════════════════════════
   NAVIGATION ITEMS (single-page smooth scroll)
   ═══════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { label: 'Home', id: 'home' },
  { label: 'About', id: 'about' },
  { label: 'Services', id: 'services' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'Contact', id: 'contact' },
];

export function Navbar({ onBookDemo }) {
  const logoRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Over the dark hero the bar is glass-on-ink; once scrolled it becomes a light surface.
  const onDark = !isScrolled;

  // Track scroll position to update navbar style & highlight active section
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);

      const scrollPosition = window.scrollY + 220;
      const sectionIds = NAV_ITEMS.map((item) => item.id);

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          if (scrollPosition >= el.offsetTop) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileOpen(false);
  };

  /* ── Derived surface tokens ─────────────────────────── */
  const pillBg = onDark ? 'rgba(255, 255, 255, 0.07)' : surface.subtle;
  const pillBorder = onDark ? 'rgba(255, 255, 255, 0.16)' : border.base;
  const pillShadow = onDark ? 'none' : shadows.xs;

  const itemIdle = onDark ? 'rgba(255, 255, 255, 0.74)' : text.tertiary;
  const itemActive = onDark ? '#FFFFFF' : brand.hover;
  const itemHoverBg = onDark ? 'rgba(255, 255, 255, 0.10)' : brand.tint;
  const itemHoverBorder = onDark ? 'rgba(255, 255, 255, 0.26)' : brand.line;

  const activeBg = onDark ? 'rgba(255, 255, 255, 0.14)' : brand.tintStrong;
  const activeBorder = onDark ? 'rgba(255, 255, 255, 0.30)' : brand.line;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: isScrolled ? 'rgba(255, 255, 255, 0.92)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(18px) saturate(160%)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(18px) saturate(160%)' : 'none',
        borderBottom: isScrolled
          ? `1px solid ${border.hairline}`
          : '1px solid transparent',
        boxShadow: isScrolled ? shadows.sm : 'none',
        padding: isScrolled
          ? `12px ${layout.gutter}`
          : `20px ${layout.gutter}`,
        display: 'flex',
        justifyContent: 'center',
        transition:
          'background-color 0.35s ease, padding 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* BRAND LOGO — always on a light chip so the mark stays legible on both surfaces */}
        <motion.div
          ref={logoRef}
          onClick={() => handleNavClick('home')}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.28, ease: EASE }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            background: '#FFFFFF',
            borderRadius: radii.md,
            padding: isScrolled ? '6px 10px' : '7px 12px',
            border: `1px solid ${isScrolled ? 'transparent' : 'rgba(255, 255, 255, 0.9)'}`,
            boxShadow: isScrolled ? 'none' : shadows.sm,
            transition: 'box-shadow .3s ease, padding .3s ease, border-color .3s ease',
          }}
          onMouseEnter={(e) => {
            if (logoRef.current) {
              try {
                animate(logoRef.current, {
                  scale: [1, 1.05, 1.02],
                  duration: 600,
                  ease: 'easeOutElastic(1, .5)',
                });
              } catch (err) {
                /* no-op: animation is decorative */
              }
            }
            e.currentTarget.style.boxShadow = shadows.brand;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = isScrolled ? 'none' : shadows.sm;
          }}
        >
          <img
            src={aotmsLogo}
            alt="AOTMS"
            style={{
              height: 33,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </motion.div>

        {/* CENTER NAV PILL */}
        <div
          className="hidden lg:flex"
          style={{
            alignItems: 'center',
            background: pillBg,
            border: `1px solid ${pillBorder}`,
            borderRadius: radii.pill,
            padding: 5,
            boxShadow: pillShadow,
            backdropFilter: onDark ? 'blur(18px) saturate(150%)' : 'none',
            WebkitBackdropFilter: onDark ? 'blur(18px) saturate(150%)' : 'none',
            gap: 2,
            transition: 'background .3s ease, border-color .3s ease, box-shadow .3s ease',
            position: 'relative',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const isHovered = hoveredId === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.22, ease: EASE }}
                style={{
                  position: 'relative',
                  border: `1.5px solid ${isHovered && !isActive ? itemHoverBorder : 'transparent'}`,
                  background: isHovered && !isActive ? itemHoverBg : 'transparent',
                  cursor: 'pointer',
                  padding: '8px 20px',
                  fontSize: 13.5,
                  fontWeight: isActive || isHovered ? 650 : 500,
                  letterSpacing: '-0.005em',
                  color: isHovered || isActive ? itemActive : itemIdle,
                  borderRadius: radii.pill,
                  transition: 'all .25s ease',
                  fontFamily: fonts.sans,
                  zIndex: 1,
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill-active"
                    transition={{ duration: 0.35, ease: EASE }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: radii.pill,
                      background: activeBg,
                      border: `1px solid ${activeBorder}`,
                      zIndex: -1,
                    }}
                  />
                )}
                {item.label}
              </motion.button>
            );
          })}
        </div>

        {/* RIGHT: CTA + mobile toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <motion.button
            whileHover={{ scale: 1.03, y: -2, boxShadow: shadows.brandLg }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.28, ease: EASE }}
            onClick={() => onBookDemo?.()}
            className="hidden sm:inline-flex"
            style={{
              alignItems: 'center',
              gap: 7,
              padding: '10px 20px',
              borderRadius: radii.pill,
              border: '1px solid rgba(255, 255, 255, 0.18)',
              background: gradients.brand,
              color: '#FFFFFF',
              fontSize: 13.5,
              fontWeight: 650,
              letterSpacing: '-0.005em',
              cursor: 'pointer',
              boxShadow: shadows.brand,
              fontFamily: fonts.sans,
            }}
          >
            Book Free Demo
            <ArrowUpRight size={15} strokeWidth={2.6} />
          </motion.button>

          <motion.button
            onClick={() => setMobileOpen((o) => !o)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="lg:hidden"
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.pill,
              border: `1px solid ${pillBorder}`,
              background: pillBg,
              backdropFilter: onDark ? 'blur(18px)' : 'none',
              WebkitBackdropFilter: onDark ? 'blur(18px)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: itemActive,
              boxShadow: pillShadow,
              transition: 'background .3s ease, border-color .3s ease',
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="lg:hidden"
            style={{
              position: 'absolute',
              top: '100%',
              left: layout.gutter,
              right: layout.gutter,
              overflow: 'hidden',
              background: '#FFFFFF',
              border: `1px solid ${border.hairline}`,
              borderRadius: radii.lg,
              marginTop: 8,
              boxShadow: shadows.lg,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    style={{
                      padding: '13px 16px',
                      borderRadius: radii.sm,
                      background: isActive ? brand.tint : 'transparent',
                      border: `1px solid ${isActive ? brand.line : 'transparent'}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14.5,
                      fontWeight: isActive ? 650 : 500,
                      color: isActive ? brand.hover : text.secondary,
                      transition: 'all .25s ease',
                      fontFamily: fonts.sans,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}

              <motion.button
                onClick={() => {
                  setMobileOpen(false);
                  onBookDemo?.();
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 20px',
                  borderRadius: radii.sm,
                  border: 'none',
                  background: gradients.brand,
                  color: '#FFFFFF',
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: shadows.brand,
                  fontFamily: fonts.sans,
                }}
              >
                Book Free Demo
                <ArrowUpRight size={16} strokeWidth={2.6} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export default Navbar;
