import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { animate } from 'animejs';
import { 
  ArrowUpRight, 
  Play, 
  PhoneCall, 
  Bot, 
  Sparkles, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Mic, 
  Radio
} from 'lucide-react';
import GradientWaves from './GradientWaves';
import useBreakpoint from '../../hooks/useBreakpoint';
import TextType from '../../components/TextType';
import crmImage from '../../assets/CRM.png';

const EASE = [0.22, 1, 0.36, 1];

/* ─────────────────────────────────────────────────────────
   5-SECOND ROTATING THEMES CONFIGURATION
   ───────────────────────────────────────────────────────── */
const HERO_THEMES = [
  {
    id: 'ai-telecaller',
    badgeText: 'AI TELECALLER V2.0',
    badgeIcon: <Bot size={15} style={{ color: '#ea580c' }} />,
    gradient: 'linear-gradient(180deg, #0284c7 0%, #0369a1 25%, #0f172a 70%, #020617 100%)',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    titleLine1: 'Autonomous AI Voice Agents',
    typingTexts: [
      'Call 10,000 Leads Daily.',
      'Human-Like Voice AI.',
      'Instant Qualification.',
      'Zero Hold Time.'
    ],
    description: 'Deploy intelligent AI voice telecallers that speak natural Telugu, Hindi & English to qualify leads, book appointments, and close sales 24/7.',
    metric: '100k+ Automated Calls / Day',
    waveConfig: { horizonColor: '#020617', waveColor: '#0369a1', crestColor: '#38bdf8' }
  },
  {
    id: 'speech-analytics',
    badgeText: 'REAL-TIME SPEECH INTELLIGENCE',
    badgeIcon: <Mic size={15} style={{ color: '#ea580c' }} />,
    gradient: 'linear-gradient(180deg, #059669 0%, #047857 25%, #064e3b 60%, #022c22 100%)',
    accentColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    titleLine1: 'Smart Conversation Analytics',
    typingTexts: [
      'Live Sentiment Analysis.',
      'Instant Call Summaries.',
      'Auto CRM Tagging.',
      'Objection Handling.'
    ],
    description: 'Analyze every call live with AI-driven sentiment analysis, automated transcriptions, and instant lead scoring directly synced into your CRM.',
    metric: '99.4% Voice Recognition Accuracy',
    waveConfig: { horizonColor: '#022c22', waveColor: '#047857', crestColor: '#34d399' }
  },
  {
    id: 'campaign-engine',
    badgeText: 'AUTO-DIALER & CAMPAIGN ENGINE',
    badgeIcon: <Zap size={15} style={{ color: '#ea580c' }} />,
    gradient: 'linear-gradient(180deg, #9333ea 0%, #7e22ce 25%, #4c1d95 65%, #2e1065 100%)',
    accentColor: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.45)',
    titleLine1: 'Supercharge Sales Outreach',
    typingTexts: [
      '10x More Connect Rates.',
      'Smart Broadcast Blast.',
      'Multi-Channel Sync.',
      'Zero Agent Idle Time.'
    ],
    description: 'Launch automated AI calling campaigns with predictive dialing, dynamic script adaptation, and automatic CRM field updates.',
    metric: '300% Higher Conversions',
    waveConfig: { horizonColor: '#2e1065', waveColor: '#7e22ce', crestColor: '#c084fc' }
  },
  {
    id: 'hyper-realistic',
    badgeText: 'HYPER-REALISTIC VOICE AI',
    badgeIcon: <Sparkles size={15} style={{ color: '#ea580c' }} />,
    gradient: 'linear-gradient(180deg, #ea580c 0%, #c2410c 25%, #9f1239 65%, #4c0519 100%)',
    accentColor: '#fb923c',
    glowColor: 'rgba(251, 146, 60, 0.45)',
    titleLine1: 'Conversations That Convert',
    typingTexts: [
      'Sub-Second Latency.',
      'Natural Accent Tone.',
      'Multi-Lingual AI.',
      'Live Transfer to Human.'
    ],
    description: 'Human-sounding voice bots with ultra-low 400ms response latency. Seamlessly hand off warm calls to human sales managers.',
    metric: '< 400ms Speech Latency',
    waveConfig: { horizonColor: '#4c0519', waveColor: '#be123c', crestColor: '#fb923c' }
  }
];

