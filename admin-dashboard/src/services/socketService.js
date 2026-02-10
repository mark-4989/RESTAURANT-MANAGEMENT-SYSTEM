// admin-dashboard/src/services/socketService.js
import { io } from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize Socket.IO connection for Admin Dashboard
 */
export const initializeSocket = () => {
  if (socket && socket.connected) {
    console.log('🔌 Socket already connected');
    return socket;
  }

  socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
  });

  socket.on('connect', () => {
    console.log('✅ Admin Dashboard connected to WebSocket:', socket.id);
    reconnectAttempts = 0;
    
    // Join admin room
    socket.emit('join-admin');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Admin Dashboard disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    console.error(`❌ Connection error (attempt ${reconnectAttempts}):`, error.message);
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Admin Dashboard reconnected after ${attemptNumber} attempts`);
    reconnectAttempts = 0;
    socket.emit('join-admin');
  });

  return socket;
};

/**
 * Listen for new orders
 */
export const onNewOrder = (callback) => {
  if (!socket) {
    console.error('❌ Socket not initialized');
    return;
  }

  socket.on('new-order', (order) => {
    console.log('📥 New order received:', order.orderNumber);
    
    // Play notification sound
    playNotificationSound();
    
    // Call the callback
    callback(order);
  });
};

/**
 * Listen for order status updates
 */
export const onOrderStatusUpdated = (callback) => {
  if (!socket) {
    console.error('❌ Socket not initialized');
    return;
  }

  socket.on('order-status-updated', (order) => {
    console.log('📥 Order status updated:', order.orderNumber, order.status);
    callback(order);
  });
};

/**
 * Listen for order deletions
 */
export const onOrderDeleted = (callback) => {
  if (!socket) {
    console.error('❌ Socket not initialized');
    return;
  }

  socket.on('order-deleted', (orderId) => {
    console.log('📥 Order deleted:', orderId);
    callback(orderId);
  });
};

/**
 * Listen for menu updates
 */
export const onMenuUpdated = (callback) => {
  if (!socket) {
    console.error('❌ Socket not initialized');
    return;
  }

  socket.on('menu-updated', () => {
    console.log('📥 Menu updated');
    callback();
  });
};

/**
 * Play notification sound
 */
const playNotificationSound = () => {
  try {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Admin Dashboard disconnected from WebSocket');
  }
};

/**
 * Get socket instance
 */
export const getSocket = () => socket;

/**
 * Check if socket is connected
 */
export const isConnected = () => socket && socket.connected;