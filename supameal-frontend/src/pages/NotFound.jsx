import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        padding: '48px 40px',
        borderRadius: 20,
        boxShadow: '0 20px 45px rgba(0,0,0,0.1)',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #f97316, #dc2626)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
          lineHeight: 1,
        }}>
          404
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 8px', color: '#111827' }}>
          Page not found
        </h1>
        <p style={{ color: '#6b7280', fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 8px 18px rgba(249,115,22,0.28)',
            }}
          >
            <Home size={16} />
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
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
            Go Back
          </button>
        </div>
        <div style={{ marginTop: 32, borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 12px' }}>Or try these pages:</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/restaurants" style={{ color: '#f97316', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Compass size={14} /> Restaurants
            </Link>
            <Link to="/login" style={{ color: '#2563eb', fontSize: 14, fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
