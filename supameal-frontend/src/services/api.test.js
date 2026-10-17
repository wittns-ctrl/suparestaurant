import { describe, it, expect } from 'vitest';
import { resolveImageUrl, API_URL } from './api';

// API_URL is captured once at module load (VITE_API_URL or localhost:3000
// default) — assert against the real value rather than trying to override it.
describe('resolveImageUrl', () => {
  it('resolves /uploads/ paths against the API origin', () => {
    expect(resolveImageUrl('/uploads/abc-123.jpg')).toBe(
      `${API_URL}/uploads/abc-123.jpg`,
    );
  });

  it('passes https URLs through unchanged', () => {
    const url = 'https://images.example.com/food.jpg';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('passes http URLs through unchanged', () => {
    const url = 'http://cdn.example.com/pic.png';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('returns null for empty, undefined, or junk values', () => {
    expect(resolveImageUrl('')).toBeNull();
    expect(resolveImageUrl(undefined)).toBeNull();
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl('🍽️')).toBeNull();
    expect(resolveImageUrl('not-a-url')).toBeNull();
  });
});
