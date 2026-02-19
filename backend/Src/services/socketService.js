// backend/src/services/socketService.js - COMPLETE FINAL VERSION WITH ALL FEATURES
// ── WHAT CHANGED (3 surgical fixes only, everything else is original) ──────────
// 1. initializeSocket now receives the already-created `io` from server.js
//    instead of calling `new Server(server,...)` which created a SECOND,
//    conflicting Socket.IO instance. Customers joined rooms on io #1 (server.js)
//    but notificationRoutes emitted on io #2 (here) — so nothing was delivered.
// 2. join_customer_room / leave_customer_room handlers added here so they run
//    on the same io instance that notificationRoutes uses.
// 3. getIo() exported so notificationRoutes can reach the shared io as fallback.
// ──────────────────────────────────────────────────────────────────────────────

let io;

const initializeSocket = (ioInstance) => {
  // ✅ FIX: receive the shared io, don't create a new Server
  io = ioInstance;

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // ── Customer notification rooms ── NEW (fix) ──────────────────────────────
    // Must be here on the same io that notificationRoutes.js uses to emit.
    socket.on('join_customer_room', ({ userId }) => {
      if (userId) {
        socket.join(`customer_${userId}`);
        console.log(`📱 Customer joined notification room: customer_${userId}`);
      }
    });

    socket.on('leave_customer_room', ({ userId }) => {
      if (userId) socket.leave(`customer_${userId}`);
    });

    // ============================================
    // DRIVER LOCATION TRACKING
    // ============================================
    socket.on('driver:location', (data) => {
      console.log('📍 Driver location update:', data);
      
      // Broadcast to all admin dashboards
      io.emit('driver:location:admin', {
        type: 'DRIVER_LOCATION_UPDATE',
        ...data,
        timestamp: new Date().toISOString()
      });
      
      // Broadcast to specific order customers
      if (data.orderId) {
        io.to(`order-${data.orderId}`).emit('driver-location-update', {
          type: 'DRIVER_LOCATION_UPDATE',
          ...data,
          timestamp: new Date().toISOString()
        });
        
        io.emit(`order:${data.orderId}:location`, {
          type: 'DRIVER_LOCATION_UPDATE',
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    });

    // ============================================
    // SUBSCRIPTION MANAGEMENT
    // ============================================
    
    // Customer tracking subscription
    socket.on('customer:track', (orderId) => {
      socket.join(`order-${orderId}`);
      console.log(`👤 Customer tracking order ${orderId}`);
    });

    // Subscribe to specific order updates
    socket.on('subscribe-order', (orderId) => {
      socket.join(`order-${orderId}`);
      console.log(`📦 Client ${socket.id} subscribed to order: ${orderId}`);
    });

    // Unsubscribe from order updates
    socket.on('unsubscribe-order', (orderId) => {
      socket.leave(`order-${orderId}`);
      console.log(`📦 Client ${socket.id} unsubscribed from order: ${orderId}`);
    });

    // Admin subscribes to all deliveries
    socket.on('subscribe-admin', () => {
      socket.join('admin-room');
      console.log(`👑 Admin client ${socket.id} connected`);
    });

    // Driver room subscription
    socket.on('driver:join', (driverId) => {
      socket.join(`driver-${driverId}`);
      console.log(`🚗 Driver ${driverId} joined room`);
    });

    // Legacy support for SUBSCRIBE_ORDER
    socket.on('SUBSCRIBE_ORDER', (data) => {
      const orderId = data.orderId || data;
      socket.join(`order-${orderId}`);
      console.log(`📦 Subscribed to order ${orderId}`);
    });

    // ============================================
    // STATUS UPDATES
    // ============================================
    
    // Delivery status updates
    socket.on('delivery:statusUpdate', (data) => {
      socket.broadcast.emit('delivery:statusChanged', data);
      io.emit('admin-delivery-update', {
        type: 'DELIVERY_STATUS_UPDATE',
        ...data,
        timestamp: new Date().toISOString()
      });
    });

    // Reservation updates
    socket.on('reservation:update', (data) => {
      socket.broadcast.emit('reservation:changed', data);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  console.log('✅ Socket.IO initialized for real-time tracking');
  return io;
};

// ============================================
// EMIT FUNCTIONS (CALLED FROM API ROUTES)
// ============================================

// Emit driver location (primary function)
const emitDriverLocation = (data) => {
  if (!io) {
    console.error('❌ Socket.IO not initialized');
    return;
  }
  
  const payload = {
    type: 'DRIVER_LOCATION_UPDATE',
    driverId: data.driverId,
    orderId: data.orderId,
    location: {
      lat: data.lat,
      lng: data.lng
    },
    driverName: data.driverName,
    timestamp: new Date().toISOString()
  };

  // Send to all admin dashboards
  io.emit('driver:location:admin', payload);
  io.to('admin-room').emit('admin-driver-location', payload);
  
  // Send to specific order customer
  if (data.orderId) {
    io.to(`order-${data.orderId}`).emit('driver-location-update', payload);
    io.emit(`order:${data.orderId}:location`, payload);
  }

  console.log(`📍 Driver location broadcasted - Driver: ${data.driverId}, Order: ${data.orderId}, Lat: ${data.lat}, Lng: ${data.lng}`);
};

// Emit delivery status update
const emitDeliveryUpdate = (data) => {
  if (!io) {
    console.error('❌ Socket.IO not initialized');
    return;
  }
  
  const payload = {
    type: 'DELIVERY_STATUS_UPDATE',
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    status: data.status,
    driverId: data.driverId,
    driverName: data.driverName,
    timestamp: new Date().toISOString()
  };

  // Broadcast to all clients
  io.emit('deliveryUpdate', payload);
  
  // Send to specific order room
  if (data.orderId) {
    io.to(`order-${data.orderId}`).emit('delivery-status-update', payload);
    io.emit(`order:${data.orderId}:status`, payload);
  }

  // Send to admin room
  io.to('admin-room').emit('admin-delivery-update', payload);

  console.log(`📦 Delivery status update - Order: ${data.orderNumber}, Status: ${data.status}`);
};

// Emit new order event
const emitNewOrder = (order) => {
  if (!io) {
    console.error('❌ Socket.IO not initialized');
    return;
  }
  
  io.emit('newOrder', order);
  io.to('admin-room').emit('admin-order-update', {
    type: 'NEW_ORDER',
    data: order,
    timestamp: new Date().toISOString()
  });
  
  console.log('📤 New order event emitted:', order.orderNumber);
};

// Emit order status update
const emitOrderStatusUpdate = (order) => {
  if (!io) {
    console.error('❌ Socket.IO not initialized');
    return;
  }
  
  const payload = {
    type: 'ORDER_STATUS_UPDATE',
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    data: order,
    timestamp: new Date().toISOString()
  };

  io.emit('orderStatusUpdated', order);
  io.emit('ORDER_STATUS_UPDATE', payload);
  
  // Send to specific order room
  if (order._id) {
    io.to(`order-${order._id}`).emit('order-status-update', payload);
  }

  // Send to admin room
  io.to('admin-room').emit('admin-order-update', payload);
  
  console.log('📤 Order status updated:', order.orderNumber, '-', order.status);
};

// Emit order deleted event
const emitOrderDeleted = (orderId) => {
  if (!io) return;
  
  io.emit('orderDeleted', orderId);
  io.to('admin-room').emit('admin-order-update', {
    type: 'ORDER_DELETED',
    orderId,
    timestamp: new Date().toISOString()
  });
  
  console.log('📤 Order deleted:', orderId);
};

// Emit driver location update (alternative name for compatibility)
const emitDriverLocationUpdate = (driverData) => {
  if (!io) return;
  
  io.emit('driverLocationUpdate', driverData);
  emitDriverLocation(driverData);
  
  console.log('📍 Driver location update (legacy):', driverData.driverId);
};

// Emit reservation update event
const emitReservationUpdate = (reservationData) => {
  if (!io) return;
  
  const payload = {
    type: 'RESERVATION_UPDATE',
    ...reservationData,
    timestamp: new Date().toISOString()
  };

  io.emit('reservationUpdate', payload);
  io.to('admin-room').emit('admin-reservation-update', payload);
  
  console.log('📤 Reservation update emitted:', reservationData.action);
};

// ← NEW: lets notificationRoutes.js reach the shared io as a fallback
const getIo = () => io;

module.exports = {
  initializeSocket,
  getIo,             // ← NEW export
  emitDriverLocation,
  emitDeliveryUpdate,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitOrderDeleted,
  emitDriverLocationUpdate,
  emitReservationUpdate
};