import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import Button from '../../components/Button/Button';
import { restaurantsApi } from '../../services/api';
import './SearchBar.css';

const dateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SearchBar = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsError, setRestaurantsError] = useState('');
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurantId, setRestaurantId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const navigate = useNavigate();

  const today = dateString(new Date());
  const maxDate = dateString(new Date(new Date().setDate(new Date().getDate() + 90)));

  useEffect(() => {
    restaurantsApi.list()
      .then((result) => setRestaurants(Array.isArray(result) ? result : result?.data || []))
      .catch((error) => setRestaurantsError(error.message || 'Could not load restaurants. Please try again.'))
      .finally(() => setLoadingRestaurants(false));
  }, []);

  const handleFindTable = () => {
    navigate('/book-table', {
      state: { restaurantId, bookingDate: date, bookingTime: time, guests: Number(guests) },
    });
  };

  return (
    <section className="search-section">
      <div className="container">
        <div className="search-card">
          <div className="search-fields">
            <div className="search-field">
              <label htmlFor="home-booking-restaurant">Restaurant</label>
              <div className="input-wrapper">
                <Search size={18} className="text-muted" />
                <select
                  id="home-booking-restaurant"
                  value={restaurantId}
                  onChange={(event) => setRestaurantId(event.target.value)}
                  required
                  disabled={loadingRestaurants || restaurants.length === 0}
                  aria-describedby={restaurantsError ? 'home-booking-error' : undefined}
                >
                  <option value="">{loadingRestaurants ? 'Loading restaurants…' : 'Choose a restaurant'}</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="search-divider"></div>
            
            <div className="search-field">
              <label htmlFor="home-booking-date">Date</label>
              <div className="input-wrapper">
                <Calendar size={18} className="text-muted" />
                <input id="home-booking-date" type="date" min={today} max={maxDate} value={date} onChange={(event) => setDate(event.target.value)} required />
              </div>
            </div>
            
            <div className="search-divider"></div>
            
            <div className="search-field">
              <label htmlFor="home-booking-time">Time</label>
              <div className="input-wrapper">
                <Clock size={18} className="text-muted" />
                <input id="home-booking-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
              </div>
            </div>
            
            <div className="search-divider"></div>
            
            <div className="search-field">
              <label htmlFor="home-booking-guests">Guests</label>
              <div className="input-wrapper">
                <Users size={18} className="text-muted" />
                <select id="home-booking-guests" value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
                  {Array.from({ length: 50 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="search-button-wrapper">
              <Button variant="primary" className="search-btn" onClick={handleFindTable} disabled={!restaurantId || !date || !time || !restaurants.length}>
                Find a Table <ArrowRight size={18} />
              </Button>
            </div>
          </div>

          {restaurantsError && <p className="search-error" id="home-booking-error" role="alert">{restaurantsError}</p>}
          
          <div className="search-footer">
            <span><span className="text-primary">•</span> Instant confirmation</span>
            <span><span className="text-primary">•</span> No hidden fees</span>
            <span><span className="text-primary">•</span> Easy & secure booking</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchBar;
