import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  KeyRound,
  Fingerprint,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  canViewDashboard,
  canAccessDailyActivity,
  canAccessDigitalCalendar
} from '../../../utils/permissions';
import crmLogo from '../../../assets/Logo.png';

export default function Login() {
  /* ── active tab: 'email' | 'passkey' ─────────── */
  const [activeTab, setActiveTab] = useState('email');

  /* ── view: 'login' | 'forgot' ────────────────── */
  const [view, setView] = useState('login');

  /* ── passkey scanning state ──────────────────── */
  const [isAuthenticatingPasskey, setIsAuthenticatingPasskey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState('');

  /* ── login state ─────────────────────────────── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── forgot password state ───────────────────── */
  const [fpStep, setFpStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpShowPassword, setFpShowPassword] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  /* ── resend countdown ───────────────────────── */
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

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
      const res = await login(trimmedEmail, trimmedPassword);
      const loggedUser = res?.user || res?.data?.user || res;

      if (canViewDashboard(loggedUser)) {
        navigate('/dashboard');
      } else if (canAccessDailyActivity(loggedUser)) {
        navigate('/daily-activity');
      } else if (canAccessDigitalCalendar(loggedUser)) {
        navigate('/digital-calendar');
      } else {
        navigate('/daily-activity');
      }
    } catch (err) {
      const rawError =
        err.response?.data?.message ||
        (typeof err.response?.data?.error === 'string'
          ? err.response?.data?.error
          : err.response?.data?.error?.message) ||
        (typeof err.response?.data === 'string' ? err.response?.data : null) ||
        err.message ||
        'Login failed. Please check your credentials.';
      setError(typeof rawError === 'string' ? rawError : JSON.stringify(rawError));
    } finally {
      setLoading(false);
    }
  };

  /* ── Passkey authentication simulation/flow ──── */
  const handleStartPasskey = () => {
    setIsAuthenticatingPasskey(true);
    setPasskeyNotice('Scanning device biometric credentials / passkey...');

    setTimeout(() => {
      // If user has a remembered email in field or localStorage, try fallback or show prompt
      const savedUser = localStorage.getItem('aotms_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && (parsed.email || parsed.username)) {
            setPasskeyNotice(`Biometric recognized for ${parsed.email || parsed.name || 'CRM User'}. Signing in...`);
            setTimeout(() => {
              if (canViewDashboard(parsed)) {
                navigate('/dashboard');
              } else if (canAccessDailyActivity(parsed)) {
                navigate('/daily-activity');
              } else {
                navigate('/daily-activity');
              }
            }, 800);
            return;
          }
        } catch (_) {}
      }

      setPasskeyNotice('Passkey verified. Enter your CRM employee email to complete pairing or use Email login.');
      setTimeout(() => {
        setIsAuthenticatingPasskey(false);
      }, 2000);
    }, 1600);
  };

  /* ── Forgot Password step handlers ───────────── */
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
    }, 800);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');
    const code = fpOtp.trim();
    if (!code || code.length !== 6) {
      setFpError('Please enter the 6-digit verification code.');
      return;
    }
    setFpLoading(true);
    setTimeout(() => {
      setFpLoading(false);
      setFpSuccess('Code verified successfully. Now enter your new password.');
      setFpStep(3);
    }, 800);
  };

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
      }, 1200);
    }, 800);
  };

  const handleResendOtp = () => {
    if (resendCountdown > 0) return;
    setFpError('');
    setFpSuccess('A new 6-digit code has been sent to your email.');
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
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#070b14] text-white selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* ── Ambient Background Glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[720px] h-[400px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[350px] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[140px]" />
        {/* Subtle Tech Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* ── Central Card (Family Sign-in Aesthetic) ── */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px] rounded-[28px] border border-white/10 bg-slate-900/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-black/80"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner overflow-hidden p-2">
              <img
                src={crmLogo}
                alt="AOTMS CRM"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
          </div>
          <span className="text-[11px] font-bold tracking-[0.28em] uppercase text-blue-400">
            AOTMS CRM
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {view === 'login' ? 'Welcome back' : 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {view === 'login'
              ? 'Sign in to access your enterprise CRM workspace'
              : 'Follow the steps to securely recover your account'}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════
            LOGIN VIEW: EMAIL + PASSKEY TABS
            ══════════════════════════════════════════════════ */}
        {view === 'login' && (
          <div>
            {/* Animated Tab Bar (Family Sign-in style) */}
            <div className="relative flex w-full items-center justify-center rounded-2xl bg-white/5 border border-white/10 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('email');
                  setIsAuthenticatingPasskey(false);
                }}
                className={`relative z-10 flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                  activeTab === 'email' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {activeTab === 'email' && (
                  <motion.span
                    layoutId="family-tab-pill"
                    className="absolute inset-0 z-[-1] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/30"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <Mail className="size-3.5" />
                Email
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('passkey')}
                className={`relative z-10 flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                  activeTab === 'passkey' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {activeTab === 'passkey' && (
                  <motion.span
                    layoutId="family-tab-pill"
                    className="absolute inset-0 z-[-1] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/30"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <KeyRound className="size-3.5" />
                Passkey
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-300 mb-4"
              >
                <AlertCircle className="size-4 shrink-0 text-red-400" />
                <span className="leading-snug">{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === 'email' ? (
                /* ── EMAIL LOGIN FORM ── */
                <motion.form
                  key="tab-email"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLoginSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                      <span>Email address</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pl-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me + Forgot Password */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="size-4 rounded border-white/20 bg-white/5 accent-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot');
                        setFpStep(1);
                        setFpError('');
                        setFpSuccess('');
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Terms & Conditions Agreement */}
                  <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400 leading-relaxed">
                    <input
                      id="login-agree-terms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="size-4 rounded border-white/20 bg-white/5 accent-blue-600 focus:ring-0 cursor-pointer shrink-0 mt-0.5"
                    />
                    <label htmlFor="login-agree-terms" className="cursor-pointer select-none">
                      I agree to the{' '}
                      <span
                        className="text-blue-400 hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Terms & Conditions: Please contact support to view the full document.');
                        }}
                      >
                        Terms &amp; Conditions
                      </span>{' '}
                      and{' '}
                      <span
                        className="text-blue-400 hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Privacy Policy: Please contact support to view the full document.');
                        }}
                      >
                        Privacy Policy
                      </span>
                    </label>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In with Email</span>
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                /* ── PASSKEY AUTHENTICATION TAB ── */
                <motion.div
                  key="tab-passkey"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="py-3 flex flex-col items-center text-center space-y-4"
                >
                  {isAuthenticatingPasskey ? (
                    /* Conic Gradient Scanning Animation */
                    <div className="py-4 flex flex-col items-center">
                      <div className="relative flex items-center justify-center overflow-hidden rounded-[24px] p-0.5 mb-4">
                        <motion.div
                          className="absolute left-[-50%] top-[-50%] h-[200%] w-[200%] bg-[conic-gradient(from_0deg,transparent_0%,#4DAFFE_10%,#4DAFFE_25%,transparent_35%)]"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1.25,
                            repeat: Infinity,
                            ease: 'linear',
                            repeatType: 'loop'
                          }}
                        />
                        <div className="relative z-10 flex items-center justify-center rounded-[22px] bg-slate-900 p-5 border border-white/10">
                          <div className="size-16 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <KeyRound className="size-8" />
                          </div>
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-white">Scanning for Passkey...</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                        {passkeyNotice || 'Use your device Touch ID, Face ID, Windows Hello or Security Key.'}
                      </p>

                      <button
                        type="button"
                        onClick={() => setIsAuthenticatingPasskey(false)}
                        className="mt-4 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    /* Passkey Idle Card */
                    <>
                      <div className="size-20 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-blue-400 shadow-inner">
                        <Fingerprint className="size-10" />
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-white">
                          Biometric &amp; Passkey Sign-In
                        </h3>
                        <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed mx-auto">
                          Sign in securely with Windows Hello, Touch ID, Face ID, or your physical security key.
                        </p>
                      </div>

                      {passkeyNotice && (
                        <div className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
                          {passkeyNotice}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleStartPasskey}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                      >
                        <KeyRound className="size-4" />
                        <span>Continue with Passkey</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Need Employee Account Footer */}
            <div className="mt-6 pt-4 border-t border-white/[0.08] text-center text-xs text-slate-400">
              Need employee account access?{' '}
              <span className="text-blue-400 font-medium">
                Contact your CRM Administrator
              </span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            FORGOT PASSWORD VIEW: 3-STEP FLOW
            ══════════════════════════════════════════════════ */}
        {view === 'forgot' && (
          <div>
            <button
              type="button"
              onClick={goBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to sign in</span>
            </button>

            {/* 3 Step Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  fpStep === 1
                    ? 'w-10 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : fpStep > 1
                      ? 'w-6 bg-blue-600'
                      : 'w-6 bg-white/10'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  fpStep === 2
                    ? 'w-10 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : fpStep > 2
                      ? 'w-6 bg-blue-600'
                      : 'w-6 bg-white/10'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  fpStep === 3
                    ? 'w-10 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : 'w-6 bg-white/10'
                }`}
              />
            </div>

            {fpError && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-300 mb-4">
                <AlertCircle className="size-4 shrink-0 text-red-400" />
                <span>{fpError}</span>
              </div>
            )}

            {fpSuccess && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-300 mb-4">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{fpSuccess}</span>
              </div>
            )}

            {/* ── STEP 1: ENTER EMAIL ── */}
            {fpStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Account Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      required
                      autoFocus
                      className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pl-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={fpLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                >
                  {fpLoading ? <Loader2 className="size-4 animate-spin" /> : 'Send Verification Code'}
                </button>
              </form>
            )}

            {/* ── STEP 2: VERIFY OTP ── */}
            {fpStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">6-Digit Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                    className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 text-center text-xl font-mono tracking-[0.5em] text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={fpLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                >
                  {fpLoading ? <Loader2 className="size-4 animate-spin" /> : 'Verify Code'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-500 transition-colors font-medium"
                  >
                    {resendCountdown > 0
                      ? `Resend code in ${resendCountdown}s`
                      : 'Did not receive code? Resend'}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: NEW PASSWORD ── */}
            {fpStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">New Password</label>
                  <div className="relative">
                    <input
                      type={fpShowPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={fpNewPassword}
                      onChange={(e) => setFpNewPassword(e.target.value)}
                      required
                      autoFocus
                      className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setFpShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      {fpShowPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={fpShowPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={fpConfirmPassword}
                      onChange={(e) => setFpConfirmPassword(e.target.value)}
                      required
                      className="w-full h-12 rounded-2xl bg-white/[0.04] border border-white/10 px-4 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={fpLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                >
                  {fpLoading ? <Loader2 className="size-4 animate-spin" /> : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
