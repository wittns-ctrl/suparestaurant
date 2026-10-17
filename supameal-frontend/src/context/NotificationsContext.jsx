import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationsContext = createContext(null);

const STORAGE_KEY = 'supameal:notifications';

const loadFromStorage = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveToStorage = (list) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
};

let idCounter = 0;
const nextId = () => `n_${Date.now().toString(36)}_${++idCounter}`;

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const addNotification = useCallback((data) => {
    const record = {
      id: nextId(),
      title: data?.title || 'Notification',
      message: data?.message || '',
      read: false,
      createdAt: new Date().toISOString(),
      ...(data && typeof data === 'object' ? data : {}),
      id: undefined,
    };
    record.id = nextId();
    setNotifications((prev) => [record, ...prev]);
    return record.id;
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        remove,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider');
  return ctx;
};
