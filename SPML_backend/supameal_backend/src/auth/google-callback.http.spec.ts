import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppleAuthService } from './apple-auth.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthStateService } from './oauth-state.service';
import { OAuthCodeRecord } from './schema/oauth-record.schema';
import { GoogleStrategy } from './strategies/google.strategy';

/**
 * Whole callback path: HTTP -> controller -> real passport + Nest wrapper ->
 * GoogleStrategy. Only Google's two network calls and the database are stubbed.
 * Regression for the 502 outage: a successful Google login used to invoke the
 * verify callback twice and crash the process via an unhandled rejection.
 */
describe('GET /auth/google/callback', () => {
  let app: INestApplication;
  let strategy: GoogleStrategy;
  const created: unknown[] = [];
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  const profile = {
    id: 'g-1',
    name: { givenName: 'Gina', familyName: 'Google' },
    emails: [{ value: 'gina@example.com' }],
    photos: [],
    _json: { email_verified: true },
  };

  beforeAll(async () => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.on('unhandledRejection', onUnhandled);
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              ({
                GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com',
                GOOGLE_CLIENT_SECRET: 'secret',
                GOOGLE_CALLBACK_URL:
                  'https://api.example.com/auth/google/callback',
              })[k],
          },
        },
        {
          provide: AuthService,
          useValue: {
            oauthSignIn: jest.fn().mockResolvedValue({
              accessToken: 'at',
              refreshToken: 'rt',
              user: { id: 'u1' },
            }),
          },
        },
        { provide: AppleAuthService, useValue: { isConfigured: () => false } },
        {
          provide: OAuthStateService,
          useValue: {
            issue: jest.fn(),
            consumeWithRole: jest
              .fn()
              .mockImplementation(async (s: string) =>
                s === 'good-state' ? { role: 'customer' } : null,
              ),
          },
        },
        {
          provide: getModelToken(OAuthCodeRecord.name),
          useValue: { create: jest.fn(async (doc) => created.push(doc)) },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    strategy = moduleRef.get(GoogleStrategy);
    (strategy as any)._oauth2.getOAuthAccessToken = (
      _c: string,
      _p: unknown,
      cb: (...a: unknown[]) => void,
    ) => cb(null, 'access-token', 'refresh-token', {});
    (strategy as any).userProfile = (
      _t: string,
      cb: (e: unknown, p: unknown) => void,
    ) => cb(null, profile);
  });

  afterAll(async () => {
    process.off('unhandledRejection', onUnhandled);
    await app.close();
  });

  it('answers a successful Google login with exactly one redirect carrying a one-time code', async () => {
    const res = await request(app.getHttpServer()).get(
      '/auth/google/callback?state=good-state&code=abc',
    );
    // let any (incorrect) second invocation / late rejection surface
    await new Promise((r) => setTimeout(r, 200));

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(
      /^https:\/\/app\.example\.com\/auth\/callback\?code=/,
    );
    expect(created).toHaveLength(1);
    expect(unhandled).toEqual([]);
  });

  it('still rejects a forged state without touching Google', async () => {
    const res = await request(app.getHttpServer()).get(
      '/auth/google/callback?state=forged&code=abc',
    );
    expect(res.status).toBe(302);
    expect(decodeURIComponent(res.headers.location)).toMatch(
      /login\?error=Invalid or expired OAuth state/,
    );
  });
});
