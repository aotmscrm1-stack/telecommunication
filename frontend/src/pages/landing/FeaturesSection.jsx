import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Code2,
  FileSpreadsheet,
  MessageCircle,
  PhoneCall,
  Receipt,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import {
  SiAirtel,
  SiGmail,
  SiGoogledrive,
  SiGooglesheets,
  SiJio,
  SiMeta,
  SiRazorpay,
  SiVodafone,
  SiWhatsapp,
  SiZapier,
} from 'react-icons/si';
import { MarqueeLogoScroller } from '../../components/ui/marquee-logo-scroller';
import EnterpriseAIPipeline from '../../components/ui/ai-agent-pipeline';

/* Monogram badge for partners that do not ship a public vector icon. */
const TextMark = ({ text, color }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 30,
      minWidth: 30,
      padding: '0 7px',
      borderRadius: 6,
      background: color,
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '0.02em',
    }}
  >
    {text}
  </span>
);

/* ─────────────────────────────────────────────────────────
   CONNECTORS THE PLATFORM ACTUALLY TALKS TO
   ───────────────────────────────────────────────────────── */
const PLATFORM_PARTNERS = [
  {
    alt: 'WhatsApp Cloud API',
    label: 'WhatsApp Cloud',
    icon: <SiWhatsapp size={30} color="#22C55E" />,
    gradient: { from: '#22C55E', via: '#16A34A', to: '#14532D' },
  },
  {
    alt: 'Meta Lead Ads',
    label: 'Meta Lead Ads',
    icon: <SiMeta size={28} color="#0284C7" />,
    gradient: { from: '#38BDF8', via: '#0284C7', to: '#0369A1' },
  },
  {
    alt: 'Google Sheets',
    label: 'Google Sheets',
    icon: <SiGooglesheets size={26} color="#0F9D58" />,
    gradient: { from: '#34A853', via: '#0F9D58', to: '#0B6B3A' },
  },
  {
    alt: 'Google Drive',
    label: 'Google Drive',
    icon: <SiGoogledrive size={26} color="#EA4335" />,
    gradient: { from: '#FBBC05', via: '#EA4335', to: '#B31412' },
  },
  {
    alt: 'JustDial',
    label: 'JustDial',
    icon: <TextMark text="JD" color="#2F6FED" />,
    gradient: { from: '#60A5FA', via: '#2F6FED', to: '#1E3A8A' },
  },
  {
    alt: 'IndiaMart',
    label: 'IndiaMart',
    icon: <TextMark text="IM" color="#1E6FBF" />,
    gradient: { from: '#38BDF8', via: '#1E6FBF', to: '#0C4A6E' },
  },
  {
    alt: '99acres',
    label: '99acres',
    icon: <TextMark text="99" color="#F24E1E" />,
    gradient: { from: '#FB923C', via: '#F24E1E', to: '#9A3412' },
  },
  {
    alt: 'MagicBricks',
    label: 'MagicBricks',
    icon: <TextMark text="MB" color="#B91C1C" />,
    gradient: { from: '#F87171', via: '#DC2626', to: '#7F1D1D' },
  },
  {
    alt: 'ZKTeco biometric devices',
    label: 'ZKTeco Devices',
    icon: <TextMark text="ZK" color="#0F766E" />,
    gradient: { from: '#2DD4BF', via: '#0F766E', to: '#134E4A' },
  },
  {
    alt: 'Airtel SIP Trunk',
    label: 'Airtel SIP',
    icon: <SiAirtel size={30} color="#EF4444" />,
    gradient: { from: '#EF4444', via: '#DC2626', to: '#991B1B' },
  },
  {
    alt: 'Jio Enterprise',
    label: 'Jio Enterprise',
    icon: <SiJio size={32} color="#2563EB" />,
    gradient: { from: '#3B82F6', via: '#1D4ED8', to: '#1E3A8A' },
  },
  {
    alt: 'Vi Business',
    label: 'Vi Business',
    icon: <SiVodafone size={28} color="#DC2626" />,
    gradient: { from: '#F87171', via: '#DC2626', to: '#991B1B' },
  },
  {
    alt: 'Gmail and SMTP',
    label: 'Gmail & SMTP',
    icon: <SiGmail size={26} color="#EA4335" />,
    gradient: { from: '#EA4335', via: '#C5221F', to: '#8B1A1A' },
  },
  {
    alt: 'Razorpay',
    label: 'Razorpay',
    icon: <SiRazorpay size={28} color="#2563EB" />,
    gradient: { from: '#2563EB', via: '#1D4ED8', to: '#1E40AF' },
  },
  {
    alt: 'n8n and Zapier',
    label: 'n8n & Zapier',
    icon: <SiZapier size={26} color="#FF4F00" />,
    gradient: { from: '#FF4F00', via: '#EA580C', to: '#9A3412' },
  },
];

