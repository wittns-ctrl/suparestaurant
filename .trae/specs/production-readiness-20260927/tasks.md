# SupaMeal Production Readiness — Implementation Plan

## Task 1: Hash reset tokens in AuthService (C5 — AC-1)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In `auth.service.ts` ForgotPassword: instead of `user.resetToken = resettoken` (plaintext), store `bcrypt.hash(resettoken, 10)`.
  - In `auth.service.ts` resetpassword: iterate match candidates; use `bcrypt.compare(resetDto.token, user.resetToken)` instead of direct equality `findOne({ resetToken: resetDto.token })`. Since bcrypt can't be used in Mongo query, first query by a resetToken lookup of hashed form — safer pattern: either keep a `resetTokenHash` field OR change service to first find user by resetTokenExpiration window + then bcrypt.compare each with a bounded iteration (or add helper field). Simplest pattern: keep both fields, but spec says hash storage only — so add `resetTokenHash` field to user.schema (if not exists) OR rename to hashed. Use existing field but store hash and compare in-memory after finding user by some other key. Since we currently query by exact reset token value and reset token is randomUUID, acceptable pattern: in ForgotPassword, compute hash, save hash in resetToken. In resetpassword, find user by `resetTokenExpiration > now` first, then bcrypt.compare on each candidate (should be ≤ 1 due to overwrite). If multiple, N iteration bounded by 50 is fine.
  - Expiration logic unchanged.
- **Acceptance Criteria Addressed**: AC-1, AC-15
- **Test Requirements**:
  - `rule` TR-1.1: `auth.service.ts` ForgotPassword calls `bcrypt.hash(resettoken, ...)` and assigns result to user.resetToken before save.
  - `rule` TR-1.2: resetpassword uses `bcrypt.compare` (not direct equality) to validate token.
  - `rule` TR-1.3: Backend `nest build` passes with no TS errors.
- **Notes**: May need to add `resetTokenHash?` to user schema if cleaner; existing `resetToken` field reused for hash content is fine (schema type string).

## Task 2: Add service-layer user/profile/favorites/dashboard ownership checks (C6 — AC-2)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In `users.service.ts`:
    - Change findOne(id, userId?, userRole?), update(id, dto, userId?, userRole?), changePassword(id, dto, userId?, userRole?), setStatus (admin-only, no change), remove (admin-only, no change), addFavorite(userIdParam, restaurantId, callerUserId?, userRole?), removeFavorite same, getFavorites(userIdParam, callerUserId?, userRole?), getDashboardStats(userIdParam, callerUserId?, userRole?).
    - Helper `assertSelfOrAdmin(targetId, userId?, userRole?)` → throw Unauthorized unless `targetId === userId || userRole === ADMIN` (both sides toString to handle ObjectId).
  - In `profiles.service.ts`:
    - findOne + update signatures accept `(id, userId?, userRole?)` + same `assertSelfOrAdmin`.
  - In `users.controller.ts`:
    - GET :id, PATCH :id, PASSWORD :id/password, DASHBOARD :id/dashboard-stats, FAVORITES all three — inject @CurrentUser and forward user.id / user.role to service.
    - GET /users list remains ADMIN only — no signature change. setStatus and remove already ADMIN — no change.
  - In `profiles.controller.ts`:
    - GET :id and PATCH :id both inject @CurrentUser and forward.
- **Acceptance Criteria Addressed**: AC-2, AC-16, AC-15
- **Test Requirements**:
  - `rule` TR-2.1: UsersService 8 methods and ProfilesService 2 methods each have signature with userId/userRole and call assertSelfOrAdmin.
  - `rule` TR-2.2: Controller routes for users/:id*, users/:id/favorites*, users/:id/dashboard-stats, profiles/:id — all inject @CurrentUser and pass (id, user.id, user.role).
  - `rule` TR-2.3: Backend build passes.

