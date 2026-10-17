import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { newsletterApi } from '../services/api';
import Navbar from '../sections/Navbar/Navbar';
import Footer from '../sections/Footer/Footer';
import './FooterInfoPage.css';

export default function NewsletterUnsubscribePage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    newsletterApi.unsubscribe(token)
      .then(() => { if (active) setStatus('done'); })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [token]);

  return (
    <>
      <Navbar />
      <main className="footer-info-page">
        <div className="footer-info-container">
          <article className="footer-info-card">
            <div className="footer-info-icon"><MailCheck size={24} /></div>
            <p className="footer-info-eyebrow">NEWSLETTER PREFERENCES</p>
            <h1>{status === 'done' ? 'You’re unsubscribed' : status === 'error' ? 'Could not update preferences' : 'Updating preferences…'}</h1>
            <p className="footer-info-intro">
              {status === 'done'
                ? 'You will no longer receive SupaMeal newsletter updates at this address.'
                : status === 'error'
                  ? 'Please try the unsubscribe link again or contact our support team.'
                  : 'Please wait while we update your newsletter preferences.'}
            </p>
            <div className="footer-info-actions">
              {status !== 'loading' && <Link className="footer-info-primary" to="/home">Return to SupaMeal</Link>}
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
