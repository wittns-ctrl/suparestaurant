import { describe, it, expect } from 'vitest';
import { optimizeImageUrl, imageSrcSet, nearestWidth, isCloudinaryUrl } from './images';

const BASE = 'https://res.cloudinary.com/demo-cloud/image/upload';

describe('optimizeImageUrl', () => {
  it('adds automatic format, quality and a width cap to Cloudinary photos', () => {
    expect(optimizeImageUrl(`${BASE}/v1700000000/supameal/abc.jpg`, 640)).toBe(
      `${BASE}/f_auto,q_auto,w_640,c_limit/v1700000000/supameal/abc.jpg`,
    );
  });

  it('works when the URL has no version segment', () => {
    expect(optimizeImageUrl(`${BASE}/supameal/abc.png`, 300)).toBe(
      `${BASE}/f_auto,q_auto,w_320,c_limit/supameal/abc.png`,
    );
  });

  it('snaps widths to fixed steps so variants are shared and cached', () => {
    expect(nearestWidth(1)).toBe(320);
    expect(nearestWidth(500)).toBe(640);
    expect(nearestWidth(961)).toBe(1280);
    expect(nearestWidth(99999)).toBe(1600);
    expect(nearestWidth(undefined)).toBe(640);
  });

  it('does not add a second transformation to an already transformed URL', () => {
    const done = `${BASE}/f_auto,q_auto,w_640,c_limit/supameal/abc.jpg`;
    expect(optimizeImageUrl(done, 1600)).toBe(done);
  });

  it('leaves non-Cloudinary and non-http values completely alone', () => {
    for (const value of [
      '/uploads/abc.jpg',
      'https://images.example.com/food.jpg',
      'data:image/png;base64,AAAA',
      '/assets/hero_food-h6piRils.webp',
      '',
      undefined,
      null,
    ]) {
      expect(optimizeImageUrl(value, 640)).toBe(value);
    }
  });

  it('only recognises Cloudinary image uploads over https', () => {
    expect(isCloudinaryUrl(`${BASE}/a.jpg`)).toBe(true);
    expect(isCloudinaryUrl('http://res.cloudinary.com/x/image/upload/a.jpg')).toBe(false);
    expect(isCloudinaryUrl('https://res.cloudinary.com/x/video/upload/a.mp4')).toBe(false);
  });
});

describe('imageSrcSet', () => {
  it('offers a 1x and a 2x variant', () => {
    expect(imageSrcSet(`${BASE}/supameal/abc.jpg`, 480)).toBe(
      `${BASE}/f_auto,q_auto,w_480,c_limit/supameal/abc.jpg 480w, ` +
        `${BASE}/f_auto,q_auto,w_960,c_limit/supameal/abc.jpg 960w`,
    );
  });

  it('does not repeat a variant when 1x and 2x land on the same step', () => {
    expect(imageSrcSet(`${BASE}/supameal/abc.jpg`, 1600)).toBe(
      `${BASE}/f_auto,q_auto,w_1600,c_limit/supameal/abc.jpg 1600w`,
    );
  });

  it('is undefined for images that are not on Cloudinary', () => {
    expect(imageSrcSet('/uploads/abc.jpg', 480)).toBeUndefined();
  });
});
