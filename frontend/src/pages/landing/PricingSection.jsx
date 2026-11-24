import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Headphones,
  ArrowRight,
} from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';

const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Growth Starter',
    badge: 'For Small Teams',
    description: 'A small sales or counselling team moving off spreadsheets and WhatsApp Web.',
    monthlyPrice: 999,
    yearlyPrice: 699,
    savingsText: 'Save ₹3,600/yr',
    popular: false,
    buttonText: 'Start Free Trial',
    features: [
      'Up to 5,000 Active Leads · 5 Logins',
      'Lead Pipeline with Custom Stages',
      'WhatsApp Inbox, Blasts & Templates',
      'Meta, JustDial & Excel Lead Import',
      'Todos, Follow-ups & Reminders',
      'Call Recording Upload & Playback',
      'Punch-in, Breaks & Daily Activity',
      'Basic Team Reports',
    ],
  },
  {
    id: 'pro',
    name: 'Professional Team',
    badge: 'MOST POPULAR',
    description: 'The full marketing and performance stack for a working sales floor.',
    monthlyPrice: 1899,
    yearlyPrice: 1299,
    savingsText: 'Save ₹7,200/yr · 32% Off',
    popular: true,
    buttonText: 'Start 14-Day Pro Trial',
    features: [
      'Unlimited Leads & Custom Pipelines',
      'Meta Leads Hub with Campaign Assignment',
      'Email CRM + Email Blast Campaigns',
      'AI Transcripts of Call Recordings',
      'Leaderboard, Reports & Compliance Tickets',
      'Quotations, Invoices & Fee Receipts',
      'Role-Based Permissions & Audit Trail',
      'Priority Chat & Phone Support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Scale',
    badge: 'For Multi-Team Operations',
    description: 'For departments that also run HR, payroll and their own internal systems.',
    monthlyPrice: 3499,
    yearlyPrice: 2499,
    savingsText: 'Save ₹12,000/yr',
    popular: false,
    buttonText: 'Talk to Enterprise',
    features: [
      'Unlimited Users & Departments',
      'Live Employee Tracking & Maps',
      'ZKTeco Biometric Attendance Sync',
      'Payslips & Offer, Experience, Relieving Letters',
      'REST API Tokens, Webhooks & API Logs',
      'Custom Fields, Actions & Permission Templates',
      'Dedicated Private Cloud Instance',
      'Dedicated Success Manager & SLA',
    ],
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7, delay },
});

