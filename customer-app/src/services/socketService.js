// customer-app/src/services/socketService.js
import { io } from 'socket.io-client';

let socket = null;
let currentCustomer = null;

/**
 * Initialize Socket.IO connection for Customer App
 */
export const initializeSocket = (customerName) => {
  if (socket && socket.connected) {
    console.log('🔌 Socket already connected');
    return socket;
  }

  currentCustomer = customerName;

  socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Customer App connected to WebSocket:', socket.id);
    
    // Join customer room
    if (customerName) {
      socket.emit('join-customer', customerName);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Customer App disconnected:', reason);
  });

  socket.on('reconnect', () => {
    console.log('🔄 Customer App reconnected');
    if (currentCustomer) {
      socket.emit('join-customer', currentCustomer);
    }
  });

  return socket;
};

/**
 * Listen for order creation confirmation
 */
export const onOrderCreated = (callback) => {
  if (!socket) return;

  socket.on('order-created', (order) => {
    console.log('📥 Order created:', order.orderNumber);
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
    
    // Play sound for important status changes
    if (order.status === 'ready' || order.status === 'completed') {
      playCustomerNotification();
    }
    
    callback(order);
  });
};

/**
 * Play customer notification sound
 */
const playCustomerNotification = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
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
    currentCustomer = null;
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