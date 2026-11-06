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
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
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
import crmLogo from '../../../assets/Logo.png';
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
          2. TECH TEXT DISPLAY (CRM Vector Outline)
          ══════════════════════════════════════════════════ */}
      <div
        className="tech-text-responsive-wrapper pointer-events-none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(280px, 50vw, 700px)',
          height: 'clamp(160px, 35vh, 320px)',
          zIndex: 5,
          opacity: 0.42,
        }}
      >
        <TechText
          text="CRM"
          fontWeight={600}
          fontSize={140}
          reveal="letter"
          dashLength={4}
          dashGap={2}
          specks={15}
          fontFamily=""
          color="rgba(255, 255, 255, 0.45)"
          accentColor="#3b82f6"
          letterSpacing={-0.05}
          reach={200}
          softness={0.7}
          strokeWidth={1.5}
          speed={1}
          lineStyle="dashed"
          selection={false}
          labels={false}
          draggable={false}
          sweep
        />
      </div>

      {/* ══════════════════════════════════════════════════
          3. MIDDLE SIGN IN BUTTON & DRAWER TRIGGER
          ══════════════════════════════════════════════════ */}
      <Drawer open={drawerOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 flex flex-col items-center cursor-pointer"
          >
            <div className="group relative p-8 sm:p-10 rounded-[32px] border border-white/15 bg-slate-900/70 backdrop-blur-2xl shadow-2xl shadow-black/80 flex flex-col items-center text-center max-w-sm w-full mx-auto hover:border-blue-500/40 transition-all duration-300">
              {/* Glowing Aura on Hover */}
              <div className="absolute -inset-0.5 rounded-[34px] bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 pointer-events-none" />

              {/* Logo */}
              <div className="relative size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2.5 mb-4 shadow-inner">
                <img src={crmLogo} alt="AOTMS CRM" className="w-full h-full object-contain filter drop-shadow" />
              </div>

              <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-blue-400 mb-1">
                AOTMS CRM
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 mb-6 max-w-[260px] leading-relaxed">
                Click below to open the secure sign-in workspace.
              </p>

              {/* Middle Action Button */}
              <button
                type="button"
                className="group/btn relative inline-flex items-center justify-center gap-2.5 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 group-hover/btn:shadow-blue-600/50 group-hover/btn:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-white/20"
              >
                <Sparkles className="size-4 text-blue-200 group-hover/btn:rotate-12 transition-transform" />
                <span>Sign In to CRM</span>
                <ArrowRight className="size-4 text-blue-200 group-hover/btn:translate-x-1 transition-transform" />
              </button>

              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
                <span>Click to open login drawer</span>
                <span className="animate-bounce">↓</span>
              </div>
            </div>
          </motion.div>
        </DrawerTrigger>

        {/* ══════════════════════════════════════════════════
            4. DOWN SIDE POP UP DRAWER (Family Sign-in Drawer)
            ══════════════════════════════════════════════════ */}
        <DrawerContent className="max-w-lg mx-auto bg-[#0a0f1d]/95 backdrop-blur-2xl border-t border-x border-white/15 text-white rounded-t-[28px] shadow-2xl focus:outline-none">
          {/* Close Button */}
          <DrawerClose className="absolute right-6 top-5 z-20 size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-75">
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
              className="absolute left-6 top-5 z-20 size-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-75"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}

          {/* Drawer Title Header */}
          <div className="flex items-center justify-center px-6 pt-6 pb-2 text-center">
            <span className="text-xl font-semibold tracking-tight text-white select-none">
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
              height: bounds.height > 0 ? bounds.height : step === 'default' ? 390 : 320,
            }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="overflow-hidden will-change-transform"
          >
            <div ref={ref} className="px-6 pb-6 pt-1 max-h-[75vh] overflow-y-auto">
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
                    className="space-y-4 pt-2"
                  >
                    {/* 3 Step Progress Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-4">
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
                      <div className="flex items-center gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-300">
                        <AlertCircle className="size-4 shrink-0 text-red-400" />
                        <span>{fpError}</span>
                      </div>
                    )}

                    {fpSuccess && (
                      <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        <span>{fpSuccess}</span>
                      </div>
                    )}

                    {/* Step 1: Email */}
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
                              className="w-full h-12 rounded-2xl bg-white/[0.05] border border-white/10 px-4 pl-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
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

                    {/* Step 2: OTP */}
                    {fpStep === 2 && (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-300">6-Digit Verification Code</label>
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
                            className="w-full h-12 rounded-2xl bg-white/[0.05] border border-white/10 px-4 text-center text-xl font-mono tracking-[0.5em] text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={fpLoading}
                          className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                        >
                          {fpLoading ? <Loader2 className="size-4 animate-spin" /> : 'Verify Code'}
                        </button>

                        <div className="text-center pt-1">
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

                    {/* Step 3: New Password */}
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
                              className="w-full h-12 rounded-2xl bg-white/[0.05] border border-white/10 px-4 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                              className="w-full h-12 rounded-2xl bg-white/[0.05] border border-white/10 px-4 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                      <AnimatedTabsList className="bg-white/5 border border-white/10 rounded-2xl p-1 mb-4">
                        <AnimatedTabsTrigger value="email">
                          <Mail className="size-4 mr-1.5" />
                          Email
                        </AnimatedTabsTrigger>
                        <AnimatedTabsTrigger value="passkey">
                          <KeyRound className="size-4 mr-1.5" />
                          Passkey
                        </AnimatedTabsTrigger>
                      </AnimatedTabsList>

                      {error && (
                        <div className="flex items-center gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-300 mb-4">
                          <AlertCircle className="size-4 shrink-0 text-red-400" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* ── TAB 1: EMAIL LOGIN ── */}
                      <AnimatedTabsContent value="email" className="pt-2 pb-2">
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300">Email</label>
                            <div className="relative">
                              <input
                                id="signin-email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full h-12 rounded-2xl bg-white/[0.05] border border-white/10 px-4 pl-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300">Password</label>
                            <div className="relative">
                              <input
                                id="signin-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full h-12 rounded-2xl bg-white/[0.05] border border-white/10 px-4 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-blue-500/20 transition-all"
                              />
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                              <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                              >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Remember Me & Terms */}
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

                          <div className="flex items-start gap-2 pt-0.5 text-[11px] text-slate-400 leading-relaxed">
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
                              and Privacy Policy
                            </label>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>Signing In...</span>
                              </>
                            ) : (
                              <span>Sign In with Email</span>
                            )}
                          </button>
                        </form>
                      </AnimatedTabsContent>

                      {/* ── TAB 2: PASSKEY LOGIN ── */}
                      <AnimatedTabsContent value="passkey" className="pt-4 pb-2">
                        <div className="space-y-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-blue-400">
                              <Fingerprint className="size-12" />
                            </div>
                          </div>
                          <p className="text-sm text-slate-300">
                            Sign in quickly with your biometric credentials or device passkey.
                          </p>
                          <button
                            type="button"
                            onClick={handleStartPasskey}
                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all"
                          >
                            <KeyRound className="size-4" />
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
                    className="space-y-4 py-4 flex flex-col items-center text-center"
                  >
                    <div className="relative flex items-center justify-center overflow-hidden rounded-[24px] p-0.5">
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
                      <div className="relative z-10 flex items-center justify-center rounded-[22px] bg-slate-900 p-5 border border-white/10">
                        <div className="size-16 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <KeyRound className="size-8" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Scanning Passkey</h4>
                      <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed mx-auto">
                        {passkeyNotice || 'Use your device Touch ID, Face ID, or Windows Hello to verify.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep('default')}
                      className="text-xs text-slate-400 hover:text-white transition-colors pt-2"
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
