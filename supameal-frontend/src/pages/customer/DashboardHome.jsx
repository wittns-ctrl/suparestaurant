import { useState, useEffect } from 'react';
import { Package, CalendarCheck, Heart, TrendingUp, Clock, Star, Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resolveImageUrl, usersApi } from '../../services/api';
import './dashboard.css';

const DashboardHome = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    ordersThisMonth: '+0 this month',
    upcomingBookingsCount: 0,
    nextBookingText: 'None',
    favoritesCount: 0,
    avgRatingGiven: 0,
    reviewsCount: 0,
    recentOrders: [],
    upcomingBookings: [],
    favoriteRestaurants: [],
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await usersApi.getDashboardStats(user.id);
        if (isMounted && res) {
          setStats(res);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, [user?.id]);

  const recentOrders = stats.recentOrders || [];
  const upcomingBookings = stats.upcomingBookings || [];
  const favoriteRestaurants = stats.favoriteRestaurants || [];

  return (
    <>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0] || 'Guest'}! 👋</h1>
        <p>Here's what's happening with your dining experience today.</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards overview-stat-grid">
        <div className="stat-card overview-stat-card">
          <div className="stat-card-icon"><Package size={22} /></div>
          <div className="stat-card-label">Total Orders</div>
          <div className="stat-card-value">{loading ? '...' : stats.totalOrders}</div>
          <div className="stat-card-change up"><TrendingUp size={14} /> {stats.ordersThisMonth}</div>
        </div>
        <div className="stat-card overview-stat-card">
          <div className="stat-card-icon"><CalendarCheck size={22} /></div>
          <div className="stat-card-label">Upcoming Bookings</div>
          <div className="stat-card-value">{loading ? '...' : stats.upcomingBookingsCount}</div>
          <div className="stat-card-change neutral"><Clock size={14} /> {stats.nextBookingText}</div>
        </div>
        <div className="stat-card overview-stat-card">
          <div className="stat-card-icon"><Heart size={22} /></div>
          <div className="stat-card-label">Favorites</div>
          <div className="stat-card-value">{loading ? '...' : stats.favoritesCount}</div>
          <div className="stat-card-change neutral"><Star size={14} /> Saved restaurants</div>
        </div>
        <div className="stat-card overview-stat-card">
          <div className="stat-card-icon"><Star size={22} /></div>
          <div className="stat-card-label">Avg. Rating Given</div>
          <div className="stat-card-value">{loading ? '...' : stats.avgRatingGiven}</div>
          <div className="stat-card-change up"><TrendingUp size={14} /> {stats.reviewsCount} reviews</div>
        </div>
      </div>

      <div className="dash-grid-2">
        {/* Recent Orders */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3>Recent Orders</h3>
            <button className="link-btn" onClick={() => setActiveTab('orders')}>View All</button>
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <Package size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>No orders placed yet</p>
              <button className="dash-btn-primary" onClick={() => setActiveTab('menu')}>
                Explore Menu & Order
              </button>
            </div>
          ) : (
            recentOrders.map(order => (
              <div key={order.id} className="list-row">
                <div className="list-row-left">
                  <div className="list-row-img" style={{ background: 'var(--dash-border, #222)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Package size={20} color="var(--text-muted, rgba(255,255,255,0.5))" />
                  </div>
                  <div>
                    <div className="list-row-title">{order.name}</div>
                    <div className="list-row-sub">{order.id} · {order.time}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.4rem' }}>
                  <span className={`status-badge status-${order.status}`}>{order.statusLabel}</span>
                  <span style={{ color: 'var(--dash-accent)', fontWeight: 600 }}>{order.price}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Bookings */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3>Upcoming Bookings</h3>
            <button className="link-btn" onClick={() => setActiveTab('bookings')}>View All</button>
          </div>
          {upcomingBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <CalendarCheck size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>No upcoming table bookings</p>
              <button className="dash-btn-primary" style={{ width:'100%' }} onClick={() => setActiveTab('book-table')}>
                + New Booking
              </button>
            </div>
          ) : (
            <>
              {upcomingBookings.map(b => (
                <div key={b.id} className="list-row">
                  <div>
                    <div className="list-row-title">{b.restaurant}</div>
                    <div className="list-row-sub">{b.date} · {b.time} · {b.guests} guests</div>
                  </div>
                  <span className={`status-badge status-${b.status}`}>{b.status}</span>
                </div>
              ))}
              <button className="dash-btn-primary" style={{ width:'100%', marginTop:'1.5rem' }} onClick={() => setActiveTab('book-table')}>
                + New Booking
              </button>
            </>
          )}
        </div>
      </div>

      {/* Favorite Restaurants */}
      <div className="dash-panel">
        <div className="dash-panel-header">
          <h3>Favorite Restaurants</h3>
          <button className="link-btn" onClick={() => setActiveTab('favorites')}>View All</button>
        </div>
        {favoriteRestaurants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <Heart size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.9rem' }}>You haven't saved any favorite restaurants yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {favoriteRestaurants.map((r, i) => (
              <div key={r.id || i} className="fav-card" onClick={() => setActiveTab('favorites')} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color, rgba(255,255,255,0.06))', cursor:'pointer' }}>
                {resolveImageUrl(r.image) ? (
                  <img src={resolveImageUrl(r.image)} alt={r.name} style={{ width:'100%', height:'110px', objectFit:'cover' }} />
                ) : (
                  <div aria-label={`${r.name} has no restaurant photo`} style={{ width:'100%', height:'110px', display:'grid', placeItems:'center', background:'var(--dash-border, #222)', color:'var(--text-muted)' }}>
                    <Utensils size={24} />
                  </div>
                )}
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize:'0.9rem' }}>{r.name}</div>
                  <div style={{ color: 'var(--dash-accent)', fontSize:'0.8rem', marginTop:'0.25rem' }}>★ {r.rating ?? 0} · {r.cuisine || 'Cuisine not set'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardHome;
