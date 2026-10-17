import React from 'react';
import { Link } from 'react-router-dom';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard';
import Button from '../../components/Button/Button';
import restaurant1 from '../../assets/images/restaurant_interior.png';
import restaurant2 from '../../assets/images/restaurant_2.png';
import restaurant3 from '../../assets/images/restaurant_3.png';
import restaurant4 from '../../assets/images/hero_food.png';
import restaurant5 from '../../assets/images/promo_pasta.png';
import './TopPicks.css';

const TopPicks = () => {
  const restaurants = [
    {
      id: 1,
      name: 'Soy Restaurant',
      location: 'Kigali Heights',
      rating: 4.8,
      reviews: '1,200+',
      priceLevel: '$$$',
      image: restaurant1
    },
    {
      id: 2,
      name: 'chooose KIGALI',
      location: 'Nyarutarama',
      rating: 4.7,
      reviews: '850+',
      priceLevel: '$$',
      image: restaurant2
    },
    {
      id: 3,
      name: 'Planet Burger',
      location: 'Remera',
      rating: 4.9,
      reviews: '4,100+',
      priceLevel: '$$',
      image: restaurant3
    },
    {
      id: 4,
      name: 'M Hotel',
      location: 'Kigali City Center',
      rating: 4.7,
      reviews: '1,500+',
      priceLevel: '$$$',
      image: restaurant4
    },
    {
      id: 5,
      name: 'Sundowner',
      location: 'Kimihurura',
      rating: 4.6,
      reviews: '2,000+',
      priceLevel: '$$',
      image: restaurant5
    }
  ];

  return (
    <section className="top-picks">
      <div className="container">
        <div className="top-picks-header">
          <div>
            <h2 className="section-title">Top Picks For You</h2>
            <p className="section-subtitle">Discover the most loved restaurants in your area.</p>
          </div>
          <Link to="/restaurants">
            <Button variant="outline">View All Restaurants</Button>
          </Link>
        </div>
      </div>

      <div className="marquee-container">
        <div className="marquee-track">
          {/* First set of cards */}
          {restaurants.map((restaurant) => (
            <div key={`set1-${restaurant.id}`} className="marquee-item">
              <RestaurantCard
                name={restaurant.name}
                location={restaurant.location}
                rating={restaurant.rating}
                reviews={restaurant.reviews}
                priceLevel={restaurant.priceLevel}
                image={restaurant.image}
              />
            </div>
          ))}
          {/* Second set of cards for seamless loop */}
          {restaurants.map((restaurant) => (
            <div key={`set2-${restaurant.id}`} className="marquee-item">
              <RestaurantCard
                name={restaurant.name}
                location={restaurant.location}
                rating={restaurant.rating}
                reviews={restaurant.reviews}
                priceLevel={restaurant.priceLevel}
                image={restaurant.image}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopPicks;
