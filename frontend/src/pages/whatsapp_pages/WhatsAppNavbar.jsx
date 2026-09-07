import React, { useState, useRef, useEffect } from 'react';

const GREEN      = '#25D366';
const DARK_GREEN = '#128C7E';
const PURPLE     = '#5b3fc7';
const TEXT_MAIN  = '#2d2d6b';
const BORDER     = '#e5e2f5';
const BG         = '#f8f7ff';

export const NAV_ITEMS = [
  { key: 'inbox', label: 'Inbox',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { key: 'broadcasts', label: 'Broadcasts',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 8.5c0 2.5-1.5 4.5-3.5 5.5L22 21H16l-1.5-3h-5L8 21H2l3.5-7C3.5 13 2 11 2 8.5 2 5.5 4.5 3 8 3h8c3.5 0 6 2.5 6 5.5z"/></svg> },
  { key: 'templates',  label: 'Templates',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { key: 'lists',      label: 'Lists',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg> },
  { key: 'interactive',label: 'Interactive',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg> },
  { key: 'analytics',  label: 'Analytics',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: 'setup',      label: 'Setup',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

export const HamburgerMenu = ({ activeTab, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        title="Menu"
        style={{
          width: 34, height: 34, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          background: open ? '#f0ecff' : '#fff',
          border: `1.5px solid ${open ? PURPLE : BORDER}`,
          borderRadius: 8, cursor: 'pointer', padding: 0, transition: 'all 0.15s',
        }}
      >
        {[0,1,2].map(i => (
          <span key={i} style={{ display: 'block', width: 15, height: 2, background: open ? PURPLE : '#555', borderRadius: 2 }} />
        ))}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 40, left: 0,
          background: '#fff', border: `1px solid ${BORDER}`,
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 400, minWidth: 200, overflow: 'hidden',
          animation: 'fadeDown 0.12s ease',
        }}>
          <style>{`@keyframes fadeDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {NAV_ITEMS.map((item, idx) => (
            <button key={item.key}
              onClick={() => { onSelect(item.key); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 16px',
                background: activeTab === item.key ? '#f0fdf4' : '#fff',
                color: activeTab === item.key ? DARK_GREEN : TEXT_MAIN,
                border: 'none',
                borderBottom: idx < NAV_ITEMS.length - 1 ? `1px solid #f5f5f5` : 'none',
                cursor: 'pointer', fontSize: 13,
                fontWeight: activeTab === item.key ? 700 : 500,
                textAlign: 'left', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (activeTab !== item.key) e.currentTarget.style.background = BG; }}
              onMouseLeave={e => { if (activeTab !== item.key) e.currentTarget.style.background = '#fff'; }}
            >
              <span style={{ color: activeTab === item.key ? GREEN : '#aaa', flexShrink: 0, display: 'flex' }}>{item.icon}</span>
              {item.label}
              {activeTab === item.key && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: GREEN }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const WhatsAppNavbar = ({ activeTab, setActiveTab }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${BORDER}`, paddingBottom: 12, marginBottom: 16 }}>
      <HamburgerMenu activeTab={activeTab} onSelect={setActiveTab} />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: 13,
              fontWeight: activeTab === item.key ? 700 : 500,
              background: activeTab === item.key ? '#f0fdf4' : '#fff',
              color: activeTab === item.key ? DARK_GREEN : TEXT_MAIN,
              border: `1px solid ${activeTab === item.key ? '#bbf7d0' : BORDER}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ color: activeTab === item.key ? GREEN : '#999', display: 'flex' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WhatsAppNavbar;
