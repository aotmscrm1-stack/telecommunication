import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Mic,
  PhoneCall,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import aotmsLogo from '../../assets/aotms-global-logo.png';

/**
 * Primary navigation bar — white surface, bold navy labels, warm orange action.
 * Sticks to the top edge once the utility strip has scrolled away.
 */

const MENUS = [
  {
    key: 'products',
    label: 'Products',
    items: [
      { label: 'Lead pipeline', desc: 'Every enquiry, owner and next action', target: '#about', Icon: LayoutDashboard },
      { label: 'WhatsApp inbox & blast', desc: 'All, Replies and Pending in one place', target: '#services', Icon: MessageCircle },
      { label: 'AI telecaller', desc: 'Telugu, Hindi & English voice calls', target: '#services', Icon: Mic },
      { label: 'Attendance & activity', desc: 'Counsellor productivity, tracked daily', target: '#about', Icon: CalendarCheck },
      { label: 'Call recordings', desc: 'Review every conversation instantly', target: '#services', Icon: PhoneCall },
    ],
  },
  {
    key: 'solutions',
    label: 'Solutions',
    items: [
      { label: 'Telecalling teams', desc: 'Dial, follow up and close from one screen', target: '#about', Icon: PhoneCall },
      { label: 'Training institutes', desc: 'Admissions, batches, fees and reminders', target: '#about', Icon: BookOpen },
      { label: 'Sales & counselling', desc: 'Qualify walk-ins and website leads', target: '#services', Icon: Users },
      { label: 'Enterprise sales', desc: 'Multi-team pipeline with role-based access', target: '#services', Icon: Sparkles },
    ],
  },
  {
    key: 'pricing',
    label: 'Pricing',
    target: '#pricing',
  },
  {
    key: 'resources',
    label: 'Resources',
    items: [
      { label: 'Book a free demo', desc: '20-minute walkthrough with our team', target: '#book-demo', Icon: CalendarCheck },
      { label: 'Customer support', desc: 'Talk to the team that built it', target: '#contact', Icon: MessageCircle },
      { label: 'Sign in to the CRM', desc: 'Admin, manager and counsellor logins', target: '/login', Icon: LayoutDashboard },
    ],
  },
];