## Task 3: Menus ownership at service + controller wire (C7 — AC-3)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `menus.service.ts`:
    - Add private `async assertRestaurantOwner(restaurantId: Types.ObjectId | string, userId?: string, userRole?: string)` — fetch restaurant → compare ownerId.
    - Change `create(dto, userId?, userRole?)`: before create, call assertRestaurantOwner on dto.restaurant.
    - Change `update(id, dto, userId?, userRole?)`: findById menu → get restaurant id from item → assertRestaurantOwner.
    - Change `remove(id, userId?, userRole?)`: same — findById then assert.
    - findAll / findOne remain unchanged (public read).
  - `menus.controller.ts`:
    - POST, PATCH, DELETE routes inject @CurrentUser and forward (..., user.id, user.role).
- **Acceptance Criteria Addressed**: AC-3, AC-16, AC-15
- **Test Requirements**:
  - `rule` TR-3.1: MenusService assertRestaurantOwner helper exists and is called in create/update/remove.
  - `rule` TR-3.2: Controller POST/PATCH/DELETE pass CurrentUser id/role.
  - `rule` TR-3.3: Build passes.

## Task 4: Restaurant register trusts CurrentUser not client ownerId (C8 — AC-4)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `restaurants.controller.ts` `@Post('register') create()`:
    - If `user.role === roles.OWNER` → force `createRestaurantDto.ownerId = user.id`.
    - If `user.role === roles.ADMIN` → keep body ownerId (and service already validates owner exists).
    - Else → throw UnauthorizedException.
- **Acceptance Criteria Addressed**: AC-4, AC-15
- **Test Requirements**:
  - `rule` TR-4.1: Controller create method shows ownerId overwritten when role=OWNER.
  - `rule` TR-4.2: Build passes.

## Task 5: Refresh token rotation + reuse detection (H1 — AC-5)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In `auth.service.ts` `refreshAccessToken(refreshToken)`:
    - Keep existing bcrypt.compare for matching the provided token against `user.refreshToken`.
    - **On match (legitimate rotation)**: Call `generateTokens(user)` — this overwrites `user.refreshToken` with a NEW bcrypt hash of newly-signed token. Return new tokens.
    - **On mismatch (reuse)**: BUT the JWT itself verified so the token is from the same family originally → that means: token JWT-verified + stored hash does NOT match current stored hash = **reuse detected**. Action: set `user.refreshToken = undefined` (revoke entire family), save, throw UnauthorizedException('Refresh token reuse detected — please re-login for security').
  - Edge: first-time old-tokens — if `user.refreshToken` already undefined → fall through to already existing "Refresh token has been revoked".
- **Acceptance Criteria Addressed**: AC-5, AC-15
- **Test Requirements**:
  - `rule` TR-5.1: On successful refresh, generateTokens is called which re-hashes a new refresh token (overwrites previous).
  - `rule` TR-5.2: On bcrypt mismatch with a JWT-verified payload, revoke logic runs (set undefined + throw reuse message).
  - `rule` TR-5.3: Build passes.

## Task 6: Helmet middleware with production defaults (H2 — AC-6)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Install helmet package: `cd SPML_backend/supameal_backend && npm i helmet` (record dep in package.json).
  - In `main.ts`: `import helmet from 'helmet';`.
  - After `app.useGlobalPipes(...)` (or before, order not critical), add:
    ```
    const env = (process.env.NODE_ENV || 'development').toLowerCase();
    const isDev = env === 'development' || env === 'dev';
    app.use(helmet({
      contentSecurityPolicy: isDev ? false : {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
          'frame-src': ["'self'", 'https://js.stripe.com', 'https://accounts.google.com', 'https://appleid.apple.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'", 'https:'],
        },
      },
      crossOriginEmbedderPolicy: !isDev,
      hsts: !isDev ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      frameguard: isDev ? false : { action: 'sameorigin' },
      hidePoweredBy: true,
      xssFilter: true,
      noSniff: true,
      dnsPrefetchControl: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }));
    ```
  - Keep existing `app.enableCors(...)` (CORS separate from CSP).
