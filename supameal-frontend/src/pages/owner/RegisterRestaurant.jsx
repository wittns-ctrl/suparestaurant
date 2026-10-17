import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, Mail, Lock, User } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/Button/Button';
import Loader from '../../components/Loader/Loader';
import { authApi } from '../../services/api';
import '../auth/AuthForm.css';

const registrationDraftKey = 'restaurantRegistrationDraft';

const loadRegistrationDraft = () => {
  const empty = { restaurantName: '', contactNumber: '', fullAddress: '' };
  try {
    return { ...empty, ...JSON.parse(sessionStorage.getItem(registrationDraftKey) || '{}') };
  } catch {
    return empty;
  }
};

export default function RegisterRestaurant() {
  const navigate = useNavigate();
  const [form, setForm] = useState(loadRegistrationDraft);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try { sessionStorage.setItem(registrationDraftKey, JSON.stringify(form)); } catch { /* optional draft */ }
  }, [form]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.ownerSignup({
        name: ownerName.trim(),
        email: ownerEmail.trim(),
        password: ownerPassword,
        phone: form.contactNumber.trim(),
        restaurant: {
          name: form.restaurantName.trim(),
          description: `${form.restaurantName.trim()} - registered via SupaMeal`,
          location: { address: form.fullAddress.trim(), city: 'Downtown', latitude: 0, longitude: 0 },
          phone: form.contactNumber.trim(),
          opening: 'Mon-Sun: 10:00 AM - 10:00 PM',
          capacity: 50,
          cuisine: 'International',
          images: [],
        },
      });
      sessionStorage.removeItem(registrationDraftKey);
      localStorage.setItem('pendingVerificationEmail', ownerEmail.trim());
      localStorage.setItem('pendingVerificationRealm', 'owner');
      localStorage.setItem('pendingVerificationRedirect', '/owner-login?status=pending');
      navigate('/verify-otp');
    } catch (err) {
      setError(err.message || 'Restaurant registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Creating owner account and submitting your application..." />;

  return (
    <AuthLayout className="auth-layout--signup auth-layout--owner-register" title="Partner with us" subtitle="Create a separate restaurant owner account and submit your restaurant for review.">
      <div className="signup-form-content">
        <div className="auth-form-header">
          <Store size={32} className="auth-form-icon" />
          <h3>Owner Account & Restaurant Application</h3>
          <p>Verify your email, then wait for admin approval to access the owner portal.</p>
        </div>
        {error && <p role="alert" className="auth-form-error">{error}</p>}
        <form onSubmit={handleRegister}>
          <div className="auth-input-group">
            <label htmlFor="owner-name">Owner Name</label>
            <div className="auth-input-wrapper"><User size={18} className="auth-input-icon" /><input id="owner-name" type="text" className="auth-input" required maxLength={100} autoComplete="name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></div>
          </div>
          <div className="auth-input-group">
            <label htmlFor="owner-email">Owner Account Email</label>
            <div className="auth-input-wrapper"><Mail size={18} className="auth-input-icon" /><input id="owner-email" type="email" autoComplete="email" placeholder="you@example.com" className="auth-input" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></div>
          </div>
          <div className="auth-input-group">
            <label htmlFor="owner-password">Owner Account Password</label>
            <div className="auth-input-wrapper"><Lock size={18} className="auth-input-icon" /><input id="owner-password" type="password" autoComplete="new-password" placeholder="At least 15 characters" className="auth-input" required minLength={15} maxLength={72} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} /></div>
          </div>
          <div className="auth-input-group">
            <label htmlFor="restaurant-name">Restaurant Name</label>
            <div className="auth-input-wrapper"><Store size={18} className="auth-input-icon" /><input id="restaurant-name" type="text" className="auth-input" required minLength={2} maxLength={120} value={form.restaurantName} onChange={update('restaurantName')} /></div>
          </div>
          <div className="auth-input-group">
            <label htmlFor="restaurant-phone">Restaurant Contact Number</label>
            <div className="auth-input-wrapper"><Phone size={18} className="auth-input-icon" /><input id="restaurant-phone" type="tel" className="auth-input" required pattern="[+0-9 ()-]{7,20}" value={form.contactNumber} onChange={update('contactNumber')} /></div>
          </div>
          <div className="auth-input-group">
            <label htmlFor="restaurant-address">Restaurant Address</label>
            <div className="auth-input-wrapper"><MapPin size={18} className="auth-input-icon" /><input id="restaurant-address" type="text" className="auth-input" required minLength={3} value={form.fullAddress} onChange={update('fullAddress')} /></div>
          </div>
          <Button variant="primary" className="auth-submit-btn" type="submit">Create Owner Account & Apply</Button>
        </form>
        <div className="auth-footer owner-register-footer"><span>Already an owner?</span><Link to="/owner-login" className="auth-footer-link">Owner Login</Link></div>
        <div className="auth-footer owner-register-footer"><span>Customer account?</span><Link to="/login" className="auth-footer-link">Customer Login</Link></div>
      </div>
    </AuthLayout>
  );
}
