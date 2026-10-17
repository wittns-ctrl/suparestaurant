import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees after each test
afterEach(() => {
  cleanup();
});

// jsdom lacks AbortSignal events used by fetch polyfills in some paths
if (!window.abortControllerShimmed) {
  window.abortControllerShimmed = true;
}