- **Acceptance Criteria Addressed**: AC-6, AC-15
- **Test Requirements**:
  - `rule` TR-6.1: main.ts imports helmet + app.use(helmet(...)) block exists.
  - `rule` TR-6.2: package.json dependencies include `helmet`.
  - `rule` TR-6.3: Build passes.

## Task 7: Remove user enumeration from forgot-password (H3 — AC-7)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In `auth.service.ts` ForgotPassword:
    - Delete the `if (!user) throw new NotFoundException(...)` block.
    - Whether user found or not, return the same response `{ message: 'If an account exists with this email, a password reset link has been sent.' }`.
    - Email only actually sent when user exists (wrap sendResetEmail in conditional).
- **Acceptance Criteria Addressed**: AC-7, AC-15
- **Test Requirements**:
  - `rule` TR-7.1: ForgotPassword does not throw NotFoundException when user missing; returns identical success-shape message.
  - `rule` TR-7.2: Build passes.

## Task 8: Logout uses CurrentUser identity (H4 — AC-8)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `auth.controller.ts` Logout route: add `@CurrentUser() user`, ignore `logoutDto.email` or remove from DTO. Call service with `user`.
  - `auth.service.ts` Logout: accept user object (id + email). Find by id or direct lookup via id (safer) → clear refreshToken. Throw Unauthorized only if `!user` or user not found. Body email ignored.
- **Acceptance Criteria Addressed**: AC-8, AC-15
- **Test Requirements**:
  - `rule` TR-8.1: controller logout uses @CurrentUser; body.email NOT used to decide which user to logout.
  - `rule` TR-8.2: service Logout finds user by id or email from CurrentUser token context.
  - `rule` TR-8.3: Build passes.

## Task 9: Order status ownership at service + controller (H5 — AC-9)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `orders.service.ts`:
    - updateStatus(id, status, userId?, userRole?): before save, look up order + populate restaurantId (ownerId). Helper `assertCanActOnOrder(order, userId?, userRole?)`:
      - ADMIN → pass.
      - OWNER → restaurant.ownerId.toString() === userId → pass.
      - Else → 401.
  - `orders.controller.ts` updateStatus route injects @CurrentUser and forwards to new service signature.
- **Acceptance Criteria Addressed**: AC-9, AC-16, AC-15
- **Test Requirements**:
  - `rule` TR-9.1: updateStatus includes ownership check with populated restaurant owner.
  - `rule` TR-9.2: controller forwards CurrentUser.
  - `rule` TR-9.3: Build passes.

## Task 10: Restaurant analytics ownership assertion (H6 — AC-10)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `restaurants.service.ts`:
    - `getAnalyticsOverview(id, userId?, userRole?)` — fetch restaurant → call existing (or reuse) assertOwnerOrAdmin → proceed.
    - `getRevenueChart(id, period, userId?, userRole?)` — same (also replace fake data as part of M1 — Task 13).
    - `getPeakHours(id, userId?, userRole?)` — same (also replace fake data as part of M1).
  - `restaurants.controller.ts`:
    - All three `:id/analytics/*` routes already inject CurrentUser; now pass `user.id, user.role` as trailing args.
- **Acceptance Criteria Addressed**: AC-10, AC-16, AC-15
- **Test Requirements**:
  - `rule` TR-10.1: Three analytics methods each accept (id, ..., userId?, userRole?) and call assertOwnerOrAdmin before reading.
  - `rule` TR-10.2: Controller forwards CurrentUser.
  - `rule` TR-10.3: Build passes.

## Task 11: Review create enforces customerId = caller (H7 — AC-11)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `reviews.service.ts`:
    - create(dto, userId?, userRole?):
      - If userRole is CUSTOMER: force `dto.customerId = userId`. If userRole is ADMIN or OWNER, trust dto.customerId but must exist (validation already in DTO).
      - Optional: Check that user has at least one delivered order at restaurant (fast aggregation join). If trivial to add in 5 lines: do; else leave TODO comment and skip.
  - `reviews.controller.ts` create route: add @CurrentUser → forward (dto, user.id, user.role).
