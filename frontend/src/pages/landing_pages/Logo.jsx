import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Landing from './Landing';
import introVideo from '../../assets/Intro_aotms.mp4';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1];

export default function Logo({ showLandingDirectly = true, onComplete, autoRedirect = false }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [stage, setStage] = useState('playing'); // 'playing' | 'fadeOut' | 'done'
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Enforce default sound output
    video.muted = false;
    video.volume = 1.0;

    const enableAudio = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        setIsMuted(false);
        videoRef.current.play().catch(() => {});
      }
    };

    // Background silent listener so any click/tap on the site un-mutes automatically without popups
    window.addEventListener('pointerdown', enableAudio, { once: true });
    window.addEventListener('click', enableAudio, { once: true });
    window.addEventListener('keydown', enableAudio, { once: true });
    window.addEventListener('touchstart', enableAudio, { once: true });

    // Attempt direct play with audio
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsMuted(false);
        })
        .catch((err) => {
          console.warn('Autoplay with sound blocked by browser, playing muted until interaction:', err);
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
    }

    return () => {
      window.removeEventListener('pointerdown', enableAudio);
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('keydown', enableAudio);
      window.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  const handleVideoEnd = () => {
    setStage('fadeOut');
    setTimeout(() => {
      setStage('done');
      if (onComplete) onComplete();
      if (autoRedirect) {
        navigate('/');
      }
    }, 1000);
  };

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    handleVideoEnd();
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = 1.0;
      setIsMuted(nextMuted);
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleScreenClick = () => {
    if (videoRef.current && videoRef.current.muted) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      setIsMuted(false);
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden select-none">
      {/* Render Landing Page underneath */}
      {showLandingDirectly && (
        <div
          style={{
            opacity: stage === 'playing' ? 0 : 1,
            transition: 'opacity 1s ease',
          }}
        >
          <Landing />
        </div>
      )}

      {/* Full Screen MP4 Intro Video Splash Overlay */}
      <AnimatePresence>
        {stage !== 'done' && (
          <motion.div
            key="video-splash-screen"
            initial={{ opacity: 1 }}
            animate={{ opacity: stage === 'fadeOut' ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: EASE }}
            onClick={handleScreenClick}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: 'pointer',
              pointerEvents: stage === 'fadeOut' ? 'none' : 'auto',
            }}
          >
            {/* MP4 Full Screen Video */}
            <video
              ref={videoRef}
              src={introVideo}
              autoPlay
              playsInline
              onEnded={handleVideoEnd}
              style={{
                width: '100vw',
                height: '100vh',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Bottom Controls Overlay (Sound toggle & Skip button only) */}
            <div
              style={{
                position: 'absolute',
                bottom: 28,
                right: 28,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                zIndex: 100000,
              }}
            >
              {/* Sound Toggle Button */}
              <button
                onClick={toggleMute}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 9999,
                  background: isMuted ? 'rgba(239, 68, 68, 0.85)' : 'rgba(4, 102, 200, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  transition: 'all 0.25s ease',
                }}
              >
                {isMuted ? (
                  <>
                    <VolumeX size={16} />
                    <span>Unmute Sound</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={16} />
                    <span>Audio Enabled</span>
                  </>
                )}
              </button>

              {/* Skip Intro Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  borderRadius: 9999,
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  transition: 'all 0.25s ease',
                }}
              >
                <span>Skip</span>
                <SkipForward size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
