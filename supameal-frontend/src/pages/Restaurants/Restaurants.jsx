import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, Heart } from 'lucide-react';
import Navbar from '../../sections/Navbar/Navbar';
import Footer from '../../sections/Footer/Footer';
import Button from '../../components/Button/Button';
import Dropdown from '../../components/Input/Dropdown';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard';
import { restaurantsApi, resolveImageUrl, usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './Restaurants.css';


const Restaurants = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState(() => new Set());
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const loadRestaurants = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await restaurantsApi.list({
        search: searchTerm || undefined,
        cuisine: cuisine || undefined,
        location: location || undefined,
        rating: rating || undefined,
      });
      setRestaurants(data.map(r => ({
        ...r,
        image: resolveImageUrl(r.image),
      })));
    } catch (err) {
      console.error('Failed to load restaurants:', err);
      setLoadError(err.message || 'Restaurants could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRestaurants(); }, []);

  useEffect(() => {
    let isCurrent = true;
    if (!user?.id) {
      setFavoriteIds(new Set());
      return () => { isCurrent = false; };
    }
    setFavoriteIds(new Set());
    usersApi.favorites(user.id)
      .then(favorites => {
        if (isCurrent) setFavoriteIds(new Set(favorites.map(restaurant => String(restaurant.id))));
      })
      .catch(err => console.error('Failed to load favorite restaurants:', err));
    return () => { isCurrent = false; };
  }, [user?.id]);

  const handleApplyFilters = () => loadRestaurants();

  const toggleFavorite = async (event, restaurant) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user?.id) {
      showToast('Sign in to save restaurants to your favorites.', 'info');
      navigate('/login');
      return;
    }

    const restaurantId = String(restaurant.id);
    const isFavorite = favoriteIds.has(restaurantId);
    setPendingFavoriteIds(previous => new Set(previous).add(restaurantId));
    try {
      if (isFavorite) {
        await usersApi.removeFavorite(user.id, restaurantId);
        setFavoriteIds(previous => {
          const next = new Set(previous);
          next.delete(restaurantId);
          return next;
        });
        showToast(`${restaurant.name} removed from favorites.`, 'success');
      } else {
        await usersApi.addFavorite(user.id, restaurantId);
        setFavoriteIds(previous => new Set(previous).add(restaurantId));
        showToast(`${restaurant.name} added to favorites.`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Could not update your favorites.', 'error');
    } finally {
      setPendingFavoriteIds(previous => {
        const next = new Set(previous);
        next.delete(restaurantId);
        return next;
      });
    }
  };

  return (
    <>
      <Navbar />
      <main className="restaurants-page">
        <div className="container">
          <div className="restaurants-header">
            <div className="restaurants-title-row">
              <Link to="/" className="back-link">
                <ArrowLeft size={20} /> Back to Home
              </Link>
              <h1>All Restaurants</h1>
              <p>Find exactly what you're craving</p>
            </div>
            
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input 
                  type="text" 
                  aria-label="Search restaurants, cuisines, or dishes"
                  placeholder="Search restaurants, cuisines, or dishes..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="filter-dropdowns">
                <Dropdown 
                  placeholder="Location" 
                  options={[...new Set(restaurants.map(r => r.location?.city).filter(Boolean))]}
                  onChange={(val) => setLocation(val)}
                />
                <Dropdown 
                  placeholder="Cuisine" 
                  options={[...new Set(restaurants.map(r => r.cuisine).filter(Boolean))]}
                  onChange={(val) => setCuisine(val)}
                />
                <Dropdown 
                  placeholder="Rating" 
                  options={['4+ Stars', '3+ Stars']}
                  onChange={(val) => setRating(val.startsWith('4') ? '4' : val.startsWith('3') ? '3' : '')}
                />
                <Button variant="primary" className="filter-btn" onClick={handleApplyFilters}>
                  <Filter size={18} /> Apply
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading restaurants...</p>
          ) : loadError ? (
            <div role="alert" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--error)', padding: '2rem' }}>
              <p>{loadError}</p>
              <Button variant="outline" style={{ marginTop: '1rem' }} onClick={loadRestaurants}>Try again</Button>
            </div>
          ) : (
            <div className="restaurants-grid">
              {restaurants.map((restaurant) => (
                <div className="restaurant-listing-card" key={restaurant.id}>
                  <Link to={`/restaurants/${restaurant.id}`} style={{ textDecoration: 'none' }}>
                    <RestaurantCard
                      image={restaurant.image}
                      name={restaurant.name}
                      location={typeof restaurant.location === 'string' ? restaurant.location : restaurant.location?.address || ''}
                      rating={restaurant.rating ?? 'New'}
                      reviews={restaurant.reviews ?? 0}
                      priceLevel={restaurant.priceRange || restaurant.priceLevel}
                    />
                  </Link>
                  <button
                    type="button"
                    className={`restaurant-favorite-btn ${favoriteIds.has(String(restaurant.id)) ? 'is-favorite' : ''}`}
                    aria-label={favoriteIds.has(String(restaurant.id)) ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
                    aria-pressed={favoriteIds.has(String(restaurant.id))}
                    title={favoriteIds.has(String(restaurant.id)) ? 'Remove from favorites' : 'Add to favorites'}
                    disabled={pendingFavoriteIds.has(String(restaurant.id))}
                    onClick={event => toggleFavorite(event, restaurant)}
                  >
                    <Heart size={19} fill={favoriteIds.has(String(restaurant.id)) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ))}
              {restaurants.length === 0 && (
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>No restaurants found.</p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Restaurants;
