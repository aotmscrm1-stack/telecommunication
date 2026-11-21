import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  ListChecks,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import BookingCard from './BookingCard';
import { gradients } from './theme';

/**
 * Hero — editorial serif headline on a cool tinted canvas, with a lead record
 * mockup (forest card + floating action menu + award sticker) on the right.
 * The demo form keeps its own dark band directly below so every CTA on the page
 * (#book-demo) still lands on a working form.
 */

const RECORD_ACTIONS = [
  { label: 'Note', Icon: StickyNote },
  { label: 'WhatsApp', Icon: MessageCircle },
  { label: 'Call', Icon: Phone },
  { label: 'Task', Icon: ListChecks },
  { label: 'Email', Icon: Mail },
];

const RECORD_MENU = [
  'Follow up tomorrow',
  'Assign to counsellor',
  'View lead activity',
  'View WhatsApp history',
];

export function HeroSection({ onBookDemo }) {
  const navigate = useNavigate();

  return (
    <>
      <section id="home" className="hs-hero">
        <div className="hs-hero__inner">
          <nav className="hs-breadcrumb" aria-label="Breadcrumb">
            <a href="#home">Home</a>
            <ChevronRight size={14} strokeWidth={2.4} />
            <span>AOTMS CRM</span>
          </nav>

          <div className="hs-hero__grid">
            {/* ── COPY ───────────────────────────────────────────────── */}
            <div className="hs-hero__copy">
              <span className="hs-hero__eyebrow">AOTMS CRM</span>

              <h1 className="hs-hero__title">
                CRM Software for Telecalling Teams &amp; Training Institutes
              </h1>

              <p className="hs-hero__lede">
                Your leads deserve better than spreadsheets and lost WhatsApp chats. AOTMS CRM puts
                every enquiry, call, blast and follow-up on one screen — with an AI telecaller that
                keeps qualifying students after office hours.
              </p>

              <div className="hs-hero__actions">
                <button type="button" className="hs-btn hs-btn--primary hs-hero__cta" onClick={() => onBookDemo?.()}>
                  Get AOTMS CRM
                  <ArrowRight size={17} strokeWidth={2.6} />
                </button>
              </div>

              <p className="hs-hero__note">
                No credit card required. We import your leads and set up your pipeline for you.
              </p>

              <p className="hs-hero__login">
                Already a counsellor?{' '}
                <button type="button" onClick={() => navigate('/login')}>
                  Sign in to the CRM
                </button>
              </p>
            </div>

            {/* ── RECORD MOCKUP ──────────────────────────────────────── */}
            <div className="hs-hero__visual" aria-hidden="true">
              <div className="hs-leadcard">
                <div className="hs-leadcard__head">
                  <span className="hs-leadcard__avatar">RK</span>
                  <div className="hs-leadcard__who">
                    <p className="hs-leadcard__name">Ravindra Kumar</p>
                    <p className="hs-leadcard__role">Full Stack Java · Batch 2026</p>
                    <p className="hs-leadcard__meta">
                      <Mail size={13} strokeWidth={2} />
                      ravindra.kumar@gmail.com
                    </p>
                    <p className="hs-leadcard__meta">
                      <Phone size={13} strokeWidth={2} />
                      +91 90000 12345
                    </p>
                  </div>
                </div>

                <div className="hs-leadcard__actions">
                  {RECORD_ACTIONS.map(({ label, Icon }) => (
                    <span key={label} className="hs-leadcard__action">
                      <Icon size={16} strokeWidth={1.9} />
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="hs-leadmenu">
                {RECORD_MENU.map((row) => (
                  <span key={row} className="hs-leadmenu__row">
                    {row}
                  </span>
                ))}
                <span className="hs-leadmenu__row hs-leadmenu__row--ai">
                  <Sparkles size={14} strokeWidth={2.2} />
                  Summarise with AI
                </span>
                <span className="hs-leadmenu__row hs-leadmenu__row--inline">
                  Search in Google
                  <ExternalLink size={13} strokeWidth={2.2} />
                </span>
                <span className="hs-leadmenu__row">Opt out of blast</span>
                <span className="hs-leadmenu__row hs-leadmenu__row--last">Export contact</span>
              </div>

              <div className="hs-sticker">
                <span className="hs-sticker__top">EDITION 2026</span>
                <span className="hs-sticker__body">
                  <span className="hs-sticker__title">Leader</span>
                  <span className="hs-sticker__sub">TELECALLING CRM</span>
                </span>
                <span className="hs-sticker__zig" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO FORM (anchor for every CTA) ───────────────────────── */}
      <section id="book-demo" className="hs-book">
        <div className="hs-book__inner">
          <div className="hs-book__panel">
            <div className="hs-book__head">
              <h2>Book a 30-minute walkthrough</h2>
              <p>See the WhatsApp inbox, the AI telecaller and the lead pipeline running on your own data.</p>
            </div>
            <BookingCard />
          </div>
        </div>
      </section>

      <style>{`
        .hs-hero {
          position: relative;
          background: var(--hs-hero-tint);
          padding: 152px 0 clamp(40px, 6vw, 78px);
          font-family: var(--hs-ui);
          overflow: hidden;
        }

        .hs-hero__inner {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
        }

        .hs-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: clamp(28px, 4vw, 48px);
          font-size: 13.5px;
          color: var(--hs-muted);
        }
        .hs-breadcrumb a { color: var(--hs-navy-soft); font-weight: 600; text-decoration: none; }
        .hs-breadcrumb a:hover { color: var(--hs-orange-active); }
        .hs-breadcrumb svg { color: var(--hs-line-strong); }

        .hs-hero__grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.02fr);
          gap: clamp(32px, 5vw, 80px);
          align-items: center;
        }

        .hs-hero__eyebrow {
          display: inline-block;
          padding: 7px 11px;
          background: #fff;
          border: 1px solid var(--hs-line-strong);
          border-radius: 4px;
          color: var(--hs-navy);
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: .01em;
        }

        .hs-hero__title {
          margin: 22px 0 22px;
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(34px, 4.3vw, 58px);
          line-height: 1.08;
          letter-spacing: -0.015em;
          color: var(--hs-navy);
        }

        .hs-hero__lede {
          max-width: 560px;
          margin: 0 0 30px;
          font-size: 16.5px;
          line-height: 1.75;
          color: var(--hs-muted);
        }

        .hs-hero__actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

        .hs-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: none;
          border-radius: 5px;
          font-family: inherit;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .hs-btn--primary {
          background: var(--hs-orange);
          color: #fff;
          padding: 16px 26px;
          font-size: 15.5px;
          box-shadow: 0 1px 0 rgba(33, 51, 67, .05);
        }
        .hs-btn--primary:hover {
          background: var(--hs-orange-hover);
          box-shadow: 0 10px 24px -10px rgba(255, 92, 53, .7);
          transform: translateY(-1px);
        }
        .hs-btn--primary:active { background: var(--hs-orange-active); transform: none; }

        .hs-hero__note { margin: 20px 0 0; font-size: 13.5px; color: var(--hs-navy-soft); }

        .hs-hero__login { margin: 26px 0 0; font-size: 13.5px; color: var(--hs-muted); }
        .hs-hero__login button {
          padding: 0;
          border: none;
          background: none;
          color: var(--hs-orange-active);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .hs-hero__login button:hover { color: var(--hs-navy); }

        /* ── record mockup ────────────────────────────────────────── */
        .hs-hero__visual {
          position: relative;
          min-height: 452px;
          max-width: 640px;
          width: 100%;
          margin-left: auto;
        }

        .hs-leadcard {
          position: absolute;
          left: 0;
          top: 52px;
          width: 344px;
          padding: 30px 26px 22px;
          border-radius: 8px;
          background: var(--hs-forest);
          color: #fff;
          box-shadow: 0 26px 60px -32px rgba(11, 27, 38, .75);
        }
        .hs-leadcard__head { display: flex; align-items: flex-start; gap: 14px; }
        .hs-leadcard__avatar {
          width: 48px;
          height: 48px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: rgba(255, 255, 255, .14);
          border: 1px solid rgba(255, 255, 255, .28);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: .02em;
        }
        .hs-leadcard__who { min-width: 0; }
        .hs-leadcard__name {
          margin: 4px 0 6px;
          font-size: 21px;
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.15;
        }
        .hs-leadcard__role { margin: 0 0 10px; font-size: 13px; color: var(--hs-forest-text); }
        .hs-leadcard__meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 0 4px;
          font-size: 13px;
          color: var(--hs-forest-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hs-leadcard__meta svg { flex: 0 0 auto; opacity: .85; }

        .hs-leadcard__actions {
          display: flex;
          gap: 8px;
          margin-top: 40px;
        }
        .hs-leadcard__action {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 4px 8px;
          border: 1px solid rgba(255, 255, 255, .24);
          border-radius: 3px;
          color: var(--hs-forest-text);
          font-size: 9.5px;
          letter-spacing: .01em;
          white-space: nowrap;
        }
        .hs-leadcard__action svg { color: #fff; }

        .hs-leadmenu {
          position: absolute;
          right: -4px;
          top: 24px;
          width: 236px;
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid var(--hs-line-strong);
          border-radius: 6px;
          box-shadow: 0 30px 60px -26px rgba(33, 51, 67, .5);
          overflow: hidden;
        }
        .hs-leadmenu__row {
          padding: 13px 18px;
          border-bottom: 1px solid var(--hs-line);
          font-size: 13.5px;
          color: var(--hs-navy);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hs-leadmenu__row--inline { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .hs-leadmenu__row--ai {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--hs-pink-soft);
          color: var(--hs-pink-text);
          font-weight: 600;
          border-bottom-color: #F6DCE7;
        }
        .hs-leadmenu__row--last { border-bottom: none; }

        .hs-sticker {
          position: absolute;
          top: 0;
          right: 42px;
          width: 118px;
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid var(--hs-navy);
          box-shadow: 0 18px 34px -20px rgba(33, 51, 67, .55);
          z-index: 2;
        }
        .hs-sticker__top {
          background: var(--hs-craft-red);
          color: #fff;
          padding: 4px 0;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .07em;
          text-align: center;
        }
        .hs-sticker__body { display: flex; flex-direction: column; align-items: center; padding: 8px 6px 7px; }
        .hs-sticker__title { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; color: var(--hs-navy); }
        .hs-sticker__sub { margin-top: 2px; font-size: 7.5px; font-weight: 700; letter-spacing: .09em; color: var(--hs-muted); }
        .hs-sticker__zig {
          height: 11px;
          background: var(--hs-craft-yellow);
          clip-path: polygon(0 0, 100% 0, 100% 38%, 50% 100%, 0 38%);
        }

        /* ── demo form band ───────────────────────────────────────── */
        .hs-book { background: #fff; padding: clamp(34px, 5vw, 64px) 0 clamp(44px, 6vw, 76px); font-family: var(--hs-ui); }
        .hs-book__inner { max-width: 1100px; margin: 0 auto; padding: 0 clamp(16px, 3vw, 40px); }
        .hs-book__panel {
          position: relative;
          padding: clamp(22px, 3vw, 40px);
          border-radius: 22px;
          background: ${gradients.night};
          box-shadow: 0 40px 90px -50px rgba(11, 17, 32, .65);
        }
        .hs-book__head { text-align: center; margin-bottom: clamp(18px, 2vw, 26px); color: #fff; }
        .hs-book__head h2 {
          margin: 0 0 8px;
          font-family: var(--hs-serif);
          font-size: clamp(24px, 2.6vw, 32px);
          font-weight: 400;
          letter-spacing: -0.01em;
        }
        .hs-book__head p { margin: 0; font-size: 14px; color: rgba(255, 255, 255, .68); }

        @media (max-width: 1080px) {
          .hs-hero__grid { grid-template-columns: 1fr; gap: 44px; }
          .hs-hero__visual { min-height: 0; max-width: 560px; margin: 0 auto; padding-top: 10px; }
          .hs-leadcard { position: relative; top: 0; width: 100%; }
          .hs-leadmenu { position: relative; right: auto; top: -18px; width: min(300px, 100%); margin-left: auto; }
          .hs-sticker { top: -10px; right: 16px; width: 104px; }
        }
        @media (max-width: 640px) {
          .hs-hero { padding-top: 138px; }
          .hs-leadcard__actions { flex-wrap: wrap; }
          .hs-leadcard__action { flex: 1 1 28%; }
          .hs-sticker { display: none; }
          .hs-hero__cta { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs-btn { transition: none; }
        }
      `}</style>
    </>
  );
}

export default HeroSection;