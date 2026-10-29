# SupaMeal Backend — Critical Security Hardening (C1–C4)

## Overview
- **Summary**: Close the four highest-severity backend security/stubbing issues identified in the 2026-09-27 audit: (C1) payments list leakage, (C2) fake-payment mode can accidentally run in production with auto-PAID orders, (C3) restaurants mutate endpoints allow IDOR cross-owner modification, (C4) promos module has no schema/service — just one unguarded hardcoded validate route that duplicates logic inside orders.service.
- **Purpose**: Eliminate every Critical-severity finding before any real-user or staging rollout. No new product features; this is pure security + correctness hardening.
- **Target Users**: Backend runtime (app start-up), authenticated API callers (customer/owner/admin), and future maintainers.

## Goals
- G1 — `GET /payments` list (and `findAll`) cannot expose records to a non-admin caller, enforced at **both** controller and service layer.
- G2 — When `NODE_ENV=production` and Stripe secret key is absent, the app refuses to boot and the fake-payment code path is unreachable; in all envs the constructor warns and logs.
- G3 — `PATCH /restaurants/:id` and `POST /:id/images` + `DELETE /:id/images` enforce ownership for OWNER-role callers (must match the restaurant's `ownerId`) and only ADMINs bypass ownership; `DELETE /restaurants/:id` remains ADMIN-only as today.
- G4 — A real Promo schema exists with Mongoose model + DTOs + service + full CRUD endpoints; orders.service uses the promo service for discount resolution (removes the duplicated inline `SUPA10 → $5` block); validate endpoint is auth-guarded + rate-limited + configurable via DB.

## Non-Goals
- Do not introduce any new auth strategy, role, or JWT changes.
- Do not touch frontend routing/pages or contexts.
- Do not implement a promo usage-per-user counter or redemption limit system (just code + validity window + discount flat/percent — enough to remove the hardcode).
- Do not rewrite the whole order/pricing engine (only the promo-resolution piece).
- No deployment / CI / Docker changes.

## Background & Context
Audit 2026-09-27 identified 4 Critical + 6 High + 6 Medium + 4 Low. User explicitly prioritized the 4 Critical only. Existing modules follow NestJS 11 + Mongoose + JWT AuthGuard pattern (see app.module.ts imports list, bookings module as reference for DTO/schema/service layering).

## Functional Requirements
- **FR-1 (Payments scoping)**: `PaymentsService.findAll(userId, userRole)` — admin returns global latest; non-admin throws Unauthorized. Controller passes (user.id, user.role). No behavior change for `/:id`, `/order/:orderId`, DELETE `/:id` (remain ADMIN-only at controller, and service optionally mirrors check).
- **FR-2 (Fake-payments prod guard)**: In `PaymentsService` constructor, when `(NODE_ENV === 'production' || NODE_ENV === 'prod') && !stripeConfigured`, throw a fatal Error that aborts Nest bootstrap. Document that env guard in the warning log message path for non-prod.
- **FR-3 (Restaurant ownership)**: Update signature of `RestaurantsService.update(id, dto, userId?, userRole?)`, `addImages(id, images, userId?, userRole?)`, `removeImage(id, imageUrl, userId?, userRole?)` to accept caller context. Add internal `assertOwnerOrAdmin(restaurant.ownerId, userId, userRole)` helper reusing the bookings pattern. Controller passes `CurrentUser` (add `@CurrentUser()` where missing on PATCH `:id`, POST images, DELETE images). DELETE `/:id` stays ADMIN-only at controller and no ownership check added there.
- **FR-4 (Promo DB module)**:
  - Create `promos/schema/promo.schema.ts` — fields: `code` (unique, uppercase, trimmed), `description`, `discountType` enum (FLAT | PERCENT), `discountValue` (number), `minOrderValue?`, `maxDiscountValue?`, `startsAt?`, `expiresAt?`, `usageLimit?`, `isActive` (default true), `timesUsed` (default 0), timestamps.
  - Create `promos/dto/create-promo.dto.ts`, `update-promo.dto.ts`, `validate-promo.dto.ts`. Use class-validator (IsString, IsEnum, IsNumber, etc.) matching the bookings DTO style.
  - Create `PromosService` — create/findAll/findOne/findByCode (active, not expired, usage remaining)/update/remove/validate(code, orderSubtotal).
  - Update `PromosController`:
    - `POST /promos` — ADMIN only, creates a promo.
    - `GET /promos` — ADMIN only, lists all (with optional active filter).
    - `GET /promos/:id` — ADMIN only.
    - `PATCH /promos/:id` — ADMIN only.
    - `DELETE /promos/:id` — ADMIN only.
    - `POST /promos/validate` — authenticated (JwtAuthGuard + Throttler), accepts `{ code, subtotal }`, calls service validate, returns `{ valid, code, discount, message, discountType }`.
  - Update `orders.service.ts` `create()` to call `promosService.findByCode()` + `validate()` for discount resolution; inline `SUPA10 === $5` removed. Seed / or keep backward-compat: seed data module can be updated optionally but not required.
  - Update `PromosModule` to import `MongooseModule.forFeature([{ name: Promo, schema: promoSchema }])` and export `PromosService`. `OrdersModule` imports `PromosModule`.
  - The inline SUPA10 block in promos.controller (current single file) is replaced with the validate call to service. The hardcoded `promoCode?.toUpperCase() === 'SUPA10'` check inside orders.service.create must be removed entirely.

## Non-Functional Requirements
- **NFR-1 (Security)**: Every mutation of a user-owned resource passes the caller id + role to the service; service performs authorization check before any write; never trust the request body's ownerId/customerId alone.
- **NFR-2 (Fail-fast)**: Missing critical env in production throws early in the provider constructor, not lazily during a request — prevents silent insecure behavior.
- **NFR-3 (Consistency)**: New promo module follows the bookings module pattern (schema enum style, DTO class export, service error exceptions, controller guards).
- **NFR-4 (Builds clean)**: `cd SPML_backend/supameal_backend && npm run build` completes with TS errors === 0. No lint regressions.

## Constraints
- **Technical**: NestJS 11 + Mongoose 8, class-validator DTOs, existing roles.enum style, JwtAuthGuard + RolesGuard + CurrentUser decorator patterns must be reused.
- **Business**: Promo model must support both FLAT-dollar and PERCENT discounts (so SUPA10 can live as a seeded record if desired).
- **Dependencies**: No new third-party packages.

## Assumptions
- ADMIN role = `roles.ADMIN`, OWNER = `roles.OWNER` (per `roles` enum from `users/schema/user.schema.ts`).
- ThrottlerGuard is globally registered via `APP_GUARD` in app.module (confirmed — already present), so `POST /promos/validate` inherits 60/min throttling by default; explicit guard addition is optional but the endpoint must be authenticated.
- `orders.service` already has `promoCode` DTO field (confirmed — present in `order.schema.ts` line 68 and passed into orders.service create).
- No database migrations required — new Mongoose collection auto-created on first write; promo codes are admin-created, so seed is optional and not in scope for this spec.

## Acceptance Criteria

### AC-1: Payments findAll is role-scoped at the service layer and mirrored in the controller pass-through
- **Type**: `rule`
- **Given**: A caller with valid JWT; payments collection contains records from many users.
- **When**: `findAll(userId, userRole)` is called with role !== ADMIN OR `GET /payments` is hit by a non-admin token.
- **Then**: The service throws UnauthorizedException **before** any DB query runs. Only ADMIN role proceeds to query.
- **Pass Condition**: `Read payments.service.ts` shows method signature accepts `(userId?, userRole?)` and first line `if (userRole !== roles.ADMIN) throw new UnauthorizedException(...)`. Payments controller L61-66 passes `CurrentUser` and calls `this.paymentsService.findAll(user.id, user.role)`.
- **Evidence**: File read + `npm run build` succeeds.

### AC-2: Fake-payment path cannot be entered when NODE_ENV === production and Stripe key missing
- **Type**: `rule`
- **Given**: Process env `NODE_ENV=production` and `STRIPE_SECRET_KEY` is unset/empty/does not start with `sk_`.
- **When**: Nest bootstraps and constructs PaymentsService.
- **Then**: Constructor throws an `Error` with a message containing "STRIPE_SECRET_KEY is required in production". Nest bootstrap aborts (no HTTP listener starts).
- **Pass Condition**: The constructor block `if (prodEnv && !this.stripe) throw new Error(...)` exists in payments.service.ts and is reachable before the warning logger. In non-prod, the existing warning branch runs unchanged.
- **Evidence**: File diff showing throw block; standalone test via `NODE_ENV=production node -e "require('./dist/...')"` conceptually would throw. For this task, code inspection + typecheck build suffices.

### AC-3: Restaurant update and image mutate endpoints enforce owner-match for OWNER role
- **Type**: `rule`
- **Given**: Restaurant R has `ownerId = user_O1`; user_O2 has role OWNER; admin has role ADMIN.
- **When**: user_O2 calls `PATCH /restaurants/R_id` with new name, or `POST images`, or `DELETE images/:url`.
- **Then**: Service throws UnauthorizedException ("not the restaurant's owner or admin"). When user_O1 or admin performs the same call, it succeeds.
- **Pass Condition**: `restaurants.service.update/addImages/removeImage` signatures include `userId?, userRole?`; internal helper `assertOwnerOrAdmin(restaurant.ownerId, userId, userRole)` is called before writes. Controller update + images endpoints inject `@CurrentUser() user` and pass to service.
- **Evidence**: File read of updated signatures + helper presence + `nest build` passes.

### AC-4: Promo module has schema, service, DTOs, RBAC CRUD, and replaces inline hardcodes
- **Type**: `rule`
- **Given**: A fresh API boot with no prior promos.
- **When**: ADMIN `POST /promos` creates a promo; then `POST /promos/validate` is called by any authenticated user for that code; then an order is `create()`d with that promoCode.
- **Then**:
  1. Promo document is saved in `promos` collection with unique code;
  2. `validate` returns correct discount from DB;
  3. orders.service.create uses the promo result; zero references to the inline `SUPA10` constant `toUpperCase() === 'SUPA10'` string-comparison remain in promos.controller OR orders.service.
- **Pass Condition**: Glob for `SUPA10` returns 0 results in backend TS source (or at most a seed file); promos directory contains schema/dto/service files; promos.module registers Mongoose.forFeature and exports PromosService; orders.module imports PromosModule.
- **Evidence**: Directory listing of promos/, Grep for SUPA10 (excluding comments), `nest build` passes.

### AC-5: validate endpoint is auth-guarded and input-validated
- **Type**: `rule`
- **Given**: No JWT header, or an invalid payload for validate.
- **When**: `POST /promos/validate` is hit without JWT guard or with missing fields.
- **Then**: 401 Unauthorized (missing JWT) OR 400 Bad Request via class-validator DTO on `{ code: string, subtotal: number }`.
- **Pass Condition**: promos.controller validate route has `@UseGuards(JwtAuthGuard)` and body typed as `ValidatePromoDto` with decorators.
- **Evidence**: File read + build.

### AC-6: All changes type-check cleanly with no TS build errors
- **Type**: `rule`
- **Given**: No prior TypeScript errors.
- **When**: `cd SPML_backend/supameal_backend; npm run build` runs.
- **Then**: Exit code 0; tsc reports 0 error TS lines in stdout.
- **Pass Condition**: Run `npm run build` and capture exit code === 0 with last stdout lines showing "Build complete" or Nest equivalent.
- **Evidence**: Terminal log output from build.

### AC-7: Layering quality — authorization checks live at service layer, not only controller
- **Type**: `rubric`
- **Dimension**: Defense-in-depth of auth checks across controller + service
- **Scale**: 1-5
- **Anchors**: 1 = checks only at controller (no service check); 3 = controller guards only, service sometimes verifies; 5 = every mutation's service has ownership/role assertion, controller also applies guards as belt-and-suspenders
- **Pass Threshold**: >= 4
- **Evidence**: File reads of payments, restaurants, promos services showing service-level assertions for every write/read-list path that is role-sensitive.

## Open Questions
- [ ] None.
