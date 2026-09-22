// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import aotmsLogo from '../../assets/aotms-global-logo.png';

const EASE = [0.22, 1, 0.36, 1];

/* ─────────────────────────────────────────────────────────
   COLOR PALETTE THEME (Smart Blue / Sapphire / Navy)
   ───────────────────────────────────────────────────────── */
export const BLUE_THEME = {
  smart_blue: {
    DEFAULT: '#0466c8',
    100: '#011428',
    200: '#022950',
    300: '#023d78',
    400: '#0352a0',
    500: '#0466c8',
    600: '#0f85fa',
    700: '#4ba3fb',
    800: '#87c2fd',
    900: '#c3e0fe',
  },
  sapphire: {
    DEFAULT: '#0353a4',
    100: '#011121',
    200: '#012242',
    300: '#023263',
    400: '#034384',
    500: '#0353a4',
    600: '#0576e8',
    700: '#3698fb',
    800: '#79bbfc',
    900: '#bcddfe',
  },
  regal_navy: {
    DEFAULT: '#023e7d',
    100: '#000c19',
    200: '#011932',
    300: '#01254b',
    400: '#023164',
    500: '#023e7d',
    600: '#0363c9',
    700: '#1d89fc',
    800: '#68b0fd',
    900: '#b4d8fe',
  },
  prussian_blue: {
    DEFAULT: '#002855',
    100: '#000811',
    200: '#001023',
    300: '#001834',
    400: '#002045',
    500: '#002855',
    600: '#0050ab',
    700: '#0178ff',
    800: '#56a5ff',
    900: '#aad2ff',
  },
  blue_slate: {
    DEFAULT: '#5c677d',
    100: '#131519',
    200: '#252a32',
    300: '#383f4c',
    400: '#4b5365',
    500: '#5c677d',
    600: '#79859c',
    700: '#9ba3b5',
    800: '#bcc2ce',
    900: '#dee0e6',
  },
};

/* ─────────────────────────────────────────────────────────
   ORANGE HOVER THEME — every link shares the same warm glow
   ───────────────────────────────────────────────────────── */
const ORANGE = {
  DEFAULT:  '#f97316',
  LIGHT:    '#fb923c',
  LIGHTER:  '#fdba74',
  DEEP:     '#ea580c',
  GLOW:     'rgba(249, 115, 22, 0.55)',
  GLOW_SOFT:'rgba(249, 115, 22, 0.30)',
  SURFACE:  'rgba(249, 115, 22, 0.14)',
  TEXT:     '#7c2d12',
};

const NAV_LINKS = [
  { label: 'Home',     path: '/' },
  { label: 'About',    path: '/about' },
  { label: 'Services', path: '/services' },
  { label: 'Pricing',  path: '/pricing' },
  { label: 'Contact',  path: '/contact' },
];

/* ─────────────────────────────────────────────────────────
   THEME TOKENS — White Container with Orange glow on hover
   ───────────────────────────────────────────────────────── */
