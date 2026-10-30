import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import { authApi } from "../services/api";
import img1 from "../assets/images/restaurant_interior.webp";
import "./auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgot({ email });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image={img1}
      title="Reset Your Password"
      subtitle="We'll send you a secure reset link"
    >
      <div className="auth-form-wrapper">
        <div className="auth-form-header">
          <h2 className="auth-title">Forgot Password?</h2>
          <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>
        </div>

        {/* Plain conditional render — the old AnimatePresence mode="wait" swap
            could stick on the exiting form (framer-motion 12), leaving the
            button frozen on "Sending Reset Link..." forever. */}
        {sent ? (
          <motion.div
            key="success"
            className="auth-success-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
              <div className="success-icon-ring">
                <CheckCircle size={40} />
              </div>
              <h3>Check Your Email!</h3>
              <p>We've sent a password reset link to <strong>{email}</strong></p>
              <p className="success-hint">Didn't receive it? Check your spam folder or try again in a few minutes.</p>
              <div className="success-actions">
                <button
                  className="auth-secondary-btn"
                  onClick={() => { setSent(false); setEmail(''); }}
                >
                  Try another email
                </button>
                <Link to="/login" className="auth-submit-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  Back to Login
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="auth-error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon-left" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="auth-input"
                      id="forgot-email"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={loading}
                  id="forgot-submit"
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner" />
                      Sending Reset Link...
                    </span>
                  ) : 'Send Reset Link'}
                </motion.button>

                <Link to="/login" className="auth-back-link">
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </form>
            </motion.div>
          )}
      </div>
    </AuthLayout>
  );
}
