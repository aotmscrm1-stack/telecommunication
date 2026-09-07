import React from 'react';
import logoImg from '../../assets/aotms-global-logo.png';

export const LeftPanel = ({ callTime }) => {
  return (
    <div className="lw-left">
      <div className="lw-bg-circle lw-bg-c1" />
      <div className="lw-bg-circle lw-bg-c2" />
      <div className="lw-bg-circle lw-bg-c3" />
      <div className="lw-dots" />

      {/* Top logo */}
      <div className="lw-logo-area">
        <img src={logoImg} alt="AOTMS Logo" className="lw-logo-img" />
      </div>

      {/* Headline & tagline */}
      <div className="lw-headline">
        <h2>
          Smart Telecom Sales <br />
          <span className="lw-gradient-text">Powered by AI Telecaller</span>
        </h2>
        <p>
          Automate outbound calls, capture lead insights, track follow-ups, and convert more prospects with AOTMS.
        </p>
      </div>

      {/* Chips */}
      <div className="lw-chips">
        <div className="lw-chip">
          <span className="lw-chip-dot" />
          WhatsApp Cloud API
        </div>
        <div className="lw-chip">
          <span className="lw-chip-dot" />
          Lead Auto-Assignment
        </div>
        <div className="lw-chip">
          <span className="lw-chip-dot" />
          Auto Follow-up Engine
        </div>
      </div>

      {/* 3D AI Call Scene */}
      <div className="lw-scene-wrap">
        <div className="lw-ai-chip">
          <div className="lw-typing">
            <i /><i /><i />
          </div>
          <span>AI Listening...</span>
        </div>

        <div className="lw-orb-stage">
          <div className="lw-orb-glow" />
          <div className="lw-orb-ring r1" />
          <div className="lw-orb-ring r2" />
          <div className="lw-orb-ring r3" />
          <div className="lw-orb-node n1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.32A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          </div>
          <div className="lw-orb-node n2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
          </div>
          <div className="lw-orb-node n3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </div>
          <div className="lw-orb-core">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.32A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
        </div>

        {/* Floating live call card */}
        <div className="lw-call-card">
          <div className="lw-call-row">
            <div className="lw-call-avatar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div>
              <div className="lw-call-name">Rahul Sharma</div>
              <div className="lw-call-status">AI Active Call &bull; {callTime}</div>
            </div>
          </div>
          <div className="lw-wave-row">
            {[0.4, 0.9, 0.6, 1, 0.7, 0.4, 0.85, 0.5, 0.95, 0.6].map((scale, i) => (
              <div key={i} className="lw-wave-bar" style={{ animationDelay: `${i * 0.1}s`, transform: `scaleY(${scale})` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Stats footer row */}
      <div className="lw-stats">
        <div className="lw-stat">
          <div className="lw-stat-val">99.4%</div>
          <div className="lw-stat-lbl">Call Accuracy</div>
        </div>
        <div className="lw-stat">
          <div className="lw-stat-val">10x</div>
          <div className="lw-stat-lbl">Faster Connects</div>
        </div>
        <div className="lw-stat">
          <div className="lw-stat-val">24/7</div>
          <div className="lw-stat-lbl">Automated Calls</div>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
