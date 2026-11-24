import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Shield,
  ShieldCheck,
  AlertCircle,
  Monitor,
  Layers,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { OtpInput } from '../components/auth/OtpInput';
import { ArcoLogo, ArcoMark } from '../components/common/ArcoLogo';

const SAVED_EMAIL_KEY = 'arco_remembered_email';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 3) {
    return `${user[0]}***@${domain}`;
  }
  return `${user.slice(0, 4)}***@${domain}`;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const {
    login,
    verifyOTP,
    resendOTP,
    cancelPendingLogin,
    pendingLogin,
    error,
    clearError,
    isLoading,
    sessionExpiredMessage,
  } = useAuth();

  // Load remembered email on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  // Handle Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessNotice(null);
    if (!email || !password) return;

    if (rememberMe) {
      try {
        localStorage.setItem(SAVED_EMAIL_KEY, email);
      } catch {}
    } else {
      try {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      } catch {}
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      // When OTP is required, pendingLogin is set in AuthContext
      setResendCooldown(108); // 1m 48s as shown in approved mockup
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 2: Submit OTP
  const handleOTPSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearError();
    if (!otp || otp.length !== 6) return;

    setIsSubmitting(true);
    try {
      await verifyOTP(otp);
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    clearError();
    setIsSubmitting(true);
    try {
      await resendOTP();
      setResendCooldown(108);
      setSuccessNotice('A fresh verification code has been sent to your registered email.');
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    clearError();
    setOtp('');
    setSuccessNotice(null);
    cancelPendingLogin();
  };

  return (
    <div className="auth-split-wrapper">
      {/* ── LEFT HERO PANEL (Glass Office Building & City Skyline Backdrop) ── */}
      <div className="auth-left-hero">
        <div className="auth-hero-overlay" />

        <div className="auth-hero-content">
          {/* Top Brand & Header Section */}
          <div>
            <ArcoLogo variant="full" layout="stacked" theme="light" markSize={68} />

            <div className="auth-hero-text-block">
              <h1 className="auth-hero-heading">
                Smarter Workplace.
                <br />
                Greater Productivity.
              </h1>
              <p className="auth-hero-description">
                Manage your people, assets, IT support, operations and finance — all in one simple, powerful platform.
              </p>
            </div>

            {/* 5 Feature Cards / Pills in well-aligned row */}
            <div className="auth-feature-row">
              <div className="auth-feature-pill">
                <div className="auth-feature-icon-badge">
                  <Monitor size={17} />
                </div>
                <span className="auth-feature-label">
                  IT Service Desk
                </span>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon-badge">
                  <Layers size={17} />
                </div>
                <span className="auth-feature-label">
                  Assets
                </span>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon-badge">
                  <ShoppingCart size={17} />
                </div>
                <span className="auth-feature-label">
                  Purchasing
                </span>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon-badge">
                  <ShieldCheck size={17} />
                </div>
                <span className="auth-feature-label">
                  Finance &amp; Claims
                </span>
              </div>

              <div className="auth-feature-pill">
                <div className="auth-feature-icon-badge">
                  <Users size={17} />
                </div>
                <span className="auth-feature-label">
                  People Ops
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Skyline Tagline */}
          <div
            style={{
              paddingTop: '32px',
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.7)',
            }}
          >
            Better Tools &nbsp;|&nbsp; Smarter Teams &nbsp;|&nbsp; Stronger Organizations
          </div>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION PANEL (White Clean Form) ───────────────────── */}
      <div className="auth-right-container">
        {/* Subtle Watermark in background */}
        <ArcoMark size={300} className="auth-watermark" />

        {/* Main Form Center Area */}
        <div className="auth-form-card">
          {/* Mobile Top Brand Header (Visible only on < 1024px) */}
          <div className="auth-mobile-header">
            <ArcoLogo variant="full" theme="light" markSize={40} />
          </div>

          {sessionExpiredMessage && !pendingLogin && (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FEDF89',
                color: '#92400E',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECDCA',
                color: '#B42318',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>{successNotice}</span>
            </div>
          )}

          {/* ── STEP 1: WELCOME BACK (CREDENTIALS FORM) ─────────────────────── */}
          {!pendingLogin ? (
            <div>
              <div style={{ marginBottom: '26px' }}>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.025em',
                    margin: '0 0 6px 0',
                  }}
                >
                  Welcome Back
                </h2>
                <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 400 }}>
                  Sign in to your account to continue
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email or Username Input */}
                <div className="auth-input-wrap">
                  <UserIcon size={17} className="input-left-icon" />
                  <input
                    id="login-email-input"
                    type="text"
                    className="auth-input-field"
                    placeholder="Email or Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>

                {/* Password Input with Show/Hide Toggle */}
                <div>
                  <div className="auth-input-wrap">
                    <Lock size={17} className="input-left-icon" />
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input-field"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      className="input-eye-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {/* Remember me & Forgot password row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                    }}
                  >
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#475467',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#1E40AF',
                          cursor: 'pointer',
                          borderRadius: '4px',
                        }}
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setShowForgotModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1E40AF',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isSubmitting || isLoading}
                  style={{ marginTop: '8px' }}
                >
                  <span>{isSubmitting || isLoading ? 'Signing In...' : 'Sign In'}</span>
                  {!isSubmitting && !isLoading && <ArrowRight size={16} />}
                </button>
              </form>
            </div>
          ) : (
            /* ── STEP 2: VERIFY YOUR IDENTITY (OTP FORM) ───────────────────────── */
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#0F172A',
                    letterSpacing: '-0.025em',
                    margin: '0 0 6px 0',
                  }}
                >
                  Verify Your Identity
                </h2>
                <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 6px 0', fontWeight: 400 }}>
                  We&apos;ve sent a 6-digit OTP to your email address
                </p>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1E40AF' }}>
                  {maskEmail(pendingLogin.email)}
                </div>
              </div>

              <form onSubmit={handleOTPSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <OtpInput
                    value={otp}
                    onChange={(newVal) => setOtp(newVal)}
                    disabled={isSubmitting || isLoading}
                    autoFocus={true}
                  />
                </div>

                {/* Primary Verify Button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={otp.length !== 6 || isSubmitting || isLoading}
                >
                  <span>{isSubmitting || isLoading ? 'Verifying...' : 'Verify'}</span>
                  {!isSubmitting && !isLoading && <ArrowRight size={16} />}
                </button>

                {/* Resend Row with Countdown Timer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '13px',
                    color: '#475467',
                  }}
                >
                  <span>Didn&apos;t receive the code?&nbsp;</span>
                  {resendCooldown > 0 ? (
                    <span style={{ color: '#1E40AF', fontWeight: 600 }}>
                      Resend OTP ({formatCountdown(resendCooldown)})
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isSubmitting}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1E40AF',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '13px',
                      }}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '4px 0',
                    color: '#94A3B8',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
                  <span>Or</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
                </div>

                {/* Secondary Back to Login Button */}
                <button
                  type="button"
                  className="auth-outline-btn"
                  onClick={handleBackToLogin}
                  disabled={isSubmitting || isLoading}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Login</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Footer: Secure & Encrypted */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            color: '#64748B',
            fontWeight: 500,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Shield size={15} color="#1E40AF" />
          <span>Secure &amp; Encrypted</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSuccess={() => {
          setShowForgotModal(false);
          setSuccessNotice('Password reset successful. Please sign in with your new password.');
        }}
      />
    </div>
  );
};