const C = {
  // Container — pure white
  pillBg: '#ffffff',
  pillBorder: 'rgba(4, 102, 200, 0.12)',
  pillShadow: '0 8px 30px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(4, 102, 200, 0.06)',

  // Idle / Active text
  idleText: BLUE_THEME.blue_slate.DEFAULT,
  activeText: BLUE_THEME.smart_blue[200],

  // Active indicator
  activeBg: 'rgba(4, 102, 200, 0.10)',
  activeBorder: 'rgba(4, 102, 200, 0.22)',

  // Brand / CTA
  brandMark1: BLUE_THEME.smart_blue.DEFAULT,
  brandMark2: BLUE_THEME.sapphire.DEFAULT,
  ctaText: '#ffffff',
};

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activePath = location.pathname;

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
        background: isScrolled ? 'rgba(255, 255, 255, 0.96)' : 'transparent',
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.96)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
        borderBottom: isScrolled
          ? '1px solid rgba(226, 232, 240, 0.85)'
          : '1px solid transparent',
        boxShadow: isScrolled
          ? '0 4px 24px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)'
          : 'none',
        padding: isScrolled
          ? '12px clamp(20px, 5vw, 60px)'
          : '20px clamp(20px, 5vw, 60px)',
        display: 'flex',
        justifyContent: 'center',
        transition: 'background-color 0.35s ease, padding 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* ══════════════════════════════════════════════
            BRAND LOGO — sleek adaptive tile
            ══════════════════════════════════════════════ */}
        <motion.div
          onClick={() => navigate('/')}
          whileHover={{
            scale: 1.03,
            y: -1,
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.28, ease: EASE }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            background: isScrolled ? 'transparent' : '#ffffff',
            borderRadius: 14,
            padding: isScrolled ? '6px 10px' : '8px 14px',
            border: isScrolled ? '1px solid transparent' : `1px solid ${C.pillBorder}`,
            boxShadow: isScrolled
              ? 'none'
              : `0 6px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(4, 102, 200, 0.06)`,
            transition: 'box-shadow .3s ease, background .3s ease, border-color .3s ease, padding .3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `
              0 0 0 2px ${ORANGE.DEFAULT},
              0 0 18px ${ORANGE.GLOW},
              0 8px 24px ${ORANGE.GLOW_SOFT}
            `;
            if (isScrolled) {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = ORANGE.DEFAULT;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = isScrolled
              ? 'none'
              : `0 6px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(4, 102, 200, 0.06)`;
            if (isScrolled) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }
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

        {/* ── Center: Adaptive pill nav ─────────────── */}
        <div
          className="hidden lg:flex"
          style={{
            alignItems: 'center',
            background: isScrolled ? 'rgba(241, 245, 249, 0.85)' : C.pillBg,
            border: isScrolled ? '1px solid rgba(226, 232, 240, 0.95)' : `1px solid ${C.pillBorder}`,
            borderRadius: 9999,
            padding: 5,
            boxShadow: isScrolled ? '0 2px 8px rgba(0, 0, 0, 0.04)' : C.pillShadow,
            gap: 2,
            transition: 'background .3s ease, border-color .3s ease, box-shadow .3s ease',
          }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = activePath === link.path;
            const isHovered = hoveredPath === link.path;

            return (
              <motion.button
                key={link.path}
                onClick={() => navigate(link.path)}
                onMouseEnter={() => setHoveredPath(link.path)}
                onMouseLeave={() => setHoveredPath(null)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.22, ease: EASE }}
                style={{
                  position: 'relative',
                  border: isHovered && !isActive
                    ? `1.5px solid ${ORANGE.DEFAULT}`
                    : '1.5px solid transparent',
                  background: isHovered && !isActive
                    ? 'rgba(249, 115, 22, 0.08)'
                    : 'transparent',
                  cursor: 'pointer',
                  padding: '8px 18px',
                  fontSize: 13.5,
                  fontWeight: isActive || isHovered ? 700 : 500,
                  letterSpacing: '-0.005em',
                  color: isHovered
                    ? BLUE_THEME.smart_blue.DEFAULT
                    : isActive
                      ? C.activeText
                      : isScrolled
                        ? '#334155'
                        : C.idleText,
                  borderRadius: 9999,
                  boxShadow: isHovered && !isActive
                    ? `0 0 14px ${ORANGE.GLOW_SOFT}`
                    : 'none',
                  transition: 'all .25s ease',
                  fontFamily: '"Inter", system-ui, sans-serif',
                  zIndex: 1,
                }}
              >
                {/* Active — subtle blue pill */}
                {isActive && (
                  <motion.span
                    layoutId="nav-pill-active"
                    transition={{ duration: 0.4, ease: EASE }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 9999,
                      background: C.activeBg,
                      border: `1px solid ${C.activeBorder}`,
                      zIndex: -1,
                    }}
                  />
                )}

                {link.label}
              </motion.button>
            );
          })}
        </div>

        {/* ── Right: CTA + Mobile toggle ─────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <motion.button
            whileHover={{
              scale: 1.04,
              y: -2,
              boxShadow: `
                0 0 0 2px ${ORANGE.DEFAULT},
                0 0 20px ${ORANGE.GLOW},
                0 10px 26px ${ORANGE.GLOW_SOFT}
              `,
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.28, ease: EASE }}
            onClick={() => navigate('/get-started')}
            className="hidden sm:inline-flex"
            style={{
              padding: '10px 22px',
              borderRadius: 9999,
              border: 'none',
              background: `linear-gradient(135deg, ${C.brandMark1}, ${C.brandMark2})`,
              color: C.ctaText,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(4, 102, 200, 0.35)',
              fontFamily: '"Inter", system-ui, sans-serif',
              transition: 'box-shadow .3s ease',
            }}
          >
            Get Started
          </motion.button>

          <motion.button
            onClick={() => setMobileOpen((o) => !o)}
            whileHover={{
              scale: 1.08,
              boxShadow: `
                0 0 0 2px ${ORANGE.DEFAULT},
                0 0 18px ${ORANGE.GLOW},
                0 8px 22px ${ORANGE.GLOW_SOFT}
              `,
            }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="lg:hidden"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              border: isScrolled ? '1px solid rgba(226, 232, 240, 0.9)' : `1px solid ${C.pillBorder}`,
              background: isScrolled ? 'rgba(241, 245, 249, 0.85)' : C.pillBg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.activeText,
              boxShadow: isScrolled ? '0 2px 8px rgba(0, 0, 0, 0.04)' : C.pillShadow,
              transition: 'background .3s ease, border-color .3s ease',
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="lg:hidden"
            style={{
              position: 'absolute',
              top: '100%',
              left: 'clamp(20px, 5vw, 60px)',
              right: 'clamp(20px, 5vw, 60px)',
              overflow: 'hidden',
              background: '#ffffff',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: 20,
              marginTop: 8,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
            }}
          >
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV_LINKS.map((link) => {
                const isActive = activePath === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => {
                      navigate(link.path);
                      setMobileOpen(false);
                    }}
                    style={{
                      padding: '13px 18px',
                      borderRadius: 12,
                      background: isActive ? C.activeBg : 'transparent',
                      border: isActive
                        ? `1px solid ${C.activeBorder}`
                        : '1px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? C.activeText : C.idleText,
                      transition: 'all .25s ease',
                      fontFamily: '"Inter", system-ui, sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(249, 115, 22, 0.08)';
                        e.currentTarget.style.color = BLUE_THEME.smart_blue.DEFAULT;
                        e.currentTarget.style.border = `1px solid ${ORANGE.DEFAULT}`;
                        e.currentTarget.style.boxShadow = `
                          0 0 14px ${ORANGE.GLOW_SOFT}
                        `;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = C.idleText;
                        e.currentTarget.style.border = '1px solid transparent';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {link.label}
                  </button>
                );
              })}

              <motion.button
                onClick={() => {
                  navigate('/get-started');
                  setMobileOpen(false);
                }}
                whileHover={{
                  boxShadow: `
                    0 0 0 2px ${ORANGE.DEFAULT},
                    0 0 22px ${ORANGE.GLOW},
                    0 14px 32px ${ORANGE.GLOW_SOFT}
                  `,
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 6,
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: `linear-gradient(135deg, ${C.brandMark1}, ${C.brandMark2})`,
                  color: C.ctaText,
                  fontSize: 14.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(4, 102, 200, 0.35)',
                  fontFamily: '"Inter", system-ui, sans-serif',
                  transition: 'box-shadow .3s ease',
                }}
              >
                Get Started
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export default Navbar;