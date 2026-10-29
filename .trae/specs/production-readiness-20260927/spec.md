# SupaMeal — Production Readiness Audit & Remediation (C5–C8, H1–H8, M1–M8)

## Overview
- **Summary**: A comprehensive codebase audit identified 4 Critical, 8 High, and 8 Medium issues blocking production readiness. Topics span plaintext token storage, IDOR vulnerabilities across user/menu/profile/restaurant endpoints, missing security middleware, ownership assertion gaps, user enumeration, fake analytics data, and frontend API payload gaps. This spec defines remediation requirements for all 20 findings.
- **Purpose**: Bring SupaMeal backend + frontend to production-ready security and correctness before any staging or production deploy. Close every Critical + High finding and every Medium finding that affects correctness or has a trivial fix.
- **Target Users**: Authenticated API callers (customer / owner / admin), SupaMeal operators (deployment, logs), and frontend end users.

## Goals
- G1 (Critical C5) — Password-reset tokens are hashed before storage; lookup uses constant-time-safe hashing.
- G2 (Critical C6) — Users, Profiles, Favorites, and Dashboard-stats endpoints enforce that callers only access their own record (admins bypass).
- G3 (Critical C7) — Menus create/update/delete assert that OWNER callers own the target restaurant before mutating menu items; ADMIN bypass allowed.
- G4 (Critical C8) — `POST /restaurants/register` ignores client `ownerId` and uses `CurrentUser.id` when role is OWNER; only ADMIN can set arbitrary ownerId.
- G5 (H1) — Refresh tokens are rotated on every `refresh` call; reuse of an old token invalidates the family (detects token theft).
- G6 (H2) — Helmet middleware configured in main.ts with production-appropriate defaults (CSP, frameguard, xss filter, hide x-powered-by, etc.).
- G7 (H3) — Forgot password endpoint returns identical 200 response whether email exists or not (no user enumeration).
- G8 (H4) — `POST /auth/logout` uses JWT `CurrentUser` identity, not `body.email` (prevents arbitrary session wipe).
- G9 (H5) — Orders `PATCH :id/status` asserts ownership: OWNER callers must own the order's restaurant; ADMINs bypass.
- G10 (H6) — Restaurant analytics endpoints (overview/revenue/peak-hours) assert owner ownership at the service layer.
- G11 (H7) — Review create validates customerId = CurrentUser.id and optionally the customer has a delivered/completed order at the restaurant.
- G12 (H8) — Auth-sensitive routes (login, signup, verify-otp, resend-otp, forgot, reset, refresh) carry stricter per-endpoint throttle limits distinct from global 60/min.
- G13 (M1–M3, M6–M8) — Fake analytics replaced with real DB aggregations; menu rating uses real review average; promos validate payload includes subtotal; service-level ownership on order create; CORS env-var enforcement in production; and Stripe version real-value (not null cast).
- G14 (M4–M5) — Signup DTO enforces password complexity (length + chars) and role input is restricted to { customer, owner } at service layer (admin-only role elevation via ADMIN route).

## Non-Goals
- Do not rewrite the order/pricing engine or payment flow beyond ownership assertions.
- Do not introduce a new DB, new auth provider, or new third-party packages unless strictly required by Helmet (helmet is allowed as the only new dep).
- Do not change frontend routing tree, page files, or contexts beyond fixing API payloads.
- Do not implement promo redemption limits or coupon-user tracking (already in promo module).
- No CI / Docker / Terraform / deployment infrastructure changes.
- No per-user OTP rate-limit Redis store; memory-store per-IP throttler overrides on controller routes are sufficient.

## Background & Context
Audit performed 2026-09-27 across NestJS backend (`SPML_backend/supameal_backend/src`) and Vite React frontend (`supameal-frontend/src`). Existing patterns: JwtAuthGuard + RolesGuard + @CurrentUser; class-validator DTOs; Mongoose 8 schema; ThrottlerModule globally registered. C1–C4 (payments scoping / prod stripe guard / restaurant ownership / promo module) are already tracked in `critical-fixes-c1-c4-20260927` and marked complete or in-progress elsewhere — not duplicated here.

