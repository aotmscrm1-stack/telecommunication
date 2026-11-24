import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, ShieldCheck, CheckCircle2, Layers } from 'lucide-react';
import {
  SiGooglesheets,
  SiWhatsapp,
  SiFacebook,
  SiGoogledrive,
  SiAirtel,
  SiGmail,
  SiZapier,
  SiRazorpay,
} from 'react-icons/si';
import { AnimatedBeam } from '../../components/ui/animated-beam';
import aotmsLogo from '../../assets/Logo.png';

const METRICS = [
  { tone: 'orange', Icon: Zap, value: '7 Portals', label: 'JustDial, IndiaMart, 99acres & more' },
  { tone: 'forest', Icon: Layers, value: '2-Way WhatsApp', label: 'Official Meta Cloud API inbox' },
  { tone: 'pink', Icon: ShieldCheck, value: '10+ Connectors', label: 'Sheets, Drive, mail, payments, BI' },
  { tone: 'canvas', Icon: CheckCircle2, value: 'Open API', label: 'Tokens, webhooks & request logs' },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, delay },
});

export function IntegrationsSection() {
  const containerRef = useRef(null);
  const centerRef = useRef(null);

  // Left side: Inbound channels & data sources
  const sheetsRef = useRef(null);
  const whatsappRef = useRef(null);
  const metaRef = useRef(null);
  const driveRef = useRef(null);

  // Right side: Outbound actions & telecom infrastructure
  const airtelRef = useRef(null);
  const gmailRef = useRef(null);
  const zapierRef = useRef(null);
  const razorpayRef = useRef(null);

  return (
    <section id="services" className="hs-int">
      {/* Anchor for Navbar link */}
      <div id="integrations" className="hs-int__anchor" />

      <div className="hs-int__inner">
        {/* ══════════════════════════════════════════════
            SECTION HEADER
            ══════════════════════════════════════════════ */}
        <div className="hs-int__head">
          <motion.span className="hs-eyebrow" {...fadeUp(0)}>
            <Sparkles size={13} strokeWidth={2.4} />
            LEAD SOURCES, CHANNELS &amp; OPEN API
          </motion.span>

          <motion.h2 className="hs-int__title" {...fadeUp(0.1)}>
            Connects with the tools you already work in
          </motion.h2>

          <motion.p className="hs-int__lede" {...fadeUp(0.2)}>
            Real integrations, not just webhook stubs. Pull leads from ad platforms, sheets and
            classified portals, send on WhatsApp and email, dial over your SIP line, take payments
            and sync biometric attendance — while your own systems use the AOTMS API.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            ANIMATED BEAM INTERACTIVE CANVAS
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative flex min-h-[480px] md:min-h-[520px] w-full items-center justify-center overflow-hidden rounded-[12px] border border-[#E3E8EE] bg-white p-6 md:p-12"
          ref={containerRef}
          style={{
            backgroundImage: `radial-gradient(rgba(33, 51, 67, 0.07) 1.2px, transparent 1.2px)`,
            backgroundSize: '26px 26px',
          }}
        >
          {/* Subtle Ambient Radial Glow in center */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 380,
              height: 380,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 92, 53, 0.12) 0%, transparent 70%)',
              filter: 'blur(45px)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Left Column Platforms */}
          <div className="z-10 flex flex-col justify-between h-[360px] md:h-[400px] shrink-0">
            {/* 1. Google Sheets */}
            <div className="flex items-center gap-3">
              <div
                ref={sheetsRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="Google Sheets 2-Way Sync"
              >
                <SiGooglesheets size={24} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#213343]">Google Sheets</div>
                <div className="text-[10px] text-[#516F90] font-medium">2-Way Live Sync</div>
              </div>
            </div>

            {/* 2. WhatsApp Cloud */}
            <div className="flex items-center gap-3">
              <div
                ref={whatsappRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="WhatsApp Cloud API"
              >
                <SiWhatsapp size={24} className="text-green-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#213343]">WhatsApp</div>
                <div className="text-[10px] text-[#516F90] font-medium">Meta Cloud API</div>
              </div>
            </div>

            {/* 3. Meta Facebook Ads */}
            <div className="flex items-center gap-3">
              <div
                ref={metaRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="Facebook Lead Ads Webhook"
              >
                <SiFacebook size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#213343]">Meta Lead Ads</div>
                <div className="text-[10px] text-[#516F90] font-medium">Facebook · Instagram</div>
              </div>
            </div>

            {/* 4. Google Drive */}
            <div className="flex items-center gap-3">
              <div
                ref={driveRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="Google Drive Document Storage"
              >
                <SiGoogledrive size={24} className="text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#213343]">Google Drive</div>
                <div className="text-[10px] text-[#516F90] font-medium">Cloud Attachments</div>
              </div>
            </div>
          </div>

          {/* Middle Spacer & Logo */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-12 z-20">
            {/* Center Glowing Logo Node */}
            <motion.div
              ref={centerRef}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="z-20 flex size-20 md:size-24 items-center justify-center rounded-full border-2 border-[#FF5C35]/50 bg-white p-3.5 shadow-[0_12px_38px_rgba(255,92,53,0.24)] relative cursor-pointer"
            >
              <img
                src={aotmsLogo}
                alt="AOTMS CRM"
                className="h-full w-full object-contain"
              />
              <span className="absolute -bottom-7 whitespace-nowrap text-[10px] font-mono font-semibold tracking-[0.14em] text-[#E24B22] bg-[#FFF3EF] px-3 py-1 rounded-full border border-[#FFD9CD] shadow-sm">
                AOTMS CORE
              </span>
            </motion.div>
          </div>

          {/* Right Column Platforms */}
          <div className="z-10 flex flex-col justify-between h-[360px] md:h-[400px] shrink-0">
            {/* 1. Airtel Telephony */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#213343]">Airtel &amp; Cloud SIP</div>
                <div className="text-[10px] text-[#516F90] font-medium">Telephony Lines</div>
              </div>
              <div
                ref={airtelRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="Airtel Enterprise SIP Trunk"
              >
                <SiAirtel size={24} className="text-red-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 2. Gmail */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#213343]">Gmail &amp; SMTP</div>
                <div className="text-[10px] text-[#516F90] font-medium">Email CRM &amp; Blasts</div>
              </div>
              <div
                ref={gmailRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="Gmail & Enterprise SMTP"
              >
                <SiGmail size={24} className="text-rose-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 3. Zapier Automation */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#213343]">n8n &amp; Zapier</div>
                <div className="text-[10px] text-[#516F90] font-medium">Automation &amp; Webhooks</div>
              </div>
              <div
                ref={zapierRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="Zapier & Webhooks Automation"
              >
                <SiZapier size={24} className="text-orange-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 4. Razorpay Payments */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#213343]">Razorpay</div>
                <div className="text-[10px] text-[#516F90] font-medium">Instant UPI Links</div>
              </div>
              <div
                ref={razorpayRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-lg border border-[#E3E8EE] bg-white p-3 shadow-[0_2px_8px_rgba(33,51,67,0.06)] hover:shadow-[0_10px_22px_rgba(33,51,67,0.14)] hover:border-[#CBD6E2] hover:scale-105 transition-all cursor-pointer group"
                title="Razorpay Payment Links"
              >
                <SiRazorpay size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════
              ANIMATED BEAMS (INBOUND: LEFT -> CENTER)
              ══════════════════════════════════════════════ */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={sheetsRef}
            toRef={centerRef}
            curvature={-70}
            endYOffset={-14}
            gradientStartColor="#0F9D58"
            gradientStopColor="#10B981"
            duration={3.2}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={whatsappRef}
            toRef={centerRef}
            curvature={-25}
            endYOffset={-6}
            gradientStartColor="#25D366"
            gradientStopColor="#059669"
            duration={2.8}
            delay={0.4}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={metaRef}
            toRef={centerRef}
            curvature={25}
            endYOffset={6}
            gradientStartColor="#1877F2"
            gradientStopColor="#2563EB"
            duration={3.0}
            delay={0.8}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={driveRef}
            toRef={centerRef}
            curvature={70}
            endYOffset={14}
            gradientStartColor="#F59E0B"
            gradientStopColor="#EA4335"
            duration={3.4}
            delay={1.2}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />

          {/* ══════════════════════════════════════════════
              ANIMATED BEAMS (OUTBOUND: CENTER -> RIGHT)
              ══════════════════════════════════════════════ */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={airtelRef}
            curvature={-70}
            startYOffset={-14}
            gradientStartColor="#EF4444"
            gradientStopColor="#DC2626"
            duration={3.0}
            delay={0.2}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={gmailRef}
            curvature={-25}
            startYOffset={-6}
            gradientStartColor="#EA4335"
            gradientStopColor="#DC2626"
            duration={2.9}
            delay={0.6}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={zapierRef}
            curvature={25}
            startYOffset={6}
            gradientStartColor="#FF4F00"
            gradientStopColor="#EA580C"
            duration={3.1}
            delay={1.0}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={razorpayRef}
            curvature={70}
            startYOffset={14}
            gradientStartColor="#2563EB"
            gradientStopColor="#0284C7"
            duration={3.3}
            delay={1.4}
            pathColor="#CBD6E2"
            pathWidth={2}
            pathOpacity={0.65}
          />
        </motion.div>

        {/* ══════════════════════════════════════════════
            INTEGRATION METRICS CARDS (BOTTOM STRIP)
            ══════════════════════════════════════════════ */}
        <div className="hs-int__metrics">
          {METRICS.map(({ tone, Icon, value, label }) => (
            <div key={label} className="hs-int__metric">
              <span className={`hs-int__metric-icon hs-int__metric-icon--${tone}`}>
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <div>
                <div className="hs-int__metric-value">{value}</div>
                <div className="hs-int__metric-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hs-int {
          position: relative;
          background: var(--hs-canvas);
          padding: clamp(56px, 7vw, 96px) 0;
          font-family: var(--hs-ui);
          overflow: hidden;
        }
        .hs-int__anchor { position: absolute; top: 0; left: 0; pointer-events: none; }
        .hs-int__inner {
          position: relative;
          z-index: 1;
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
        }

        .hs-int__head {
          text-align: center;
          max-width: 760px;
          margin: 0 auto clamp(36px, 4vw, 56px);
        }
        .hs-int__title {
          margin: 22px 0 16px;
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: var(--hs-navy);
        }
        .hs-int__lede {
          margin: 0 auto;
          max-width: 700px;
          font-size: 16px;
          line-height: 1.75;
          color: var(--hs-muted);
        }

        .hs-int__metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-top: clamp(24px, 3vw, 36px);
        }
        .hs-int__metric {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px 24px;
          background: var(--hs-white);
          border: 1px solid var(--hs-line);
          border-radius: 10px;
        }
        .hs-int__metric-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          border-radius: 6px;
        }
        .hs-int__metric-icon--orange { background: var(--hs-orange-soft); color: var(--hs-orange-active); }
        .hs-int__metric-icon--forest { background: var(--hs-forest); color: var(--hs-forest-text); }
        .hs-int__metric-icon--pink { background: var(--hs-pink-soft); color: var(--hs-pink-text); }
        .hs-int__metric-icon--canvas {
          background: var(--hs-canvas);
          color: var(--hs-navy);
          border: 1px solid var(--hs-line);
        }
        .hs-int__metric-value {
          font-family: var(--hs-serif);
          font-size: 21px;
          line-height: 1.2;
          letter-spacing: -0.01em;
          color: var(--hs-navy);
        }
        .hs-int__metric-label { margin-top: 2px; font-size: 12.5px; font-weight: 500; color: var(--hs-muted); }
      `}</style>
    </section>
  );
}

export default IntegrationsSection;
