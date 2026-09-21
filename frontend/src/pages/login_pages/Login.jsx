// src/pages/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const lampLoginStyles = `
/* ==========================================================
   1. BASE / RESET
   ========================================================== */
*, *::before, *::after { box-sizing: border-box; }

:root {
  --s: 1;
  --lamp-right: 10%;
  --lamp-w: 220px;
  --gy: #adff2f;             /* greenyellow — main accent */
  --gy-bright: #c5ff66;      /* lighter greenyellow */
  --gy-deep: #8fcc24;        /* deeper greenyellow */
  --gy-dark: #5c8500;        /* darkest for shadows */
  --gy-text: #1a2800;        /* dark green text on greenyellow */
}

html, body { 
  height: 100%; 
}

body.lamp-page-active {
  margin: 0;
  background: #01150f !important;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #ffffff !important;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

.lamp-login-root {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  /* ══════════════════════════════════════════════
     MATCHES HeroSection GREEN GRADIENT THEME
     ══════════════════════════════════════════════ */
  background: radial-gradient(
    ellipse at 50% 40%,
    #064e3b 0%,
    #022c22 40%,
    #01150f 75%,
    #000806 100%
  );
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #ffffff;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  z-index: 1;
  transition: background 0.8s ease;
}

/* When lamp is ON — greenyellow ambient glow + deep green base */
.lamp-login-root.lit {
  background:
    radial-gradient(ellipse at 82% 30%, rgba(173,255,47,0.16) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 50%, rgba(173,255,47,0.06) 0%, transparent 60%),
    radial-gradient(
      ellipse at 50% 40%,
      #064e3b 0%,
      #022c22 40%,
      #01150f 75%,
      #000806 100%
    );
}

/* ==========================================================
   2. LAMP
   ========================================================== */
.lamp {
  position: fixed;
  top: 0; 
  right: var(--lamp-right);
  width: var(--lamp-w); 
  height: 380px;
  transform: scale(var(--s));
  transform-origin: top right;
  cursor: pointer;
  z-index: 30;
  -webkit-tap-highlight-color: transparent;
}

.wire {
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 5px; height: 72px;
  background: linear-gradient(#0b0b10, #1f2614);
  border-radius: 3px;
}

.bulb {
  position: absolute;
  top: 180px; left: 50%;
  transform: translate(-50%, -50%);
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #24242b;
  transition: background .5s ease, box-shadow .5s ease;
}

.shade {
  position: absolute;
  top: 70px; left: 50%;
  transform: translateX(-50%);
  width: 190px; height: 112px;
  clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%);
  background: linear-gradient(100deg,
      #3d4a2a 0%, #232b16 30%, #141a0c 72%, #0a0d06 100%);
  transition: filter .5s ease;
}

.cord {
  position: absolute;
  top: 180px; left: 50%;
  transform: translateX(-50%);
  width: 2px; height: 118px;
  background: linear-gradient(#2c2c34, #131318);
  transition: height .5s cubic-bezier(.34,1.56,.64,1);
}

.knob {
  position: absolute;
  bottom: -11px; left: 50%;
  transform: translateX(-50%);
  width: 20px; height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #75758a, #16161c 72%);
  box-shadow: 0 3px 9px rgba(0,0,0,.9);
  transition: box-shadow .5s ease;
}

/* ==========================================================
   3. LAMP ON STATE — greenyellow glow
   ========================================================== */
.lamp-login-root.lit .bulb {
  background: #e8ffcc;
  box-shadow:
    0 0 22px 8px rgba(173,255,47,0.95),
    0 0 70px 24px rgba(173,255,47,0.55),
    0 0 140px 60px rgba(143,204,36,0.25);
  animation: bulbPulse 2.2s ease-in-out infinite;
}

.lamp-login-root.lit .shade {
  filter: drop-shadow(0 6px 30px rgba(173,255,47,0.55));
  animation: shadeGlow 2.2s ease-in-out infinite;
}

.lamp-login-root.lit .cord {
  height: 162px;
}

.lamp-login-root.lit .knob {
  box-shadow: 
    0 3px 9px rgba(0,0,0,0.9), 
    0 0 18px rgba(173,255,47,0.7);
}

/* ==========================================================
   4. KEYFRAMES
   ========================================================== */
@keyframes bulbPulse {
  0%, 100% {
    box-shadow:
      0 0 22px 8px rgba(173,255,47,0.95),
      0 0 70px 24px rgba(173,255,47,0.55),
      0 0 140px 60px rgba(143,204,36,0.25);
  }
  50% {
    box-shadow:
      0 0 14px 5px rgba(173,255,47,0.75),
      0 0 50px 16px rgba(173,255,47,0.35),
      0 0 100px 40px rgba(143,204,36,0.15);
  }
}

@keyframes shadeGlow {
  0%, 100% {
    filter: drop-shadow(0 6px 30px rgba(173,255,47,0.55));
  }
  50% {
    filter: drop-shadow(0 6px 18px rgba(173,255,47,0.30));
  }
}

@keyframes pulse {
  0%, 100% { opacity: .40; }
  50%      { opacity: .95; }
}

/* ==========================================================
   5. STAGE + CARD
   ========================================================== */
.stage {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1600px;
  z-index: 20;
}

.card.lamp-card {
  position: relative;
  width: 400px;
  max-width: 92vw;
  padding: 44px 40px 36px;
  border-radius: 22px;
  background: rgba(9, 26, 18, 0.92);
  border: 1px solid rgba(173,255,47,0.15);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 40px 90px rgba(0,0,0,0.9);
  transform-style: preserve-3d;
  opacity: 0;
  pointer-events: none;
  transform:
    rotateY(-34deg) rotateX(9deg)
    translateZ(-90px) translateY(44px) scale(.93);
  transition:
    transform 1.15s cubic-bezier(.19,1,.22,1),
    opacity .7s ease,
    box-shadow .9s ease,
    border-color .9s ease;
  color: #ffffff;
}

.lamp-login-root.lit .card.lamp-card {
  opacity: 1;
  pointer-events: auto;
  transform: rotateY(0) rotateX(0) translateZ(0) translateY(0) scale(1);
  box-shadow:
    0 40px 90px rgba(0,0,0,0.95),
    0 0 60px rgba(173,255,47,0.12),
    inset 0 1px 0 rgba(173,255,47,0.10);
  border-color: rgba(173,255,47,0.25);
}

.card-inner {
  transform-style: preserve-3d;
  transform: rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg));
  transition: transform .18s ease-out;
  color: #ffffff;
}

/* ==========================================================
   6. FORM ELEMENTS
   ========================================================== */
.brand {
  font-size: 11px;
  letter-spacing: .38em;
  text-transform: uppercase;
  color: #ffffff;
  margin-bottom: 22px;
  transform: translateZ(30px);
  font-weight: 600;
}
.brand::before {
  content: "◈ ";
  color: var(--gy);
}

.card h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -.02em;
  color: #ffffff;
  transform: translateZ(34px);
}

