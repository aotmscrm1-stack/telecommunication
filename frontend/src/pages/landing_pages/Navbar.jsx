import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import aotmsLogo from '../../assets/aotms-global-logo.png';

const EASE = [0.22, 1, 0.36, 1];

/* ─────────────────────────────────────────────────────────
   Each link has its own hover theme
   ───────────────────────────────────────────────────────── */
const NAV_LINKS = [
  {
    label: 'Home',
    path: '/',
    hoverBg: 'linear-gradient(135deg, #bef264, #a3e635)',  // GreenYellow
    hoverText: '#1a3a00',
  },
  {
    label: 'About',
    path: '/about',
    hoverBg: 'linear-gradient(135deg, #c7e4ff, #7db8f5)',  // blue
    hoverText: '#0a2a5c',
  },
  {
    label: 'Services',
    path: '/services',
    hoverBg: 'linear-gradient(135deg, #ffd9b8, #ffa860)',  // orange
    hoverText: '#4a2100',
  },
  {
    label: 'Pricing',
    path: '/pricing',
    hoverBg: 'linear-gradient(135deg, #ddc7ff, #a97df5)',  // purple
    hoverText: '#2a0a5c',
  },
  {
    label: 'Contact',
    path: '/contact',
    hoverBg: 'linear-gradient(135deg, #ffc7e0, #f57db8)',  // pink
    hoverText: '#4a0030',
  },
];

/* ─────────────────────────────────────────────────────────
   THEME — white container, per-link hover colors
   ───────────────────────────────────────────────────────── */
const C = {
  // Container — White color plan with GreenYellow edge
  pillBg: '#ffffff',
  pillBorder: '#adff2f', // GreenYellow edge
  pillShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 18px rgba(173, 255, 47, 0.40)',

  // Idle link
  idleText: '#64748b',
  activeText: '#0f172a',

  // Active indicator — subtle GreenYellow tint
  activeBg: 'rgba(173, 255, 47, 0.22)',

  // Brand
  brandText: '#ffffff',
  brandMark1: '#adff2f',
  brandMark2: '#84cc16',
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
              boxShadow: '0 12px 28px rgba(184, 220, 106, 0.5)',
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
              color: '#1a3a00',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(184, 220, 106, 0.4)',
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
                      border: 'none',
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
                  color: '#1a3a00',
                  fontSize: 14.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(184, 220, 106, 0.4)',
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