/* ─────────────────────────────────────────────────────────
   LIVE AUTOMATION LOG — EVENTS THE PLATFORM REALLY EMITS
   ───────────────────────────────────────────────────────── */
const PIPELINE_MESSAGES = [
  'New lead received: Meta lead ad "Java Batch 2026" → campaign matched',
  'Owner assigned: next counsellor in the round-robin queue',
  'WhatsApp template queued: course brochure + fee structure via Cloud API',
  'Stage updated to "Contacted" · follow-up task created for 10:00 AM tomorrow',
  'Inbound reply detected → keyword auto-reply sent in 3 seconds',
  'Call recording uploaded from the Android app · transcript generated',
  'Transcript converted to English chatting script for quick review',
  'Daily activity updated: 42 calls, 18 connected, 6 follow-ups closed',
  'Attendance punch-in synced from the biometric device',
  'Logged on one record: lead, WhatsApp thread, call and task',
  'Idle. Listening for the next Meta lead or JustDial webhook…',
];

const HIGHLIGHTS = [
  {
    tone: 'orange',
    Icon: FileSpreadsheet,
    title: 'Leads from every channel',
    body:
      'Meta and Instagram lead ads, Google Sheets tabs, JustDial and other portal webhooks, Excel imports and manual entries all land in one pipeline with campaign-wise ownership.',
  },
  {
    tone: 'forest',
    Icon: MessageCircle,
    title: 'WhatsApp that follows up for you',
    body:
      'A two-way inbox your team replies from, template blasts outside the 24-hour window, keyword auto-replies and a shared blocklist so opt-outs are respected.',
  },
  {
    tone: 'pink',
    Icon: Receipt,
    title: 'The back office rides along',
    body:
      'Attendance with biometric sync, daily activity, quotations, invoices, fee receipts, payslips and HR letters — generated from the same lead and employee records.',
  },
];

/* ─────────────────────────────────────────────────────────
   MODULE GRID — THE WHOLE PRODUCT IN ONE SCAN
   ───────────────────────────────────────────────────────── */
