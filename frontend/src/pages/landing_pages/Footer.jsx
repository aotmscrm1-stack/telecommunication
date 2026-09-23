import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Phone,
  Mail,
  MapPin,
  ChevronUp,
  Globe,
  Radio,
  Lock,
  Heart,
} from 'lucide-react';
import {
  FaLinkedin,
  FaTwitter,
  FaGithub,
  FaYoutube,
  FaTelegramPlane,
} from 'react-icons/fa';
import aotmsLogo from '../../assets/aotms-global-logo.png';

export const Footer = () => {
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      id="contact"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #0b1120 0%, #070a12 100%)',
        color: '#94a3b8',
        padding: '90px 24px 44px',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Ambient Top Glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 240,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(4, 102, 200, 0.20) 0%, rgba(249, 115, 22, 0.06) 40%, transparent 75%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* ══════════════════════════════════════════════
            TOP ELEVATED CALLOUT BANNER
            ══════════════════════════════════════════════ */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 22,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '28px 32px',
            marginBottom: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
            >
              <img
                src={aotmsLogo}
                alt="AOTMS"
                style={{ height: 30, width: 'auto', display: 'block' }}
              />
            </div>

            <div>
              <div style={{ color: '#ffffff', fontSize: 16, fontWeight: 750, letterSpacing: '-0.01em' }}>
                AOTMS Telecommunications CRM
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                Next-generation pipeline, VoIP softphone, and WhatsApp automation suite.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 9999,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                color: '#4ade80',
                fontSize: 12,
                fontWeight: 650,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px #22c55e',
                }}
              />
              All Systems Operational · 99.99% Uptime
            </div>

            <button
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 9999,
                border: 'none',
                background: 'linear-gradient(135deg, #0466c8, #0353a4)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 750,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(4, 102, 200, 0.4)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 2px #f97316, 0 0 20px rgba(249, 115, 22, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(4, 102, 200, 0.4)';
              }}
            >
              Access CRM Portal
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            MULTI-COLUMN ENTERPRISE NAVIGATION
            ══════════════════════════════════════════════ */}
        <div className="footer-columns-grid">
          {/* Column 1: Product & Features */}
          <div>
            <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 750, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 18 }}>
              Platform & Features
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13.5 }}>
              <li><a href="#features" className="footer-link">Smart UI Lead Pipeline</a></li>
              <li><a href="#features" className="footer-link">1-Click Browser VoIP Dialer</a></li>
              <li><a href="#features" className="footer-link">WhatsApp Cloud 2-Way Bot</a></li>
              <li><a href="#features" className="footer-link">Automated Task Reminders</a></li>
              <li><a href="#features" className="footer-link">Sales Team Leaderboard & KPIs</a></li>
              <li><a href="#features" className="footer-link">Live Employee Geo-Radar</a></li>
              <li><a href="#features" className="footer-link">Excel Bulk Ingest & Clean</a></li>
            </ul>
          </div>

          {/* Column 2: Integrations */}
          <div>
            <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 750, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 18 }}>
              Integrations
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13.5 }}>
              <li><a href="#integrations" className="footer-link">Facebook Lead Ads</a></li>
              <li><a href="#integrations" className="footer-link">WhatsApp Business API</a></li>
              <li><a href="#integrations" className="footer-link">Knowlarity & CallerDesk PBX</a></li>
              <li><a href="#integrations" className="footer-link">JustDial & 99acres Hub</a></li>
              <li><a href="#integrations" className="footer-link">Google Workspace & Gmail</a></li>
              <li><a href="#integrations" className="footer-link">n8n Automation Engine</a></li>
              <li><a href="#integrations" className="footer-link">Custom REST API & Webhooks</a></li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div>
            <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 750, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 18 }}>
              Solutions
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13.5 }}>
              <li><a href="#pricing" className="footer-link">Telecom Network Operators</a></li>
              <li><a href="#pricing" className="footer-link">Inbound & Outbound Call Centers</a></li>
              <li><a href="#pricing" className="footer-link">BPO & Remote Sales Force</a></li>
              <li><a href="#pricing" className="footer-link">Real Estate Tele-Brokers</a></li>
              <li><a href="#pricing" className="footer-link">Role-Based Permission Guard</a></li>
              <li><a href="#pricing" className="footer-link">Director Audit & HR Governance</a></li>
            </ul>
          </div>

          {/* Column 4: Security & Compliance */}
          <div>
            <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 750, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 18 }}>
              Security & Trust
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <ShieldCheck size={18} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong style={{ color: '#e2e8f0', display: 'block' }}>256-Bit SSL Encryption</strong>
                  Bank-grade security for all lead data and call records.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Lock size={18} color="#0466c8" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong style={{ color: '#e2e8f0', display: 'block' }}>SOC-2 Type II Certified</strong>
                  Rigorous audits and automated failover recovery.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Radio size={18} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong style={{ color: '#e2e8f0', display: 'block' }}>Sub-100ms Ingestion</strong>
                  High-throughput telecom webhook processing.
                </span>
              </div>
            </div>
          </div>

          {/* Column 5: Direct Support & Contact */}
          <div>
            <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 750, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 18 }}>
              Direct Support
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={16} color="#38bdf8" />
                <a href="mailto:support@aotms.com" className="footer-link" style={{ color: '#e2e8f0' }}>
                  support@aotms.com
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={16} color="#34d399" />
                <span style={{ color: '#e2e8f0' }}>+91 80 4567 8900</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                <MapPin size={16} color="#fb923c" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: '#94a3b8', lineHeight: 1.4 }}>
                  AOTMS Global HQ<br />Tech Park, Bangalore, India
                </span>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                  Connect With Us
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <a href="#linkedin" className="social-icon" aria-label="LinkedIn"><FaLinkedin size={15} /></a>
                  <a href="#x" className="social-icon" aria-label="X"><FaTwitter size={15} /></a>
                  <a href="#github" className="social-icon" aria-label="GitHub"><FaGithub size={15} /></a>
                  <a href="#youtube" className="social-icon" aria-label="YouTube"><FaYoutube size={15} /></a>
                  <a href="#telegram" className="social-icon" aria-label="Telegram"><FaTelegramPlane size={15} /></a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            BOTTOM STRIP: COPYRIGHT & BACK TO TOP
            ══════════════════════════════════════════════ */}
        <div
          style={{
            marginTop: 64,
            paddingTop: 28,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
            <span>&copy; {new Date().getFullYear()} AOTMS Telecommunication Global Inc. All rights reserved.</span>
            <span>•</span>
            <a href="#privacy" className="footer-sublink">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="footer-sublink">Terms of Service</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Built with precision for enterprise telecom teams
            </span>

            <button
              onClick={scrollToTop}
              className="scroll-top-btn"
              aria-label="Scroll back to top"
            >
              <span>Back to top</span>
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CSS HOVER & GRID STYLING
          ══════════════════════════════════════════════ */}
      <style>{`
        .footer-columns-grid {
          display: grid;
          grid-template-columns: 1.3fr 1.3fr 1.2fr 1.4fr 1.3fr;
          gap: 36px;
        }

        @media (max-width: 1200px) {
          .footer-columns-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 32px;
          }
        }

        @media (max-width: 768px) {
          .footer-columns-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 28px;
          }
        }

        @media (max-width: 480px) {
          .footer-columns-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        .footer-link {
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.2s ease, transform 0.2s ease;
          display: inline-block;
        }

        .footer-link:hover {
          color: #ffffff;
          transform: translateX(3px);
        }

        .footer-sublink {
          color: #64748b;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-sublink:hover {
          color: #cbd5e1;
        }

        .social-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justifyContent: center;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .social-icon:hover {
          background: rgba(4, 102, 200, 0.2);
          border-color: #0466c8;
          color: #ffffff;
          transform: translateY(-2px);
        }

        .scroll-top-btn {
          display: inline-flex;
          alignItems: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .scroll-top-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
      `}</style>
    </footer>
  );
};

export default Footer;
