const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide item name'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide item description'],
  },
  price: {
    type: Number,
    required: [true, 'Please provide item price'],
    min: 0,
  },
  category: {
    type: String,
    required: [true, 'Please provide category'],
    enum: ['appetizers', 'mains', 'desserts', 'drinks'],
  },
  image: {
    type: String,
    required: [true, 'Please provide image URL'],
  },
  available: {
    type: Boolean,
    default: true,
  },
  popular: {
    type: Boolean,
    default: false,
  },
  spicy: {
    type: Boolean,
    default: false,
  },
  dietary: {
    type: [String],
    enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
    default: [],
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15,
  },
}, {
  timestamps: true,
});

// Index for faster queries
menuItemSchema.index({ category: 1, available: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);