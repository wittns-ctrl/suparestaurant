import SmartImage from '../../components/SmartImage/SmartImage';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Filter, Package, Utensils } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { restaurantsApi, resolveImageUrl } from '../../services/api';
import './dashboard.css';

const MenuPage = ({ setActiveTab }) => {
  const params = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [restaurants, setRestaurants] = useState([]);
  const { cart, cartCount, addToCart, removeFromCart, menuItems, loadingMenu, selectRestaurant, selectedRestaurantId } = useCart();

  const go = (tab, path) => (setActiveTab ? setActiveTab(tab) : navigate(path));

  // Load restaurants list so user can choose or switch between restaurants
  useEffect(() => {
    let alive = true;
    restaurantsApi.list().then(list => {
      if (!alive) return;
      const res = Array.isArray(list) ? list : list?.data || [];
      setRestaurants(res);
      // Auto-select restaurant if none selected
      const routeRestId = params.restaurantId;
      if (routeRestId) {
        selectRestaurant(routeRestId);
      } else if (!selectedRestaurantId && res.length > 0) {
        selectRestaurant(res[0].id || res[0]._id);
      }
    }).catch(console.error);

    return () => { alive = false; };
  }, [params.restaurantId, selectedRestaurantId, selectRestaurant]);

  // Categories are free-form strings owned by each restaurant, so derive them
  // from the loaded menu instead of a fixed list that silently hides items.
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(menuItems.map(i => i.category).filter(Boolean)))],
    [menuItems],
  );

  useEffect(() => {
    if (category !== 'All' && !categories.includes(category)) setCategory('All');
  }, [categories, category]);

  const filtered = menuItems.filter(item =>
    (category === 'All' || item.category === category) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentRestaurant = restaurants.find(r => (r.id || r._id) === selectedRestaurantId);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Menu {currentRestaurant ? `· ${currentRestaurant.name}` : ''}</h1>
          <p>Browse meals and add items to your cart.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {restaurants.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1a1a1a', padding: '0.4rem 0.8rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Utensils size={15} style={{ color: 'var(--dash-accent)' }} />
              <select
                value={selectedRestaurantId || ''}
                onChange={(e) => selectRestaurant(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--dash-text, #fff)', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                {restaurants.map(r => (
                  <option key={r.id || r._id} value={r.id || r._id} style={{ background: '#222', color: '#fff' }}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {cartCount > 0 && (
            <button className="dash-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => go('cart', '/cart')}>
              <ShoppingCart size={18} /> View Cart ({cartCount})
            </button>
          )}
        </div>
      </div>

      <div className="dash-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#1a1a1a', borderRadius: 10, padding: '0.7rem 1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={18} style={{ color: 'var(--dash-muted, #8a8a8a)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meals..." style={{ background: 'none', border: 'none', color: 'var(--dash-text, #fff)', width: '100%', fontSize: '0.92rem' }} />
        </div>
        <Filter size={20} style={{ color: 'var(--dash-muted, #8a8a8a)' }} />
      </div>

      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`category-pill ${category === cat ? 'active' : ''}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {loadingMenu ? (
        <div className="dash-panel" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--dash-muted, #8a8a8a)' }}>
          Loading menu…
        </div>
      ) : filtered.length === 0 ? (
        <div className="dash-panel" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <Package size={40} color="var(--dash-accent)" style={{ marginBottom: '0.85rem' }} />
          <div style={{ fontWeight: 600, color: 'var(--dash-text, #fff)', marginBottom: '0.4rem' }}>
            {menuItems.length === 0 ? 'No menu loaded' : 'No dishes match your search'}
          </div>
          <div style={{ color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
            {menuItems.length === 0
              ? 'Choose a restaurant first — its menu loads here.'
              : 'Try a different search term or category.'}
          </div>
          {menuItems.length === 0 ? (
            <Link to="/restaurants" className="dash-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Browse Restaurants
            </Link>
          ) : (
            <button className="dash-btn-outline" onClick={() => { setSearch(''); setCategory('All'); }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {filtered.map(item => {
          const imgSrc = resolveImageUrl(item.image);
          // Restaurants may store an emoji instead of an uploaded photo
          const emoji = !imgSrc && typeof item.image === 'string' && item.image.trim() ? item.image.trim() : null;
          const soldOut = item.isAvailable === false;
          return (
          <div key={item.id} className="dash-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', marginBottom: 0, opacity: soldOut ? 0.6 : 1 }}>
            <div style={{ marginBottom: '0.75rem', textAlign: 'center', background: '#1a1a1a', borderRadius: 12, padding: '1rem' }}>
              {imgSrc ? (
                <SmartImage src={imgSrc} alt={item.name} width={480} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
              ) : emoji ? (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>{emoji}</div>
              ) : (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={40} color="var(--dash-accent)" />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--dash-text, #fff)', fontSize: '0.95rem' }}>{item.name}</span>
              <span style={{ color: 'var(--dash-accent)', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 }}>${item.price}</span>
            </div>
            <p style={{ color: 'var(--dash-muted, #8a8a8a)', fontSize: '0.8rem', marginBottom: '0.5rem', lineHeight: 1.5, flex: 1 }}>{item.desc}</p>

            {soldOut ? (
              <button className="dash-btn-outline" style={{ width: '100%', padding: '0.65rem', opacity: 0.5, cursor: 'not-allowed' }} disabled>
                Unavailable
              </button>
            ) : cart[item.id] ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="qty-btn qty-btn-minus" onClick={() => removeFromCart(item.id)}>−</button>
                <span style={{ color: 'var(--dash-text, #fff)', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{cart[item.id]}</span>
                <button className="qty-btn qty-btn-plus" onClick={() => addToCart(item.id)}>+</button>
              </div>
            ) : (
              <button className="dash-btn-outline" style={{ width: '100%', padding: '0.65rem' }} onClick={() => addToCart(item.id)}>
                Add to Cart
              </button>
            )}
          </div>
          );
        })}
      </div>
      )}
    </>
  );
};

export default MenuPage;
