import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, MapPin, Truck, Radio, Package } from 'lucide-react';
import { useLiveOrderTracking } from '../../hooks/useLiveOrderTracking';
import { ordersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import './dashboard.css';
import './OrderTracking.css';

const formatTimelineTime = (value) => {
  if (!value) return '';
  // New timeline entries are ISO timestamps. Keep legacy display strings
  // readable while formatting those timestamps in the viewer's local zone.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const OrderTracking = ({ orderId: orderIdProp, setActiveTab }) => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Route mode (App.jsx passes no props) or embedded mode (prop)
  const orderId = orderIdProp || params.orderId;
  const go = (tab, path, ...rest) => (setActiveTab ? setActiveTab(tab, ...rest) : navigate(path));

  // Dashboard mode with no order chosen yet: offer the user's recent orders
  const [recentOrders, setRecentOrders] = useState([]);
  useEffect(() => {
    if (orderId) return;
    let alive = true;
    // Scope to the signed-in customer — a bare list() leaks every order on the platform
    ordersApi.list(user?.id ? { customerId: user.id, view: 'customer' } : { view: 'customer' })
      .then((data) => {
        if (alive) setRecentOrders(Array.isArray(data) ? data : data?.data || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [orderId, user?.id]);

  const { order, loading, loadFailed, live } = useLiveOrderTracking(orderId);

  // Embedded mode without a selected order — show a picker instead of an API
  // call against an undefined id (C4: previously a hardcoded mock '2452').
  if (!orderId) {
    return (
      <>
        <div className="page-header">
          <h1>Order Tracking</h1>
          <p>Select one of your recent orders to track it live.</p>
        </div>
        <div className="dash-panel">
          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <p>No orders to track yet — place an order first.</p>
              <button className="dash-btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => go('orders', '/customer/dashboard')}>
                View My Orders
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentOrders.slice(0, 8).map((o) => (
                <button
                  key={o.id}
                  onClick={() => go('order-tracking', `/order-tracking/${o.id}`, o.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.9rem 1.1rem', background: 'var(--dash-bg, #141414)', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>#{o.orderId || o.id?.slice(-4)} · {o.restaurant}</span>
                  <span style={{ color: 'var(--dash-accent)', fontWeight: 700 }}>{o.statusLabel || o.status}</span>
                </button>
              ))
              }
            </div>
          )}
        </div>
      </>
    );
  }

  if (loading) return <div className="page-header"><p>Loading order tracking...</p></div>;
  if (!order) {
    return (
      <div className="page-header">
        <p>{loadFailed ? 'Could not load this order — check your connection and try again.' : 'Order not found'}</p>
        {loadFailed && (
          <button className="dash-btn-outline" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>
            Retry
          </button>
        )}
      </div>
    );
  }

  const steps = order.timeline?.length ? order.timeline : [
    { key: 'placed', label: 'Order Placed', done: true, time: '—' },
    { key: 'preparing', label: 'Preparing', done: false },
    { key: 'on-way', label: 'Out for Delivery', done: false },
    { key: 'delivered', label: 'Delivered', done: false },
  ];

  const activeIndex = steps.findIndex(s => !s.done) - 1;

  return (
    <>
      <div className="page-header">
        <h1>Order Tracking</h1>
        <p>
          Live status timeline, ETA, and delivery updates for order #{order.orderId || orderId?.slice(-4)}.
        </p>
        <span
          title={live ? 'Connected — updates arrive instantly' : 'Reconnecting — polling every 15s'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: live ? 'var(--success)' : 'var(--dash-muted, #8a8a8a)',
            border: `1px solid ${live ? 'rgba(76,175,128,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 999,
            padding: '0.15rem 0.7rem',
            marginTop: '0.5rem',
          }}
        >
          <Radio size={13} className={live ? 'animate-spin' : ''} />
          {live ? 'LIVE' : 'RECONNECTING…'}
        </span>
      </div>

      <div className="dash-grid-sidebar">
        <div className="dash-panel" style={{ marginBottom: 0 }}>
          <div className="dash-panel-header">
            <h3>Status Timeline</h3>
            <span style={{ color: 'var(--dash-accent)', fontWeight: 600, fontSize: '0.88rem' }}>ETA: {order.eta}</span>
          </div>

          <div className="tracking-timeline">
            {steps.map((step, i) => {
              const isActive = i === activeIndex + 1 || (activeIndex === -1 && i === steps.length - 1 && step.done);
              return (
                <div key={step.key} className={`tracking-step ${step.done ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="tracking-step-line">
                    <div className={`tracking-dot ${isActive ? 'pulse' : ''}`}>
                      {step.done && !isActive && <CheckCircle size={16} color="#000" />}
                      {isActive && <Truck size={16} color="#000" />}
                    </div>
                    {i < steps.length - 1 && <div className="tracking-connector" />}
                  </div>
                  <div className="tracking-step-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="tracking-step-label">{step.label}</div>
                      </div>
                      <span className="tracking-time">{formatTimelineTime(step.time)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="dash-panel" style={{ marginBottom: 0 }}>
            <h3 style={{ marginBottom: '1rem' }}>Delivery Updates</h3>
            {(order.updates || []).map((u, i) => (
              <div key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--dash-muted)' }}>{u.time}</div>
                <div style={{ fontSize: '0.88rem' }}>{u.message}</div>
              </div>
            ))}
          </div>

          <div className="dash-panel" style={{ marginBottom: 0 }}>
            <h3 style={{ marginBottom: '1rem' }}>Order Details</h3>
            <p style={{ color: 'var(--dash-muted)', fontSize: '0.88rem', marginBottom: '0.5rem' }}><strong>Restaurant:</strong> {order.restaurant}</p>
            <p style={{ color: 'var(--dash-muted)', fontSize: '0.88rem', marginBottom: '0.5rem' }}><strong>Items:</strong> {order.itemsSummary}</p>
            <p style={{ color: 'var(--dash-muted)', fontSize: '0.88rem', marginBottom: '0.5rem' }}><strong>Rider:</strong> {order.rider || 'To be assigned'}</p>
            {order.deliveryAddress && (
              <p style={{ color: 'var(--dash-muted)', fontSize: '0.88rem', display: 'flex', gap: '0.35rem' }}>
                <MapPin size={14} /> {order.deliveryAddress.street}, {order.deliveryAddress.city}
              </p>
            )}
          </div>

          <button className="dash-btn-outline" onClick={() => go('orders', '/customer/dashboard')}>Back to Orders</button>
        </div>
      </div>
    </>
  );
};

export default OrderTracking;