.card .sub {
  margin: 0 0 30px;
  font-size: 13px;
  color: #cbd5e1;
  transform: translateZ(20px);
}

.login-error-msg {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fecaca;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  margin-bottom: 18px;
  transform: translateZ(22px);
}

.field {
  position: relative;
  margin-bottom: 20px;
  transform-style: preserve-3d;
  transform: translateZ(24px);
  transition: transform .4s cubic-bezier(.2,.9,.3,1.2);
}
.field:focus-within {
  transform: translateZ(52px) rotateX(-2deg);
}

.field label {
  display: block;
  font-size: 10.5px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #e2e8f0;
  margin-bottom: 9px;
  transform: translateZ(12px);
  transform-origin: left center;
  transition: color .3s ease, transform .4s ease;
  font-weight: 500;
}
.field:focus-within label {
  color: var(--gy);
  transform: translateZ(22px) translateX(2px);
}

.field input {
  width: 100%;
  padding: 15px 16px;
  font-family: inherit;
  font-size: 14px;
  color: #ffffff;
  background: rgba(173,255,47,0.04);
  border: 1px solid rgba(173,255,47,0.18);
  border-radius: 12px;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(0);
  box-shadow:
    0 1px 0 rgba(173,255,47,.06) inset,
    0 -1px 0 rgba(0,0,0,.5) inset,
    0 8px 18px rgba(0,0,0,.5);
  transition:
    transform .35s cubic-bezier(.2,.9,.3,1.3),
    box-shadow .35s ease,
    border-color .3s ease,
    background .3s ease;
}
.field input::placeholder { 
  color: #7c8a5e; 
}

.field input:hover {
  transform: translateZ(10px);
  border-color: rgba(173,255,47,0.35);
  background: rgba(173,255,47,0.06);
}

.field input:focus {
  transform: translateZ(26px) rotateX(-1.5deg);
  border-color: rgba(173,255,47,0.85);
  background: rgba(173,255,47,0.09);
  box-shadow:
    0 0 0 3px rgba(173,255,47,0.18),
    0 18px 36px rgba(0,0,0,0.65),
    0 0 34px rgba(173,255,47,0.30);
}

.field::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 42px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--gy);
  opacity: 0;
  transform: scale(.4);
  box-shadow: 0 0 12px 3px rgba(173,255,47,0.8);
  transition: opacity .3s ease, transform .3s cubic-bezier(.2,1.6,.4,1);
  pointer-events: none;
}
.field:focus-within::after {
  opacity: 1;
  transform: scale(1);
}