const MODULES = [
  {
    tone: 'orange',
    Icon: Users,
    title: 'Lead pipeline',
    body: 'Stages, custom fields, owners, idle-lead alerts and one timeline of every call, message and note.',
  },
  {
    tone: 'forest',
    Icon: FileSpreadsheet,
    title: 'Meta Leads hub',
    body: 'Campaign-wise Google Sheet tabs and ad leads with per-employee access and one-click conversion.',
  },
  {
    tone: 'pink',
    Icon: MessageCircle,
    title: 'WhatsApp & email',
    body: 'Two-way inbox, template blasts, email campaigns and message templates shared across the team.',
  },
  {
    tone: 'orange',
    Icon: PhoneCall,
    title: 'Calls & recordings',
    body: 'Click-to-call from the record, recording playback and AI transcripts that turn Telugu-English calls into readable text.',
  },
  {
    tone: 'forest',
    Icon: CalendarCheck,
    title: 'Attendance & activity',
    body: 'Punch in and out, breaks, biometric device sync and daily activity schedules per department.',
  },
  {
    tone: 'pink',
    Icon: Zap,
    title: 'Performance & compliance',
    body: 'Leaderboards, team reports, checkpoint tickets and an audit trail of every action.',
  },
  {
    tone: 'orange',
    Icon: Receipt,
    title: 'Finance documents',
    body: 'Quotations, invoices, fee receipts, payslips and offer, experience and relieving letters.',
  },
  {
    tone: 'forest',
    Icon: Building2,
    title: 'Teams & permissions',
    body: 'Departments, roles, permission templates and visibility that changes with each designation.',
  },
  {
    tone: 'pink',
    Icon: Code2,
    title: 'Open API & webhooks',
    body: 'Access tokens, REST endpoints, inbound webhooks and API logs to plug AOTMS into your stack.',
  },
  {
    tone: 'forest',
    Icon: Smartphone,
    title: 'Android app',
    body: 'Dial, chat, record and punch in from the field — recordings upload in the background.',
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, delay },
});

