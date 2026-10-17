import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, Bell, ChevronRight, LogOut, Home, Search, Trash2,
  ChevronDown, User, Package, Truck, CalendarCheck, Heart, UtensilsCrossed,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../services/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import Logo from '../../components/Logo/Logo';
import './DashboardLayout.css';

const SEARCH_TARGETS = [
  { id: 'menu', label: 'Order Food / Menu', icon: UtensilsCrossed, type: 'Page' },
  { id: 'cart', label: 'View Cart', icon: Package, type: 'Page' },
  { id: 'book-table', label: 'Book a Table', icon: CalendarCheck, type: 'Action' },
  { id: 'bookings', label: 'My Bookings', icon: CalendarCheck, type: 'Page' },
  { id: 'orders', label: 'My Orders', icon: Truck, type: 'Page' },
  { id: 'favorites', label: 'Favorite Restaurants', icon: Heart, type: 'Page' },
  { id: 'profile', label: 'Edit Profile & Settings', icon: User, type: 'Settings' },
];

const getAvatarLabel = (name) => {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const UserAvatar = ({ user, className = 'user-avatar-sm' }) => {
  const label = getAvatarLabel(user?.name);

  return (
    <div className={className}>
      {label}
    </div>
  );
};

const SidebarItem = ({ item, activeTab, setActiveTab, setSidebarOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;

  const isActive = activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab));

  const handleClick = () => {
    if (item.subItems) {
      setIsOpen(!isOpen);
    } else {
      setActiveTab(item.id);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="sidebar-item-container">
      <button 
        className={`sidebar-nav-item ${isActive && !item.subItems ? 'active' : ''}`}
        onClick={handleClick}
      >
        <div className="nav-item-left">
          <Icon size={20} />
          <span>{item.label}</span>
          {item.badge && <span className="nav-badge">{item.badge}</span>}
        </div>
        {item.subItems && (
          <ChevronDown size={16} className={`dropdown-arrow ${isOpen ? 'open' : ''}`} />
        )}
      </button>

      {item.subItems && isOpen && (
        <div className="sidebar-subitems">
          {item.subItems.map(sub => (
            <button
              key={sub.id}
              className={`sidebar-subitem ${activeTab === sub.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(sub.id);
                setSidebarOpen(false);
              }}
            >
              {sub.label}
              {sub.badge && <span className="nav-badge">{sub.badge}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DashboardLayout = ({ children, activeTab, setActiveTab, sidebarConfig, roleName }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('supaMeal.dashboard.notificationsPanel');
      if (saved) return saved !== 'hidden';
      return typeof window === 'undefined' || window.innerWidth > 1280;
    } catch {
      return true;
    }
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchPopover, setShowSearchPopover] = useState(false);

  // Notification State
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const notificationPopoverRef = useRef(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [deletingNotification, setDeletingNotification] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { showToast } = useToast();
  const activities = [];

  useEffect(() => {
    if (!showNotifPopover) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!notificationPopoverRef.current?.contains(event.target)) {
        setShowNotifPopover(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowNotifPopover(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showNotifPopover]);

  useEffect(() => {
    try {
      localStorage.setItem('supaMeal.dashboard.notificationsPanel', notificationsPanelOpen ? 'visible' : 'hidden');
    } catch {
      // The panel toggle still works for this dashboard session if storage is unavailable.
    }
  }, [notificationsPanelOpen]);

  // Helper: format a backend notification into what the UI expects
  const formatNotif = (n) => ({
    id: n.id || n._id,
    title: n.title || 'Notification',
    text: n.message || n.text || '',
    time: n.createdAt
      ? new Date(n.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : n.time || '',
    unread: n.unread ?? (n.isRead !== undefined ? !n.isRead : !n.read),
  });

  // Load real notifications from API
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const raw = await notificationsApi.list(user.id);
      const list = Array.isArray(raw) ? raw : raw?.data || [];
      setNotifications(list.map(formatNotif));
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
    // Refresh every 60 s while the dashboard is open
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/home', { replace: true });
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
      setShowNotifPopover(false);
    } catch {
      console.error('Failed to mark notifications as read');
    }
  };

  const deleteNotification = async () => {
    if (!notificationToDelete || deletingNotification) return;
    setDeletingNotification(true);
    try {
      await notificationsApi.dismiss(notificationToDelete.id);
      setNotifications((previous) => previous.filter((item) => item.id !== notificationToDelete.id));
      setNotificationToDelete(null);
      showToast('Notification deleted.', 'success');
    } catch (err) {
      showToast(err?.message || 'Could not delete this notification.', 'error');
    } finally {
      setDeletingNotification(false);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  // Filter search results
  const searchResults = searchQuery.trim()
    ? SEARCH_TARGETS.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Find current breadcrumb
  let currentBreadcrumb = 'Overview';
  sidebarConfig.forEach(item => {
    if (item.id === activeTab) currentBreadcrumb = item.label;
    if (item.subItems) {
      item.subItems.forEach(sub => {
        if (sub.id === activeTab) currentBreadcrumb = `${item.label} / ${sub.label}`;
      });
    }
  });

  return (
    <div className={`dashboard-shell ${notificationsPanelOpen ? '' : 'notifications-panel-hidden'}`}>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        
        <div className="sidebar-brand-top">
          <Logo />
        </div>

        <div className="sidebar-user">
          <UserAvatar user={user} />
          <div className="user-info-sm">
            <span className="user-name-sm">{user?.name || 'User'}</span>
            <span className="user-role-sm">{roleName}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-group-label">MAIN MENU</p>
          {sidebarConfig.map(item => (
            <SidebarItem 
              key={item.id} 
              item={item} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              setSidebarOpen={setSidebarOpen} 
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item home-link" onClick={() => navigate('/')}>
            <Home size={20} />
            <span>Back to Home</span>
          </button>
          <button className="sidebar-nav-item logout-link-prominent" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
              <span className="breadcrumb-item">Dashboard</span>
              <ChevronRight size={14} className="breadcrumb-sep" />
              <span className="breadcrumb-current">{currentBreadcrumb}</span>
            </nav>
          </div>

          <div className="topbar-right">
            {/* SEARCH INPUT */}
            <div className="topbar-search" style={{ position: 'relative' }}>
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search feature or page..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSearchPopover(true);
                }}
                onFocus={() => setShowSearchPopover(true)}
              />
              {showSearchPopover && searchQuery.trim() && (
                <div className="topbar-popover" style={{ left: 0, right: 'auto' }}>
                  <div className="popover-header">
                    <h4>Search Results</h4>
                    <button className="link-btn" onClick={() => setShowSearchPopover(false)}>Close</button>
                  </div>
                  <div className="popover-body">
                    {searchResults.length === 0 ? (
                      <div style={{ padding: '1rem', color: 'var(--dash-muted)', fontSize: '0.85rem' }}>
                        No matching features found
                      </div>
                    ) : (
                      searchResults.map(item => {
                        const Icon = item.icon;
                        return (
                          <div 
                            key={item.id} 
                            className="popover-item"
                            onClick={() => {
                              setActiveTab(item.id);
                              setShowSearchPopover(false);
                              setSearchQuery('');
                            }}
                          >
                            <Icon size={18} color="var(--dash-accent)" />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--dash-text)' }}>{item.label}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--dash-muted)' }}>{item.type}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* NOTIFICATION BELL BUTTON */}
            <div ref={notificationPopoverRef} style={{ position: 'relative' }}>
              <button 
                className="topbar-icon-btn notif-btn" 
                aria-label="Notifications"
                onClick={() => setShowNotifPopover(!showNotifPopover)}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge-count">{unreadCount}</span>}
              </button>

              {/* NOTIFICATION DROPDOWN POPOVER */}
              {showNotifPopover && (
                <div className="topbar-popover">
                  <div className="popover-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="link-btn" style={{ fontSize: '0.75rem' }} onClick={markAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="popover-body">
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--dash-muted)', fontSize: '0.85rem' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`popover-item ${n.unread ? 'unread' : ''}`}>
                          <div className="notif-icon-circle">
                            <Bell size={14} color="var(--dash-accent)" />
                          </div>
                          <div className="notif-body">
                            <p><strong>{n.title || 'Notice'}</strong>{n.text ? `: ${n.text}` : ''}</p>
                            <span>{n.time}</span>
                          </div>
                          <button
                            type="button"
                            className="notification-delete-btn"
                            aria-label={`Delete notification: ${n.title || 'Notification'}`}
                            title="Delete notification"
                            onClick={() => setNotificationToDelete(n)}
                          >
                            <Trash2 size={15} />
                            <span style={{ fontSize: '0.75rem' }}>Delete</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* USER PROFILE SHORTCUT */}
            <div className="topbar-user" onClick={() => setActiveTab(sidebarConfig.some(i => i.id === 'profile') ? 'profile' : 'overview')}>
              <UserAvatar user={user} />
              <span>{user?.name || 'User'}</span>
            </div>

            <button
              type="button"
              className="topbar-icon-btn notifications-panel-toggle"
              aria-label={notificationsPanelOpen ? 'Hide notifications panel' : 'Show notifications panel'}
              aria-pressed={notificationsPanelOpen}
              title={notificationsPanelOpen ? 'Hide notifications panel' : 'Show notifications panel'}
              onClick={() => setNotificationsPanelOpen(open => !open)}
            >
              {notificationsPanelOpen ? <PanelRightClose size={19} /> : <PanelRightOpen size={19} />}
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {children}
        </div>
      </div>

      {/* RIGHT SIDEBAR (Notifications / Activities) */}
      <aside className="dashboard-right-sidebar" aria-hidden={!notificationsPanelOpen}>
        <div className="right-sidebar-section">
          <div className="notifications-panel-heading">
            <h4>Notifications</h4>
            <button
              type="button"
              className="notifications-panel-close"
              aria-label="Hide notifications panel"
              onClick={() => setNotificationsPanelOpen(false)}
            >
              <PanelRightClose size={19} />
            </button>
          </div>
          {notifications.length === 0 ? (
            <p style={{ color: 'var(--dash-muted)', fontSize: '0.8rem' }}>No notifications yet.</p>
          ) : (
            notifications.slice(0, 5).map(n => (
              <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                <div className="notif-icon-circle"><Bell size={16} /></div>
                <div className="notif-body">
                  <p><strong>{n.title}</strong>{n.text ? ` — ${n.text}` : ''}</p>
                  <span>{n.time}</span>
                </div>
                <button
                  type="button"
                  className="notification-delete-btn"
                  aria-label={`Delete notification: ${n.title || 'Notification'}`}
                  title="Delete notification"
                  onClick={() => setNotificationToDelete(n)}
                >
                  <Trash2 size={15} />
                  <span style={{ fontSize: '0.75rem' }}>Delete</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="right-sidebar-section">
          <h4>Recent Activities</h4>
          <div className="activities-list">
            {activities.length === 0 ? (
              <p style={{ color: 'var(--dash-muted)', fontSize: '0.8rem' }}>No recent activities.</p>
            ) : (
              activities.map(a => (
                <div key={a.id} className="activity-item">
                  <div className="activity-avatar">{a.avatar}</div>
                  <div className="activity-body">
                    <p><strong>{a.user}</strong> {a.action}</p>
                    <span>{a.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Log out of your account?"
          description="You’ll be signed out and returned to the SupaMeal home page."
          confirmLabel="Log out"
          tone="primary"
          variant="logout"
          Icon={LogOut}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
      )}
      {notificationToDelete && (
        <ConfirmDialog
          title="Delete this notification?"
          description={`${notificationToDelete.title || 'This notification'} will be permanently deleted from your notifications.`}
          confirmLabel={deletingNotification ? 'Deleting…' : 'Delete notification'}
          Icon={Trash2}
          tone="danger"
          confirmDisabled={deletingNotification}
          onCancel={() => !deletingNotification && setNotificationToDelete(null)}
          onConfirm={deleteNotification}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
