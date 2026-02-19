// customer-app/src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);

// Strip trailing /api if Vercel env var includes it — prevents /api/api/ double-prefix
const API_URL = (import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com').replace(/\/api\/?$/, '');

export const NOTIFICATION_TYPES = {
  ORDER_PLACED:    { label: 'Order Placed',      emoji: '🧾', color: '#3b82f6' },
  ORDER_CONFIRMED: { label: 'Order Confirmed',   emoji: '✅', color: '#10b981' },
  PREPARING:       { label: 'Being Prepared',    emoji: '🔥', color: '#f59e0b' },
  READY:           { label: 'Ready!',            emoji: '🍽️', color: '#8b5cf6' },
  ON_THE_WAY:      { label: 'On the Way',        emoji: '🚚', color: '#06b6d4' },
  DELIVERED:       { label: 'Delivered',         emoji: '🏠', color: '#10b981' },
  PAYMENT_SUCCESS: { label: 'Payment Confirmed', emoji: '💳', color: '#10b981' },
  PAYMENT_FAILED:  { label: 'Payment Failed',    emoji: '❌', color: '#ef4444' },
  CANCELLED:       { label: 'Order Cancelled',   emoji: '🚫', color: '#ef4444' },
  CHEF_MESSAGE:    { label: 'Message from Chef', emoji: '👨‍🍳', color: '#dc2626' },
  PROMO:           { label: 'Special Offer',     emoji: '🎉', color: '#f59e0b' },
};

export const NotificationProvider = ({ children, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const socketRef      = useRef(null);
  const toastTimersRef = useRef({});

  // Debug: log which API URL is being used so you can confirm in browser console
  useEffect(() => {
    console.log('🔔 NotificationContext using API_URL:', API_URL);
    console.log('🔔 userId:', userId);
  }, [userId]);

  // ── Load existing notifications from DB ───────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    console.log('📥 Fetching notifications for user:', userId);
    fetch(`${API_URL}/api/notifications/${userId}`)
      .then(r => {
        console.log('📥 Notifications fetch status:', r.status);
        return r.ok ? r.json() : Promise.reject(r.status);
      })
      .then(({ data }) => {
        console.log('📥 Notifications received:', data?.length || 0);
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch((err) => console.error('📥 Notifications fetch failed:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Socket.IO: join room, listen for real-time pushes ────────────────────
  useEffect(() => {
    if (!userId) return;

    console.log('🔌 Connecting notification socket to:', API_URL);

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Notification socket connected, joining room: customer_' + userId);
      socket.emit('join_customer_room', { userId });
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    // Server pushes this when an order status changes
    socket.on('new_notification', (notif) => {
      console.log('🔔 New notification received:', notif);
      const meta     = NOTIFICATION_TYPES[notif.type] || {};
      const enriched = {
        ...notif,
        emoji: notif.emoji || meta.emoji,
        color: notif.color || meta.color,
      };
      setNotifications(prev => [enriched, ...prev]);
      pushToast(enriched);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔕 Notification socket disconnected:', reason);
    });

    return () => {
      socket.emit('leave_customer_room', { userId });
      socket.disconnect();
      Object.values(toastTimersRef.current).forEach(clearTimeout);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const pushToast = useCallback((notif) => {
    const toastId = notif._id || `toast_${Date.now()}`;
    setToasts(prev => [...prev, { ...notif, toastId }]);

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
      delete toastTimersRef.current[toastId];
    }, 5000);
    toastTimersRef.current[toastId] = timer;
  }, []);

  const dismissToast = useCallback((toastId) => {
    clearTimeout(toastTimersRef.current[toastId]);
    delete toastTimersRef.current[toastId];
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  // ── Optimistic local notification (called right when order is placed) ─────
  const addNotification = useCallback((type, { orderId, orderNumber, message, extra = {} }) => {
    const meta  = NOTIFICATION_TYPES[type] || {};
    const notif = {
      _id: `local_${Date.now()}`,
      type,
      orderId,
      orderNumber,
      title: meta.label,
      message,
      emoji: meta.emoji,
      color: meta.color,
      read: false,
      createdAt: new Date().toISOString(),
      ...extra,
    };
    setNotifications(prev => [notif, ...prev]);
    pushToast(notif);
    return notif;
  }, [pushToast]);

  // ── Read actions ──────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (notifId) => {
    setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
    fetch(`${API_URL}/api/notifications/${notifId}/read`, { method: 'PATCH' }).catch(() => {});
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