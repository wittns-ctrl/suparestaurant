import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button/Button';
import { authApi } from '../../services/api';
import './AuthForm.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const requestedAccountType = searchParams.get('accountType');
  const accountType = ['customer', 'owner', 'admin'].includes(requestedAccountType) ? requestedAccountType : 'customer';
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await authApi.forgot({ email: email.trim() }, accountType);
      setMessage(res.message || 'Reset link sent to your email. Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 15 || newPassword.length > 72) {
      setError('Password must be between 15 and 72 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.reset({ token, newPassword }, accountType);
      setMessage(res.message || 'Password reset successfully. You can sign in now.');
      const loginPath = accountType === 'owner' ? '/owner-login' : accountType === 'admin' ? '/admin-login' : '/login';
      setTimeout(() => navigate(loginPath, { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title={token ? 'Set New Password' : 'Forgot Password?'} 
      subtitle={token ? 'Enter your new password below.' : "Don't worry, we'll send you reset instructions."}
    >
      <div className="auth-form-header">
        <KeyRound size={32} className="auth-form-icon" style={{ color: 'var(--primary)' }} />
        <h3>{token ? 'Reset Password' : 'Forgot Password'}</h3>
        <p>{token ? 'Choose a strong new password' : 'Enter your email to receive a reset link'}</p>
      </div>

      {message && <p className="auth-form-success">{message}</p>}
      {error && <p className="auth-form-error">{error}</p>}

      <form onSubmit={token ? handleReset : handleForgot}>
        {!token ? (
          <div className="auth-input-group">
            <label>Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                placeholder="john@example.com"
                className="auth-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="auth-input-group">
              <label>New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  className="auth-input"
                  required
                  minLength={15}
                  maxLength={72}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-describedby="reset-password-rules"
                />
                <button
                  type="button"
                  className="auth-input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <small id="reset-password-rules">Use at least 15 characters. Passphrases and password managers are supported.</small>
            </div>
            <div className="auth-input-group">
              <label>Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  className="auth-input"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-input-action"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
          </>
        )}

        <Button variant="primary" className="auth-submit-btn" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : token ? 'Reset Password' : 'Send Reset Link'}
        </Button>
      </form>

      <div className="auth-footer" style={{ justifyContent: 'center', marginTop: '2rem' }}>
        <Link to="/login" className="auth-footer-link" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
