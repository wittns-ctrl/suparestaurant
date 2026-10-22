import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { homeForUser } from './utils/auth';

import LandingPage from './pages/LandingPage';

// Code-splitting: every route below is its own chunk, loaded on demand.
// The landing page stays eager so first paint never waits on a lazy chunk.
const Login = lazy(() => import('./pages/auth/Login'));
const BlockedAccountPage = lazy(() => import('./pages/auth/BlockedAccountPage'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerifyOtp = lazy(() => import('./pages/auth/VerifyOtp'));
const OAuthCallback = lazy(() => import('./pages/auth/OAuthCallback'));
const RestaurantsPage = lazy(() => import('./pages/Restaurants/Restaurants'));
const RestaurantDetail = lazy(() => import('./pages/Restaurants/RestaurantDetails'));
const CartPage = lazy(() => import('./pages/customer/CartPage'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const MenuPage = lazy(() => import('./pages/customer/MenuPage'));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'));
const OrderTrackingPage = lazy(() => import('./pages/customer/OrderTracking'));
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'));
const RegisterRestaurant = lazy(() => import('./pages/owner/RegisterRestaurant'));
const OwnerLogin = lazy(() => import('./pages/owner/OwnerLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage'));
const ReservationsPage = lazy(() => import('./pages/customer/ReservationsPage'));
const BookTablePage = lazy(() => import('./pages/customer/BookTableDash'));
const FooterInfoPage = lazy(() => import('./pages/FooterInfoPage'));
const NewsletterUnsubscribePage = lazy(() => import('./pages/NewsletterUnsubscribePage'));
const HealthPage = lazy(() => import('./pages/HealthPage'));

const RouteFallback = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: 'var(--dash-muted, #8a8a8a)',
    }}
  >
    <p>Loading…</p>
  </div>
);

const HomeRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user?.role) {
    return <Navigate to={homeForUser(user)} replace />;
  }
  return <LandingPage />;
};

// H4: /book-table was reachable only from the dashboard tab system; the
// "Book a Table" button on RestaurantDetails navigated to a dead route.
// This wrapper maps BookTableDash's setActiveTab tab names onto real routes
// and preselects the restaurant passed via navigate(..., { state }).
const BookTableRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveTab = (tab) => navigate(tab === 'bookings' ? '/reservations' : '/customer/dashboard');
  const initialRestaurantId = location.state?.restaurantId || '';
  return (
    <BookTablePage
      setActiveTab={setActiveTab}
      initialRestaurantId={initialRestaurantId}
      initialBookingDate={location.state?.bookingDate || ''}
      initialBookingTime={location.state?.bookingTime || ''}
      initialGuests={location.state?.guests || 2}
    />
  );
};

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();
  const loginRedirect = isAuthenticated ? (
    <Navigate to={homeForUser(user)} replace />
  ) : null;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetail />} />
        <Route path="/company/:page" element={<FooterInfoPage />} />
        <Route path="/newsletter/unsubscribe/:token" element={<NewsletterUnsubscribePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/health/live" element={<HealthPage />} />
        <Route path="/health/ready" element={<HealthPage />} />
        <Route path="/account-blocked" element={<BlockedAccountPage />} />
        <Route path="/menu/:restaurantId" element={<MenuPage />} />
        <Route
          path="/login"
          element={loginRedirect || <Login />}
        />
        <Route
          path="/admin-login"
          element={loginRedirect || <Login accountType="admin" />}
        />
        <Route
          path="/signup"
          element={loginRedirect || <SignUp />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/register-restaurant" element={<RegisterRestaurant />} />
        <Route path="/owner-login" element={<OwnerLogin />} />
        <Route path="*" element={<NotFound />} />

        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute roles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={['customer', 'owner', 'admin']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute roles={['customer']}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute roles={['customer']}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-tracking/:orderId"
          element={
            <ProtectedRoute roles={['customer']}>
              <OrderTrackingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations"
          element={
            <ProtectedRoute roles={['customer']}>
              <ReservationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-table"
          element={
            <ProtectedRoute roles={['customer']}>
              <BookTableRoute />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute roles={['owner']} allowPendingOwnerDashboard>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
