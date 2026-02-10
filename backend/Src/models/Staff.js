// backend/src/models/Staff.js
const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  clockIn: {
    type: Date
  },
  clockOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'missed'],
    default: 'scheduled'
  },
  notes: String
});

const staffSchema = new mongoose.Schema({
  // Basic Info
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  
  // Employment Details
  role: {
    type: String,
    required: true,
    enum: ['admin', 'manager', 'chef', 'waiter', 'cashier'],
    default: 'waiter'
  },
  department: {
    type: String,
    enum: ['kitchen', 'service', 'management', 'cashier'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave', 'terminated'],
    default: 'active'
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  
  // Authentication
  password: {
    type: String,
    required: true,
    select: false // Don't return password by default
  },
  
  // Permissions
  permissions: {
    canViewOrders: { type: Boolean, default: true },
    canManageOrders: { type: Boolean, default: false },
    canViewMenu: { type: Boolean, default: true },
    canManageMenu: { type: Boolean, default: false },
    canViewStaff: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false }
  },
  
  // Shifts & Schedule
  shifts: [shiftSchema],
  
  // Performance Metrics
  performance: {
    ordersServed: { type: Number, default: 0 },
    averageOrderTime: { type: Number, default: 0 }, // in minutes
    customerRating: { type: Number, default: 0 }, // 0-5
    totalShiftsWorked: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    lateArrivals: { type: Number, default: 0 },
    earlyDepartures: { type: Number, default: 0 }
  },
  
  // Compensation
  hourlyRate: {
    type: Number,
    default: 0
  },
  
  // Additional Info
  address: String,
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  profileImage: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  
  // Activity Tracking
  lastLogin: Date,
  lastActive: Date,
  
  // Notes
  notes: String

}, {
  timestamps: true
});

// Virtual for full name
staffSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Set default permissions based on role
staffSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch(this.role) {
      case 'admin':
        this.permissions = {
          canViewOrders: true,
          canManageOrders: true,
          canViewMenu: true,
          canManageMenu: true,
          canViewStaff: true,
          canManageStaff: true,
          canViewReports: true,
          canManageSettings: true
        };
        break;
      case 'manager':
        this.permissions = {
          canViewOrders: true,
          canManageOrders: true,
          canViewMenu: true,
          canManageMenu: true,
          canViewStaff: true,
          canManageStaff: false,
          canViewReports: true,
          canManageSettings: false
        };
        break;
      case 'chef':
        this.permissions = {
          canViewOrders: true,
          canManageOrders: true,
          canViewMenu: true,
          canManageMenu: false,
          canViewStaff: false,
          canManageStaff: false,
          canViewReports: false,
          canManageSettings: false
        };
        break;
      case 'waiter':
        this.permissions = {
          canViewOrders: true,
          canManageOrders: false,
          canViewMenu: true,
          canManageMenu: false,
          canViewStaff: false,
          canManageStaff: false,
          canViewReports: false,
          canManageSettings: false
        };
        break;
      case 'cashier':
        this.permissions = {
          canViewOrders: true,
          canManageOrders: true,
          canViewMenu: true,
          canManageMenu: false,
          canViewStaff: false,
          canManageStaff: false,
          canViewReports: true,
          canManageSettings: false
        };
        break;
    }
  }
  next();
});

// Generate employee ID
staffSchema.pre('save', async function(next) {
  if (this.isNew && !this.employeeId) {
    const count = await this.constructor.countDocuments();
    this.employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff;
