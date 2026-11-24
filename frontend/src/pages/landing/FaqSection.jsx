import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * FAQ — two-column accordion rows, sitting between pricing and the footer.
 * Questions describe the whole AOTMS platform (sales CRM, WhatsApp and email
 * marketing, workforce, finance documents and the open API), not one module.
 */

const FAQS = [
  {
    q: 'What is AOTMS?',
    a: 'AOTMS is a business platform, not just a telecalling CRM. It holds your lead pipeline, WhatsApp and email campaigns, call recordings, attendance and daily activity, finance documents and an open API in one login. Teams use it to stop moving the same data between a spreadsheet, a dialer, a WhatsApp phone and a billing tool.',
  },
  {
    q: 'Who uses AOTMS?',
    a: 'Telecalling and inside-sales teams, training institutes and admissions offices, real-estate and portal-heavy businesses, and the HR and accounts staff who support them. Access is permission based — a counsellor sees their own pipeline and tasks, a team lead sees the department, HR sees attendance and payroll documents, and directors get the full audit trail.',
  },
  {
    q: 'Which modules come in one login?',
    a: 'Leads with custom stages and fields, campaigns, Meta Leads, WhatsApp inbox and blasts, message templates, email CRM and email blasts, demo bookings, call recordings, attendance, daily activity schedules, live employee tracking, leaderboards and reports, quotations, invoices, fee receipts, payslips, offer, experience and relieving letters, plus roles, permission templates and developer tools.',
  },
  {
    q: 'Where can leads come from?',
    a: 'Meta and Instagram lead ads, campaign-wise Google Sheets tabs, JustDial and other classified-portal webhooks (IndiaMart, 99acres, Housing, MagicBricks, Sulekha, TradeIndia), Excel or CSV imports, and manual entry. Each source maps to a pipeline and an owner, so a lead never sits in someone’s inbox waiting to be typed in.',
  },
  {
    q: 'How do WhatsApp and email follow-ups work?',
    a: 'The WhatsApp inbox is two-way on the official Meta Cloud API, so replies come from the same number customers already have. You can send template blasts outside the 24-hour window, reuse approved message templates, trigger keyword auto-replies and block opt-outs. Email campaigns and blasts run from the same contact records, and every send is logged on the lead.',
  },
  {
    q: 'Does it cover attendance, HR and finance documents?',
    a: 'Yes. Employees punch in and out with breaks, punches can sync from ZKTeco biometric devices, and admins see attendance records, live tracking and daily activity. From the same employee and customer records you can generate payslips, offer, experience and relieving letters, quotations, invoices and fee receipts.',
  },
  {
    q: 'Is there a mobile app, and can we connect our own systems?',
    a: 'An Android app lets counsellors dial, chat, record calls and punch in from the field, with recordings uploading in the background. For your own stack, AOTMS issues access tokens, exposes REST endpoints, accepts inbound webhooks and keeps API logs — and it connects to Google Sheets, Google Drive, Gmail, Razorpay, n8n and Zapier, plus Airtel, Jio and Vi SIP lines.',
  },
  {
    q: 'What does it cost and how do we start?',
    a: 'Plans start at ₹699 per user per month on yearly billing (Growth Starter), ₹1,299 for Professional Team and ₹2,499 for Enterprise Scale. Monthly billing is available, there are no setup fees or lock-in contracts, every plan starts with a 14-day full-access trial that needs no credit card, and GST invoices are issued for every payment. We also import your existing lead sheets and set up pipelines during onboarding.',
  },
];

export function FaqSection() {
  // Only one row stays open — opening another collapses the previous one.
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="hs-faq">
      <div className="hs-faq__inner">
        <h2 className="hs-faq__title">Frequently Asked Questions</h2>

        <div className="hs-faq__grid">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `hs-faq-panel-${index}`;

            return (
              <div key={faq.q} className="hs-faq__item" data-open={isOpen}>
                <button
                  type="button"
                  className="hs-faq__q"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                >
                  <ChevronRight className="hs-faq__chevron" size={17} strokeWidth={2.4} />
                  <span>{faq.q}</span>
                </button>

                <div className="hs-faq__panel" id={panelId} role="region" aria-hidden={!isOpen}>
                  <div className="hs-faq__panel-inner">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .hs-faq {
          position: relative;
          background: var(--hs-canvas);
          padding: clamp(56px, 7vw, 96px) 0;
          font-family: var(--hs-ui);
        }
        .hs-faq__inner {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
        }

        .hs-faq__title {
          margin: 0 0 clamp(30px, 3.6vw, 48px);
          font-family: var(--hs-serif);
          font-weight: 400;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.1;
          letter-spacing: -0.015em;
          text-align: center;
          color: var(--hs-navy);
        }

        .hs-faq__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px 20px;
          align-items: start;
        }

        .hs-faq__item {
          background: var(--hs-white);
          border: 1px solid var(--hs-line);
          border-radius: 10px;
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        .hs-faq__item:hover { border-color: var(--hs-line-strong); }
        .hs-faq__item[data-open='true'] {
          border-color: var(--hs-line-strong);
          box-shadow: 0 10px 26px -20px rgba(33, 51, 67, .45);
        }

        .hs-faq__q {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          padding: 20px 22px;
          border: none;
          background: none;
          text-align: left;
          font-family: inherit;
          font-size: 15px;
          font-weight: 650;
          line-height: 1.45;
          letter-spacing: -0.005em;
          color: var(--hs-navy);
          cursor: pointer;
        }

        .hs-faq__chevron {
          flex: 0 0 auto;
          margin-top: 1px;
          color: var(--hs-muted);
          transition: transform .22s ease, color .18s ease;
        }
        .hs-faq__item[data-open='true'] .hs-faq__chevron {
          transform: rotate(90deg);
          color: var(--hs-orange-active);
        }
        .hs-faq__q:hover .hs-faq__chevron { color: var(--hs-orange-active); }

        /* 0fr → 1fr animates the panel without measuring its content */
        .hs-faq__panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows .26s ease;
        }
        .hs-faq__item[data-open='true'] .hs-faq__panel {
          grid-template-rows: 1fr;
        }
        .hs-faq__panel-inner { overflow: hidden; }
        .hs-faq__panel p {
          margin: 0;
          padding: 0 22px 20px 51px;
          font-size: 14px;
          line-height: 1.7;
          color: var(--hs-muted);
        }

        @media (max-width: 860px) {
          .hs-faq__grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hs-faq__panel,
          .hs-faq__chevron,
          .hs-faq__item { transition: none; }
        }
      `}</style>
    </section>
  );
}

export default FaqSection;
