import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EASE = [0.16, 1, 0.3, 1];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="nk-landing-root">
      {/* Dynamic Font & Responsive Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        * {
          box-sizing: border-box;
        }

        .nk-landing-root {
          min-height: 100vh;
          width: 100vw;
          background-color: #ffffff;
          color: #000000;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }

        /* Fixed Navbar */
        .nk-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
        }
        @media (min-width: 768px) {
          .nk-navbar {
            padding: 24px 32px;
          }
        }

        .nk-nav-interactive {
          pointer-events: auto;
        }

        .nk-left-nav {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nk-logo-group {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .nk-brand-text {
          display: none;
          font-size: 15px;
          font-weight: 600;
          color: #000000;
          letter-spacing: -0.02em;
        }
        @media (min-width: 768px) {
          .nk-brand-text {
            display: inline-block;
          }
        }

        .nk-menu-btn {
          background-color: #000000;
          color: #ffffff;
          border-radius: 9999px;
          padding: 4px 14px 4px 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          border: none;
          outline: none;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .nk-menu-btn:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }

        .nk-circle-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: #ffffff;
          color: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        @media (min-width: 768px) {
          .nk-circle-icon {
            width: 32px;
            height: 32px;
          }
        }

        .nk-menu-text {
          font-size: 11px;
          font-weight: 500;
          color: #ffffff;
        }

        .nk-tags-pill {
          display: none;
          background-color: #F4F4F6;
          border-radius: 9999px;
          padding: 8px 18px;
          gap: 14px;
          font-size: 11px;
          font-weight: 500;
          color: #666666;
        }
        @media (min-width: 768px) {
          .nk-tags-pill {
            display: flex;
            align-items: center;
          }
        }

        .nk-adaptive-pill {
          background-color: #F4F4F6;
          border-radius: 9999px;
          padding: 4px;
          display: flex;
          align-items: center;
          cursor: pointer;
          border: none;
          outline: none;
          transition: transform 0.2s ease;
        }
        .nk-adaptive-pill:hover {
          transform: scale(1.02);
        }
        @media (min-width: 768px) {
          .nk-adaptive-pill {
            padding: 4px 16px 4px 4px;
            gap: 10px;
          }
        }

        .nk-adaptive-label {
          display: none;
          font-size: 11px;
          font-weight: 500;
          color: #111111;
        }
        @media (min-width: 768px) {
          .nk-adaptive-label {
            display: inline-block;
          }
        }

        /* Full Viewport Background Video */
        .nk-video-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .nk-video-wrapper {
          position: relative;
          width: 80%;
          height: 80%;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.06);
          transition: width 0.4s ease, height 0.4s ease, border-radius 0.4s ease;
        }
        @media (min-width: 768px) {
          .nk-video-wrapper {
            width: 100%;
            height: 100%;
            border-radius: 0;
            box-shadow: none;
          }
        }

        .nk-video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Footer Content pinned to bottom over gradient */
        .nk-footer-container {
          position: relative;
          z-index: 30;
          width: 100%;
          background: linear-gradient(to top, #ffffff 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%);
          padding: 24px 20px 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .nk-footer-container {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
            padding: 32px 48px 48px;
            gap: 0;
          }
        }

        .nk-footer-left {
          display: flex;
          flex-direction: column;
          max-width: 640px;
        }

        .nk-subtitle-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .nk-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #000000;
        }

        .nk-subtitle-text {
          font-size: 13px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.55);
        }

        .nk-heading {
          font-weight: 300;
          font-size: clamp(2rem, 8vw, 4.5rem);
          letter-spacing: -0.03em;
          line-height: 1;
          color: #000000;
          margin: 0 0 24px 0;
        }
        @media (min-width: 768px) {
          .nk-heading {
            font-size: clamp(2.5rem, 5.5vw, 4.5rem);
          }
        }

        .nk-buttons-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nk-btn-primary {
          background-color: #000000;
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
          padding: 12px 24px;
          border-radius: 9999px;
          border: 1px solid #000000;
          cursor: pointer;
          transition: transform 0.2s ease, background-color 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .nk-btn-primary:hover {
          transform: scale(1.03);
          background-color: #222222;
        }

        .nk-btn-secondary {
          background-color: transparent;
          color: #000000;
          font-size: 13px;
          font-weight: 500;
          padding: 12px 24px;
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .nk-btn-secondary:hover {
          transform: scale(1.03);
          border-color: rgba(0, 0, 0, 0.7);
        }

        .nk-footer-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .nk-tag-pill {
          background-color: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          font-size: 11px;
          font-weight: 500;
          color: #111111;
          padding: 8px 16px;
          border-radius: 9999px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
      `}</style>

      {/* 1. Fixed Navbar */}
      <motion.nav
        className="nk-navbar"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {/* Left Navbar Side */}
        <div className="nk-left-nav nk-nav-interactive">
          {/* Logo + Brand Name */}
          <div className="nk-logo-group" onClick={() => navigate('/login')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="4" width="7" height="16" rx="3.5" fill="#000" transform="rotate(-35 8.5 12)" />
              <rect x="12" y="4" width="7" height="16" rx="3.5" fill="#000" transform="rotate(-35 15.5 12)" />
            </svg>
            <span className="nk-brand-text">NeuralKinetics</span>
          </div>

          {/* Menu Button */}
          <button className="nk-menu-btn" onClick={() => navigate('/login')}>
            <span className="nk-circle-icon">
              <Plus size={12} strokeWidth={3} />
            </span>
            <span className="nk-menu-text">Menu</span>
          </button>

          {/* Tags Pill */}
          <div className="nk-tags-pill">
            <span>Advanced Bionics</span>
            <span>Cognitive AI</span>
          </div>
        </div>

        {/* Right Navbar Side */}
        <div className="nk-nav-interactive">
          <button className="nk-adaptive-pill" onClick={() => navigate('/login')}>
            <span className="nk-circle-icon" style={{ backgroundColor: '#000', color: '#fff' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="3" cy="3" r="1.5" fill="#FFF" />
                <circle cx="9" cy="3" r="1.5" fill="#FFF" />
                <circle cx="3" cy="9" r="1.5" fill="#FFF" />
                <circle cx="9" cy="9" r="1.5" fill="#FFF" />
              </svg>
            </span>
            <span className="nk-adaptive-label">Adaptive Systems</span>
          </button>
        </div>
      </motion.nav>

      {/* 2. Full-Screen Background Video */}
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

      {/* 3. Footer Content (Pinned to Bottom over Gradient) */}
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
    </div>
  );
}