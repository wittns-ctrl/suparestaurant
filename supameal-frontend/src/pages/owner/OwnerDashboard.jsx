import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restaurantsApi, bookingsApi, ordersApi, menusApi, uploadsApi, usersApi, resolveImageUrl } from '../../services/api';
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  BarChart2, ShoppingBag, BookOpen, Camera, Plus, Trash2, Users, FileText, ClipboardList,
  Edit3, Check, X, Clock, MapPin, Phone, Settings, TrendingUp,
  CheckCircle, AlertCircle, Star, DollarSign
} from 'lucide-react';
import '../customer/dashboard.css';
import promoPasta from '../../assets/images/promo_pasta.webp';

// ── Sidebar Config ─────────────────────────────────────────────────────────
const ownerSidebarConfig = [
  { id: 'overview', label: 'Dashboard Overview', icon: BarChart2 },
  {
    id: 'restaurant-group',
    label: 'My Restaurant',
    icon: Settings,
    subItems: [
      { id: 'profile', label: 'Restaurant Profile' },
      { id: 'gallery', label: 'Gallery' },
    ],
  },
  {
    id: 'operations-group',
    label: 'Operations',
    icon: ShoppingBag,
    subItems: [
      { id: 'menu', label: 'Menu Management' },
      { id: 'bookings', label: 'Booking Management' },
      { id: 'orders', label: 'Order Management' },
    ],
  },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ── SVG Charts (shared) ────────────────────────────────────────────────────
const LineChartSVG = ({ data, color = 'var(--primary)', valueType = 'count', title }) => {
  const width = 720;
  const height = 260;
  const pad = { top: 20, right: 18, bottom: 42, left: 62 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const peak = Math.max(...data.map(point => Number(point.value) || 0), 0);
  const max = peak > 0 ? peak * 1.12 : 1;
  const points = data.map((point, index) => ({
    ...point,
    x: pad.left + (data.length > 1 ? (index / (data.length - 1)) * plotWidth : plotWidth / 2),
    y: pad.top + plotHeight - ((Number(point.value) || 0) / max) * plotHeight,
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x} ${pad.top + plotHeight} L ${points[0].x} ${pad.top + plotHeight} Z`
    : '';
  const ticks = Array.from({ length: 5 }, (_, index) => (max * index) / 4);
  const labelEvery = data.length > 16 ? 4 : data.length > 8 ? 2 : 1;
  const valueLabel = valueType === 'money'
    ? value => `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : value => Math.round(Number(value)).toLocaleString();

  return (
    <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`chart-fill-${valueType}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((tick, index) => {
        const y = pad.top + plotHeight - (index / 4) * plotHeight;
        return (
          <g key={index}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray={index === 0 ? undefined : '3 5'} />
            <text x={pad.left - 10} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">{valueLabel(tick)}</text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill={`url(#chart-fill-${valueType})`} />}
      {path && <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="4" fill="var(--dash-panel, #151715)" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke">
            <title>{`${point.label}: ${valueType === 'money' ? `$${Number(point.value).toFixed(2)}` : `${point.value} orders`}`}</title>
          </circle>
          {(index % labelEvery === 0 || index === points.length - 1) && (
            <text x={point.x} y={height - 14} textAnchor="middle" fill="var(--text-muted)" fontSize="11">{point.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
};
const Toast = ({ message, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
    background: type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)',
    color: '#fff', padding: '0.85rem 1.25rem', borderRadius: '12px',
    fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    animation: 'fadeInUp 0.3s ease',
  }}>
    {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
    {message}
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
  </div>
);

// ── Menu Dialog (Add / Edit) ───────────────────────────────────────────────
const CATEGORIES = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Salads', 'Sides'];

const MenuDialog = ({ item, onSave, onClose }) => {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'Main Course',
    price: item?.price || '',
    description: item?.description || '',
    available: item?.available ?? true,
    spicy: item?.spicy ?? false,
    veg: item?.veg ?? false,
    image: item?.rawImage || item?.image || '',
  });
  const [uploading, setUploading] = useState(false);
  const photoRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB');
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadsApi.upload(file);
      setForm(p => ({ ...p, image: url }));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    onSave({ ...form, price: parseFloat(form.price) });
  };

  const photoPreview = resolveImageUrl(form.image);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#181818', borderRadius: '20px', padding: '2rem',
        width: '100%', maxWidth: 520, border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)', animation: 'fadeInUp 0.25s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{isEdit ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="dash-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 12, background: '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, fontSize: '1.6rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="Item preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (form.image || '🍽️')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <button type="button" className="dash-btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}
                    disabled={uploading} onClick={() => photoRef.current?.click()}>
                    {uploading ? 'Uploading…' : 'Upload photo'}
                  </button>
                  {form.image && form.image.startsWith('/uploads/') && (
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.78rem', textAlign: 'left', padding: 0 }}
                      onClick={() => setForm(p => ({ ...p, image: '' }))}>
                      Remove photo
                    </button>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>
            </div>
            <div className="dash-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Item Name *</label>
              <input className="dash-input" placeholder="e.g. Truffle Burger"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="dash-form-group">
              <label>Category</label>
              <select className="dash-input" value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                style={{ cursor: 'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="dash-form-group">
              <label>Price (USD) *</label>
              <input className="dash-input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
            </div>
            <div className="dash-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea className="dash-input" rows={3} placeholder="Brief description of the item..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'available', label: '✓ Available', activeColor: 'var(--success)' },
              { key: 'spicy', label: '🌶 Spicy', activeColor: 'var(--error)' },
              { key: 'veg', label: '🥦 Vegetarian', activeColor: 'var(--success)' },
            ].map(toggle => (
              <button
                key={toggle.key}
                type="button"
                onClick={() => setForm(p => ({ ...p, [toggle.key]: !p[toggle.key] }))}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${form[toggle.key] ? toggle.activeColor : 'rgba(255,255,255,0.15)'}`,
                  background: form[toggle.key] ? `${toggle.activeColor}20` : 'transparent',
                  color: form[toggle.key] ? toggle.activeColor : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >{toggle.label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="dash-btn-outline" style={{ padding: '0.65rem 1.5rem' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="dash-btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
              {isEdit ? <><Check size={16} style={{ marginRight: 6 }} />Update Item</> : <><Plus size={16} style={{ marginRight: 6 }} />Add Item</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Delete Confirm Dialog ──────────────────────────────────────────────────
const DeleteDialog = ({ item, onConfirm, onClose }) => (
  <ConfirmDialog
    title={`Delete “${item.name}”?`}
    description="This menu item will be permanently removed from your restaurant menu."
    confirmLabel="Delete item"
    tone="danger"
    Icon={Trash2}
    onConfirm={onConfirm}
    onCancel={onClose}
  />
);

// ── Dashboard Overview ─────────────────────────────────────────────────────
const DashboardOverview = ({ setActiveTab, orders, bookings, restaurant, todayRevenue, restaurantStatusLoading, restaurantStatusError }) => {
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysOrders = orders.filter(o => o.createdAt && new Date(o.createdAt) >= startOfToday);
  const activeOrders = orders.filter(o => ['preparing', 'ready', 'on-way'].includes(o.status)).length;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Your restaurant's performance at a glance.</p>
      </div>

      <div className="overview-stat-grid">
        {[
          { label: "Today's Revenue", value: `$${Number(todayRevenue || 0).toFixed(2)}`, sub: 'Successful payments received today', color: 'var(--primary)', icon: DollarSign },
          { label: "Today's Orders", value: todaysOrders.length, sub: `${activeOrders} active now`, color: 'var(--fresh-accent)', icon: ShoppingBag },
          { label: 'Table Bookings', value: bookings.length, sub: `${pendingBookings} pending`, color: 'var(--success)', icon: BookOpen },
          { label: 'Avg. Rating', value: (restaurant?.rating || 0).toFixed(1), sub: `Based on ${restaurant?.reviews || 0} reviews`, color: 'var(--warning)', icon: Star },
        ].map((stat, i) => (
          <div key={i} className="dash-panel overview-stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{stat.label}</div>
              <div style={{ width: 30, height: 30, background: `${stat.color}20`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={16} color={stat.color} />
              </div>
            </div>
            <div style={{ fontSize: '1.55rem', lineHeight: 1.15, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div
        className={`owner-approval-status ${restaurant?.isApproved ? 'is-approved' : ''}`}
        role="status"
        aria-live="polite"
      >
        <div className="owner-approval-status-icon">
          {restaurant?.isApproved ? <CheckCircle size={19} /> : <AlertCircle size={19} />}
        </div>
        <div className="owner-approval-status-copy">
          <strong>Restaurant approval</strong>
          <span>
            {restaurantStatusLoading
              ? 'Checking with the administrator…'
              : restaurantStatusError
                ? 'Approval status could not be refreshed.'
                : restaurant?.isApproved
                  ? 'Your restaurant is approved and visible to customers.'
                  : 'Your restaurant stays private until an administrator approves it.'}
          </span>
        </div>
        <span className="owner-approval-status-label">
          {restaurantStatusLoading ? 'Checking' : restaurantStatusError ? 'Unavailable' : restaurant?.isApproved ? 'Approved' : 'Not approved'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
        <div className="dash-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Recent Orders</h3>
            <button className="dash-btn-outline" style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('orders')}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No orders yet — new orders will appear here.</div>
            )}
            {orders.slice(0, 3).map(order => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--dash-bg)', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Order #{order.id}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.items}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--dash-accent)', marginBottom: '0.2rem' }}>${order.total}</div>
                  <span style={{
                    fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600,
                    background: order.status === 'delivered' ? 'var(--success-soft)' : order.status === 'ready' ? 'var(--fresh-accent-soft)' : 'var(--warning-soft)',
                    color: order.status === 'delivered' ? 'var(--success)' : order.status === 'ready' ? 'var(--fresh-accent)' : 'var(--warning)',
                  }}>{order.status.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Upcoming Bookings</h3>
            <button className="dash-btn-outline" style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('bookings')}>View</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No upcoming bookings.</div>
            )}
            {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').slice(0, 3).map(booking => (
              <div key={booking.id} style={{ padding: '0.85rem 1rem', background: 'var(--dash-bg)', borderRadius: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  {booking.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>({booking.guests} guests)</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--dash-accent)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={12} /> {booking.date} at {booking.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Restaurant Profile ─────────────────────────────────────────────────────
const AMENITY_OPTIONS = ['Free WiFi', 'Parking Available', 'Outdoor Seating', 'Wheelchair Access', 'Live Music', 'Takeaway'];
const CUISINE_OPTIONS = ['Continental', 'Italian', 'Japanese', 'Indian', 'American', 'Chinese', 'International'];

const RestaurantProfile = ({ showToast, restaurantId, setActiveTab }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cover, setCover] = useState('');
  const [form, setForm] = useState({
    name: '', cuisine: 'International', description: '',
    address: '', city: '', phone: '', opening: '', capacity: '',
    amenities: [],
  });

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    restaurantsApi.getForOwner(restaurantId)
      .then(r => {
        setForm({
          name: r.name || '',
          cuisine: r.cuisine || 'International',
          description: r.description || '',
          address: r.location?.address || '',
          city: r.location?.city || '',
          phone: r.phone || '',
          opening: r.opening || '',
          capacity: r.capacity ?? '',
          amenities: r.amenities || [],
        });
        setCover(resolveImageUrl(r.images?.[0]) || '');
      })
      .catch(err => showToast(err.message || 'Could not load restaurant profile', 'error'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const setField = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const toggleAmenity = (a) => setForm(p => ({
    ...p,
    amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a],
  }));

  const handleSave = async () => {
    if (saving) return;
    if (!form.name.trim() || form.description.trim().length < 10) {
      showToast('Name is required and description must be at least 10 characters.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        cuisine: form.cuisine,
        description: form.description.trim(),
        location: { address: form.address, city: form.city },
        phone: form.phone,
        opening: form.opening,
        amenities: form.amenities,
      };
      if (form.capacity !== '' && form.capacity !== null) payload.capacity = Number(form.capacity);
      await restaurantsApi.update(restaurantId, payload);
      showToast('Restaurant profile saved!');
    } catch (err) {
      showToast(err.message || 'Could not save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading restaurant profile…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Restaurant Profile</h1>
        <p>Manage your public restaurant details and settings.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>General Information</h3>
          <div className="dash-form-group"><label>Restaurant Name</label><input className="dash-input" value={form.name} onChange={setField('name')} /></div>
          <div className="dash-form-group"><label>Cuisine Type</label>
            <select className="dash-input" value={form.cuisine} onChange={setField('cuisine')} style={{ cursor: 'pointer' }}>
              {!CUISINE_OPTIONS.includes(form.cuisine) && <option value={form.cuisine}>{form.cuisine}</option>}
              {CUISINE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="dash-form-group"><label>Description</label><textarea className="dash-input" rows={3} value={form.description} onChange={setField('description')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="dash-form-group"><label>Street Address</label><input className="dash-input" value={form.address} onChange={setField('address')} /></div>
            <div className="dash-form-group"><label>City</label><input className="dash-input" value={form.city} onChange={setField('city')} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="dash-form-group"><label>Phone</label><input className="dash-input" value={form.phone} onChange={setField('phone')} /></div>
            <div className="dash-form-group"><label>Opening Hours</label><input className="dash-input" value={form.opening} onChange={setField('opening')} placeholder="e.g. 10:00 AM - 10:00 PM" /></div>
          </div>
          <div className="dash-form-group"><label>Seating Capacity</label><input className="dash-input" type="number" min="1" max="10000" value={form.capacity} onChange={setField('capacity')} /></div>
          <button className="dash-btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
        <div>
          <div className="dash-panel" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Cover Photo</h3>
            <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: '12px', overflow: 'hidden', marginBottom: '0.75rem' }}>
              {cover ? (
                <img src={cover} alt="Restaurant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--dash-border, #222)', color: 'var(--text-muted)' }}>
                  <Camera size={28} />
                </div>
              )}
              <button onClick={() => setActiveTab('gallery')} title="Manage photos in Gallery" style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', background: 'var(--dash-accent)', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={16} color="#000" />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>Upload photos in the Gallery tab</p>
          </div>
          <div className="dash-panel">
            <h3 style={{ marginBottom: '1rem' }}>Amenities</h3>
            {AMENITY_OPTIONS.map(a => (
              <label key={a} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)} style={{ accentColor: 'var(--dash-accent)', width: 15, height: 15 }} />
                {a}
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Gallery ────────────────────────────────────────────────────────────────
const Gallery = ({ showToast, restaurantId }) => {
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantsApi.getForOwner(restaurantId)
      .then(r => setPhotos(r.images || []))
      .catch(console.error);
  }, [restaurantId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB', 'error');
      return;
    }
    setBusy(true);
    try {
      const { url } = await uploadsApi.upload(file);
      const updated = await restaurantsApi.addImages(restaurantId, [url]);
      setPhotos(updated.images || []);
      showToast('Photo uploaded!');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (url) => {
    try {
      const updated = await restaurantsApi.removeImage(restaurantId, url);
      setPhotos(updated.images || []);
      showToast('Photo removed.', 'error');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not remove photo', 'error');
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Gallery</h1><p>Manage your restaurant's photo gallery.</p></div>
        <button className="dash-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={busy} onClick={() => fileRef.current?.click()}>
          <Plus size={16} /> {busy ? 'Uploading…' : 'Upload Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} style={{ display: 'none' }} />
      </div>
      <div className="dash-panel">
        {photos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            No photos yet — upload your first one (JPEG, PNG, or WebP, up to 5 MB).
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1rem' }}>
            {photos.map((photo, i) => {
              const src = resolveImageUrl(photo);
              return (
                <div key={photo} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '4/3' }}>
                  {src && <img src={src} alt={`Gallery ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                  >
                    <button aria-label={`Remove gallery photo ${i + 1}`} onClick={() => handleRemove(photo)} style={{ background: 'var(--error)', border: 'none', color: '#111', padding: '0.5rem 0.7rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700 }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

// ── Menu Management ────────────────────────────────────────────────────────
const MenuManagement = ({ showToast, restaurantId }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!restaurantId) return;
    menusApi.listForOwner(restaurantId).then(data => {
      setItems(data.map(m => ({
        id: m.id, name: m.name, category: m.category, price: m.price,
        available: m.available, spicy: m.spicy, veg: m.veg,
        description: m.description,
        img: resolveImageUrl(m.image) || promoPasta,
        rawImage: m.image,
      })));
    }).catch(console.error);
  }, [restaurantId]);
  const [dialog, setDialog] = useState(null); // null | { mode: 'add'|'edit', item?: {...} }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterCat, setFilterCat] = useState('All');

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  const filtered = filterCat === 'All' ? items : items.filter(i => i.category === filterCat);

  const handleSave = async (form) => {
    if (!restaurantId) return;
    if (dialog.mode === 'add') {
      const created = await menusApi.create({
        restaurant: restaurantId, name: form.name, category: form.category,
        price: form.price, description: form.description || '',
        isAvailable: form.available, spicy: form.spicy, veg: form.veg,
        image: form.image || '🍽️',
      });
      setItems(prev => [...prev, {
        ...form, id: created.id,
        img: resolveImageUrl(created.image) || promoPasta,
        rawImage: created.image,
      }]);
      showToast(`"${form.name}" added to menu!`);
    } else {
      const updated = await menusApi.update(dialog.item.id, {
        name: form.name, category: form.category, price: form.price,
        description: form.description, isAvailable: form.available, spicy: form.spicy, veg: form.veg,
        ...(form.image ? { image: form.image } : {}),
      });
      setItems(prev => prev.map(i => i.id === dialog.item.id ? {
        ...i, ...form,
        img: resolveImageUrl(updated.image) || promoPasta,
        rawImage: updated.image,
      } : i));
      showToast(`"${form.name}" updated!`);
    }
    setDialog(null);
  };

  const handleDelete = async () => {
    try {
      await menusApi.delete(deleteTarget.id);
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      showToast(`"${deleteTarget.name}" removed from menu.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || 'Could not remove this menu item.', 'error');
    }
  };

  const handleToggleAvailability = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    await menusApi.update(id, { isAvailable: !item.available });
    setItems(prev => prev.map(i => i.id === id ? { ...i, available: !i.available } : i));
  };

  return (
    <>
      {dialog && <MenuDialog item={dialog.item} onSave={handleSave} onClose={() => setDialog(null)} />}
      {deleteTarget && <DeleteDialog item={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Menu Management</h1><p>Add, edit, or remove meals from your menu.</p></div>
        <button className="dash-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => setDialog({ mode: 'add' })}>
          <Plus size={18} /> Add Meal
        </button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600,
              border: `1px solid ${filterCat === cat ? 'var(--dash-accent)' : 'rgba(255,255,255,0.12)'}`,
              background: filterCat === cat ? 'var(--dash-accent)' : 'transparent',
              color: filterCat === cat ? '#000' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>{cat}</button>
        ))}
      </div>

      <div className="dash-panel">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))', gap: '1.25rem' }}>
          {filtered.map(item => (
            <div key={item.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden', background: 'var(--dash-bg)', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(215,138,38,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
              <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!item.available && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                    UNAVAILABLE
                  </div>
                )}
                <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', display: 'flex', gap: '0.3rem' }}>
                  {item.spicy && <span style={{ background: 'var(--error)', color: '#111', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>🌶 SPICY</span>}
                  {item.veg && <span style={{ background: 'var(--success)', color: '#111', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>🥦 VEG</span>}
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                  <div style={{ color: 'var(--dash-accent)', fontWeight: 700, fontSize: '0.95rem' }}>${item.price.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dash-accent)', opacity: 0.7, marginBottom: '0.3rem' }}>{item.category}</div>
                {item.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>{item.description}</div>}

                {/* Availability toggle */}
                <button onClick={() => handleToggleAvailability(item.id)}
                  style={{
                    width: '100%', padding: '0.4rem', marginBottom: '0.6rem',
                    background: item.available ? 'var(--success-soft)' : 'var(--error-soft)',
                    border: `1px solid ${item.available ? 'var(--success-border)' : 'var(--error-border)'}`,
                    color: item.available ? 'var(--success)' : 'var(--error)',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  }}>
                  {item.available ? '✓ Available — click to hide' : '✕ Unavailable — click to show'}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="dash-btn-outline"
                    style={{ flex: 1, padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                    onClick={() => setDialog({ mode: 'edit', item })}>
                    <Edit3 size={14} /> Edit
                  </button>
                  <button className="dash-btn-outline"
                    style={{ padding: '0.4rem 0.7rem', color: 'var(--error)', borderColor: 'var(--error-border)', display: 'flex', alignItems: 'center' }}
                    onClick={() => setDeleteTarget(item)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ── Booking Management ─────────────────────────────────────────────────────
const BookingManagement = ({ bookings, onAccept, onReject }) => (
  <>
    <div className="page-header">
      <h1>Booking Management</h1>
      <p>Review and respond to table reservation requests.</p>
    </div>

    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      {[
        { label: 'All', count: bookings.length, color: '#fff' },
        { label: 'Pending', count: bookings.filter(b => b.status === 'pending').length, color: 'var(--warning)' },
        { label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length, color: 'var(--success)' },
        { label: 'Rejected', count: bookings.filter(b => b.status === 'rejected').length, color: 'var(--error)' },
      ].map(s => (
        <div key={s.label} className="dash-panel" style={{ padding: '1rem 1.25rem', textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.count}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
        </div>
      ))}
    </div>

    <div className="dash-panel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {bookings.map(booking => (
          <div key={booking.id} className="list-row" style={{ alignItems: 'center', padding: '1.25rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <div style={{ fontWeight: 700 }}>{booking.name}</div>
                <span style={{
                  fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600,
                  background: booking.status === 'confirmed' ? 'var(--success-soft)' : booking.status === 'rejected' ? 'var(--error-soft)' : 'var(--warning-soft)',
                  color: booking.status === 'confirmed' ? 'var(--success)' : booking.status === 'rejected' ? 'var(--error)' : 'var(--warning)',
                }}>{booking.status.toUpperCase()}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                <span><BookOpen size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{booking.date}</span>
                <span><Clock size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{booking.time}</span>
                <span><Users size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />{booking.guests} guests</span>
                {booking.note && <span><FileText size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />"{booking.note}"</span>}
              </div>
            </div>
            {booking.status === 'pending' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="dash-btn-primary" style={{ padding: '0.5rem 1rem', background: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  onClick={() => onAccept(booking.id)}>
                  <Check size={15} /> Accept
                </button>
                <button className="dash-btn-outline" style={{ padding: '0.5rem 0.9rem', color: 'var(--error)', borderColor: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  onClick={() => onReject(booking.id)}>
                  <X size={15} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </>
);

// ── Order Management ───────────────────────────────────────────────────────
const OrderManagement = ({ orders, onAccept, onReject, onStartPreparing, onMarkReady, onMarkOnWay, onMarkDelivered }) => (
  <>
    <div className="page-header">
      <h1>Order Management</h1>
      <p>Manage and track all incoming orders.</p>
    </div>

    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      {[
        { label: 'All Orders', count: orders.length, color: '#fff' },
        { label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length, color: 'var(--warning)' },
        { label: 'Ready', count: orders.filter(o => o.status === 'ready').length, color: 'var(--fresh-accent)' },
        { label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length, color: 'var(--success)' },
      ].map(s => (
        <div key={s.label} className="dash-panel" style={{ padding: '1rem 1.25rem', textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.count}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
        </div>
      ))}
    </div>

    <div className="dash-panel">
      {orders.map(order => (
        <div key={order.id} className="list-row" style={{ alignItems: 'center', padding: '1.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Order #{order.id} — {order.customer}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
              <ClipboardList size={15} style={{ marginTop: 2, flexShrink: 0 }} />{order.items}
            </div>
            {order.deliveryAddress && (
              <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{[order.deliveryAddress.street, order.deliveryAddress.apartment, order.deliveryAddress.city, order.deliveryAddress.postalCode].filter(Boolean).join(', ')}</span>
                </div>
                {order.deliveryAddress.phone && (
                  <a href={`tel:${order.deliveryAddress.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'inherit', textDecoration: 'none' }}>
                    <Phone size={14} />{order.deliveryAddress.phone}
                  </a>
                )}
                {order.timeSlot && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} />Delivery time: {order.timeSlot}</div>}
                {order.deliveryAddress.instructions && <div>Instructions: {order.deliveryAddress.instructions}</div>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--dash-accent)', fontWeight: 700 }}>${order.total}</span>
            <span style={{
              fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600,
              background: order.status === 'delivered' ? 'var(--success-soft)' : order.status === 'ready' ? 'var(--fresh-accent-soft)' : 'var(--warning-soft)',
              color: order.status === 'delivered' ? 'var(--success)' : order.status === 'ready' ? 'var(--fresh-accent)' : 'var(--warning)',
            }}>{order.status.toUpperCase()}</span>
            {order.status === 'preparing' && (
              <button className="dash-btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                onClick={() => onMarkReady(order.id)}>Mark Ready</button>
            )}
            {order.status === 'accepted' && (
              <>
                <button className="dash-btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                  onClick={() => onStartPreparing(order.id)}>Start Preparing</button>
                <button className="dash-btn-outline" style={{ padding: '0.4rem 0.8rem', color: 'var(--error)', borderColor: 'var(--error)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => onReject(order.id)}><X size={14} /> Reject</button>
              </>
            )}
            {order.status === 'ready' && (
              <button className="dash-btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: 'var(--success)', borderColor: 'var(--success)' }}
                onClick={() => onMarkOnWay(order.id)}>Send for Delivery</button>
            )}
            {order.status === 'on-way' && (
              <button className="dash-btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', background: 'var(--success)', borderColor: 'var(--success)' }}
                onClick={() => onMarkDelivered(order.id)}>Mark Delivered</button>
            )}
            {order.status === 'pending' && (
              <>
                <button className="dash-btn-primary" style={{ padding: '0.4rem 0.8rem', background: 'var(--success)', borderColor: 'var(--success)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => onAccept(order.id)}><Check size={14} /> Accept</button>
                <button className="dash-btn-outline" style={{ padding: '0.4rem 0.8rem', color: 'var(--error)', borderColor: 'var(--error)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => onReject(order.id)}><X size={14} /> Reject</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  </>
);

// ── Analytics ──────────────────────────────────────────────────────────────
const OwnerAnalytics = ({ restaurantId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [peakData, setPeakData] = useState([]);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      restaurantsApi.analyticsOverview(restaurantId),
      restaurantsApi.analyticsRevenue(restaurantId, 'week'),
      restaurantsApi.analyticsPeakHours(restaurantId),
    ])
      .then(([ov, revenue, peak]) => {
        setOverview(ov);
        setRevenueData((revenue || []).map(d => ({ label: d.label, value: Number(d.value) || 0 })));
        setPeakData((peak || []).map(p => ({ label: String(p.hour || '').replace(' ', ''), value: p.count })));
      })
      .catch(err => setError(err.message || 'Could not load analytics'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading analytics…</div>;
  if (error) return <div style={{ color: 'var(--error)', padding: '2rem' }}>{error}</div>;

  const kpis = [
    { label: 'Total Revenue', value: `$${Number(overview?.revenue || 0).toFixed(2)}`, sub: 'Orders completed and delivered' },
    { label: 'Total Orders', value: overview?.totalOrders ?? 0, sub: 'All time' },
    { label: 'Table Bookings', value: overview?.totalBookings ?? 0, sub: 'All time' },
    { label: 'Customer Rating', value: `${Number(overview?.rating || 0).toFixed(1)} ⭐`, sub: `${overview?.pendingOrders ?? 0} pending orders` },
  ];
  const busiestHour = peakData.reduce((best, point) => point.value > best.value ? point : best, { label: '', value: 0 });

  return (
    <>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Detailed insights and performance reports.</p>
      </div>

      <div className="overview-stat-grid" style={{ marginBottom: '1.5rem' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="dash-panel overview-stat-card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.4rem' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--dash-accent)' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ marginBottom: '0.3rem' }}>Revenue from Delivered Orders</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Daily totals for the last seven days, grouped by delivery completion date (Kigali time).</p>
        </div>
        <LineChartSVG data={revenueData} color="var(--primary)" valueType="money" title="Daily revenue from delivered orders" />
        {revenueData.every(d => d.value === 0) && (
          <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No delivered revenue yet this week — revenue appears once orders are marked as delivered.
          </div>
        )}
      </div>

      <div className="dash-panel">
        <div style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ marginBottom: '0.3rem' }}>Order Volume by Hour</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Orders received during each hour over the last 30 days (Kigali time).</p>
        </div>
        <LineChartSVG data={peakData} color="var(--fresh-accent)" valueType="count" title="Order volume by hour over the last 30 days" />
        {peakData.some(d => d.value > 0) ? (
          <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Busiest hour: <strong style={{ color: 'var(--text-primary)' }}>{busiestHour.label}</strong> ({busiestHour.value} orders in the last 30 days).
          </div>
        ) : (
          <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No orders in the last 30 days yet — peak hours appear once orders come in.
          </div>
        )}
      </div>
    </>
  );
};

// ── Owner Settings ─────────────────────────────────────────────────────────
const NOTIFICATION_PREFS = [
  { key: 'newOrders', label: 'New Order Notifications', desc: 'Get alerted for new orders', def: true },
  { key: 'bookingRequests', label: 'Booking Requests', desc: 'Notified when a table is booked', def: true },
  { key: 'reviewAlerts', label: 'Review Alerts', desc: 'Get notified for new reviews', def: true },
  { key: 'promotionalEmails', label: 'Promotional Emails', desc: 'Receive marketing emails', def: false },
  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Weekly performance summary', def: true },
];

const OwnerSettings = ({ showToast, user }) => {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(NOTIFICATION_PREFS.map(p => [p.key, p.def])));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ownerNotificationPrefs') || 'null');
      if (saved) setPrefs(p => ({ ...p, ...saved }));
    } catch { /* ignore malformed stored prefs */ }
    if (!user?.id) { setLoading(false); return; }
    usersApi.get(user.id)
      .then(u => setProfile({ name: u.name || '', email: u.email || '', phone: u.phone || '' }))
      .catch(err => showToast(err.message || 'Could not load account details', 'error'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await usersApi.update(user.id, { name: profile.name, email: profile.email, phone: profile.phone });
      showToast('Account settings saved!');
    } catch (err) {
      showToast(err.message || 'Could not save account settings', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (savingPassword) return;
    if (!passwords.currentPassword || !/(?=.*[A-Z])(?=.*\d).{8,}/.test(passwords.newPassword)) {
      showToast('New password needs 8+ characters, one uppercase letter and one digit.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await usersApi.changePassword(user.id, passwords);
      showToast('Password updated!');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      showToast(err.message || 'Could not change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePrefs = () => {
    localStorage.setItem('ownerNotificationPrefs', JSON.stringify(prefs));
    showToast('Notification preferences saved!');
  };

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading settings…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage account and notification preferences.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>Account Settings</h3>
          <div className="dash-form-group"><label>Display Name</label><input className="dash-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="dash-form-group"><label>Email Address</label><input className="dash-input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="dash-form-group"><label>Phone Number</label><input className="dash-input" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
          <button className="dash-btn-primary" disabled={savingProfile} onClick={handleSaveProfile}>{savingProfile ? 'Saving…' : 'Save Changes'}</button>

          <h3 style={{ margin: '2rem 0 1rem' }}>Change Password</h3>
          <div className="dash-form-group"><label>Current Password</label><input className="dash-input" type="password" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} /></div>
          <div className="dash-form-group"><label>New Password</label><input className="dash-input" type="password" placeholder="8+ chars, one uppercase and one digit" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} /></div>
          <button className="dash-btn-outline" disabled={savingPassword} onClick={handleChangePassword}>{savingPassword ? 'Updating…' : 'Update Password'}</button>
        </div>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.5rem' }}>Notification Preferences</h3>
          {NOTIFICATION_PREFS.map(pref => (
            <label key={pref.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{pref.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pref.desc}</div>
              </div>
              <input type="checkbox" checked={!!prefs[pref.key]} onChange={() => setPrefs(p => ({ ...p, [pref.key]: !p[pref.key] }))} style={{ accentColor: 'var(--dash-accent)', width: 16, height: 16 }} />
            </label>
          ))}
          <button className="dash-btn-outline" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleSavePrefs}>Save Preferences</button>
        </div>
      </div>
    </>
  );
};

// ── Main Owner Dashboard ───────────────────────────────────────────────────
const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);

  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [restaurantStatusLoading, setRestaurantStatusLoading] = useState(true);
  const [restaurantStatusError, setRestaurantStatusError] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);

  const { user, isAuthenticated } = useAuth();
  const pendingBookingCount = bookings.filter(booking => booking.status === 'pending').length;
  const sidebarConfig = ownerSidebarConfig.map(section => section.subItems
    ? {
        ...section,
        subItems: section.subItems.map(item => item.id === 'bookings'
          ? { ...item, badge: pendingBookingCount || undefined }
          : item),
      }
    : section);

  const loadOwnerData = async (ownerId, restId) => {
    if (!restId) return;
    try {
      const [bookingData, orderData, analytics] = await Promise.all([
        bookingsApi.list({ restaurantId: restId, view: 'owner' }),
        ordersApi.list({ restaurantId: restId, view: 'owner' }),
        restaurantsApi.analyticsOverview(restId),
      ]);
      setTodayRevenue(Number(analytics?.todayRevenue) || 0);
      setBookings(bookingData.map(b => ({
        id: b.id, name: b.name, date: b.date, time: b.time, guests: b.guests,
        status: b.status, note: b.note || b.specialRequest || '',
      })));
      setOrders(orderData.map(o => ({
        id: o.orderId || o.id?.slice(-4), orderDbId: o.id,
        customer: o.customer, items: o.itemsSummary, total: Number(o.total).toFixed(2), status: o.status,
        deliveryAddress: o.deliveryAddress || null, timeSlot: o.timeSlot,
        createdAt: o.createdAt,
      })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const ownerId = user?.id;
    if (!ownerId || !isAuthenticated) return undefined;

    let isMounted = true;
    const refreshRestaurantStatus = async () => {
      try {
        const rests = await restaurantsApi.byOwner(ownerId);
        if (!isMounted) return;
        setRestaurantStatusError(false);
        const ownedRestaurant = rests?.[0] || null;
        setRestaurant(ownedRestaurant);
        setRestaurantId(ownedRestaurant?.id || null);
        if (ownedRestaurant) loadOwnerData(ownerId, ownedRestaurant.id);
      } catch (err) {
        if (isMounted) setRestaurantStatusError(true);
        console.error(err);
      } finally {
        if (isMounted) setRestaurantStatusLoading(false);
      }
    };

    refreshRestaurantStatus();
    const statusRefresh = window.setInterval(refreshRestaurantStatus, 15_000);
    return () => {
      isMounted = false;
      window.clearInterval(statusRefresh);
    };
  }, [user?.id, isAuthenticated]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAcceptBooking = async (id) => {
    try {
      await bookingsApi.update(id, { status: 'confirmed' });
      if (restaurantId) loadOwnerData(user?.id, restaurantId);
      showToast('Booking confirmed!');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not confirm booking', 'error');
    }
  };

  const handleRejectBooking = async (id) => {
    try {
      await bookingsApi.update(id, { status: 'rejected', rejectionReason: 'Not available' });
      if (restaurantId) loadOwnerData(user?.id, restaurantId);
      showToast('Booking rejected.');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not reject booking', 'error');
    }
  };

  const updateOrderStatus = async (id, status, successMessage) => {
    const order = orders.find(o => o.id === id);
    if (!order?.orderDbId) {
      showToast('Could not find that order — please refresh the page.', 'error');
      return;
    }
    try {
      await ordersApi.updateStatus(order.orderDbId, status);
      if (restaurantId) await loadOwnerData(user?.id, restaurantId);
      showToast(successMessage);
    } catch (err) {
      console.error(err);
      showToast(err.message || `Could not update order to ${status}`, 'error');
    }
  };

  const handleAcceptOrder = (id) => updateOrderStatus(id, 'accepted', 'Order accepted.');
  const handleRejectOrder = (id) => updateOrderStatus(id, 'rejected', 'Order rejected.');
  const handleStartPreparing = (id) => updateOrderStatus(id, 'preparing', 'Order is now being prepared.');
  const handleMarkOnWay = (id) => updateOrderStatus(id, 'on-way', 'Order sent for delivery.');

  const handleMarkReady = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order?.orderDbId) {
      showToast('Could not find that order — please refresh the page.', 'error');
      return;
    }
    try {
      await ordersApi.updateStatus(order.orderDbId, 'ready');
      if (restaurantId) loadOwnerData(user?.id, restaurantId);
      showToast('Order marked as ready!');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not mark order as ready', 'error');
    }
  };

  const handleMarkDelivered = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order?.orderDbId) {
      showToast('Could not find that order — please refresh the page.', 'error');
      return;
    }
    try {
      await ordersApi.updateStatus(order.orderDbId, 'delivered');
      if (restaurantId) loadOwnerData(user?.id, restaurantId);
      showToast('Order marked as delivered!');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not mark order as delivered', 'error');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <DashboardOverview setActiveTab={setActiveTab} orders={orders} bookings={bookings} restaurant={restaurant} todayRevenue={todayRevenue} restaurantStatusLoading={restaurantStatusLoading} restaurantStatusError={restaurantStatusError} />;
      case 'profile': return <RestaurantProfile showToast={showToast} restaurantId={restaurantId} setActiveTab={setActiveTab} />;
      case 'gallery': return <Gallery showToast={showToast} restaurantId={restaurantId} />;
      case 'menu': return <MenuManagement showToast={showToast} restaurantId={restaurantId} />;
      case 'bookings': return <BookingManagement bookings={bookings} onAccept={handleAcceptBooking} onReject={handleRejectBooking} />;
      case 'orders': return <OrderManagement orders={orders} onAccept={handleAcceptOrder} onReject={handleRejectOrder} onStartPreparing={handleStartPreparing} onMarkReady={handleMarkReady} onMarkOnWay={handleMarkOnWay} onMarkDelivered={handleMarkDelivered} />;
      case 'analytics': return <OwnerAnalytics restaurantId={restaurantId} />;
      case 'settings': return <OwnerSettings showToast={showToast} user={user} />;
      default: return <DashboardOverview setActiveTab={setActiveTab} orders={orders} bookings={bookings} restaurant={restaurant} todayRevenue={todayRevenue} restaurantStatusLoading={restaurantStatusLoading} restaurantStatusError={restaurantStatusError} />;
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-form-group select.dash-input option {
          background: #181818;
          color: #fff;
        }
      `}</style>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <DashboardLayout sidebarConfig={sidebarConfig} activeTab={activeTab} setActiveTab={setActiveTab} roleName="Restaurant Owner">
        {renderContent()}
      </DashboardLayout>
    </>
  );
};

export default OwnerDashboard;
