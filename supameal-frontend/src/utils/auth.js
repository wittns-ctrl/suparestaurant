export function userHasRole(user, role) {
  if (!user) return false;
  const normalized = role === 'restaurant_owner' ? 'owner' : role;
  if ((user.roles || [user.role]).includes(normalized)) return true;
  return (user.restaurantMemberships || []).some(
    (membership) => membership.role === normalized && membership.status === 'active',
  );
}

export function homeForUser(user) {
  if (userHasRole(user, 'admin')) return '/admin/dashboard';
  if (userHasRole(user, 'owner')) return '/owner/dashboard';
  return '/customer/dashboard';
}
