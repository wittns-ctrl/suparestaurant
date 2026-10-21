import { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, XCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bookingsApi } from '../../services/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import ModifyBookingModal from '../../components/ModifyBookingModal';
import './dashboard.css';

const BookingCard = ({ booking, status, onCancel, onModify, onDeleteHistory }) => {
  const bookingStatus = booking.backendStatus || booking.status || status;
  const canManage = ['confirmed', 'pending'].includes(bookingStatus);
  return (
  <div className="list-row" style={{ alignItems: 'flex-start', padding: '1.25rem 0' }}>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div className="list-row-title">{booking.restaurant}</div>
        <span className={`status-badge status-${bookingStatus}`}>{bookingStatus.charAt(0).toUpperCase() + bookingStatus.slice(1)}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={14} /> {booking.date} · {booking.time}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Users size={14} /> {booking.guests} Guests</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MapPin size={14} /> {booking.address}</span>
      </div>
      {booking.reason && (
        <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', fontSize: '0.83rem' }}>
          <XCircle size={14} /> {booking.reason}
        </div>
      )}
    </div>
    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
      {canManage && (
        <button
          className="dash-btn-outline"
          style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
          onClick={() => onModify(booking)}
        >
          Modify
        </button>
      )}
      {canManage && (
        <button className="dash-btn-danger" onClick={() => onCancel(booking)}>
          Cancel
        </button>
      )}
      {status === 'history' && (
        <button className="dash-btn-outline" style={{ color: 'var(--error)' }} onClick={() => onDeleteHistory(booking)}>
          <Trash2 size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />Delete
        </button>
      )}
    </div>
  </div>
  );
};

const MyBookings = () => {
  const [tab, setTab] = useState('confirmed');
  const [bookings, setBookings] = useState({ confirmed: [], pending: [], history: [] });
  const [modifyingBooking, setModifyingBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const loadBookings = async () => {
    if (!user?.id) return;
    try {
      const data = await bookingsApi.list({ customerId: user.id, view: 'customer' });
      const grouped = { confirmed: [], pending: [], history: [] };
      data.forEach(b => {
        const rawStatus = b.backendStatus || b.status;
        const key = ['rejected', 'cancelled', 'completed'].includes(rawStatus)
          ? 'history'
          : rawStatus === 'pending' ? 'pending' : 'confirmed';
        grouped[key].push(b);
      });
      setBookings(grouped);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadBookings(); }, [user?.id]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await bookingsApi.cancel(cancelTarget.id);
      showToast(`Booking at ${cancelTarget.restaurant} cancelled.`);
      setCancelTarget(null);
      await loadBookings();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not cancel booking — please try again.', 'error');
    }
  };

  const handleDeleteHistory = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await bookingsApi.removeFromHistory(deleteTarget.id);
      setBookings((previous) => ({
        ...previous,
        history: previous.history.filter((booking) => booking.id !== deleteTarget.id),
      }));
      showToast('Booking removed from your history.', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || 'Could not remove this booking from your history.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const counts = {
    confirmed: bookings.confirmed.length,
    pending: bookings.pending.length,
    history: bookings.history.length,
  };

  return (
    <>
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>Track and manage all your table reservations.</p>
      </div>

      <div className="dash-panel">
        <div className="tab-bar">
          {['confirmed', 'pending', 'history'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'history' ? 'History' : t.charAt(0).toUpperCase() + t.slice(1)}
              <span style={{ marginLeft: '0.5rem', background: tab === t ? 'var(--dash-accent)' : 'rgba(255,255,255,0.1)', color: tab === t ? '#000' : 'var(--dash-muted, #8a8a8a)', borderRadius: '10px', padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>

        {bookings[tab].length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>No {tab} bookings found.</p>
          </div>
        ) : (
          bookings[tab].map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              status={tab}
              onCancel={setCancelTarget}
              onModify={(bookingToEdit) => setModifyingBooking(bookingToEdit)}
              onDeleteHistory={setDeleteTarget}
            />
          ))
        )}
      </div>

      {modifyingBooking && (
        <ModifyBookingModal
          booking={modifyingBooking}
          onClose={() => setModifyingBooking(null)}
          onUpdated={loadBookings}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this booking?"
          description={`Your booking at ${cancelTarget.restaurant} on ${cancelTarget.date} at ${cancelTarget.time} will be cancelled.`}
          confirmLabel="Cancel booking"
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this booking from your history?"
          description={`Your booking at ${deleteTarget.restaurant} on ${deleteTarget.date} at ${deleteTarget.time} will be removed from your history.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete booking'}
          Icon={Trash2}
          tone="danger"
          confirmDisabled={deleting}
          onConfirm={handleDeleteHistory}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default MyBookings;
