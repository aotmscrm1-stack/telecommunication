import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Lock,
  PhoneCall,
  Globe,
  Radio,
} from 'lucide-react';
import {
  SiWhatsapp,
  SiGooglesheets,
  SiAirtel,
  SiRazorpay,
} from 'react-icons/si';
import aotmsLogo from '../../assets/Logo.png';

const CRM_LIVE_CONNECTIONS = [
  {
    id: 'airtel',
    name: 'Airtel SIP Trunk',
    type: 'Carrier Telephony',
    latency: '38ms',
    status: 'Connected',
    color: '#EF4444',
    icon: SiAirtel,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Cloud API',
    type: 'Official Meta Partner',
    latency: '52ms',
    status: 'Verified · 99.9%',
    color: '#22C55E',
    icon: SiWhatsapp,
  },
  {
    id: 'sheets',
    name: 'Google Sheets 2-Way',
    type: 'Realtime Sync',
    latency: '64ms',
    status: 'Active Synced',
    color: '#10B981',
    icon: SiGooglesheets,
  },
  {
    id: 'razorpay',
    name: 'Razorpay UPI Gateway',
    type: 'Payment Webhook',
    latency: '45ms',
    status: 'Operational',
    color: '#3B82F6',
    icon: SiRazorpay,
  },
];

export const Footer = () => {
  const navigate = useNavigate();
  const [activePulse, setActivePulse] = useState(0);
  const [ping, setPing] = useState(42);

  // Dynamic ping fluctuation for live CRM connection feel
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePulse((prev) => (prev + 1) % CRM_LIVE_CONNECTIONS.length);
      setPing(Math.floor(Math.random() * 12) + 38);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer
      id="contact"
      style={{
        background: '#070a12',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '64px',
        paddingBottom: '36px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#ffffff',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 900,
          height: 280,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(4, 102, 200, 0.22) 0%, rgba(249, 115, 22, 0.08) 45%, transparent 75%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 40px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ══════════════════════════════════════════════
            CLEAN CRM ANIMATION & LIVE CONNECTIONS HUB
            ══════════════════════════════════════════════ */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 24,
            padding: ' clamp(24px, 4vw, 36px)',
            marginBottom: 44,
            backdropFilter: 'blur(16px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle top indicator bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              paddingBottom: 20,
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: 28,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 10px #22c55e',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#38bdf8', fontFamily: 'monospace' }}>
                CRM LIVE CONNECTIONS & TELEMETRY
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#34d399" />
                <span>Avg Latency: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{ping}ms</strong></span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} color="#38bdf8" />
                <span>256-Bit SSL Encrypted</span>
              </span>
            </div>
          </div>

          {/* Center Logo with Pulse Waves & Connected Nodes */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '16px 0 24px',
            }}
          >
            {/* Center Animated Logo Node */}
            <div style={{ position: 'relative', marginBottom: 28 }}>
              {/* Expanding Pulse Ring 1 */}
              <motion.div
                animate={{
                  scale: [1, 1.45, 1.85],
                  opacity: [0.55, 0.25, 0],
                }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  inset: -14,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(4, 102, 200, 0.6)',
                  pointerEvents: 'none',
                }}
              />

              {/* Expanding Pulse Ring 2 */}
              <motion.div
                animate={{
                  scale: [1, 1.45, 1.85],
                  opacity: [0.55, 0.25, 0],
                }}
                transition={{
                  duration: 2.6,
                  delay: 1.3,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  inset: -14,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(249, 115, 22, 0.5)',
                  pointerEvents: 'none',
                }}
              />

              {/* Central Logo Disk */}
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '3px solid rgba(4, 102, 200, 0.65)',
                  boxShadow: '0 0 35px rgba(4, 102, 200, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 12,
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <img
                  src={aotmsLogo}
                  alt="AOTMS CRM"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Core Tagline */}
            <div style={{ textAlign: 'center', maxWidth: 540, marginBottom: 24 }}>
              <h3 style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 850, letterSpacing: '-0.02em', margin: '0 0 8px 0', color: '#ffffff' }}>
                AOTMS Enterprise Telecom CRM
              </h3>
              <p style={{ fontSize: 13.5, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Unified intelligence for autonomous voice telecalling, live WhatsApp campaigns, and instantaneous CRM pipeline updates.
              </p>
            </div>

            {/* Live Connected Nodes Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 14,
                width: '100%',
                marginTop: 8,
              }}
            >
              {CRM_LIVE_CONNECTIONS.map((conn, idx) => {
                const Icon = conn.icon;
                const isSelected = activePulse === idx;

                return (
                  <motion.div
                    key={conn.id}
                    animate={{
                      borderColor: isSelected ? conn.color : 'rgba(255, 255, 255, 0.08)',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    }}
                    transition={{ duration: 0.4 }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: `${conn.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: conn.color,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                          {conn.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {conn.type}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 750, color: conn.color, fontFamily: 'monospace' }}>
                        {conn.latency}
                      </div>
                      <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>
                        ● Active
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Quick CTA Action Bar */}
          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              paddingTop: 20,
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13 }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span>Zero setup fees · Instant carrier routing · 24/7 dedicated support</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/login')}
                style={{
                  padding: '10px 22px',
                  borderRadius: 9999,
                  background: 'linear-gradient(135deg, #0466c8, #0353a4)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(4, 102, 200, 0.4)',
                }}
              >
                <span>Access CRM Portal</span>
                <ArrowUpRight size={14} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            CLEAN FOOTER BOTTOM BAR
            ══════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            paddingTop: 14,
            fontSize: 12.5,
            color: '#64748b',
          }}
        >
          {/* Copyright */}
          <div>
            © 2026 AOTMS CRM. All rights reserved. Built for telecom & enterprise sales teams.
          </div>

          {/* Direct Support & Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              support@aotms.com
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              +91 80 4567 8900
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4ade80' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
