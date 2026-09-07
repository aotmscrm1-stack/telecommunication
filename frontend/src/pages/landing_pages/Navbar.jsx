import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/aotms-global-logo.png';

const navLink = { fontSize: 14, fontWeight: 600, color: '#334155', cursor: 'pointer' };

export const Navbar = ({ scrollTo }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #eef2f7' }}>
      <div className="lp-header-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={logoImg} alt="AOTMS" className="lp-logo" style={{ height: 92, objectFit: 'contain' }} />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a className="lp-navlink-text" onClick={() => scrollTo('features')} style={navLink}>Features</a>
          <a className="lp-navlink-text" onClick={() => scrollTo('integrations')} style={navLink}>Integrations</a>
          <a className="lp-navlink-text" onClick={() => scrollTo('pricing')} style={navLink}>Pricing</a>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/login')}
            style={{
              background: 'var(--btn-gradient)', color: '#fff', border: 'none', padding: '10px 22px',
              borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,140,60,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {user ? 'Go to Dashboard' : 'Login'}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
