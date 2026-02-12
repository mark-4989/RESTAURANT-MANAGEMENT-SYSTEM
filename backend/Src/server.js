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

// Allowed origins - dynamically set for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      // Production URLs from environment variables
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      process.env.KITCHEN_URL,
      process.env.WAITER_URL,
      process.env.DRIVER_URL,
      // Hardcoded production URLs (fallback)
      'https://restaurant-management-system-zeta-ivory.vercel.app', // Customer App
      'https://restaurant-management-system-xjmj.vercel.app',       // Admin Dashboard
      'https://restaurant-management-system-rmf1.vercel.app',       // Kitchen App
      'https://restaurant-management-system-9no5.vercel.app',       // Waiter Station
      'https://restaurant-management-system-bomb.vercel.app',       // Driver App
    ].filter(Boolean) // Remove undefined values
  : [
      'http://localhost:5173', // Kitchen Display
      'http://localhost:5174', // Customer App
      'http://localhost:5175', // Admin Dashboard
      'http://localhost:5176', // Waiter Station
      'http://localhost:5177', // Driver App
    ];

// Log allowed origins for debugging
console.log('🔐 CORS Configuration:');
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Allowed Origins:', allowedOrigins);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      // In production, check against allowed origins
      if (process.env.NODE_ENV === 'production') {
        // Check if origin is in allowed list
        const isAllowed = allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*');
        
        // Also allow any Vercel preview deployments (*.vercel.app)
        const isVercelPreview = origin.includes('vercel.app');
        
        if (isAllowed || isVercelPreview) {
          callback(null, true);
        } else {
          console.log('❌ Blocked origin:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        // In development, allow all
        callback(null, true);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
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
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // In production, check against allowed origins
    if (process.env.NODE_ENV === 'production') {
      // Check if origin is in allowed list
      const isAllowed = allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*');
      
      // Also allow any Vercel preview deployments (*.vercel.app)
      const isVercelPreview = origin.includes('vercel.app');
      
      if (isAllowed || isVercelPreview) {
        callback(null, true);
      } else {
        console.log('❌ CORS blocked origin:', origin);
        callback(null, false);
      }
    } else {
      // In development, allow all
      callback(null, true);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    environment: process.env.NODE_ENV || 'development',
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
    cors: {
      environment: process.env.NODE_ENV || 'development',
      allowedOrigins: allowedOrigins,
      totalOrigins: allowedOrigins.length
    },
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
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {});
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📍 Database:', mongoose.connection.name);
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🍽️  DineSmart API Server Started   ║
  ╠═══════════════════════════════════════╣
  ║   Port: ${PORT}                     
  ║   Environment: ${process.env.NODE_ENV || 'development'}
  ║   Host: 0.0.0.0
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
  ║   📍 Live Tracking: ENABLED
  ║   🔔 Real-time Updates: ENABLED
  ╚═══════════════════════════════════════╝
  `);
});

module.exports = { app, server };