import { useState } from 'react';
import { MapPin, Phone, Mail, Send } from 'lucide-react';
import Button from '../../components/Button/Button';
import { mailApi } from '../../services/api';
import './ContactUs.css';

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'mugishawitness15@gmail.com';

const ContactUs = () => {
  const [form, setForm] = useState({ fullName: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSent(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await mailApi.contact(form);
      setSent(true);
      setForm({ fullName: '', email: '', message: '' });
    } catch (err) {
      setError(err?.message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="contact-us">
      <div className="container">
        <div className="contact-grid">
          <div className="contact-info">
            <p className="section-subtitle text-primary">GET IN TOUCH</p>
            <h2 className="section-title">We'd Love to Hear <span className="text-primary">From You</span></h2>
            <p className="contact-description">
              Have a question about our services, want to partner with us, or just want to say hi? Drop us a message and we'll get back to you as soon as possible.
            </p>
            
            <div className="contact-details">
              <div className="contact-detail-item">
                <div className="contact-icon-wrapper">
                  <MapPin className="text-primary" size={20} />
                </div>
                <div>
                  <strong>Office Location</strong>
                  <p>123 SupaMeal Ave, Kigali, Rwanda</p>
                </div>
              </div>
              
              <div className="contact-detail-item">
                <div className="contact-icon-wrapper">
                  <Phone className="text-primary" size={20} />
                </div>
                <div>
                  <strong>Phone Number</strong>
                  <p><a href="tel:+250736752015">0736752015</a></p>
                </div>
              </div>
              
              <div className="contact-detail-item">
                <div className="contact-icon-wrapper">
                  <Mail className="text-primary" size={20} />
                </div>
                <div>
                  <strong>Email Address</strong>
                  <p><a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="contact-form-wrapper">
            <form className="contact-form" onSubmit={handleSubmit}>
              <h3>Send us a message</h3>
              {sent && <p role="status" aria-live="polite" style={{ color: 'var(--success)', marginBottom: '1rem' }}>Message sent successfully!</p>}
              {error && <p role="alert" style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}
              
              <div className="form-group">
                <label htmlFor="contact-full-name">Full Name</label>
                <input id="contact-full-name" autoComplete="name" type="text" placeholder="John Doe" className="form-input" maxLength={100} required value={form.fullName} onChange={e => updateField('fullName', e.target.value)} />
              </div>
              
              <div className="form-group">
                <label htmlFor="contact-email">Email Address</label>
                <input id="contact-email" autoComplete="email" type="email" placeholder="john@example.com" className="form-input" maxLength={254} required value={form.email} onChange={e => updateField('email', e.target.value)} />
              </div>
              
              <div className="form-group">
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" placeholder="How can we help you?" className="form-input" rows="5" minLength={10} maxLength={5000} required value={form.message} onChange={e => updateField('message', e.target.value)}></textarea>
              </div>
              
              <Button variant="primary" type="submit" className="contact-submit-btn" disabled={sending}>
                <Send size={18} /> {sending ? 'Sending…' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