export const PricingSection = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'
  const isYearly = billingCycle === 'yearly';

  return (
    <section id="pricing" className="hs-price">
      <div className="hs-price__inner">
        {/* ══════════════════════════════════════════════
            HEADER & TITLE
            ══════════════════════════════════════════════ */}
        <div className="hs-price__head">
          <motion.span className="hs-eyebrow" {...fadeUp(0)}>
            <Sparkles size={13} strokeWidth={2.4} />
            PRICING FOR THE WHOLE STACK
          </motion.span>

          <motion.h2 className="hs-price__title" {...fadeUp(0.1)}>
            Simple, Transparent Pricing
          </motion.h2>

          <motion.p className="hs-price__lede" {...fadeUp(0.2)}>
            Every plan includes the CRM core — leads, WhatsApp, calls and reports. Higher tiers add
            marketing automation, finance documents, HR tools and the open API. No setup fee, no
            hidden charges.
          </motion.p>
        </div>

        {/* ══════════════════════════════════════════════
            MONTHLY / YEARLY TOGGLE SWITCHER
            ══════════════════════════════════════════════ */}
        <div className="hs-price__toggle-wrap">
          <div className="hs-price__toggle">
            <button
              type="button"
              className="hs-price__toggle-btn"
              data-active={!isYearly}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly Billing
            </button>

            <button
              type="button"
              className="hs-price__toggle-btn"
              data-active={isYearly}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly Billing
              <span className="hs-price__save">SAVE 32%</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            3-TIER PRICING CARDS
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
                  spotlightColor="rgba(255, 92, 53, 0.10)"
                  className={`hs-price__card ${tier.popular ? 'hs-price__card--popular' : ''}`}
                >
                  <div>
                    {/* Top badge banner */}
                    <div className={`hs-price__badge ${tier.popular ? 'hs-price__badge--popular' : ''}`}>
                      {tier.popular && <Sparkles size={13} fill="#FFFFFF" strokeWidth={0} />}
                      {tier.popular ? 'MOST POPULAR' : tier.badge}
                    </div>

                    {/* Tier name */}
                    <div className="hs-price__name-row">
                      <h3 className="hs-price__name">{tier.name}</h3>
                      <span className={`hs-price__tag ${tier.popular ? 'hs-price__tag--popular' : ''}`}>
                        {tier.popular ? 'Best Value' : 'Standard'}
                      </span>
                    </div>

                    <p className="hs-price__desc">{tier.description}</p>

                    {/* Price figures */}
                    <div className="hs-price__figures">
                      <div className="hs-price__amount-row">
                        <span className="hs-price__currency">₹</span>
                        <span className="hs-price__amount">{price.toLocaleString('en-IN')}</span>
                        <span className="hs-price__unit">/ user / mo</span>
                      </div>

                      <div className={`hs-price__billing ${isYearly ? '' : 'hs-price__billing--muted'}`}>
                        {isYearly ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Billed annually ({tier.savingsText})</span>
                          </>
                        ) : (
                          <span>Billed monthly · cancel anytime</span>
                        )}
                      </div>
                    </div>

                    {/* Feature bullets */}
                    <div className="hs-price__features">
                      <div className="hs-price__features-label">Everything included:</div>
                      <ul>
                        {tier.features.map((feat) => (
                          <li key={feat}>
                            <span className={`hs-price__tick ${tier.popular ? 'hs-price__tick--popular' : ''}`}>
                              <Check size={12} strokeWidth={2.8} />
                            </span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <button
                    type="button"
                    className={`hs-price__cta ${tier.popular ? 'hs-price__cta--primary' : ''}`}
                    onClick={() => navigate('/login')}
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
        <div className="hs-price__trust">
          <span>
            <Zap size={15} />
            14-Day Full Access Trial
          </span>
          <span className="hs-price__dot">•</span>
          <span>
            <ShieldCheck size={15} />
            No Credit Card Required
          </span>
          <span className="hs-price__dot">•</span>
          <span>
            <Headphones size={15} />
            Free Onboarding &amp; Migration
          </span>
        </div>
      </div>

      <style>{`
        .hs-price {
          position: relative;
          background: var(--hs-white);
          padding: clamp(56px, 7vw, 96px) 0;
          font-family: var(--hs-ui);
          overflow: hidden;
        }
        .hs-price__inner {
          position: relative;
          z-index: 1;
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
        }

        /* ── header ─────────────────────────────────────────────── */
        .hs-price__head {
          text-align: center;
          max-width: 720px;
          margin: 0 auto clamp(28px, 3.4vw, 44px);
        }
        .hs-price__title {
          margin: 22px 0 14px;
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: var(--hs-navy);
        }
        .hs-price__lede {
          margin: 0 auto;
          max-width: 640px;
          font-size: 16px;
          line-height: 1.75;
          color: var(--hs-muted);
        }

        /* ── billing toggle ────────────────────────────────────── */
        .hs-price__toggle-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: clamp(32px, 4vw, 48px);
        }
        .hs-price__toggle {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px;
          background: var(--hs-canvas);
          border: 1px solid var(--hs-line);
          border-radius: 8px;
        }
        .hs-price__toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          border: 1px solid transparent;
          border-radius: 5px;
          background: transparent;
          color: var(--hs-muted);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background .2s ease, color .2s ease, border-color .2s ease;
        }
        .hs-price__toggle-btn[data-active='true'] {
          background: var(--hs-white);
          border-color: var(--hs-line);
          color: var(--hs-navy);
          box-shadow: 0 1px 2px rgba(33, 51, 67, .06);
        }
        .hs-price__save {
          padding: 3px 9px;
          border-radius: 999px;
          background: var(--hs-orange-soft);
          color: var(--hs-orange-active);
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .04em;
        }
        .hs-price__toggle-btn[data-active='true'] .hs-price__save {
          background: var(--hs-orange);
          color: #fff;
        }

        /* ── cards ─────────────────────────────────────────────── */
        .hs-price__card {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 28px 26px;
          background: var(--hs-white);
          border: 1px solid var(--hs-line);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(33, 51, 67, .05);
          transition: transform .3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow .3s ease, border-color .3s ease;
        }
        .hs-price__card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 44px -24px rgba(33, 51, 67, .35);
        }
        .hs-price__card--popular {
          background: linear-gradient(180deg, var(--hs-orange-soft) 0%, var(--hs-white) 42%);
          border: 1.5px solid var(--hs-orange);
          box-shadow: 0 22px 54px -30px rgba(255, 92, 53, .55), 0 2px 10px rgba(33, 51, 67, .04);
        }
        .hs-price__card--popular:hover {
          box-shadow: 0 28px 62px -28px rgba(255, 92, 53, .6), 0 4px 16px rgba(33, 51, 67, .06);
        }

        .hs-price__badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-bottom: 18px;
          padding: 9px 16px;
          border-radius: 5px;
          background: var(--hs-canvas);
          border: 1px solid var(--hs-line);
          color: var(--hs-muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .hs-price__badge--popular {
          background: var(--hs-orange);
          border-color: var(--hs-orange);
          color: #fff;
          letter-spacing: .10em;
          box-shadow: 0 6px 18px -8px rgba(255, 92, 53, .7);
        }

        .hs-price__name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .hs-price__name {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--hs-navy);
        }
        .hs-price__tag {
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--hs-canvas);
          border: 1px solid var(--hs-line);
          color: var(--hs-muted);
          font-size: 10.5px;
          font-weight: 650;
        }
        .hs-price__tag--popular {
          background: var(--hs-orange-soft);
          border-color: var(--hs-orange-line);
          color: var(--hs-orange-active);
        }
        .hs-price__desc {
          margin: 0 0 24px;
          min-height: 40px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--hs-muted);
        }

        .hs-price__figures {
          padding: 18px 0;
          margin-bottom: 24px;
          border-top: 1px solid var(--hs-line);
          border-bottom: 1px solid var(--hs-line);
        }
        .hs-price__amount-row { display: flex; align-items: baseline; gap: 6px; }
        .hs-price__currency { font-size: 22px; font-weight: 500; color: var(--hs-muted); }
        .hs-price__amount {
          font-family: var(--hs-serif);
          font-size: clamp(36px, 3.6vw, 46px);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--hs-navy);
        }
        .hs-price__unit { font-size: 13px; font-weight: 500; color: var(--hs-muted); }
        .hs-price__billing {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--hs-forest);
        }
        .hs-price__billing--muted { color: var(--hs-muted); font-weight: 500; }

        .hs-price__features { margin-bottom: 30px; }
        .hs-price__features-label {
          margin-bottom: 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .10em;
          text-transform: uppercase;
          color: var(--hs-muted);
        }
        .hs-price__features ul {
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .hs-price__features li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--hs-navy-soft);
        }
        .hs-price__tick {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
          margin-top: 1px;
          border-radius: 50%;
          background: var(--hs-canvas);
          color: var(--hs-navy);
        }
        .hs-price__tick--popular { background: var(--hs-orange-soft); color: var(--hs-orange-active); }

        /* ── CTA ───────────────────────────────────────────────── */
        .hs-price__cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          border-radius: 5px;
          border: 1.5px solid var(--hs-line-strong);
          background: var(--hs-white);
          color: var(--hs-navy);
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease;
        }
        .hs-price__cta:hover {
          background: var(--hs-forest);
          border-color: var(--hs-forest);
          color: #fff;
        }
        .hs-price__cta--primary {
          background: var(--hs-orange);
          border-color: var(--hs-orange);
          color: #fff;
          box-shadow: 0 10px 26px -14px rgba(255, 92, 53, .8);
        }
        .hs-price__cta--primary:hover {
          background: var(--hs-orange-hover);
          border-color: var(--hs-orange-hover);
          color: #fff;
          box-shadow: 0 14px 32px -12px rgba(255, 92, 53, .8);
        }

        /* ── trust strip + FAQ ─────────────────────────────────── */
        .hs-price__trust {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 24px;
          margin-top: clamp(28px, 3.4vw, 44px);
          padding: 16px 24px;
          border: 1px solid var(--hs-line);
          border-radius: 10px;
          background: var(--hs-canvas);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--hs-navy-soft);
        }
        .hs-price__trust span { display: inline-flex; align-items: center; gap: 7px; }
        .hs-price__trust svg { color: var(--hs-orange-active); }
        .hs-price__dot { color: var(--hs-line-strong); }

        /* ── grid ──────────────────────────────────────────────── */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          align-items: stretch;
          width: 100%;
        }
        @media (max-width: 1140px) {
          .pricing-grid { grid-template-columns: 1fr; max-width: 520px; margin: 0 auto; gap: 28px; }
        }
        @media (max-width: 680px) {
          .pricing-grid { grid-template-columns: 1fr; max-width: 100%; gap: 20px; }
        }
      `}</style>
    </section>
  );
};

export default PricingSection;
