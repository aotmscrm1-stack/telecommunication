import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react';

/**
 * Footer — dark conversion band + sitemap columns + contact row, mirroring the
 * reference layout but filled with the product's real features, integrations
 * and support details (phone / email / campus address come from AOTMS).
 */

const SUPPORT_PHONE = '8019952233';
const SUPPORT_PHONE_HREF = 'tel:+918019952233';
const SUPPORT_WHATSAPP = 'https://wa.me/918019952233';
const SUPPORT_EMAIL = 'ameen@aotms.com';
const SUPPORT_ADDRESS =
  '2nd Floor, Pothuri Towers, MG Rd near DV Manor, Vijayawada - 540010';
const SUPPORT_MAP =
  'https://www.google.com/maps/search/?api=1&query=Pothuri+Towers+MG+Road+Vijayawada+540010';

const PLATFORM_LEFT = [
  { label: 'Lead Pipeline & Stages', href: '#features' },
  { label: 'Meta Leads Hub', href: '#features' },
  { label: 'WhatsApp Inbox', href: '#features' },
  { label: 'WhatsApp Blast Campaigns', href: '#features' },
  { label: 'Message Templates', href: '#features' },
  { label: 'Email CRM & Blasts', href: '#features' },
];

const PLATFORM_RIGHT = [
  { label: 'Call Recordings & AI Transcripts', href: '#features' },
  { label: 'Bulk Excel Import', href: '#features' },
  { label: 'Demo Bookings', href: '#features' },
  { label: 'Digital Calendar', href: '#features' },
  { label: 'Leaderboard & Reports', href: '#features' },
  { label: 'Android App', href: '#features' },
];

const OPERATIONS_LEFT = [
  { label: 'Attendance & Punch-in', href: '#features' },
  { label: 'Biometric Device Sync', href: '#services' },
  { label: 'Live Employee Tracking', href: '#features' },
  { label: 'Daily Activity Schedule', href: '#features' },
  { label: 'Departments & Roles', href: '#features' },
  { label: 'Idle Lead Alerts', href: '#features' },
];

const OPERATIONS_RIGHT = [
  { label: 'Quotations', href: '#features' },
  { label: 'Invoices & Billing', href: '#features' },
  { label: 'Fee Receipts', href: '#features' },
  { label: 'Payslips', href: '#features' },
  { label: 'Offer & Experience Letters', href: '#features' },
  { label: 'Relieving Letters', href: '#features' },
];

