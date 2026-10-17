import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userHasRole } from '../../utils/auth';

const ROLE_LANDING = {
  customer: '/customer/dashboard',
  owner: '/owner/dashboard',
  admin: '/admin/dashboard',
};

const ALLOWED_ROLES = ['customer', 'owner', 'admin'];

export default function ProtectedRoute({ children, roles, allowPendingOwnerDashboard = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const requiredRoles = roles && roles.length > 0 ? roles : ALLOWED_ROLES;
  const hasRouteRole = requiredRoles.some((role) => userHasRole(user, role));
  // Pending restaurant owners have no active membership role yet, but they
  // still need access to the owner dashboard to see their application status.
  const canViewOwnerApplication = allowPendingOwnerDashboard && user?.accountType === 'owner';
  const hasRouteAccess = hasRouteRole || canViewOwnerApplication;

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && !hasRouteAccess) {
      showToast(`You don't have permission to access that page`, 'error');
    }
  }, [isAuthenticated, loading, user, hasRouteAccess, showToast]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
      }}>
        <div style={{
          color: '#6b7280',
          fontSize: 14,
        }}>Checking authentication…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname, fromState: location.state }} />;
  }

  if (!hasRouteAccess) {
    const fallback = ROLE_LANDING[user?.role] || (user?.accountType === 'owner' ? '/owner/dashboard' : '/login');
    return <Navigate to={fallback} replace />;
  }

  return children;
}
