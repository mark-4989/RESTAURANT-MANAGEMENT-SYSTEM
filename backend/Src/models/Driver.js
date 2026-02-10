// backend/src/models/Driver.js
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  // Basic Info
  driverId: {
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
  password: {
    type: String,
    required: true,
    select: false
  },

  // Driver Details
  licenseNumber: {
    type: String,
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['motorcycle', 'bicycle', 'car', 'scooter'],
    required: true
  },
  vehicleRegistration: {
    type: String,
    required: true
  },
  vehicleModel: String,
  vehicleColor: String,

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-delivery', 'offline'],
    default: 'offline'
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  // Location Tracking
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  lastLocationUpdate: Date,

  // Performance Metrics
  performance: {
    totalDeliveries: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    cancelledDeliveries: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    onTimeDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
  },

  // Current Delivery
  currentDelivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },

  // Documents
  documents: {
    license: String,
    idCard: String,
    vehicleInsurance: String
  },

  // Profile
  profileImage: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=Driver&background=10b981&color=fff&size=150'
  },

  // Banking (for payments)
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },

  // Activity
  lastLogin: Date,
  lastActive: Date,
  onlineHours: { type: Number, default: 0 },

  // Notes
  notes: String

}, {
  timestamps: true
});

// Geospatial index for location queries
driverSchema.index({ currentLocation: '2dsphere' });

// Generate driver ID before saving
driverSchema.pre('save', async function(next) {
  if (this.isNew && !this.driverId) {
    const count = await mongoose.model('Driver').countDocuments();
    this.driverId = `DRV-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual for full name
driverSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Calculate average rating
driverSchema.methods.updateRating = function(newRating) {
  const totalRatings = this.performance.totalRatings + 1;
  const currentTotal = this.performance.averageRating * this.performance.totalRatings;
  this.performance.averageRating = (currentTotal + newRating) / totalRatings;
  this.performance.totalRatings = totalRatings;
};

// Update location
driverSchema.methods.updateLocation = function(longitude, latitude) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  this.lastLocationUpdate = new Date();
};

// Find nearby drivers
driverSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // meters
      }
    },
    isAvailable: true,
    status: 'active'
  });
};

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;