- **Acceptance Criteria Addressed**: AC-11, AC-16, AC-15
- **Test Requirements**:
  - `rule` TR-11.1: Service create signature includes userId/userRole and overwrites customerId for CUSTOMER callers.
  - `rule` TR-11.2: Controller create passes CurrentUser.
  - `rule` TR-11.3: Build passes.

## Task 12: Auth per-endpoint stricter throttles (H8 — AC-12)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In `auth.controller.ts`:
    - Import `@Throttle` and `@SkipThrottle` from `@nestjs/throttler`.
    - Apply to routes:
      - POST login → `@Throttle({ default: { limit: 5, ttl: 60_000 } })`
      - POST signup → `@Throttle({ default: { limit: 5, ttl: 60_000 } })`
      - POST verify-otp → `@Throttle({ default: { limit: 10, ttl: 60_000 } })`
      - POST resend-otp → `@Throttle({ default: { limit: 3, ttl: 60_000 } })`
      - POST forgot → `@Throttle({ default: { limit: 3, ttl: 60_000 } })`
      - POST reset → `@Throttle({ default: { limit: 5, ttl: 60_000 } })`
      - POST refresh → `@Throttle({ default: { limit: 10, ttl: 60_000 } })`
    - Logout and callback routes: optional throttle or global default is fine.
  - If Throttler v6 expects different decorator signature (array / nested objects), match the exact API via the installed `@nestjs/throttler@^6.7.1` docs or source. Always use valid syntax that typechecks.
- **Acceptance Criteria Addressed**: AC-12, AC-15
- **Test Requirements**:
  - `rule` TR-12.1: All seven listed auth endpoints carry `@Throttle(...)` decorators with limit ≤ 10 and ttl ≤ 60_000.
  - `rule` TR-12.2: Build passes (no type error on decorator).

## Task 13: Replace fake restaurant analytics with real aggregations (M1 — AC-10, AC-13)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 10 (ownership wrapper) but analytic logic can be authored in same change — treat as sequential.
- **Description**:
  - `getRevenueChart(id, period = 'week')`:
    - days = period === 'month' ? 30 : 7.
    - Aggregate orders for restaurantId where status = DELIVERED, createdAt within last days days.
    - Group by $dayOfWeek for week or $date for month.
    - Return array shape { label: string (Mon/Tue... or date dd), value: number (total cents->dollars) }.
    - Days with no orders return value 0 (fill the series).
  - `getPeakHours(id)`:
    - Aggregate delivered orders (or bookings if better data) for restaurant.
    - Bucket by $hour of createdAt or bookingDate.
    - Return [{ hour: '11 AM', count: N }, ...] sorted by count desc top 6 or ascending hour 0..23.
    - Zero-hour buckets can be omitted or kept.
  - Remove all `Math.random()` / literal hardcoded peak hour arrays from these two methods.
- **Acceptance Criteria Addressed**: AC-13, AC-15
- **Test Requirements**:
  - `rule` TR-13.1: Both methods use Mongo aggregation `this.orderModel.aggregate([...])` (or bookings) — no `Math.random`.
  - `rule` TR-13.2: Grep for `Math.random` inside restaurants.service.ts returns 0 matches (service methods only; seed module untouched).
  - `rule` TR-13.3: Build passes.

