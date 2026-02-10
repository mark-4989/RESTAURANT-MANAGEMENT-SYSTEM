// backend/src/models/Order.js (UPDATED TO SUPPORT ALL ORDER TYPES + DRIVER)
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  specialInstructions: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Customer Information
  customerName: {
    type: String,
    required: true
  },
  customerEmail: String,
  
  // Order Type (dine-in, pickup, delivery, preorder)
  orderType: {
    type: String,
    enum: ['dine-in', 'pickup', 'delivery', 'preorder'],
    default: 'dine-in'
  },
  
  // Dine-In Specific
  tableNumber: String,
  
  // Pickup Specific
  pickupDate: Date,
  pickupTime: String,
  pickupPhone: String,
  
  // Delivery Specific
  deliveryAddress: String,
  deliveryPhone: String,
  deliveryDate: Date,
  deliveryTime: String,
  deliveryInstructions: String,
  deliveryLat: Number,
  deliveryLng: Number,
  deliveryFee: {
    type: Number,
    default: 0
  },
  
  // ✅ DRIVER ASSIGNMENT (NEW!)
  driver: {
    type: String, // Changed to String to support both mock IDs and real ObjectIds
  },
  driverName: String, // Store driver name for quick access
  driverPhone: String, // Store driver phone
  deliveryStatus: {
    type: String,
    enum: ['pending', 'assigned', 'picked-up', 'on-the-way', 'delivered', 'cancelled'],
    default: 'pending'
  },
  broadcast: {
    type: Boolean,
    default: false
  },
  
  // Pre-Order Specific
  preorderDate: Date,
  preorderTime: String,
  preorderType: {
    type: String,
    enum: ['dine-in', 'pickup']
  },
  
  // Order Items
  items: [orderItemSchema],
  
  // Pricing
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: String,
  
  // Staff Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  servedBy: String,
  
  // Notes
  specialInstructions: String,
  internalNotes: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  preparingAt: Date,
  readyAt: Date,
  completedAt: Date,
  deliveredAt: Date // ✅ NEW - Track when delivered
}, {
  timestamps: true
});

// Index for faster queries
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerName: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderType: 1 });
orderSchema.index({ deliveryStatus: 1 }); // ✅ NEW
orderSchema.index({ driver: 1 }); // ✅ NEW
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);