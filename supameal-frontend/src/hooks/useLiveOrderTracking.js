import { useState, useEffect, useRef, useCallback } from 'react';
import { ordersApi, API_URL } from '../services/api';

const MAX_RETRIES = 5;
const BASE_RETRY_MS = 2000;
const FALLBACK_POLL_MS = 15000;

/**
 * Live order tracking via Server-Sent Events.
 *
 * Flow: fetch a one-time ticket with the JWT → open EventSource with the
 * ticket → receive 'update' events pushed by the backend on status change.
 * Falls back to 15s polling automatically if SSE fails, and reconnects with
 * exponential backoff if the stream drops.
 */
export function useLiveOrderTracking(orderId) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [live, setLive] = useState(false); // true = SSE connected

  const esRef = useRef(null);
  const pollRef = useRef(null);
  const retryRef = useRef(0);
  const aliveRef = useRef(true);
  const closedRef = useRef(true); // starts closed; the effect opens it
  const reconnectRef = useRef(null); // holds connectSse for self-reconnect

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await ordersApi.tracking(orderId);
        if (aliveRef.current) setOrder(data);
      } catch {
        /* transient — next tick retries */
      }
    }, FALLBACK_POLL_MS);
  }, [orderId]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const connectSse = useCallback(() => {
    if (closedRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { ticket } = await ordersApi.streamTicket(orderId);
        if (cancelled || closedRef.current) return;

        const es = new EventSource(
          `${API_URL}/orders/${orderId}/stream?ticket=${encodeURIComponent(ticket)}`,
        );
        esRef.current = es;

        es.onopen = () => {
          if (aliveRef.current) {
            setLive(true);
            stopPolling(); // live push replaces polling
          }
        };

        es.addEventListener('update', () => {
          // A status was pushed — refresh the full order view
          ordersApi
            .tracking(orderId)
            .then((data) => aliveRef.current && setOrder(data))
            .catch(() => {});
        });

        es.addEventListener('ping', () => {}); // keepalive — no-op

        es.onerror = () => {
          es.close();
          esRef.current = null;
          if (aliveRef.current) setLive(false);
          if (closedRef.current) return;
          // Exponential backoff, then fall back to polling for good
          retryRef.current += 1;
          if (retryRef.current > MAX_RETRIES) {
            startPolling();
            return;
          }
          const delay = BASE_RETRY_MS * 2 ** (retryRef.current - 1);
          setTimeout(() => {
            if (!closedRef.current) reconnectRef.current?.();
          }, delay);
        };
      } catch {
        // Ticket fetch failed (offline / 401) — poll instead
        if (!cancelled) startPolling();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, startPolling, stopPolling]);

  // Keep the latest connect function reachable for self-reconnects without
  // updating a ref during render (react-hooks/refs)
  useEffect(() => {
    reconnectRef.current = connectSse;
  }, [connectSse]);

  useEffect(() => {
    if (!orderId) return undefined;
    aliveRef.current = true;
    closedRef.current = false;
    retryRef.current = 0;

    // Initial load — first paint of current status
    const load = async () => {
      try {
        const data = await ordersApi.tracking(orderId);
        if (aliveRef.current) setOrder(data);
      } catch (err) {
        console.error(err);
        if (aliveRef.current) setLoadFailed(true);
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    };
    load();

    const cancelConnect = connectSse();

    return () => {
      aliveRef.current = false;
      closedRef.current = true;
      cancelConnect();
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      stopPolling();
    };
  }, [orderId, connectSse, stopPolling]);

  return {
    order,
    loading: !!orderId && loading && order === null,
    loadFailed,
    live,
  };
}
