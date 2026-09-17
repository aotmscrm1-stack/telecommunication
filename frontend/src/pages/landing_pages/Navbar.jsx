import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EASE = [0.16, 1, 0.3, 1];

export function Navbar() {
  const navigate = useNavigate();

  return (
    <motion.nav
      className="nk-navbar"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      {/* Left Side */}
      <div className="nk-left-nav nk-nav-interactive">
        {/* Logo + Brand Text */}
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

      {/* Right Side */}
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
  );
}

export default Navbar;
