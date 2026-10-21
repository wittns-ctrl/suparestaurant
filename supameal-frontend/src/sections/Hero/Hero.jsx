import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button/Button';
import heroImage from '../../assets/images/hero_food.png';
import './Hero.css';

const heroSlides = [
  '/images/hero-slides/hero-01-scallops.png',
  '/images/hero-slides/hero-02-tomato-basil-pasta.png',
  '/images/hero-slides/hero-03-gourmet-burger.png',
  '/images/hero-slides/hero-04-salmon.png',
  '/images/hero-slides/hero-05-herb-roasted-chicken.png',
];

const Hero = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5_000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-gradient"></div>
        {heroSlides.map((image, index) => (
          <img
            key={image}
            src={image}
            alt=""
            aria-hidden="true"
            className={`hero-image${index === activeSlide ? ' hero-image--active' : ''}`}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = heroImage;
            }}
          />
        ))}
      </div>
      
      <div className="container hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🔥</span> DISCOVER, BOOK, ENJOY
          </div>
          
          <h1 className="hero-title">
            Dine In or<br />
            Order for<br />
            <span className="text-primary">Delivery</span>
          </h1>
          
          <p className="hero-subtitle">
            Explore the best restaurants, book your favorite tables, 
            or order delicious meals delivered right to your door.
          </p>
          
          <div className="hero-actions">
            <Link to="/book-table">
              <Button variant="primary">Find a Table</Button>
            </Link>
            <Link to="/customer/dashboard">
              <Button variant="outline">
                Order Now <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
          
          <div className="hero-features">
            <div className="feature-item">
              <CheckCircle2 className="feature-icon text-primary" size={20} />
              <div>
                <strong>No Booking Fees</strong>
                <p>100% free to book</p>
              </div>
            </div>
            <div className="feature-item">
              <Clock className="feature-icon text-primary" size={20} />
              <div>
                <strong>Instant Confirmation</strong>
                <p>Quick & easy bookings</p>
              </div>
            </div>
            <div className="feature-item">
              <ShieldCheck className="feature-icon text-primary" size={20} />
              <div>
                <strong>Secure & Reliable</strong>
                <p>Your data is protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
