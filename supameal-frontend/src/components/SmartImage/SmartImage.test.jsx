import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SmartImage from './SmartImage';

const ORIGINAL = 'https://res.cloudinary.com/demo-cloud/image/upload/v1/supameal/abc.jpg';

describe('SmartImage', () => {
  it('lazy-loads and decodes asynchronously by default', () => {
    const { container } = render(<SmartImage src="/assets/x.webp" alt="x" />);
    const img = container.querySelector('img');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('loads eagerly when asked (above-the-fold images)', () => {
    const { container } = render(<SmartImage src="/assets/x.webp" alt="x" eager />);
    expect(container.querySelector('img').getAttribute('loading')).toBe('eager');
  });

  it('leaves non-Cloudinary images untouched (no srcset, same src)', () => {
    const { container } = render(<SmartImage src="/assets/x.webp" alt="x" />);
    const img = container.querySelector('img');
    expect(img.getAttribute('src')).toBe('/assets/x.webp');
    expect(img.hasAttribute('srcset')).toBe(false);
  });

  it('requests a resized, auto-format version of Cloudinary photos', () => {
    const { container } = render(<SmartImage src={ORIGINAL} alt="x" width={480} />);
    const img = container.querySelector('img');
    expect(img.getAttribute('src')).toContain('/f_auto,q_auto,w_480,c_limit/');
    expect(img.getAttribute('srcset')).toContain('w_960');
  });

  it('falls back to the original URL once if the optimised one fails', () => {
    const { container } = render(<SmartImage src={ORIGINAL} alt="x" width={480} />);
    const img = container.querySelector('img');
    fireEvent.error(img);
    const after = container.querySelector('img');
    expect(after.getAttribute('src')).toBe(ORIGINAL);
    expect(after.hasAttribute('srcset')).toBe(false);
  });

  it('forwards className and style', () => {
    const { container } = render(
      <SmartImage src="/assets/x.webp" alt="x" className="card-image" style={{ width: '100%' }} />,
    );
    const img = container.querySelector('img');
    expect(img.className).toBe('card-image');
    expect(img.style.width).toBe('100%');
  });
});
