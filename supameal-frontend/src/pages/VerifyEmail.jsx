import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';

export default function VerifyEmail() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        padding: '44px 40px',
        borderRadius: 20,
        boxShadow: '0 20px 45px rgba(0,0,0,0.1)',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 10px 25px rgba(6,182,212,0.3)',
        }}>
          <Mail size={28} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
          Verify your email
        </h1>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>
          We've sent a verification code to the email address you registered with. Check your inbox and enter the code to complete your signup.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              color: '#fff',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 8px 18px rgba(6,182,212,0.28)',
            }}
          >
            <KeyRound size={16} />
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: '#fff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
        <div style={{ marginTop: 28, padding: 16, background: '#f8fafc', borderRadius: 12, textAlign: 'left', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#0f172a' }}>Troubleshooting</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Check your spam or junk folder</li>
            <li>Wait a few minutes for delivery</li>
            <li>Return to the OTP screen if you already received a code</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
