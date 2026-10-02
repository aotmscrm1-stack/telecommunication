import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Landing from './Landing';
import aotmsLogo from '../../assets/aotms-global-logo.png';

const EASE = [0.22, 1, 0.36, 1];

export default function Logo({ showLandingDirectly = true, onComplete, autoRedirect = false }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState('fadeIn'); // 'fadeIn' | 'moveToNav' | 'done'

  useEffect(() => {
    // Stage 1: Fade in logo in center with ambient glow (0 -> 1.3s)
    const timer1 = setTimeout(() => {
      setStage('moveToNav');
    }, 1400);

    // Stage 2: Move logo smoothly up toward top Navbar while black background fades out (1.4s -> 2.6s)
    const timer2 = setTimeout(() => {
      setStage('done');
      if (onComplete) onComplete();
      if (autoRedirect) {
        navigate('/');
      }
    }, 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [navigate, onComplete, autoRedirect]);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden select-none">
      {/* Render Landing Page underneath */}
      {showLandingDirectly && (
        <div
          style={{
            opacity: stage === 'fadeIn' ? 0 : 1,
            transition: 'opacity 1s ease',
          }}
        >
          <Landing />
        </div>
      )}

      {/* Intro Splash Screen Overlay */}
      <AnimatePresence>
        {stage !== 'done' && (
          <motion.div
            key="logo-splash-screen"
            initial={{ opacity: 1 }}
            animate={{ opacity: stage === 'moveToNav' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: EASE }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: stage === 'moveToNav' ? 'none' : 'auto',
            }}
          >
            {/* Subtle radial aura behind logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: stage === 'fadeIn' ? [0, 0.7, 0.3] : 0,
                scale: stage === 'fadeIn' ? [0.6, 1.3, 1] : 0.5,
              }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                width: 360,
                height: 360,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(4, 102, 200, 0.45) 0%, rgba(249, 115, 22, 0.25) 45%, transparent 75%)',
                filter: 'blur(50px)',
              }}
            />

            {/* Logo Card Animating from Center to Navbar Position */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.7,
                y: 20,
                filter: 'blur(12px)',
              }}
              animate={
                stage === 'fadeIn'
                  ? {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      x: 0,
                      filter: 'blur(0px)',
                    }
                  : {
                      opacity: 0.2,
                      scale: 0.4,
                      y: '-42vh',
                      x: '-36vw',
                      filter: 'blur(1px)',
                    }
              }
              transition={
                stage === 'fadeIn'
                  ? { duration: 1.0, ease: EASE }
                  : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
              }
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                padding: '20px 32px',
                borderRadius: 24,
                background: 'rgba(255, 255, 255, 0.98)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(4, 102, 200, 0.3)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <img
                src={aotmsLogo}
                alt="AOTMS"
                style={{
                  height: 52,
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
