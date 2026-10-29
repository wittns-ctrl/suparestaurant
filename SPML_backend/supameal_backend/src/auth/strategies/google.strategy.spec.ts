import passport from 'passport';
import { GoogleStrategy } from './google.strategy';

/**
 * Drives the REAL passport-google-oauth20 + Nest PassportStrategy wrapper with
 * Google's network calls stubbed. Regression: validate() used to call `done`
 * itself while Nest's wrapper called it again with validate()'s return value,
 * so every Google login invoked the callback twice. The second invocation tried
 * to redirect an already-answered response, threw, and the global
 * unhandled-rejection handler exited the process (Render then served 502).
 */
describe('GoogleStrategy (real passport flow)', () => {
  const profile = {
    id: 'google-subject-1',
    name: { givenName: 'Gina', familyName: 'Google' },
    emails: [{ value: 'gina@example.com' }],
    photos: [{ value: 'https://example.com/p.png' }],
    _json: { email_verified: true },
  };

  function build(authService: { oauthSignIn: jest.Mock }) {
    const config = {
      get: (key: string) =>
        ({
          GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com',
          GOOGLE_CLIENT_SECRET: 'secret',
          GOOGLE_CALLBACK_URL: 'https://api.example.com/auth/google/callback',
        })[key],
    };
    const strategy = new GoogleStrategy(config as never, authService as never);
    // Stub Google's two network calls only.
    (strategy as any)._oauth2.getOAuthAccessToken = (
      _code: string,
      _params: unknown,
      cb: (...a: unknown[]) => void,
    ) => cb(null, 'access-token', 'refresh-token', {});
    (strategy as any).userProfile = (
      _token: string,
      cb: (err: unknown, p: unknown) => void,
    ) => cb(null, profile);
    return strategy;
  }

  function runCallback(): Promise<unknown[][]> {
    const calls: unknown[][] = [];
    return new Promise((resolve) => {
      const req = { query: { code: 'auth-code' }, headers: {}, url: '/cb' };
      passport.authenticate(
        'google',
        { session: false },
        (...args: unknown[]) => {
          calls.push(args);
        },
      )(req as never, {} as never, () => undefined);
      // let any (incorrect) second invocation happen
      setTimeout(() => resolve(calls), 100);
    });
  }

  it('invokes the authenticate callback exactly once on success', async () => {
    const result = { accessToken: 'at', user: { id: 'u1' } };
    build({ oauthSignIn: jest.fn().mockResolvedValue(result) });

    const calls = await runCallback();

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBeNull();
    expect(calls[0][1]).toEqual(result);
  });

  it('reports a blocked account once, as an authError result', async () => {
    build({
      oauthSignIn: jest
        .fn()
        .mockRejectedValue(new Error('ACCOUNT_BLOCKED: blocked by admin')),
    });

    const calls = await runCallback();

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBeNull();
    expect(calls[0][1]).toEqual({
      authError: 'ACCOUNT_BLOCKED: blocked by admin',
    });
  });

  it('passes other failures through once as an error', async () => {
    build({ oauthSignIn: jest.fn().mockRejectedValue(new Error('db down')) });

    const calls = await runCallback();

    expect(calls).toHaveLength(1);
    expect((calls[0][0] as Error).message).toBe('db down');
  });

  it('rejects an unverified Google email once', async () => {
    const strategy = build({ oauthSignIn: jest.fn() });
    (strategy as any).userProfile = (
      _t: string,
      cb: (err: unknown, p: unknown) => void,
    ) => cb(null, { ...profile, _json: { email_verified: false } });

    const calls = await runCallback();

    expect(calls).toHaveLength(1);
    expect((calls[0][0] as Error).message).toMatch(/verified email/i);
  });
});