export function Navbar({ onBookDemo }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenMenu(null);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const goTo = (target) => {
    setOpenMenu(null);
    setMobileOpen(false);
    if (!target) return;
    if (target.startsWith('#')) {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(target);
  };

  const handleCta = () => {
    setOpenMenu(null);
    setMobileOpen(false);
    onBookDemo?.();
  };

  return (
    <div className="hs-navbar" data-scrolled={scrolled} ref={navRef}>
      <div className="hs-navbar__inner">
        {/* BRAND */}
        <button type="button" className="hs-navbar__brand" onClick={() => goTo('#home')} aria-label="AOTMS CRM home">
          <img src={aotmsLogo} alt="AOTMS CRM" />
        </button>

        {/* DESKTOP LINKS */}
        <nav className="hs-navbar__links" aria-label="Main">
          {MENUS.map((menu) => {
            const hasPanel = Array.isArray(menu.items);
            const isOpen = openMenu === menu.key;

            return (
              <div key={menu.key} className="hs-navitem">
                <button
                  type="button"
                  className="hs-navlink"
                  aria-haspopup={hasPanel ? 'menu' : undefined}
                  aria-expanded={hasPanel ? isOpen : undefined}
                  onClick={() => (hasPanel ? setOpenMenu(isOpen ? null : menu.key) : goTo(menu.target))}
                  onMouseEnter={() => hasPanel && setOpenMenu(menu.key)}
                >
                  {menu.label}
                  {hasPanel && <ChevronDown size={16} strokeWidth={2.4} />}
                </button>

                {hasPanel && isOpen && (
                  <div className="hs-menu" role="menu" onMouseLeave={() => setOpenMenu(null)}>
                    {menu.items.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        className="hs-menu__row"
                        onClick={() => goTo(item.target)}
                      >
                        <span className="hs-menu__icon">
                          <item.Icon size={16} strokeWidth={2} />
                        </span>
                        <span className="hs-menu__copy">
                          <span className="hs-menu__label">{item.label}</span>
                          <span className="hs-menu__desc">{item.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ACTIONS */}
        <div className="hs-navbar__actions">
          <button type="button" className="hs-btn hs-btn--primary hs-navbar__cta" onClick={handleCta}>
            Get AOTMS CRM
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>

          <button
            type="button"
            className="hs-navbar__burger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="hs-drawer">
          {MENUS.map((menu) => (
            <div key={menu.key} className="hs-drawer__group">
              {Array.isArray(menu.items) ? (
                <>
                  <p className="hs-drawer__title">{menu.label}</p>
                  {menu.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="hs-drawer__row"
                      onClick={() => goTo(item.target)}
                    >
                      <item.Icon size={16} strokeWidth={2} />
                      <span>
                        <span className="hs-drawer__label">{item.label}</span>
                        <span className="hs-drawer__desc">{item.desc}</span>
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <button type="button" className="hs-drawer__row" onClick={() => goTo(menu.target)}>
                  <LayoutDashboard size={16} strokeWidth={2} />
                  <span className="hs-drawer__label">{menu.label}</span>
                </button>
              )}
            </div>
          ))}

          <div className="hs-drawer__actions">
            <button type="button" className="hs-btn hs-btn--primary" onClick={handleCta}>
              Get AOTMS CRM
            </button>
            <button type="button" className="hs-btn hs-btn--ghost" onClick={() => goTo('/login')}>
              Log in
            </button>
          </div>
        </div>
      )}

      <style>{`
        .hs-navbar {
          position: fixed;
          top: 48px;
          left: 0;
          right: 0;
          z-index: 55;
          background: #fff;
          border-bottom: 1px solid var(--hs-line);
          font-family: var(--hs-ui);
          transition: top .32s ease, box-shadow .25s ease;
        }
        .hs-navbar[data-scrolled='true'] {
          top: 0;
          box-shadow: 0 2px 12px rgba(33, 51, 67, .08);
        }

        .hs-navbar__inner {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 clamp(16px, 3vw, 40px);
          height: 78px;
          display: flex;
          align-items: center;
          gap: clamp(12px, 2.2vw, 32px);
        }

        .hs-navbar__brand {
          display: flex;
          align-items: center;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          flex: 0 0 auto;
        }
        .hs-navbar__brand img { height: 34px; width: auto; display: block; }

        .hs-navbar__links {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1 1 auto;
          min-width: 0;
        }

        .hs-navitem { position: relative; }

        .hs-navlink {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--hs-navy);
          font-family: inherit;
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: -0.005em;
          line-height: 1.2;
          cursor: pointer;
          transition: background .18s ease, color .18s ease;
        }
        .hs-navlink:hover { background: rgba(33, 51, 67, .055); }
        .hs-navlink svg { color: var(--hs-navy-soft); transition: transform .2s ease; }
        .hs-navlink[aria-expanded='true'] svg { transform: rotate(180deg); }

        .hs-menu {
          position: absolute;
          top: calc(100% + 14px);
          left: -6px;
          width: 372px;
          padding: 8px;
          background: #fff;
          border: 1px solid var(--hs-line-strong);
          border-radius: 10px;
          box-shadow: 0 28px 56px -22px rgba(33, 51, 67, .42);
          z-index: 65;
        }
        .hs-menu__row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          padding: 11px 12px;
          border: none;
          border-radius: 7px;
          background: transparent;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          transition: background .16s ease;
        }
        .hs-menu__row:hover { background: var(--hs-canvas); }
        .hs-menu__icon {
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: var(--hs-orange-soft);
          color: var(--hs-orange-active);
        }
        .hs-menu__copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .hs-menu__label { font-size: 13.5px; font-weight: 700; color: var(--hs-navy); }
        .hs-menu__desc { font-size: 12px; line-height: 1.45; color: var(--hs-muted); }

        .hs-navbar__actions { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; }

        .hs-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
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
          padding: 14px 22px;
          font-size: 15px;
          box-shadow: 0 1px 0 rgba(33, 51, 67, .04);
        }
        .hs-btn--primary:hover { background: var(--hs-orange-hover); box-shadow: 0 6px 16px -6px rgba(255, 92, 53, .6); }
        .hs-btn--primary:active { background: var(--hs-orange-active); }
        .hs-btn--ghost {
          background: #fff;
          color: var(--hs-navy);
          border: 1px solid var(--hs-line-strong);
          padding: 13px 20px;
          font-size: 14.5px;
        }

        .hs-navbar__burger {
          display: none;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--hs-line-strong);
          border-radius: 5px;
          background: #fff;
          color: var(--hs-navy);
          cursor: pointer;
        }

        .hs-drawer {
          display: none;
          max-height: calc(100dvh - 78px);
          overflow-y: auto;
          padding: 12px clamp(16px, 3vw, 40px) 24px;
          border-top: 1px solid var(--hs-line);
          background: #fff;
        }
        .hs-drawer__group { padding: 10px 0; border-bottom: 1px solid var(--hs-line); }
        .hs-drawer__title {
          margin: 4px 0 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--hs-muted);
        }
        .hs-drawer__row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 10px 8px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--hs-navy);
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
        }
        .hs-drawer__row svg { color: var(--hs-orange-active); margin-top: 2px; flex: 0 0 auto; }
        .hs-drawer__row:hover { background: var(--hs-canvas); }
        .hs-drawer__label { display: block; }
        .hs-drawer__desc { display: block; margin-top: 2px; font-size: 12px; font-weight: 400; color: var(--hs-muted); }
        .hs-drawer__actions { display: flex; gap: 10px; margin-top: 16px; }
        .hs-drawer__actions .hs-btn { flex: 1; padding: 14px 16px; }

        @media (max-width: 1120px) {
          .hs-navbar__links { display: none; }
          .hs-navbar__burger { display: inline-flex; }
          .hs-drawer { display: block; }
          .hs-navbar__inner { justify-content: space-between; }
        }
        @media (max-width: 620px) {
          .hs-navbar__cta { display: none; }
        }
      `}</style>
    </div>
  );
}

export default Navbar;