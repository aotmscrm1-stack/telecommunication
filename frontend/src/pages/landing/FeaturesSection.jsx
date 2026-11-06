import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PhoneCall,
  MessageSquare,
  Users,
  CheckCircle2,
  BarChart3,
  Layers,
  ArrowRight,
  Sparkles,
  Bot,
  FileText,
  ShieldCheck,
  Radio,
  Zap,
  Clock,
  Send,
  Building2,
  Lock,
} from 'lucide-react';
import {
  SiAirtel,
  SiJio,
  SiVodafone,
  SiWhatsapp,
  SiMeta,
  SiGooglecloud,
  SiRazorpay,
} from 'react-icons/si';
import { MarqueeLogoScroller } from '../../components/ui/marquee-logo-scroller';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { ShinyText } from '../../components/ui/ShinyText';

// SVG fallbacks for additional partners in the CRM ecosystem
const TwilioIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="9" r="2" />
    <circle cx="15" cy="9" r="2" />
    <circle cx="9" cy="15" r="2" />
    <circle cx="15" cy="15" r="2" />
  </svg>
);

const AwsIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.77 15.6c-.24-.18-.72-.37-1.42-.37-.87 0-1.74.34-2.38.86-.31.25-.45.54-.45.86 0 .58.46 1.05 1.15 1.05.6 0 1.25-.33 1.76-.84.21-.21.34-.38.34-.56v-1zm-3.8-2.61c.85-.31 1.94-.48 2.92-.48 1.16 0 2.22.25 2.87.75.58.45.87 1.12.87 2.02v3.91c0 .48.06.94.18 1.34.1.34.02.66-.23.86-.23.18-.58.18-.84 0-.17-.12-.32-.38-.41-.75-.48.56-1.32.96-2.31.96-1.52 0-2.66-.9-2.66-2.35 0-1.12.72-2.02 1.83-2.38.9-.29 2.19-.34 3.32-.34v-.32c0-.52-.16-.92-.47-1.18-.36-.31-1.01-.43-1.73-.43-.89 0-1.85.22-2.52.56-.25.13-.53.07-.71-.12l-.28-.31c-.13-.15-.1-.43.1-.64zM6.9 14.36c-.45-.48-.75-1.16-.75-1.99 0-1.54 1.03-2.73 2.5-2.73 1.33 0 2.23.95 2.23 2.37 0 .28-.03.54-.08.77H6.9zm-2.05-2.1c0 2.45 1.7 4.3 4.26 4.3 1.48 0 2.68-.61 3.44-1.72.18-.26.15-.57-.07-.76l-.42-.36c-.19-.16-.48-.12-.7.09-.54.54-1.29.9-2.22.9-1.39 0-2.39-.93-2.49-2.29h6.14c.26 0 .47-.2.5-.46.04-.3.06-.61.06-.94 0-2.41-1.61-4.22-3.95-4.22-2.7 0-4.55 2.1-4.55 4.5zm16.57 6.43c-3.1 2.29-7.39 3.51-11.83 3.51-5.63 0-10.74-2.04-14.59-5.46-.3-.27-.08-.63.26-.45 3.99 2.16 8.87 3.47 13.99 3.47 4.14 0 8.35-1.01 11.84-3.04.53-.31.97.24.33.97z" />
  </svg>
);

const SalesforceIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.15 6.44a5.16 5.16 0 0 1 4.54-2.44 5.2 5.2 0 0 1 5.09 4.11 4.67 4.67 0 0 1 3.22 4.45 4.7 4.7 0 0 1-4.7 4.69h-14a4.25 4.25 0 0 1-4.3-4.25 4.25 4.25 0 0 1 2.92-4.04 4.5 4.5 0 0 1 4.1-3.6 4.7 4.7 0 0 1 3.13 1.08z" />
  </svg>
);

const TruecallerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.43-3.9-6.8-6.72l1.97-1.61a.99.99 0 0 0 .26-1.02 18.28 18.28 0 0 1-.58-3.55c-.06-.54-.51-.95-1.06-.95H4.21c-.61 0-1.12.51-1.1 1.12.19 5.86 2.65 11.23 6.64 15.22 3.99 3.99 9.36 6.45 15.22 6.64.61.02 1.12-.49 1.12-1.1v-3.48c0-.55-.41-1-.95-1.06-.73-.09-1.46-.22-2.13-.42zM19 8h2a9.01 9.01 0 0 0-9-9v2a7 7 0 0 1 7 7zm-4 0h2a5.006 5.006 0 0 0-5-5v2a3 3 0 0 1 3 3z" />
  </svg>
);

const TataIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 6h16v3H13.5v9h-3V9H4V6zm2 6h4v2H6v-2zm8 0h4v2h-4v-2z" />
  </svg>
);

/* ─────────────────────────────────────────────────────────
   CRM TELECOM & ENTERPRISE MARQUEE PARTNERS
   ───────────────────────────────────────────────────────── */
const CRM_PARTNERS = [
  {
    alt: 'Airtel Business',
    label: 'Airtel Telecom',
    icon: <SiAirtel size={30} color="#EF4444" />,
    gradient: { from: '#EF4444', via: '#DC2626', to: '#991B1B' },
  },
  {
    alt: 'Jio 5G Enterprise',
    label: 'Jio Enterprise',
    icon: <SiJio size={32} color="#2563EB" />,
    gradient: { from: '#3B82F6', via: '#1D4ED8', to: '#1E3A8A' },
  },
  {
    alt: 'WhatsApp Cloud API',
    label: 'WhatsApp Cloud',
    icon: <SiWhatsapp size={30} color="#22C55E" />,
    gradient: { from: '#22C55E', via: '#16A34A', to: '#14532D' },
  },
  {
    alt: 'Google Cloud Platform',
    label: 'Google Cloud',
    icon: <SiGooglecloud size={28} color="#3B82F6" />,
    gradient: { from: '#60A5FA', via: '#3B82F6', to: '#1D4ED8' },
  },
  {
    alt: 'Vodafone Idea Vi',
    label: 'Vi Business',
    icon: <SiVodafone size={28} color="#DC2626" />,
    gradient: { from: '#F87171', via: '#DC2626', to: '#991B1B' },
  },
  {
    alt: 'Twilio Cloud SIP',
    label: 'Twilio Voice',
    icon: <TwilioIcon />,
    gradient: { from: '#F43F5E', via: '#E11D48', to: '#9F1239' },
  },
  {
    alt: 'AWS Connect',
    label: 'AWS Telecom',
    icon: <AwsIcon />,
    gradient: { from: '#F59E0B', via: '#D97706', to: '#B45309' },
  },
  {
    alt: 'Tata Tele Business',
    label: 'Tata SIP Trunk',
    icon: <TataIcon />,
    gradient: { from: '#6366F1', via: '#4F46E5', to: '#3730A3' },
  },
  {
    alt: 'Meta Official API',
    label: 'Meta Verified',
    icon: <SiMeta size={28} color="#0284C7" />,
    gradient: { from: '#38BDF8', via: '#0284C7', to: '#0369A1' },
  },
  {
    alt: 'Truecaller Verified',
    label: 'Truecaller ID',
    icon: <TruecallerIcon />,
    gradient: { from: '#0284C7', via: '#0369A1', to: '#075985' },
  },
  {
    alt: 'Salesforce CRM',
    label: 'Salesforce Sync',
    icon: <SalesforceIcon />,
    gradient: { from: '#38BDF8', via: '#0284C7', to: '#075985' },
  },
  {
    alt: 'Razorpay UPI',
    label: 'Razorpay Pay',
    icon: <SiRazorpay size={28} color="#2563EB" />,
    gradient: { from: '#2563EB', via: '#1D4ED8', to: '#1E40AF' },
  },
];

/* ─────────────────────────────────────────────────────────
   CRM CORE EXECUTION CAPABILITIES (BENTO GRID)
   ───────────────────────────────────────────────────────── */
