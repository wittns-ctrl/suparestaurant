// Cleans page URLs before Vercel Web Analytics sends them.
//
// Several SupaMeal URLs carry secrets or personal data — password-reset tokens
// (/reset-password?token=…), one-time OAuth codes (/auth/callback?code=…),
// emails (/verify-otp?email=…), unsubscribe tokens and order ids in the path.
// Analytics records the page URL, so without this they would be copied into a
// third-party dashboard. Query strings and hashes are dropped entirely, and
// path segments that are ids/tokens are replaced with a placeholder, which
// also groups every restaurant/order page into one row of the report.
const MASKED_PATHS = [
  [/^\/restaurants\/[^/]+/, '/restaurants/:id'],
  [/^\/order-tracking\/[^/]+/, '/order-tracking/:id'],
  [/^\/menu\/[^/]+/, '/menu/:id'],
  [/^\/newsletter\/unsubscribe\/[^/]+/, '/newsletter/unsubscribe/:token'],
];

export function sanitizeAnalyticsUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return rawUrl;
  try {
    const url = new URL(rawUrl);
    url.search = '';
    url.hash = '';
    let path = url.pathname;
    for (const [pattern, replacement] of MASKED_PATHS) {
      path = path.replace(pattern, replacement);
    }
    url.pathname = path;
    return url.toString();
  } catch {
    // Not a parseable absolute URL: still never let a query or hash through.
    return rawUrl.split(/[?#]/)[0];
  }
}

// Passed to <Analytics beforeSend={…} />. Always returns the event (never
// null) so ordinary page views are still counted.
export function sanitizeAnalyticsEvent(event) {
  return { ...event, url: sanitizeAnalyticsUrl(event?.url) };
}