## Functional Requirements
- **FR-1 (Reset token hashing C5)**: AuthService.ForgotPassword generates token, stores `bcrypt.hash(token, 10)` in `user.resetToken` (NOT plaintext). Resetpassword lookup iterates candidates and uses `bcrypt.compare(dto.token, user.resetToken)`. Expiration check remains.
- **FR-2 (User scope C6)**:
  - UsersController `GET :id`, `PATCH :id`, `PATCH :id/password`, `GET :id/dashboard-stats` — call service with `(targetId, userId, userRole)`. Service asserts `targetId === userId || role === ADMIN` before reads/writes.
  - Favorites endpoints (`GET/PUT/DELETE :id/favorites/...`) same treatment.
  - ProfilesController `GET :id`, `PATCH :id` same treatment.
- **FR-3 (Menu ownership C7)**: MenusService.create/update/remove accept `(..., userId?, userRole?)`. Internal `assertRestaurantOwner(restaurantId, userId, userRole)` fetches restaurant → compares ownerId. Controller forwards CurrentUser on POST/PATCH/DELETE.
- **FR-4 (Register ownerId C8)**: RestaurantsController.create wraps body.ownerId: if `CurrentUser.role === OWNER` → overwrite `body.ownerId = user.id`; if `CurrentUser.role === ADMIN` → trust body ownerId (and validate owner exists); else → reject with 401.
- **FR-5 (Refresh token rotation H1)**: AuthService.refreshAccessToken → after bcrypt match, generate new tokens; compare new hash vs old; if an attacker replays a previously-hashed token (hash mismatch but token validates the *old* stored hash family), detect via `lastRefreshTokenFamily?` or simpler: on every rotation, overwrite `user.refreshToken` to newly-hashed token AND track `refreshTokenReused = true` flag on mismatch (throw reuse-detected, revoke). Provide clear Unauthorized message "Refresh token reuse detected — please re-login".
- **FR-6 (Helmet H2)**: `app.use(helmet({...}))` installed in main.ts before routes. Content-Security-Policy defaults relaxed enough to allow Stripe.js + OAuth redirects; disable `X-Powered-By`; strict transport security + frameguard + xssFilter enabled. Import helmet package.
- **FR-7 (Forgot enumeration H3)**: AuthService.ForgotPassword — whether user found or not, return `{ message: 'If an account exists, a reset link has been sent' }` (status 201/200). No NotFoundException / BadRequest difference. Email only sent if user exists.
- **FR-8 (Logout identity H4)**: Logout endpoint signature uses `@CurrentUser() user` and clears refreshToken for `user.email` / `user._id`. Body.email ignored entirely; DTO body optional or deprecated.
- **FR-9 (Order status ownership H5)**: OrdersService.updateStatus signature `(id, status, userId?, userRole?)`. Lookup order → populate restaurantId.ownerId → assert `role === ADMIN || (role === OWNER && ownerId === userId)`. Controller forwards CurrentUser.
- **FR-10 (Analytics ownership H6)**: RestaurantsService.getAnalyticsOverview / getRevenueChart / getPeakHours — accept `(id, userId?, userRole?)`, assert `role === ADMIN || (role === OWNER && fetched.ownerId.toString() === userId)` before reading data.
- **FR-11 (Review integrity H7)**: ReviewsService.create accepts `(dto, userId?, userRole?)`. Assert `dto.customerId == null || dto.customerId === userId`; overwrite `dto.customerId = userId`. Optional: check the customer has at least 1 delivered order for the restaurant (if trivial join; else skip and document as future). Controller injects CurrentUser and forwards.
- **FR-12 (Auth throttles H8)**: Apply `@Throttle({ default: { ttl: 60_000, limit: 5 } })` (or per-method overrides) on: POST login, POST signup, POST verify-otp, POST resend-otp, POST forgot, POST reset, POST refresh. Use NestJS Throttler 6.x decorator if supported; else `@SetMetadata` + custom guard fallback is not acceptable — must use the `@Throttle(...)` decorator as exported by `@nestjs/throttler`.
- **FR-13a (Real analytics M1)**: Replace `getRevenueChart` random data with real MongoDB aggregation grouping orders by day, sum total where status = delivered, within `period` (7d / 30d). `getPeakHours` aggregate delivered bookings/orders by hour of day, bucket count. If `getAnalyticsOverview.pendingOrders` currently uses string compare, make it use the enum constant.
- **FR-13b (Menu rating M2)**: Stop returning `rating: 4.5` hardcode in menus formatMenu. Omit field or compute from restaurant rating (preferred: join restaurant rating → return `restaurantRating` alongside each menu item; or simply delete fake field).
- **FR-13c (Frontend promos payload M3)**: Frontend `services/api.js promosApi.validate(code, subtotal)` sends `{ code, subtotal }`. Update all call sites to pass subtotal.
- **FR-13d (Password complexity M4)**: Signup DTO `password` field adds class-validator decorators: `@MinLength(8)`, `@Matches(REGEX)` for at least 1 uppercase + 1 digit. Change-password DTO same for newPassword.
- **FR-13e (Signup role restriction M5)**: AuthService.createUser — if role === ADMIN and caller is not already an ADMIN-admin elevated context (signup endpoint is public / pre-auth), reject role ADMIN. Allowed input roles: { customer, owner } (enum check). ADMINs only created via seed / explicit ADMIN-only route (not in scope, but prevent via service).
- **FR-13f (Order create ownership M6)**: OrdersService.create — accept `(dto, userId?, userRole?)`. If caller CUSTOMER → force `dto.customerId = userId`. If OWNER or ADMIN → allow override but log when they do.
- **FR-13g (Production CORS strict M7)**: main.ts parseCorsOrigins — when NODE_ENV === production and CORS_ORIGINS is unset / still the default localhost list, log a warning and restrict to origins that are NOT localhost. Easiest: filter out `http://localhost:*` and `http://127.0.0.1:*` entries if prod and CORS_ORIGINS wasn't explicitly overridden (check via explicit `process.env.CORS_ORIGINS` presence).
- **FR-13h (Stripe apiVersion M8)**: Replace `apiVersion: (null as unknown) as any` with a real 2024-xx Stripe API version string (e.g. `'2024-06-20'`).