const CRM_CORE_CAPABILITIES = [
  {
    id: 'ai-telecaller',
    tag: 'Autonomous · Voice AI',
    title: 'Autonomous AI Voice Telecaller',
    badge: '10,000+ Calls / Day',
    desc: 'Deploy human-sounding conversational voice agents in Telugu, Hindi & English. Qualifies leads, books appointments, and detects voicemails with zero latency.',
    icon: Bot,
    bg: '#FAF5FF',
    accent: '#7c3aed',
    highlight: 'Natural Indian Accents & Dialects',
    metric: '98.4% Qualification Accuracy',
  },
  {
    id: 'lead-pipeline',
    tag: 'Realtime · Zero Leakage',
    title: 'Omnichannel Smart Lead Pipeline',
    badge: '< 80ms Ingest',
    desc: 'Instantly ingest leads from Meta Ads, JustDial, IndiaMART, Sulekha & 99acres. Auto-assign to telecallers with weighted round-robin distribution and duplicate detection.',
    icon: Users,
    bg: '#F0F9FF',
    accent: '#0284c7',
    highlight: 'Multi-Tenant Lead Hierarchy',
    metric: '100% Zero Lead Leakage',
  },
  {
    id: 'cloud-telephony',
    tag: 'WebRTC · HD Stereo',
    title: '1-Click VoIP Dialer & Call Recording',
    badge: 'Live Call Whispering',
    desc: 'Built-in browser dialer with one-click calling, stereo recordings, auto disposition prompts, and manager barge-in capabilities for real-time sales coaching.',
    icon: PhoneCall,
    bg: '#FFFBEB',
    accent: '#d97706',
    highlight: 'Telecom PRI & SIP Trunking',
    metric: '99.9% Call Uptime SLA',
  },
  {
    id: 'whatsapp-crm',
    tag: 'Meta Verified · Official',
    title: 'Official WhatsApp Cloud Automation',
    badge: '99.8% Open Rate',
    desc: 'Trigger automated WhatsApp greetings, quotation PDFs, payment links, and scheduled follow-ups directly from lead cards with full 2-way chat sync.',
    icon: MessageSquare,
    bg: '#ECFDF5',
    accent: '#059669',
    highlight: 'Interactive Quick Reply Buttons',
    metric: 'Instant PDF Quote Dispatch',
  },
  {
    id: 'sales-leaderboard',
    tag: 'Live Telemetry · Gamified',
    title: 'Sales Team Leaderboard & Tracking',
    badge: 'Live Dial Rankings',
    desc: 'Motivate telecallers with real-time dial targets, closed revenue scoreboards, daily activity staging reviews, and geo-verified mobile attendance tracking.',
    icon: BarChart3,
    bg: '#FFF1F2',
    accent: '#e11d48',
    highlight: 'Field Force Geo-Attendance',
    metric: '3.4x Dials per Agent / Day',
  },
  {
    id: 'finance-docs',
    tag: 'Automated · GST Ready',
    title: '1-Click Invoices, Quotes & Receipts',
    badge: 'Instant PDF Export',
    desc: 'Generate branded GST Invoices, Quotations, Fee Receipts, Payslips, and Offer Letters straight from lead profiles with digital signatures and instant sharing.',
    icon: FileText,
    bg: '#F0FDF4',
    accent: '#16a34a',
    highlight: 'Auto Fee Splitting & Ledger',
    metric: 'Automated Accounts Sync',
  },
];

