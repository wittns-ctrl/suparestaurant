import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Plus, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bookingsApi } from '../../services/api';
import ConfirmDialog from '../../components/ConfirmDialog';

const STATUS_STYLE = {
  confirmed: { bg: '#dcfce7', color: '#166534' },
  pending: { bg: '#fef3c7', color: '#92400e' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
};

export default function ReservationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      // The backend scopes customers to their own bookings automatically
      const data = await bookingsApi.list({ view: 'customer' });
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await bookingsApi.cancel(cancelTarget.id);
      setReservations((prev) => prev.filter((r) => r.id !== cancelTarget.id));
      showToast(`Reservation at ${cancelTarget.restaurant} cancelled`, 'success');
      setCancelTarget(null);
    } catch (err) {
      showToast(err.message || 'Cancellation failed', 'error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      color: '#111827',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f97316', fontWeight: 700, fontSize: 14 }}>
              <CalendarCheck size={18} />
              Reservations
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 4px' }}>My Table Bookings</h1>
            <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>
              {user ? `Welcome back, ${user.name || user.email}` : 'Manage and track all your restaurant reservations.'}
            </p>
          </div>
          <Link
            to="/customer/dashboard?tab=book-table"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 18px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 8px 18px rgba(249,115,22,0.28)',
            }}
          >
            <Plus size={16} />
            New Booking
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard label="Upcoming" value={reservations.length} color="#2563eb" />
          <StatCard label="Confirmed" value={reservations.filter(r => r.status === 'confirmed').length} color="#16a34a" />
          <StatCard label="Pending" value={reservations.filter(r => r.status === 'pending').length} color="#d97706" />
          <StatCard label="Guests this month" value={reservations.reduce((s, r) => s + r.guests, 0)} color="#db2777" />
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Upcoming Reservations</h2>
            <Link
              to="/customer/dashboard"
              style={{ fontSize: 13, fontWeight: 600, color: '#f97316', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
            >
              Dashboard <ChevronRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
              <p style={{ margin: 0 }}>Loading your reservations…</p>
            </div>
          ) : loadError ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#b91c1c' }}>
              <p style={{ margin: '0 0 12px' }}>{loadError}</p>
              <button
                onClick={load}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
                  background: '#f97316', border: 'none', borderRadius: 8, cursor: 'pointer',
                }}
              >Try again</button>
            </div>
          ) : reservations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
              <CalendarCheck size={40} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <p style={{ margin: 0 }}>No reservations yet. Book a table to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reservations.map((r) => {
                const s = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 16,
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: '#fff7ed', color: '#c2410c',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Calendar size={20} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{r.restaurant}</h3>
                          <span style={{
                            padding: '2px 10px',
                            background: s.bg,
                            color: s.color,
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 999,
                            textTransform: 'capitalize',
                          }}>{r.status}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#6b7280', fontSize: 13 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {r.date}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {r.time}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>👥 {r.guests} guests</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {r.address}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link
                        to="/customer/dashboard"
                        style={{
                          padding: '8px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#2563eb',
                          background: '#eff6ff',
                          borderRadius: 8,
                          textDecoration: 'none',
                        }}
                      >View</Link>
                      <button
                        onClick={() => setCancelTarget(r)}
                        style={{
                          padding: '8px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#b91c1c',
                          background: '#fef2f2',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >Cancel</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this reservation?"
          description={`Your reservation at ${cancelTarget.restaurant} on ${cancelTarget.date} at ${cancelTarget.time} will be cancelled.`}
          confirmLabel="Cancel reservation"
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: 18,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