## Non-Functional Requirements
- **NFR-1 (Defense in depth)**: Every user-owned resource enforces ownership at the service layer; controller routes apply Role/Guards as a second layer.
- **NFR-2 (Fail-fast environment)**: Production misconfigs (missing CORS override with localhost only, missing Stripe key already handled, missing JWT secrets) warn or abort appropriately.
- **NFR-3 (Builds clean)**: Backend `npm run build` → 0 TS errors; frontend `npm run build` → 0 errors.
- **NFR-4 (No new external deps except helmet)**: Only `helmet` is newly installed in backend. No additional libraries.
- **NFR-5 (Consistent style)**: Follows Nest patterns already present in bookings service for ownership helpers.

## Constraints
- **Technical**: NestJS 11, Mongoose 8, class-validator, JwtAuthGuard + CurrentUser patterns; React 19, React Router 7.
- **Business**: Password reset, OTP, social login flows continue to work exactly as today for legitimate users — no UX regressions.
- **Dependencies**: May add `helmet` npm package to backend package.json. All other fixes use existing deps.

## Assumptions
- ThrottlerModule v6 supports per-route `@Throttle()` decorators (confirmed via `@nestjs/throttler@^6.7.1` in package.json — supports both `@SkipThrottle()` and `@Throttle()`).
- bcrypt.compare returns the correct result for salted-hashed reset tokens; bcrypt.hash works on randomUUID() strings (no length issue).
- Restaurant reviews rating computation exists and is correct — reuse it for menu rating omission / fallback.

## Acceptance Criteria

### AC-1: Reset tokens are hashed in storage and compared safely
- **Type**: `rule`
- **Given**: A user triggers forgot-password and receives link `?token=X`
- **When**: DB is inspected for `users.resetToken` column; reset password endpoint is hit with token X
- **Then**: DB field is a bcrypt hash (60-char $2a$... prefix); lookup uses bcrypt.compare, not string equality. Token expires per existing window.
- **Pass Condition**: Grep of `auth.service.ts` shows `bcrypt.hash(resettoken, ...)` assigned to resetToken; resetpassword uses `bcrypt.compare` before success path.
- **Evidence**: File read + backend build.

### AC-2: User / profile / favorites / dashboard endpoints are self-or-admin scoped at service layer
- **Type**: `rule`
- **Given**: user A (customer, id=a), user B (customer, id=b), user C (admin)
- **When**: B hits `GET /users/a` or `GET /users/a/dashboard-stats` or `GET /profiles/a` with B's JWT
- **Then**: Service throws Unauthorized. C succeeds. A succeeds for self.
- **Pass Condition**: UsersService.findOne/update/changePassword/getDashboardStats/addFavorite/removeFavorite all accept `(id, userId?, userRole?)` and guard with `id===userId || role===ADMIN`. ProfilesService.findOne/update same. Controller forwards CurrentUser to each of the 8 routes.
- **Evidence**: File reads of users.controller.ts, users.service.ts, profiles.controller.ts, profiles.service.ts + TS build.

