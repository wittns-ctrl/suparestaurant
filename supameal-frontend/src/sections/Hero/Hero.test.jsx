import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from './Hero';

const renderHero = () =>
  render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );

const slideImages = (container) => [...container.querySelectorAll('img.hero-image')];

describe('Hero slideshow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads only the visible slide and the next one up front (not all five)', () => {
    const { container } = renderHero();
    expect(slideImages(container)).toHaveLength(2);
  });

  it('prioritises the first slide and serves two sizes of every slide', () => {
    const { container } = renderHero();
    const [first, second] = slideImages(container);
    expect(first.getAttribute('fetchpriority')).toBe('high');
    expect(second.getAttribute('fetchpriority')).toBe('auto');
    expect(first.getAttribute('srcset')).toMatch(/-960\.webp 960w, .*-1600\.webp 1600w/);
    expect(first.getAttribute('src')).toMatch(/\.webp$/);
  });

  it('loads one more slide each time the carousel advances, and never repeats one', () => {
    const { container } = renderHero();
    for (const expected of [3, 4, 5, 5, 5]) {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(slideImages(container)).toHaveLength(expected);
    }
  });

  it('shows exactly one slide as active', () => {
    const { container } = renderHero();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.querySelectorAll('img.hero-image--active')).toHaveLength(1);
  });

  it('does not rotate (and loads nothing extra) when the user prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { container } = renderHero();
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(slideImages(container)).toHaveLength(2);
  });
});
