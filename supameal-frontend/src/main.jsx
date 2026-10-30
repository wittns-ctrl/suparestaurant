import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './styles/global.css'
import App from './App.jsx'
import { sanitizeAnalyticsEvent } from './utils/analytics'

// Providers (Auth, Cart, Theme, Toast, Notifications) live inside App — wrapping
// them here too would mount each twice and run duplicated refresh intervals.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      {/* Vercel Web Analytics. beforeSend strips tokens/emails/ids from URLs
          (see utils/analytics.js) so nothing sensitive reaches the dashboard. */}
      <Analytics beforeSend={sanitizeAnalyticsEvent} />
    </BrowserRouter>
  </StrictMode>,
);
