import { Star, MapPin, Utensils } from 'lucide-react';
import './RestaurantCard.css';

const RestaurantCard = ({ image, name, location, rating, reviews, priceLevel }) => {
  return (
    <div className="restaurant-card">
      <div className="card-image-wrapper">
        {image ? (
          <img src={image} alt={name} className="card-image" />
        ) : (
          <div className="card-image-placeholder" aria-label={`${name} has no restaurant photo`}>
            <Utensils size={34} />
          </div>
        )}
        <div className="card-badge">
          <Star size={12} fill="currentColor" /> {rating}
        </div>
      </div>
      <div className="card-content">
        <h3 className="card-title">{name}</h3>
        <div className="card-details">
          <span className="card-location">
            <MapPin size={14} /> {location}
          </span>
          {priceLevel && <span className="card-price">{priceLevel}</span>}
        </div>
        <div className="card-reviews">
          <span className="star-rating">
            <Star size={14} fill="var(--primary)" color="var(--primary)" /> {rating}
          </span>
          <span className="review-count">({reviews})</span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
