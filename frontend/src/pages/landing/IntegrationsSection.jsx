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
        background: '#ffffff',
        padding: 'clamp(64px, 8vw, 110px) clamp(20px, 5vw, 64px)',
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
              text="LIVE NATIVE CONNECTORS & API PIPELINE"
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
            Connects with the platforms you already use
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
            Real, native API integrations — not just webhook stubs. Route telephony calls, capture social ads, sync Google Sheets, and trigger WhatsApp dispatches in under 120ms.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            ANIMATED BEAM INTERACTIVE CANVAS (MIDDLE LOGO)
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative flex min-h-[480px] md:min-h-[520px] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-800/80 bg-[#070a12] p-6 md:p-12 shadow-2xl"
          ref={containerRef}
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
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
              background: 'radial-gradient(circle, rgba(4, 102, 200, 0.20) 0%, transparent 70%)',
              filter: 'blur(50px)',
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
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-emerald-400 hover:scale-105 transition-all cursor-pointer group"
                title="Google Sheets 2-Way Sync"
              >
                <SiGooglesheets size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-200">Google Sheets</div>
                <div className="text-[10px] text-slate-400 font-mono">2-Way Live Sync</div>
              </div>
            </div>

            {/* 2. WhatsApp Cloud */}
            <div className="flex items-center gap-3">
              <div
                ref={whatsappRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-green-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-green-400 hover:scale-105 transition-all cursor-pointer group"
                title="WhatsApp Cloud API"
              >
                <SiWhatsapp size={24} className="text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-200">WhatsApp</div>
                <div className="text-[10px] text-slate-400 font-mono">Meta Cloud API</div>
              </div>
            </div>

            {/* 3. Meta Facebook Ads */}
            <div className="flex items-center gap-3">
              <div
                ref={metaRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-blue-400 hover:scale-105 transition-all cursor-pointer group"
                title="Facebook Lead Ads Webhook"
              >
                <SiFacebook size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-200">Meta Ads</div>
                <div className="text-[10px] text-slate-400 font-mono">&lt; 80ms Ingest</div>
              </div>
            </div>

            {/* 4. Google Drive */}
            <div className="flex items-center gap-3">
              <div
                ref={driveRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-amber-400 hover:scale-105 transition-all cursor-pointer group"
                title="Google Drive Document Storage"
              >
                <SiGoogledrive size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-200">Google Drive</div>
                <div className="text-[10px] text-slate-400 font-mono">Cloud Attachments</div>
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
              className="z-20 flex size-20 md:size-24 items-center justify-center rounded-full border-2 border-blue-400/60 bg-white p-3 shadow-[0_0_50px_rgba(4,102,200,0.5)] relative cursor-pointer"
            >
              <img
                src={aotmsLogo}
                alt="AOTMS CRM"
                className="h-full w-full object-contain"
              />
              <span className="absolute -bottom-7 whitespace-nowrap text-[10.5px] font-mono font-bold tracking-wider text-blue-300 bg-slate-900/90 px-3 py-1 rounded-full border border-blue-500/40 shadow-md">
                AOTMS CORE CRM
              </span>
            </motion.div>
          </div>

          {/* Right Column Platforms */}
          <div className="z-10 flex flex-col justify-between h-[360px] md:h-[400px] shrink-0">
            {/* 1. Airtel Telephony */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-200">Airtel Telecom</div>
                <div className="text-[10px] text-slate-400 font-mono">SIP Trunk & VoIP</div>
              </div>
              <div
                ref={airtelRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-red-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-red-400 hover:scale-105 transition-all cursor-pointer group"
                title="Airtel Enterprise SIP Trunk"
              >
                <SiAirtel size={24} className="text-red-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 2. Gmail */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-200">Gmail & SMTP</div>
                <div className="text-[10px] text-slate-400 font-mono">Transactional Mail</div>
              </div>
              <div
                ref={gmailRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-rose-400 hover:scale-105 transition-all cursor-pointer group"
                title="Gmail & Enterprise SMTP"
              >
                <SiGmail size={24} className="text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 3. Zapier Automation */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-200">Zapier</div>
                <div className="text-[10px] text-slate-400 font-mono">5,000+ App Triggers</div>
              </div>
              <div
                ref={zapierRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-orange-400 hover:scale-105 transition-all cursor-pointer group"
                title="Zapier & Webhooks Automation"
              >
                <SiZapier size={24} className="text-orange-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* 4. Razorpay Payments */}
            <div className="flex items-center justify-end gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-200">Razorpay</div>
                <div className="text-[10px] text-slate-400 font-mono">Instant UPI Links</div>
              </div>
              <div
                ref={razorpayRef}
                className="z-20 flex size-12 md:size-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-slate-900/90 p-3 shadow-lg hover:border-blue-400 hover:scale-105 transition-all cursor-pointer group"
                title="Razorpay Payment Links"
              >
                <SiRazorpay size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
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
            gradientStopColor="#34A853"
            duration={3.2}
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={whatsappRef}
            toRef={centerRef}
            curvature={-25}
            endYOffset={-6}
            gradientStartColor="#25D366"
            gradientStopColor="#128C7E"
            duration={2.8}
            delay={0.4}
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={metaRef}
            toRef={centerRef}
            curvature={25}
            endYOffset={6}
            gradientStartColor="#1877F2"
            gradientStopColor="#0066DA"
            duration={3.0}
            delay={0.8}
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={driveRef}
            toRef={centerRef}
            curvature={70}
            endYOffset={14}
            gradientStartColor="#FFBA00"
            gradientStopColor="#EA4335"
            duration={3.4}
            delay={1.2}
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
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
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={gmailRef}
            curvature={-25}
            startYOffset={-6}
            gradientStartColor="#EA4335"
            gradientStopColor="#B91C1C"
            duration={2.9}
            delay={0.6}
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={zapierRef}
            curvature={25}
            startYOffset={6}
            gradientStartColor="#FF4F00"
            gradientStopColor="#FF8100"
            duration={3.1}
            delay={1.0}
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
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
            pathColor="rgba(255,255,255,0.08)"
            pathOpacity={0.4}
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
              borderRadius: 18,
              background: '#f8fafc',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(2, 132, 199, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                flexShrink: 0,
              }}
            >
              <Zap size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 850, color: '#0f172a' }}>&lt; 80ms</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Webhook Sync Latency</div>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderRadius: 18,
              background: '#f8fafc',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 850, color: '#0f172a' }}>99.9% Uptime</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Carrier SIP & WebRTC</div>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderRadius: 18,
              background: '#f8fafc',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(124, 58, 237, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
                flexShrink: 0,
              }}
            >
              <Layers size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 850, color: '#0f172a' }}>100+ Connectors</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Native CRM & Ad APIs</div>
            </div>
          </div>

          <div
            style={{
              padding: '20px 24px',
              borderRadius: 18,
              background: '#f8fafc',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(249, 115, 22, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea580c',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 850, color: '#0f172a' }}>0% Leakage</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Automated Round-Robin</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default IntegrationsSection;
