import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import aotmsLogo from '../../assets/aotms-global-logo.png';
import HalftoneWordmarkFooter from '../../components/ui/halftone-wordmark-footer';

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <div id="contact" style={{ background: '#070a12', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient Top Glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 220,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(4, 102, 200, 0.20) 0%, rgba(249, 115, 22, 0.06) 40%, transparent 75%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Elevated Callout Banner */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px 0', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 22,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px 32px',
            marginBottom: 20,
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
                style={{ height: 28, width: 'auto', display: 'block' }}
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
      </div>

      {/* Halftone Wordmark Footer with giant "CRM" heading */}
      <HalftoneWordmarkFooter
        wordmark="CRM"
        label="AOTMS TELECOM"
        meta="©2026 · Next-Generation Enterprise CRM"
        height="560px"
        preset="night"
        palette={{
          background: '#070a12',
          ink: '#94a3b8',
          warm: '#f97316',
        }}
        crop={0.18}
        dotGap={6}
        radius={90}
        grain={0.4}
        columns={[
          {
            title: 'Platform',
            links: [
              { label: 'Smart UI Pipeline', href: '#features' },
              { label: '1-Click VoIP Dialer', href: '#features' },
              { label: 'WhatsApp Cloud Bot', href: '#features' },
              { label: 'Geo-Radar Tracking', href: '#features' },
              { label: 'Excel Bulk Ingest', href: '#features' },
            ],
          },
          {
            title: 'Integrations',
            links: [
              { label: 'Facebook Lead Ads', href: '#integrations' },
              { label: 'WhatsApp Business API', href: '#integrations' },
              { label: 'Knowlarity PBX', href: '#integrations' },
              { label: 'n8n Automation Engine', href: '#integrations' },
              { label: 'REST APIs & Webhooks', href: '#integrations' },
            ],
          },
          {
            title: 'Solutions',
            links: [
              { label: 'Telecom Operators', href: '#pricing' },
              { label: 'Inbound & Outbound Centers', href: '#pricing' },
              { label: 'Remote Sales Teams', href: '#pricing' },
              { label: 'Role-Based Security', href: '#pricing' },
              { label: 'HR Governance Audit', href: '#pricing' },
            ],
          },
          {
            title: 'Direct Support',
            links: [
              { label: 'support@aotms.com', href: 'mailto:support@aotms.com' },
              { label: '+91 80 4567 8900', href: 'tel:+918045678900' },
              { label: 'Bangalore Tech Park, India', href: '#contact' },
              { label: '256-Bit SSL · SOC-2 Certified', href: '#contact' },
            ],
          },
        ]}
      />
    </div>
  );
};

export default Footer;