### AC-3: Menus mutations require owner of target restaurant (or ADMIN)
- **Type**: `rule`
- **Given**: Owner O1 owns restaurant R1; Owner O2 owns R2; Admin A. Menu M1 is attached to R1.
- **When**: O2 calls PATCH /menus/M1 or DELETE /menus/M1 or POST /menus with restaurant=R1
- **Then**: 401 Unauthorized. O1 / A succeed.
- **Pass Condition**: MenusService.create/update/remove each call an `assertRestaurantOwner(restaurantId, userId, userRole)` helper before DB write. Controller forwards CurrentUser on POST / PATCH / DELETE routes.
- **Evidence**: File reads + TS build.

### AC-4: Restaurant register ignores client ownerId for OWNER role
- **Type**: `rule`
- **Given**: User O with role OWNER id=uid_O calls POST /restaurants/register with `ownerId: uid_of_someone_else`
- **When**: Restaurant is created
- **Then**: New restaurant.ownerId === uid_O (overwritten). Admin caller retains body ownerId (and validates target owner exists).
- **Pass Condition**: Controller preprocesses createRestdto.ownerId per FR-4. Service retains existing user-role check (already present) but ownerId source verified.
- **Evidence**: restaurants.controller.ts create() method shows ownerId override block.

### AC-5: Refresh token rotation detects reuse and revokes family
- **Type**: `rule`
- **Given**: Valid refresh token RT1 stored-hashed as H1 on user. Client exchanges RT1 → gets RT2 stored-hashed as H2.
- **When**: Attacker re-submits RT1 later
- **Then**: JWT verifies but bcrypt.compare(RT1, H2) fails → AuthService sets user.refreshToken = undefined, user.refreshTokenRevokedAt = now (or simple flag). Both attacker and legitimate client must re-login. Throws Unauthorized "Refresh token reuse detected".
- **Pass Condition**: refreshAccessToken path shows match → rotate; mismatch → revoke. generateTokens is called on every successful refresh; old token invalidated.
- **Evidence**: auth.service.ts refreshAccessToken code inspection + build.