const COMPANY_LINKS = [
  { label: 'About AOTMS', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Book a demo', href: '#book-demo' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact us', href: '#contact' },
];

const CUSTOMER_LINKS = [
  { label: 'Customer support', href: `mailto:${SUPPORT_EMAIL}` },
  { label: 'Free onboarding & migration', href: '#book-demo' },
  { label: '14-day free trial', href: '#pricing' },
];

const DEVELOPER_LINKS = [
  { label: 'REST API & Access Tokens', href: '#services' },
  { label: 'Inbound Webhooks', href: '#services' },
  { label: 'Integrations Catalog', href: '#services' },
  { label: 'API & System Logs', href: '#services' },
];

const CHANNELS = [
  { label: 'WhatsApp support', href: SUPPORT_WHATSAPP, Icon: MessageCircle, external: true },
  { label: 'Call support', href: SUPPORT_PHONE_HREF, Icon: Phone, external: false },
  { label: 'Email support', href: `mailto:${SUPPORT_EMAIL}`, Icon: Mail, external: false },
  { label: 'Campus address', href: SUPPORT_MAP, Icon: MapPin, external: true },
];

const isExternalUrl = (href) => /^https?:/.test(href);

function LinkList({ items }) {
  return (
    <ul className="hs-foot__list">
      {items.map((item) =>
        item.href.startsWith('#') ? (
          <li key={item.label}>
            <a className="hs-foot__link" href={item.href}>
              {item.label}
            </a>
          </li>
        ) : (
          <li key={item.label}>
            <a
              className="hs-foot__link"
              href={item.href}
              target={isExternalUrl(item.href) ? '_blank' : undefined}
              rel={isExternalUrl(item.href) ? 'noreferrer' : undefined}
            >
              {item.label}
            </a>
          </li>
        ),
      )}
    </ul>
  );
}

export const Footer = ({ onBookDemo }) => {
  const navigate = useNavigate();

  return (
    <footer id="contact" className="hs-foot">
      {/* ══════════════════════════════════════════════
          CONVERSION BAND
          ══════════════════════════════════════════════ */}
      <div className="hs-foot__cta">
        <div className="hs-foot__cta-inner">
          <div className="hs-foot__cta-copy">
            <h2 className="hs-foot__cta-title">Run sales and your back office from one login</h2>
            <p className="hs-foot__cta-lede">
              Bring leads, WhatsApp, calls, attendance and documents onto one platform. We import
              your data, connect your number and train each team — counsellors, HR and accounts.
            </p>
            <div className="hs-foot__cta-actions">
              <button type="button" className="hs-foot__btn hs-foot__btn--primary" onClick={() => onBookDemo?.()}>
                Book a free demo
                <ArrowRight size={16} strokeWidth={2.6} />
              </button>
              <button type="button" className="hs-foot__btn hs-foot__btn--ghost" onClick={() => navigate('/login')}>
                Sign in to the CRM
              </button>
            </div>
          </div>

          {/* Product visual — WhatsApp reply card on an orange cut-out shape */}
          <div className="hs-foot__visual" aria-hidden="true">
            <span className="hs-foot__shape" />
            <div className="hs-foot__chat">
              <div className="hs-foot__chat-head">
                <span className="hs-foot__avatar">RK</span>
                <div className="hs-foot__chat-who">
                  <p className="hs-foot__chat-name">Ravindra Kumar</p>
                  <p className="hs-foot__chat-meta">Full Stack Java · Hot lead</p>
                </div>
                <span className="hs-foot__chat-tag">WhatsApp</span>
              </div>

              <p className="hs-foot__bubble hs-foot__bubble--in">Is the Java batch starting this month?</p>
              <p className="hs-foot__bubble hs-foot__bubble--out">
                Yes — next batch starts Monday. I&apos;ve sent the fee details and syllabus.
              </p>

              <p className="hs-foot__chat-foot">
                <Sparkles size={12} strokeWidth={2.4} />
                Keyword auto-reply · 12s
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SITEMAP COLUMNS
          ══════════════════════════════════════════════ */}
      <div className="hs-foot__body">
        <div className="hs-foot__inner">
          <div className="hs-foot__links">
            <div className="hs-foot__col hs-foot__col--wide">
              <h3 className="hs-foot__heading">Platform</h3>
              <div className="hs-foot__split">
                <LinkList items={PLATFORM_LEFT} />
                <LinkList items={PLATFORM_RIGHT} />
              </div>
            </div>

            <div className="hs-foot__col hs-foot__col--wide hs-foot__col--divided">
              <h3 className="hs-foot__heading">Workforce &amp; Finance</h3>
              <div className="hs-foot__split">
                <LinkList items={OPERATIONS_LEFT} />
                <LinkList items={OPERATIONS_RIGHT} />
              </div>
            </div>

            <div className="hs-foot__col">
              <h3 className="hs-foot__heading">Company</h3>
              <LinkList items={COMPANY_LINKS} />
              <button type="button" className="hs-foot__link hs-foot__link--button" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </div>

            <div className="hs-foot__col">
              <h3 className="hs-foot__heading">Developers</h3>
              <LinkList items={DEVELOPER_LINKS} />

              <h3 className="hs-foot__heading hs-foot__heading--stacked">Get started</h3>
              <LinkList items={CUSTOMER_LINKS} />
            </div>
          </div>

          {/* ── contact channels ─────────────────────────────────── */}
          <div className="hs-foot__channels">
            <span className="hs-foot__rule" />
            <div className="hs-foot__channel-list">
              {CHANNELS.map(({ label, href, Icon, external }) => (
                <a
                  key={label}
                  className="hs-foot__channel"
                  href={href}
                  aria-label={label}
                  title={label}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                >
                  <Icon size={19} strokeWidth={1.9} />
                </a>
              ))}
            </div>
            <span className="hs-foot__rule" />
          </div>

          {/* ── wordmark + legal ─────────────────────────────────── */}
          <div className="hs-foot__brand">
            <p className="hs-foot__wordmark">
              <span className="hs-foot__mark" />
              AOTMS<span className="hs-foot__wordmark-sub">CRM</span>
            </p>
            <p className="hs-foot__copyright">
              Copyright © 2026 AOTMS. All rights reserved.
            </p>
          </div>

          <div className="hs-foot__legal">
            <a href={SUPPORT_PHONE_HREF}>+91 {SUPPORT_PHONE}</a>
            <span aria-hidden="true">·</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <span aria-hidden="true">·</span>
            <a href={SUPPORT_MAP} target="_blank" rel="noreferrer">
              {SUPPORT_ADDRESS}
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .hs-foot {
          font-family: var(--hs-ui);
          background: var(--hs-forest-deep);
          color: #fff;
        }

        /* ── conversion band ───────────────────────────────────── */
        .hs-foot__cta {
          background: var(--hs-forest-band);
          padding: clamp(44px, 6vw, 76px) 0;
          border-top: 1px solid rgba(255, 255, 255, .06);
        }
        .hs-foot__cta-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.62fr);
          align-items: center;
          gap: clamp(32px, 5vw, 72px);
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
        }
        .hs-foot__cta-title {
          margin: 0 0 14px;
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(26px, 3.2vw, 38px);
          line-height: 1.14;
          letter-spacing: -0.015em;
          color: #fff;
        }
        .hs-foot__cta-lede {
          max-width: 560px;
          margin: 0 0 26px;
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255, 255, 255, .72);
        }
        .hs-foot__cta-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .hs-foot__btn {
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
        .hs-foot__btn--primary { background: var(--hs-orange); color: #fff; }
        .hs-foot__btn--primary:hover {
          background: var(--hs-orange-hover);
          box-shadow: 0 10px 24px -10px rgba(255, 92, 53, .7);
          transform: translateY(-1px);
        }
        .hs-foot__btn--primary:active { background: var(--hs-orange-active); transform: none; }
        .hs-foot__btn--ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, .3);
          font-weight: 600;
        }
        .hs-foot__btn--ghost:hover { background: rgba(255, 255, 255, .1); }

        /* ── product visual ────────────────────────────────────── */
        .hs-foot__visual {
          position: relative;
          width: min(380px, 100%);
          margin-left: auto;
        }
        .hs-foot__shape {
          position: absolute;
          inset: 16px 0 0 22px;
          background: var(--hs-orange);
          border-radius: 14px;
          clip-path: polygon(20% 0%, 100% 12%, 86% 100%, 0% 88%);
        }
        .hs-foot__chat {
          position: relative;
          padding: 16px 16px 12px;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 26px 54px -26px rgba(0, 0, 0, .6);
        }
        .hs-foot__chat-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .hs-foot__avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: var(--hs-forest);
          color: var(--hs-forest-text);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: .02em;
        }
        .hs-foot__chat-who { flex: 1; min-width: 0; }
        .hs-foot__chat-name { margin: 0; font-size: 13px; font-weight: 700; color: var(--hs-navy); }
        .hs-foot__chat-meta { margin: 1px 0 0; font-size: 10.5px; color: var(--hs-muted); }
        .hs-foot__chat-tag {
          padding: 3px 8px;
          border-radius: 4px;
          background: var(--hs-orange-soft);
          color: var(--hs-orange-active);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: .04em;
        }
        .hs-foot__bubble {
          margin: 0 0 8px;
          padding: 9px 11px;
          font-size: 11.5px;
          line-height: 1.5;
          border-radius: 8px;
          max-width: 88%;
        }
        .hs-foot__bubble--in { background: var(--hs-canvas); color: var(--hs-navy); border-top-left-radius: 3px; }
        .hs-foot__bubble--out {
          margin-left: auto;
          background: var(--hs-forest);
          color: var(--hs-forest-text);
          border-top-right-radius: 3px;
        }
        .hs-foot__chat-foot {
          display: flex;
          align-items: center;
          gap: 5px;
          margin: 10px 0 0;
          font-size: 10px;
          font-weight: 600;
          color: var(--hs-muted);
        }
        .hs-foot__chat-foot svg { color: var(--hs-orange-active); }

        /* ── sitemap ───────────────────────────────────────────── */
        .hs-foot__body { padding: clamp(36px, 5vw, 60px) 0 clamp(24px, 3vw, 36px); }
        .hs-foot__inner {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
        }
        .hs-foot__links {
          display: grid;
          grid-template-columns: 1.5fr 1.5fr 0.85fr 0.95fr;
          gap: clamp(24px, 3vw, 44px);
        }
        .hs-foot__col--divided {
          border-left: 1px solid rgba(255, 255, 255, .12);
          padding-left: clamp(20px, 2.6vw, 40px);
        }
        .hs-foot__heading {
          margin: 0 0 14px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .01em;
          color: #fff;
        }
        .hs-foot__heading--stacked { margin-top: 28px; }
        .hs-foot__split {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px clamp(16px, 2vw, 28px);
        }
        .hs-foot__list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .hs-foot__link {
          display: inline-block;
          padding: 0;
          border: none;
          background: none;
          font-family: inherit;
          font-size: 12.5px;
          line-height: 1.5;
          color: rgba(255, 255, 255, .66);
          text-decoration: none;
          cursor: pointer;
          transition: color .16s ease;
        }
        .hs-foot__link:hover { color: #fff; }
        .hs-foot__link--button { margin-top: 9px; text-align: left; }

        /* ── channels + brand + legal ──────────────────────────── */
        .hs-foot__channels {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: clamp(32px, 4vw, 48px);
        }
        .hs-foot__rule { flex: 1 1 auto; height: 1px; background: rgba(255, 255, 255, .14); }
        .hs-foot__channel-list { display: flex; align-items: center; gap: 24px; }
        .hs-foot__channel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, .8);
          transition: color .16s ease, transform .16s ease;
        }
        .hs-foot__channel:hover { color: var(--hs-orange-hover); transform: translateY(-1px); }

        .hs-foot__brand { text-align: center; margin-top: clamp(24px, 3vw, 34px); }
        .hs-foot__wordmark {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #fff;
        }
        .hs-foot__mark {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          background: var(--hs-orange);
        }
        .hs-foot__wordmark-sub {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .12em;
          color: rgba(255, 255, 255, .5);
        }
        .hs-foot__copyright {
          margin: 8px 0 0;
          font-size: 11.5px;
          color: rgba(255, 255, 255, .45);
        }

        .hs-foot__legal {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
          font-size: 11.5px;
          color: rgba(255, 255, 255, .4);
        }
        .hs-foot__legal a {
          color: rgba(255, 255, 255, .55);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color .16s ease;
        }
        .hs-foot__legal a:hover { color: #fff; }

        @media (max-width: 1040px) {
          .hs-foot__cta-inner { grid-template-columns: 1fr; }
          .hs-foot__visual { margin: 8px auto 0; }
          .hs-foot__links { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; }
          .hs-foot__col--divided { border-left: none; padding-left: 0; }
        }
        @media (max-width: 620px) {
          .hs-foot__links { grid-template-columns: 1fr; }
          .hs-foot__cta-actions .hs-foot__btn { flex: 1 1 100%; }
          .hs-foot__channel-list { gap: 18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs-foot__btn,
          .hs-foot__link,
          .hs-foot__channel { transition: none; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
