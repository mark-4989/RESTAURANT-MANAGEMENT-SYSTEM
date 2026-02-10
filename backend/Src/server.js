// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const { initializeSocket } = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:5173', // Kitchen Display
      'http://localhost:5174', // Customer App
      'http://localhost:5175', // Admin Dashboard
      'http://localhost:5176', // Waiter Station
      'http://localhost:5177', // Driver App
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Initialize WebSocket service
initializeSocket(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// TEST ROUTE
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    message: '🍽️ Welcome to DineSmart API!',
    status: 'Server is running smoothly',
    websockets: 'enabled',
    timestamp: new Date().toISOString(),
    endpoints: {
      menu: '/api/menu',
      orders: '/api/orders',
      receipts: '/api/receipts',
      qrCodes: '/api/qr-codes',
      staff: '/api/staff',
      drivers: '/api/drivers',
      deliveries: '/api/deliveries',
      reservations: '/api/reservations',
      preorders: '/api/preorders',
      seed: '/api/menu/seed'
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'API is working! 🎉',
    websockets: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DineSmart API is running',
    websockets: 'enabled',
    features: {
      orders: 'active',
      menu: 'active',
      receipts: 'active',
      qrCodes: 'active',
      staff: 'active',
      drivers: 'active',
      deliveries: 'active',
      reservations: 'active',
      preorders: 'active',
      realTime: 'active',
      liveTracking: 'active'
    }
  });
});

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dinesmart', {});
    console.log('✅ MongoDB Connected Successfully!');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

connectDB();

// ============================================
// ROUTES
// ============================================
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const qrCodeRoutes = require('./routes/qrCodeRoutes');
const staffRoutes = require('./routes/staffRoutes');
const driverRoutes = require('./routes/driverRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const preOrderRoutes = require('./routes/preOrderRoutes');

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/qr-codes', qrCodeRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/preorders', preOrderRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: `Route not found: ${req.method} ${req.path}` 
  });
});

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🍽️  DineSmart API Server Started   ║
  ╠═══════════════════════════════════════╣
  ║   Port: ${PORT}                     
  ║   Environment: ${process.env.NODE_ENV || 'development'}
  ║   URL: http://localhost:${PORT}
  ╠═══════════════════════════════════════╣
  ║   📋 API ENDPOINTS:
  ║   • Menu: /api/menu
  ║   • Orders: /api/orders
  ║   • Receipts: /api/receipts
  ║   • QR Codes: /api/qr-codes
  ║   • Staff: /api/staff
  ║   • Drivers: /api/drivers
  ║   • Deliveries: /api/deliveries
  ║   • Reservations: /api/reservations
  ║   • Pre-Orders: /api/preorders
  ╠═══════════════════════════════════════╣
  ║   🔌 WebSockets: ENABLED
  ║   📄 PDF Receipts: ENABLED
  ║   📱 QR Ordering: ENABLED
  ║   👥 Staff Management: ENABLED
  ║   🍽️ Waiter Station: ENABLED
  ║   🚗 Delivery System: ENABLED
  ║   📅 Reservations: ENABLED
  ║   📅 Pre-Orders: ENABLED
  ║   📍 Live Tracking: ENABLED ← NEW!
  ║   🔔 Real-time Updates: ENABLED
  ╚═══════════════════════════════════════╝
  `);
});

module.exports = { app, server };