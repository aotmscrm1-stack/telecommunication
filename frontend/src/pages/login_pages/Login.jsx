import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useTheme from '../../hooks/useTheme';
import LeftPanel from './LeftPanel';
import LoginForm from './LoginForm';

const PURPLE = 'var(--theme-primary)';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes fadeInRight { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes shimmer { 0% { background-position: -300% 0; } 100% { background-position: 300% 0; } }
  @keyframes slideIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bgMove { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,15px) scale(0.98); } 100% { transform: translate(0,0) scale(1); } }
  @keyframes dotPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

  /* ── 3D ORB SCENE ── */
  @keyframes orbSpin3d { 0% { transform: rotateY(0deg) rotateX(8deg); } 100% { transform: rotateY(360deg) rotateX(8deg); } }
  @keyframes ringSpinA { 0% { transform: rotateX(72deg) rotateZ(0deg); } 100% { transform: rotateX(72deg) rotateZ(360deg); } }
  @keyframes ringSpinB { 0% { transform: rotateX(60deg) rotateY(20deg) rotateZ(0deg); } 100% { transform: rotateX(60deg) rotateY(20deg) rotateZ(-360deg); } }
  @keyframes ringSpinC { 0% { transform: rotateY(80deg) rotateZ(0deg); } 100% { transform: rotateY(80deg) rotateZ(360deg); } }
  @keyframes corePulse { 0%,100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.08); filter: brightness(1.25); } }
  @keyframes nodeOrbit1 { 0% { transform: rotate(0deg) translateX(150px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(150px) rotate(-360deg); } }
  @keyframes nodeOrbit2 { 0% { transform: rotate(0deg) translateX(190px) rotate(0deg); } 100% { transform: rotate(-360deg) translateX(190px) rotate(360deg); } }
  @keyframes nodeOrbit3 { 0% { transform: rotate(0deg) translateX(120px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); } }
  @keyframes floatPhone { 0%,100% { transform: translateY(0) rotateY(-18deg) rotateX(6deg); } 50% { transform: translateY(-16px) rotateY(-18deg) rotateX(6deg); } }
  @keyframes waveBar { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
  @keyframes typingDot { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
  @keyframes glowPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

  .lw-root {
    min-height: 100vh; display: flex;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--theme-text-strongest);
  }

  /* ── LEFT PANEL ── */
  .lw-left {
    width: 52%; flex-shrink: 0; position: relative; overflow: hidden;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 40px 48px; gap: 18px; perspective: 1400px; margin-right: -1px;
    background: linear-gradient(145deg, #ff9d5c 0%, #ffb37c 15%, #4c9fdb 40%, #1e8fd6 100%);
    animation: fadeInLeft 0.65s cubic-bezier(0.22,1,0.36,1) both;
  }
  @media (max-width: 860px) { .lw-left { display: none !important; } .lw-right { width: 100% !important; } }

  .lw-bg-circle {
    position: absolute; border-radius: 50%; pointer-events: none;
    animation: bgMove 12s ease-in-out infinite;
  }
  .lw-bg-c1 { width: 420px; height: 420px; top: -140px; left: -120px; background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%); animation-delay: 0s; }
  .lw-bg-c2 { width: 500px; height: 500px; bottom: -180px; right: -150px; background: radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 65%); animation-delay: -4s; }
  .lw-bg-c3 { width: 240px; height: 240px; top: 42%; left: 38%; background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%); animation-delay: -8s; }

  .lw-dots {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.055;
    background-image: radial-gradient(circle, #fff 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .lw-logo-area { position: relative; z-index: 5; animation: fadeInUp 0.6s ease 0.1s both; }
  .lw-logo-img { width: 220px; height: auto; object-fit: contain; display: block; filter: drop-shadow(0 2px 14px rgba(0,0,0,0.25)); }
  .lw-right-logo-area { display: flex; justify-content: center; margin-top: -44px; margin-bottom: 8px; animation: fadeInUp 0.6s ease 0.1s both; }
  .lw-right-logo-img { width: 340px; max-width: 100%; height: auto; object-fit: contain; display: block; }

  .lw-headline { position: relative; z-index: 5; animation: fadeInUp 0.6s ease 0.2s both; }
  .lw-headline h2 { font-size: 27px; font-weight: 900; color: #fff; line-height: 1.18; letter-spacing: -0.5px; margin-bottom: 8px; }
  .lw-gradient-text {
    background: linear-gradient(90deg, #fff, #ffe8d6, #bae6fd);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .lw-headline p { font-size: 13px; color: rgba(255,255,255,0.65); line-height: 1.7; max-width: 420px; }

  .lw-chips { position: relative; z-index: 5; display: flex; gap: 8px; flex-wrap: wrap; animation: fadeInUp 0.6s ease 0.3s both; }
  .lw-chip {
    display: flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.11); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.18); border-radius: 20px;
    padding: 6px 13px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.92);
  }
  .lw-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: #86efac; animation: dotPulse 2s ease infinite; flex-shrink: 0; }

  /* ── 3D AI CALL SCENE ── */
  .lw-scene-wrap {
    position: relative; z-index: 4; flex: 1; min-height: 0;
    display: flex; align-items: center; justify-content: center;
    transform-style: preserve-3d;
  }
  .lw-orb-stage {
    position: relative; width: 280px; height: 280px;
    transform-style: preserve-3d;
    animation: orbSpin3d 16s linear infinite;
  }
  .lw-orb-ring { position: absolute; inset: 0; border-radius: 50%; transform-style: preserve-3d; border: 1.5px solid rgba(255,255,255,0.35); }
  .lw-orb-ring.r1 { animation: ringSpinA 7s linear infinite; border-color: rgba(255,255,255,0.45); box-shadow: 0 0 18px rgba(255,255,255,0.15); }
  .lw-orb-ring.r2 { inset: 26px; animation: ringSpinB 10s linear infinite; border-color: rgba(216,180,254,0.55); box-shadow: 0 0 18px rgba(216,180,254,0.2); }
  .lw-orb-ring.r3 { inset: -26px; animation: ringSpinC 13s linear infinite; border-color: rgba(255,255,255,0.22); }

  .lw-orb-core {
    position: absolute; top: 50%; left: 50%; width: 96px; height: 96px;
    transform: translate(-50%,-50%) translateZ(20px);
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, #ffb37c 28%, #38bdf8 75%);
    box-shadow: 0 0 50px 10px rgba(216,180,254,0.55), inset -8px -8px 18px rgba(0,0,0,0.18), inset 6px 6px 14px rgba(255,255,255,0.5);
    animation: corePulse 2.6s ease-in-out infinite;
    display: flex; align-items: center; justify-content: center;
  }
  .lw-orb-core svg { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.25)); }

  .lw-orb-node {
    position: absolute; top: 50%; left: 50%; width: 30px; height: 30px; margin: -15px;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.16); backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.35); box-shadow: 0 6px 16px rgba(0,0,0,0.25);
    transform-style: preserve-3d;
  }
  .lw-orb-node.n1 { animation: nodeOrbit1 9s linear infinite; }
  .lw-orb-node.n2 { animation: nodeOrbit2 13s linear infinite reverse; }
  .lw-orb-node.n3 { animation: nodeOrbit3 7s linear infinite; }

  .lw-orb-glow {
    position: absolute; width: 90%; padding-top: 90%; border-radius: 50%;
    top: 50%; left: 50%; transform: translate(-50%,-50%) translateZ(-40px);
    background: radial-gradient(circle, rgba(167,139,250,0.35), transparent 68%);
    animation: glowPulse 3s ease-in-out infinite;
  }

  /* floating call card */
  .lw-call-card {
    position: absolute; bottom: 6%; right: 2%; z-index: 6;
    width: 168px; padding: 12px 14px; border-radius: 14px;
    background: rgba(255,255,255,0.13); backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 18px 40px rgba(0,0,0,0.3);
    transform-style: preserve-3d; animation: floatPhone 5s ease-in-out infinite;
  }
  .lw-call-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .lw-call-avatar { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #ffb37c, #38bdf8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lw-call-name { font-size: 11.5px; font-weight: 700; color: #fff; line-height: 1.2; }
  .lw-call-status { font-size: 9.5px; color: rgba(255,255,255,0.6); }
  .lw-wave-row { display: flex; align-items: flex-end; gap: 2.5px; height: 18px; }
  .lw-wave-bar { width: 3px; border-radius: 2px; background: linear-gradient(180deg, #ffb37c, #38bdf8); animation: waveBar 1s ease-in-out infinite; transform-origin: bottom; }

  /* AI thinking chip */
  .lw-ai-chip {
    position: absolute; top: 10%; left: -2%; z-index: 6;
    display: flex; align-items: center; gap: 7px;
    background: rgba(255,255,255,0.13); backdrop-filter: blur(14px);
    border: 1px solid rgba(255,255,255,0.25); border-radius: 20px;
    padding: 7px 12px; box-shadow: 0 14px 30px rgba(0,0,0,0.25);
    animation: floatPhone 6.5s ease-in-out infinite 0.4s;
  }
  .lw-ai-chip span { font-size: 10.5px; font-weight: 700; color: #fff; }
  .lw-typing { display: flex; gap: 3px; }
  .lw-typing i { width: 4px; height: 4px; border-radius: 50%; background: #86efac; display: block; animation: typingDot 1.2s ease infinite; }
  .lw-typing i:nth-child(2) { animation-delay: 0.15s; }
  .lw-typing i:nth-child(3) { animation-delay: 0.3s; }

  /* Stats */
  .lw-stats { position: relative; z-index: 5; display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; animation: fadeInUp 0.6s ease 0.5s both; }
  .lw-stat {
    background: rgba(255,255,255,0.1); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.14); border-radius: 12px;
    padding: 13px 10px; text-align: center;
    transition: transform 0.2s ease, background 0.2s ease;
    animation: countUp 0.5s ease both;
  }
  .lw-stat:hover { transform: translateY(-3px); background: rgba(255,255,255,0.17); }
  .lw-stat-val { font-size: 19px; font-weight: 800; color: #fff; line-height: 1; }
  .lw-stat-lbl { font-size: 9.5px; color: rgba(255,255,255,0.6); margin-top: 5px; font-weight: 500; }

  /* ── RIGHT PANEL ── */
  .lw-right {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 40px 32px; background: #ffffff; perspective: 1200px;
    animation: fadeInRight 0.65s cubic-bezier(0.22,1,0.36,1) both;
  }
  .lw-form-card {
    width: 100%; max-width: 400px;
    transform-style: preserve-3d;
    transition: transform 0.12s ease-out;
    will-change: transform;
  }

  .lw-portal-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--theme-surface-tint); border: 1px solid var(--theme-primary-pale2);
    border-radius: 20px; padding: 5px 13px;
    margin-bottom: 26px; animation: fadeInUp 0.5s ease 0.1s both;
  }
  .lw-portal-dot { width: 7px; height: 7px; border-radius: 50%; background: ${PURPLE}; animation: dotPulse 2.5s ease infinite; }
  .lw-portal-text { font-size: 11px; font-weight: 700; color: ${PURPLE}; text-transform: uppercase; letter-spacing: 1.2px; }

  .lw-welcome { animation: fadeInUp 0.5s ease 0.2s both; margin-bottom: 26px; }
  .lw-welcome h1 { font-size: 26px; font-weight: 800; color: var(--theme-text-strongest); margin-bottom: 5px; letter-spacing: -0.4px; }
  .lw-welcome p { font-size: 13.5px; color: var(--theme-text-strong); }

  .lw-error {
    display: flex; align-items: center; gap: 9px;
    margin-bottom: 16px; padding: 11px 14px;
    background: #fff5f5; border: 1px solid #fed7d7; border-radius: 9px;
    color: #c53030; font-size: 13px; font-weight: 500;
    animation: slideIn 0.3s ease both;
  }
  .lw-err-icon { width: 16px; height: 16px; background: #fc8181; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .lw-form { display: flex; flex-direction: column; gap: 18px; }
  .lw-field { animation: fadeInUp 0.5s ease both; }
  .lw-field:nth-child(1) { animation-delay: 0.3s; }
  .lw-field:nth-child(2) { animation-delay: 0.4s; }
  .lw-field:nth-child(3) { animation-delay: 0.5s; }

  .lw-label { display: block; font-size: 11.5px; font-weight: 700; color: var(--theme-text-strong); text-transform: uppercase; letter-spacing: 0.9px; margin-bottom: 7px; }
  .lw-input-wrap { position: relative; }
  .lw-input-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--theme-primary-soft); z-index: 1; display: flex; }
  .lw-input {
    width: 100%; padding: 12px 13px 12px 40px;
    border: 1.5px solid var(--theme-surface-tint); border-radius: 10px;
    font-size: 14px; background: #fafafa; color: #000; outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    font-family: inherit;
  }
  .lw-input:focus { border-color: ${PURPLE}; background: #fff; box-shadow: 0 0 0 4px rgba(var(--theme-primary-rgb), 0.09); }
  .lw-input::placeholder { color: #333; }
  .lw-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--theme-primary-soft); display: flex; align-items: center; padding: 2px; transition: color 0.2s; border-radius: 4px; }
  .lw-eye:hover { color: ${PURPLE}; }

  .lw-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
  .lw-forgot { font-size: 12px; color: ${PURPLE}; text-decoration: none; font-weight: 600; transition: opacity 0.2s; }
  .lw-forgot:hover { opacity: 0.75; }

  .lw-btn {
    width: 100%; background: linear-gradient(135deg, #ffb37c 0%, #0891b2 40%, #38bdf8 100%);
    color: #fff; border: none; padding: 14px; border-radius: 11px;
    font-size: 14.5px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 9px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 8px 24px rgba(var(--theme-primary-rgb), 0.38);
    position: relative; overflow: hidden; font-family: inherit; letter-spacing: 0.2px;
  }
  .lw-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(var(--theme-primary-rgb), 0.48); }
  .lw-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 4px 12px rgba(var(--theme-primary-rgb), 0.3); }
  .lw-btn:disabled { opacity: 0.72; cursor: not-allowed; }
  .lw-btn::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
    background-size: 300% 100%; animation: shimmer 2.2s infinite;
  }
  .lw-spinner { width: 17px; height: 17px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }

  .lw-footer { margin-top: 20px; text-align: center; font-size: 11px; color: var(--theme-primary-pale); animation: fadeInUp 0.5s ease 0.7s both; }

  /* ── RESPONSIVE: tablet & mobile ── */
  @media (max-width: 860px) and (min-width: 481px) {
    .lw-right { padding: 32px 24px; }
  }
  @media (max-width: 480px) {
    .lw-right { padding: 24px 16px; }
    .lw-right-logo-area { margin-top: 0; margin-bottom: 4px; }
    .lw-right-logo-img { width: 220px; }
    .lw-portal-badge { margin-bottom: 16px; padding: 4px 11px; }
    .lw-welcome { margin-bottom: 18px; }
    .lw-welcome h1 { font-size: 21px; }
    .lw-welcome p { font-size: 12.5px; }
    .lw-form { gap: 14px; }
    .lw-input { font-size: 16px; padding: 11px 12px 11px 38px; }
    .lw-btn { padding: 13px; font-size: 14px; }
  }
`;

export default function Login() {
  useTheme('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const [callSeconds, setCallSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCallSeconds((s) => (s >= 300 ? 0 : s + 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const callTime = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(callSeconds % 60).padStart(2, '0')}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lw-root">
      <style>{styles}</style>
      <LeftPanel callTime={callTime} />
      <LoginForm
        form={form}
        setForm={setForm}
        showPass={showPass}
        setShowPass={setShowPass}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        cardRef={cardRef}
      />
    </div>
  );
}
