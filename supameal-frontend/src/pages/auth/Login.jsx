import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button/Button';
import Loader from '../../components/Loader/Loader';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { homeForUser, userHasRole } from '../../utils/auth';
import AuthAccountSwitcher from './AuthAccountSwitcher';
import { isBlockedAccountError } from './BlockedAccountPage';
import './AuthForm.css';

const Login = ({ accountType = 'customer' }) => {
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { loginWithCredentials, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      // URLSearchParams.get() already percent-decodes (and maps "+" to a space).
      // Decoding a second time threw a URIError for any message containing a
      // literal "%", which blanked the whole login page.
      const message = oauthError;
      if (isBlockedAccountError(message)) {
        navigate('/account-blocked', { replace: true });
        setError('');
      } else {
        setError(message);
      }
    }
  }, [searchParams, navigate]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    if (!email.trim()) {
      setError('Please enter your email to reset your password.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgot({ email: email.trim() }, accountType);
      setForgotMessage(res.message || 'Reset link sent to your email. Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password to sign in.');
      return;
    }
    setLoading(true);
    try {
      const user = await loginWithCredentials(email.trim(), password, accountType);
      if (returnTo === '/register-restaurant' && accountType === 'customer' && userHasRole(user, 'customer')) {
        navigate('/register-restaurant', { replace: true });
        return;
      }
      if (location.state?.from === '/book-table' && accountType === 'customer') {
        navigate('/book-table', { replace: true, state: location.state.fromState || null });
        return;
      }
      navigate(homeForUser(user), { replace: true });
    } catch (err) {
      if (isBlockedAccountError(err)) {
        navigate('/account-blocked', { replace: true });
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (returnTo === '/register-restaurant') {
      sessionStorage.setItem('oauthReturnTo', '/register-restaurant');
    } else {
      sessionStorage.removeItem('oauthReturnTo');
    }
    loginWithGoogle();
  };

  if (loading) return <Loader text="Signing you in..." />;

  return (
    <AuthLayout
      title={isForgotPassword ? "Reset Your Password" : accountType === 'admin' ? 'Administrator Sign In' : 'Welcome back to SupaMeal'}
      subtitle={isForgotPassword ? "We'll send you a secure reset link." : accountType === 'admin' ? 'Sign in to manage SupaMeal.' : 'Sign in to your customer account.'}
    >
      <div className="auth-form-header">
        <LogIn size={32} className="auth-form-icon" style={{ color: 'var(--primary)' }} />
        <h3>{isForgotPassword ? "Forgot Password" : "Sign In"}</h3>
        <p>{isForgotPassword ? "Enter your email to receive a reset link" : accountType === 'admin' ? 'Administrator access only' : 'Sign in to your customer account'}</p>
      </div>

      {error && <p role="alert" className="auth-form-error">{error}</p>}
      {forgotMessage && <p role="status" aria-live="polite" className="auth-form-success" style={{ fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>{forgotMessage}</p>}

      {isForgotPassword ? (
        <form onSubmit={handleForgotPassword}>
          <div className="auth-input-group">
            <label htmlFor="login-reset-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="login-reset-email"
                type="email"
                placeholder="you@example.com"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
          <Button variant="primary" className="auth-submit-btn" type="submit" disabled={loading}>
            Send Reset Link
          </Button>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setForgotMessage(''); }} className="auth-forgot-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
              Back to Sign In
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSignIn}>
          <div className="auth-input-group">
            <label htmlFor="login-email">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="login-password">Password</label>
            <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); }} className="auth-forgot-link" style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right' }}>
              Forgot password?
            </button>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-input-action"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <AuthAccountSwitcher accountType={accountType} />
          <Button variant="primary" className="auth-submit-btn" type="submit" disabled={loading}>
            <LogIn size={18} style={{ marginRight: '8px' }} />
            {accountType === 'admin' ? 'Sign In as Administrator' : 'Sign In as Customer'}
          </Button>
        </form>
      )}

      {accountType === 'customer' && <>
        <div className="auth-form-divider"><span>OR</span></div>
        <button type="button" className="auth-social-btn" onClick={handleGoogleLogin}>
          <FaGoogle /> Continue with Google
        </button>
      </>}

      {accountType === 'customer' && <div className="auth-footer" style={{ justifyContent: 'center', gap: '0.4rem', marginTop: '1rem' }}>
        <span>Don’t have an account?</span>
        <Link to="/signup" className="auth-footer-link">Sign up</Link>
      </div>}


    </AuthLayout>
  );
};

export default Login;
