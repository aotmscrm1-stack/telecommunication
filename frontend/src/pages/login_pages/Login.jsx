import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const lampLoginStyles = `
/* ==========================================================
   1. BASE / CONTAINER
   ========================================================== */
.lamp-login-root {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  background: #04040a;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #e9e9f0;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  --s: 1;                /* lamp scale            */
  --lamp-right: 10%;     /* lamp distance from right */
  --lamp-w: 220px;       /* lamp width            */
  --amber: #ffbe5c;
  user-select: none;
}

/* ==========================================================
   2. LAMP  (right side)
   ========================================================== */
.lamp-login-root .lamp {
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

.lamp-login-root .wire {
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 5px; height: 72px;
  background: linear-gradient(#0b0b10, #2a2a33);
  border-radius: 3px;
}

/* --- BULB : blinks on hover/lit --- */
.lamp-login-root .bulb {
  position: absolute;
  top: 180px; left: 50%;
  transform: translate(-50%, -50%);
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #24242b;
  transition: background .3s ease, box-shadow .3s ease;
}
.lamp-login-root.lit .bulb {
  background: #fff6d6;
  box-shadow:
    0 0 18px 6px rgba(255,220,140,.95),
    0 0 60px 18px rgba(255,190,80,.65);
  animation: lampBlink 1.6s ease-in-out infinite;
}

/* --- SHADE : subtle blink --- */
.lamp-login-root .shade {
  position: absolute;
  top: 70px; left: 50%;
  transform: translateX(-50%);
  width: 190px; height: 112px;
  clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%);
  background: linear-gradient(100deg,
      #45454f 0%, #26262e 30%, #111116 72%, #08080b 100%);
  transition: filter .3s ease;
}
.lamp-login-root.lit .shade {
  animation: shadeBlink 1.6s ease-in-out infinite;
}

/* --- CORD --- */
.lamp-login-root .cord {
  position: absolute;
  top: 180px; left: 50%;
  transform: translateX(-50%);
  width: 2px; height: 118px;
  background: linear-gradient(#2c2c34, #131318);
  transition: height .4s cubic-bezier(.34,1.56,.64,1);
}
.lamp-login-root.lit .cord { 
  height: 162px; 
}

.lamp-login-root .knob {
  position: absolute;
  bottom: -11px; left: 50%;
  transform: translateX(-50%);
  width: 20px; height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #75758a, #16161c 72%);
  box-shadow: 0 3px 9px rgba(0,0,0,.9);
  transition: box-shadow .3s ease;
}
.lamp-login-root.lit .knob {
  box-shadow: 0 3px 9px rgba(0,0,0,.9), 0 0 16px rgba(255,190,80,.6);
}

/* ==========================================================
   3. BLINK KEYFRAMES
   ========================================================== */
@keyframes lampBlink {
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
   4. STAGE + CARD
   ========================================================== */
.lamp-login-root .stage {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1600px;
  z-index: 20;
}

.lamp-login-root .card {
  position: relative;
  width: 400px;
  max-width: 92vw;
  padding: 44px 40px 36px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.07);
  background: linear-gradient(155deg, rgba(40,40,54,.86), rgba(11,11,17,.93));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 40px 90px rgba(0,0,0,.8);
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
  user-select: auto;
}
.lamp-login-root.lit .card {
  opacity: 1;
  pointer-events: auto;
  transform: rotateY(0) rotateX(0) translateZ(0) translateY(0) scale(1);
  box-shadow:
    0 40px 90px rgba(0,0,0,.85),
    inset 0 1px 0 rgba(255,255,255,.07);
}

/* parallax layer */
.lamp-login-root .card-inner {
  transform-style: preserve-3d;
  transform: rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg));
  transition: transform .18s ease-out;
}

/* ==========================================================
   5. FORM  — 3D FIELDS
   ========================================================== */
.lamp-login-root .brand {
  font-size: 11px;
  letter-spacing: .38em;
  text-transform: uppercase;
  color: #83839a;
  margin-bottom: 22px;
  transform: translateZ(30px);
}
.lamp-login-root .brand::before {
  content: "◈ ";
  color: var(--amber);
}

.lamp-login-root .card h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -.02em;
  color: #f4f4fa;
  transform: translateZ(34px);
}
.lamp-login-root .sub {
  margin: 0 0 24px;
  font-size: 13px;
  color: #74748a;
  transform: translateZ(20px);
}

.lamp-login-root .error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  margin-bottom: 18px;
  transform: translateZ(22px);
}

/* ---- 3D FIELD WRAPPER ---- */
.lamp-login-root .field {
  position: relative;
  margin-bottom: 20px;
  transform-style: preserve-3d;
  transform: translateZ(24px);
  transition: transform .4s cubic-bezier(.2,.9,.3,1.2);
}
.lamp-login-root .field:focus-within {
  transform: translateZ(52px) rotateX(-2deg);
}

.lamp-login-root .field label {
  display: block;
  font-size: 10.5px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #8a8aa0;
  margin-bottom: 9px;
  transform: translateZ(12px);
  transform-origin: left center;
  transition: color .3s ease, transform .4s ease;
}
.lamp-login-root .field:focus-within label {
  color: var(--amber);
  transform: translateZ(22px) translateX(2px);
}

/* ---- 3D INPUT ---- */
.lamp-login-root .field input {
  width: 100%;
  padding: 15px 16px;
  font-family: inherit;
  font-size: 14px;
  color: #eaeaf2;
  background: linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 12px;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(0);
  box-shadow:
    0 1px 0 rgba(255,255,255,.06) inset,
    0 -1px 0 rgba(0,0,0,.4) inset,
    0 8px 18px rgba(0,0,0,.45),
    0 2px 0 rgba(0,0,0,.35);
  transition:
    transform .35s cubic-bezier(.2,.9,.3,1.3),
    box-shadow .35s ease,
    border-color .3s ease,
    background .3s ease;
}
.lamp-login-root .field input::placeholder { 
  color: #4f4f5e; 
}

.lamp-login-root .field input:hover {
  transform: translateZ(10px);
  border-color: rgba(255,255,255,.18);
  box-shadow:
    0 1px 0 rgba(255,255,255,.08) inset,
    0 -1px 0 rgba(0,0,0,.4) inset,
    0 14px 26px rgba(0,0,0,.55),
    0 3px 0 rgba(0,0,0,.35);
}

.lamp-login-root .field input:focus {
  transform: translateZ(26px) rotateX(-1.5deg);
  border-color: rgba(255,196,90,.7);
  background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.035));
  box-shadow:
    0 0 0 3px rgba(255,190,80,.14),
    0 18px 36px rgba(0,0,0,.6),
    0 0 34px rgba(255,180,60,.30),
    0 3px 0 rgba(0,0,0,.4);
}

/* focus dot */
.lamp-login-root .field::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 42px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--amber);
  opacity: 0;
  transform: scale(.4);
  box-shadow: 0 0 12px 3px rgba(255,190,80,.7);
  transition: opacity .3s ease, transform .3s cubic-bezier(.2,1.6,.4,1);
  pointer-events: none;
}
.lamp-login-root .field:focus-within::after {
  opacity: 1;
  transform: scale(1);
}

/* ---- 3D BUTTON ---- */
.lamp-login-root button.submit-btn {
  width: 100%;
  margin-top: 14px;
  padding: 15px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .08em;
  color: #241703;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: linear-gradient(135deg, #ffd27a, #ff9f3c);
  transform: translateZ(30px);
  box-shadow:
    0 12px 26px rgba(255,150,40,.35),
    0 4px 0 #b96c14,
    0 1px 0 rgba(255,255,255,.6) inset;
  transition:
    transform .25s cubic-bezier(.2,.9,.3,1.4),
    box-shadow .25s ease,
    filter .25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.lamp-login-root button.submit-btn:hover {
  transform: translateZ(46px) translateY(-2px);
  filter: brightness(1.07);
  box-shadow:
    0 20px 40px rgba(255,150,40,.5),
    0 6px 0 #b96c14,
    0 1px 0 rgba(255,255,255,.7) inset;
}
.lamp-login-root button.submit-btn:active {
  transform: translateZ(18px) translateY(3px);
  box-shadow:
    0 6px 14px rgba(255,150,40,.4),
    0 1px 0 #b96c14,
    0 1px 0 rgba(255,255,255,.5) inset;
}
.lamp-login-root button.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ---- ROW ---- */
.lamp-login-root .row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  font-size: 12.5px;
  transform: translateZ(14px);
}
.lamp-login-root .check {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8a8a9e;
  cursor: pointer;
  user-select: none;
  transition: color .25s;
}
.lamp-login-root .check:hover { 
  color: #c9c9da; 
}
.lamp-login-root .check input {
  width: 15px; height: 15px;
  margin: 0;
  accent-color: #ffb44d;
  cursor: pointer;
}
.lamp-login-root .row a {
  color: #8a8a9e;
  text-decoration: none;
  transition: color .25s, transform .25s;
}
.lamp-login-root .row a:hover {
  color: var(--amber);
  transform: translateZ(10px);
}

/* ==========================================================
   6. HINT
   ========================================================== */
.lamp-login-root .hint {
  position: fixed;
  bottom: 34px; left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #5b5b73;
  white-space: nowrap;
  pointer-events: none;
  z-index: 40;
  animation: hintPulse 2.4s ease-in-out infinite;
  transition: opacity .6s ease;
}
.lamp-login-root.lit .hint { 
  opacity: 0; 
  animation: none; 
}

@keyframes hintPulse {
  0%, 100% { opacity: .40; }
  50%      { opacity: .95; }
}

/* ==========================================================
   7. RESPONSIVE
   ========================================================== */
@media (min-width: 900px) {
  .lamp-login-root .stage { 
    padding-right: 24%; 
  }
}

@media (max-width: 900px) {
  .lamp-login-root { 
    --s: .68; 
    --lamp-right: 3%; 
  }
  .lamp-login-root .stage { 
    padding-right: 0; 
    align-items: center; 
    padding-top: 60px; 
  }
  .lamp-login-root .card { 
    padding: 34px 26px 28px; 
    border-radius: 18px; 
  }
  .lamp-login-root .card h1 { 
    font-size: 23px; 
  }
  .lamp-login-root .hint { 
    font-size: 10.5px; 
    bottom: 20px; 
  }
  .lamp-login-root .field input:focus { 
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

  // Parallax 3D mousemove effect on the card
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

  // Handle pointer enter on lamp
  const handleLampPointerEnter = (e) => {
    if (e.pointerType === 'mouse') {
      setIsLit(true);
    }
  };

  // Handle click on lamp toggle
  const handleLampClick = () => {
    setIsLit((prev) => !prev);
  };

  // Form submission with Auth Context
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

      {/* ── 3D LOGIN CARD STAGE ───────────────────────── */}
      <main className="stage" onClick={() => !isLit && setIsLit(true)}>
        <form className="card" autoComplete="off" onSubmit={handleSubmit}>
          <div className="card-inner" ref={cardInnerRef}>

            <div className="brand">AOTMS CRM</div>
            <h1>Welcome back</h1>
            <p className="sub">Hover the lamp, then sign in.</p>

            {error && (
              <div className="error-banner">
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

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-amber-950/30 border-t-amber-950 rounded-full animate-spin inline-block" />
                  <span>Signing In...</span>
                </>
              ) : (
                'Sign In'
              )}
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
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact your administrator to reset your password.'); }}>
                Forgot?
              </a>
            </div>

          </div>
        </form>
      </main>

      {/* ── INTERACTIVE HANGING LAMP ─────────────────── */}
      <div 
        className="lamp" 
        id="lamp"
        onPointerEnter={handleLampPointerEnter}
        onClick={handleLampClick}
        title="Click or hover to switch lamp"
      >
        <div className="wire" />
        <div className="bulb" />
        <div className="shade" />
        <div className="cord">
          <span className="knob" />
        </div>
      </div>

      {/* ── BOTTOM HINT ─────────────────────────────── */}
      <div className="hint" onClick={() => setIsLit(true)} style={{ cursor: 'pointer' }}>
        Hover the lamp &nbsp;💡
      </div>
    </div>
  );
}
