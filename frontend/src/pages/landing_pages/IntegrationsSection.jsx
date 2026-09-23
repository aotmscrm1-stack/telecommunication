import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneCall,
  MessageSquare,
  Globe,
  Radio,
  Workflow,
  Zap,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SiFacebook,
  SiWhatsapp,
  SiGoogle,
  SiTelegram,
  SiN8N,
  SiZapier,
} from 'react-icons/si';
import { ShinyText } from '../../components/ui/ShinyText';
import { SpotlightCard } from '../../components/ui/SpotlightCard';

/* ─────────────────────────────────────────────────────────
   INTEGRATION PARTNERS DATA
   ───────────────────────────────────────────────────────── */
const INTEGRATION_LIST = [
  {
    id: 'facebook',
    name: 'Facebook Lead Ads',
    category: 'Ad Channels',
    tag: 'Instant Webhook',
    desc: 'Instant lead form capture synced to agent pipelines in under 80 milliseconds.',
    color: '#1877F2',
    bg: '#EFF6FF',
    iconType: 'react-icon',
    Icon: SiFacebook,
    status: 'Active · < 80ms',
    features: ['Realtime Webhook', 'Custom Field Mapping', 'Campaign Attributions'],
    isFeatured: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Cloud API',
    category: 'Messaging',
    tag: 'Official Meta Partner',
    desc: 'Automate welcome greetings, trigger transactional templates, and enable 2-way chats.',
    color: '#25D366',
    bg: '#ECFDF5',
    iconType: 'react-icon',
    Icon: SiWhatsapp,
    status: 'Connected · 99.9%',
    features: ['Template Messages', 'Interactive Buttons', 'Read Receipts'],
    isFeatured: true,
  },
  {
    id: 'google',
    name: 'Google Workspace & Gmail',
    category: 'Automations',
    tag: 'Enterprise Email',
    desc: 'Automated HR mail dispatch, executive audit logging, and single sign-on security.',
    color: '#EA4335',
    bg: '#FEF2F2',
    iconType: 'react-icon',
    Icon: SiGoogle,
    status: 'OAuth 2.0 · Live',
    features: ['Director Audit Trail', 'Instant Dispatch', 'Inbox Sync'],
    isFeatured: true,
  },
  {
    id: 'knowlarity',
    name: 'Knowlarity Telephony',
    category: 'Cloud Telephony',
    tag: 'Smart IVR',
    desc: 'Enterprise virtual numbers, multi-level IVR call routing, and automated recordings.',
    color: '#6C3483',
    bg: '#FAF5FF',
    iconType: 'lucide',
    Icon: PhoneCall,
    status: 'Virtual PBX · Live',
    features: ['1-Click Dialing', 'Agent CallIQ', 'Call Recordings'],
    isFeatured: true,
  },
  {
    id: 'n8n',
    name: 'n8n Automation Engine',
    category: 'Automations',
    tag: 'Low-Code Workflow',
    desc: 'Self-hosted and cloud workflow orchestration with failover detection and webhook retries.',
    color: '#FF6D5A',
    bg: '#FFF7ED',
    iconType: 'react-icon',
    Icon: SiN8N,
    status: 'Self-Hosted & Cloud',
    features: ['Error Auto-Catch', 'JSON Transformers', 'Multi-Node Flow'],
    isFeatured: true,
  },
  {
    id: 'callerdesk',
    name: 'CallerDesk Cloud PBX',
    category: 'Cloud Telephony',
    tag: 'VoIP Solution',
    desc: 'Dial leads with single-click browser softphones, live agent status, and disposition feedback.',
    color: '#FF5722',
    bg: '#FFF8F6',
    iconType: 'lucide',
    Icon: Radio,
    status: 'SIP Trunk · Ready',
    features: ['Click-to-Call', 'Sticky Agent Routing', 'Call Analytics'],
    isFeatured: false,
  },
  {
    id: 'justdial',
    name: 'JustDial Tele-Leads',
    category: 'Ad Channels',
    tag: 'B2B Leads Hub',
    desc: 'Auto-ingest commercial inquiries from JustDial with instant round-robin rep distribution.',
    color: '#E87722',
    bg: '#FFFBEB',
    iconType: 'lucide',
    Icon: Globe,
    status: 'Realtime Feed',
    features: ['Auto Lead Allocation', 'Duplicate Filter', 'SMS Alert'],
    isFeatured: false,
  },
  {
    id: '99acres',
    name: '99acres Real Estate',
    category: 'Ad Channels',
    tag: 'Property Portal',
    desc: 'Capture high-intent property and infrastructure leads with location metadata parsing.',
    color: '#E01E1E',
    bg: '#FEF2F2',
    iconType: 'lucide',
    Icon: Layers,
    status: 'API Webhook · Live',
    features: ['Project Mapping', 'Budget Classifier', 'Instant Notification'],
    isFeatured: false,
  },
  {
    id: 'zapier',
    name: 'Zapier App Ecosystem',
    category: 'Automations',
    tag: '5,000+ Apps',
    desc: 'Connect AOTMS CRM with 5,000+ SaaS apps, billing tools, Slack, and spreadsheets.',
    color: '#FF4A00',
    bg: '#FFF7ED',
    iconType: 'react-icon',
    Icon: SiZapier,
    status: 'Integration Hub',
    features: ['Two-Way Webhooks', 'Zaps Trigger', 'Auto Backups'],
    isFeatured: true,
  },
  {
    id: 'telegram',
    name: 'Telegram Bot Alerts',
    category: 'Messaging',
    tag: 'Instant Push',
    desc: 'Push VIP lead escalations, daily summary reports, and critical alerts straight to managers.',
    color: '#229ED9',
    bg: '#F0F9FF',
    iconType: 'react-icon',
    Icon: SiTelegram,
    status: 'Bot API · 24/7',
    features: ['Manager Alerts', 'Group Dispatches', 'Lead Summaries'],
    isFeatured: false,
  },
  {
    id: 'maqsam',
    name: 'Maqsam Telecom Cloud',
    category: 'Cloud Telephony',
    tag: 'MENA & Global VoIP',
    desc: 'High-clarity international telecom routing with direct CRM contact syncing.',
    color: '#C0392B',
    bg: '#FEF2F2',
    iconType: 'lucide',
    Icon: Cpu,
    status: 'Global SIP · 99.9%',
    features: ['Global Calling', 'Live Whisper', 'Call Disposition'],
    isFeatured: false,
  },
  {
    id: 'webhooks',
    name: 'Custom REST API & SDK',
    category: 'Automations',
    tag: 'Developer Friendly',
    desc: 'Generate secure API access tokens and integrate internal core systems with full Swagger docs.',
    color: '#0466c8',
    bg: '#F0F9FF',
    iconType: 'lucide',
    Icon: Workflow,
    status: 'REST & GraphQL',
    features: ['Access Token Auth', 'Webhooks Signing', 'Rate-Limiting Guard'],
    isFeatured: false,
  },
];

