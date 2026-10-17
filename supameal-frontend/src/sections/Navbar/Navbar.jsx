import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import Button from '../../components/Button/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import Logo from '../../components/Logo/Logo';
import { useAuth } from '../../context/AuthContext';
import { homeForUser } from '../../utils/auth';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const dashboardUrl = homeForUser(user);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setIsMobileMenuOpen(false);
    logout();
    navigate('/home', { replace: true });
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setIsMobileMenuOpen(false);
  }, [location]);

  const goToSection = (hash) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else navigate(`/#${hash}`);
    } else {
      navigate(`/#${hash}`);
    }
  };

  const navLinks = [
    { name: 'Home', action: () => { setIsMobileMenuOpen(false); navigate('/'); } },
    {
      name: 'Services',
      dropdown: [
        { name: 'Restaurants', to: '/restaurants' },
        { name: 'Book a Table', to: '/book-table' },
        { name: 'Order Online', to: '/customer/dashboard' },
        { name: 'For Owners', to: '/owner-login' },
      ],
    },
    { name: 'About Us', action: () => goToSection('about') },
    { name: 'FAQ', action: () => goToSection('faq') },
    { name: 'Contact Us', action: () => goToSection('contact') },
  ];

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo-link" onClick={() => setIsMobileMenuOpen(false)}>
          <Logo />
        </Link>

        {/* Central navigation links */}
        <div className={`navbar-links ${isMobileMenuOpen ? 'open' : ''}`}>
          {navLinks.map((link, index) => (
            <div key={index} className="nav-item">
              {link.dropdown ? (
                <>
                  <span className="nav-link nav-link-dropdown" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {link.name} <ChevronDown size={14} style={{ opacity: 0.7 }} />
                  </span>
                  <div className="nav-dropdown">
                    {link.dropdown.map((sublink) => (
                      <Link
                        key={sublink.name}
                        to={sublink.to}
                        className="dropdown-link"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {sublink.name}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <button type="button" className="nav-link nav-link-btn" onClick={link.action}>
                  {link.name}
                </button>
              )}
            </div>
          ))}

          {/* Mobile-only auth buttons (hidden on desktop via .navbar-actions-mobile) */}
          <div className="navbar-actions-mobile">
            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <Link to={dashboardUrl} style={{ width: '100%' }} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" style={{ width: '100%' }}>
                    <LayoutDashboard size={16} /> Dashboard ({user?.name?.split(' ')[0] || 'Account'})
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  style={{ width: '100%' }}
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  <LogOut size={16} /> Log Out
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <Link to="/login" style={{ width: '100%' }} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" style={{ width: '100%' }}>
                    <LogIn size={16} /> Sign In
                  </Button>
                </Link>
                <Link to="/signup" style={{ width: '100%' }} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" style={{ width: '100%' }}>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Desktop-only auth actions (positioned on the right) */}
        <div className="navbar-actions-desktop">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to={dashboardUrl} style={{ textDecoration: 'none' }}>
                <Button variant="primary">
                  <LayoutDashboard size={16} /> {user?.name?.split(' ')[0] || 'Dashboard'}
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(true)}
                title="Log Out"
              >
                <LogOut size={16} />
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline"><LogIn size={16} /> Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary">Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {showLogoutConfirm && (
        <ConfirmDialog
          title="Log out of your account?"
          description="You’ll be signed out and returned to the SupaMeal home page."
          confirmLabel="Log out"
          tone="primary"
          variant="logout"
          Icon={LogOut}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={confirmLogout}
        />
      )}
    </nav>
  );
};

export default Navbar;
