import { model } from 'mongoose';
import { bookingschema } from './schema/bookings.schema';

describe('bookings schema', () => {
  const Booking = model('bookings_schema_probe', bookingschema);
  const base = () => ({
    customerId: '507f1f77bcf86cd799439011',
    restaurantId: '507f1f77bcf86cd799439012',
    bookingDate: new Date(),
    bookingTime: '19:00',
    guests: 2,
    status: 'pending',
  });

  it('accepts an empty special request (the web app sends "" by default)', () => {
    const doc = new Booking({ ...base(), specialRequest: '' });
    expect(doc.validateSync()).toBeUndefined();
  });

  it('accepts a booking with no special request at all', () => {
    const doc = new Booking(base());
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.get('specialRequest')).toBe('');
  });
});
