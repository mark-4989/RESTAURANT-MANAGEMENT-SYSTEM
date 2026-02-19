// customer-app/src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);

// Strip trailing /api — prevents /api/api/ double-prefix
const API_URL = (import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com').replace(/\/api\/?$/, '');

export const NOTIFICATION_TYPES = {
  ORDER_PLACED:    { label: 'Order Placed',        emoji: '🧾', color: '#3b82f6' },
  ORDER_CONFIRMED: { label: 'Order Confirmed',     emoji: '✅', color: '#10b981' },
  PREPARING:       { label: 'Being Prepared',      emoji: '🔥', color: '#f59e0b' },
  READY:           { label: 'Ready to Collect!',   emoji: '🍽️', color: '#8b5cf6' },
  ON_THE_WAY:      { label: 'On the Way',          emoji: '🚚', color: '#06b6d4' },
  DELIVERED:       { label: 'Delivered',           emoji: '🏠', color: '#10b981' },
  PAYMENT_SUCCESS: { label: 'Payment Confirmed',   emoji: '💳', color: '#10b981' },
  PAYMENT_FAILED:  { label: 'Payment Failed',      emoji: '❌', color: '#ef4444' },
  CANCELLED:       { label: 'Order Cancelled',     emoji: '🚫', color: '#ef4444' },
  CHEF_MESSAGE:    { label: 'Message from Chef',   emoji: '👨‍🍳', color: '#dc2626' },
  PROMO:           { label: 'Special Offer',       emoji: '🎉', color: '#f59e0b' },
};

// Warm, friendly messages per order type and status
export const getNotificationMessage = (type, orderNumber, orderType = 'pickup') => {
  const typeLabel = orderType === 'delivery' ? 'delivery' : orderType === 'dine-in' ? 'dine-in order' : 'pickup order';
  const messages = {
    ORDER_PLACED: {
      delivery: `Your delivery order #${orderNumber} is confirmed! 🎉 We're getting everything ready for you.`,
      pickup:    `Your pickup order #${orderNumber} is in! 🎉 We'll let you know the moment it's ready.`,
      'dine-in': `Welcome! Your dine-in order #${orderNumber} has been placed. Sit back and relax!`,
      preorder:  `Your pre-order #${orderNumber} is booked! We'll have everything perfect for you. 🍽️`,
      default:   `Your order #${orderNumber} has been placed! We're on it. 🧾`,
    },
    ORDER_CONFIRMED: `Great news! Your order #${orderNumber} has been confirmed and sent to the kitchen. 🙌`,
    PREPARING:       `Our chef is now preparing your order #${orderNumber} with love and care. 🔥 Smells amazing already!`,
    READY: {
      delivery: `Your order #${orderNumber} is packed and ready — the driver will pick it up shortly! 🚚`,
      pickup:   `Your order #${orderNumber} is ready for pickup! Come grab it while it's hot. 🍽️`,
      'dine-in': `Your order #${orderNumber} is on its way to your table! Enjoy your meal. 🍽️`,
      default:  `Your order #${orderNumber} is ready! 🍽️`,
    },
    ON_THE_WAY:      `Your order #${orderNumber} is on the way — the driver is heading to you now. 🚚 Track it live!`,
    DELIVERED:       `Your order #${orderNumber} has arrived! We hope you enjoy every bite. Bon appétit! 🏠❤️`,
    PAYMENT_SUCCESS: `Payment for order #${orderNumber} was successful. Thank you for dining with us! 💳`,
    PAYMENT_FAILED:  `Payment for order #${orderNumber} could not be processed. Please try again or contact support.`,
    CANCELLED:       `Your order #${orderNumber} has been cancelled. If you need help, we're here for you.`,
    CHEF_MESSAGE:    `The chef has sent you a message about order #${orderNumber}. 👨‍🍳`,
    PROMO:           `You have a special offer waiting for you! 🎉`,
  };

  const entry = messages[type];
  if (!entry) return `Update on your order #${orderNumber}`;
  if (typeof entry === 'string') return entry;
  return entry[orderType] || entry.default || entry.delivery || Object.values(entry)[0];
};

export const NotificationProvider = ({ children, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const socketRef      = useRef(null);
  const toastTimersRef = useRef({});
  const toastCountRef  = useRef(0);

  // ── Load existing notifications from DB ─────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    fetch(`${API_URL}/api/notifications/${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ data }) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(err => console.error('Notifications fetch failed:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Socket.IO: real-time pushes ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_customer_room', { userId });
    });

    socket.on('new_notification', (notif) => {
      const meta     = NOTIFICATION_TYPES[notif.type] || {};
      const enriched = {
        ...notif,
        emoji: notif.emoji || meta.emoji,
        color: notif.color || meta.color,
        label: notif.label || meta.label,
      };
      setNotifications(prev => {
        // Deduplicate: skip if same _id already exists
        if (prev.some(n => n._id === enriched._id)) return prev;
        return [enriched, ...prev];
      });
      pushToast(enriched);
    });

    socket.on('connect_error', err => console.error('Socket error:', err.message));

    return () => {
      socket.emit('leave_customer_room', { userId });
      socket.disconnect();
      Object.values(toastTimersRef.current).forEach(clearTimeout);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast helpers ────────────────────────────────────────────────────────────
  const pushToast = useCallback((notif) => {
    toastCountRef.current += 1;
    const toastId = `toast_${Date.now()}_${toastCountRef.current}`;
    setToasts(prev => [...prev, { ...notif, toastId }]);

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
      delete toastTimersRef.current[toastId];
    }, 5500);
    toastTimersRef.current[toastId] = timer;
  }, []);

  const dismissToast = useCallback((toastId) => {
    clearTimeout(toastTimersRef.current[toastId]);
    delete toastTimersRef.current[toastId];
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  // ── Optimistic local notification (called right when order is placed) ────────
  const addNotification = useCallback((type, { orderId, orderNumber, message, orderType, extra = {} }) => {
    const meta  = NOTIFICATION_TYPES[type] || {};
    const notif = {
      _id: `local_${Date.now()}`,
      type,
      orderId,
      orderNumber,
      title:   meta.label,
      label:   meta.label,
      message: message || getNotificationMessage(type, orderNumber, orderType),
      emoji:   meta.emoji,
      color:   meta.color,
      read:    false,
      createdAt: new Date().toISOString(),
      ...extra,
    };
    setNotifications(prev => [notif, ...prev]);
    pushToast(notif);
    return notif;
  }, [pushToast]);

  // ── Read actions ─────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (notifId) => {
    setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
    if (!notifId.startsWith('local_')) {
      fetch(`${API_URL}/api/notifications/${notifId}/read`, { method: 'PATCH' }).catch(() => {});
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (userId) {
      fetch(`${API_URL}/api/notifications/read-all/${userId}`, { method: 'PATCH' }).catch(() => {});
    }
  }, [userId]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    if (userId) {
      fetch(`${API_URL}/api/notifications/clear/${userId}`, { method: 'DELETE' }).catch(() => {});
    }
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      toasts,
      unreadCount,
      loading,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
      dismissToast,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};