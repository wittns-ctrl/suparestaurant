import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { authApi } from '../services/api';
import { setAccessToken, setTokenRefreshListener } from '../api/client';

const AuthContext = createContext(null);

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes — refresh halfway through a 15-min token

const normalizeUser = (u) => u ? { ...u, roles: u.roles || [u.role] } : u;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const clearRefreshTimer = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  const persistAuth = useCallback((authUser, token) => {
    const normalized = normalizeUser(authUser);
    setUser(normalized);
    setAccessToken(token, normalized?.accountType);
    if (normalized?.accountType) localStorage.setItem('activeAuthAccountType', normalized.accountType);
  }, []);

  const forceLogout = useCallback(() => {
    setUser(null);
    setAccessToken(null, 'customer');
    localStorage.setItem('activeAuthAccountType', 'none');
    clearRefreshTimer();
  }, []);

  const refreshToken = useCallback(async (accountType) => {
    const preferredType = accountType ?? localStorage.getItem('activeAuthAccountType');
    const accountTypes = preferredType === 'none'
      ? []
      : preferredType
        ? [preferredType]
        : ['customer', 'owner', 'admin'];
    for (const type of accountTypes) {
      try {
        const res = await authApi.refresh(type);
        persistAuth(res.user, res.accessToken);
        return true;
      } catch {
        // Try the next independent realm during initial session restoration.
      }
    }
    forceLogout();
    return false;
  }, [persistAuth, forceLogout]);

  // The api client auto-refreshes on 401 — persist rotated tokens here too
  useEffect(() => {
    setTokenRefreshListener((data) => {
      if (data.user) {
        const normalized = normalizeUser(data.user);
        setUser(normalized);
        setAccessToken(data.accessToken, normalized?.accountType);
        if (normalized?.accountType) localStorage.setItem('activeAuthAccountType', normalized.accountType);
      }
    });
    return () => setTokenRefreshListener(null);
  }, []);

  useEffect(() => {
    // Remove the pre-cookie session format from browsers upgrading from the
    // previous release. New sessions are restored only from the HttpOnly cookie.
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    const init = async () => {
      await refreshToken();
      setLoading(false);
    };
    init();
  }, [refreshToken]);

  useEffect(() => {
    clearRefreshTimer();
    if (user) {
      refreshTimer.current = setInterval(() => refreshToken(user.accountType), REFRESH_INTERVAL_MS);
    }
    return clearRefreshTimer;
  }, [user, refreshToken]);

  const loginWithCredentials = useCallback(async (email, password, accountType = 'customer') => {
    const res = await authApi.login({ email, password }, accountType);
    persistAuth(res.user, res.accessToken);
    return res.user;
  }, [persistAuth]);

  const login = useCallback(async (email, password) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    return loginWithCredentials(email, password);
  }, [loginWithCredentials]);

  const signup = useCallback(async (data) => {
    return authApi.signup(data);
  }, []);

  const verifyOtp = useCallback(async (email, otp, accountType = 'customer') => {
    const res = await authApi.verifyOtp({ email, otp }, accountType);
    if (res.user && res.accessToken) {
      persistAuth(res.user, res.accessToken);
    }
    return res;
  }, [persistAuth]);

  const resendOtp = useCallback(async (email, accountType = 'customer') => {
    return authApi.resendOtp(email, accountType);
  }, []);

  const forgotPassword = useCallback(async (email, accountType = 'customer') => {
    return authApi.forgot({ email }, accountType);
  }, []);

  const resetPassword = useCallback(async (token, newPassword, accountType = 'customer') => {
    return authApi.reset({ token, newPassword }, accountType);
  }, []);

  const getApiBaseUrl = useCallback(() => {
    const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
    const defaultApiUrl = import.meta.env.PROD
      ? (typeof window !== 'undefined' ? window.location.origin : '')
      : 'http://localhost:3000';
    return (configuredApiUrl || defaultApiUrl).replace(/\/+$/, '');
  }, []);

  const loginWithGoogle = useCallback((options = {}) => {
    const query = options.role === 'owner' ? '?role=owner' : '';
    window.location.href = `${getApiBaseUrl()}/auth/google${query}`;
  }, [getApiBaseUrl]);

  const loginWithApple = useCallback(() => {
    window.location.href = `${getApiBaseUrl()}/auth/apple`;
  }, [getApiBaseUrl]);

  const logout = useCallback(() => {
    // Revoke the server session while the access token is still available.
    authApi.logout().catch(() => {});
    forceLogout();
  }, [forceLogout]);

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const newUser = normalizeUser({ ...prev, ...updatedUserData });
      return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      updateUser,
      login,
      loginWithCredentials,
      loginWithGoogle,
      loginWithApple,
      persistAuth,
      logout,
      signup,
      verifyOtp,
      resendOtp,
      forgotPassword,
      resetPassword,
      refreshToken,
      loading,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
