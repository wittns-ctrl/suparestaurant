import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Store, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button/Button';
import Loader from '../../components/Loader/Loader';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import AuthAccountSwitcher from '../auth/AuthAccountSwitcher';
import { isBlockedAccountError } from '../auth/BlockedAccountPage';
import '../auth/AuthForm.css';

const OwnerLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { loginWithCredentials, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');
  const oauthAccountBlocked = isBlockedAccountError(oauthError);
  const applicationStatus = searchParams.get('status');

  useEffect(() => {
    if (!oauthError) return;
    sessionStorage.removeItem('ownerOAuthIntent');
    if (isBlockedAccountError(oauthError)) {
      navigate('/account-blocked', { replace: true });
      setError('');
    }
  }, [oauthError, navigate]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    if (!email.trim()) {
      setError('Please enter your email to reset your password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.forgot({ email: email.trim() }, 'owner');
      setForgotMessage(response.message || 'Reset link sent to your email. Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    sessionStorage.removeItem('ownerOAuthIntent');
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const user = await loginWithCredentials(email.trim(), password, 'owner');
      // This portal is owner-only — an admin/customer who logs in here must
      // not keep an authenticated session pointed at the owner dashboard.
      if (user.accountType !== 'owner') {
        await logout();
        setError('This account does not belong to the restaurant owner sign-in.');
        setIsLoading(false);
        return;
      }
      navigate('/owner/dashboard', { replace: true });
    } catch (err) {
      if (isBlockedAccountError(err)) {
        navigate('/account-blocked', { replace: true });
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
      setIsLoading(false);
    }
  };

  if (isLoading) return <Loader text={isForgotPassword ? 'Sending reset link...' : 'Opening owner dashboard...'} />;

  return (
    <AuthLayout
      className="auth-layout--owner-login"
      title={isForgotPassword ? 'Reset Your Password' : 'Owner Portal'}
      subtitle={isForgotPassword ? "We'll send you a secure reset link." : 'Manage your restaurant, orders, and reservations.'}
    >
      <div className="auth-form-header">
        <Store size={32} className="auth-form-icon" />
        <h3>{isForgotPassword ? 'Forgot Password' : 'Partner Login'}</h3>
        <p>{isForgotPassword ? 'Enter your email to receive a reset link' : 'Access your restaurant dashboard'}</p>
      </div>

      {!oauthAccountBlocked && (error || oauthError) && <p role="alert" className="auth-form-error">{error || oauthError}</p>}
      {applicationStatus === 'pending' && <p role="status" className="auth-form-success">Your email is verified. The restaurant application is awaiting administrator approval.</p>}
      {forgotMessage && <p role="status" aria-live="polite" className="auth-form-success" style={{ fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>{forgotMessage}</p>}

      {isForgotPassword ? (
        <form onSubmit={handleForgotPassword}>
          <div className="auth-input-group">
            <label htmlFor="owner-reset-email">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="owner-reset-email"
                type="email"
                className="auth-input"
                placeholder="owner@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
          <Button variant="primary" className="auth-submit-btn" type="submit" disabled={isLoading}>
            Send Reset Link
          </Button>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setError(''); setForgotMessage(''); }}
              className="auth-forgot-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Back to Sign In
            </button>
          </div>
        </form>
      ) : <>
      <form onSubmit={handleLogin}>
        <div className="auth-input-group">
          <label>Email</label>
          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-input-icon" />
            <input
              type="email"
              className="auth-input"
              placeholder="owner@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>
        <div className="auth-input-group">
          <label>Password</label>
          <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setForgotMessage(''); }} className="auth-forgot-link" style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right' }}>
            Forgot password?
          </button>
          <div className="auth-input-wrapper">
            <Lock size={18} className="auth-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-input-action"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
        </div>
        <AuthAccountSwitcher accountType="owner" />
        <Button variant="primary" className="auth-submit-btn" type="submit">
          <LogIn size={18} style={{ marginRight: 8 }} />
          Sign In as Owner
        </Button>
      </form>

      <div className="auth-footer" style={{ justifyContent: 'center', marginTop: '1.5rem', gap: '0.5rem' }}>
        <span>Not a partner yet?</span>
        <Link to="/register-restaurant" className="auth-footer-link" style={{ color: 'var(--primary)' }}>
          Register Restaurant
        </Link>
      </div>
      </>}
    </AuthLayout>
  );
};

export default OwnerLogin;
