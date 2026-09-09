import React from 'react';

const FEATURES = [
  { t: 'Smart Lead Management', d: 'Capture, assign and track leads with custom fields, stages and pipelines built for telecom sales teams.', i: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { t: '1-Click Dialer & Call Recording', d: 'Make calls directly from the CRM with automatic call recording, feedback and CallIQ agent analysis.', i: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l1.42-1.42a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' },
  { t: 'Tasks & Scheduled Follow-ups', d: 'Stay on top of follow-ups, pending callbacks and task reminders with automatic overdue detection.', i: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { t: 'WhatsApp & Messaging', d: 'Send templated WhatsApp messages, track delivery and reply to leads without leaving the CRM.', i: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
  { t: 'Real Integrations', d: 'Native integrations with Facebook, JustDial, 99acres, WhatsApp Cloud, Knowlarity, CallerDesk and Maqsam.', i: 'M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83' },
  { t: 'Reports & Leaderboard', d: 'Live dashboards, team leaderboards and exportable reports to track calls, conversions and performance.', i: 'M22 12 18 12 15 21 9 3 6 12 2 12' },
  { t: 'Campaign Management', d: 'Run and track marketing campaigns end to end and route campaign leads straight into your pipeline.', i: 'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0' },
  { t: 'Team Operations & Access Control', d: 'Role-based permission templates, access tokens and team operations to manage users at scale.', i: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 11l2 2 4-4' },
  { t: 'Bulk Import & Blocklist', d: 'Import leads in bulk from Excel, manage stale leads and maintain a blocklist to keep data clean.', i: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="lp-features-section" style={{ padding: '90px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 10 }}>Everything your sales team needs</h2>
        <p style={{ color: '#64748b', fontSize: 15 }}>Built for telecom sales, support and operations teams.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 24 }}>
        {FEATURES.map((f) => (
          <div key={f.t} style={{ border: '1px solid #eef2f7', borderRadius: 16, padding: 26, background: '#fbfdff' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--theme-surface-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--theme-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={f.i} /></svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.t}</h3>
            <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
