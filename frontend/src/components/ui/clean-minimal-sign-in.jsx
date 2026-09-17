import React, { useState } from 'react';
import { LogIn, Lock, Mail, User, UserPlus, Eye, EyeOff, Sparkles } from 'lucide-react';

export const SignIn2 = ({ onSignIn, initialMode = 'signin', externalError = '', loading = false }) => {
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
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
      onSignIn({ email: email.trim(), password: password.trim(), name: name.trim(), isSignUp: mode === 'signup' });
    } else {
      alert(`Sign in successful! (Demo mode for ${email})`);
    }
  };

  const activeError = error || externalError;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950/5 p-4 z-1 perspective-1000">
      <style>{`
        .card-3d-glow {
          box-shadow: 0 20px 50px -10px rgba(59, 130, 246, 0.15),
                      0 10px 30px -15px rgba(0, 0, 0, 0.08),
                      inset 0 1px 1px 0 rgba(255, 255, 255, 0.9);
          transform: translateY(0px) rotateX(0deg);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
        }
        .card-3d-glow:hover {
          transform: translateY(-4px) rotateX(1deg);
          box-shadow: 0 30px 60px -12px rgba(59, 130, 246, 0.22),
                      0 15px 35px -10px rgba(0, 0, 0, 0.12),
                      inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 1);
        }
        .badge-3d-float {
          box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.25),
                      inset 0 1px 2px rgba(255, 255, 255, 0.8);
        }
        .btn-3d-action {
          box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.4),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-3d-action:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.5),
                      inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        .btn-3d-action:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 10px -2px rgba(15, 23, 42, 0.3);
        }
      `}</style>

      {/* Main 3D Card Container */}
      <div className="w-full max-w-sm bg-gradient-to-b from-sky-50/90 via-white to-white rounded-3xl p-8 flex flex-col items-center border border-blue-100/80 text-black card-3d-glow relative overflow-hidden">
        {/* Floating Ambient Light Accents */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top 3D Badge Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-blue-50/80 mb-5 badge-3d-float border border-blue-100 text-blue-600">
          {mode === 'signin' ? <LogIn className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex items-center bg-gray-100/90 p-1 rounded-2xl mb-6 w-full border border-gray-200/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); }}
            className={`flex-1 py-1.5 rounded-xl transition-all duration-200 cursor-pointer text-center ${
              mode === 'signin' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-1.5 rounded-xl transition-all duration-200 cursor-pointer text-center ${
              mode === 'signup' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Header Heading */}
        <h2 className="text-2xl font-bold mb-1 text-center tracking-tight text-gray-900">
          {mode === 'signin' ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-gray-500 text-xs mb-5 text-center leading-relaxed max-w-[260px]">
          {mode === 'signin'
            ? 'Log in to access your sales leads, dialer & campaign dashboard'
            : 'Join AOTMS CRM to start managing your sales & team performance'}
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 mb-2">
          {mode === 'signup' && (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-4 h-4" />
              </span>
              <input
                placeholder="Full Name"
                type="text"
                value={name}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 bg-gray-50/80 focus:bg-white text-black text-sm transition"
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              placeholder="Email address"
              type="email"
              value={email}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 bg-gray-50/80 focus:bg-white text-black text-sm transition"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 bg-gray-50/80 focus:bg-white text-black text-sm transition"
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

          {activeError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5 text-left font-medium flex items-start gap-1.5">
              <span className="mt-0.5">•</span>
              <span>{activeError}</span>
            </div>
          )}

          {mode === 'signin' && (
            <div className="w-full flex justify-end">
              <button type="button" className="text-xs text-blue-600 hover:underline font-medium">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-b from-slate-800 to-slate-950 text-white font-semibold py-2.5 rounded-xl btn-3d-action cursor-pointer disabled:opacity-70 transition mb-3 mt-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              <>
                <span>Sign In to CRM</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <UserPlus className="w-4 h-4 text-blue-300" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center w-full my-2">
          <div className="flex-grow border-t border-dashed border-gray-200"></div>
          <span className="mx-2 text-[11px] text-gray-400 font-medium">Or continue with</span>
          <div className="flex-grow border-t border-dashed border-gray-200"></div>
        </div>

        {/* Social Auth Options */}
        <div className="flex gap-2.5 w-full justify-center mt-2">
          <button
            type="button"
            className="flex items-center justify-center w-12 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm grow cursor-pointer"
            onClick={() => alert('Google authentication (Demo)')}
          >
            <img
              src="https://cdn.21st.dev/assets/mirror/38/38146bfd9eff6dbf0d74771f2e625c70d87d3770e0d080dbb6e50db1d5403f46.svg"
              alt="Google"
              className="w-5 h-5"
            />
          </button>
          <button
            type="button"
            className="flex items-center justify-center w-12 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm grow cursor-pointer"
            onClick={() => alert('Facebook authentication (Demo)')}
          >
            <img
              src="https://cdn.21st.dev/assets/mirror/49/49c99a2bb048f4c4941540ccf601621071669cdd1f51e52312a412f23bb2d5fa.svg"
              alt="Facebook"
              className="w-5 h-5"
            />
          </button>
          <button
            type="button"
            className="flex items-center justify-center w-12 h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm grow cursor-pointer"
            onClick={() => alert('Apple authentication (Demo)')}
          >
            <img
              src="https://cdn.21st.dev/assets/mirror/c2/c221b3f2143cf5d8d85a3b68da84dbae21b18db4164e63ca8c07c6ffdbb922c4.svg"
              alt="Apple"
              className="w-5 h-5"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignIn2;
