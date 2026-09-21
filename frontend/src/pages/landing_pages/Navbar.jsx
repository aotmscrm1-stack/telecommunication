import React, { useState } from 'react';
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
  prussian_blue_deep: {
    DEFAULT: '#001845',
    100: '#00050e',
    200: '#000a1d',
    300: '#000f2b',
    400: '#001439',
    500: '#001845',
    600: '#00389f',
    700: '#0056f7',
    800: '#508dff',
    900: '#a7c6ff',
  },
  prussian_blue_dark: {
    DEFAULT: '#001233',
    100: '#00040a',
    200: '#000714',
    300: '#000b1f',
    400: '#000e29',
    500: '#001233',
    600: '#00328f',
    700: '#0052eb',
    800: '#4788ff',
    900: '#a3c3ff',
  },
  twilight_indigo: {
    DEFAULT: '#33415c',
    100: '#0a0d12',
    200: '#141a25',
    300: '#1e2737',
    400: '#29344a',
    500: '#33415c',
    600: '#4d628b',
    700: '#7186b1',
    800: '#a0aecb',
    900: '#d0d7e5',
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
  slate_grey: {
    DEFAULT: '#7d8597',
    100: '#191a1f',
    200: '#31353d',
    300: '#4a4f5c',
    400: '#62697a',
    500: '#7d8597',
    600: '#979dab',
    700: '#b1b6c0',
    800: '#cbced5',
    900: '#e5e7ea',
  },
  lavender_grey: {
    DEFAULT: '#979dac',
    100: '#1d1f24',
    200: '#393d47',
    300: '#565c6b',
    400: '#737a8e',
    500: '#979dac',
    600: '#abb0bc',
    700: '#c0c4cd',
    800: '#d5d7dd',
    900: '#eaebee',
  },
};

/* ─────────────────────────────────────────────────────────
   Each link has its own refined theme from the palette
   ───────────────────────────────────────────────────────── */
const NAV_LINKS = [
  {
    label: 'Home',
    path: '/',
    hoverBg: 'linear-gradient(135deg, #c3e0fe, #87c2fd)', // smart_blue 900 -> 800
    hoverText: '#022950', // smart_blue 200
  },
  {
    label: 'About',
    path: '/about',
    hoverBg: 'linear-gradient(135deg, #bcddfe, #79bbfc)', // sapphire 900 -> 800
    hoverText: '#012242', // sapphire 200
  },
  {
    label: 'Services',
    path: '/services',
    hoverBg: 'linear-gradient(135deg, #b4d8fe, #68b0fd)', // regal_navy 900 -> 800
    hoverText: '#011932', // regal_navy 200
  },
  {
    label: 'Pricing',
    path: '/pricing',
    hoverBg: 'linear-gradient(135deg, #aad2ff, #56a5ff)', // prussian_blue 900 -> 800
    hoverText: '#001023', // prussian_blue 200
  },
  {
    label: 'Contact',
    path: '/contact',
    hoverBg: 'linear-gradient(135deg, #d0d7e5, #a0aecb)', // twilight_indigo 900 -> 800
    hoverText: '#141a25', // twilight_indigo 200
  },
];

/* ─────────────────────────────────────────────────────────
   THEME TOKENS — Crisp White Container with Smart Blue Edge
   ───────────────────────────────────────────────────────── */
const C = {
  // Container — White color plan with Smart Blue edge
  pillBg: '#ffffff',
  pillBorder: BLUE_THEME.smart_blue.DEFAULT, // #0466c8
  pillShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 18px rgba(4, 102, 200, 0.35)',

  // Idle and Active text
  idleText: BLUE_THEME.blue_slate.DEFAULT, // #5c677d
  activeText: BLUE_THEME.smart_blue[200],   // #022950

  // Active indicator — subtle Smart Blue tint & border
  activeBg: 'rgba(4, 102, 200, 0.12)',
  activeBorder: 'rgba(4, 102, 200, 0.22)',

  // Brand / CTA
  brandMark1: BLUE_THEME.smart_blue.DEFAULT, // #0466c8
  brandMark2: BLUE_THEME.sapphire.DEFAULT,   // #0353a4
  ctaText: '#ffffff',
};

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);

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
        background: 'none',
        backgroundColor: 'transparent',
        padding: '20px clamp(20px, 5vw, 60px)',
        display: 'flex',
        justifyContent: 'center',
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
        {/* ── Brand logo ─────────────────────────── */}
        <motion.div
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.25, ease: EASE }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <img
            src={aotmsLogo}
            alt="AOTMS"
            style={{
              height: 38,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </motion.div>

        {/* ── Center: White pill nav ─────────────── */}
        <div
          className="hidden lg:flex"
          style={{
            alignItems: 'center',
            background: C.pillBg,
            border: `1px solid ${C.pillBorder}`,
            borderRadius: 9999,
            padding: 6,
            boxShadow: C.pillShadow,
            gap: 2,
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
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.22, ease: EASE }}
                style={{
                  position: 'relative',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '9px 20px',
                  fontSize: 13.5,
                  fontWeight: isActive || isHovered ? 700 : 500,
                  letterSpacing: '-0.005em',
                  color: isHovered
                    ? link.hoverText
                    : isActive
                      ? C.activeText
                      : C.idleText,
                  borderRadius: 9999,
                  transition: 'color .25s ease',
                  fontFamily: '"Inter", system-ui, sans-serif',
                  zIndex: 1,
                }}
              >
                {/* Active — subtle neutral background */}
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

                {/* Hover — this link's unique color */}
                {!isActive && isHovered && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 9999,
                      background: link.hoverBg,
                      zIndex: -1,
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
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
              y: -1,
              boxShadow: '0 12px 28px rgba(4, 102, 200, 0.45)',
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.25, ease: EASE }}
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
            }}
          >
            Get Started
          </motion.button>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              border: `1px solid ${C.pillBorder}`,
              background: C.pillBg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.activeText,
              boxShadow: C.pillShadow,
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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
              background: C.pillBg,
              border: `1px solid ${C.pillBorder}`,
              borderRadius: 20,
              marginTop: 8,
              boxShadow: C.pillShadow,
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
                      border: isActive ? `1px solid ${C.activeBorder}` : '1px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? C.activeText : C.idleText,
                      transition: 'all .2s ease',
                      fontFamily: '"Inter", system-ui, sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = link.hoverBg;
                        e.currentTarget.style.color = link.hoverText;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = C.idleText;
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