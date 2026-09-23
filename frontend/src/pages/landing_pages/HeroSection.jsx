// src/pages/landing_pages/HeroSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Play, Video, MessageSquare, Globe, Coffee } from 'lucide-react';
import GradientWaves from './GradientWaves';
import useBreakpoint from '../../hooks/useBreakpoint';
import TextType from '../../components/TextType';
import crmImage from '../../assets/CRM.png';

const EASE = [0.22, 1, 0.36, 1];

/* ─────────────────────────────────────────────────────────
   ORANGE → PURPLE FULL-SCREEN GRADIENT THEME
   WHITE-MIXED TEXT COLORS for maximum readability
   ───────────────────────────────────────────────────────── */
const C = {
  /* Gradient stops */
  orangeTop:    '#f97316',
  orangeMid:    '#ea580c',
  orangeDeep:   '#c2410c',
  purpleMid:    '#7c3aed',
  purpleBottom: '#4c1d95',

  /* ── Professional Executive Text & Accent Palette ── */
  whitePure:    '#ffffff',                     // 100% pure white — headings
  whiteBright:  'rgba(255, 255, 255, 0.98)',   // 98% — emphasized text
  whiteSoft:    'rgba(255, 255, 255, 0.94)',   // 94% — description & body
  whiteMuted:   'rgba(255, 255, 255, 0.82)',   // 82% — secondary text
  whiteFaint:   'rgba(255, 255, 255, 0.65)',   // 65% — tertiary/labels

  /* Executive Dark Contrast */
  slateDark:    '#0f172a',                     // Crisp deep obsidian for primary button text
  slateDeep:    '#090d16',                     // Executive dark
  champagneGold:'#fef08a',                     // Luminous champagne cursor & gradient

  /* Legacy aliases (kept for compatibility) */
  white:        '#ffffff',
  textSoft:     'rgba(255, 255, 255, 0.94)',
  textMuted:    'rgba(255, 255, 255, 0.82)',

  /* Accents */
  orange:       '#fb923c',
  orangeLt:     '#fdba74',
  orangeGlow:   'rgba(251, 146, 60, 0.55)',

  purple:       '#a855f7',
  purpleLt:     '#c084fc',
  purpleGlow:   'rgba(168, 85, 247, 0.45)',
};

