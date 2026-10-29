# SupaMeal Frontend Stabilization - Product Requirements Document

## Overview
- **Summary**: Resolve missing imports, broken contexts, and page routing inconsistencies in the SupaMeal React frontend so that the application compiles and core user flows (landing, auth, dashboards) work without runtime errors.
- **Purpose**: Restore frontend buildability and runtime integrity after App.jsx was updated to reference contexts and pages that do not exist in the repository.
- **Target Users**: Frontend developers, QA, and end users running the local dev server.

## Goals
- Eliminate all unresolved imports in App.jsx, ProtectedRoute, and downstream files.
- Provide minimal working implementations for three missing context providers (Toast, Theme, Notifications).
- Fix path mismatches for pages that exist under different names/directories than App.jsx imports.
- Create stubs for three missing route pages (NotFound, VerifyEmail, ReservationsPage) referenced by the router.
- Align ProtectedRoute with the actual AuthContext API (loading instead of isLoading, no token field exposed).

## Non-Goals
- No backend changes.
- No Stripe, Supabase, or external integration work.
- No UI redesign; components should match existing visual conventions only.
- No deep feature implementation for Notifications or Theme beyond a working stub.
- No removal of duplicate page files (that is a separate cleanup).

## Background & Context
- The frontend lives at `supameal-frontend/` (Vite + React 19 + react-router-dom v7).
- `App.jsx` imports `ToastContext`, `ThemeContext`, `NotificationsContext` — none exist under `context/`.
- `App.jsx` imports pages by wrong paths: e.g. `RestaurantsPage` should map to `pages/Restaurants/Restaurants.jsx`; `OrderTrackingPage` → `pages/customer/OrderTracking.jsx`; `ProfilePage` → `pages/customer/ProfilePage.jsx`; etc.
- Missing page stubs: `VerifyEmail`, `NotFound`, `ReservationsPage`, `TestPage`.
- `ProtectedRoute/ProtectedRoute.jsx` calls `useToast()` (missing) and destructures `isLoading` / `token` from `useAuth()` which are not exposed by AuthContext (AuthContext exposes `loading` and persists token in localStorage).
- Previous audit session noted "redundant page files and bypasses real auth via hardcoded demo logins" — those redundancies (e.g. `pages/Login.jsx` vs `pages/auth/Login.jsx`) remain and are out of scope.

## Functional Requirements
- **FR-1**: `ToastContext` provides `showToast(message, type)` and stores transient toast state, with a toast display mounted inside the provider so toasts render when triggered.
- **FR-2**: `ThemeContext` provides a light/dark mode toggle with persistence in localStorage and applies a `data-theme` attribute to `<html>`; defaults to light.
- **FR-3**: `NotificationsContext` provides `notifications[]`, `addNotification()`, `markRead()`, `clearAll()` with localStorage persistence; minimal working shape sufficient for provider wiring.
- **FR-4**: `App.jsx` imports resolve against existing files: existing page files are re-exported or import paths corrected so no import is broken.
- **FR-5**: Router defines routes `/verify-email`, `*` (404), `/reservations`, and `/test` backed by real component files that render without errors.
- **FR-6**: `ProtectedRoute` runs without throwing: uses AuthContext's `loading` field, uses localStorage token presence as proxy, and uses `useToast()` from the new ToastContext.
- **FR-7**: `ForgotPassword` import in App.jsx resolves to the existing `pages/ForgotPassword.jsx` (the auth-version file layout is not modified).

## Non-Functional Requirements
- **NFR-1**: Running `npm run build` from `supameal-frontend/` completes with zero errors (warnings allowed).
- **NFR-2**: Dev server `npm run dev` launches and visiting `/`, `/login`, `/customer/dashboard`, `/owner/dashboard`, `/admin/dashboard`, `/restaurants`, `/cart`, `/checkout`, `/reservations`, `/verify-email`, and a bogus path all render without a white-screen crash (unauthenticated redirects are fine).
- **NFR-3**: No new third-party dependencies are added.
- **NFR-4**: New context providers follow the same pattern as existing `AuthContext` and `CartContext` (named `XxxProvider` export and `useXxx()` hook export, with guard error).

## Constraints
- **Technical**: React 19, react-router-dom v7, no CSS framework assumed — use inline objects or existing `global.css` conventions only.
- **Business**: Pages must remain navigable with the existing role-based redirect logic.
- **Dependencies**: Existing package.json dependencies only (lucide-react, framer-motion are available and may be used for icons/toast animation).

## Assumptions
- Missing pages (`NotFound`, `VerifyEmail`, `ReservationsPage`, `TestPage`) can be minimal stubs with a link back to home/dashboard and do not need full feature implementations.
- The `ForgotPassword` in `pages/` (not `pages/auth/`) is the canonical one and the import path in App.jsx should point to it.
- `ReservationsPage` can simply render `MyBookings` content or equivalent placeholder since booking pages exist under `pages/customer/MyBookings.jsx` and `pages/customer/BookTableDash.jsx`.
- `TestPage` can be a sandbox listing all contexts for quick sanity check.

