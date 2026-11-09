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
import {
  accent,
  amber,
  border,
  brand,
  cobalt,
  fonts,
  gradients,
  ink,
  layout,
  radii,
  shadows,
  surface,
  text,
} from './theme';

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
        padding: `${layout.sectionY} ${layout.gutter}`,
        background: surface.page,
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
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, rgba(6, 182, 212, 0.04) 52%, transparent 78%)',
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
              padding: '6px 16px',
              borderRadius: radii.pill,
              background: brand.soft,
              border: `1px solid ${cobalt[200]}`,
              marginBottom: 18,
              boxShadow: 'none',
            }}
          >
            <Sparkles size={13} strokeWidth={2.4} color={brand.base} />
            <ShinyText
              text="TRANSPARENT VALUE PRICING"
              speed={3.5}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.10em',
                color: cobalt[700],
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
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              color: text.primary,
              margin: '0 0 14px 0',
              fontFamily: fonts.display,
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
              color: text.tertiary,
              fontSize: 'clamp(15px, 1.1vw, 17px)',
              maxWidth: 640,
              margin: '0 auto',
              lineHeight: 1.7,
              fontWeight: 400,
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
              borderRadius: radii.pill,
              background: surface.subtle,
              border: `1px solid ${border.base}`,
              boxShadow: 'none',
              gap: 4,
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                border: 'none',
                background: !isYearly ? surface.page : 'transparent',
                color: !isYearly ? text.primary : text.tertiary,
                padding: '9px 22px',
                borderRadius: radii.pill,
                fontSize: 13.5,
                fontWeight: !isYearly ? 650 : 500,
                cursor: 'pointer',
                boxShadow: !isYearly ? shadows.xs : 'none',
                transition: 'all 0.25s ease',
                fontFamily: fonts.sans,
              }}
            >
              Monthly Billing
            </button>

            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                border: 'none',
                background: isYearly ? surface.page : 'transparent',
                color: isYearly ? text.primary : text.tertiary,
                padding: '9px 22px',
                borderRadius: radii.pill,
                fontSize: 13.5,
                fontWeight: isYearly ? 650 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isYearly ? shadows.xs : 'none',
                transition: 'all 0.25s ease',
                fontFamily: fonts.sans,
              }}
            >
              Yearly Billing
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  background: isYearly
                    ? `linear-gradient(135deg, ${amber[500]}, ${amber[600]})`
                    : amber[100],
                  color: isYearly ? '#FFFFFF' : amber[700],
                  padding: '3px 9px',
                  borderRadius: radii.pill,
                  boxShadow: isYearly ? '0 2px 8px rgba(245, 158, 11, 0.35)' : 'none',
                }}
              >
                SAVE 32%
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
                  spotlightColor="rgba(37, 99, 235, 0.10)"
                  style={{
                    height: '100%',
                    borderRadius: radii.xl,
                    background: tier.popular ? gradients.brandSoft : surface.page,
                    border: tier.popular
                      ? `1.5px solid ${cobalt[500]}`
                      : `1px solid ${border.base}`,
                    boxShadow: tier.popular
                      ? '0 28px 64px -28px rgba(37, 99, 235, 0.45), 0 2px 10px rgba(11, 17, 32, 0.04)'
                      : shadows.sm,
                    padding: '28px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = tier.popular
                      ? '0 34px 72px -26px rgba(37, 99, 235, 0.52), 0 4px 16px rgba(11, 17, 32, 0.06)'
                      : shadows.lg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = tier.popular
                      ? '0 28px 64px -28px rgba(37, 99, 235, 0.45), 0 2px 10px rgba(11, 17, 32, 0.04)'
                      : shadows.sm;
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
                            borderRadius: radii.sm,
                            background: gradients.brand,
                            color: '#FFFFFF',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.10em',
                            boxShadow: '0 6px 18px rgba(37, 99, 235, 0.32)',
                            textTransform: 'uppercase',
                          }}
                        >
                          <Sparkles size={13} fill="#FFFFFF" strokeWidth={0} />
                          MOST POPULAR
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            padding: '9px 16px',
                            borderRadius: radii.sm,
                            background: surface.subtle,
                            color: text.secondary,
                            border: `1px solid ${border.base}`,
                            fontSize: 11,
                            fontWeight: 650,
                            letterSpacing: '0.08em',
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
                          fontSize: 21,
                          fontWeight: 700,
                          color: text.primary,
                          margin: 0,
                          letterSpacing: '-0.025em',
                        }}
                      >
                        {tier.name}
                      </h3>

                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 650,
                          padding: '3px 8px',
                          borderRadius: 6,
                          letterSpacing: '0.02em',
                          background: tier.popular ? brand.soft : surface.subtle,
                          color: tier.popular ? cobalt[700] : text.tertiary,
                          border: `1px solid ${
                            tier.popular ? cobalt[200] : border.base
                          }`,
                        }}
                      >
                        {tier.popular ? 'Best Value' : 'Standard'}
                      </span>
                    </div>

                    {/* Short Description */}
                    <p
                      style={{
                        fontSize: 13,
                        color: text.tertiary,
                        lineHeight: 1.6,
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
                        borderTop: `1px solid ${border.hairline}`,
                        borderBottom: `1px solid ${border.hairline}`,
                        marginBottom: 24,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 22, fontWeight: 600, color: text.tertiary }}>
                          ₹
                        </span>
                        <span
                          style={{
                            fontSize: 'clamp(36px, 3.6vw, 46px)',
                            fontWeight: 800,
                            letterSpacing: '-0.04em',
                            color: text.primary,
                            lineHeight: 1,
                            fontFamily: fonts.display,
                          }}
                        >
                          {price.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: 13, color: text.tertiary, fontWeight: 500 }}>
                          / user / mo
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: isYearly ? accent.emerald.strong : text.tertiary,
                          fontWeight: 600,
                          marginTop: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {isYearly ? (
                          <>
                            <CheckCircle2 size={13} color={accent.emerald.strong} />
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
                          fontSize: 11,
                          fontWeight: 650,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          color: text.muted,
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
                              color: text.secondary,
                              lineHeight: 1.5,
                            }}
                          >
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: tier.popular ? brand.soft : accent.emerald.soft,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: tier.popular ? brand.base : accent.emerald.text,
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
                      borderRadius: radii.md,
                      border: tier.popular ? 'none' : `1.5px solid ${border.strong}`,
                      background: tier.popular ? gradients.brand : surface.page,
                      color: tier.popular ? '#FFFFFF' : text.primary,
                      fontSize: 14,
                      fontWeight: 650,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: tier.popular ? shadows.brand : shadows.xs,
                      transition: 'all 0.25s ease',
                      fontFamily: fonts.sans,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = tier.popular
                        ? shadows.brandLg
                        : shadows.sm;
                      if (!tier.popular) {
                        e.currentTarget.style.background = ink[900];
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = ink[900];
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = tier.popular
                        ? shadows.brand
                        : shadows.xs;
                      if (!tier.popular) {
                        e.currentTarget.style.background = surface.page;
                        e.currentTarget.style.color = text.primary;
                        e.currentTarget.style.borderColor = border.strong;
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
            borderRadius: radii.lg,
            background: surface.page,
            border: `1px solid ${border.hairline}`,
            fontSize: 12.5,
            fontWeight: 550,
            color: text.secondary,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Zap size={15} color={accent.amber.base} />
            14-Day Full Access Trial
          </span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <ShieldCheck size={15} color={accent.emerald.strong} />
            No Credit Card Required
          </span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Headphones size={15} color={brand.base} />
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
                  borderRadius: radii.lg,
                  background: surface.page,
                  border: `1px solid ${border.hairline}`,
                  boxShadow: shadows.xs,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 650,
                    color: text.primary,
                    marginBottom: 6,
                  }}
                >
                  <HelpCircle size={14} color={brand.base} />
                  {faq.q}
                </div>
                <div style={{ fontSize: 12.5, color: text.tertiary, lineHeight: 1.6 }}>
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
