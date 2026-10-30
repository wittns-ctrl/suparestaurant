import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button/Button';
import heroImage from '../../assets/images/hero_food.webp';
import './Hero.css';

// Each slide ships in two sizes; the browser picks the one that fits the screen
// (phones fetch ~30 KB instead of the desktop image).
const SLIDE_NAMES = [
  'hero-01-scallops',
  'hero-02-tomato-basil-pasta',
  'hero-03-gourmet-burger',
  'hero-04-salmon',
  'hero-05-herb-roasted-chicken',
];

const heroSlides = SLIDE_NAMES.map((name) => ({
  src: `/images/hero-slides/${name}-1600.webp`,
  srcSet: `/images/hero-slides/${name}-960.webp 960w, /images/hero-slides/${name}-1600.webp 1600w`,
}));

const SLIDE_INTERVAL_MS = 5_000;

const Hero = () => {
  // `reached` is the last slide that has been put on the page. Only the visible
  // slide and the next one are loaded up front; the rest are fetched as the
  // carousel approaches them instead of downloading every slide on page load.
  const [slideState, setSlideState] = useState({ active: 0, reached: 1 });
  const { active: activeSlide, reached } = slideState;

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return undefined;

    const intervalId = window.setInterval(() => {
      setSlideState((current) => {
        const next = (current.active + 1) % heroSlides.length;
        return {
          active: next,
          reached: Math.max(current.reached, Math.min(next + 1, heroSlides.length - 1)),
        };
      });
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-gradient"></div>
        {heroSlides.slice(0, reached + 1).map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            srcSet={slide.srcSet}
            sizes="(max-width: 768px) 100vw, 65vw"
            alt=""
            aria-hidden="true"
            decoding="async"
            // The first slide is the page's main visual: fetch it first.
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className={`hero-image${index === activeSlide ? ' hero-image--active' : ''}`}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.removeAttribute('srcset');
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
