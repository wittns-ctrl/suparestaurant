import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ordersApi, paymentsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PaypalCheckout from '../../components/PaypalCheckout';
import './dashboard.css';

const TIME_SLOTS = ['ASAP (25-35 min)', '12:00 PM', '12:30 PM', '1:00 PM', '7:00 PM', '7:30 PM', '8:00 PM'];

const validateDeliveryAddress = (address) => {
  const errors = {};
  const street = address.street.trim();
  const apartment = address.apartment.trim();
  const city = address.city.trim();
  const postalCode = address.postalCode.trim();
  const phone = address.phone.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (street.length < 2 || street.length > 200 || !/^[\p{L}\p{N}][\p{L}\p{N}\s,.'#+/-]{1,199}$/u.test(street)) {
    errors.street = 'Enter a valid street address.';
  }
  if (apartment.length > 50) errors.apartment = 'Apartment or suite must be 50 characters or fewer.';
  if (city.length < 2 || city.length > 100 || !/^[\p{L}\p{N}][\p{L}\p{N}\s.'-]{1,99}$/u.test(city)) {
    errors.city = 'Enter a valid city.';
  }
  if (postalCode.length < 2 || postalCode.length > 20 || !/^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(postalCode)) {
    errors.postalCode = 'Enter a valid postal code.';
  }
  if (!/^\+?[0-9][0-9\s().-]{6,18}$/.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.phone = 'Enter a valid phone number with 8 to 15 digits.';
  }
  if (address.instructions.trim().length > 300) {
    errors.instructions = 'Instructions must be 300 characters or fewer.';
  }
  return errors;
};

const CheckoutPage = ({ setActiveTab }) => {
  const navigate = useNavigate();
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [placed, setPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(''); // display code (last 4)
  const [placedOrderDbId, setPlacedOrderDbId] = useState('');
  const [address, setAddress] = useState({ street: '', apartment: '', city: '', postalCode: '', phone: '', instructions: '' });
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const [paymentState, setPaymentState] = useState('idle');
  // PayPal order awaiting buyer approval and server-side capture.
  const [pendingPayment, setPendingPayment] = useState(null);
  const { cartItems, subtotal, clearCart, selectedRestaurantId } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  // navigate() fallback when rendered from the router without a tab setter.
  const go = (tab, path, ...rest) => (setActiveTab ? setActiveTab(tab, ...rest) : navigate(path));

  const delivery = cartItems.length > 0 ? 3.99 : 0;
  const addressErrors = validateDeliveryAddress(address);
  const total = subtotal + delivery;

  const handlePlaceOrder = async () => {
    if (!user?.id || !selectedRestaurantId) return;
    setShowAddressErrors(true);
    if (Object.keys(validateDeliveryAddress(address)).length > 0) {
      showToast('Please correct the delivery details before placing your order.', 'error');
      return;
    }

    setPaymentState('creating');
    try {
      await paymentsApi.paypalConfig();
      const order = pendingPayment?.localOrderId
        ? { id: pendingPayment.localOrderId }
        : await ordersApi.create({
          customerId: user.id,
          restaurantId: selectedRestaurantId,
          items: cartItems.map(i => ({ menuItemId: i.id, qty: i.qty })),
          deliveryAddress: Object.fromEntries(Object.entries(address).map(([key, value]) => [key, value.trim()])),
          timeSlot,
        });

      setPaymentState('intent');
      // C2: must be the real ObjectId (order.id) — order.orderId is a cosmetic
      // last-4 display code the payment API would reject with 400.
      setPendingPayment((current) => ({
        ...current,
        localOrderId: order.id,
      }));
      const payment = await paymentsApi.createPaypalOrder(order.id);
      setPendingPayment({
        paypalOrderId: payment.paypalOrderId,
        clientId: payment.clientId,
        currency: payment.currency,
        localOrderId: order.id,
      });
      setPaymentState('awaiting_approval');
    } catch (err) {
      console.error(err);
      setPaymentState('idle');
      showToast(err.message || 'Failed to place order', 'error');
    }
  };

  // PayPal approval is followed by a server-side capture; client approval alone never marks an order paid.
  const handlePaypalSuccess = useCallback(async (paypalOrderId) => {
    const approvedOrderId = paypalOrderId || pendingPayment?.paypalOrderId;
    if (!approvedOrderId) {
      showToast('PayPal approved the payment but did not return an order reference.', 'error');
      return;
    }
    try {
      setPaymentState('confirming');
      const capture = await paymentsApi.capturePaypalOrder(approvedOrderId);
      if (!capture.success) throw new Error('PayPal payment capture was not completed.');
      setPlacedOrderDbId(pendingPayment?.localOrderId || capture.orderId || '');
      setPlacedOrderId(String(pendingPayment?.localOrderId || capture.orderId || '').slice(-4));
      setPlaced(true);
      setPaymentState('paid');
      setPendingPayment(null);
      clearCart();
      showToast('Order placed successfully!', 'success');
    } catch (err) {
      console.error(err);
      setPaymentState('awaiting_approval');
      showToast(err.message || 'Could not finalize your order after payment', 'error');
    }
  }, [pendingPayment, showToast, clearCart]);

  const handlePaypalError = useCallback((error) => {
    showToast(error || 'PayPal payment failed. Please try again.', 'error');
  }, [showToast]);

  const handlePaypalCancel = useCallback(() => {
    showToast('PayPal checkout was cancelled. You can try again when ready.', 'error');
  }, [showToast]);

  if (placed) {
    return (
      <>
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <CheckCircle size={80} color="var(--dash-accent)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'var(--dash-text, #fff)', fontSize: '2rem', marginBottom: '0.75rem' }}>Order Placed!</h2>
          <p style={{ color: 'var(--dash-muted, #8a8a8a)', maxWidth: 400, margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Your order <strong style={{ color: 'var(--dash-accent)' }}>#{placedOrderId}</strong> has been confirmed. Estimated delivery: 25–35 minutes.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="dash-btn-primary" onClick={() => go('order-tracking', `/order-tracking/${placedOrderDbId}`, placedOrderDbId)}>Track Order</button>
            <button className="dash-btn-outline" onClick={() => go('orders', '/customer/dashboard?tab=orders')}>View My Orders</button>
            <button className="dash-btn-outline" onClick={() => go('overview', '/customer/dashboard')}>Back to Dashboard</button>
          </div>
        </div>
      </>
    );
  }

  // PayPal checkout panel — shown while the user approves the payment
  if (pendingPayment && paymentState === 'awaiting_approval') {
    return (
      <>
        <div className="page-header">
          <h1>Complete Payment</h1>
          <p>Approve the payment in PayPal to place your order.</p>
        </div>
        <div className="dash-panel" style={{ maxWidth: 520, margin: '0 auto' }}>
          <PaypalCheckout
            clientId={pendingPayment.clientId}
            currency={pendingPayment.currency}
            paypalOrderId={pendingPayment.paypalOrderId}
            onApprove={handlePaypalSuccess}
            onError={handlePaypalError}
            onCancel={handlePaypalCancel}
          />
        </div>
      </>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1>Checkout</h1>
          <p>Complete your order details below.</p>
        </div>
        <div className="dash-panel empty-state">
          <p>Your cart is empty. Add items before checking out.</p>
          <button className="dash-btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => go('menu', '/customer/dashboard')}>Browse Menu</button>
        </div>
      </>
    );
  }

  const isPaying = paymentState !== 'idle';

  return (
    <>
      <div className="page-header">
        <h1>Checkout</h1>
        <p>Enter your delivery address and preferred delivery time.</p>
      </div>

      <div className="dash-grid-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="dash-panel" style={{ marginBottom: 0 }}>
            <h3 style={{ color: 'var(--dash-text, #fff)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MapPin size={20} color="var(--dash-accent)" /> Delivery Address
            </h3>
            <div className="form-row">
              <div className="dash-form-group">
                <label htmlFor="delivery-street">Street Address *</label>
                <input id="delivery-street" className="dash-input" autoComplete="street-address" maxLength={200} required placeholder="123 Main Street" value={address.street} aria-invalid={showAddressErrors && Boolean(addressErrors.street)} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} />
                {showAddressErrors && addressErrors.street && <small role="alert" className="form-error">{addressErrors.street}</small>}
              </div>
              <div className="dash-form-group">
                <label htmlFor="delivery-apartment">Apartment / Suite</label>
                <input id="delivery-apartment" className="dash-input" autoComplete="address-line2" maxLength={50} placeholder="Apt 4B (optional)" value={address.apartment} aria-invalid={showAddressErrors && Boolean(addressErrors.apartment)} onChange={e => setAddress(p => ({ ...p, apartment: e.target.value }))} />
                {showAddressErrors && addressErrors.apartment && <small role="alert" className="form-error">{addressErrors.apartment}</small>}
              </div>
            </div>
            <div className="form-row">
              <div className="dash-form-group">
                <label htmlFor="delivery-city">City *</label>
                <input id="delivery-city" className="dash-input" autoComplete="address-level2" maxLength={100} required placeholder="Your City" value={address.city} aria-invalid={showAddressErrors && Boolean(addressErrors.city)} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} />
                {showAddressErrors && addressErrors.city && <small role="alert" className="form-error">{addressErrors.city}</small>}
              </div>
              <div className="dash-form-group">
                <label htmlFor="delivery-postal-code">Postal Code *</label>
                <input id="delivery-postal-code" className="dash-input" autoComplete="postal-code" maxLength={20} required placeholder="12345" value={address.postalCode} aria-invalid={showAddressErrors && Boolean(addressErrors.postalCode)} onChange={e => setAddress(p => ({ ...p, postalCode: e.target.value }))} />
                {showAddressErrors && addressErrors.postalCode && <small role="alert" className="form-error">{addressErrors.postalCode}</small>}
              </div>
            </div>
            <div className="dash-form-group">
              <label htmlFor="delivery-phone">Phone Number *</label>
              <input id="delivery-phone" className="dash-input" type="tel" autoComplete="tel" inputMode="tel" maxLength={24} required placeholder="+250 78 000 0000" value={address.phone} aria-invalid={showAddressErrors && Boolean(addressErrors.phone)} onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))} />
              {showAddressErrors && addressErrors.phone && <small role="alert" className="form-error">{addressErrors.phone}</small>}
            </div>
            <div className="dash-form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="delivery-instructions">Delivery Instructions (Optional)</label>
              <input id="delivery-instructions" className="dash-input" maxLength={300} placeholder="Leave at door, ring bell, etc." value={address.instructions} aria-invalid={showAddressErrors && Boolean(addressErrors.instructions)} onChange={e => setAddress(p => ({ ...p, instructions: e.target.value }))} />
              {showAddressErrors && addressErrors.instructions && <small role="alert" className="form-error">{addressErrors.instructions}</small>}
            </div>
          </div>

          <div className="dash-panel" style={{ marginBottom: 0 }}>
            <h3 style={{ color: 'var(--dash-text, #fff)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={20} color="var(--dash-accent)" /> Delivery Time
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {TIME_SLOTS.map(slot => (
                <button key={slot} type="button" onClick={() => setTimeSlot(slot)} className={`category-pill ${timeSlot === slot ? 'active' : ''}`}>
                  {slot}
                </button>
              ))}
            </div>
          </div>

        </div>
        <div>
          <div className="dash-panel" style={{ position: 'sticky', top: 88 }}>
            <h3 style={{ color: 'var(--dash-text, #fff)', marginBottom: '1.25rem' }}>Order Summary</h3>
            {cartItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem', color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.88rem' }}>
                <span>{item.emoji} {item.name} ×{item.qty}</span>
                <span>${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '1rem 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.88rem' }}>
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.88rem' }}>
                <span>Delivery Fee</span><span>${delivery.toFixed(2)}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dash-text, #fff)', fontWeight: 700, fontSize: '1.1rem' }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
            <button className="dash-btn-primary" style={{ width: '100%', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={handlePlaceOrder} disabled={isPaying}>
              {isPaying
                ? (<><Loader2 size={18} className="animate-spin" />
                  {paymentState === 'creating' ? 'Creating order…'
                    : paymentState === 'intent' ? 'Connecting to PayPal…'
                    : paymentState === 'confirming' || paymentState === 'awaiting_approval' ? 'Waiting for PayPal…'
                    : 'Processing…'}</>)
                : (<><CreditCard size={18} />Place Order • ${total.toFixed(2)}</>)}
            </button>
            <p style={{ color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.75rem' }}>
              Secure payment processed via PayPal
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;
