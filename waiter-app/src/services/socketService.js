// waiter-app/src/services/socketService.js
import { io } from 'socket.io-client';

let socket = null;

const socketService = {
  connect() {
    if (!socket) {
      socket = io('http://localhost:5000', {
        transports: ['websocket'],
        autoConnect: true,
      });

      socket.on('connect', () => {
        console.log('✅ Connected to WebSocket');
      });

      socket.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket');
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
      });
    }
    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      console.log('🔌 Socket disconnected');
    }
  },

  on(eventName, callback) {
    if (socket) {
      socket.on(eventName, callback);
    } else {
      console.warn('⚠️ Socket not connected. Call connect() first.');
    }
  },

  off(eventName, callback) {
    if (socket) {
      socket.off(eventName, callback);
    }
  },

  emit(eventName, data) {
    if (socket) {
      socket.emit(eventName, data);
    } else {
      console.warn('⚠️ Socket not connected. Call connect() first.');
    }
  },

  getSocket() {
    return socket;
  }
};

export default socketService;