export function FeaturesSection() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <section
      id="about"
      style={{
        position: 'relative',
        background: '#ffffff',
        padding: 'clamp(64px, 8vw, 110px) clamp(20px, 5vw, 64px)',
        overflow: 'hidden',
      }}
    >
      {/* Anchor for Navbar link */}
      <div id="features" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />

      {/* Subtle background ambient radial gradient */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 1200,
          height: 400,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(4, 102, 200, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ══════════════════════════════════════════════
            SECTION HEADER
            ══════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          {/* Tag Pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 18px',
              borderRadius: 9999,
              background: 'rgba(4, 102, 200, 0.08)',
              border: '1px solid rgba(4, 102, 200, 0.22)',
              marginBottom: 16,
              boxShadow: '0 2px 10px rgba(4, 102, 200, 0.08)',
            }}
          >
            <Sparkles size={14} color="#0466c8" />
            <ShinyText
              text="ENTERPRISE WORKFLOWS & TELECOM INFRASTRUCTURE"
              speed={3.5}
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#0466c8',
              }}
            />
          </motion.div>

          {/* Main Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontSize: 'clamp(32px, 4.4vw, 48px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#0f172a',
              margin: '0 0 16px 0',
              fontFamily: '"Bricolage Grotesque", "Plus Jakarta Sans", "Inter", sans-serif',
            }}
          >
            Everything your sales team needs
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              color: '#64748b',
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              maxWidth: 720,
              margin: '0 auto',
              lineHeight: 1.65,
              fontWeight: 450,
            }}
          >
            The unified command center for telecom, real estate, education, and enterprise sales teams.
            Automate 10,000+ AI voice calls, connect official Meta WhatsApp, and close deals 3x faster.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            INTEGRATED MARQUEE LOGO SCROLLER (SHADCN UI)
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{ marginBottom: 54 }}
        >
          <MarqueeLogoScroller
            title="Connected to India's Leading Telecom & Enterprise Networks"
            description="Built on carrier-grade SIP trunking, low-latency VoIP routing, official Meta Cloud APIs, and real-time CRM database synchronization."
            logos={CRM_PARTNERS}
            speed="normal"
            className="border-slate-200/90 bg-white/90 shadow-sm"
          />
        </motion.div>

        {/* ══════════════════════════════════════════════
            CRM CORE CAPABILITIES (BENTO GRID - 3x2)
            ══════════════════════════════════════════════ */}
        <div className="crm-bento-grid">
          {CRM_CORE_CAPABILITIES.map((cap, index) => {
            const Icon = cap.icon;
            const isHovered = hoveredCard === cap.id;

            return (
              <motion.div
                key={cap.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                onMouseEnter={() => setHoveredCard(cap.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ height: '100%' }}
              >
                <SpotlightCard
                  spotlightColor="rgba(255, 255, 255, 0.85)"
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#ffffff',
                    borderRadius: 24,
                    border: isHovered
                      ? `1.5px solid ${cap.accent}`
                      : '1px solid rgba(226, 232, 240, 0.95)',
                    boxShadow: isHovered
                      ? `0 20px 42px rgba(0, 0, 0, 0.08), 0 0 24px ${cap.accent}20`
                      : '0 4px 20px rgba(0, 0, 0, 0.03)',
                    transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                    transition:
                      'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/login')}
                >
                  {/* Upper Header Strip */}
                  <div
                    style={{
                      background: cap.bg,
                      padding: '24px 26px 20px',
                      borderRadius: '22px 22px 0 0',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#0f172a',
                          background: 'rgba(255, 255, 255, 0.85)',
                          padding: '4px 12px',
                          borderRadius: 9999,
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {cap.tag}
                      </span>

                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: cap.accent,
                          background: `${cap.accent}14`,
                          padding: '4px 10px',
                          borderRadius: 8,
                        }}
                      >
                        {cap.badge}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: cap.accent,
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={22} strokeWidth={2.2} />
                      </div>

                      <h3
                        style={{
                          fontSize: 'clamp(18px, 1.4vw, 21px)',
                          fontWeight: 800,
                          lineHeight: 1.28,
                          letterSpacing: '-0.02em',
                          color: '#0f172a',
                          margin: 0,
                          fontFamily: '"Inter", sans-serif',
                        }}
                      >
                        {cap.title}
                      </h3>
                    </div>
                  </div>

                  {/* Body Text */}
                  <div
                    style={{
                      padding: '22px 26px',
                      display: 'flex',
                      flexDirection: 'column',
                      flexGrow: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: '#64748b',
                        margin: '0 0 20px 0',
                        fontWeight: 450,
                      }}
                    >
                      {cap.desc}
                    </p>

                    {/* Feature Highlight Pill */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: '#f8fafc',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#334155' }}>
                        {cap.highlight}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: cap.accent,
                        }}
                      >
                        {cap.metric}
                      </span>
                    </div>

                    {/* Bottom Action Strip */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTop: '1px solid rgba(226, 232, 240, 0.7)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: isHovered ? cap.accent : '#0f172a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'color 0.2s ease',
                        }}
                      >
                        Launch Module
                        <ArrowRight
                          size={14}
                          strokeWidth={2.4}
                          style={{
                            transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                            transition: 'transform 0.25s ease',
                          }}
                        />
                      </span>

                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: cap.accent,
                          boxShadow: `0 0 8px ${cap.accent}`,
                        }}
                      />
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            BOTTOM CONVERSION BANNER
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            marginTop: 54,
            padding: '30px clamp(20px, 4vw, 44px)',
            borderRadius: 24,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 800,
                color: '#38bdf8',
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}
            >
              <Zap size={15} />
              RAPID DEPLOYMENT GUARANTEED
            </div>
            <h3
              style={{
                fontSize: 'clamp(20px, 2vw, 24px)',
                fontWeight: 850,
                letterSpacing: '-0.02em',
                margin: '0 0 6px 0',
              }}
            >
              Ready to automate your telecalling operations?
            </h3>
            <p
              style={{
                fontSize: 14,
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Setup takes less than 3 minutes. Zero setup fees, instant carrier routing, and free onboarding assistance.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              style={{
                padding: '13px 26px',
                borderRadius: 9999,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 750,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4)',
              }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={16} strokeWidth={2.4} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/demo')}
              style={{
                padding: '13px 24px',
                borderRadius: 9999,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Book 1:1 Live Demo
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════
          RESPONSIVE BENTO GRID STYLING
          ══════════════════════════════════════════════ */}
      <style>{`
        .crm-bento-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          width: 100%;
        }

        @media (max-width: 1060px) {
          .crm-bento-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }
        }

        @media (max-width: 680px) {
          .crm-bento-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </section>
  );
}

export default FeaturesSection;
