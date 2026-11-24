import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, PasswordInput } from '../components/ui';
import { Mail, AlertCircle, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { OtpInput } from '../components/auth/OtpInput';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
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

    setIsSubmitting(true);
    try {
      await login(email, password);
      // When OTP is required, pendingLogin is set in AuthContext
      setResendCooldown(45);
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
      setResendCooldown(45);
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
    <div>
      {/* Official Company Branding Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '14px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E9F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <img
              src="/arco-icon.png"
              alt="ARCO Workplace"
              style={{
                height: '38px',
                width: '38px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#172033', marginBottom: '4px' }}>
          {pendingLogin ? 'Verify your sign-in' : 'ARCO Workplace'}
        </h2>
        <p style={{ color: '#667085', fontWeight: 400, fontSize: '13px', margin: 0 }}>
          {pendingLogin
            ? 'Enter the 6-digit verification code sent to your registered email address.'
            : 'Operations & Workplace Management Platform'}
        </p>
      </div>

      {sessionExpiredMessage && !pendingLogin && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FEDF89',
            color: '#92400E',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={18} />
          {sessionExpiredMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECDCA',
            color: '#B42318',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {successNotice && (
        <div
          style={{
            backgroundColor: '#ECFDF3',
            border: '1px solid #D1FADF',
            color: '#065F46',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <ShieldCheck size={16} />
          {successNotice}
        </div>
      )}

      {/* ── STEP 1: EMAIL & PASSWORD ────────────────────────────────────────── */}
      {!pendingLogin ? (
        <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            leftIcon={<Mail size={18} />}
            placeholder="name@arcofintech.com"
          />
          <div>
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setShowForgotModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '2px 0',
                }}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <Button
            type="submit"
            style={{ width: '100%', marginTop: '4px' }}
            isLoading={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? 'Verifying credentials...' : 'Sign In'}
          </Button>
        </form>
      ) : (
        /* ── STEP 2: 6-DIGIT OTP VERIFICATION SCREEN ─────────────────────────── */
        <form onSubmit={handleOTPSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E9F0',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#475467',
            }}
          >
            <Mail size={16} color="#2563EB" />
            <span>
              Sent to: <strong style={{ color: '#172033' }}>{pendingLogin.email}</strong>
            </span>
          </div>

          <div>
            <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#475467' }}>
              Verification Code
            </div>
            <OtpInput
              value={otp}
              onChange={(newVal) => setOtp(newVal)}
              disabled={isSubmitting || isLoading}
              autoFocus={true}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: '#98A2B3' }}>
                Expires in ~5 minutes
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#98A2B3' : '#2563EB',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={13} />
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            style={{ width: '100%', marginTop: '4px' }}
            isLoading={isSubmitting || isLoading}
            disabled={otp.length !== 6}
          >
            {isSubmitting || isLoading ? 'Verifying code...' : 'Verify & Sign In'}
          </Button>

          <button
            type="button"
            onClick={handleBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#667085',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            <ArrowLeft size={14} /> Back to Sign In
          </button>
        </form>
      )}

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
