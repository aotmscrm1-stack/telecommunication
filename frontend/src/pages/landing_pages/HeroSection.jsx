import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const EASE = [0.16, 1, 0.3, 1];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <>
      {/* 1. Full-Screen Background Video */}
      <div className="nk-video-container">
        <motion.div
          className="nk-video-wrapper"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
        >
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="nk-video-element"
          />
        </motion.div>
      </div>

      {/* Spacer to push content to bottom */}
      <div style={{ flex: 1 }} />

      {/* 2. Footer Content Pinned to Bottom over Gradient */}
      <motion.footer
        className="nk-footer-container"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.0, ease: EASE }}
      >
        {/* Left Block */}
        <div className="nk-footer-left">
          {/* Subtitle */}
          <motion.div
            className="nk-subtitle-row"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
          >
            <div className="nk-dot" />
            <span className="nk-subtitle-text">Best digital banking card 2026</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="nk-heading"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: EASE }}
          >
            One Card, Zero <br /> Limits. Worldwide.
          </motion.h1>

          {/* Buttons */}
          <motion.div
            className="nk-buttons-row"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.8, ease: EASE }}
          >
            <button className="nk-btn-primary" onClick={() => navigate('/login')}>
              See Features
            </button>
            <button className="nk-btn-secondary" onClick={() => navigate('/login')}>
              How It Works
            </button>
          </motion.div>
        </div>

        {/* Right Block */}
        <div className="nk-footer-right">
          <span className="nk-tag-pill">Neuromorphic</span>
          <span className="nk-tag-pill">AGI</span>
          <span className="nk-tag-pill">Cybernetics</span>
        </div>
      </motion.footer>
    </>
  );
}

export default HeroSection;
