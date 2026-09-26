// src/pages/login_pages/sign-up.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { canViewDashboard } from '../../utils/permissions';
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
  User as UserIcon
} from 'lucide-react';

// Strictly 3 Roles: Employee, Manager, Administrator
const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Administrator' }
];

// Dynamic Designation mapping per selected Role
const ROLE_DESIGNATIONS = {
  admin: ['CTO', 'Managing Director'],
  manager: ['HR'],
  employee: ['Developer', 'Trainer', 'Digital Marketing']
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const lampSignUpStyles = `
/* ==========================================================
   1. BASE / RESET (Identical to Login.jsx)
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
  overflow-y: auto;
  overflow-x: hidden;
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
   2. LAMP (Exact Lamp from Login.jsx)
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

@media (min-width: 900px) {
  .stage { padding-right: 24%; }
}

.card.lamp-card {
  position: relative;
  width: 440px;
  max-width: 92vw;
  padding: 38px 36px 30px;
  border-radius: 22px;
  background: rgba(15, 20, 32, 0.92);
  border: 1px solid rgba(249, 115, 22, 0.20);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 
    0 40px 90px rgba(0,0,0,0.95),
    0 0 50px rgba(59, 130, 246, 0.12),
    0 0 30px rgba(249, 115, 22, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform-style: preserve-3d;
  color: #ffffff;
  transition:
    border-color .4s ease,
    box-shadow .4s ease;
}

.lamp-login-root.lit .card.lamp-card {
  box-shadow:
    0 40px 90px rgba(0,0,0,0.95),
    0 0 70px rgba(249, 115, 22, 0.35),
    0 0 40px rgba(59, 130, 246, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  border-color: rgba(249, 115, 22, 0.45);
}

.card-inner {
  transform-style: preserve-3d;
  transform: rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg));
  transition: transform .18s ease-out;
  color: #ffffff;
}

/* ==========================================================
   4. STEP INDICATOR (Matches Login.jsx Flow)
   ========================================================== */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 22px;
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
  width: 44px;
}
.step-dot.done {
  background: var(--orange-dk);
  box-shadow: 0 0 8px rgba(249, 115, 22, 0.45);
}

/* ==========================================================
   5. BRAND & HEADINGS (Exact Login.jsx Style)
   ========================================================== */
.brand {
  font-size: 11px;
  letter-spacing: .38em;
  text-transform: uppercase;
  color: #ffffff;
  margin-bottom: 12px;
  transform: translateZ(30px);
  font-weight: 700;
}
.brand::before {
  content: "◈ ";
  color: var(--orange);
  text-shadow: 0 0 10px var(--glow-orange);
}

.card h1 {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -.02em;
  color: #ffffff;
  transform: translateZ(34px);
}

.card .sub {
  margin: 0 0 22px;
  font-size: 13px;
  color: #94a3b8;
  transform: translateZ(20px);
  line-height: 1.4;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ==========================================================
   6. FIELD STYLING (Identical to Login.jsx with 3D Depth)
   ========================================================== */
.field {
  position: relative;
  margin-bottom: 18px;
  transform-style: preserve-3d;
  transform: translateZ(24px);
  transition: transform .4s cubic-bezier(.2,.9,.3,1.2);
}
.field:focus-within {
  transform: translateZ(52px) rotateX(-2deg);
}

.field label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #cbd5e1;
  margin-bottom: 8px;
  transform: translateZ(12px);
  transform-origin: left center;
  transition: color .3s ease, transform .4s ease;
  font-weight: 500;
  user-select: none;
}
.field:focus-within label {
  color: var(--orange-bright);
  text-shadow: 0 0 12px var(--glow-orange);
  transform: translateZ(22px) translateX(2px);
}

.field input, .field select, .field textarea {
  width: 100%;
  padding: 13px 16px;
  font-family: inherit;
  font-size: 14px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.20);
  border-radius: 12px;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(0);
  cursor: text;
  user-select: text;
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

.field textarea {
  height: 68px;
  resize: none;
  line-height: 1.4;
}

.field select {
  cursor: pointer;
  user-select: none;
}
.field select option {
  background: #0f172a;
  color: #ffffff;
}

.field input::placeholder, .field textarea::placeholder { 
  color: #64748b; 
}

.field input:hover, .field select:hover, .field textarea:hover {
  transform: translateZ(10px);
  border-color: rgba(249, 115, 22, 0.45);
  background: rgba(255, 255, 255, 0.07);
}

.field input:focus, .field select:focus, .field textarea:focus {
  transform: translateZ(26px) rotateX(-1.5deg);
  border-color: var(--orange-bright);
  background: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 3px rgba(249, 115, 22, 0.22),
    0 18px 36px rgba(0,0,0,0.65),
    0 0 40px rgba(249, 115, 22, 0.40);
}

.field input.has-eye { padding-right: 50px; }

/* 2-column layout inside card */
.field-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) {
  .field-grid-2 {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

/* Contact Number Prefix - Pointer events NONE to avoid mouse grab / selection block */
.phone-prefix-tag {
  position: absolute;
  left: 14px;
  bottom: 13px;
  height: 20px;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  pointer-events: none;
  user-select: none;
  z-index: 5;
  transform: translateZ(10px);
}

.field input.phone-input-field,
.field input.has-prefix {
  padding-left: 52px !important;
  letter-spacing: 0.06em;
  cursor: text !important;
  user-select: text !important;
}

/* Eye toggle button (exact Login.jsx implementation with 3D depth) */
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

/* Glowing focus dot */
.field::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 40px;
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
.field:not(.field-with-eye):not(.field-select):focus-within::after {
  opacity: 1;
  transform: scale(1);
  display: block;
}

/* ==========================================================
   7. AVATAR COMPACT CARD (Step 1)
   ========================================================== */
.avatar-section-box {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(249, 115, 22, 0.4);
  padding: 14px 16px;
  border-radius: 14px;
  margin-bottom: 18px;
  transform: translateZ(24px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
}

.avatar-circle-box {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 2px solid var(--orange);
  background: #1e293b;
  box-shadow: 0 0 16px rgba(249, 115, 22, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.avatar-circle-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-crop-action {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 3px 10px rgba(249, 115, 22, 0.35);
  transition: all 0.2s ease;
}
.btn-crop-action:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.cdn-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 2px 8px;
  border-radius: 9999px;
  margin-top: 4px;
}

/* ==========================================================
   8. BUTTONS (Exact Login.jsx 3D Sign-in Button Style)
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

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 20px;
  transform: translateZ(24px);
  transition: color .2s, transform .2s;
}
.back-link:hover {
  color: var(--orange-bright);
  transform: translateZ(30px) translateX(-3px);
}

/* OTP single-line style matching Login.jsx */
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
  transform-style: preserve-3d;
  transform: translateZ(0);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 -1px 0 rgba(0,0,0,.5) inset,
    0 8px 18px rgba(0,0,0,.5);
  transition:
    border-color .3s ease,
    box-shadow .35s ease,
    background .3s ease,
    transform .35s ease;
}
.otp-input:focus {
  transform: translateZ(26px) rotateX(-1.5deg);
  border-color: var(--orange-bright);
  background: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 3px rgba(249, 115, 22, 0.22),
    0 18px 36px rgba(0,0,0,0.65),
    0 0 40px rgba(249, 115, 22, 0.40);
}

/* ==========================================================
   9. ROW — Links & Terms
   ========================================================== */
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

.hint {
  position: fixed;
  bottom: 32px;
  right: var(--lamp-right);
  transform: translateX(50%);
  font-size: 11.5px;
  letter-spacing: .08em;
  color: #cbd5e1;
  text-shadow: 0 0 10px rgba(255,255,255,.3);
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
   10. CROP MODAL
   ========================================================== */
.crop-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 7, 18, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.crop-modal-sheet {
  width: 100%;
  max-width: 380px;
  background: #0f172a;
  border: 1px solid rgba(249, 115, 22, 0.4);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(249, 115, 22, 0.25);
  text-align: center;
}

.crop-canvas-frame {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 0 auto 16px;
  border-radius: 12px;
  overflow: hidden;
  background: #020617;
  border: 1px solid #334155;
  cursor: grab;
  user-select: none;
}
.crop-canvas-frame:active { cursor: grabbing; }

.crop-circular-guide {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgba(10, 15, 26, 0.72);
  border: 2px dashed #f97316;
}

@media (max-width: 900px) {
  :root { --s: .68; --lamp-right: 3%; }
  .stage { padding-right: 0; align-items: center; padding-top: 50px; }
  .card.lamp-card { padding: 32px 24px 24px; border-radius: 18px; }
  .card h1 { font-size: 22px; }
  .hint { font-size: 10.5px; bottom: 20px; }
}
`;

// Eye icons (identical to Login.jsx)
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

export default function SignUp() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const cardInnerRef = useRef(null);

  // Lamp state: default false to show midnight blue theme like Login.jsx
  const [isLit, setIsLit] = useState(false);

  // Body class hook (sets background to #0f1420 and removes any white background)
  useEffect(() => {
    document.body.classList.add('lamp-page-active');
    return () => document.body.classList.remove('lamp-page-active');
  }, []);

  // 3D Tilt mouse effect (identical to Login.jsx)
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

  // Step-wise Form State: 1 = Profile, 2 = Work, 3 = Security, 4 = OTP Verification
  const [step, setStep] = useState(1);

  // Form Fields - Default Role: employee, Default Designation: Developer, Display Name: Developer
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    designation: 'Developer',
    displayName: 'Developer',
    role: 'employee',
    bloodGroup: 'O+',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    avatar: '', // Base64 data URL
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle Role Change -> Automatically sets available designations and defaults to first one
  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    const availableDesignations = ROLE_DESIGNATIONS[newRole] || [];
    const defaultDesig = availableDesignations[0] || '';
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      designation: defaultDesig,
      // If user hasn't typed a custom display name or it matched the old designation, update to new default
      displayName: (!prev.displayName || prev.displayName === prev.designation) ? defaultDesig : prev.displayName
    }));
  };

  // Lamp handlers
  const handleLampClick = (e) => {
    e.stopPropagation();
    setIsLit((v) => !v);
  };
  const handleLampPointerEnter = () => {
    if (!isLit) setIsLit(true);
  };

  // OTP Timer countdown
  useEffect(() => {
    let interval = null;
    if (step === 4 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setCanResendOtp(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, otpTimer]);

  // Strictly 10 digits Contact Number (11th digit prevented)
  const handlePhoneChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: cleaned }));
  };

  // Image select
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result);
      setZoomLevel(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setIsCropModalOpen(true);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Canvas drawing for interactive crop preview
  useEffect(() => {
    if (!isCropModalOpen || !rawImageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = rawImageSrc;

    img.onload = () => {
      const size = 260;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2 + panOffset.x, size / 2 + panOffset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoomLevel, zoomLevel);

      const imgAspect = img.width / img.height;
      let drawW, drawH;
      if (imgAspect >= 1) {
        drawH = size;
        drawW = size * imgAspect;
      } else {
        drawW = size;
        drawH = size / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };
  }, [isCropModalOpen, rawImageSrc, zoomLevel, rotation, panOffset]);

  // Pan controls
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
    }
  };
  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
  };

  // Apply final high-res 400x400 circular crop
  const handleApplyCrop = () => {
    if (!rawImageSrc) return;

    const exportCanvas = document.createElement('canvas');
    const exportSize = 400;
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext('2d');

    const img = new Image();
    img.src = rawImageSrc;

    img.onload = () => {
      ctx.beginPath();
      ctx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      const scaleMultiplier = exportSize / 260;
      ctx.translate(
        exportSize / 2 + panOffset.x * scaleMultiplier,
        exportSize / 2 + panOffset.y * scaleMultiplier
      );
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoomLevel, zoomLevel);

      const imgAspect = img.width / img.height;
      let drawW, drawH;
      if (imgAspect >= 1) {
        drawH = exportSize;
        drawW = exportSize * imgAspect;
      } else {
        drawW = exportSize;
        drawH = exportSize / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      const croppedDataUrl = exportCanvas.toDataURL('image/png', 0.95);
      setFormData((prev) => ({ ...prev, avatar: croppedDataUrl }));
      setAvatarPreview(croppedDataUrl);
      setIsCropModalOpen(false);
      setErrorMsg('');
    };
  };

  // Step 1 Validation -> Step 2
  const handleProceedToStep2 = (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (!formData.avatar) {
      setErrorMsg('Profile / Logo Image is mandatory! Please upload and crop your picture.');
      return;
    }
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMsg('Please enter both First Name and Last Name.');
      return;
    }
    if (!formData.bloodGroup) {
      setErrorMsg('Please select your Blood Group.');
      return;
    }
    setStep(2);
  };

  // Step 2 Validation -> Step 3
  const handleProceedToStep3 = (e) => {
    e?.preventDefault();
    setErrorMsg('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setErrorMsg('Please enter a valid official email address.');
      return;
    }
    if (!formData.employeeId.trim()) {
      setErrorMsg('Staff / Employee ID is mandatory (e.g. AOTMS-007).');
      return;
    }
    if (!formData.designation) {
      setErrorMsg('Please select your Designation.');
      return;
    }
    if (!formData.displayName?.trim()) {
      setErrorMsg('Please enter your Display Name (e.g. Junior HR, Developer).');
      return;
    }
    if (!formData.role) {
      setErrorMsg('Please select your Role.');
      return;
    }
    if (formData.phone.length !== 10) {
      setErrorMsg('Contact Number must be exactly 10 digits (11th digit is restricted).');
      return;
    }
    setStep(3);
  };

  // Step 3 Validation -> Request OTP (Step 4)
  const handleConfirmAndAskOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!formData.address.trim()) {
      setErrorMsg('Residential / Office Address is mandatory.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service & Privacy Policy to proceed.');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.sendRegistrationOtp({
        email: formData.email.trim(),
        firstName: formData.firstName.trim()
      });

      setOtpTimer(60);
      setCanResendOtp(false);
      setOtpCode('');
      setStep(4);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send verification OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    setOtpLoading(true);
    setErrorMsg('');
    try {
      await authAPI.sendRegistrationOtp({
        email: formData.email.trim(),
        firstName: formData.firstName.trim()
      });
      setOtpTimer(60);
      setCanResendOtp(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP & Register
  const handleVerifyOtpAndRegister = async (e) => {
    e?.preventDefault();
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setOtpLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        employeeId: formData.employeeId.trim(),
        designation: formData.designation,
        displayName: (formData.displayName || formData.designation).trim(),
        role: formData.role,
        bloodGroup: formData.bloodGroup,
        phone: formData.phone,
        address: formData.address.trim(),
        password: formData.password,
        avatar: formData.avatar,
        otp: cleanCode
      };

      const res = await authAPI.register(payload);

      if (res.data?.token) {
        localStorage.setItem('aotms_token', res.data.token);
        localStorage.setItem('aotms_user', JSON.stringify(res.data.user));
        updateUser(res.data.user);
        setRegistrationSuccess(true);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className={`lamp-login-root ${isLit ? 'lit' : ''}`}>
      <style>{lampSignUpStyles}</style>

      {/* Main Stage & Card */}
      <main className="stage" onClick={() => !isLit && setIsLit(true)}>
        <form
          className="card lamp-card"
          autoComplete="off"
          onSubmit={
            step === 1
              ? handleProceedToStep2
              : step === 2
                ? handleProceedToStep3
                : step === 3
                  ? handleConfirmAndAskOtp
                  : handleVerifyOtpAndRegister
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card-inner" ref={cardInnerRef}>
            {/* Step indicator (Matches Login.jsx forgot password flow) */}
            <div className="step-indicator">
              <div className={`step-dot ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`} />
              <div className={`step-dot ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`} />
              <div className={`step-dot ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`} />
              <div className={`step-dot ${step === 4 ? 'active' : ''}`} />
            </div>

            {step > 1 && (
              <button
                type="button"
                className="back-link"
                onClick={() => {
                  setErrorMsg('');
                  setStep((s) => s - 1);
                }}
              >
                ← Back to previous step
              </button>
            )}

            <div className="brand">AOTMS</div>

            {/* Error Message */}
            {errorMsg && (
              <div className="login-error-msg">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                STEP 1: IDENTITY & AVATAR CROP
               ══════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                <h1>Create Account</h1>
                <p className="sub">
                  {isLit ? 'Step 1: Set up your profile photo and personal identity.' : 'Hover the lamp to light up the room.'}
                </p>

                {/* Avatar Section */}
                <div className="avatar-section-box">
                  <div className="avatar-circle-box">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Cropped Avatar" />
                    ) : (
                      <UserIcon size={34} style={{ color: '#64748b' }} />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                        Profile Photo <span style={{ color: 'var(--orange)' }}>*</span>
                      </span>
                      {avatarPreview && (
                        <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={13} /> Ready
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 6px', lineHeight: 1.3 }}>
                      Crop circular avatar. Stored on Cloudinary CDN.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-crop-action"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera size={13} />
                        {avatarPreview ? 'Change Photo' : 'Upload & Crop Photo'}
                      </button>
                      <span className="cdn-badge">
                        <UploadCloud size={11} /> Cloudinary
                      </span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                  </div>
                </div>

                <div className="field-grid-2">
                  <div className="field">
                    <label htmlFor="fn">First Name *</label>
                    <input
                      id="fn"
                      type="text"
                      placeholder="e.g. Ameen"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="ln">Last Name *</label>
                    <input
                      id="ln"
                      type="text"
                      placeholder="e.g. Rahman"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="field field-select">
                  <label htmlFor="bg">Blood Group *</label>
                  <select
                    id="bg"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="sign-in-btn">
                  Next: Organization →
                </button>
              </>
            )}

            {/* ══════════════════════════════════════════════
                STEP 2: WORK & CONTACT (Filtered Designations & 10-Digit Phone)
               ══════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <h1>Organization</h1>
                <p className="sub">Step 2: Enter your work credentials and 10-digit contact number.</p>

                <div className="field">
                  <label htmlFor="em">Official Email *</label>
                  <input
                    id="em"
                    type="email"
                    placeholder="you@aotms.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="field-grid-2">
                  <div className="field">
                    <label htmlFor="eid">Staff ID *</label>
                    <input
                      id="eid"
                      type="text"
                      placeholder="AOTMS-007"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      required
                    />
                  </div>

                  {/* Role: Employee, Manager, Administrator */}
                  <div className="field field-select">
                    <label htmlFor="role">Role *</label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={handleRoleChange}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Designation & Display Name: Two Columns */}
                <div className="field-grid-2">
                  <div className="field field-select">
                    <label htmlFor="desig">
                      <span>Designation *</span>
                    </label>
                    <select
                      id="desig"
                      value={formData.designation}
                      onChange={(e) => {
                        const newDesig = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          designation: newDesig,
                          displayName: (!prev.displayName || prev.displayName === prev.designation) ? newDesig : prev.displayName
                        }));
                      }}
                    >
                      {(ROLE_DESIGNATIONS[formData.role] || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="dname">
                      <span>Display Name *</span>
                    </label>
                    <input
                      id="dname"
                      type="text"
                      placeholder="e.g. Junior HR / HR Exclusive"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Contact Number: Strictly 10 digits allowed, prefix has pointer-events: none */}
                <div className="field field-with-prefix">
                  <label htmlFor="ph">
                    <span>Contact Number (10 Digits) *</span>
                    <span style={{ fontSize: '10px', color: formData.phone.length === 10 ? '#22c55e' : '#94a3b8' }}>
                      {formData.phone.length}/10 {formData.phone.length === 10 ? '✓' : ''}
                    </span>
                  </label>
                  <span className="phone-prefix-tag">
                    +91
                  </span>
                  <input
                    id="ph"
                    type="tel"
                    className="has-prefix phone-input-field"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    required
                  />
                </div>

                <button type="submit" className="sign-in-btn">
                  Next: Security &amp; Address →
                </button>
              </>
            )}

            {/* ══════════════════════════════════════════════
                STEP 3: ADDRESS, SECURITY & OTP CONFIRM
               ══════════════════════════════════════════════ */}
            {step === 3 && (
              <>
                <h1>Security &amp; Address</h1>
                <p className="sub">Step 3: Provide location details and create a secure password.</p>

                <div className="field">
                  <label htmlFor="addr">Address *</label>
                  <textarea
                    id="addr"
                    placeholder="Door No, Street, City, State - PIN code"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="field field-with-eye">
                  <label htmlFor="pwd">Password *</label>
                  <input
                    id="pwd"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                <div className="field field-with-eye">
                  <label htmlFor="cpwd">Confirm Password *</label>
                  <input
                    id="cpwd"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="has-eye"
                    required
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                <div className="terms-row">
                  <input
                    type="checkbox"
                    id="terms-signup"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <label htmlFor="terms-signup">
                    I agree to the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms &amp; Conditions</a> and <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
                  </label>
                </div>

                <button type="submit" className="sign-in-btn" disabled={isLoading}>
                  {isLoading ? 'Sending OTP...' : 'Confirm & Request OTP →'}
                </button>
              </>
            )}

            {/* ══════════════════════════════════════════════
                STEP 4: OTP VERIFICATION
               ══════════════════════════════════════════════ */}
            {step === 4 && (
              <>
                {registrationSuccess ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '2px solid #22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: '#22c55e'
                      }}
                    >
                      <CheckCircle2 size={36} />
                    </div>
                    <h1>Account Created!</h1>
                    <p className="sub" style={{ margin: 0 }}>
                      Welcome, {formData.firstName}! Redirecting to workspace...
                    </p>
                  </div>
                ) : (
                  <>
                    <h1>Verify code</h1>
                    <p className="sub">
                      Enter the 6-digit code we sent to <strong>{formData.email}</strong>.
                    </p>

                    <div className="field">
                      <label htmlFor="otp">Verification Code</label>
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="otp-input"
                        required
                        autoFocus
                      />
                    </div>

                    <button type="submit" className="sign-in-btn" disabled={otpLoading}>
                      {otpLoading ? 'Verifying...' : 'Verify & Create Account'}
                    </button>

                    <div className="row" style={{ justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                      {canResendOtp ? (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={handleResendOtp}
                          disabled={otpLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--orange-bright)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '12.5px'
                          }}
                        >
                          Resend Code
                        </button>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12.5px' }}>Resend code in {otpTimer}s</span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Link back to Sign In */}
            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#94a3b8', transform: 'translateZ(20px)' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: 'var(--orange)',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  marginLeft: '4px'
                }}
              >
                Sign In
              </Link>
            </div>
          </div>
        </form>
      </main>

      {/* ══════════════════════════════════════════════
          RIGHT SIDE HANGING LAMP / BULB
         ══════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════
          INTERACTIVE HTML5 CANVAS CROP MODAL
         ══════════════════════════════════════════════ */}
      {isCropModalOpen && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Crop Profile / Logo
              </h3>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px' }}>
              Drag to pan image. Adjust zoom and rotation to fit circular mask.
            </p>

            <div
              className="crop-canvas-frame"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
              <div className="crop-circular-guide" />
            </div>

            {/* Zoom Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '0 8px' }}>
              <ZoomOut size={15} style={{ color: '#94a3b8' }} />
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: '#f97316' }}
              />
              <ZoomIn size={15} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '11px', color: '#cbd5e1', width: '30px' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>

            {/* Rotation */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #334155',
                  color: '#e2e8f0',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <RotateCw size={13} style={{ transform: 'scaleX(-1)' }} />
                -90°
              </button>

              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #334155',
                  color: '#e2e8f0',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <RotateCw size={13} />
                +90°
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                style={{
                  flex: 1,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid #475569',
                  color: '#cbd5e1',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyCrop}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)'
                }}
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
