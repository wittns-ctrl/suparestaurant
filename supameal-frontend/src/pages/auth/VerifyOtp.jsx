import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RefreshCw, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button/Button';
import { useAuth } from '../../context/AuthContext';
import { homeForUser } from '../../utils/auth';
import './AuthForm.css';

const RESEND_COOLDOWN = 60; // seconds

const VerifyOtp = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();

  const initialEmail = (
    searchParams.get('email') ||
    location.state?.email ||
    localStorage.getItem('pendingVerificationEmail') ||
    ''
  ).trim();

  const initialAccountType = (
    searchParams.get('accountType') ||
    searchParams.get('type') ||
    location.state?.accountType ||
    localStorage.getItem('pendingVerificationRealm') ||
    'customer'
  ).trim();

  const [email, setEmail] = useState(initialEmail);
  const [accountType] = useState(initialAccountType);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  // Sync to localStorage whenever valid email is entered
  useEffect(() => {
    if (email.trim()) {
      localStorage.setItem('pendingVerificationEmail', email.trim());
    }
  }, [email]);

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
    const lastIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter the email address for your account.');
      setIsEditingEmail(true);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      setIsEditingEmail(true);
      return;
    }

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await verifyOtp(cleanEmail, code, accountType);
      setSuccess('Email verified! Redirecting to your dashboard...');

      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingVerificationRealm');
      const redirect = searchParams.get('redirect') || localStorage.getItem('pendingVerificationRedirect');
      localStorage.removeItem('pendingVerificationRedirect');

      // Direct users to their respective dashboard based on their role
      const targetUser = res?.user || { role: accountType, roles: [accountType] };
      const dashboardPath = homeForUser(targetUser);
      const destination = redirect || dashboardPath;

      setTimeout(() => navigate(destination, { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address to receive a code.');
      setIsEditingEmail(true);
      return;
    }
    if (countdown > 0 || resendLoading) return;

    setResendLoading(true);
    setError('');
    setSuccess('');
    try {
      await resendOtp(cleanEmail, accountType);
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
          <strong style={{ color: 'var(--primary)' }}>{email || 'your email'}</strong>
          {email && (
            <button
              type="button"
              onClick={() => setIsEditingEmail((prev) => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.82rem',
                padding: 0,
                marginLeft: '8px',
              }}
            >
              {isEditingEmail ? '(Done)' : '(Change)'}
            </button>
          )}
          .
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
        {/* Email input field if missing or if user clicked Change */}
        {(!email || isEditingEmail) && (
          <div className="auth-input-group" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <label htmlFor="verify-email-field" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Account Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="verify-email-field"
                type="email"
                className="auth-input"
                placeholder="Enter your email (e.g. name@example.com)"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                autoFocus={!email}
              />
            </div>
          </div>
        )}

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
          disabled={loading || !allFilled || !email.trim()}
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
