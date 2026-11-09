import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Radio,
  Layers,
  Cpu,
} from 'lucide-react';
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
import { ShinyText } from '../../components/ui/ShinyText';
import aotmsLogo from '../../assets/Logo.png';
import {
  accent,
  border,
  brand,
  cobalt,
  fonts,
  layout,
  radii,
  shadows,
  surface,
  text,
} from './theme';

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
    <section
      id="services"
      style={{
        position: 'relative',
        background: surface.subtle,
        padding: `${layout.sectionY} ${layout.gutter}`,
        overflow: 'hidden',
      }}
    >
      {/* Anchor for Navbar link */}
      <div id="integrations" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />

      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 1100,
          height: 480,
          background: 'radial-gradient(ellipse at 50% 25%, rgba(37, 99, 235, 0.07) 0%, transparent 68%)',
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
              padding: '6px 16px',
              borderRadius: radii.pill,
              background: surface.page,
              border: `1px solid ${cobalt[200]}`,
              marginBottom: 18,
              boxShadow: 'none',
            }}
          >
            <Sparkles size={13} strokeWidth={2.4} color={brand.base} />
            <ShinyText
              text="LIVE NATIVE CONNECTORS & API PIPELINE"
              speed={3.5}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.10em',
                color: cobalt[700],
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
              fontSize: 'clamp(30px, 4.2vw, 46px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              color: text.primary,
              margin: '0 0 16px 0',
              fontFamily: fonts.display,
            }}
          >
            Connects with the platforms you already use
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              color: text.tertiary,
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              maxWidth: 720,
              margin: '0 auto',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Real, native API integrations — not just webhook stubs. Route telephony calls, capture social ads, sync Google Sheets, and trigger WhatsApp dispatches in under 120ms.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            ANIMATED BEAM INTERACTIVE CANVAS (MIDDLE LOGO - WHITE THEME)
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative flex min-h-[480px] md:min-h-[520px] w-full items-center justify-center overflow-hidden rounded-[28px] border border-[#E1E7F1] bg-white p-6 md:p-12 shadow-[0_28px_70px_-30px_rgba(11,17,32,0.22)]"
          ref={containerRef}
          style={{
            backgroundImage: `radial-gradient(rgba(17, 24, 41, 0.07) 1.2px, transparent 1.2px)`,
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
              background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
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
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.18)] hover:border-emerald-400 hover:scale-105 transition-all cursor-pointer group"
                title="Google Sheets 2-Way Sync"
              >
                <SiGooglesheets size={24} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#111829]">Google Sheets</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">2-Way Live Sync</div>
              </div>
            </div>

            {/* 2. WhatsApp Cloud */}
            <div className="flex items-center gap-3">
              <div
                ref={whatsappRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(34,197,94,0.18)] hover:border-green-400 hover:scale-105 transition-all cursor-pointer group"
                title="WhatsApp Cloud API"
              >
                <SiWhatsapp size={24} className="text-green-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#111829]">WhatsApp</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">Meta Cloud API</div>
              </div>
            </div>

            {/* 3. Meta Facebook Ads */}
            <div className="flex items-center gap-3">
              <div
                ref={metaRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.18)] hover:border-blue-400 hover:scale-105 transition-all cursor-pointer group"
                title="Facebook Lead Ads Webhook"
              >
                <SiFacebook size={24} className="text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#111829]">Meta Ads</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">&lt; 80ms Ingest</div>
              </div>
            </div>

            {/* 4. Google Drive */}
            <div className="flex items-center gap-3">
              <div
                ref={driveRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.18)] hover:border-amber-400 hover:scale-105 transition-all cursor-pointer group"
                title="Google Drive Document Storage"
              >
                <SiGoogledrive size={24} className="text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#111829]">Google Drive</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">Cloud Attachments</div>
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
              className="z-20 flex size-20 md:size-24 items-center justify-center rounded-full border-2 border-[#2563EB]/40 bg-white p-3.5 shadow-[0_12px_38px_rgba(37,99,235,0.24)] relative cursor-pointer"
            >
              <img
                src={aotmsLogo}
                alt="AOTMS CRM"
                className="h-full w-full object-contain"
              />
              <span className="absolute -bottom-7 whitespace-nowrap text-[10px] font-mono font-semibold tracking-[0.14em] text-[#1D4ED8] bg-[#EFF4FF] px-3 py-1 rounded-full border border-[#BFD2FD] shadow-sm">
                AOTMS CORE CRM
              </span>
            </motion.div>
          </div>

          {/* Right Column Platforms */}
          <div className="z-10 flex flex-col justify-between h-[360px] md:h-[400px] shrink-0">
            {/* 1. Airtel Telephony */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#111829]">Airtel Telecom</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">SIP Trunk & VoIP</div>
              </div>
              <div
                ref={airtelRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(239,68,68,0.18)] hover:border-red-400 hover:scale-105 transition-all cursor-pointer group"
                title="Airtel Enterprise SIP Trunk"
              >
                <SiAirtel size={24} className="text-red-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 2. Gmail */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#111829]">Gmail & SMTP</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">Transactional Mail</div>
              </div>
              <div
                ref={gmailRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(244,63,94,0.18)] hover:border-rose-400 hover:scale-105 transition-all cursor-pointer group"
                title="Gmail & Enterprise SMTP"
              >
                <SiGmail size={24} className="text-rose-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 3. Zapier Automation */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#111829]">Zapier</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">5,000+ App Triggers</div>
              </div>
              <div
                ref={zapierRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(249,115,22,0.18)] hover:border-orange-400 hover:scale-105 transition-all cursor-pointer group"
                title="Zapier & Webhooks Automation"
              >
                <SiZapier size={24} className="text-orange-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 4. Razorpay Payments */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-[#111829]">Razorpay</div>
                <div className="text-[10px] text-[#5F6E8C] font-medium">Instant UPI Links</div>
              </div>
              <div
                ref={razorpayRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.18)] hover:border-blue-400 hover:scale-105 transition-all cursor-pointer group"
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
            pathColor="#C9D2E1"
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
            pathColor="#C9D2E1"
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
            pathColor="#C9D2E1"
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
            pathColor="#C9D2E1"
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
            pathColor="#C9D2E1"
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
            pathColor="#C9D2E1"
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
            pathColor="#C9D2E1"
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
            pathColor="#C9D2E1"
            pathWidth={2}
            pathOpacity={0.65}
          />
        </motion.div>

        {/* ══════════════════════════════════════════════
            INTEGRATION METRICS CARDS (BOTTOM STRIP)
            ══════════════════════════════════════════════ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            marginTop: 36,
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              borderRadius: radii.lg,
              background: surface.page,
              border: `1px solid ${border.hairline}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.sm,
                background: brand.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brand.base,
                flexShrink: 0,
              }}
            >
              <Zap size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: text.primary, letterSpacing: '-0.015em' }}>&lt; 80ms</div>
              <div style={{ fontSize: 12.5, color: text.tertiary, fontWeight: 500 }}>Webhook Sync Latency</div>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderRadius: radii.lg,
              background: surface.page,
              border: `1px solid ${border.hairline}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.sm,
                background: accent.emerald.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accent.emerald.text,
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: text.primary, letterSpacing: '-0.015em' }}>99.9% Uptime</div>
              <div style={{ fontSize: 12.5, color: text.tertiary, fontWeight: 500 }}>Carrier SIP & WebRTC</div>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderRadius: radii.lg,
              background: surface.page,
              border: `1px solid ${border.hairline}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.sm,
                background: accent.teal.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accent.teal.text,
                flexShrink: 0,
              }}
            >
              <Layers size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: text.primary, letterSpacing: '-0.015em' }}>100+ Connectors</div>
              <div style={{ fontSize: 12.5, color: text.tertiary, fontWeight: 500 }}>Native CRM & Ad APIs</div>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderRadius: radii.lg,
              background: surface.page,
              border: `1px solid ${border.hairline}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: shadows.xs,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.sm,
                background: accent.amber.tint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accent.amber.text,
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: text.primary, letterSpacing: '-0.015em' }}>0% Leakage</div>
              <div style={{ fontSize: 12.5, color: text.tertiary, fontWeight: 500 }}>Automated Round-Robin</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default IntegrationsSection;
