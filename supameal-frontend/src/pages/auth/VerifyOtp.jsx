import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button/Button';
import { useAuth } from '../../context/AuthContext';
import './AuthForm.css';

const RESEND_COOLDOWN = 60; // seconds

const VerifyOtp = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();
  const email = localStorage.getItem('pendingVerificationEmail') || '';
  const accountType = localStorage.getItem('pendingVerificationRealm') || 'customer';

  // Start countdown helper
  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN);
  }, []);

  // Countdown tick
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Allow only digits
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    // Focus the last filled input or the next empty one
    const lastIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await verifyOtp(email, code, accountType);
      setSuccess('Email verified! Redirecting...');
      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingVerificationRealm');
      const redirect = localStorage.getItem('pendingVerificationRedirect');
      localStorage.removeItem('pendingVerificationRedirect');
      const destination = redirect || (accountType === 'owner' ? '/owner-login?status=pending' : '/customer/dashboard');
      setTimeout(() => navigate(destination, { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    setSuccess('');
    try {
      await resendOtp(email, accountType);
      setSuccess('A new code has been sent! Check your email');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      startCountdown();
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const allFilled = otp.every((d) => d !== '');

  return (
    <AuthLayout
      title="Almost there!"
      subtitle="Verify your email to complete registration."
    >
      <div className="auth-form-header">
        <ShieldCheck size={36} className="auth-form-icon" style={{ color: 'var(--primary)' }} />
        <h3>Verify Email</h3>
        <p>
          We've sent a 6-digit code to{' '}
          <strong style={{ color: 'var(--primary)' }}>{email || 'your email'}</strong>.
          <br />
          <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>
            If you don't see it, check your spam folder or resend below.
          </span>
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="otp-status otp-status--error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="otp-status otp-status--success">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleVerify} noValidate>
        {/* OTP inputs */}
        <div className="otp-inputs" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              className={`otp-input${digit ? ' otp-input--filled' : ''}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              autoComplete="one-time-code"
              aria-label={`OTP digit ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="primary"
          className="auth-submit-btn"
          type="submit"
          disabled={loading || !allFilled}
        >
          {loading ? 'Verifying...' : 'Verify Account'}
          {!loading && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
        </Button>
      </form>

      {/* Resend section */}
      <div className="otp-resend-section">
        <span className="otp-resend-label">Didn't receive the code?</span>

        <button
          type="button"
          className={`otp-resend-btn${countdown > 0 || resendLoading ? ' otp-resend-btn--disabled' : ''}`}
          onClick={handleResend}
          disabled={countdown > 0 || resendLoading}
          aria-disabled={countdown > 0 || resendLoading}
        >
          <RefreshCw
            size={15}
            style={{
              marginRight: '6px',
              animation: resendLoading ? 'otp-spin 1s linear infinite' : 'none',
            }}
          />
          {resendLoading
            ? 'Sending...'
            : countdown > 0
            ? `Resend in ${countdown}s`
            : 'Resend Code'}
        </button>

        {countdown > 0 && (
          <div className="otp-countdown-bar">
            <div
              className="otp-countdown-fill"
              style={{ width: `${(countdown / RESEND_COOLDOWN) * 100}%` }}
            />
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyOtp;
