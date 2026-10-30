import { describe, it, expect } from 'vitest';
import { sanitizeAnalyticsUrl, sanitizeAnalyticsEvent } from './analytics';

const SITE = 'https://supameal.vercel.app';

describe('sanitizeAnalyticsUrl', () => {
  it('removes a password-reset token from the query string', () => {
    expect(
      sanitizeAnalyticsUrl(`${SITE}/reset-password?token=abc123&accountType=customer`),
    ).toBe(`${SITE}/reset-password`);
  });

  it('removes the one-time OAuth code', () => {
    expect(sanitizeAnalyticsUrl(`${SITE}/auth/callback?code=1f2e3d`)).toBe(
      `${SITE}/auth/callback`,
    );
  });

  it('removes an email address from the query string', () => {
    expect(
      sanitizeAnalyticsUrl(`${SITE}/verify-otp?email=jane%40example.com`),
    ).toBe(`${SITE}/verify-otp`);
  });

  it('removes URL fragments', () => {
    expect(sanitizeAnalyticsUrl(`${SITE}/restaurants#secret`)).toBe(
      `${SITE}/restaurants`,
    );
  });

  it('masks order, restaurant, menu and unsubscribe ids in the path', () => {
    expect(sanitizeAnalyticsUrl(`${SITE}/order-tracking/6ae314774f4ccaba11999eca`)).toBe(
      `${SITE}/order-tracking/:id`,
    );
    expect(sanitizeAnalyticsUrl(`${SITE}/restaurants/6ae314774f4ccaba11999eca`)).toBe(
      `${SITE}/restaurants/:id`,
    );
    expect(sanitizeAnalyticsUrl(`${SITE}/menu/6ae314774f4ccaba11999eca`)).toBe(
      `${SITE}/menu/:id`,
    );
    expect(sanitizeAnalyticsUrl(`${SITE}/newsletter/unsubscribe/tok_9f8e7d`)).toBe(
      `${SITE}/newsletter/unsubscribe/:token`,
    );
  });

  it('leaves ordinary pages unchanged', () => {
    expect(sanitizeAnalyticsUrl(`${SITE}/restaurants`)).toBe(`${SITE}/restaurants`);
    expect(sanitizeAnalyticsUrl(`${SITE}/home`)).toBe(`${SITE}/home`);
    expect(sanitizeAnalyticsUrl(`${SITE}/company/about`)).toBe(`${SITE}/company/about`);
  });

  it('still strips query and hash when the URL cannot be parsed', () => {
    expect(sanitizeAnalyticsUrl('/reset-password?token=abc#x')).toBe('/reset-password');
  });

  it('passes non-string values through untouched', () => {
    expect(sanitizeAnalyticsUrl(undefined)).toBeUndefined();
  });
});

describe('sanitizeAnalyticsEvent', () => {
  it('keeps the event type and returns the event (never drops page views)', () => {
    const cleaned = sanitizeAnalyticsEvent({
      type: 'pageview',
      url: `${SITE}/reset-password?token=abc`,
    });
    expect(cleaned).toEqual({ type: 'pageview', url: `${SITE}/reset-password` });
  });

  it('does not throw on an event without a url', () => {
    expect(sanitizeAnalyticsEvent({ type: 'event' })).toEqual({ type: 'event', url: undefined });
  });
});
