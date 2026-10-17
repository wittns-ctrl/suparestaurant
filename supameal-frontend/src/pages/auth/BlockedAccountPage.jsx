import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, ShieldAlert } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import './BlockedAccountPage.css';

export const isBlockedAccountError = (error) =>
  /ACCOUNT_BLOCKED|account is blocked|account has been blocked/i.test(error?.message || String(error || ''));

const BlockedAccountPage = () => (
  <AuthLayout
    className="auth-layout--blocked-account"
    title="Account access"
    subtitle="Your SupaMeal account is currently unavailable. Contact support if you believe this is a mistake."
    backTo="/home"
  >
    <main className="blocked-account-page" aria-labelledby="blocked-account-title">
      <div className="blocked-account-page-icon" aria-hidden="true">
        <ShieldAlert size={26} />
      </div>
      <p className="blocked-account-eyebrow">ACCOUNT ACCESS</p>
      <h1 id="blocked-account-title">Your account has been blocked</h1>
      <p className="blocked-account-description">
        An administrator has blocked access to this account. Contact us if you need help or believe this happened by mistake.
      </p>

      <div className="blocked-account-support">
        <h2>Contact SupaMeal support</h2>
        <a className="blocked-account-contact blocked-account-contact-primary" href="https://wa.me/250736752015" target="_blank" rel="noreferrer">
          <MessageCircle size={19} aria-hidden="true" />
          <span><small>Text us on WhatsApp</small><strong>0736752015</strong></span>
        </a>
        <a className="blocked-account-contact" href="mailto:mugishawitness15@gmail.com">
          <Mail size={19} aria-hidden="true" />
          <span><small>Email support</small><strong>mugishawitness15@gmail.com</strong></span>
        </a>
      </div>

      <Link className="blocked-account-home-button" to="/home">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Home
      </Link>
    </main>
  </AuthLayout>
);

export default BlockedAccountPage;
