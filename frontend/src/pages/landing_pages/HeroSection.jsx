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
   ───────────────────────────────────────────────────────── */
const C = {
  /* Gradient stops */
  orangeTop:    '#f97316',
  orangeMid:    '#ea580c',
  orangeDeep:   '#c2410c',
  purpleMid:    '#7c3aed',
  purpleBottom: '#4c1d95',

  /* Accents */
  white:        '#ffffff',
  textSoft:     'rgba(255, 255, 255, 0.82)',
  textMuted:    'rgba(255, 255, 255, 0.60)',

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
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        /* ══════════════════════════════════════════════
           FULL-SCREEN ORANGE → PURPLE GRADIENT
           (no border, no rounded corners, full bleed)
           ══════════════════════════════════════════════ */
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
          DECORATIVE ICONS
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.14,
        }}
      >
        {/* Video camera */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '26%', right: '18%', color: '#fff' }}
        >
          <Video size={isMobile ? 40 : 64} strokeWidth={1.2} />
        </motion.div>

        {/* Message square */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{ position: 'absolute', top: '42%', right: '26%', color: '#fff' }}
        >
          <MessageSquare size={isMobile ? 36 : 58} strokeWidth={1.2} />
        </motion.div>

        {/* Globe */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', top: '58%', right: '20%', color: '#fff' }}
        >
          <Globe size={isMobile ? 42 : 68} strokeWidth={1.2} />
        </motion.div>

        {/* Coffee cup */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{ position: 'absolute', top: '62%', right: '32%', color: '#fff' }}
        >
          <Coffee size={isMobile ? 34 : 54} strokeWidth={1.2} />
        </motion.div>

        {/* Small dot indicator — top-left */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '16%',
            left: '6%',
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1.5px solid rgba(255, 255, 255, 0.7)',
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
              background: '#ffffff',
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
        {/* Badge — "What's New" */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: EASE }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 16px 6px 6px',
            borderRadius: 9999,
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.30)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            marginBottom: isMobile ? 20 : 26,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: 9999,
              background: '#ffffff',
              color: '#ea580c',
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            What's New
          </span>
          <span
            style={{
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
          >
            AI-Powered CRM Platform
          </span>
          <span style={{ fontSize: 12 }}>✨</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65, duration: 1.0, ease: EASE }}
          style={{
            fontSize: isMobile
              ? 'clamp(28px, 7.5vw, 38px)'
              : 'clamp(42px, 4.6vw, 62px)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.025em',
            margin: 0,
            marginBottom: isMobile ? 18 : 24,
            fontFamily:
              '"Bricolage Grotesque", "Manrope", "Inter", system-ui, sans-serif',
            color: '#ffffff',
            minHeight: isMobile ? '2.4em' : '2.3em',
            textShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
          }}
        >
          <span
            style={{
              display: 'block',
              color: '#ffffff',
              whiteSpace: isMobile ? 'normal' : 'nowrap',
            }}
          >
            Manage Your CRM Pipeline
          </span>

          <span
            style={{
              display: 'block',
              minHeight: '1.15em',
              whiteSpace: isMobile ? 'normal' : 'nowrap',
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

        {/* Description */}
        <motion.p
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.95, ease: EASE }}
          style={{
            color: C.textSoft,
            fontSize: isMobile ? 13.5 : 'clamp(14px, 1.05vw, 16px)',
            lineHeight: 1.6,
            maxWidth: 600,
            margin: 0,
            marginBottom: isMobile ? 30 : 38,
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
            fontWeight: 400,
            letterSpacing: '-0.005em',
          }}
        >
          The unified CRM for telecom & enterprise sales teams — pipeline, live leads,
          follow-ups, and analytics, all in one intelligent workspace.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.95, ease: EASE }}
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
            width: '100%',
            maxWidth: isMobile ? 320 : 'none',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* ═══════════════════════════════════════════
             PRIMARY — SOLID WHITE pill with orange text
             & orange arrow circle (pops hard on gradient)
             ═══════════════════════════════════════════ */}
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{
              y: -3,
              boxShadow: '0 20px 44px rgba(255, 255, 255, 0.40)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '14px 18px 14px 28px',
              borderRadius: 9999,
              border: 'none',
              background: '#ffffff',
              color: '#ea580c',
              fontWeight: 800,
              fontSize: isMobile ? 14 : 14.5,
              cursor: 'pointer',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.20)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              letterSpacing: '-0.005em',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            Get Started Free
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #c2410c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.45)',
              }}
            >
              <ArrowUpRight size={16} strokeWidth={2.6} />
            </span>
          </motion.button>

          {/* ═══════════════════════════════════════════
             SECONDARY — TRANSLUCENT glass pill with
             PURPLE play button
             ═══════════════════════════════════════════ */}
          <motion.button
            onClick={() => navigate('/demo')}
            whileHover={{
              y: -3,
              background: 'rgba(255, 255, 255, 0.22)',
              borderColor: 'rgba(255, 255, 255, 0.75)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '14px 28px 14px 18px',
              borderRadius: 9999,
              border: '1.5px solid rgba(255, 255, 255, 0.55)',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: isMobile ? 14 : 14.5,
              cursor: 'pointer',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              letterSpacing: '-0.005em',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #c084fc, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.5)',
              }}
            >
              <Play size={14} fill="#ffffff" strokeWidth={0} />
            </span>
            Watch Demo
          </motion.button>
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
              0 0 0 1px rgba(255, 255, 255, 0.18)
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
          TYPING CURSOR STYLING
          ══════════════════════════════════════════════ */}
      <style>{`
        .hero-typing-line {
          background: linear-gradient(
            120deg,
            #fdba74 0%,
            #fb923c 45%,
            #ffffff 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .hero-cursor {
          color: #fdba74 !important;
          font-weight: 300;
          -webkit-text-fill-color: #fdba74 !important;
        }
      `}</style>
    </section>
  );
}

export default HeroSection;