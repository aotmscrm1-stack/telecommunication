// src/pages/landing_pages/HeroSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Play } from 'lucide-react';
import GradientWaves from './GradientWaves';
import useBreakpoint from '../../hooks/useBreakpoint';
import TextType from '../../components/TextType';
import crmImage from '../../assets/CRM.png';

const EASE = [0.22, 1, 0.36, 1];

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
        background:
          'radial-gradient(ellipse at 50% 30%, #064e3b 0%, #022c22 45%, #01150f 80%, #000806 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: isMobile ? 100 : 120,
        paddingBottom: isMobile ? 60 : 80,
        boxSizing: 'border-box',
      }}
    >
      {/* ══════════════════════════════════════════════
          ANIMATED GREEN WAVES BACKGROUND
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2.0, ease: EASE }}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            willChange: 'transform, opacity',
          }}
        >
          <GradientWaves
            horizonColor="#01150f"
            waveColor="#16a34a"
            crestColor="#bef264"
            speed={0.35}
            amplitude={2.6}
            waveScale={0.6}
            waveRatio={0.9}
            swell={35}
            turbulence={20}
            tilt={1.11}
            zoom={1}
            height={5.5}
            fogDepth={15}
            detail="medium"
            brightness={1.1}
            opacity={1}
            mouseInteraction
            parallaxStrength={0.55}
            grain
            grainIntensity={0.04}
          />
        </motion.div>

        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(1,21,15,0.55) 75%, rgba(0,8,6,0.95) 100%)',
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════
          CENTERED HERO CONTENT
          ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 1.1, ease: EASE }}
        style={{
          position: 'relative',
          zIndex: 20,
          width: '100%',
          maxWidth: 1280,
          padding: isMobile ? '0 16px' : '0 clamp(16px, 2.5vw, 36px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Small badge — "What's New" */}
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
            background: 'rgba(190, 242, 100, 0.10)',
            border: '1px solid rgba(190, 242, 100, 0.30)',
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
              background: '#bef264',
              color: '#1a2800',
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
              color: '#dcfce7',
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}
          >
            AI-Powered CRM Platform
          </span>
          <span style={{ fontSize: 12 }}>✨</span>
        </motion.div>

        {/* Heading — strictly 2 lines (Line 1: Manage Your CRM Pipeline / Line 2: Track Every Lead.) */}
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
          }}
        >
          {/* Line 1 — static white (strictly 1 line) */}
          <span
            style={{
              display: 'block',
              color: '#ffffff',
              whiteSpace: isMobile ? 'normal' : 'nowrap',
            }}
          >
            Manage Your CRM Pipeline
          </span>

          {/* Line 2 — typing animated (strictly 1 line, starting with Track Every Lead.) */}
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
            color: 'rgba(255, 255, 255, 0.72)',
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
          {/* Primary — lime gradient pill with arrow badge */}
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{
              y: -3,
              boxShadow: '0 20px 44px rgba(163,230,53,0.55)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '14px 16px 14px 26px',
              borderRadius: 9999,
              border: 'none',
              background:
                'linear-gradient(135deg, #bef264 0%, #a3e635 55%, #65a30d 100%)',
              color: '#0a1500',
              fontWeight: 800,
              fontSize: isMobile ? 14 : 14.5,
              cursor: 'pointer',
              boxShadow: '0 12px 30px rgba(163,230,53,0.45)',
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
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0a1500',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              <ArrowUpRight size={15} strokeWidth={2.6} />
            </span>
          </motion.button>

          {/* Secondary — white pill with play icon */}
          <motion.button
            onClick={() => navigate('/demo')}
            whileHover={{
              y: -3,
              boxShadow: '0 20px 44px rgba(255,255,255,0.25)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '14px 26px 14px 16px',
              borderRadius: 9999,
              border: 'none',
              background: '#ffffff',
              color: '#0a1500',
              fontWeight: 800,
              fontSize: isMobile ? 14 : 14.5,
              cursor: 'pointer',
              boxShadow: '0 12px 30px rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              letterSpacing: '-0.005em',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#0a1500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Play size={13} fill="#ffffff" strokeWidth={0} />
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
          maxWidth: 1240,
          marginTop: isMobile ? 44 : 64,
          padding: isMobile ? '0 16px' : '0 clamp(20px, 3.5vw, 48px)',
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
            boxShadow:
              '0 30px 90px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.14), 0 0 50px rgba(190, 242, 100, 0.12)',
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

        {/* Soft glow behind the dashboard */}
        <div
          style={{
            position: 'absolute',
            inset: '15% 5% -10% 5%',
            background:
              'radial-gradient(ellipse at 50% 100%, rgba(190, 242, 100, 0.28) 0%, transparent 70%)',
            filter: 'blur(60px)',
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
          background: linear-gradient(120deg, #bef264 0%, #a3e635 30%, #4ade80 65%, #22c55e 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .hero-typing-line span[style] {
          /* inner text color override removed — gradient applies */
        }
        .hero-cursor {
          color: #bef264 !important;
          font-weight: 300;
          -webkit-text-fill-color: #bef264 !important;
        }
      `}</style>
    </section>
  );
}

export default HeroSection;