.card button.sign-in-btn {
  width: 100%;
  margin-top: 14px;
  padding: 15px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: .08em;
  color: var(--gy-text);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--gy-bright), var(--gy), var(--gy-deep));
  transform: translateZ(30px);
  box-shadow:
    0 12px 26px rgba(173,255,47,.35),
    0 4px 0 var(--gy-dark),
    0 1px 0 rgba(255,255,255,.7) inset;
  transition:
    transform .25s cubic-bezier(.2,.9,.3,1.4),
    box-shadow .25s ease,
    filter .25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.card button.sign-in-btn:hover {
  transform: translateZ(46px) translateY(-2px);
  filter: brightness(1.08);
  box-shadow:
    0 20px 40px rgba(173,255,47,.55),
    0 6px 0 var(--gy-dark),
    0 1px 0 rgba(255,255,255,.8) inset;
}
.card button.sign-in-btn:active {
  transform: translateZ(18px) translateY(3px);
  box-shadow:
    0 6px 14px rgba(173,255,47,.45),
    0 1px 0 var(--gy-dark),
    0 1px 0 rgba(255,255,255,.5) inset;
}
.card button.sign-in-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  font-size: 12.5px;
  transform: translateZ(14px);
}
.check {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #f1f5f9;
  cursor: pointer;
  user-select: none;
  transition: color .25s;
}
.check:hover { 
  color: #ffffff; 
}
.check input {
  width: 15px; height: 15px;
  margin: 0;
  accent-color: var(--gy);
  cursor: pointer;
}
.row a {
  color: #cbd5e1;
  text-decoration: none;
  transition: color .25s, transform .25s;
}
.row a:hover {
  color: var(--gy);
  transform: translateZ(10px);
}

/* ==========================================================
   7. HINT
   ========================================================== */
.hint {
  position: fixed;
  bottom: 34px; left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #7c8a5e;
  white-space: nowrap;
  pointer-events: none;
  z-index: 25;
  animation: pulse 2.4s ease-in-out infinite;
  transition: opacity .6s ease;
}
.lamp-login-root.lit .hint { 
  opacity: 0;
  animation: none;
}

/* ==========================================================
   8. RESPONSIVE
   ========================================================== */
@media (min-width: 900px) {
  .stage { 
    padding-right: 24%; 
  }
}

@media (max-width: 900px) {
  :root { 
    --s: .68; 
    --lamp-right: 3%; 
  }
  .stage { 
    padding-right: 0; 
    align-items: center; 
    padding-top: 60px; 
  }
  .card.lamp-card { 
    padding: 34px 26px 28px; 
    border-radius: 18px; 
  }
  .card h1 { 
    font-size: 23px; 
  }
  .hint { 
    font-size: 10.5px; 
    bottom: 20px; 
  }
  .field input:focus { 
    transform: translateZ(16px); 
  }
}
`;

export default function Login() {
  const [isLit, setIsLit] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const cardInnerRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('lamp-page-active');
    return () => {
      document.body.classList.remove('lamp-page-active');
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!cardInnerRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      cardInnerRef.current.style.setProperty('--tiltY', (x * 6).toFixed(2) + 'deg');
      cardInnerRef.current.style.setProperty('--tiltX', (-y * 6).toFixed(2) + 'deg');
    };

    const handleMouseLeave = () => {
      if (!cardInnerRef.current) return;
      cardInnerRef.current.style.setProperty('--tiltY', '0deg');
      cardInnerRef.current.style.setProperty('--tiltX', '0deg');
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleLampPointerEnter = (e) => {
    if (e.pointerType === 'mouse') setIsLit(true);
  };

  const handleLampClick = (e) => {
    e.stopPropagation();
    setIsLit((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, trimmedPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`lamp-login-root ${isLit ? 'lit' : ''}`}>
      <style>{lampLoginStyles}</style>

      <main className="stage" onClick={() => !isLit && setIsLit(true)}>
        <form
          className="card lamp-card"
          autoComplete="off"
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card-inner" ref={cardInnerRef}>
            <div className="brand">Nexus</div>
            <h1>Welcome back</h1>
            <p className="sub">
              {isLit ? 'Sign in to continue.' : 'Hover the lamp to light up the room.'}
            </p>

            {error && <div className="login-error-msg">{error}</div>}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="pass">Password</label>
              <input
                id="pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="sign-in-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert(
                    'Please contact your system administrator to reset your account password.'
                  );
                }}
              >
                Forgot?
              </a>
            </div>
          </div>
        </form>
      </main>

      <div
        className="lamp"
        id="lamp"
        onPointerEnter={handleLampPointerEnter}
        onClick={handleLampClick}
        title="Hover or click to switch lamp"
      >
        <div className="wire" />
        <div className="bulb" />
        <div className="shade" />
        <div className="cord">
          <span className="knob" />
        </div>
      </div>

      <div className="hint" onClick={() => setIsLit(true)} style={{ cursor: 'pointer' }}>
        Hover the lamp &nbsp;💡
      </div>
    </div>
  );
}