## Acceptance Criteria

### AC-1: All App.jsx imports resolve
- **Type**: `rule`
- **Given**: A fresh checkout with current dependencies installed
- **When**: `npm run build` is executed in `supameal-frontend/`
- **Then**: Build completes with exit code 0 and no "Failed to resolve import" errors
- **Pass Condition**: `npm run build` stderr/stdout contains no unresolved-import errors and exit code is 0
- **Evidence**: Shell command output captured from build run

### AC-2: Missing contexts exist and expose expected hooks
- **Type**: `rule`
- **Given**: Frontend source tree
- **When**: Inspecting `src/context/`
- **Then**: `ToastContext.jsx`, `ThemeContext.jsx`, and `NotificationsContext.jsx` files exist, each exports a Provider component and a `useXxx()` hook that throws outside the provider
- **Pass Condition**: Files exist and grep for `export const XxxProvider` and `export const useXxx` succeeds for all three
- **Evidence**: `Glob` + `Read` of the three files; successful `useXxx` call inside provider, throws outside (covered by build success)

### AC-3: ProtectedRoute runs without runtime errors
- **Type**: `rule`
- **Given**: Running dev server
- **When**: Navigating to `/customer/dashboard` unauthenticated
- **Then**: No exception is thrown; component either renders loading, redirects to login, or shows a toast without crashing
- **Pass Condition**: Dev console shows no uncaught errors referencing `useToast`, `isLoading`, or `token` undefined
- **Evidence**: Browser console captured via integrated browser after navigation attempt

### AC-4: Missing route pages render
- **Type**: `rule`
- **Given**: Running dev server
- **When**: Visiting `/verify-email`, `/reservations`, `/test`, and a bogus path `/does-not-exist`
- **Then**: Each route renders a React component (status codes are not enforced; client-side routing only)
- **Pass Condition**: All four paths produce a rendered DOM element with page content and no crash
- **Evidence**: Integrated browser snapshot for each of the four URLs

### AC-5: Core routes remain navigable
- **Type**: `rule`
- **Given**: Running dev server
- **When**: Visiting `/`, `/login`, `/signup`, `/restaurants`, then triggering a demo login (customer role) and navigating to `/customer/dashboard`, `/cart`
- **Then**: Every route renders; role redirects work when authenticated; no console errors from contexts or routing
- **Pass Condition**: No runtime exceptions; landing page is visible, login page is visible, dashboard renders after simulated auth state
- **Evidence**: Integrated browser snapshots and console inspection

### AC-6: Provider wrapping order is preserved in App
- **Type**: `rule`
- **Given**: `App.jsx` source
- **When**: Reading the provider stack
- **Then**: ThemeProvider wraps ToastProvider wraps AuthProvider wraps NotificationsProvider wraps CartProvider, matching original intent
- **Pass Condition**: Nested order in JSX matches `<ThemeProvider><ToastProvider><AuthProvider><NotificationsProvider><CartProvider>...`
- **Evidence**: `Read` of `App.jsx` provider section

### AC-7: Toast UX quality (consumable API)
- **Type**: `rubric`
- **Dimension**: Developer experience of ToastContext API
- **Scale**: 1-5
- **Anchors**: 1 = `showToast` does not exist or crashes on call; 3 = `showToast(msg, type)` works, toasts auto-dismiss, UI is basic; 5 = stacked toasts with timeout, close button, types styled differently (info/success/error/warning), accessible ARIA labels
- **Pass Threshold**: >= 3
- **Evidence**: Review of ToastContext source + screenshot of rendered toast in browser

### AC-8: Context implementation fidelity to existing patterns
- **Type**: `rubric`
- **Dimension**: Conformance of new contexts to existing AuthContext/CartContext style
- **Scale**: 1-5
- **Anchors**: 1 = completely different shape (e.g. default exports instead of named, different hook guard); 3 = same file layout, same hook guard pattern, named exports, slightly different helper structure; 5 = exact same conventions: `createContext`, Provider with useState/useCallback, hook at bottom that throws on null ctx, same export names
- **Pass Threshold**: >= 4
- **Evidence**: Side-by-side code review of new contexts vs AuthContext.jsx

## Open Questions
- [ ] Should `ReservationsPage` wrap `MyBookings` component or be a distinct layout with booking list + create booking? (Assumption: use a minimal stub that links to or embeds MyBookings.)
- [ ] Should `VerifyEmail` reuse logic from `VerifyOtp.jsx` under `pages/auth/`? (Assumption: create a lightweight stub page that links to VerifyOtp or reuses the OTP flow shape.)
