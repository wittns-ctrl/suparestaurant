const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DEFAULT_TIMEOUT_MS = 30000;

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let onTokenRefreshed = null; // hook so AuthContext can persist rotated tokens
let accessToken = null;
let activeAccountType = 'customer';
export function setAccessToken(token, accountType) {
  accessToken = token || null;
  if (accountType) activeAccountType = accountType;
}
export function getAccessToken() {
  return accessToken;
}
export function setTokenRefreshListener(fn) {
  onTokenRefreshed = fn;
}

let isRefreshing = false;
let refreshPromise = null;

async function tryRefreshToken() {
  if (!isRefreshing) {
    isRefreshing = true;
    const refreshPath = activeAccountType === 'customer' ? '/auth/refresh' : `/auth/${activeAccountType}/refresh`;
    refreshPromise = fetch(`${API_URL}${refreshPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (!data?.accessToken) return false;
        setAccessToken(data.accessToken);
        if (onTokenRefreshed) onTokenRefreshed(data);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const { skipAuth, headers: extraHeaders, timeoutMs, ...rest } = options;
  const token = accessToken;
  const headers = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };
  if (!skipAuth && token) headers.Authorization = `Bearer ${token}`;

  // Abort requests that hang — no more infinite spinners on dead networks
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers, credentials: 'include', signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out', 0);
    }
    throw new ApiError(err.message || 'Network error', 0);
  } finally {
    clearTimeout(timeout);
  }

  // Auto-refresh on 401 once, then retry the original request
  if (res.status === 401 && !skipAuth && !path.startsWith('/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = accessToken;
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        // Fresh AbortController + timer: the original controller was already
        // cleared in the finally above, so reusing its signal would leave a
        // hung retry request spinning forever with no timeout.
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);
        try {
          res = await fetch(`${API_URL}${path}`, { ...rest, headers, credentials: 'include', signal: retryController.signal });
        } catch (err) {
          if (err.name === 'AbortError') {
            throw new ApiError('Request timed out', 0);
          }
          throw new ApiError(err.message || 'Network error', 0);
        } finally {
          clearTimeout(retryTimeout);
        }
      }
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new ApiError(data.message || data.error || 'Request failed', res.status);
  }
  return data;
}

export { API_URL, ApiError };