### AC-6: Helmet middleware active with safe defaults
- **Type**: `rule`
- **Given**: App boots successfully
- **When**: Response headers inspected on any route
- **Then**: Headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` or CSP frame-ancestors self, `X-DNS-Prefetch-Control`, `Strict-Transport-Security`, no `X-Powered-By: Express`
- **Pass Condition**: `main.ts` imports + calls `app.use(helmet(...))`; contentSecurityPolicy directives contain reasonable defaults (allow inline dev mode if dev-only condition applied).
- **Evidence**: main.ts file read; package.json contains `helmet` dependency.

### AC-7: Forgot-password is timing-safe and enumeration-free
- **Type**: `rule`
- **Given**: Email `exists@example.com` exists; `nope@example.com` does not
- **When**: POST /auth/forgot with either email
- **Then**: Same status (200/201), same response shape/message. Only exists case actually sends email.
- **Pass Condition**: auth.service.ts ForgotPassword does not throw NotFound for missing user; returns identical message.
- **Evidence**: File read + build.

### AC-8: Logout uses JWT identity, not body email
- **Type**: `rule`
- **Given**: Attacker with own valid JWT knows victim's email
- **When**: POST /auth/logout body: `{ email: 'victim@x.com' }`
- **Then**: Only the caller's own refreshToken is cleared. Victim session unaffected.
- **Pass Condition**: Logout route uses `@CurrentUser()`; body.email is ignored or absent from DTO entirely.
- **Evidence**: auth.controller.ts logout route + auth.service.ts Logout signature changes.

### AC-9: Order status update is owner-scoped at service layer
- **Type**: `rule`
- **Given**: Order O belongs to restaurant R (owner O1). Owner O2 has role OWNER.
- **When**: O2 calls PATCH /orders/O/status with O2's JWT
- **Then**: 401 Unauthorized. O1 or ADMIN succeed.
- **Pass Condition**: OrdersService.updateStatus accepts (id, status, userId?, userRole?) and asserts ownership via populated restaurant.ownerId. Controller updateStatus route forwards CurrentUser.
- **Evidence**: orders.service.ts + orders.controller.ts file reads + build.

### AC-10: Restaurant analytics assert owner ownership in service
- **Type**: `rule`
- **Given**: Restaurant R1 owned by O1. Owner O2 calls analytics endpoints with R1.
- **When**: GET overview / revenue / peak-hours with O2 JWT
- **Then**: 401. O1 / ADMIN succeed and return real data.
- **Pass Condition**: Service methods accept userId/userRole + call assertOwnerOrAdmin before reading.
- **Evidence**: restaurants.service.ts updated signatures + assertOwnerOrAdmin calls.

### AC-11: Review create forces caller customerId and optionally validates order history
- **Type**: `rule`
- **Given**: Authenticated customer C1
- **When**: C1 posts review with customerId = C2 (someone else's id)
- **Then**: Saved review.customerId === C1 (overwritten). C2 identity rejected.
- **Pass Condition**: ReviewsService.create accepts (dto, userId?, userRole?); controller forwards CurrentUser. Optional delivered-order check present or explicitly skipped with TODO.
- **Evidence**: reviews.service.ts + reviews.controller.ts updated code.

### AC-12: Auth routes carry stricter throttle than global 60/min
- **Type**: `rule`
- **Given**: Fresh app start
- **When**: Controller endpoints inspected
- **Then**: login, signup, verifyOtp, resend-otp, forgot-password, reset-password, refresh — each carry `@Throttle(...)` with limit ≤ 10 / ttl=60_000 ms (or stricter e.g. 5/min). Throttler remains globally registered as today.
- **Evidence**: auth.controller.ts + promos validate endpoint also review-read (already guarded; no change needed).

### AC-13: Fake analytics replaced with real aggregations
- **Type**: `rule`
- **Given**: DB has orders.delivered entries spread across days.
- **When**: getRevenueChart('week') called via API
- **Then**: Returns actual day-by-day totals (not `Math.floor(Math.random() * 500) + 100`). getPeakHours likewise returns real bucket counts from orders or bookings delivered timestamps.
- **Pass Condition**: getRevenueChart and getPeakHours use Mongo aggregation. Delete the random block.
- **Evidence**: grep of `Math.random` in restaurants.service.ts → 0 matches in analytics methods.

### AC-14: Hardcoded menu rating 4.5 removed; promos payload includes subtotal; password complexity enforced; sign-up role restricted; order-create scoped; prod CORS strict; stripe apiVersion real.
- **Type**: `rule`
- **Given**: Backend and frontend builds
- **When**: Code inspection runs
- **Then**:
  1. menus.service formatMenu — no `rating: 4.5` literal.
  2. api.js promosApi.validate signature takes 2 args and posts `{ code, subtotal }`.
  3. signup-auth.dto.ts password — @MinLength(8) + regex strength decorator; change-password dto same.
  4. auth.service createUser rejects role === 'admin' on self-serve signup.
  5. orders.service create forces customerId for CUSTOMER role caller.
  6. main.ts parseCorsOrigins filters localhost origins if NODE_ENV === production and CORS_ORIGINS env default-unmodified.
  7. stripe apiVersion is a real 2024 string.
- **Pass Condition**: Grep for 4.5 hardcoded rating = 0 matches; grep `promosApi.validate` arity-2; DTO file reads; code inspection of auth createUser role guard; orders.create scoping; CORS filter; Stripe literal apiVersion.
- **Evidence**: File reads + both builds.

### AC-15: Backend + Frontend build clean with 0 errors
- **Type**: `rule`
- **Given**: All task edits applied
- **When**: `cd SPML_backend/supameal_backend && npm run build` and `cd supameal-frontend && npm run build`
- **Then**: Exit 0; no TS / Vite error lines.
- **Evidence**: Terminal logs showing exit 0 and success message.

### AC-16: Security layering quality rubric
- **Type**: `rubric`
- **Dimension**: Defense-in-depth across controller + service for user-owned resource read/write
- **Scale**: 1-5
- **Anchors**: 1 = no service-layer checks (controller-only); 3 = half of CRUD have service checks; 5 = every write/scoped read includes service layer ownership, controller guard as belt+ suspenders
- **Pass Threshold**: >= 4
- **Evidence**: Sample of 8+ services / 30+ routes reviewed; list of those with service-level checks.

## Open Questions
- [ ] None.
