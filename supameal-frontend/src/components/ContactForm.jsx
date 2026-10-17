import { useState } from 'react';
import { motion } from 'framer-motion';
import { mailApi } from '../services/api';

const ContactForm = () => {
  const [form, setForm] = useState({ fullName: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await mailApi.contact(form);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send');
    }
  };

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '2rem' }}>
        <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Message sent!</h3>
        <p style={{ color: 'var(--text-muted)' }}>We'll get back to you shortly.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        className="auth-input"
        placeholder="Your Name"
        value={form.fullName}
        onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        required
      />
      <input
        className="auth-input"
        type="email"
        placeholder="Email Address"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        required
      />
      <textarea
        className="auth-input"
        rows="5"
        placeholder="How can we help?"
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        required
        style={{ resize: 'vertical' }}
      />
      {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</p>}
      <button type="submit" className="gold-button">Send Message</button>
    </form>
  );
};

export default ContactForm;
