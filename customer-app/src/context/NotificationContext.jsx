// customer-app/src/context/NotificationContext.jsx — COMPLETE FILE
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);

// Strip trailing /api if Vercel env var includes it — prevents /api/api/ double-prefix
const API_URL = (
  import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com'
).replace(/\/api\/?$/, '');

// ── Metadata for every notification type ─────────────────────────────────────
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

// ── Provider ──────────────────────────────────────────────────────────────────
export const NotificationProvider = ({ children, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const [loading, setLoading]             = useState(true);

  const socketRef      = useRef(null);
  const toastTimersRef = useRef({});

  // KEY FIX: store userId in a ref so the socket connect handler always
  // reads the latest value — eliminates the race condition where Clerk resolves
  // userId AFTER the socket already connected (or vice-versa).
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // ── Fetch existing notifications from DB ────────────────────────────────────
  const fetchNotifications = useCallback(async (uid) => {
    if (!uid) { setLoading(false); return; }
    try {
      console.log('🔔 Fetching notifications for:', uid);
      const res  = await fetch(`${API_URL}/api/notifications/${uid}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        console.log('🔔 Loaded', (data.data || []).length, 'notifications');
      }
    } catch (err) {
      console.error('🔔 Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Connect socket — runs ONCE on mount ─────────────────────────────────────
  useEffect(() => {
    console.log('🔌 Connecting notification socket →', API_URL);

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay:    2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Notification socket connected:', socket.id);
      // Read userId from ref — has the correct value even if Clerk was slow
      const uid = userIdRef.current;
      if (uid) {
        socket.emit('join_customer_room', { userId: uid });
        console.log('📱 Joined room: customer_' + uid);
      } else {
        console.log('📱 Socket connected — userId not ready yet, will join when Clerk resolves');
      }
    });

    socket.on('new_notification', (notif) => {
      console.log('🔔 Socket notification received:', notif.type, notif.orderNumber);
      setNotifications(prev => {
        if (prev.some(n => n._id === notif._id)) return prev; // dedupe
        return [notif, ...prev];
      });
      pushToast(notif);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connect error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    return () => {
      const uid = userIdRef.current;
      if (uid) socket.emit('leave_customer_room', { userId: uid });
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — socket connects once, userId changes handled via ref + effect below

  // ── Re-join room whenever userId becomes available / changes ─────────────────
  // Clerk starts with userId=null, then resolves to the real ID.
  // This effect fires the moment we get a real userId.
  useEffect(() => {
    if (!userId) return;

    const socket = socketRef.current;
    if (!socket) return;

    // Emit join UNCONDITIONALLY — Socket.IO buffers it if not yet connected
    socket.emit('join_customer_room', { userId });
    console.log('📱 join_customer_room emitted for:', userId);

    // Load notification history from DB now that we have a real userId
    fetchNotifications(userId);
  }, [userId, fetchNotifications]);

  // ── Toast push / dismiss ────────────────────────────────────────────────────
  const pushToast = useCallback((notif) => {
    const toastId = `toast_${notif._id || Date.now()}`;
    // Spread NOTIFICATION_TYPES meta so ToastNotifications can read
    // toast.emoji, toast.label, toast.color directly without extra lookups.
    const meta = NOTIFICATION_TYPES[notif.type] || {};

    setToasts(prev => [{ ...meta, ...notif, toastId }, ...prev].slice(0, 5));

    toastTimersRef.current[toastId] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
      delete toastTimersRef.current[toastId];
    }, 6000);
  }, []);

  const dismissToast = useCallback((toastId) => {
    clearTimeout(toastTimersRef.current[toastId]);
    delete toastTimersRef.current[toastId];
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  // ── addNotification — instant local notification from OrderPage ──────────────
  // Called the moment the order API returns success, gives immediate toast+badge
  // BEFORE the backend socket message arrives (which may take a few hundred ms).
  const addNotification = useCallback((type, { orderId, orderNumber, orderType, message: customMsg } = {}) => {
    const meta = NOTIFICATION_TYPES[type] || {};
    const now  = new Date().toISOString();

    const localNotif = {
      _id:         `local_${Date.now()}`,
      userId:      userIdRef.current || 'local',
      type,
      orderId:     orderId     || null,
      orderNumber: orderNumber || null,
      orderType:   orderType   || null,
      message:     customMsg   || `${meta.label || 'Notification'} — Order #${orderNumber || '?'}`,
      read:        false,
      createdAt:   now,
      updatedAt:   now,
    };

    console.log('🔔 addNotification (instant local):', type, orderNumber);
    setNotifications(prev => [localNotif, ...prev]);
    pushToast(localNotif);
  }, [pushToast]);

  // ── Mark single as read ─────────────────────────────────────────────────────
  const markAsRead = useCallback(async (notifId) => {
    setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
    if (!String(notifId).startsWith('local_') && userIdRef.current) {
      try { await fetch(`${API_URL}/api/notifications/${notifId}/read`, { method: 'PATCH' }); }
      catch (err) { console.error('markAsRead error:', err); }
    }
  }, []);

  // ── Mark all as read ────────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const uid = userIdRef.current;
    if (uid) {
      try { await fetch(`${API_URL}/api/notifications/read-all/${uid}`, { method: 'PATCH' }); }
      catch (err) { console.error('markAllAsRead error:', err); }
    }
  }, []);

  // ── Clear all ───────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    setNotifications([]);
    const uid = userIdRef.current;
    if (uid) {
      try { await fetch(`${API_URL}/api/notifications/clear/${uid}`, { method: 'DELETE' }); }
      catch (err) { console.error('clearAll error:', err); }
    }
  }, []);

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

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
};

export default NotificationContext;