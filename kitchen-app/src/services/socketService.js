// kitchen-app/src/services/socketService.js
import { io } from 'socket.io-client';

let socket = null;

/**
 * Initialize Socket.IO connection for Kitchen App
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
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Kitchen App connected to WebSocket:', socket.id);
    
    // Join kitchen room
    socket.emit('join-kitchen');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Kitchen App disconnected:', reason);
  });

  socket.on('reconnect', () => {
    console.log('🔄 Kitchen App reconnected');
    socket.emit('join-kitchen');
  });

  return socket;
};

/**
 * Listen for new orders
 */
export const onNewOrder = (callback) => {
  if (!socket) return;

  socket.on('new-order', (order) => {
    console.log('📥 New order received:', order.orderNumber);
    
    // Play kitchen alert sound
    playKitchenAlert();
    
    callback(order);
  });
};

/**
 * Listen for order status updates
 */
export const onOrderStatusUpdated = (callback) => {
  if (!socket) return;

  socket.on('order-status-updated', (order) => {
    console.log('📥 Order status updated:', order.orderNumber, order.status);
    callback(order);
  });
};

/**
 * Listen for order deletions
 */
export const onOrderDeleted = (callback) => {
  if (!socket) return;

  socket.on('order-deleted', (orderId) => {
    console.log('📥 Order deleted:', orderId);
    callback(orderId);
  });
};

/**
 * Play kitchen alert sound (louder than admin)
 */
const playKitchenAlert = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1000;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  } catch (error) {
    console.warn('Could not play kitchen alert:', error);
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get socket instance
 */
export const getSocket = () => socket;

/**
 * Check if connected
 */
export const isConnected = () => socket && socket.connected;