export function AiCallingHerosection() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  const [activeThemeIndex, setActiveThemeIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 5-Second Automatic Theme Shift
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveThemeIndex((prev) => (prev + 1) % HERO_THEMES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const iconsContainerRef = useRef(null);

  // Anime.js organic floating micro-animations for decorative icons
  useEffect(() => {
    if (iconsContainerRef.current) {
      try {
        const iconNodes = iconsContainerRef.current.querySelectorAll('.anime-floating-icon');
        if (iconNodes.length > 0) {
          animate(iconNodes, {
            translateY: (el, i) => [i % 2 === 0 ? -14 : 14, i % 2 === 0 ? 14 : -14],
            rotate: (el, i) => [i % 2 === 0 ? -5 : 5, i % 2 === 0 ? 5 : -5],
            scale: [0.94, 1.06],
            duration: (el, i) => 4000 + i * 800,
            ease: 'easeInOutSine',
            loop: true,
            alternate: true,
          });
        }
      } catch (e) {
        console.warn('Anime.js icons animation error:', e);
      }
    }
  }, []);

  const currentTheme = HERO_THEMES[activeThemeIndex];

  return (
    <section
      id="home"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#020617',
        overflow: 'hidden',
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
          DYNAMIC SEAMLESS GRADIENT CROSS-FADE (NO WHITE FLASH)
          ══════════════════════════════════════════════ */}
      {HERO_THEMES.map((theme, idx) => (
        <motion.div
          key={theme.id + '-bg'}
          initial={false}
          animate={{ opacity: idx === activeThemeIndex ? 1 : 0 }}
          transition={{ duration: 1.2, ease: EASE }}
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.gradient,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ══════════════════════════════════════════════
          SUBTLE GRID OVERLAY
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.08,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.6) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          zIndex: 1,
        }}
      />

      {/* ══════════════════════════════════════════════
          DECORATIVE FLOATING AI CALLING ICONS (ANIME.JS POWERED)
          ══════════════════════════════════════════════ */}
      <div
        ref={iconsContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.2,
          zIndex: 2,
        }}
      >
        <div
          className="anime-floating-icon"
          style={{ position: 'absolute', top: '24%', right: '16%', color: '#ffffff' }}
        >
          <PhoneCall size={isMobile ? 38 : 64} strokeWidth={1.3} />
        </div>

        <div
          className="anime-floating-icon"
          style={{ position: 'absolute', top: '44%', right: '24%', color: '#ffffff' }}
        >
          <Bot size={isMobile ? 34 : 58} strokeWidth={1.3} />
        </div>

        <div
          className="anime-floating-icon"
          style={{ position: 'absolute', top: '60%', right: '18%', color: '#ffffff' }}
        >
          <Mic size={isMobile ? 40 : 66} strokeWidth={1.3} />
        </div>

        <div
          className="anime-floating-icon"
          style={{ position: 'absolute', top: '64%', right: '30%', color: '#ffffff' }}
        >
          <Radio size={isMobile ? 32 : 52} strokeWidth={1.3} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ANIMATED GRADIENT WAVES ACCENT
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          opacity: 0.35,
          mixBlendMode: 'overlay',
        }}
      >
        <GradientWaves
          horizonColor={currentTheme.waveConfig.horizonColor}
          waveColor={currentTheme.waveConfig.waveColor}
          crestColor={currentTheme.waveConfig.crestColor}
          speed={0.35}
          amplitude={2.5}
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
          HERO CONTENT (SMOOTH TRANSITION EVERY 5s)
          ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.0, ease: EASE }}
        style={{
          position: 'relative',
          zIndex: 20,
          width: '100%',
          maxWidth: 1020,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* BADGE WITH WHITE BACKGROUND PILL & REACT BITS ICON */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTheme.id + '-badge'}
            initial={{ y: 10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 18px 5px 6px',
              borderRadius: 9999,
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.2), 0 0 20px ${currentTheme.glowColor}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              marginBottom: isMobile ? 20 : 26,
            }}
          >
            {/* White Left Pill */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 13px',
                borderRadius: 9999,
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              {currentTheme.badgeIcon}
              <span>{currentTheme.badgeText}</span>
            </span>

            <span
              style={{
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 650,
                letterSpacing: '-0.01em',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              {currentTheme.metric}
            </span>

            <span style={{ fontSize: 13, filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.8))' }}>✨</span>
          </motion.div>
        </AnimatePresence>

        {/* DYNAMIC HEADING & TYPING TEXT */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={currentTheme.id + '-title'}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
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
              color: '#ffffff',
              minHeight: isMobile ? '2.4em' : '2.3em',
              textShadow: '0 4px 28px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span
              style={{
                display: 'block',
                color: '#ffffff',
                whiteSpace: isMobile ? 'normal' : 'nowrap',
              }}
            >
              {currentTheme.titleLine1}
            </span>

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
                text={currentTheme.typingTexts}
                typingSpeed={50}
                deletingSpeed={28}
                pauseDuration={1600}
                initialDelay={400}
                loop
                showCursor
                cursorCharacter="|"
                cursorClassName="hero-cursor"
                className="hero-typing-line"
              />
            </span>
          </motion.h1>
        </AnimatePresence>

        {/* DYNAMIC SUBTITLE DESCRIPTION */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTheme.id + '-desc'}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              color: 'rgba(255, 255, 255, 0.94)',
              fontSize: isMobile ? 14 : 'clamp(15px, 1.1vw, 17.5px)',
              lineHeight: 1.7,
              maxWidth: 680,
              margin: 0,
              marginBottom: isMobile ? 30 : 38,
              fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
              fontWeight: 450,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.25)',
            }}
          >
            {currentTheme.description}
          </motion.p>
        </AnimatePresence>

        {/* ACTION BUTTONS — ORANGE BACKGROUND PRIMARY CTA BUTTON */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: EASE }}
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
          {/* PRIMARY CTA — BG WHITE, TEXT BLACK, HOVER NONE */}
          <motion.button
            onClick={() => navigate('/login')}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '13px 20px 13px 28px',
              borderRadius: 9999,
              border: 'none',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 800,
              fontSize: isMobile ? 14 : 15,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              letterSpacing: '-0.01em',
              fontFamily: '"Inter", system-ui, sans-serif',
            }}
          >
            Start Free AI Calling
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              }}
            >
              <ArrowUpRight size={16} strokeWidth={2.6} />
            </span>
          </motion.button>

          {/* SECONDARY CTA */}
          <motion.button
            onClick={() => navigate('/demo')}
            whileHover={{
              y: -3,
              background: 'rgba(255, 255, 255, 0.22)',
              borderColor: 'rgba(255, 255, 255, 0.75)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.28)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{
              padding: isMobile ? '14px 22px' : '13px 26px 13px 18px',
              borderRadius: 9999,
              border: '1.5px solid rgba(255, 255, 255, 0.45)',
              background: 'rgba(255, 255, 255, 0.14)',
              color: '#ffffff',
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
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
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
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Play size={13} fill="#ffffff" strokeWidth={0} />
            </span>
            Listen AI Voice Demo
          </motion.button>
        </motion.div>

        {/* 5-SECOND ROTATING THEME INDICATORS (DOT CONTROLS) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginTop: 26,
            zIndex: 30,
          }}
        >
          {HERO_THEMES.map((theme, idx) => {
            const isActive = idx === activeThemeIndex;
            return (
              <button
                key={theme.id}
                onClick={() => setActiveThemeIndex(idx)}
                style={{
                  height: 8,
                  width: isActive ? 34 : 8,
                  borderRadius: 9999,
                  border: 'none',
                  background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                  boxShadow: isActive ? `0 0 12px ${theme.accentColor}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.4s ease',
                  padding: 0,
                }}
                title={theme.badgeText}
              />
            );
          })}
        </div>

        {/* TRUST MICRO-BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: isMobile ? 12 : 24,
            marginTop: 18,
            color: 'rgba(255, 255, 255, 0.85)',
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
            Multi-Language AI Voice
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>Instant CRM Sync</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>99.9% Call Uptime</span>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════
          FLOATING CRM & AI CALLING PREVIEW
          ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 1.2, ease: EASE }}
        style={{
          position: 'relative',
          zIndex: 15,
          width: '100%',
          maxWidth: 1080,
          marginTop: isMobile ? 40 : 56,
          boxSizing: 'border-box',
          perspective: 1200,
        }}
      >
        <motion.div
          initial={{ rotateX: 8, y: 15 }}
          animate={{ rotateX: 0, y: 0 }}
          transition={{ delay: 0.7, duration: 1.4, ease: EASE }}
          style={{
            borderRadius: isMobile ? 16 : 24,
            overflow: 'hidden',
            boxShadow: `
              0 40px 100px rgba(0, 0, 0, 0.55),
              0 0 0 1px rgba(255, 255, 255, 0.22)
            `,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            background: 'transparent',
            position: 'relative',
          }}
        >
          <img
            src={crmImage}
            alt="AI Calling CRM Dashboard Preview"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
            }}
          />
        </motion.div>

        {/* Ambient Glow behind Dashboard */}
        <div
          style={{
            position: 'absolute',
            inset: '15% 5% -10% 5%',
            background: `
              radial-gradient(
                ellipse at 50% 100%,
                ${currentTheme.glowColor} 0%,
                transparent 65%
              )
            `,
            filter: 'blur(70px)',
            zIndex: -1,
            pointerEvents: 'none',
            transition: 'background 1.2s ease',
          }}
        />
      </motion.div>

      {/* ══════════════════════════════════════════════
          TYPING CURSOR & TEXT GRADIENT STYLES
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

export default AiCallingHerosection;
