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
  'View call transcript',
  'Send WhatsApp template',
  'Create quotation',
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
              <span className="hs-hero__eyebrow">AOTMS · SALES + OPERATIONS PLATFORM</span>

              <h1 className="hs-hero__title">
                Run sales, WhatsApp and your back office from one login
              </h1>

              <p className="hs-hero__lede">
                AOTMS does more than track leads: Meta, JustDial and spreadsheet leads, recorded
                calls, WhatsApp replies, attendance and quotations — all in one place.
              </p>

              <div className="hs-hero__actions">
                <button type="button" className="hs-btn hs-btn--primary hs-hero__cta" onClick={() => onBookDemo?.()}>
                  Book a free demo
                  <ArrowRight size={17} strokeWidth={2.6} />
                </button>
              </div>

              <p className="hs-hero__note">
                No credit card required. We import your leads and set up your pipeline for you.
              </p>

              <p className="hs-hero__login">
                Already on AOTMS?{' '}
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
                  <span className="hs-leadmenu__ai">
                    <span className="hs-leadmenu__ai-title">Transcript ready</span>
                    <span className="hs-leadmenu__ai-sub">Telugu → English</span>
                  </span>
                </span>
                <span className="hs-leadmenu__row hs-leadmenu__row--inline">
                  Open Android app
                  <ExternalLink size={13} strokeWidth={2.2} />
                </span>
                <span className="hs-leadmenu__row">Opt out of blast</span>
                <span className="hs-leadmenu__row hs-leadmenu__row--last">Export contact</span>
              </div>

              <div className="hs-sticker">
                <span className="hs-sticker__top">EDITION 2026</span>
                <span className="hs-sticker__body">
                  <span className="hs-sticker__title">Leader</span>
                  <span className="hs-sticker__sub">ALL-IN-ONE CRM</span>
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
              <p>See the pipeline, WhatsApp inbox, attendance and reports running on your own data.</p>
            </div>
            <BookingCard />
          </div>
        </div>
      </section>

      <style>{`
        .hs-hero {
          position: relative;
          background: var(--hs-hero-tint);
          /* Clears the 126px fixed header, then scales with viewport height so the
             whole copy column (down to the sign-in line) stays above the fold. */
          padding: clamp(132px, min(10.5vw, 15vh), 152px) 0 clamp(32px, 4vw, 64px);
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
          margin-bottom: clamp(18px, min(2.2vw, 3.2vh), 30px);
          font-size: 15px;
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
          padding: 7px 12px;
          background: #fff;
          border: 1px solid var(--hs-line-strong);
          border-radius: 4px;
          color: var(--hs-navy);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: .01em;
        }

        .hs-hero__title {
          margin: 14px 0 16px;
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(34px, min(4vw, 6vh), 56px);
          line-height: 1.1;
          letter-spacing: -0.015em;
          text-wrap: balance;
          color: var(--hs-navy);
        }

        .hs-hero__lede {
          max-width: 560px;
          margin: 0 0 22px;
          font-size: 17.5px;
          line-height: 1.65;
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

        /* Hero CTA runs a step larger than the shared navbar button (declared after
           .hs-btn--primary so it wins the cascade). */
        .hs-hero__cta { padding: 17px 28px; font-size: 16.5px; }

        .hs-hero__note { margin: 14px 0 0; font-size: 14px; color: var(--hs-navy-soft); }

        .hs-hero__login { margin: 14px 0 0; font-size: 14px; color: var(--hs-muted); }
        .hs-hero__login button {
          padding: 0;
          border: none;
          background: none;
          color: var(--hs-orange-active);
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .hs-hero__login button:hover { color: var(--hs-navy); }

        /* ── record mockup ────────────────────────────────────────── */
        .hs-hero__visual {
          position: relative;
          min-height: 455px;
          /* Fixed stage: card (352) + 4px overlap + menu (208). */
          max-width: 556px;
          width: 100%;
          margin-left: auto;
        }

        .hs-leadcard {
          position: absolute;
          left: 0;
          top: 52px;
          width: 352px;
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
          gap: 7px;
          margin-top: 40px;
        }
        .hs-leadcard__action {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 2px 8px;
          border: 1px solid rgba(255, 255, 255, .24);
          border-radius: 3px;
          color: var(--hs-forest-text);
          font-size: 9px;
          letter-spacing: 0;
          white-space: nowrap;
        }
        .hs-leadcard__action > span {
          display: block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hs-leadcard__action svg { color: #fff; flex: 0 0 auto; }

        .hs-leadmenu {
          position: absolute;
          left: 348px;
          top: 24px;
          width: 208px;
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
          gap: 9px;
          padding-top: 11px;
          padding-bottom: 11px;
          background: var(--hs-pink-soft);
          color: var(--hs-pink-text);
          font-weight: 600;
          border-bottom-color: #F6DCE7;
        }
        .hs-leadmenu__row--ai > svg { flex: 0 0 auto; }
        .hs-leadmenu__ai { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .hs-leadmenu__ai-title { font-size: 13px; line-height: 1.25; }
        .hs-leadmenu__ai-sub { font-size: 11px; font-weight: 600; line-height: 1.25; opacity: .78; }
        .hs-leadmenu__row--last { border-bottom: none; }

        .hs-sticker {
          position: absolute;
          top: -14px;
          left: -16px;
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
          background: var(--hs-forest-band);
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

        @media (max-width: 1260px) {
          .hs-hero__grid { grid-template-columns: 1fr; gap: 44px; }
          .hs-hero__visual { min-height: 0; max-width: 560px; margin: 0 auto; padding-top: 10px; }
          .hs-leadcard { position: relative; top: 0; width: 100%; }
          .hs-leadmenu { position: relative; left: auto; right: auto; top: -18px; width: min(300px, 100%); margin-left: auto; }
          .hs-sticker { top: -12px; right: 14px; left: auto; width: 104px; }
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