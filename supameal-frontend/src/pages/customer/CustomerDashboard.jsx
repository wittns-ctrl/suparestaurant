import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, UtensilsCrossed, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout';

import DashboardHome from './DashboardHome';
import ProfilePage from './ProfilePage';
import BookTableDash from './BookTableDash';
import MyBookings from './MyBookings';
import MenuPage from './MenuPage';
import CartPage from './CartPage';
import CheckoutPage from './CheckoutPage';
import MyOrders from './MyOrders';
import FavoritesPage from './FavoritesPage';
import OrderTracking from './OrderTracking';

const customerSidebarConfig = [
  { id: 'overview', label: 'Dashboard Home', icon: LayoutDashboard },
  {
    id: 'dining',
    label: 'Order Food',
    icon: UtensilsCrossed,
    subItems: [
      { id: 'menu', label: 'Menu' },
      { id: 'cart', label: 'Cart' },
      { id: 'checkout', label: 'Checkout' },
    ],
  },
  {
    id: 'activity',
    label: 'Bookings & Orders',
    icon: CalendarCheck,
    subItems: [
      { id: 'book-table', label: 'Book Table' },
      { id: 'bookings', label: 'My Bookings' },
      { id: 'orders', label: 'My Orders' },
      { id: 'order-tracking', label: 'Order Tracking' },
      { id: 'favorites', label: 'Favorites' },
    ],
  },
  { id: 'profile', label: 'Profile', icon: User },
];

const VALID_TABS = new Set([
  'overview', 'menu', 'cart', 'checkout', 'book-table',
  'bookings', 'orders', 'order-tracking', 'favorites', 'profile',
]);

const CustomerDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    VALID_TABS.has(requestedTab) ? requestedTab : 'overview',
  );
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const { cartCount } = useCart();

  const sidebarWithBadges = customerSidebarConfig.map(item => {
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.map(sub =>
          sub.id === 'cart' ? { ...sub, badge: cartCount || undefined } : sub
        ),
      };
    }
    return item;
  });

  // Deep links like /customer/dashboard?tab=menu (used by "Order Food Delivery")
  // land on the right tab, and the URL stays in sync so a refresh doesn't reset.
  const handleSetActiveTab = (tab, orderId) => {
    if (orderId) setTrackingOrderId(orderId);
    if (!VALID_TABS.has(tab)) return;
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <DashboardHome setActiveTab={handleSetActiveTab} />;
      case 'menu': return <MenuPage setActiveTab={handleSetActiveTab} />;
      case 'cart': return <CartPage setActiveTab={handleSetActiveTab} />;
      case 'checkout': return <CheckoutPage setActiveTab={handleSetActiveTab} />;
      case 'book-table': return <BookTableDash setActiveTab={handleSetActiveTab} />;
      case 'bookings': return <MyBookings setActiveTab={handleSetActiveTab} />;
      case 'orders': return <MyOrders setActiveTab={handleSetActiveTab} />;
      case 'order-tracking': return <OrderTracking orderId={trackingOrderId} setActiveTab={handleSetActiveTab} />;
      case 'favorites': return <FavoritesPage setActiveTab={handleSetActiveTab} />;
      case 'profile': return <ProfilePage setActiveTab={handleSetActiveTab} />;
      default: return <DashboardHome setActiveTab={handleSetActiveTab} />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={handleSetActiveTab}
      sidebarConfig={sidebarWithBadges}
      roleName="Customer"
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default CustomerDashboard;
