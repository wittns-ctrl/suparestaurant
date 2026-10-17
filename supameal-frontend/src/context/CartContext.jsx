import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { menusApi } from '../services/api';

const CartContext = createContext(null);

const CART_KEY = 'supameal_cart';
const RESTAURANT_KEY = 'selectedRestaurantId';

export const MENU_ITEMS = [];

const readStoredCart = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(readStoredCart);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(
    () => localStorage.getItem(RESTAURANT_KEY) || null,
  );
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Persist cart across reloads — previously only the restaurant id survived
  useEffect(() => {
    try {
      if (Object.keys(cart).length > 0) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      } else {
        localStorage.removeItem(CART_KEY);
      }
    } catch {
      // storage unavailable — cart stays in memory
    }
  }, [cart]);

  const loadMenu = useCallback(async (restaurantId) => {
    if (!restaurantId) return;
    setLoadingMenu(true);
    try {
      const res = await menusApi.list(restaurantId);
      const items = Array.isArray(res) ? res : res?.data || [];
      setMenuItems(items);
      setSelectedRestaurantId(restaurantId);
      localStorage.setItem(RESTAURANT_KEY, restaurantId);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    const savedRestaurant = localStorage.getItem(RESTAURANT_KEY);
    if (savedRestaurant) loadMenu(savedRestaurant);
  }, [loadMenu]);

  const selectRestaurant = useCallback((restaurantId) => {
    if (String(selectedRestaurantId) === String(restaurantId)) return;
    localStorage.setItem(RESTAURANT_KEY, restaurantId);
    setCart({});
    setMenuItems([]);
    setSelectedRestaurantId(restaurantId);
    loadMenu(restaurantId);
  }, [loadMenu, selectedRestaurantId]);

  const addToCart = (id) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[id] > 1) updated[id]--;
      else delete updated[id];
      return updated;
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      const updated = { ...prev };
      const next = (updated[id] || 0) + delta;
      if (next <= 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });
  };

  const clearCart = () => setCart({});

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    // Compare as strings both ways — menu ids may be numbers or strings depending on source
    const item = menuItems.find(m => String(m.id) === String(id));
    return item ? { ...item, qty } : null;
  }).filter(Boolean);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{
      cart, cartItems, cartCount, subtotal, menuItems, loadingMenu,
      selectedRestaurantId, selectRestaurant, loadMenu,
      addToCart, removeFromCart, updateQty, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
