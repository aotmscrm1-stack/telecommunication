import React from 'react';
import HalftoneWordmarkFooter from '../../components/ui/halftone-wordmark-footer';

const AOTMS_COLUMNS = [
  {
    title: 'Solutions',
    links: [
      { label: 'Voice AI Telecaller', href: '#features' },
      { label: 'WhatsApp Automation', href: '#integrations' },
      { label: 'Pipeline Lead Sync', href: '#features' },
      { label: 'Live Telemetry & Logs', href: '#features' },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { label: 'Airtel SIP Trunk', href: '#integrations' },
      { label: 'WhatsApp Cloud API', href: '#integrations' },
      { label: 'Google Sheets 2-Way', href: '#integrations' },
      { label: 'Razorpay UPI Gateway', href: '#integrations' },
    ],
  },
  {
    title: 'Enterprise Access',
    links: [
      { label: 'CRM Portal Login', href: '/login' },
      { label: 'support@aotms.com', href: 'mailto:support@aotms.com' },
      { label: '+91 80 4567 8900', href: 'tel:+918045678900' },
      { label: '256-Bit SSL Encrypted', href: '#contact' },
    ],
  },
];

export const Footer = () => {
  return (
    <div id="contact" className="w-full relative z-10 border-t border-white/10">
      <HalftoneWordmarkFooter
        wordmark="aotms"
        label="AOTMS CRM"
        meta="©2026 · Enterprise Telecom CRM"
        columns={AOTMS_COLUMNS}
        preset="night"
        palette={{
          background: '#060913',
          ink: '#e2e8f0',
          warm: '#38bdf8',
        }}
        dotGap={6}
        radius={85}
        crop={0.2}
        grain={0.4}
        interactive={true}
        height="560px"
        backToTop={true}
      />
    </div>
  );
};

export default Footer;