## Task 14: Medium fixes batch — fake menu rating, signup password strength, role restriction, order-create scoping, production CORS, Stripe apiVersion, frontend promos subtotal (M2, M4, M5, M6, M7, M8, M3 — AC-14)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - **M2 menu rating**: In `menus.service.ts` formatMenu, delete the line `rating: 4.5,`. Keep emoji/image as is.
  - **M4 password complexity**: In `signup-auth.dto.ts` password add:
    ```
    @MinLength(8)
    @Matches(/(?=.*[A-Z])(?=.*\d)/, { message: 'Password must contain at least 1 uppercase letter and 1 digit' })
    ```
    In `change-password.dto.ts` newPassword field add same decorator pair.
  - **M5 signup role restriction**: In `auth.service.ts` createUser — after `mapFrontendRole(role)` call, if mapped result equals `roles.ADMIN` and user is not coming from an admin-only elevated path (signup route is pre-auth public → always true check → fail unless seeded / explicit admin-create route). Throw `BadRequestException('Admin role must be assigned by a system administrator')`. Allow customer + owner only in self-serve flow.
  - **M6 order create scoping**: `orders.service.ts` create(dto, userId?, userRole?). In OrdersController create route, pass `(createOrderDto, user.id, user.role)`. Inside create: if userRole === CUSTOMER force `dto.customerId = userId`. If OWNER or ADMIN → keep dto override (valid).
  - **M7 production CORS strict**: In main.ts parseCorsOrigins, if `(NODE_ENV === 'production' || 'prod')` AND `!process.env.CORS_ORIGINS` (i.e., not explicitly set → default list) → filter out any origin matching `/^https?:\/\/(localhost|127\.0\.0\.1)/i` and log warning `[CORS] Localhost origins disabled in production — set CORS_ORIGINS explicitly to override`.
  - **M8 Stripe apiVersion**: In payments.service.ts, change `apiVersion: (null as unknown) as any` → `apiVersion: '2024-06-20' as Stripe.LatestApiVersion` (or a literal string typed). Remove the double cast.
  - **M3 frontend promos subtotal**: In `supameal-frontend/src/services/api.js` `promosApi.validate` change signature and body:
    ```
    validate: (code, subtotal) => apiRequest('/promos/validate', { method: 'POST', body: JSON.stringify({ code, subtotal: Number(subtotal) || 0 }) }),
    ```
    Update any frontend call sites currently using `promosApi.validate(code)` → pass subtotal (e.g., cart total before discount). If no call site uses it (grep first), just change signature leaving future-proof.
- **Acceptance Criteria Addressed**: AC-14, AC-15
- **Test Requirements**:
  - `rule` TR-14.1: menus formatMenu no `rating: 4.5` literal.
  - `rule` TR-14.2: signup DTO password + change-password DTO newPassword carry @MinLength(8) and @Matches upper+digit decorators.
  - `rule` TR-14.3: auth.service createUser blocks role === ADMIN on self-serve.
  - `rule` TR-14.4: orders.service create forces customerId for CUSTOMER callers; controller forwards CurrentUser.
  - `rule` TR-14.5: main.ts filters localhost from CORS default when prod + unset env var.
  - `rule` TR-14.6: payments stripe apiVersion is real version string (not `null as unknown as any`).
  - `rule` TR-14.7: frontend api.js promosApi.validate arity 2 → posts `{ code, subtotal }`.
  - `rule` TR-14.8: Both builds pass (frontend `vite build` + backend `nest build`).

## Task 15: End-to-end builds and lint cleanup (AC-15)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1–14
- **Description**:
  - Backend: `cd SPML_backend/supameal_backend && npm run build`. Fix dangling imports, signatures, unused variables.
  - Frontend: `cd supameal-frontend && npm run build`. Fix missing subtotal arguments at promos call sites.
  - Iterate until both builds exit 0.
  - Optional: run `npm run lint` on backend and fix any newly introduced lint warnings (no new warnings introduced by our edits).
- **Acceptance Criteria Addressed**: AC-15
- **Test Requirements**:
  - `rule` TR-15.1: Backend build exit 0 with "Build complete" success message.
  - `rule` TR-15.2: Frontend build exit 0.
  - `rule` TR-15.3: grep across backend for `SUPA10` hardcode (already handled by critical-fixes; verify 0 matches per C4).