export function HeroSection() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  return (
    <section
      id="home"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        background: `
          linear-gradient(
            180deg,
            #f97316 0%,
            #ea580c 25%,
            #c2410c 45%,
            #7c3aed 70%,
            #4c1d95 100%
          )
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: isMobile ? 90 : 110,
        paddingBottom: isMobile ? 60 : 80,
        paddingLeft: isMobile ? 16 : 32,
        paddingRight: isMobile ? 16 : 32,
        boxSizing: 'border-box',
      }}
    >
      {/* ══════════════════════════════════════════════
          SUBTLE GRID OVERLAY
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.07,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.6) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* ══════════════════════════════════════════════
          DECORATIVE ICONS — pure white
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.16,
        }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '26%', right: '18%', color: C.whitePure }}
        >
          <Video size={isMobile ? 40 : 64} strokeWidth={1.2} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{ position: 'absolute', top: '42%', right: '26%', color: C.whitePure }}
        >
          <MessageSquare size={isMobile ? 36 : 58} strokeWidth={1.2} />
        </motion.div>

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', top: '58%', right: '20%', color: C.whitePure }}
        >
          <Globe size={isMobile ? 42 : 68} strokeWidth={1.2} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{ position: 'absolute', top: '62%', right: '32%', color: C.whitePure }}
        >
          <Coffee size={isMobile ? 34 : 54} strokeWidth={1.2} />
        </motion.div>

        {/* Small dot indicator — pure white */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '16%',
            left: '6%',
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: `1.5px solid ${C.whitePure}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: C.whitePure,
            }}
          />
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════
          TONED-DOWN ANIMATED WAVES
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.32,
          mixBlendMode: 'overlay',
        }}
      >
        <GradientWaves
          horizonColor="#4c1d95"
          waveColor="#7c3aed"
          crestColor="#fdba74"
          speed={0.3}
          amplitude={2.4}
          waveScale={0.6}
          waveRatio={0.9}
          swell={32}
          turbulence={18}
          tilt={1.11}
          zoom={1}
          height={5.5}
          fogDepth={14}
          detail="medium"
          brightness={1.0}
          opacity={1}
          mouseInteraction
          parallaxStrength={0.5}
          grain
          grainIntensity={0.03}
        />
      </div>

      {/* ══════════════════════════════════════════════
          HERO CONTENT
          ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 1.1, ease: EASE }}
        style={{
          position: 'relative',
          zIndex: 20,
          width: '100%',
          maxWidth: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* ══════════════════════════════════════════════
            BADGE — Executive glass pill
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: EASE }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '5px 16px 5px 6px',
            borderRadius: 9999,
            background: 'rgba(255, 255, 255, 0.16)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            marginBottom: isMobile ? 20 : 26,
          }}
        >
          {/* "What's New" pill — executive deep slate text on pure white */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 11px',
              borderRadius: 9999,
              background: C.whitePure,
              color: C.slateDark,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            }}
          >
            What's New
          </span>

          {/* Badge description — pure luminous white text */}
          <span
            style={{
              color: C.whitePure,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            AI-Powered CRM Platform
          </span>

          <span style={{ fontSize: 13, filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))' }}>✨</span>
        </motion.div>

        {/* ══════════════════════════════════════════════
            HEADING — pure white for max contrast
            ══════════════════════════════════════════════ */}
        <motion.h1
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65, duration: 1.0, ease: EASE }}
          style={{
            fontSize: isMobile
              ? 'clamp(30px, 8vw, 42px)'
              : 'clamp(44px, 4.8vw, 66px)',
            fontWeight: 850,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            margin: 0,
            marginBottom: isMobile ? 18 : 24,
            fontFamily:
              '"Bricolage Grotesque", "Plus Jakarta Sans", "Inter", system-ui, sans-serif',
            color: C.whitePure,
            minHeight: isMobile ? '2.4em' : '2.3em',
            textShadow: '0 4px 28px rgba(0, 0, 0, 0.28), 0 1px 3px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Line 1 — PURE CRISP WHITE */}
          <span
            style={{
              display: 'block',
              color: C.whitePure,
              whiteSpace: isMobile ? 'normal' : 'nowrap',
              textShadow: '0 4px 30px rgba(0, 0, 0, 0.25)',
            }}
          >
            Manage Your CRM Pipeline
          </span>

          {/* Line 2 — typing with radiant champagne gold to diamond-white */}
          <span
            style={{
              display: 'block',
              minHeight: '1.15em',
              whiteSpace: isMobile ? 'normal' : 'nowrap',
              marginTop: 4,
            }}
          >
            <TextType
              as="span"
              text={[
                'Track Every Lead.',
                'Close Deals Faster.',
                'Automate Follow-ups.',
                'Grow Revenue 3x.',
              ]}
              typingSpeed={55}
              deletingSpeed={30}
              pauseDuration={1800}
              initialDelay={900}
              loop
              showCursor
              cursorCharacter="|"
              cursorClassName="hero-cursor"
              className="hero-typing-line"
            />
          </span>
        </motion.h1>

        {/* ══════════════════════════════════════════════
            DESCRIPTION — bright high-contrast white
            ══════════════════════════════════════════════ */}
        <motion.p
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.95, ease: EASE }}
          style={{
            color: C.whiteSoft,
            fontSize: isMobile ? 14 : 'clamp(15px, 1.1vw, 17.5px)',
            lineHeight: 1.7,
            maxWidth: 640,
            margin: 0,
            marginBottom: isMobile ? 30 : 38,
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
            fontWeight: 450,
            letterSpacing: '-0.01em',
            textShadow: '0 2px 14px rgba(0, 0, 0, 0.22)',
          }}
        >
          The unified CRM for telecom & enterprise sales teams — pipeline, live leads,
          follow-ups, and analytics, all in one intelligent workspace.
        </motion.p>

        {/* ══════════════════════════════════════════════
            BUTTONS — executive contrast
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.95, ease: EASE }}
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 14,
            width: '100%',
            maxWidth: isMobile ? 320 : 'none',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* PRIMARY — solid WHITE pill with EXECUTIVE OBSIDIAN text */}
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{
              y: -3,
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.8)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '13px 18px 13px 28px',
              borderRadius: 9999,
              border: 'none',
              background: C.whitePure,
              color: C.slateDark,
              fontWeight: 750,
              fontSize: isMobile ? 14 : 15,
              cursor: 'pointer',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              letterSpacing: '-0.01em',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            Get Started Free
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.slateDark}, #1e293b)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.whitePure,
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.4)',
              }}
            >
              <ArrowUpRight size={16} strokeWidth={2.6} />
            </span>
          </motion.button>

          {/* SECONDARY — frosted glass pill with PURE WHITE text */}
          <motion.button
            onClick={() => navigate('/demo')}
            whileHover={{
              y: -3,
              background: 'rgba(255, 255, 255, 0.22)',
              borderColor: 'rgba(255, 255, 255, 0.75)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '13px 26px 13px 18px',
              borderRadius: 9999,
              border: '1.5px solid rgba(255, 255, 255, 0.45)',
              background: 'rgba(255, 255, 255, 0.12)',
              color: C.whitePure,
              fontWeight: 700,
              fontSize: isMobile ? 14 : 15,
              cursor: 'pointer',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              letterSpacing: '-0.01em',
              fontFamily: '"Inter", system-ui, sans-serif',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.22)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.whitePure,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Play size={13} fill={C.whitePure} strokeWidth={0} />
            </span>
            Watch Demo
          </motion.button>
        </motion.div>

        {/* ══════════════════════════════════════════════
            TRUST / SOCIAL PROOF MICRO-BAR
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.18, duration: 0.8 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: isMobile ? 12 : 24,
            marginTop: 22,
            color: 'rgba(255, 255, 255, 0.78)',
            fontSize: isMobile ? 12 : 13,
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#34d399',
                display: 'inline-block',
                boxShadow: '0 0 10px #34d399',
              }}
            />
            Enterprise Grade
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>No credit card required</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>99.9% Pipeline Uptime</span>
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════
          FLOATING CRM DASHBOARD PREVIEW
          ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.3, duration: 1.4, ease: EASE }}
        style={{
          position: 'relative',
          zIndex: 15,
          width: '100%',
          maxWidth: 1080,
          marginTop: isMobile ? 44 : 64,
          boxSizing: 'border-box',
          perspective: 1200,
        }}
      >
        <motion.div
          initial={{ rotateX: 10, y: 20 }}
          animate={{ rotateX: 0, y: 0 }}
          transition={{ delay: 1.4, duration: 1.6, ease: EASE }}
          style={{
            borderRadius: isMobile ? 16 : 24,
            overflow: 'hidden',
            boxShadow: `
              0 40px 100px rgba(0, 0, 0, 0.50),
              0 0 0 1px rgba(255, 255, 255, 0.22)
            `,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            background: 'transparent',
          }}
        >
          <img
            src={crmImage}
            alt="CRM Dashboard Preview"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
            }}
          />
        </motion.div>

        {/* Soft purple glow behind dashboard */}
        <div
          style={{
            position: 'absolute',
            inset: '15% 5% -10% 5%',
            background: `
              radial-gradient(
                ellipse at 50% 100%,
                rgba(124, 58, 237, 0.45) 0%,
                transparent 65%
              )
            `,
            filter: 'blur(70px)',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        />
      </motion.div>

      {/* ══════════════════════════════════════════════
          TYPING CURSOR & TEXT GRADIENT — Executive Sheen
          ══════════════════════════════════════════════ */}
      <style>{`
        .hero-typing-line {
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #fff7ed 25%,
            #fef08a 60%,
            #ffffff 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          font-weight: 850;
          letter-spacing: -0.03em;
          filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.30));
        }
        .hero-cursor {
          color: #fef08a !important;
          font-weight: 300;
          -webkit-text-fill-color: #fef08a !important;
          filter: drop-shadow(0 0 8px rgba(254, 240, 138, 0.85));
        }
      `}</style>
    </section>
  );
}

export default HeroSection;