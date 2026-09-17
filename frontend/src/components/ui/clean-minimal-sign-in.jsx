import React, { useState } from 'react';
import { LogIn, Lock, Mail, Eye, EyeOff, Sparkles } from 'lucide-react';
import logoImg from '../../assets/aotms-global-logo.png';

export const SignIn2 = ({ onSignIn, externalError = '', loading = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');

    if (onSignIn) {
      onSignIn({ email: email.trim(), password: password.trim() });
    } else {
      alert(`Sign in successful! (Demo mode for ${email})`);
    }
  };

  const activeError = error || externalError;

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4">
      <style>{`
        .card-3d-clean {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%);
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.12),
                      0 10px 25px -10px rgba(59, 130, 246, 0.15),
                      inset 0 1px 1px 0 rgba(255, 255, 255, 1);
          transform: translateY(0px) rotateX(0deg);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
        }
        .card-3d-clean:hover {
          transform: translateY(-4px) rotateX(1.5deg);
          box-shadow: 0 35px 65px -15px rgba(15, 23, 42, 0.18),
                      0 15px 35px -10px rgba(59, 130, 246, 0.22),
                      inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 1);
        }
        .badge-3d-glow {
          box-shadow: 0 8px 20px -4px rgba(37, 99, 235, 0.25),
                      inset 0 1px 2px rgba(255, 255, 255, 0.9);
        }
        .btn-3d-action {
          box-shadow: 0 8px 22px -4px rgba(15, 23, 42, 0.35),
                      inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-3d-action:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.45),
                      inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .btn-3d-action:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 10px -2px rgba(15, 23, 42, 0.3);
        }
      `}</style>

      {/* Main Centered 3D Sign In Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 flex flex-col items-center border border-blue-100/90 text-black card-3d-clean relative overflow-hidden">
        {/* Subtle Ambient Background Accents */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={logoImg}
            alt="AOTMS Logo"
            className="w-48 h-auto object-contain mb-3 drop-shadow-sm"
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            AOTMS Sales Portal
          </div>
        </div>

        {/* Top 3D Icon Badge */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-blue-50/90 mb-4 badge-3d-glow border border-blue-100 text-blue-600">
          <LogIn className="w-7 h-7 text-blue-600" />
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl font-bold mb-1.5 text-center tracking-tight text-gray-900">
          Sign in with email
        </h2>
        <p className="text-gray-500 text-xs mb-6 text-center leading-relaxed max-w-[280px]">
          Access your leads, calls, dialer & telecom campaign dashboard
        </p>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5 mb-2">
          {/* Email Input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              placeholder="Work Email"
              type="email"
              value={email}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 bg-gray-50/70 focus:bg-white text-black text-sm transition font-medium"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 bg-gray-50/70 focus:bg-white text-black text-sm transition font-medium"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Active Error Alert */}
          {activeError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5 text-left font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>{activeError}</span>
            </div>
          )}
          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-b from-slate-800 to-slate-950 text-white font-semibold py-3 rounded-xl btn-3d-action cursor-pointer disabled:opacity-70 transition mb-2 mt-1 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-[11px] text-gray-400 text-center mt-3">
          &copy; {new Date().getFullYear()} AOTMS Telecommunication. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default SignIn2;
