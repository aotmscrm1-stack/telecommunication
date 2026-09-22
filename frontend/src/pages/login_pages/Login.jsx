// src/pages/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canViewDashboard } from '../../utils/permissions';

const lampLoginStyles = `
/* ==========================================================
   1. BASE / RESET
   ========================================================== */
*, *::before, *::after { box-sizing: border-box; }

:root {
  --s: 1;
  --lamp-right: 10%;
  --lamp-w: 220px;

  --orange: #f97316;
  --orange-lt: #fdba74;
  --orange-bright: #fb923c;
  --orange-dk: #ea580c;
  --orange-deep: #c2410c;
  --glow-orange: rgba(249, 115, 22, 0.55);
  --glow-orange-soft: rgba(249, 115, 22, 0.30);

  --blue: #3b82f6;
  --blue-lt: #60a5fa;
  --glow-blue: rgba(59, 130, 246, 0.35);
}

html, body { height: 100%; }

body.lamp-page-active {
  margin: 0;
  background: #0f1420 !important;
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
  background: radial-gradient(
    ellipse at 50% 40%,
    #1c2942 0%,
    #141c30 40%,
    #0d1422 75%,
    #080c16 100%
  );
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #ffffff;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  z-index: 1;
  transition: background 0.9s ease;
}

.lamp-login-root::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 15% 20%, rgba(249, 115, 22, 0.06) 0%, transparent 45%),
    radial-gradient(ellipse at 85% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 45%);
  z-index: 0;
  transition: opacity 0.9s ease;
}

.lamp-login-root.lit {
  background: radial-gradient(
    ellipse at 78% 25%,
    #7c2d12 0%,
    #3b1606 22%,
    #1a2038 55%,
    #0d1422 80%,
    #080c16 100%
  );
}

.lamp-login-root.lit::before {
  background:
    radial-gradient(ellipse at 78% 25%, rgba(249, 115, 22, 0.45) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(251, 146, 60, 0.18) 0%, transparent 60%),
    radial-gradient(ellipse at 15% 85%, rgba(59, 130, 246, 0.22) 0%, transparent 45%);
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
  background: linear-gradient(#0b0b10, #2a1a0a);
  border-radius: 3px;
}

.bulb {
  position: absolute;
  top: 180px; left: 50%;
  transform: translate(-50%, -50%);
  width: 44px; height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #4a4a52, #1c1c22 70%);
  border: 2px solid rgba(148, 163, 184, 0.35);
  box-shadow:
    inset 0 -3px 8px rgba(0,0,0,0.6),
    inset 0 3px 6px rgba(255,255,255,0.06),
    0 0 0 1px rgba(0,0,0,0.4);
  transition: background .6s ease, box-shadow .6s ease, border-color .6s ease;
}

.bulb::after {
  content: "";
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 180, 100, 0.30), transparent 70%);
  opacity: 0.45;
  animation: filamentFlicker 3.5s ease-in-out infinite;
}

@keyframes filamentFlicker {
  0%, 100% { opacity: 0.30; }
  50%      { opacity: 0.60; }
}

.shade {
  position: absolute;
  top: 70px; left: 50%;
  transform: translateX(-50%);
  width: 190px; height: 112px;
  clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%);
  background: linear-gradient(100deg,
      #4a3018 0%, #2a1a0a 30%, #16100a 72%, #0a0806 100%);
  transition: filter .5s ease;
  box-shadow: inset 0 -6px 20px rgba(0,0,0,0.5);
}

.cord {
  position: absolute;
  top: 180px; left: 50%;
  transform: translateX(-50%);
  width: 2px; height: 118px;
  background: linear-gradient(#3a2a1a, #1a1208);
  transition: height .5s cubic-bezier(.34,1.56,.64,1);
}

.knob {
  position: absolute;
  bottom: -11px; left: 50%;
  transform: translateX(-50%);
  width: 20px; height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #8a7a6a, #16161c 72%);
  box-shadow: 0 3px 9px rgba(0,0,0,.9);
  transition: box-shadow .5s ease;
}

.lamp-login-root.lit .bulb {
  background: radial-gradient(circle at 35% 30%, #fff6d6, #fcd34d 70%);
  border-color: rgba(251, 191, 36, 0.9);
  box-shadow:
    0 0 26px 12px rgba(251, 191, 36, 0.95),
    0 0 80px 30px rgba(249, 115, 22, 0.70),
    0 0 160px 70px rgba(234, 88, 12, 0.40),
    inset 0 -3px 10px rgba(255,200,80,0.5);
  animation: bulbPulse 2.2s ease-in-out infinite;
}

.lamp-login-root.lit .bulb::after { opacity: 0; }

.lamp-login-root.lit .shade {
  filter: drop-shadow(0 8px 36px rgba(249, 115, 22, 0.75));
  animation: shadeGlow 2.2s ease-in-out infinite;
}

.lamp-login-root.lit .cord { height: 162px; }

.lamp-login-root.lit .knob {
  box-shadow: 
    0 3px 9px rgba(0,0,0,0.9), 
    0 0 22px rgba(249, 115, 22, 0.80);
}

@keyframes bulbPulse {
  0%, 100% {
    box-shadow:
      0 0 26px 12px rgba(251, 191, 36, 0.95),
      0 0 80px 30px rgba(249, 115, 22, 0.70),
      0 0 160px 70px rgba(234, 88, 12, 0.40);
  }
  50% {
    box-shadow:
      0 0 18px 8px rgba(251, 191, 36, 0.80),
      0 0 60px 22px rgba(249, 115, 22, 0.50),
      0 0 120px 50px rgba(234, 88, 12, 0.25);
  }
}

@keyframes shadeGlow {
  0%, 100% { filter: drop-shadow(0 8px 36px rgba(249, 115, 22, 0.75)); }
  50%      { filter: drop-shadow(0 8px 22px rgba(249, 115, 22, 0.40)); }
}

@keyframes pulse {
  0%, 100% { opacity: .40; }
  50%      { opacity: .95; }
}

/* ==========================================================
   3. STAGE + CARD
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
  width: 420px;
  max-width: 92vw;
  padding: 44px 40px 36px;
  border-radius: 22px;
  background: rgba(15, 20, 32, 0.92);
  border: 1px solid rgba(249, 115, 22, 0.15);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
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
    0 0 70px rgba(249, 115, 22, 0.22),
    0 0 40px rgba(59, 130, 246, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  border-color: rgba(249, 115, 22, 0.40);
}

.card-inner {
  transform-style: preserve-3d;
  transform: rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg));
  transition: transform .18s ease-out;
  color: #ffffff;
}

/* ==========================================================
   4. FORM ELEMENTS
   ========================================================== */
.brand {
  font-size: 11px;
  letter-spacing: .38em;
  text-transform: uppercase;
  color: #ffffff;
  margin-bottom: 22px;
  transform: translateZ(30px);
  font-weight: 700;
}
.brand::before {
  content: "◈ ";
  color: var(--orange);
  text-shadow: 0 0 10px var(--glow-orange);
}

.card h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -.02em;
  color: #ffffff;
  transform: translateZ(34px);
}

.card .sub {
  margin: 0 0 30px;
  font-size: 13px;
  color: #94a3b8;
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

.login-success-msg {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #bbf7d0;
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
  color: #cbd5e1;
  margin-bottom: 9px;
  transform: translateZ(12px);
  transform-origin: left center;
  transition: color .3s ease, transform .4s ease;
  font-weight: 500;
}
.field:focus-within label {
  color: var(--orange-bright);
  text-shadow: 0 0 12px var(--glow-orange);
  transform: translateZ(22px) translateX(2px);
}

.field input {
  width: 100%;
  padding: 15px 16px;
  font-family: inherit;
  font-size: 14px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.20);
  border-radius: 12px;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(0);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 -1px 0 rgba(0,0,0,.5) inset,
    0 8px 18px rgba(0,0,0,.5);
  transition:
    transform .35s cubic-bezier(.2,.9,.3,1.3),
    box-shadow .35s ease,
    border-color .3s ease,
    background .3s ease;
}
.field input::placeholder { 
  color: #64748b; 
}

.field input:hover {
  transform: translateZ(10px);
  border-color: rgba(249, 115, 22, 0.45);
  background: rgba(255, 255, 255, 0.07);
}

.field input:focus {
  transform: translateZ(26px) rotateX(-1.5deg);
  border-color: var(--orange-bright);
  background: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 3px rgba(249, 115, 22, 0.22),
    0 18px 36px rgba(0,0,0,0.65),
    0 0 40px rgba(249, 115, 22, 0.40);
}

.field input.has-eye { padding-right: 50px; }

/* ── Eye toggle — properly positioned with 3D depth ── */
.eye-toggle {
  position: absolute;
  right: 10px;
  bottom: 6px;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: color .2s ease, background .2s ease, transform .2s ease;
  z-index: 20;
  transform: translateZ(35px);
  padding: 0;
  margin: 0;
  line-height: 1;
}
.eye-toggle:hover {
  color: var(--orange-bright);
  background: rgba(249, 115, 22, 0.15);
  transform: translateZ(40px) scale(1.05);
}
.eye-toggle:active {
  transform: translateZ(32px) scale(0.94);
}
.eye-toggle:focus {
  outline: none;
  color: var(--orange-bright);
}
.eye-toggle svg {
  pointer-events: none;
}

.field::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 42px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--orange);
  opacity: 0;
  transform: scale(.4);
  box-shadow: 0 0 14px 4px rgba(249, 115, 22, 0.9);
  transition: opacity .3s ease, transform .3s cubic-bezier(.2,1.6,.4,1);
  pointer-events: none;
  display: none;
}
.field:not(.field-with-eye):focus-within::after {
  opacity: 1;
  transform: scale(1);
  display: block;
}
.field-with-eye:focus-within::after { display: none; }

/* ==========================================================
   5. SIGN-IN BUTTON
   ========================================================== */
.card button.sign-in-btn {
  width: 100%;
  margin-top: 14px;
  padding: 15px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: .08em;
  color: #2a1200;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: linear-gradient(135deg, #fdba74, #fb923c, #f97316);
  transform: translateZ(30px);
  box-shadow:
    0 12px 26px rgba(249, 115, 22, 0.45),
    0 4px 0 #7c2d12,
    0 1px 0 rgba(255,255,255,.5) inset;
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
    0 22px 44px rgba(249, 115, 22, 0.70),
    0 6px 0 #7c2d12,
    0 1px 0 rgba(255,255,255,.7) inset;
}
.card button.sign-in-btn:active {
  transform: translateZ(18px) translateY(3px);
  box-shadow:
    0 6px 14px rgba(249, 115, 22, 0.55),
    0 1px 0 #7c2d12,
    0 1px 0 rgba(255,255,255,.4) inset;
}
.card button.sign-in-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

/* ==========================================================
   6. ROW — Remember me + Forgot
   ========================================================== */
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 22px;
  font-size: 12.5px;
  transform: translateZ(14px);
}
.check {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #cbd5e1;
  cursor: pointer;
  user-select: none;
  transition: color .25s;
}
.check:hover { color: #ffffff; }
.check input[type="checkbox"] {
  width: 15px; height: 15px;
  margin: 0;
  accent-color: var(--orange);
  cursor: pointer;
}
.row a, .link-btn {
  color: #94a3b8;
  text-decoration: none;
  transition: color .25s, text-shadow .25s;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.row a:hover, .link-btn:hover {
  color: var(--orange-bright);
  text-shadow: 0 0 10px var(--glow-orange);
}

.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 18px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  transform: translateZ(14px);
}
.terms-row input[type="checkbox"] {
  width: 15px; height: 15px;
  margin: 0;
  margin-top: 2px;
  flex-shrink: 0;
  accent-color: var(--orange);
  cursor: pointer;
}
.terms-row label { cursor: pointer; user-select: none; }
.terms-row a {
  color: var(--orange-bright);
  text-decoration: none;
  font-weight: 600;
  transition: color .2s, text-shadow .2s;
}
.terms-row a:hover {
  color: var(--orange-lt);
  text-shadow: 0 0 10px var(--glow-orange);
  text-decoration: underline;
}

/* ==========================================================
   7. FORGOT PASSWORD — STEP INDICATOR + FLOW
   ========================================================== */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 26px;
  transform: translateZ(24px);
}
.step-dot {
  width: 32px;
  height: 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.25);
  transition: all .35s cubic-bezier(.2,.9,.3,1.4);
}
.step-dot.active {
  background: linear-gradient(90deg, #fdba74, #f97316);
  box-shadow: 0 0 14px rgba(249, 115, 22, 0.65);
  width: 40px;
}
.step-dot.done {
  background: var(--orange-dk);
  box-shadow: 0 0 8px rgba(249, 115, 22, 0.45);
}

/* OTP input */
.otp-input {
  width: 100%;
  padding: 15px 16px;
  font-family: "SF Mono", ui-monospace, monospace;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5em;
  text-align: center;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.20);
  border-radius: 12px;
  outline: none;
  transition:
    border-color .3s ease,
    box-shadow .35s ease,
    background .3s ease;
}
.otp-input:focus {
  border-color: var(--orange-bright);
  background: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 3px rgba(249, 115, 22, 0.22),
    0 0 40px rgba(249, 115, 22, 0.40);
}

/* Back link */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 18px;
  font-size: 12px;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color .25s;
}
.back-link:hover {
  color: var(--orange-bright);
}

.resend-row {
  display: flex;
  justify-content: center;
  margin-top: 14px;
  font-size: 12px;
  color: #94a3b8;
  transform: translateZ(14px);
}
.resend-row button {
  background: none;
  border: none;
  color: var(--orange-bright);
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  transition: color .2s;
}
.resend-row button:hover { color: var(--orange-lt); }
.resend-row button:disabled {
  color: #475569;
  cursor: not-allowed;
}

/* ==========================================================
   8. HINT
   ========================================================== */
.hint {
  position: fixed;
  bottom: 34px; left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #64748b;
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
   9. RESPONSIVE
   ========================================================== */
@media (min-width: 900px) {
  .stage { padding-right: 24%; }
}

@media (max-width: 900px) {
  :root { --s: .68; --lamp-right: 3%; }
  .stage { padding-right: 0; align-items: center; padding-top: 60px; }
  .card.lamp-card { padding: 34px 26px 28px; border-radius: 18px; }
  .card h1 { font-size: 23px; }
  .hint { font-size: 10.5px; bottom: 20px; }
  .field input:focus { transform: translateZ(16px); }
  .otp-input { font-size: 18px; letter-spacing: 0.35em; }
}
`;

