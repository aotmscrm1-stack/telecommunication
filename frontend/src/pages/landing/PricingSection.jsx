import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Headphones,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { ShinyText } from '../../components/ui/ShinyText';

const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Growth Starter',
    badge: 'For Small Teams',
    description: 'Perfect for fast-growing sales reps and emerging telecommunication startups.',
    monthlyPrice: 999,
    yearlyPrice: 699,
    savingsText: 'Save ₹3,600/yr',
    popular: false,
    accentColor: '#0466c8',
    buttonText: 'Start Free Trial',
    buttonStyle: 'secondary',
    features: [
      'Up to 5,000 Active Leads',
      '1-Click Browser VoIP Dialer',
      'Standard WhatsApp Templates',
      'Automated Task Reminders',
      'Facebook & JustDial Ingest',
      'Basic Performance Reports',
      'Email & Community Support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional Team',
    badge: 'MOST POPULAR',
    description: 'The complete enterprise powerpack for high-velocity sales & automated calling teams.',
    monthlyPrice: 1899,
    yearlyPrice: 1299,
    savingsText: 'Save ₹7,200/yr · 32% Off',
    popular: true,
    accentColor: '#f97316',
    buttonText: 'Start 14-Day Pro Trial',
    buttonStyle: 'primary',
    features: [
      'Unlimited Leads & Custom Pipelines',
      'Auto Call Recording & CallIQ Analysis',
      'Official WhatsApp Cloud 2-Way Bot',
      'Full n8n Workflow Automation Engine',
      'Realtime Team Leaderboard & KPIs',
      'Role-Based Granular Permissions',
      'Director Audit Trail & Email History',
      'Priority 24/7 Chat & Phone Support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Scale',
    badge: 'For 25+ Agents & BPOs',
    description: 'Custom infrastructure, dedicated SIP trunks, and bespoke security for large telecom ops.',
    monthlyPrice: 3499,
    yearlyPrice: 2499,
    savingsText: 'Save ₹12,000/yr',
    popular: false,
    accentColor: '#7c3aed',
    buttonText: 'Talk to Enterprise',
    buttonStyle: 'secondary',
    features: [
      'Unlimited Agents & Teams',
      'Dedicated Private Cloud Instance',
      'Live Employee Geo-Radar & Attendance',
      'Custom IVR & Telecom PBX Trunking',
      'Custom REST API Tokens & Unlimited Webhooks',
      'Full Audit Governance & ISO Compliance',
      'Dedicated Customer Success Manager',
      '99.99% Uptime SLA Guarantee',
    ],
  },
];

const FAQS = [
  {
    q: 'Can I switch between monthly and annual billing anytime?',
    a: 'Yes, you can upgrade, downgrade, or switch billing cycles anytime from your Billing dashboard. Unused time is prorated automatically.',
  },
  {
    q: 'Do you offer GST tax invoices for business accounting?',
    a: 'Yes! Instant downloadable GST tax invoices are automatically generated for every payment under your Finance & Invoicing portal.',
  },
  {
    q: 'Is there any long-term contract or setup fee?',
    a: 'No setup fees and no lock-in contracts. You can cancel your subscription with a single click at any time without penalty.',
  },
];