const INTEGRATION_TABS = [
  { id: 'All Integrations', label: 'All Connectors', count: 12 },
  { id: 'Cloud Telephony', label: 'Cloud Telephony', count: 3 },
  { id: 'Ad Channels', label: 'Ad & Lead Channels', count: 3 },
  { id: 'Messaging', label: 'Messaging & WhatsApp', count: 2 },
  { id: 'Automations', label: 'Automations & API', count: 4 },
];

export const IntegrationsSection = () => {
  const [selectedCategory, setSelectedCategory] = useState('All Integrations');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(2);
  const [showAllIntegrations, setShowAllIntegrations] = useState(false);

  // Progressive Disclosure: Default 8 featured partners (2 rows of 4) on 'All Integrations', or full list on toggle/category filter
  const displayedIntegrations = useMemo(() => {
    if (selectedCategory !== 'All Integrations') {
      return INTEGRATION_LIST.filter((item) => item.category === selectedCategory);
    }
    if (!showAllIntegrations) {
      return INTEGRATION_LIST.slice(0, 8);
    }
    return INTEGRATION_LIST;
  }, [selectedCategory, showAllIntegrations]);

  const WORKFLOW_STEPS = [
    { title: 'Inbound Ad Click', subtitle: 'Facebook / JustDial', time: '0ms' },
    { title: 'n8n Webhook Parse', subtitle: 'Deduplicate & Score', time: '+45ms' },
    { title: 'AOTMS CRM Engine', subtitle: 'Auto-Assign to Sales Rep', time: '+80ms' },
    { title: 'VoIP Dialer & WhatsApp', subtitle: 'Auto Call & Welcome Message', time: '+110ms' },
  ];

  return (
    <section
      id="services"
      style={{
        padding: '100px 24px 120px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #ffffff 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div id="integrations" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      {/* Subtle Background Glow Rings */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 800,
          background: 'radial-gradient(circle, rgba(4, 102, 200, 0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* ══════════════════════════════════════════════
            SECTION HEADER
            ══════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', marginBottom: 42 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
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
              text="LIVE NATIVE CONNECTORS"
              speed={3.5}
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#0466c8',
              }}
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#0f172a',
              margin: '0 0 14px 0',
              fontFamily: '"Bricolage Grotesque", "Plus Jakarta Sans", "Inter", sans-serif',
            }}
          >
            Connects with the platforms you already use
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              color: '#64748b',
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              maxWidth: 680,
              margin: '0 auto',
              lineHeight: 1.65,
              fontWeight: 450,
            }}
          >
            Real, native API integrations — not just webhook stubs. Route telephony calls, capture social ads, and trigger WhatsApp dispatches in under 120ms.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            LIVE DATA PIPELINE SIMULATOR (ENHANCED TOUCH TARGETS)
            ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.05)',
            padding: '28px 24px',
            marginBottom: 44,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
              borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
              paddingBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 10px #22c55e',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 750, color: '#0f172a' }}>
                LIVE DATA PIPELINE SIMULATOR
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontWeight: 650,
                }}
              >
                Avg. E2E Latency: 112ms
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#64748b' }}>
              <span>Click step to inspect workflow timeline</span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              alignItems: 'center',
            }}
          >
            {WORKFLOW_STEPS.map((step, idx) => {
              const isSelected = activeWorkflowStep === idx;

              return (
                <div
                  key={step.title}
                  onClick={() => setActiveWorkflowStep(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveWorkflowStep(idx);
                    }
                  }}
                  style={{
                    padding: '18px 20px',
                    minHeight: 90,
                    borderRadius: 18,
                    background: isSelected ? '#f0f9ff' : '#f8fafc',
                    border: isSelected
                      ? '1.5px solid #0284c7'
                      : '1px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: isSelected
                      ? '0 8px 22px rgba(2, 132, 199, 0.14)'
                      : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    outline: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isSelected ? '#0284c7' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12.5,
                        fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 750,
                        color: isSelected ? '#0284c7' : '#64748b',
                      }}
                    >
                      {step.time}
                    </span>
                  </div>

                  <div style={{ fontSize: 13.5, fontWeight: 750, color: '#0f172a' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    {step.subtitle}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════
            CATEGORY FILTER TABS WITH COUNTS
            ══════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 38,
          }}
        >
          {INTEGRATION_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id);
                  setShowAllIntegrations(false);
                }}
                style={{
                  minHeight: 42,
                  padding: '9px 18px',
                  borderRadius: 9999,
                  border: isSelected
                    ? '1.5px solid #0466c8'
                    : '1px solid rgba(226, 232, 240, 0.95)',
                  background: isSelected ? '#0466c8' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontSize: 13,
                  fontWeight: isSelected ? 750 : 550,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: isSelected
                    ? '0 6px 18px rgba(4, 102, 200, 0.25)'
                    : '0 2px 6px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.25s ease',
                  fontFamily: '"Inter", sans-serif',
                  outline: 'none',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            BALANCED 4-COLUMN SPOTLIGHT INTEGRATIONS GRID
            ══════════════════════════════════════════════ */}
        <div className="integrations-grid">
          <AnimatePresence mode="popLayout">
            {displayedIntegrations.map((it, idx) => {
              const IconComponent = it.Icon;

              return (
                <motion.div
                  key={it.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.35, delay: (idx % 4) * 0.05 }}
                  style={{ height: '100%' }}
                >
                  <SpotlightCard
                    spotlightColor="rgba(255, 255, 255, 0.85)"
                    style={{
                      height: '100%',
                      background: '#ffffff',
                      borderRadius: 24,
                      border: '1px solid rgba(226, 232, 240, 0.9)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                      padding: '24px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease',
                      cursor: 'pointer',
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Connect with ${it.name}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        window.location.href = '/login';
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.borderColor = it.color;
                      e.currentTarget.style.boxShadow = `0 20px 40px rgba(0, 0, 0, 0.08), 0 0 20px ${it.color}25`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03)';
                    }}
                  >
                    <div>
                      {/* Top Header: Logo + Status Badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 16,
                            background: it.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: it.color,
                            fontSize: 26,
                            boxShadow: `0 4px 14px ${it.color}20`,
                          }}
                        >
                          <IconComponent size={26} />
                        </div>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: '4px 11px',
                            borderRadius: 9999,
                            background: '#f1f5f9',
                            color: '#334155',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#16a34a',
                              display: 'inline-block',
                            }}
                          />
                          {it.status}
                        </span>
                      </div>

                      {/* Title & Tag */}
                      <div style={{ marginBottom: 10 }}>
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: '0 0 4px 0',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {it.name}
                        </h3>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: it.color,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {it.tag}
                        </span>
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: 13,
                          color: '#64748b',
                          lineHeight: 1.55,
                          margin: '0 0 18px 0',
                        }}
                      >
                        {it.desc}
                      </p>
                    </div>

                    {/* Bottom Feature Bullets & Accessible CTA Button */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginBottom: 18,
                        }}
                      >
                        {it.features.map((feat) => (
                          <span
                            key={feat}
                            style={{
                              fontSize: 11,
                              fontWeight: 650,
                              background: '#f8fafc',
                              border: '1px solid rgba(226, 232, 240, 0.9)',
                              color: '#475569',
                              padding: '3px 9px',
                              borderRadius: 8,
                            }}
                          >
                            {feat}
                          </span>
                        ))}
                      </div>

                      {/* Generously sized interactive action button (42px min-height) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = '/login';
                        }}
                        style={{
                          width: '100%',
                          minHeight: 42,
                          padding: '10px 18px',
                          borderRadius: 12,
                          border: `1.5px solid ${it.color}35`,
                          background: '#ffffff',
                          color: it.color,
                          fontSize: 13,
                          fontWeight: 750,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = it.color;
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.boxShadow = `0 6px 16px ${it.color}40`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.color = it.color;
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.04)';
                        }}
                      >
                        <span>Connect {it.name.split(' ')[0]}</span>
                        <ArrowRight size={14} strokeWidth={2.4} />
                      </button>
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ══════════════════════════════════════════════
            PROGRESSIVE DISCLOSURE TOGGLE (FOR 'ALL' VIEW)
            ══════════════════════════════════════════════ */}
        {selectedCategory === 'All Integrations' && (
          <div style={{ textAlign: 'center', marginTop: 42 }}>
            <button
              type="button"
              onClick={() => setShowAllIntegrations((prev) => !prev)}
              style={{
                minHeight: 46,
                padding: '12px 28px',
                borderRadius: 9999,
                background: '#ffffff',
                border: '1.5px solid #0466c8',
                color: '#0466c8',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(4, 102, 200, 0.12)',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0466c8';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#0466c8';
              }}
            >
              {showAllIntegrations ? (
                <>
                  <span>Show Top 8 Partners</span>
                  <ChevronUp size={16} />
                </>
              ) : (
                <>
                  <span>Show All 12 Connectors</span>
                  <ChevronDown size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom Trust Line */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 24,
            fontSize: 13,
            fontWeight: 550,
            color: '#475569',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#16a34a" />
            256-Bit Encrypted Webhook Ingestion
          </span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Zap size={16} color="#f59e0b" />
            Sub-100ms Ingestion Latency Guarantee
          </span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="#0466c8" />
            REST API &amp; Swagger Docs Ready
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CSS GRID (RESPONSIVE 4-COLUMN ARCHITECTURE)
          ══════════════════════════════════════════════ */}
      <style>{`
        .integrations-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          width: 100%;
        }

        @media (max-width: 1240px) {
          .integrations-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 900px) {
          .integrations-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 580px) {
          .integrations-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </section>
  );
};

export default IntegrationsSection;
