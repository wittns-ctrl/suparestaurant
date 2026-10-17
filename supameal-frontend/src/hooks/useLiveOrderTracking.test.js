import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLiveOrderTracking } from './useLiveOrderTracking';

const ORDER = { id: 'o1', status: 'preparing', eta: '25-35 min' };

describe('useLiveOrderTracking', () => {
  let originalEventSource;
  let closeSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    originalEventSource = window.EventSource;
    // One shared close spy across all EventSource instances the hook creates.
    // NOTE: the implementation must be a regular function — `new` on an arrow
    // implementation throws inside vitest mocks.
    closeSpy = vi.fn();
    window.EventSource = vi.fn(function FakeEventSource() {
      return {
        close: closeSpy,
        onopen: null,
        onerror: null,
        addEventListener: vi.fn(),
      };
    });
    window.localStorage.setItem('accessToken', 'tok');
  });

  afterEach(() => {
    window.EventSource = originalEventSource;
    vi.unstubAllGlobals();
  });

  it('loads the order on mount', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ORDER,
      }),
    );

    const { result } = renderHook(() => useLiveOrderTracking('order-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.order).toEqual(ORDER);
    expect(result.current.live).toBe(false); // EventSource never opens in test
  });

  it('reports not-loading and no order when orderId is missing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useLiveOrderTracking(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.order).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('exposes loadFailed when the API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'boom' }),
      }),
    );

    const { result } = renderHook(() => useLiveOrderTracking('order-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.order).toBeNull();
    expect(result.current.loadFailed).toBe(true);
  });

  it('closes the stream when the connection errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ORDER,
      }),
    );

    const { result } = renderHook(() => useLiveOrderTracking('order-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // The hook opens the stream asynchronously after the ticket fetch
    await waitFor(() => expect(window.EventSource).toHaveBeenCalled());

    // Simulate a dropped connection — the hook must close the socket
    // (it may reconnect after backoff, but the errored one gets closed)
    const instance = window.EventSource.mock.results[0].value;
    act(() => {
      instance.onerror?.(new Event('error'));
    });
    expect(closeSpy).toHaveBeenCalled();
  });
});
