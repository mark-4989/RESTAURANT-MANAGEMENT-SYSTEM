// backend/src/models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  customerEmail: String,
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  partySize: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  tablePreference: {
    type: String,
    enum: ['any', 'window', 'outdoor', 'quiet', 'center'],
    default: 'any'
  },
  occasionType: {
    type: String,
    enum: ['', 'birthday', 'anniversary', 'business', 'date', 'celebration', 'other']
  },
  specialRequests: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  assignedTable: String,
  confirmationCode: String,
  phoneNumber: String
}, {
  timestamps: true
});

// Generate confirmation code before saving
reservationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.confirmationCode = 'RES-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);