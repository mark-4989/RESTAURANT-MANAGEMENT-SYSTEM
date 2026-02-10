const mongoose = require('mongoose');

const preOrderSchema = new mongoose.Schema({
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
  tableNumber: String,
  specialInstructions: String,
  type: {
    type: String,
    enum: ['pre-order', 'pickup'],
    default: 'pre-order'
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  phoneNumber: String,
  orderItems: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PreOrder', preOrderSchema);
