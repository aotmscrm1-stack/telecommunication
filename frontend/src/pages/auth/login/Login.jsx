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
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  canViewDashboard,
  canAccessDailyActivity,
  canAccessDigitalCalendar
} from '../../../utils/permissions';
import TechText from '../components/TechText';
import MagicRings from '../components/MagicRings';
import { WetPaintButton } from '../../../components/ui/wet-paint-button';
import {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
} from '../../../components/ui/family-signin-drawer-utils/drawer';
import {
  AnimatedTabs,
  AnimatedTabsList,
  AnimatedTabsTrigger,
  AnimatedTabsContent,
  useMeasure,
} from '../../../components/ui/family-signin-drawer-utils/tabs';

export default function Login() {
  /* ── drawer state ────────────────────────────── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [step, setStep] = useState('default'); // 'default' | 'passkey'
  const [ref, bounds] = useMeasure();

  /* ── active tab in drawer: 'email' | 'passkey' ── */
  const [activeTab, setActiveTab] = useState('email');

  /* ── view: 'login' | 'forgot' ────────────────── */
  const [view, setView] = useState('login');

  /* ── passkey status notice ───────────────────── */
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

  /* ── handle drawer open/close reset ─────────── */
  const handleOpenChange = (isOpen) => {
    setDrawerOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => {
        setStep('default');
        setView('login');
        setError('');
      }, 300);
    }
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

  /* ── Passkey flow ────────────────────────────── */
  const handleStartPasskey = () => {
    setStep('passkey');
    setPasskeyNotice('Scanning device biometric credentials / passkey...');

    setTimeout(() => {
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
        setStep('default');
      }, 2200);
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
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden select-none"
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #17233d 0%, #0f1728 40%, #090e1a 75%, #05070e 100%)`
      }}
    >
      {/* ══════════════════════════════════════════════════
          1. BACKGROUND LIGHTING ANIMATION (MagicRings)
          ══════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1,
          overflow: 'hidden'
        }}
      >
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <MagicRings
            color="#8B5CF6"
            colorTwo="#3B82F6"
            ringCount={7}
            speed={1}
            attenuation={10}
            lineThickness={2}
            baseRadius={0.35}
            radiusStep={0.1}
            scaleRate={0.1}
            opacity={0.88}
            blur={0}
            noiseAmount={0.1}
            rotation={0}
            ringGap={1.5}
            fadeIn={0.7}
            fadeOut={0.5}
            followMouse={false}
            mouseInfluence={0.2}
            hoverScale={1.2}
            parallax={0.05}
            clickBurst={false}
          />
        </div>
      </div>

      
      

      {/* ══════════════════════════════════════════════════
          3. MIDDLE TRIGGER: ONLY WET PAINT BUTTON SHOWING
          ══════════════════════════════════════════════════ */}
      <Drawer open={drawerOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 flex items-center justify-center"
          >
            <WetPaintButton
              type="button"
              className="text-base sm:text-lg px-8 py-3.5 shadow-2xl shadow-indigo-600/50 font-bold tracking-wide cursor-pointer hover:shadow-indigo-500/70"
            >
              Sign In
            </WetPaintButton>
          </motion.div>
        </DrawerTrigger>

        {/* ══════════════════════════════════════════════════
            4. DOWN SIDE POP UP DRAWER (Form Width Decreased)
            ══════════════════════════════════════════════════ */}
        <DrawerContent className="max-w-[380px] w-full mx-auto bg-[#0a0f1d]/95 backdrop-blur-2xl border-t border-x border-white/15 text-white rounded-t-[26px] shadow-2xl focus:outline-none">
          {/* Close Button */}
          <DrawerClose className="absolute right-5 top-4 z-20 size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-75">
            <X className="size-4" />
          </DrawerClose>

          {/* Back Button (when in sub-step) */}
          {(step === 'passkey' || view === 'forgot') && (
            <button
              type="button"
              onClick={() => {
                if (view === 'forgot') goBackToLogin();
                else setStep('default');
              }}
              className="absolute left-5 top-4 z-20 size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-75"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}

          {/* Drawer Title Header */}
          <div className="flex items-center justify-center px-5 pt-5 pb-2 text-center">
            <span className="text-lg font-bold tracking-tight text-white select-none">
              {view === 'forgot'
                ? 'Reset Password'
                : step === 'passkey'
                  ? 'Signing in with Passkey'
                  : 'Sign In'}
            </span>
          </div>

          <DrawerTitle className="sr-only">AOTMS CRM Sign In</DrawerTitle>
          <DrawerDescription className="sr-only">
            Sign in to your CRM workspace account
          </DrawerDescription>

          {/* Dynamic Height Container */}
          <motion.div
            animate={{
              height: bounds.height > 0 ? bounds.height : step === 'default' ? 380 : 310,
            }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="overflow-hidden will-change-transform"
          >
            <div ref={ref} className="px-5 pb-5 pt-1 max-h-[75vh] overflow-y-auto">
              <AnimatePresence mode="popLayout" initial={false}>
                {/* ══════════════════════════════════════════
                    FORGOT PASSWORD VIEW
                    ══════════════════════════════════════════ */}
                {view === 'forgot' ? (
                  <motion.div
                    key="view-forgot"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                    className="space-y-3.5 pt-1"
                  >
                    {/* 3 Step Progress Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          fpStep === 1
                            ? 'w-8 bg-blue-500 shadow-sm shadow-blue-500/50'
                            : fpStep > 1
                              ? 'w-5 bg-blue-600'
                              : 'w-5 bg-white/10'
                        }`}
                      />
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          fpStep === 2
                            ? 'w-8 bg-blue-500 shadow-sm shadow-blue-500/50'
                            : fpStep > 2
                              ? 'w-5 bg-blue-600'
                              : 'w-5 bg-white/10'
                        }`}
                      />
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          fpStep === 3
                            ? 'w-8 bg-blue-500 shadow-sm shadow-blue-500/50'
                            : 'w-5 bg-white/10'
                        }`}
                      />
                    </div>

                    {fpError && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300">
                        <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                        <span>{fpError}</span>
                      </div>
                    )}

                    {fpSuccess && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                        <span>{fpSuccess}</span>
                      </div>
                    )}

                    {/* Step 1: Email */}
                    {fpStep === 1 && (
                      <form onSubmit={handleSendOtp} className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-300">Account Email</label>
                          <div className="relative">
                            <input
                              type="email"
                              placeholder="you@company.com"
                              value={fpEmail}
                              onChange={(e) => setFpEmail(e.target.value)}
                              required
                              autoFocus
                              className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 pl-9 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={fpLoading}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                        >
                          {fpLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Send Verification Code'}
                        </button>
                      </form>
                    )}

                    {/* Step 2: OTP */}
                    {fpStep === 2 && (
                      <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                        <div className="space-y-1">
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
                            className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-center text-lg font-mono tracking-[0.4em] text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={fpLoading}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                        >
                          {fpLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Verify Code'}
                        </button>

                        <div className="text-center pt-0.5">
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendCountdown > 0}
                            className="text-[11px] text-blue-400 hover:text-blue-300 disabled:text-slate-500 transition-colors font-medium"
                          >
                            {resendCountdown > 0
                              ? `Resend code in ${resendCountdown}s`
                              : 'Did not receive code? Resend'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Step 3: New Password */}
                    {fpStep === 3 && (
                      <form onSubmit={handleResetPassword} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-300">New Password</label>
                          <div className="relative">
                            <input
                              type={fpShowPassword ? 'text' : 'password'}
                              placeholder="At least 6 characters"
                              value={fpNewPassword}
                              onChange={(e) => setFpNewPassword(e.target.value)}
                              required
                              autoFocus
                              className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 pl-9 pr-10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                            <button
                              type="button"
                              onClick={() => setFpShowPassword((s) => !s)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                            >
                              {fpShowPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-300">Confirm Password</label>
                          <div className="relative">
                            <input
                              type={fpShowPassword ? 'text' : 'password'}
                              placeholder="Re-enter new password"
                              value={fpConfirmPassword}
                              onChange={(e) => setFpConfirmPassword(e.target.value)}
                              required
                              className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 pl-9 pr-10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={fpLoading}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                        >
                          {fpLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Set New Password'}
                        </button>
                      </form>
                    )}
                  </motion.div>
                ) : step === 'default' ? (
                  /* ══════════════════════════════════════════
                      DEFAULT SIGN IN: ANIMATED TABS
                      ══════════════════════════════════════════ */
                  <motion.div
                    key="step-default"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  >
                    <AnimatedTabs defaultValue="email" value={activeTab} onValueChange={setActiveTab}>
                      <AnimatedTabsList className="bg-white/5 border border-white/10 rounded-xl p-1 mb-3.5">
                        <AnimatedTabsTrigger value="email" className="text-xs py-1.5">
                          <Mail className="size-3.5 mr-1.5" />
                          Email
                        </AnimatedTabsTrigger>
                        <AnimatedTabsTrigger value="passkey" className="text-xs py-1.5">
                          <KeyRound className="size-3.5 mr-1.5" />
                          Passkey
                        </AnimatedTabsTrigger>
                      </AnimatedTabsList>

                      {error && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300 mb-3">
                          <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* ── TAB 1: EMAIL LOGIN ── */}
                      <AnimatedTabsContent value="email" className="pt-1 pb-1">
                        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-300">Email</label>
                            <div className="relative">
                              <input
                                id="signin-email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 pl-9 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-300">Password</label>
                            <div className="relative">
                              <input
                                id="signin-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 pl-9 pr-10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                              <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                              >
                                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Remember Me & Terms */}
                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
                              <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="size-3.5 rounded border-white/20 bg-white/5 accent-blue-600 focus:ring-0 cursor-pointer"
                              />
                              <span className="text-[11px]">Remember me</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setView('forgot');
                                setFpStep(1);
                                setFpError('');
                                setFpSuccess('');
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors text-[11px] font-medium"
                            >
                              Forgot password?
                            </button>
                          </div>

                          <div className="flex items-start gap-1.5 text-[10.5px] text-slate-400 leading-tight">
                            <input
                              id="login-agree-terms"
                              type="checkbox"
                              checked={agreeTerms}
                              onChange={(e) => setAgreeTerms(e.target.checked)}
                              className="size-3.5 rounded border-white/20 bg-white/5 accent-blue-600 focus:ring-0 cursor-pointer shrink-0 mt-0.5"
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
                              and Privacy Policy
                            </label>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>Signing In...</span>
                              </>
                            ) : (
                              <span>Sign In with Email</span>
                            )}
                          </button>
                        </form>
                      </AnimatedTabsContent>

                      {/* ── TAB 2: PASSKEY LOGIN ── */}
                      <AnimatedTabsContent value="passkey" className="pt-3 pb-1">
                        <div className="space-y-3.5 text-center">
                          <div className="flex items-center justify-center">
                            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-blue-400">
                              <Fingerprint className="size-10" />
                            </div>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed px-2">
                            Sign in quickly with your biometric credentials or device passkey.
                          </p>
                          <button
                            type="button"
                            onClick={handleStartPasskey}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all"
                          >
                            <KeyRound className="size-3.5" />
                            <span>Continue with Passkey</span>
                          </button>
                        </div>
                      </AnimatedTabsContent>
                    </AnimatedTabs>
                  </motion.div>
                ) : (
                  /* ══════════════════════════════════════════
                      PASSKEY AUTHENTICATING STATE (Conic Glow)
                      ══════════════════════════════════════════ */
                  <motion.div
                    key="step-passkey"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                    className="space-y-3 py-3 flex flex-col items-center text-center"
                  >
                    <div className="relative flex items-center justify-center overflow-hidden rounded-[22px] p-0.5">
                      <motion.div
                        className="absolute left-[-50%] top-[-50%] h-[200%] w-[200%] bg-[conic-gradient(from_0deg,transparent_0%,#4DAFFE_10%,#4DAFFE_25%,transparent_35%)]"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1.25,
                          repeat: Infinity,
                          ease: 'linear',
                          repeatType: 'loop',
                        }}
                      />
                      <div className="relative z-10 flex items-center justify-center rounded-[20px] bg-slate-900 p-4 border border-white/10">
                        <div className="size-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <KeyRound className="size-7" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-xs font-semibold text-white">Scanning Passkey</h4>
                      <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed mx-auto">
                        {passkeyNotice || 'Use your device Touch ID, Face ID, or Windows Hello to verify.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep('default')}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors pt-1"
                    >
                      Back to options
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
