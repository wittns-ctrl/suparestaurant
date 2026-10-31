import { optimizeImageUrl } from '../../utils/images';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, Users, Phone, Navigation, Heart, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import Navbar from '../../sections/Navbar/Navbar';
import Footer from '../../sections/Footer/Footer';
import Button from '../../components/Button/Button';
import { restaurantsApi, reviewsApi, usersApi, resolveImageUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import './RestaurantDetails.css';

const RestaurantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('menu');
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewStatus, setReviewStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectRestaurant, cart, addToCart, removeFromCart, cartCount } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await restaurantsApi.get(id);
        setRestaurant({
          ...data,
          image: resolveImageUrl(data.image),
        });
        const rev = await reviewsApi.list(id);
        setReviews(rev);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!user?.id || !id) return;
    usersApi.favorites(user.id)
      .then(favs => setIsFavorite(favs.some(r => r.id === id)))
      .catch(() => {});
  }, [user?.id, id]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      if (isFavorite) {
        await usersApi.removeFavorite(user.id, id);
        setIsFavorite(false);
      } else {
        await usersApi.addFavorite(user.id, id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!reviewText.trim()) {
      setReviewStatus({ type: 'error', message: 'Please write a comment' });
      return;
    }
    setReviewStatus(null);
    try {
      const created = await reviewsApi.create({ restaurantId: id, rating: reviewRating, comment: reviewText.trim() });
      setReviews(prev => [created, ...prev]);
      setReviewText('');
      setReviewRating(5);
      setReviewStatus({ type: 'success', message: 'Thanks! Your review was posted.' });
    } catch (err) {
      setReviewStatus({ type: 'error', message: err.message || 'Could not submit review' });
    }
  };

  const menuByCategory = (restaurant?.menu || []).reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="restaurant-details-page"><div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div></main>
        <Footer />
      </>
    );
  }

  if (!restaurant) {
    return (
      <>
        <Navbar />
        <main className="restaurant-details-page"><div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Restaurant not found</div></main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="restaurant-details-page">
        <div className="restaurant-hero" style={restaurant.image ? { backgroundImage: `url(${optimizeImageUrl(restaurant.image, 1600)})` } : undefined}>
          <div className="restaurant-hero-overlay"></div>
          <div className="container restaurant-hero-content">
            <Link to="/restaurants" className="back-btn-glass">
              <ArrowLeft size={20} /> Back to Directory
            </Link>
            
            <div className="restaurant-hero-info glass-panel">
              <div className="restaurant-badges">
                <span className="badge cuisine-badge">{restaurant.cuisine}</span>
                <span className="badge rating-badge"><Star size={14} fill="currentColor" /> {restaurant.rating} ({restaurant.reviews} Reviews)</span>
                <button
                  className="badge"
                  onClick={toggleFavorite}
                  aria-pressed={isFavorite}
                  title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: isFavorite ? '#ff4d6d' : undefined }}
                >
                  <Heart size={14} fill={isFavorite ? '#ff4d6d' : 'none'} />
                  {isFavorite ? 'Saved' : 'Save'}
                </button>
              </div>
              <h1>{restaurant.name}</h1>
              <p className="restaurant-address"><MapPin size={18} /> {restaurant.address}</p>
            </div>
          </div>
        </div>

        <div className="container restaurant-content-layout">
          <div className="restaurant-info-col">
            <section className="info-section">
              <h3>About</h3>
              <p>{restaurant.description}</p>
            </section>

            <section className="info-section">
              <h3>Details</h3>
              <ul className="details-list">
                <li><Clock size={20} className="text-primary"/> <span><strong>Working Hours:</strong> {restaurant.hours || restaurant.opening}</span></li>
                <li><Users size={20} className="text-primary"/> <span><strong>Capacity:</strong> {restaurant.capacity} Guests</span></li>
                <li><Phone size={20} className="text-primary"/> <span><strong>Contact:</strong> {restaurant.phone}</span></li>
                <li><Navigation size={20} className="text-primary"/> <span><strong>Get Directions</strong></span></li>
              </ul>
            </section>

            {restaurant.amenities?.length > 0 && (
              <section className="info-section">
                <h3>Amenities</h3>
                <ul className="amenities-list">
                  {restaurant.amenities.map(amenity => (
                    <li key={amenity}><Check size={16} aria-hidden="true" /> <span>{amenity}</span></li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="restaurant-action-col">
            <div className="action-card">
              <div className="action-buttons">
                <Button 
                  variant="primary" 
                  className="full-width-btn"
                  onClick={() => navigate('/book-table', { state: { restaurantId: id } })}
                >
                  Book a Table
                </Button>
                <Button variant="outline" className="full-width-btn" onClick={() => { selectRestaurant(id); navigate('/customer/dashboard?tab=menu'); }}>
                  Order Food Delivery
                </Button>
              </div>

              <div className="menu-preview">
                <div className="menu-tabs">
                  <button className={`menu-tab ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>Menu</button>
                  <button className={`menu-tab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>Reviews</button>
                </div>

                {activeTab === 'menu' && (
                  <div className="menu-list">
                    {Object.entries(menuByCategory).map(([category, items]) => (
                      <div key={category} className="menu-category">
                        <h4>{category}</h4>
                        {items.map(item => {
                          const qty = cart[item.id] || 0;
                          return (
                            <div key={item.id} className="menu-item" style={{ alignItems: 'center' }}>
                              <div className="menu-item-info">
                                <span className="item-name">{item.name}</span>
                                <span className="item-desc">{item.desc || item.description}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                <span className="item-price">${item.price}</span>
                                {qty > 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <button
                                      onClick={() => removeFromCart(item.id)}
                                      aria-label={`Remove one ${item.name} from cart`}
                                      style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span style={{ color: '#fff', fontWeight: 700, minWidth: 18, textAlign: 'center', fontSize: '0.9rem' }}>{qty}</span>
                                    <button
                                      onClick={() => addToCart(item.id)}
                                      aria-label={`Add one ${item.name} to cart`}
                                      style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { selectRestaurant(id); addToCart(item.id); }}
                                    style={{ padding: '0.3rem 0.7rem', background: 'var(--primary)', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {Object.keys(menuByCategory).length === 0 && (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Menu coming soon</p>
                    )}
                    {cartCount > 0 && (
                      <button
                        onClick={() => { selectRestaurant(id); navigate('/customer/dashboard?tab=cart'); }}
                        style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: 'var(--primary)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <ShoppingCart size={18} /> View Cart ({cartCount} items)
                      </button>
                    )}
                  </div>
                )}
                
                {activeTab === 'reviews' && (
                  <div className="reviews-list">
                    {user && (
                      <form onSubmit={submitReview} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewRating(n)}
                              aria-label={`${n} star${n > 1 ? 's' : ''}`}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--warning)' }}
                            >
                              <Star size={18} fill={n <= reviewRating ? 'var(--warning)' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          placeholder="Share your experience..."
                          rows={3}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-main, #fff)', padding: '0.6rem', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                        {reviewStatus && (
                          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: reviewStatus.type === 'error' ? '#ff6b6b' : '#7ddf64' }}>{reviewStatus.message}</p>
                        )}
                        <button
                          type="submit"
                          className="full-width-btn"
                          style={{ marginTop: '0.6rem', width: '100%', background: 'var(--primary)', color: '#111', border: 'none', borderRadius: 8, padding: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Submit Review
                        </button>
                      </form>
                    )}
                    {reviews.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No reviews yet</p>
                    ) : (
                      reviews.map(r => (
                        <div key={r.id} style={{ padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <Star size={14} fill="var(--warning)" color="var(--warning)" />
                            <strong>{r.rating}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.customerName}</span>
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{r.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default RestaurantDetails;
