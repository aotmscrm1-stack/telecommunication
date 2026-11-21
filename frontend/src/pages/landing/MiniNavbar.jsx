import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Contrast,
  Globe,
  LifeBuoy,
  MessageSquare,
  Search,
  UserRound,
  X,
} from 'lucide-react';

/**
 * Utility strip above the main navigation.
 *
 * Mirrors the reference layout: language + accessibility + support on the left,
 * search + account links on the right. The whole strip slides away once the page
 * is scrolled so the main navbar can take the top edge.
 */

const LANGUAGES = ['English', 'తెలుగు', 'हिन्दी'];

const QUICK_LINKS = [
  { label: 'WhatsApp inbox & blasts', target: '#services' },
  { label: 'Lead pipeline & follow-ups', target: '#about' },
  { label: 'AI telecaller', target: '#services' },
  { label: 'Pricing', target: '#pricing' },
  { label: 'Book a free demo', target: '#book-demo' },
  { label: 'Contact support', target: '#contact' },
];

const ABOUT_LINKS = [
  { label: 'About AOTMS CRM', target: '#about' },
  { label: 'Solutions', target: '#services' },
  { label: 'Pricing', target: '#pricing' },
  { label: 'Contact us', target: '#contact' },
];

export function MiniNavbar({ highContrast = false, onToggleContrast, onContactSales }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const [hidden, setHidden] = useState(false);
  const [openPanel, setOpenPanel] = useState(null); // 'language' | 'about' | 'search'
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close any open panel on outside click / Escape.
  useEffect(() => {
    if (!openPanel) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpenPanel(null);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenPanel(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openPanel]);

  useEffect(() => {
    if (openPanel === 'search') searchRef.current?.focus();
  }, [openPanel]);

  const goTo = (target) => {
    setOpenPanel(null);
    if (!target) return;
    if (target.startsWith('#')) {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(target);
  };

  const toggle = (panel) => setOpenPanel((current) => (current === panel ? null : panel));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK_LINKS;
    return QUICK_LINKS.filter((link) => link.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="hs-mini" data-hidden={hidden} ref={rootRef}>
      <div className="hs-mini__inner">
        {/* LEFT — locale, accessibility, human help */}
        <div className="hs-mini__group">
          <div className="hs-mini__wrap">
            <button
              type="button"
              className="hs-mini__item"
              aria-haspopup="menu"
              aria-expanded={openPanel === 'language'}
              onClick={() => toggle('language')}
            >
              <Globe size={14} strokeWidth={2.2} />
              {language}
              <ChevronDown size={13} strokeWidth={2.4} />
            </button>
            {openPanel === 'language' && (
              <div className="hs-mini__panel hs-mini__panel--left" role="menu">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    role="menuitem"
                    className="hs-mini__panel-item"
                    data-active={lang === language}
                    onClick={() => {
                      setLanguage(lang);
                      setOpenPanel(null);
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="hs-mini__item hs-mini__item--contrast"
            aria-pressed={highContrast}
            onClick={() => onToggleContrast?.()}
            title="Toggle high contrast colours"
          >
            <Contrast size={14} strokeWidth={2.2} />
            High Contrast
          </button>

          <a className="hs-mini__item hs-mini__item--support" href="tel:+918019942233">
            <LifeBuoy size={14} strokeWidth={2.2} />
            Customer Support
          </a>

          <button type="button" className="hs-mini__item hs-mini__item--sales" onClick={() => onContactSales?.()}>
            <UserRound size={14} strokeWidth={2.2} />
            Contact Sales
          </button>
        </div>

        {/* RIGHT — search, account */}
        <div className="hs-mini__group">
          <div className="hs-mini__wrap">
            <button
              type="button"
              className="hs-mini__icon"
              aria-label="Search the site"
              aria-expanded={openPanel === 'search'}
              onClick={() => toggle('search')}
            >
              {openPanel === 'search' ? <X size={15} strokeWidth={2.2} /> : <Search size={15} strokeWidth={2.2} />}
            </button>
            {openPanel === 'search' && (
              <div className="hs-mini__panel hs-mini__panel--search" role="dialog" aria-label="Search">
                <div className="hs-mini__search-row">
                  <Search size={14} strokeWidth={2.2} />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search products, pricing, support…"
                    className="hs-mini__search-input"
                  />
                </div>
                <div className="hs-mini__results">
                  {matches.length === 0 && <p className="hs-mini__empty">No matches. Try “WhatsApp” or “pricing”.</p>}
                  {matches.map((link) => (
                    <button
                      key={link.label}
                      type="button"
                      className="hs-mini__result"
                      onClick={() => goTo(link.target)}
                    >
                      <MessageSquare size={13} strokeWidth={2.2} />
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="button" className="hs-mini__item hs-mini__item--strong" onClick={() => navigate('/login')}>
            Log in
          </button>

          <div className="hs-mini__wrap">
            <button
              type="button"
              className="hs-mini__item"
              aria-haspopup="menu"
              aria-expanded={openPanel === 'about'}
              onClick={() => toggle('about')}
            >
              About
              <ChevronDown size={13} strokeWidth={2.4} />
            </button>
            {openPanel === 'about' && (
              <div className="hs-mini__panel" role="menu">
                {ABOUT_LINKS.map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    role="menuitem"
                    className="hs-mini__panel-item"
                    onClick={() => goTo(link.target)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .hs-mini {
          position: fixed;
          inset: 0 0 auto 0;
          height: 48px;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--hs-canvas);
          border-bottom: 1px solid var(--hs-line);
          font-family: var(--hs-ui);
          transition: transform .32s ease;
        }
        .hs-mini[data-hidden='true'] { transform: translateY(-100%); }

        .hs-mini__inner {
          width: 100%;
          max-width: 1300px;
          padding: 0 clamp(16px, 3vw, 40px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .hs-mini__group { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .hs-mini__wrap { position: relative; }

        .hs-mini__item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          color: var(--hs-navy-soft);
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: background .18s ease, color .18s ease, border-color .18s ease;
        }
        .hs-mini__item svg { color: var(--hs-muted); flex: 0 0 auto; }
        .hs-mini__item:hover { color: var(--hs-navy); background: rgba(33, 51, 67, .06); }
        .hs-mini__item[aria-expanded='true'] { color: var(--hs-navy); background: #fff; border-color: var(--hs-line-strong); }
        .hs-mini__item--strong { font-weight: 700; color: var(--hs-navy); }
        .hs-mini__item[aria-pressed='true'] { background: #fff; border-color: var(--hs-line-strong); color: var(--hs-navy); }

        .hs-mini__icon {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          color: var(--hs-navy-soft);
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease;
        }
        .hs-mini__icon:hover { background: rgba(33, 51, 67, .06); }
        .hs-mini__icon[aria-expanded='true'] { background: #fff; border-color: var(--hs-line-strong); }

        .hs-mini__panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 190px;
          padding: 6px;
          background: #fff;
          border: 1px solid var(--hs-line-strong);
          border-radius: 8px;
          box-shadow: 0 18px 40px -18px rgba(33, 51, 67, .45);
          z-index: 70;
        }
        .hs-mini__panel--left { left: 0; right: auto; }
        .hs-mini__panel--search { width: 320px; padding: 10px; }

        .hs-mini__panel-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 9px 12px;
          border: none;
          border-radius: 5px;
          background: transparent;
          color: var(--hs-navy-soft);
          font-family: inherit;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
        }
        .hs-mini__panel-item:hover { background: var(--hs-canvas); color: var(--hs-navy); }
        .hs-mini__panel-item[data-active='true'] { color: var(--hs-navy); font-weight: 600; }

        .hs-mini__search-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: 1px solid var(--hs-line-strong);
          border-radius: 6px;
          color: var(--hs-muted);
        }
        .hs-mini__search-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          font-family: inherit;
          font-size: 13px;
          color: var(--hs-navy);
        }
        .hs-mini__results { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
        .hs-mini__result {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: none;
          border-radius: 5px;
          background: transparent;
          color: var(--hs-navy-soft);
          font-family: inherit;
          font-size: 12.5px;
          text-align: left;
          cursor: pointer;
        }
        .hs-mini__result svg { color: var(--hs-muted); }
        .hs-mini__result:hover { background: var(--hs-canvas); color: var(--hs-navy); }
        .hs-mini__empty { margin: 6px 10px 8px; font-size: 12px; color: var(--hs-muted); }

        @media (max-width: 1120px) {
          .hs-mini__item--support { display: none; }
        }
        @media (max-width: 900px) {
          .hs-mini__item--contrast { display: none; }
        }
        @media (max-width: 720px) {
          .hs-mini__item--sales { display: none; }
        }
        @media (max-width: 640px) {
          .hs-mini__panel--search { width: 250px; }
        }
      `}</style>
    </div>
  );
}

export default MiniNavbar;