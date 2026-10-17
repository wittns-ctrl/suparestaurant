import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaTwitter, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa';
import Button from '../../components/Button/Button';
import Logo from '../../components/Logo/Logo';
import { newsletterApi } from '../../services/api';
import './Footer.css';

const Footer = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState(null);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || newsletterState === 'loading') return;
    setNewsletterState('loading');
    try {
      const result = await newsletterApi.subscribe(newsletterEmail.trim());
      if (result.alreadySubscribed) {
        setNewsletterState('already-subscribed');
        return;
      }
      setNewsletterState(result.emailSent ? 'done' : 'saved');
      setNewsletterEmail('');
    } catch {
      setNewsletterState('error');
    }
  };

  const whatsappPhone = (import.meta.env.VITE_WHATSAPP_PHONE || '').replace(/\D/g, '');
  const socialLinks = [
    { label: 'Facebook', href: import.meta.env.VITE_SOCIAL_FACEBOOK_URL, Icon: FaFacebookF },
    { label: 'Instagram', href: import.meta.env.VITE_SOCIAL_INSTAGRAM_URL, Icon: FaInstagram },
    { label: 'Twitter', href: import.meta.env.VITE_SOCIAL_TWITTER_URL || import.meta.env.VITE_SOCIAL_X_URL, Icon: FaTwitter },
    { label: 'LinkedIn', href: import.meta.env.VITE_SOCIAL_LINKEDIN_URL, Icon: FaLinkedinIn },
    {
      label: 'WhatsApp',
      href: import.meta.env.VITE_SOCIAL_WHATSAPP_URL || (whatsappPhone ? `https://wa.me/${whatsappPhone}` : ''),
      Icon: FaWhatsapp,
    },
  ].map((link) => ({
    ...link,
    href: /^https?:\/\//i.test(link.href?.trim() || '') ? link.href.trim() : '',
  }));

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <Link to="/home" className="footer-logo-link">
              <Logo />
            </Link>
            <p className="footer-description">
              Making every meal special with the best<br />
              restaurants and seamless bookings.
            </p>
            <div className="social-links" aria-label="SupaMeal social media">
              {socialLinks.map(({ label, href, Icon }) => href ? (
                <a key={label} href={href} className="social-link" aria-label={label} title={label} target="_blank" rel="noopener noreferrer">
                  <Icon size={16} />
                </a>
              ) : (
                <span key={label} className="social-link social-link--unconfigured" aria-label={label} title={`${label} profile is not configured`} aria-disabled="true">
                  <Icon size={16} />
                </span>
              ))}
            </div>
          </div>
          
          <div className="footer-links-group">
            <h4 className="footer-heading">COMPANY</h4>
            <ul className="footer-links">
            <li><Link to="/home#about">About Us</Link></li>
            <li><Link to="/company/careers">Careers</Link></li>
            <li><Link to="/company/blog">Blog</Link></li>
            <li><Link to="/company/press">Press</Link></li>
            </ul>
          </div>
          
          <div className="footer-links-group">
            <h4 className="footer-heading">SUPPORT</h4>
            <ul className="footer-links">
            <li><Link to="/company/help">Help Center</Link></li>
            <li><Link to="/home#contact">Contact Us</Link></li>
            <li><Link to="/company/terms">Terms & Conditions</Link></li>
            <li><Link to="/company/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div className="footer-links-group">
            <h4 className="footer-heading">FOR RESTAURANTS</h4>
            <ul className="footer-links">
            <li><Link to="/register-restaurant">Partner with Us</Link></li>
              <li><Link to="/owner-login">Restaurant Login</Link></li>
            <li><Link to="/company/resources">Resources</Link></li>
            </ul>
          </div>
          
          <div className="footer-newsletter">
            <h4 className="footer-heading">NEWSLETTER</h4>
            <p className="newsletter-text">Subscribe to get the latest updates and exclusive offers.</p>
            <div className="newsletter-input-wrapper">
              <form onSubmit={handleSubscribe} style={{ display: 'contents' }}>
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="newsletter-input"
                  value={newsletterEmail}
                  onChange={e => {
                    setNewsletterEmail(e.target.value);
                    setNewsletterState(null);
                  }}
                />
                  <button className="newsletter-btn" type="submit" aria-label="Subscribe to newsletter" disabled={newsletterState === 'loading'}>
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
            {newsletterState === 'loading' && <p className="newsletter-feedback" role="status">Subscribing…</p>}
            {newsletterState === 'done' && <p className="newsletter-feedback newsletter-feedback--success" role="status">You’re subscribed. Check your inbox for a welcome email.</p>}
            {newsletterState === 'saved' && <p className="newsletter-feedback" role="status">You’re subscribed. Email delivery is temporarily unavailable.</p>}
            {newsletterState === 'already-subscribed' && <p className="newsletter-feedback newsletter-feedback--error" role="status">This email is already subscribed.</p>}
            {newsletterState === 'error' && <p className="newsletter-feedback newsletter-feedback--error" role="alert">Subscription failed. Please try again.</p>}
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} SupaMeal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
