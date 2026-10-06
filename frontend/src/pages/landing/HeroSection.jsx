import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { animate } from 'animejs';
import { 
  ArrowUpRight, 
  Play, 
  Video, 
  MessageSquare, 
  Globe, 
  Coffee, 
  PhoneCall, 
  Bot, 
  Mic, 
  Radio,
  Sparkles
} from 'lucide-react';
import GradientWaves from './GradientWaves';
import useBreakpoint from '../../hooks/useBreakpoint';
import TextType from '../../components/TextType';
import crmImage from '../../assets/CRM.png';

const EASE = [0.22, 1, 0.36, 1];

/* ─────────────────────────────────────────────────────────
   TWO ROTATING HERO SLIDES (5-SECOND AUTO SCROLL)
   SLIDE 0 (DEFAULT): Old CRM Dashboard Pipeline
   SLIDE 1: AI Telecaller v2.0 Autonomous Voice Agents
   ───────────────────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    id: 'crm-dashboard',
    badgeText: "WHAT'S NEW",
    badgeSubtext: 'AI-Powered CRM Platform',
    badgeIcon: <Sparkles size={14} style={{ color: '#ea580c' }} />,
    badgeBg: '#ffffff',
    badgeColor: '#0f172a',
    gradient: 'linear-gradient(180deg, #f97316 0%, #ea580c 25%, #c2410c 45%, #7c3aed 70%, #4c1d95 100%)',
    accentColor: '#fdba74',
    glowColor: 'rgba(124, 58, 237, 0.45)',
    titleLine1: 'Manage Your CRM Pipeline',
    typingTexts: [
      'Track Every Lead.',
      'Close Deals Faster.',
      'Automate Follow-ups.',
      'Grow Revenue 3x.'
    ],
    description: 'The unified CRM for telecom & enterprise sales teams — pipeline, live leads, follow-ups, and analytics, all in one intelligent workspace.',
    primaryBtnText: 'Get Started',
    primaryBtnBg: '#ffffff',
    primaryBtnTextColor: '#000000',
    secondaryBtnText: 'Watch Demo',
    waveConfig: { horizonColor: '#4c1d95', waveColor: '#7c3aed', crestColor: '#fdba74' },
    trustBadges: [
      { text: 'Enterprise Grade', dot: '#34d399' },
      { text: 'No credit card required' },
      { text: '99.9% Pipeline Uptime' }
    ]
  },
  {
    id: 'ai-telecaller',
    badgeText: 'AI TELECALLER V2.0',
    badgeSubtext: '100k+ Automated Calls / Day',
    badgeIcon: <Bot size={15} style={{ color: '#ea580c' }} />,
    badgeBg: '#ffffff',
    badgeColor: '#0f172a',
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
    primaryBtnText: 'Start Free AI Calling',
    primaryBtnBg: '#ffffff',
    primaryBtnTextColor: '#000000',
    secondaryBtnText: 'Listen AI Voice Demo',
    waveConfig: { horizonColor: '#020617', waveColor: '#0369a1', crestColor: '#38bdf8' },
    trustBadges: [
      { text: 'Multi-Language AI Voice', dot: '#34d399' },
      { text: 'Instant CRM Sync' },
      { text: '99.9% Call Uptime' }
    ]
  }
];

export function HeroSection({
  activeSlideIndex: propActiveSlideIndex,
  setActiveSlideIndex: propSetActiveSlideIndex,
}) {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';

  const [internalSlideIndex, setInternalSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Maintain persistent typing index per slide so it doesn't restart from 0!
  const [typingIndices, setTypingIndices] = useState({
    'crm-dashboard': 0,
    'ai-telecaller': 0,
  });

  const activeSlideIndex = propActiveSlideIndex !== undefined ? propActiveSlideIndex : internalSlideIndex;

  const updateSlideIndex = (val) => {
    if (propSetActiveSlideIndex) {
      if (typeof val === 'function') {
        propSetActiveSlideIndex((prev) => val(prev));
      } else {
        propSetActiveSlideIndex(val);
      }
    } else {
      setInternalSlideIndex(val);
    }
  };

  // 7.5-Second Auto Scroll loop between Slide 0 (Old CRM) & Slide 1 (AI Telecaller v2.0)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      updateSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7500);

    return () => clearInterval(timer);
  }, [isPaused, propActiveSlideIndex]);

  const currentSlide = HERO_SLIDES[activeSlideIndex];

  const dashboardRef = useRef(null);

  const handleSentenceComplete = (_sentence, index) => {
    const slideId = currentSlide.id;
    const nextIndex = (index + 1) % currentSlide.typingTexts.length;
    setTypingIndices((prev) => ({
      ...prev,
      [slideId]: nextIndex,
    }));
  };

  // Anime.js smooth continuous floating tilt effect for CRM dashboard preview
  useEffect(() => {
    if (dashboardRef.current) {
      try {
        animate(dashboardRef.current, {
          translateY: [-8, 8],
          rotateX: [1, -1],
          duration: 4800,
          ease: 'easeInOutSine',
          loop: true,
          alternate: true,
        });
      } catch (e) {
        console.warn('Anime.js animation error:', e);
      }
    }
  }, []);

  return (
    <section
      id="home"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
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
      {HERO_SLIDES.map((slide, idx) => (
        <motion.div
          key={slide.id + '-bg'}
          initial={false}
          animate={{ opacity: idx === activeSlideIndex ? 1 : 0 }}
          transition={{ duration: 1.2, ease: EASE }}
          style={{
            position: 'absolute',
            inset: 0,
            background: slide.gradient,
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
          FLOATING DYNAMIC DECORATIVE ICONS
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.18,
          zIndex: 2,
        }}
      >
        {currentSlide.id === 'crm-dashboard' ? (
          <>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '26%', right: '18%', color: '#ffffff' }}
            >
              <Video size={isMobile ? 40 : 64} strokeWidth={1.2} />
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              style={{ position: 'absolute', top: '42%', right: '26%', color: '#ffffff' }}
            >
              <MessageSquare size={isMobile ? 36 : 58} strokeWidth={1.2} />
            </motion.div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              style={{ position: 'absolute', top: '58%', right: '20%', color: '#ffffff' }}
            >
              <Globe size={isMobile ? 42 : 68} strokeWidth={1.2} />
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              style={{ position: 'absolute', top: '62%', right: '32%', color: '#ffffff' }}
            >
              <Coffee size={isMobile ? 34 : 54} strokeWidth={1.2} />
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '24%', right: '16%', color: '#ffffff' }}
            >
              <PhoneCall size={isMobile ? 38 : 64} strokeWidth={1.3} />
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              style={{ position: 'absolute', top: '44%', right: '24%', color: '#ffffff' }}
            >
              <Bot size={isMobile ? 34 : 58} strokeWidth={1.3} />
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              style={{ position: 'absolute', top: '60%', right: '18%', color: '#ffffff' }}
            >
              <Mic size={isMobile ? 40 : 66} strokeWidth={1.3} />
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              style={{ position: 'absolute', top: '64%', right: '30%', color: '#ffffff' }}
            >
              <Radio size={isMobile ? 32 : 52} strokeWidth={1.3} />
            </motion.div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          ANIMATED WAVES ACCENT
          ══════════════════════════════════════════════ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          opacity: 0.32,
          mixBlendMode: 'overlay',
        }}
      >
        <GradientWaves
          horizonColor={currentSlide.waveConfig.horizonColor}
          waveColor={currentSlide.waveConfig.waveColor}
          crestColor={currentSlide.waveConfig.crestColor}
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
          HERO CONTENT (SMOOTH 5-SECOND SHIFT)
          ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.0, ease: EASE }}
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
        {/* EXECUTIVE GLASS BADGE WITH WHITE LEFT PILL & REACT BITS ICON */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id + '-badge'}
            initial={{ y: 10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 16px 5px 6px',
              borderRadius: 9999,
              background: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.16), 0 0 20px ${currentSlide.glowColor}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              marginBottom: isMobile ? 20 : 26,
            }}
          >
            {/* Left Pill — WHITE BACKGROUND */}
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
              {currentSlide.badgeIcon}
              <span>{currentSlide.badgeText}</span>
            </span>

            {/* Badge Subtext */}
            <span
              style={{
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              {currentSlide.badgeSubtext}
            </span>

            <span style={{ fontSize: 13, filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))' }}>✨</span>
          </motion.div>
        </AnimatePresence>

        {/* HEADING & DYNAMIC TYPING LINE */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={currentSlide.id + '-title'}
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
              textShadow: '0 4px 28px rgba(0, 0, 0, 0.28), 0 1px 3px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span
              style={{
                display: 'block',
                color: '#ffffff',
                whiteSpace: isMobile ? 'normal' : 'nowrap',
                textShadow: '0 4px 30px rgba(0, 0, 0, 0.25)',
              }}
            >
              {currentSlide.titleLine1}
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
                text={currentSlide.typingTexts}
                initialTextIndex={typingIndices[currentSlide.id] || 0}
                onSentenceComplete={handleSentenceComplete}
                typingSpeed={40}
                deletingSpeed={25}
                pauseDuration={1400}
                initialDelay={200}
                loop
                showCursor
                cursorCharacter="|"
                cursorClassName="hero-cursor"
                className="hero-typing-line"
              />
            </span>
          </motion.h1>
        </AnimatePresence>

        {/* DESCRIPTION */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentSlide.id + '-desc'}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              color: 'rgba(255, 255, 255, 0.94)',
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
            {currentSlide.description}
          </motion.p>
        </AnimatePresence>

        {/* BUTTONS */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
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
          {/* PRIMARY BUTTON — BG WHITE, TEXT BLACK, HOVER NONE */}
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
            {currentSlide.primaryBtnText}
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

          {/* SECONDARY BUTTON */}
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
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Play size={13} fill="#ffffff" strokeWidth={0} />
            </span>
            {currentSlide.secondaryBtnText}
          </motion.button>
        </motion.div>

        {/* 5-SECOND AUTO SCROLL DOT CONTROLS */}
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
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === activeSlideIndex;
            return (
              <button
                key={slide.id}
                onClick={() => setActiveSlideIndex(idx)}
                style={{
                  height: 8,
                  width: isActive ? 34 : 8,
                  borderRadius: 9999,
                  border: 'none',
                  background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                  boxShadow: isActive ? `0 0 12px ${slide.accentColor}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.4s ease',
                  padding: 0,
                }}
                title={slide.badgeSubtext}
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
            color: 'rgba(255, 255, 255, 0.78)',
            fontSize: isMobile ? 12 : 13,
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {currentSlide.trustBadges.map((badge, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span style={{ opacity: 0.4 }}>•</span>}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {badge.dot && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: badge.dot,
                      display: 'inline-block',
                      boxShadow: `0 0 10px ${badge.dot}`,
                    }}
                  />
                )}
                {badge.text}
              </span>
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════
          FLOATING CRM DASHBOARD PREVIEW
          ══════════════════════════════════════════════ */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.4, ease: EASE }}
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
          ref={dashboardRef}
          initial={{ rotateX: 10, y: 20 }}
          animate={{ rotateX: 0, y: 0 }}
          transition={{ delay: 0.6, duration: 1.6, ease: EASE }}
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
            position: 'relative',
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

        {/* Soft glow behind dashboard */}
        <div
          style={{
            position: 'absolute',
            inset: '15% 5% -10% 5%',
            background: `
              radial-gradient(
                ellipse at 50% 100%,
                ${currentSlide.glowColor} 0%,
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

export default HeroSection;