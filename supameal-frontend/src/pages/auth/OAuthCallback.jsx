import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import Loader from '../../components/Loader/Loader';
import { homeForUser, userHasRole } from '../../utils/auth';

// React StrictMode replays effects in development. Since OAuth codes are
// one-time use, keep a single exchange promise per code so the replay shares
// the original request instead of consuming the code twice.
const codeExchanges = new Map();

function exchangeCodeOnce(code) {
  if (!codeExchanges.has(code)) {
    const request = authApi.exchange(code);
    codeExchanges.set(code, request);
    // OAuth codes expire quickly; bound this cache if a callback is abandoned.
    setTimeout(() => codeExchanges.delete(code), 60_000);
  }
  return codeExchanges.get(code);
}

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { persistAuth } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const ownerIntent = sessionStorage.getItem('ownerOAuthIntent');
    const oauthReturnTo = sessionStorage.getItem('oauthReturnTo');

    if (error) {
      if (ownerIntent === 'login') {
        sessionStorage.removeItem('ownerOAuthIntent');
        sessionStorage.removeItem('oauthReturnTo');
        navigate(`/owner-login?error=${encodeURIComponent(error)}`, { replace: true });
      } else {
        sessionStorage.removeItem('oauthReturnTo');
        navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      }
      return;
    }

    if (!code) {
      if (ownerIntent === 'login') {
        sessionStorage.removeItem('ownerOAuthIntent');
        sessionStorage.removeItem('oauthReturnTo');
        navigate('/owner-login?error=OAuth+failed', { replace: true });
      } else {
        sessionStorage.removeItem('oauthReturnTo');
        navigate('/login?error=OAuth+failed', { replace: true });
      }
      return;
    }

    let cancelled = false;

    const exchange = async () => {
      try {
        // Exchange the one-time code for tokens — tokens never touch the URL
        const res = await exchangeCodeOnce(code);
        if (cancelled) return;
        const isOwner = userHasRole(res.user, 'owner');
        if (ownerIntent === 'login' && !isOwner) {
          sessionStorage.removeItem('ownerOAuthIntent');
          sessionStorage.removeItem('oauthReturnTo');
          navigate(`/owner-login?error=${encodeURIComponent('This Google account is not registered as a restaurant owner.')}`, { replace: true });
          return;
        }
        persistAuth(res.user, res.accessToken, res.refreshToken);
        if (ownerIntent === 'login') sessionStorage.removeItem('ownerOAuthIntent');
        if (oauthReturnTo === '/register-restaurant' && (!ownerIntent || isOwner)) {
          sessionStorage.removeItem('oauthReturnTo');
          navigate('/register-restaurant', { replace: true });
          return;
        }
        navigate(homeForUser(res.user), { replace: true });
      } catch {
        if (cancelled) return;
        if (ownerIntent === 'login') {
          sessionStorage.removeItem('ownerOAuthIntent');
          navigate('/owner-login?error=Invalid+or+expired+OAuth+code', { replace: true });
        } else {
          sessionStorage.removeItem('oauthReturnTo');
          navigate('/login?error=Invalid+or+expired+OAuth+code', { replace: true });
        }
      }
    };
    exchange();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, persistAuth]);

  return <Loader text="Completing sign-in..." />;
}