export const PricingSection = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'
  const isYearly = billingCycle === 'yearly';

  return (
    <section
      id="pricing"
      style={{
        padding: '100px 24px 110px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Decorative Ambient Radial Glows */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 900,
          height: 600,
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.05) 0%, rgba(4, 102, 200, 0.04) 50%, transparent 75%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* ══════════════════════════════════════════════
            HEADER & TITLE
            ══════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
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
              background: 'rgba(249, 115, 22, 0.08)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              marginBottom: 16,
              boxShadow: '0 2px 10px rgba(249, 115, 22, 0.08)',
            }}
          >
            <Sparkles size={14} color="#f97316" />
            <ShinyText
              text="TRANSPARENT VALUE PRICING"
              speed={3.5}
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#ea580c',
              }}
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontSize: 'clamp(30px, 4.2vw, 46px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#0f172a',
              margin: '0 0 14px 0',
              fontFamily: '"Bricolage Grotesque", "Plus Jakarta Sans", "Inter", sans-serif',
            }}
          >
            Simple, Transparent Pricing
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              color: '#64748b',
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              maxWidth: 640,
              margin: '0 auto',
              lineHeight: 1.65,
              fontWeight: 450,
            }}
          >
            Invest in revenue growth, not overhead. Choose the plan tailored for your telecommunication team with zero hidden charges.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            MONTHLY / YEARLY TOGGLE SWITCHER
            ══════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: 5,
              borderRadius: 9999,
              background: '#ffffff',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.05)',
              gap: 4,
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                border: 'none',
                background: !isYearly ? '#0f172a' : 'transparent',
                color: !isYearly ? '#ffffff' : '#64748b',
                padding: '9px 22px',
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Monthly Billing
            </button>

            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                border: 'none',
                background: isYearly ? '#0f172a' : 'transparent',
                color: isYearly ? '#ffffff' : '#64748b',
                padding: '9px 22px',
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.25s ease',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              Yearly Billing
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: isYearly
                    ? 'linear-gradient(135deg, #f97316, #ea580c)'
                    : '#fef3c7',
                  color: isYearly ? '#ffffff' : '#b45309',
                  padding: '3px 9px',
                  borderRadius: 9999,
                  boxShadow: isYearly ? '0 2px 8px rgba(249, 115, 22, 0.4)' : 'none',
                }}
              >
                SAVE 32% ✨
              </span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            3-TIER PRODUCTION PRICING CARDS
            ══════════════════════════════════════════════ */}
        <div className="pricing-grid">
          {PRICING_TIERS.map((tier, idx) => {
            const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                style={{ height: '100%' }}
              >
                <SpotlightCard
                  spotlightColor="rgba(255, 255, 255, 0.85)"
                  style={{
                    height: '100%',
                    borderRadius: 26,
                    background: tier.popular
                      ? 'linear-gradient(180deg, #ffffff 0%, #fffcf9 100%)'
                      : '#ffffff',
                    border: tier.popular
                      ? '2.5px solid #f97316'
                      : '1px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: tier.popular
                      ? '0 20px 48px rgba(249, 115, 22, 0.16), 0 2px 10px rgba(0, 0, 0, 0.04)'
                      : '0 8px 30px rgba(0, 0, 0, 0.04)',
                    padding: '28px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    if (tier.popular) {
                      e.currentTarget.style.boxShadow =
                        '0 28px 56px rgba(249, 115, 22, 0.24), 0 4px 16px rgba(0, 0, 0, 0.06)';
                    } else {
                      e.currentTarget.style.boxShadow =
                        '0 18px 40px rgba(0, 0, 0, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = tier.popular
                      ? '0 20px 48px rgba(249, 115, 22, 0.16), 0 2px 10px rgba(0, 0, 0, 0.04)'
                      : '0 8px 30px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  <div>
                    {/* ── CARD TOP BADGE BANNER (100% Visible & Never Clipped) ── */}
                    <div style={{ marginBottom: 18 }}>
                      {tier.popular ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 7,
                            width: '100%',
                            padding: '9px 16px',
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 850,
                            letterSpacing: '0.07em',
                            boxShadow: '0 4px 16px rgba(234, 88, 12, 0.38)',
                            textTransform: 'uppercase',
                          }}
                        >
                          <Sparkles size={14} fill="#ffffff" strokeWidth={0} />
                          MOST POPULAR CHOICE
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            padding: '9px 16px',
                            borderRadius: 12,
                            background:
                              tier.id === 'enterprise' ? '#faf5ff' : '#f1f5f9',
                            color:
                              tier.id === 'enterprise' ? '#7c3aed' : '#475569',
                            border: `1px solid ${
                              tier.id === 'enterprise'
                                ? 'rgba(124, 58, 237, 0.2)'
                                : 'rgba(226, 232, 240, 0.8)'
                            }`,
                            fontSize: 11.5,
                            fontWeight: 750,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {tier.badge}
                        </div>
                      )}
                    </div>

                    {/* Tier Name */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: '#0f172a',
                          margin: 0,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {tier.name}
                      </h3>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: tier.popular ? '#fff7ed' : '#f8fafc',
                          color: tier.popular ? '#ea580c' : '#64748b',
                          border: `1px solid ${
                            tier.popular
                              ? 'rgba(234, 88, 12, 0.25)'
                              : 'rgba(226, 232, 240, 0.8)'
                          }`,
                        }}
                      >
                        {tier.popular ? '★ Best Value' : 'Standard'}
                      </span>
                    </div>

                    {/* Short Description */}
                    <p
                      style={{
                        fontSize: 13,
                        color: '#64748b',
                        lineHeight: 1.55,
                        margin: '0 0 24px 0',
                        minHeight: 40,
                      }}
                    >
                      {tier.description}
                    </p>

                    {/* Price Figures */}
                    <div
                      style={{
                        padding: '18px 0',
                        borderTop: '1px solid rgba(226, 232, 240, 0.7)',
                        borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
                        marginBottom: 24,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                          ₹
                        </span>
                        <span
                          style={{
                            fontSize: 'clamp(38px, 3.8vw, 48px)',
                            fontWeight: 900,
                            letterSpacing: '-0.03em',
                            color: '#0f172a',
                            lineHeight: 1,
                            fontFamily: '"Bricolage Grotesque", "Inter", sans-serif',
                          }}
                        >
                          {price.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: 13.5, color: '#64748b', fontWeight: 500 }}>
                          / user / mo
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: isYearly ? '#16a34a' : '#64748b',
                          fontWeight: 650,
                          marginTop: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {isYearly ? (
                          <>
                            <CheckCircle2 size={13} color="#16a34a" />
                            <span>Billed annually ({tier.savingsText})</span>
                          </>
                        ) : (
                          <span>Billed monthly · cancel anytime</span>
                        )}
                      </div>
                    </div>

                    {/* Feature Bullets */}
                    <div style={{ marginBottom: 30 }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: '#0f172a',
                          marginBottom: 14,
                        }}
                      >
                        Everything included:
                      </div>

                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {tier.features.map((feat) => (
                          <li
                            key={feat}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              fontSize: 13.5,
                              color: '#334155',
                              lineHeight: 1.45,
                            }}
                          >
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: tier.popular ? '#fff7ed' : '#f0fdf4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: tier.popular ? '#ea580c' : '#16a34a',
                                flexShrink: 0,
                                marginTop: 1,
                              }}
                            >
                              <Check size={12} strokeWidth={2.8} />
                            </span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action CTA Button */}
                  <button
                    onClick={() => navigate('/login')}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: 14,
                      border: tier.popular
                        ? 'none'
                        : '1.5px solid rgba(15, 23, 42, 0.85)',
                      background: tier.popular
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                        : '#ffffff',
                      color: tier.popular ? '#ffffff' : '#0f172a',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: tier.popular
                        ? '0 10px 24px rgba(234, 88, 12, 0.35)'
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.25s ease',
                      fontFamily: '"Inter", sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      if (tier.popular) {
                        e.currentTarget.style.boxShadow =
                          '0 14px 30px rgba(234, 88, 12, 0.48)';
                      } else {
                        e.currentTarget.style.background = '#0f172a';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (tier.popular) {
                        e.currentTarget.style.boxShadow =
                          '0 10px 24px rgba(234, 88, 12, 0.35)';
                      } else {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#0f172a';
                      }
                    }}
                  >
                    <span>{tier.buttonText}</span>
                    <ArrowRight size={16} />
                  </button>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            TRUST FOOTER & ASSURANCE
            ══════════════════════════════════════════════ */}
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 28,
            padding: '16px 24px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            fontSize: 13,
            fontWeight: 600,
            color: '#475569',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Zap size={16} color="#f97316" />
            14-Day Full Access Trial
          </span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <ShieldCheck size={16} color="#16a34a" />
            No Credit Card Required
          </span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Headphones size={16} color="#0466c8" />
            Free Onboarding & Migration
          </span>
        </div>

        {/* ══════════════════════════════════════════════
            MINI FAQ ACCORDION STRIP
            ══════════════════════════════════════════════ */}
        <div style={{ marginTop: 44, maxWidth: 840, margin: '44px auto 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 18,
            }}
          >
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                style={{
                  padding: '18px 20px',
                  borderRadius: 16,
                  background: '#ffffff',
                  border: '1px solid rgba(226, 232, 240, 0.85)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13.5,
                    fontWeight: 750,
                    color: '#0f172a',
                    marginBottom: 6,
                  }}
                >
                  <HelpCircle size={15} color="#0466c8" />
                  {faq.q}
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5 }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CSS GRID
          ══════════════════════════════════════════════ */}
      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          align-items: stretch;
          width: 100%;
        }

        @media (max-width: 1140px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 520px;
            margin: 0 auto;
            gap: 28px;
          }
        }

        @media (max-width: 680px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 100%;
            gap: 20px;
          }
        }
      `}</style>
    </section>
  );
};

export default PricingSection;