/* ── Eye icons ─────────────────────────────────────── */
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login() {
  const [isLit, setIsLit] = useState(false);

  /* ── view: 'login' | 'forgot' ────────────────── */
  const [view, setView] = useState('login');

  /* ── forgot password state ───────────────────── */
  const [fpStep, setFpStep] = useState(1);      // 1=email, 2=otp, 3=new password
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpShowPassword, setFpShowPassword] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  /* ── login state ─────────────────────────────── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const cardInnerRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('lamp-page-active');
    return () => document.body.classList.remove('lamp-page-active');
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

  /* ── resend countdown ───────────────────────── */
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleLampPointerEnter = (e) => {
    if (e.pointerType === 'mouse') setIsLit(true);
  };
  const handleLampClick = (e) => {
    e.stopPropagation();
    setIsLit((prev) => !prev);
  };

  /* ── Login submit ────────────────────────────── */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(trimmedEmail, trimmedPassword);
      if (data?.user?.role !== 'admin' && (data?.user?.approvalStatus === 'pending' || data?.user?.approvalStatus === 'rejected')) {
        navigate('/accept');
      } else if (canViewDashboard(data?.user)) {
        navigate('/dashboard');
      } else {
        navigate('/tasks');
      }
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

  /* ── Forgot Password step handlers ───────────── */

  // Step 1 — send OTP to email
  const handleSendOtp = (e) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');
    const trimmed = fpEmail.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      setFpError('Please enter a valid email address.');
      return;
    }
    setFpLoading(true);
    setTimeout(() => {
      setFpLoading(false);
      setFpSuccess(`A 6-digit verification code has been sent to ${trimmed}`);
      setFpStep(2);
      setResendCountdown(30);
    }, 900);
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');
    const code = fpOtp.trim();
    if (!code || code.length !== 6) {
      setFpError('Please enter the 6-digit code.');
      return;
    }
    setFpLoading(true);
    setTimeout(() => {
      setFpLoading(false);
      setFpSuccess('Code verified. Now set your new password.');
      setFpStep(3);
    }, 900);
  };

  // Step 3 — set new password
  const handleResetPassword = (e) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');
    const np = fpNewPassword.trim();
    const cp = fpConfirmPassword.trim();
    if (np.length < 6) {
      setFpError('Password must be at least 6 characters.');
      return;
    }
    if (np !== cp) {
      setFpError('Passwords do not match.');
      return;
    }
    setFpLoading(true);
    setTimeout(() => {
      setFpLoading(false);
      setFpSuccess('Password reset successfully. Redirecting to login...');
      setTimeout(() => {
        setView('login');
        setFpStep(1);
        setFpEmail('');
        setFpOtp('');
        setFpNewPassword('');
        setFpConfirmPassword('');
        setFpSuccess('');
      }, 1400);
    }, 900);
  };

  const handleResendOtp = () => {
    if (resendCountdown > 0) return;
    setFpError('');
    setFpSuccess('A new 6-digit code has been sent.');
    setResendCountdown(30);
  };

  const goBackToLogin = () => {
    setView('login');
    setFpStep(1);
    setFpError('');
    setFpSuccess('');
    setFpEmail('');
    setFpOtp('');
    setFpNewPassword('');
    setFpConfirmPassword('');
  };

  return (
    <div className={`lamp-login-root ${isLit ? 'lit' : ''}`}>
      <style>{lampLoginStyles}</style>

      <main className="stage" onClick={() => !isLit && setIsLit(true)}>
        <form
          className="card lamp-card"
          autoComplete="off"
          onSubmit={
            view === 'login'
              ? handleLoginSubmit
              : fpStep === 1
                ? handleSendOtp
                : fpStep === 2
                  ? handleVerifyOtp
                  : handleResetPassword
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card-inner" ref={cardInnerRef}>
            {/* ══════════════════════════════════════════
                LOGIN VIEW
                ══════════════════════════════════════════ */}
            {view === 'login' && (
              <>
                <div className="brand">AOTMS</div>
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

                <div className="field field-with-eye">
                  <label htmlFor="pass">Password</label>
                  <input
                    id="pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="has-eye"
                    required
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
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
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setView('forgot');
                      setFpStep(1);
                      setFpError('');
                      setFpSuccess('');
                    }}
                  >
                    Forgot?
                  </button>
                </div>

                <div className="terms-row">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <label htmlFor="terms">
                    I agree to the{' '}
                    <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms & Conditions: Please contact support to view the full document.'); }}>
                      Terms &amp; Conditions
                    </a>{' '}
                    and{' '}
                    <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Privacy Policy: Please contact support to view the full document.'); }}>
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--orange)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      padding: 0
                    }}
                  >
                    Create Account
                  </button>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════
                FORGOT PASSWORD VIEW — 3 STEPS
                ══════════════════════════════════════════ */}
            {view === 'forgot' && (
              <>
                <button type="button" className="back-link" onClick={goBackToLogin}>
                  ← Back to sign in
                </button>

                {/* Step indicator */}
                <div className="step-indicator">
                  <div className={`step-dot ${fpStep === 1 ? 'active' : fpStep > 1 ? 'done' : ''}`} />
                  <div className={`step-dot ${fpStep === 2 ? 'active' : fpStep > 2 ? 'done' : ''}`} />
                  <div className={`step-dot ${fpStep === 3 ? 'active' : ''}`} />
                </div>

                <div className="brand">AOTMS</div>

                {/* ── STEP 1: EMAIL ── */}
                {fpStep === 1 && (
                  <>
                    <h1>Forgot password?</h1>
                    <p className="sub">
                      Enter your account email and we'll send you a 6-digit verification code.
                    </p>

                    {fpError && <div className="login-error-msg">{fpError}</div>}
                    {fpSuccess && <div className="login-success-msg">{fpSuccess}</div>}

                    <div className="field">
                      <label htmlFor="fp-email">Email</label>
                      <input
                        id="fp-email"
                        type="email"
                        placeholder="you@example.com"
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <button type="submit" className="sign-in-btn" disabled={fpLoading}>
                      {fpLoading ? 'Sending...' : 'Send Code'}
                    </button>
                  </>
                )}

                {/* ── STEP 2: OTP ── */}
                {fpStep === 2 && (
                  <>
                    <h1>Verify code</h1>
                    <p className="sub">
                      Enter the 6-digit code we sent to <strong>{fpEmail}</strong>.
                    </p>

                    {fpError && <div className="login-error-msg">{fpError}</div>}
                    {fpSuccess && <div className="login-success-msg">{fpSuccess}</div>}

                    <div className="field">
                      <label htmlFor="fp-otp">Verification Code</label>
                      <input
                        id="fp-otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        value={fpOtp}
                        onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="otp-input"
                        required
                        autoFocus
                      />
                    </div>

                    <button type="submit" className="sign-in-btn" disabled={fpLoading}>
                      {fpLoading ? 'Verifying...' : 'Verify Code'}
                    </button>

                    <div className="resend-row">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCountdown > 0}
                      >
                        {resendCountdown > 0
                          ? `Resend code in ${resendCountdown}s`
                          : 'Resend code'}
                      </button>
                    </div>
                  </>
                )}

                {/* ── STEP 3: NEW PASSWORD ── */}
                {fpStep === 3 && (
                  <>
                    <h1>New password</h1>
                    <p className="sub">
                      Set a new password for <strong>{fpEmail}</strong>.
                    </p>

                    {fpError && <div className="login-error-msg">{fpError}</div>}
                    {fpSuccess && <div className="login-success-msg">{fpSuccess}</div>}

                    <div className="field field-with-eye">
                      <label htmlFor="fp-np">New Password</label>
                      <input
                        id="fp-np"
                        type={fpShowPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                        className="has-eye"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="eye-toggle"
                        onClick={() => setFpShowPassword((v) => !v)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={fpShowPassword ? 'Hide password' : 'Show password'}
                      >
                        {fpShowPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>

                    <div className="field field-with-eye">
                      <label htmlFor="fp-cp">Confirm Password</label>
                      <input
                        id="fp-cp"
                        type={fpShowPassword ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={fpConfirmPassword}
                        onChange={(e) => setFpConfirmPassword(e.target.value)}
                        className="has-eye"
                        required
                      />
                      <button
                        type="button"
                        className="eye-toggle"
                        onClick={() => setFpShowPassword((v) => !v)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={fpShowPassword ? 'Hide password' : 'Show password'}
                      >
                        {fpShowPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>

                    <button type="submit" className="sign-in-btn" disabled={fpLoading}>
                      {fpLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </>
                )}
              </>
            )}
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