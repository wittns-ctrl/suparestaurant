import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MessageSquare, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { restaurantsApi, bookingsApi } from '../../services/api';
import './dashboard.css';

const BookTableDash = ({ setActiveTab, initialRestaurantId, initialBookingDate = '', initialBookingTime = '', initialGuests = 2 }) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantError, setRestaurantError] = useState('');
  const [form, setForm] = useState({
    restaurantId: initialRestaurantId || '',
    date: initialBookingDate,
    time: initialBookingTime,
    guests: Number(initialGuests) || 2,
    specialRequest: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    restaurantsApi.list()
      .then((result) => setRestaurants(Array.isArray(result) ? result : result?.data || []))
      .catch((error) => setRestaurantError(error.message || 'Could not load restaurants. Please try again.'));
  }, []);

  const toDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const minDate = toDateString(new Date());
  const maxDate = toDateString(new Date(new Date().setDate(new Date().getDate() + 90)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id || !form.restaurantId || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await bookingsApi.create({
        customerId: user.id,
        restaurantId: form.restaurantId,
        bookingDate: form.date,
        bookingTime: form.time,
        guests: Number(form.guests),
        specialRequest: form.specialRequest || '',
      });
      setSubmitted(true);
    } catch (err) {
      const message = String(err.message || '');
      if (/fully booked|no availability/i.test(message)) {
        setSubmitError('No reservation was made. This restaurant is fully booked for the selected date. Please choose another date.');
      } else if (/exceeds restaurant capacity|party size.*capacity/i.test(message)) {
        setSubmitError('No reservation was made. Your party is larger than this restaurant’s seating capacity. Please choose a smaller group.');
      } else {
        setSubmitError(message || 'Booking failed — please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Book a Table</h1>
        <p>Reserve your perfect dining experience in seconds.</p>
      </div>

      {submitted ? (
        <div className="dash-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <CheckCircle size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'var(--text-main)', marginBottom: '0.75rem' }}>Booking Request Sent!</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 2rem' }}>
            Your table reservation request has been submitted. You'll receive a confirmation once the restaurant approves it.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="dash-btn-primary" onClick={() => setSubmitted(false)}>
              Make Another Booking
            </button>
            <button className="dash-btn-outline" onClick={() => setActiveTab('bookings')}>
              View Bookings
            </button>
          </div>
        </div>
      ) : (
        <div className="dash-grid-sidebar">
          <div className="dash-panel">
            <h3 style={{ color: 'var(--text-main)', marginBottom: '1.75rem', fontWeight: 600 }}>Reservation Details</h3>
            <form onSubmit={handleSubmit}>
              <div className="dash-form-group">
                <label htmlFor="booking-restaurant">Restaurant</label>
                <select id="booking-restaurant" className="dash-input" required value={form.restaurantId} onChange={e => setForm(p => ({ ...p, restaurantId: e.target.value }))}>
                  <option value="">Select restaurant</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="form-row">
                <div className="dash-form-group">
                  <label htmlFor="booking-date"><Calendar size={14} style={{marginRight:6}} />Date</label>
                  <input id="booking-date" className="dash-input" type="date" min={minDate} max={maxDate} required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="dash-form-group">
                  <label htmlFor="booking-time"><Clock size={14} style={{marginRight:6}} />Time</label>
                  <input id="booking-time" className="dash-input" type="time" required value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>

              <div className="dash-form-group">
                <label htmlFor="booking-guests"><Users size={14} style={{marginRight:6}} />Number of Guests</label>
                <select id="booking-guests" className="dash-input" required value={form.guests} onChange={e => setForm(p => ({ ...p, guests: Number(e.target.value) }))}>
                  {Array.from({ length: 50 }, (_, index) => index + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>

              <div className="dash-form-group">
                <label htmlFor="booking-special-request"><MessageSquare size={14} style={{marginRight:6}} />Special Requirements (Optional)</label>
                <textarea
                  id="booking-special-request"
                  className="dash-input"
                  rows={4}
                  placeholder="E.g. Anniversary dinner, dietary restrictions, wheelchair access..."
                  style={{ resize: 'vertical' }}
                  value={form.specialRequest}
                  onChange={e => setForm(p => ({ ...p, specialRequest: e.target.value }))}
                />
              </div>

              {submitError && (
                <p role="alert" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>{submitError}</p>
              )}
              {restaurantError && <p role="alert" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>{restaurantError}</p>}
              <button className="dash-btn-primary" type="submit" disabled={submitting} style={{ width: '100%', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Sending…' : 'Confirm Reservation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BookTableDash;
