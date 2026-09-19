import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const lampLoginStyles = `
/* ==========================================================
   1. BASE / RESET
   ========================================================== */
*, *::before, *::after { box-sizing: border-box; }

:root {
  --s: 1;                /* lamp scale            */
  --lamp-right: 10%;     /* lamp distance from right */
  --lamp-w: 220px;       /* lamp width            */
  --amber: #ffbe5c;
}

html, body { 
  height: 100%; 
}

body.lamp-page-active {
  margin: 0;
  background: #04040a !important;
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
  background: #04040a !important;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #ffffff !important;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  z-index: 1;
}

/* ==========================================================
   2. LAMP (Right Side Hanging Lamp)
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
  background: linear-gradient(#0b0b10, #2a2a33);
  border-radius: 3px;
}

/* --- BULB --- */
.bulb {
  position: absolute;
  top: 180px; left: 50%;
  transform: translate(-50%, -50%);
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #24242b;
  transition: background .3s ease, box-shadow .3s ease;
}
body.lit .bulb,
.lamp-login-root.lit .bulb {
  background: #fff6d6 !important;
  box-shadow:
    0 0 18px 6px rgba(255,220,140,.95),
    0 0 60px 18px rgba(255,190,80,.65) !important;
  animation: blink 1.6s ease-in-out infinite;
}

/* --- SHADE --- */
.shade {
  position: absolute;
  top: 70px; left: 50%;
  transform: translateX(-50%);
  width: 190px; height: 112px;
  clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%);
  background: linear-gradient(100deg,
      #45454f 0%, #26262e 30%, #111116 72%, #08080b 100%);
  transition: filter .3s ease;
}
body.lit .shade,
.lamp-login-root.lit .shade {
  animation: shadeBlink 1.6s ease-in-out infinite;
}

/* --- CORD --- */
.cord {
  position: absolute;
  top: 180px; left: 50%;
  transform: translateX(-50%);
  width: 2px; height: 118px;
  background: linear-gradient(#2c2c34, #131318);
  transition: height .4s cubic-bezier(.34,1.56,.64,1);
}
body.lit .cord,
.lamp-login-root.lit .cord { 
  height: 162px; 
}

.knob {
  position: absolute;
  bottom: -11px; left: 50%;
  transform: translateX(-50%);
  width: 20px; height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #75758a, #16161c 72%);
  box-shadow: 0 3px 9px rgba(0,0,0,.9);
  transition: box-shadow .3s ease;
}
body.lit .knob,
.lamp-login-root.lit .knob {
  box-shadow: 0 3px 9px rgba(0,0,0,.9), 0 0 16px rgba(255,190,80,.6) !important;
}

/* ==========================================================
   3. BLINK KEYFRAMES
   ========================================================== */
@keyframes blink {
  0%, 100% {
    box-shadow:
      0 0 18px 6px rgba(255,220,140,.95),
      0 0 60px 18px rgba(255,190,80,.65);
    background: #fff6d6;
  }
  50% {
    box-shadow:
      0 0 8px 2px rgba(255,220,140,.45),
      0 0 26px 6px rgba(255,190,80,.25);
    background: #d9c9a0;
  }
}

@keyframes shadeBlink {
  0%, 100% {
    filter: drop-shadow(0 0 22px rgba(255,190,80,.55));
  }
  50% {
    filter: drop-shadow(0 0 8px rgba(255,190,80,.20));
  }
}

/* ==========================================================
   4. STAGE + DEEP BLACK CARD
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

/* Force pure deep obsidian black card with crisp white text */
body .lamp-login-root .card,
body .lamp-card,
.card.lamp-card {
  position: relative;
  width: 400px;
  max-width: 92vw;
  padding: 44px 40px 36px;
  border-radius: 22px;
  background: linear-gradient(155deg, rgba(32,32,46,0.96), rgba(8,8,15,0.98)) !important;
  background-color: #0b0b12 !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-image: none !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 40px 90px rgba(0,0,0,0.9) !important;
  transform-style: preserve-3d;
  opacity: 0;
  pointer-events: none;
  transform:
    rotateY(-34deg) rotateX(9deg)
    translateZ(-90px) translateY(44px) scale(.93);
  transition:
    transform 1.15s cubic-bezier(.19,1,.22,1),
    opacity .7s ease,
    box-shadow .9s ease;
  color: #ffffff !important;
}

body.lit .card,
body.lit .lamp-card,
.lamp-login-root.lit .card,
.lamp-login-root.lit .lamp-card {
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: rotateY(0) rotateX(0) translateZ(0) translateY(0) scale(1) !important;
  background: linear-gradient(155deg, rgba(35,35,50,0.96), rgba(9,9,16,0.98)) !important;
  background-color: #0b0b13 !important;
  border: 1px solid rgba(255,255,255,0.14) !important;
  border-image: none !important;
  box-shadow:
    0 40px 90px rgba(0,0,0,0.95),
    inset 0 1px 0 rgba(255,255,255,0.1) !important;
}

/* parallax layer */
.card-inner {
  transform-style: preserve-3d;
  transform: rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg));
  transition: transform .18s ease-out;
  color: #ffffff !important;
}

/* ==========================================================
   5. 3D FORM & WHITE TEXT
   ========================================================== */
.brand {
  font-size: 11px;
  letter-spacing: .38em;
  text-transform: uppercase;
  color: #ffffff !important;
  margin-bottom: 22px;
  transform: translateZ(30px);
  font-weight: 600;
}
.brand::before {
  content: "◈ ";
  color: var(--amber) !important;
}

.lamp-card h1,
.card h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -.02em;
  color: #ffffff !important;
  transform: translateZ(34px);
}

.lamp-card .sub,
.card .sub {
  margin: 0 0 30px;
  font-size: 13px;
  color: #cbd5e1 !important;
  transform: translateZ(20px);
}

/* Error message banner */
.login-error-msg {
  background: rgba(239, 68, 68, 0.2) !important;
  border: 1px solid rgba(239, 68, 68, 0.45) !important;
  color: #fecaca !important;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  margin-bottom: 18px;
  transform: translateZ(22px);
}

/* ---- 3D FIELD WRAPPER ---- */
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
  color: #e2e8f0 !important;
  margin-bottom: 9px;
  transform: translateZ(12px);
  transform-origin: left center;
  transition: color .3s ease, transform .4s ease;
  font-weight: 500;
}
.field:focus-within label {
  color: var(--amber) !important;
  transform: translateZ(22px) translateX(2px);
}

/* ---- 3D INPUT (Black glass background, white text) ---- */
.field input {
  width: 100%;
  padding: 15px 16px;
  font-family: inherit;
  font-size: 14px;
  color: #ffffff !important;
  background: rgba(255,255,255,0.06) !important;
  border: 1px solid rgba(255,255,255,0.16) !important;
  border-image: none !important;
  border-radius: 12px;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(0);
  box-shadow:
    0 1px 0 rgba(255,255,255,.08) inset,
    0 -1px 0 rgba(0,0,0,.5) inset,
    0 8px 18px rgba(0,0,0,.5) !important;
  transition:
    transform .35s cubic-bezier(.2,.9,.3,1.3),
    box-shadow .35s ease,
    border-color .3s ease,
    background .3s ease;
}
.field input::placeholder { 
  color: #94a3b8 !important; 
}

.field input:hover {
  transform: translateZ(10px);
  border-color: rgba(255,255,255,.28) !important;
  background: rgba(255,255,255,0.08) !important;
  box-shadow:
    0 1px 0 rgba(255,255,255,.1) inset,
    0 -1px 0 rgba(0,0,0,.5) inset,
    0 14px 26px rgba(0,0,0,.6) !important;
}

.field input:focus {
  transform: translateZ(26px) rotateX(-1.5deg);
  border-color: rgba(255,196,90,.85) !important;
  background: rgba(255,255,255,0.11) !important;
  color: #ffffff !important;
  box-shadow:
    0 0 0 3px rgba(255,190,80,.18),
    0 18px 36px rgba(0,0,0,.65),
    0 0 34px rgba(255,180,60,.35),
    0 3px 0 rgba(0,0,0,.4) !important;
}

/* focus dot */
.field::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 42px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--amber);
  opacity: 0;
  transform: scale(.4);
  box-shadow: 0 0 12px 3px rgba(255,190,80,.8) !important;
  transition: opacity .3s ease, transform .3s cubic-bezier(.2,1.6,.4,1);
  pointer-events: none;
}
.field:focus-within::after {
  opacity: 1;
  transform: scale(1);
}

/* ---- 3D BUTTON (Warm Gold Gradient) ---- */
body .lamp-login-root .card button,
body .lamp-card button,
button.sign-in-btn {
  width: 100%;
  margin-top: 14px;
  padding: 15px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .08em;
  color: #241703 !important;
  border: none !important;
  border-radius: 12px;
  cursor: pointer;
  background: linear-gradient(135deg, #ffd27a, #ff9f3c) !important;
  border-image: none !important;
  transform: translateZ(30px);
  box-shadow:
    0 12px 26px rgba(255,150,40,.38),
    0 4px 0 #b96c14,
    0 1px 0 rgba(255,255,255,.6) inset !important;
  transition:
    transform .25s cubic-bezier(.2,.9,.3,1.4),
    box-shadow .25s ease,
    filter .25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
body .lamp-login-root .card button:hover,
body .lamp-card button:hover,
button.sign-in-btn:hover {
  transform: translateZ(46px) translateY(-2px);
  filter: brightness(1.07);
  box-shadow:
    0 20px 40px rgba(255,150,40,.55),
    0 6px 0 #b96c14,
    0 1px 0 rgba(255,255,255,.7) inset !important;
}
body .lamp-login-root .card button:active,
body .lamp-card button:active,
button.sign-in-btn:active {
  transform: translateZ(18px) translateY(3px);
  box-shadow:
    0 6px 14px rgba(255,150,40,.45),
    0 1px 0 #b96c14,
    0 1px 0 rgba(255,255,255,.5) inset !important;
}
button.sign-in-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

/* ---- ROW & WHITE TEXT ---- */
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
  color: #f1f5f9 !important;
  cursor: pointer;
  user-select: none;
  transition: color .25s;
}
.check span {
  color: #f1f5f9 !important;
}
.check:hover { 
  color: #ffffff !important; 
}
.check input {
  width: 15px; height: 15px;
  margin: 0;
  accent-color: #ffb44d;
  cursor: pointer;
}
.row a {
  color: #cbd5e1 !important;
  text-decoration: none;
  transition: color .25s, transform .25s;
}
.row a:hover {
  color: var(--amber) !important;
  transform: translateZ(10px);
}

/* ==========================================================
   6. HINT
   ========================================================== */
.hint {
  position: fixed;
  bottom: 34px; left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #8383a0 !important;
  white-space: nowrap;
  pointer-events: none;
  z-index: 25;
  animation: pulse 2.4s ease-in-out infinite;
  transition: opacity .6s ease;
}
body.lit .hint,
.lamp-login-root.lit .hint { 
  opacity: 0 !important; 
  animation: none !important; 
}

@keyframes pulse {
  0%, 100% { opacity: .40; }
  50%      { opacity: .95; }
}

/* ==========================================================
   7. RESPONSIVE
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
  .lamp-card,
  .card { 
    padding: 34px 26px 28px; 
    border-radius: 18px; 
  }
  .lamp-card h1,
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

  // Sync dark background & body lit class directly with document.body
  useEffect(() => {
    document.body.classList.add('lamp-page-active');
    return () => {
      document.body.classList.remove('lamp-page-active');
      document.body.classList.remove('lit');
    };
  }, []);

  useEffect(() => {
    if (isLit) {
      document.body.classList.add('lit');
    } else {
      document.body.classList.remove('lit');
    }
  }, [isLit]);

  // Parallax mousemove on the card
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

  // Hover lamp (mouse) -> ON
  const handleLampPointerEnter = (e) => {
    if (e.pointerType === 'mouse') {
      setIsLit(true);
    }
  };

  // Click lamp -> toggle
  const handleLampClick = () => {
    setIsLit((prev) => !prev);
  };

  // Submit handler with AuthContext
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
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`lamp-login-root ${isLit ? 'lit' : ''}`}>
      <style>{lampLoginStyles}</style>

      {/* LOGIN CARD (Deep Black Background, Pure White Text) */}
      <main className="stage" onClick={() => !isLit && setIsLit(true)}>
        <form className="card lamp-card" autoComplete="off" onSubmit={handleSubmit}>
          <div className="card-inner" ref={cardInnerRef}>

            <div className="brand">Nexus</div>
            <h1>Welcome back</h1>
            <p className="sub">Hover the lamp, then sign in.</p>

            {error && (
              <div className="login-error-msg">
                {error}
              </div>
            )}

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
                  alert('Please contact your system administrator to reset your account password.'); 
                }}
              >
                Forgot?
              </a>
            </div>

          </div>
        </form>
      </main>

      {/* LAMP */}
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

      {/* HINT */}
      <div 
        className="hint" 
        onClick={() => setIsLit(true)} 
        style={{ cursor: 'pointer' }}
      >
        Hover the lamp &nbsp;💡
      </div>

    </div>
  );
}
