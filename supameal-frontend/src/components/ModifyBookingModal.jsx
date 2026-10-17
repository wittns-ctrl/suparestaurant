import { useState } from 'react';
import { Calendar, Clock, Users, MessageSquare, X, Loader2 } from 'lucide-react';
import { bookingsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

const getIsoDateString = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }
  return '';
};

const ModifyBookingModal = ({ booking, onClose, onUpdated }) => {
  const [date, setDate] = useState(() => getIsoDateString(booking?.bookingDate) || '');
  const [time, setTime] = useState(booking?.time || '19:00');
  const [guests, setGuests] = useState(booking?.guests || 2);
  const [specialRequest, setSpecialRequest] = useState(booking?.specialRequest || '');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !time) {
      showToast('Please select a date and time.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await bookingsApi.update(booking.id, {
        bookingDate: date,
        bookingTime: time,
        guests: Number(guests),
        specialRequest: specialRequest.trim(),
      });
      showToast('Booking details updated successfully!', 'success');
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not update booking — please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#181818',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '2rem',
          width: '100%',
          maxWidth: 480,
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
          Modify Reservation
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {booking?.restaurant ? `Editing reservation at ${booking.restaurant}` : 'Update your reservation details'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <Calendar size={14} /> Date
              </label>
              <input
                className="dash-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10 }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <Clock size={14} /> Time
              </label>
              <input
                className="dash-input"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <Users size={14} /> Number of Guests
            </label>
            <select
              className="dash-input"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10 }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <MessageSquare size={14} /> Special Requests (Optional)
            </label>
            <textarea
              className="dash-input"
              rows={3}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="E.g. Window table, high chair, dietary restrictions..."
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="dash-btn-outline"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '0.65rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dash-btn-primary"
              disabled={submitting}
              style={{
                padding: '0.65rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModifyBookingModal;
