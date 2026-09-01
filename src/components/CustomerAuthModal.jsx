import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CustomerAuthModal({ isOpen, onClose, onSuccess, initialMode = 'signin' }) {
  const { signInWithGoogle, signUpWithEmail, verifyEmailOtp, resendEmailOtp, signInWithEmail } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup' | 'verify_otp'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      // Google redirect occurs automatically
    } catch (err) {
      console.error('Google Sign In Error:', err);
      setErrorMsg(err.message || 'Failed to initialize Google Sign In.');
      setIsLoading(false);
    }
  };

  // Handle Email Sign In
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await signInWithEmail({ email, password });
      setSuccessMsg('Successfully signed in.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error('Sign In Error:', err);
      setErrorMsg(err.message || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  // Handle Email Sign Up (triggers OTP)
  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await signUpWithEmail({ email, password, fullName });
      setMode('verify_otp');
      setResendCooldown(60);
      setSuccessMsg(`Verification code sent to ${email}`);
      setIsLoading(false);
    } catch (err) {
      console.error('Sign Up Error:', err);
      setErrorMsg(err.message || 'Sign up failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await verifyEmailOtp({ email, token: otpCode });
      setSuccessMsg('Account verified and activated successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err) {
      console.error('OTP Verification Error:', err);
      setErrorMsg(err.message || 'Invalid or expired verification code.');
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg('');
    try {
      await resendEmailOtp(email);
      setResendCooldown(60);
      setSuccessMsg('A new 6-digit code has been sent to your email.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#2C1E1B]/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 bg-white max-w-md w-full border border-[#E8DCD7] shadow-2xl p-6 sm:p-8 rounded-none overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#705B56] hover:text-[#2C1E1B] transition-colors rounded-none cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <span className="text-[10px] font-brand uppercase tracking-[0.25em] text-[#B86B60] font-bold block mb-1">
              AURA ATELIER CLIENT ACCOUNT
            </span>
            <h2 className="font-brand text-2xl font-normal text-[#2C1E1B]">
              {mode === 'verify_otp'
                ? 'Verify Your Email'
                : mode === 'signup'
                ? 'Create Your Account'
                : 'Welcome Back'}
            </h2>
            <p className="text-xs text-[#705B56] mt-1 font-sans">
              {mode === 'verify_otp'
                ? `Enter the 6-digit code sent to ${email}`
                : mode === 'signup'
                ? 'Sign up to track orders, save wishlists, and checkout faster.'
                : 'Sign in to access your order history and saved items.'}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-none flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Tabs (Sign In vs Create Account) */}
          {mode !== 'verify_otp' && (
            <div className="flex border-b border-[#E8DCD7] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                }}
                className={`flex-1 pb-3 text-xs uppercase tracking-[0.2em] font-bold text-center border-b-2 transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'border-[#2C1E1B] text-[#2C1E1B]'
                    : 'border-transparent text-[#A38E88] hover:text-[#2C1E1B]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                }}
                className={`flex-1 pb-3 text-xs uppercase tracking-[0.2em] font-bold text-center border-b-2 transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'border-[#2C1E1B] text-[#2C1E1B]'
                    : 'border-transparent text-[#A38E88] hover:text-[#2C1E1B]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Google One-Click Sign-In (For Sign In and Sign Up) */}
          {mode !== 'verify_otp' && (
            <div className="space-y-4 mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-white border border-[#E8DCD7] hover:border-[#2C1E1B] text-[#2C1E1B] text-xs font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all rounded-none shadow-sm cursor-pointer disabled:opacity-50"
              >
                {/* Official Google G Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-[#E8DCD7]" />
                <span className="text-[10px] uppercase tracking-wider text-[#A38E88]">or with email</span>
                <div className="flex-1 h-[1px] bg-[#E8DCD7]" />
              </div>
            </div>
          )}

          {/* FORM 1: Sign In Mode */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORM 2: Sign Up Mode */}
          {mode === 'signup' && (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Elena Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                  Email Address * (Must be valid for OTP verification)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5">
                  Create Password * (Minimum 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF5F2] border border-[#E8DCD7] text-xs text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-[#2C1E1B] hover:bg-[#B86B60] text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Verification Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORM 3: 6-Digit Email OTP Verification Screen */}
          {mode === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="bg-[#FAF5F2] border border-[#E8DCD7] p-4 text-center">
                <ShieldCheck className="w-6 h-6 text-[#B86B60] mx-auto mb-1.5" />
                <p className="text-xs text-[#2C1E1B] font-semibold">
                  6-Digit OTP Code Sent
                </p>
                <p className="text-[11px] text-[#705B56] mt-0.5">
                  Check your inbox at <span className="font-bold text-[#2C1E1B]">{email}</span>
                </p>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-[#705B56] mb-1.5 text-center">
                  Enter 6-Digit Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#A38E88] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-3.5 py-3 bg-[#FAF5F2] border border-[#E8DCD7] text-center text-lg font-mono tracking-[0.35em] text-[#2C1E1B] focus:outline-none focus:border-[#2C1E1B] rounded-none transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[#705B56] hover:text-[#2C1E1B] underline cursor-pointer"
                >
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-[#B86B60] hover:underline font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 bg-emerald-800 hover:bg-emerald-900 text-white text-xs uppercase font-bold tracking-[0.2em] transition-all rounded-none shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Activate Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Notice */}
          <div className="mt-6 pt-4 border-t border-[#E8DCD7] text-center text-[10px] text-[#A38E88]">
            <p>Protected by Supabase Secure Client Authentication</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