export function FeaturesSection({ onBookDemo }) {
  const navigate = useNavigate();

  return (
    <section id="about" className="hs-feat">
      {/* Anchor for Navbar link */}
      <div id="features" className="hs-feat__anchor" />

      <div className="hs-feat__inner">
        {/* ══════════════════════════════════════════════
            SECTION HEADER
            ══════════════════════════════════════════════ */}
        <div className="hs-feat__head">
          <motion.span className="hs-eyebrow" {...fadeUp(0)}>
            <Sparkles size={13} strokeWidth={2.4} />
            ONE LOGIN · SALES, MARKETING &amp; BACK OFFICE
          </motion.span>

          <motion.h2 className="hs-feat__title" {...fadeUp(0.1)}>
            Everything after the lead, in one system
          </motion.h2>

          <motion.p className="hs-feat__lede" {...fadeUp(0.2)}>
            AOTMS is more than a lead tracker. The pipeline, WhatsApp and email campaigns, call
            recordings, attendance, finance documents and an open API share the same records — so
            counsellors, HR and accounts stop re-typing the same data into different tools.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            LIVE AUTOMATION PIPELINE SHOWCASE
            ══════════════════════════════════════════════ */}
        <div className="hs-feat__grid">
          <motion.div
            className="hs-feat__pipeline"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <EnterpriseAIPipeline
              messages={PIPELINE_MESSAGES}
              liveTag="AOTMS AUTOMATION · LIVE"
              statsTag="leads · calls · WhatsApp · tasks"
              nodeLabels={{
                triggerCategory: 'TRIGGER',
                triggerTitle: 'New Lead',
                triggerSub: 'meta · justdial',
                vectorCategory: 'ROUTING',
                vectorTitle: 'Campaign Match',
                vectorSub: 'sheets + ads',
                llmCategory: 'AUTOMATION',
                llmTitle: 'WhatsApp',
                llmSub: 'template + todo',
                out1Title: 'WhatsApp Sent',
                out2Title: 'Stage Updated',
                out3Title: 'Owner Assigned',
              }}
              stackInfo="AOTMS CORE"
            />
          </motion.div>

          <div className="hs-feat__cards">
            {HIGHLIGHTS.map(({ tone, Icon, title, body }, index) => (
              <motion.div
                key={title}
                className="hs-feat__card"
                {...fadeUp(0.15 + index * 0.12)}
              >
                <span className={`hs-feat__icon hs-feat__icon--${tone}`}>
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <div>
                  <h4 className="hs-feat__card-title">{title}</h4>
                  <p className="hs-feat__card-body">{body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            MODULE GRID
            ══════════════════════════════════════════════ */}
        <motion.div className="hs-feat__modules" {...fadeUp(0.15)}>
          {MODULES.map(({ tone, Icon, title, body }) => (
            <div key={title} className="hs-feat__module">
              <span className={`hs-feat__icon hs-feat__icon--${tone}`}>
                <Icon size={19} strokeWidth={2.2} />
              </span>
              <h4 className="hs-feat__card-title">{title}</h4>
              <p className="hs-feat__card-body">{body}</p>
            </div>
          ))}
        </motion.div>

        {/* ══════════════════════════════════════════════
            INTEGRATED MARQUEE LOGO SCROLLER
            ══════════════════════════════════════════════ */}
        <motion.div className="hs-feat__marquee" {...fadeUp(0.2)}>
          <MarqueeLogoScroller
            title="Connected to the channels Indian teams already run on"
            description="Official WhatsApp Cloud and Meta lead APIs, Google Sheets tab sync, classified-portal webhooks, carrier telephony and biometric attendance devices."
            logos={PLATFORM_PARTNERS}
            speed="normal"
            className="hs-marquee"
          />
        </motion.div>

        {/* ══════════════════════════════════════════════
            BOTTOM CONVERSION BANNER
            ══════════════════════════════════════════════ */}
        <motion.div className="hs-feat__band" {...fadeUp(0.25)}>
          <div className="hs-feat__band-copy">
            <span className="hs-feat__band-label">
              <Zap size={15} strokeWidth={2.4} />
              ONBOARDING IN DAYS, NOT MONTHS
            </span>
            <h3 className="hs-feat__band-title">Bring your team, leads and back office onto one system</h3>
            <p className="hs-feat__band-body">
              We import your lead sheets, set up pipelines and WhatsApp templates, and train each
              team — with no setup fee and no lock-in.
            </p>
          </div>

          <div className="hs-feat__band-actions">
            <button type="button" className="hs-feat__btn hs-feat__btn--primary" onClick={() => onBookDemo?.()}>
              Book a free demo
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
            <button type="button" className="hs-feat__btn hs-feat__btn--ghost" onClick={() => navigate('/login')}>
              Sign in to the CRM
            </button>
          </div>
        </motion.div>
      </div>

      <style>{`
        .hs-feat {
          position: relative;
          background: var(--hs-white);
          padding: clamp(56px, 7vw, 96px) 0;
          font-family: var(--hs-ui);
          overflow: hidden;
        }
        .hs-feat__anchor { position: absolute; top: 0; left: 0; pointer-events: none; }
        .hs-feat__inner {
          position: relative;
          z-index: 1;
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
        }

        /* ── section header ─────────────────────────────────────── */
        .hs-feat__head {
          text-align: center;
          max-width: 780px;
          margin: 0 auto clamp(36px, 4vw, 56px);
        }
        .hs-feat__title {
          margin: 22px 0 16px;
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: var(--hs-navy);
        }
        .hs-feat__lede {
          margin: 0 auto;
          max-width: 720px;
          font-size: 16px;
          line-height: 1.75;
          color: var(--hs-muted);
        }

        /* ── pipeline + highlights ──────────────────────────────── */
        .hs-feat__grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: clamp(24px, 4vw, 48px);
          align-items: center;
          margin-bottom: clamp(32px, 4vw, 52px);
        }
        .hs-feat__pipeline { display: flex; justify-content: center; width: 100%; }
        .hs-feat__cards { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .hs-feat__card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 20px 22px;
          background: var(--hs-white);
          border: 1px solid var(--hs-line);
          border-radius: 10px;
        }
        .hs-feat__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          border-radius: 6px;
        }
        .hs-feat__icon--orange { background: var(--hs-orange-soft); color: var(--hs-orange-active); }
        .hs-feat__icon--forest { background: var(--hs-forest); color: var(--hs-forest-text); }
        .hs-feat__icon--pink { background: var(--hs-pink-soft); color: var(--hs-pink-text); }
        .hs-feat__card-title {
          margin: 0 0 5px;
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: -0.005em;
          color: var(--hs-navy);
        }
        .hs-feat__card-body { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--hs-muted); }

        /* ── module grid ────────────────────────────────────────── */
        .hs-feat__modules {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(224px, 1fr));
          gap: 16px;
          margin-bottom: clamp(32px, 4vw, 52px);
        }
        .hs-feat__module {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 22px;
          background: var(--hs-white);
          border: 1px solid var(--hs-line);
          border-radius: 10px;
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .hs-feat__module:hover {
          border-color: var(--hs-line-strong);
          box-shadow: 0 16px 34px -26px rgba(33, 51, 67, .5);
          transform: translateY(-2px);
        }
        .hs-feat__module .hs-feat__icon { margin-bottom: 14px; }
        .hs-feat__module .hs-feat__card-title { margin-bottom: 6px; }

        /* ── marquee (re-skinned to the section palette) ────────── */
        .hs-feat__marquee { margin-bottom: clamp(32px, 4vw, 52px); }
        .hs-marquee {
          background: var(--hs-canvas) !important;
          border: 1px solid var(--hs-line) !important;
          border-radius: 10px !important;
          box-shadow: none !important;
        }
        .hs-marquee h2 {
          font-family: var(--hs-serif);
          font-weight: 400;
          letter-spacing: -0.015em;
          color: var(--hs-navy);
        }
        .hs-marquee p { color: var(--hs-muted); }
        .hs-marquee .border-slate-200\\/80 { border-color: var(--hs-line); }
        .hs-marquee .bg-slate-100\\/80 { background: var(--hs-white); }
        .hs-marquee .text-slate-800 { color: var(--hs-navy); }

        /* ── conversion band ───────────────────────────────────── */
        .hs-feat__band {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 28px;
          padding: clamp(24px, 3.4vw, 40px) clamp(20px, 4vw, 44px);
          border-radius: 14px;
          background: var(--hs-forest-band);
          color: #fff;
          box-shadow: 0 26px 60px -40px rgba(11, 27, 38, .8);
        }
        .hs-feat__band-copy { max-width: 620px; }
        .hs-feat__band-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: .09em;
          color: var(--hs-craft-yellow);
        }
        .hs-feat__band-title {
          margin: 0 0 6px;
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(21px, 2.2vw, 28px);
          letter-spacing: -0.01em;
          color: #fff;
        }
        .hs-feat__band-body {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, .72);
        }
        .hs-feat__band-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .hs-feat__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: none;
          border-radius: 5px;
          font-family: inherit;
          font-weight: 700;
          font-size: 14.5px;
          line-height: 1;
          padding: 15px 24px;
          cursor: pointer;
          transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .hs-feat__btn--primary {
          background: var(--hs-orange);
          color: #fff;
          box-shadow: 0 1px 0 rgba(33, 51, 67, .05);
        }
        .hs-feat__btn--primary:hover {
          background: var(--hs-orange-hover);
          box-shadow: 0 10px 24px -10px rgba(255, 92, 53, .7);
          transform: translateY(-1px);
        }
        .hs-feat__btn--primary:active { background: var(--hs-orange-active); transform: none; }
        .hs-feat__btn--ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, .3);
          font-weight: 600;
        }
        .hs-feat__btn--ghost:hover { background: rgba(255, 255, 255, .1); }

        @media (max-width: 1024px) {
          .hs-feat__grid { grid-template-columns: 1fr; }
          .hs-feat__cards { max-width: 560px; margin: 0 auto; }
        }
        @media (max-width: 640px) {
          .hs-feat__band-actions { width: 100%; }
          .hs-feat__band-actions .hs-feat__btn { flex: 1 1 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs-feat__btn,
          .hs-feat__module { transition: none; }
        }
      `}</style>
    </section>
  );
}

export default FeaturesSection;
