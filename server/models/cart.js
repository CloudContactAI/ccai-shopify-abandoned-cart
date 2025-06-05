const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  shopDomain: {
    type: String,
    required: true,
    index: true
  },
  cartId: {
    type: String,
    required: true,
    index: true
  },
  cartToken: {
    type: String,
    required: true
  },
  customer: {
    id: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  cartData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isAbandoned: {
    type: Boolean,
    default: false
  },
  abandonedAt: {
    type: Date
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  },
  converted: {
    type: Boolean,
    default: false
  },
  convertedAt: {
    type: Date
  }
});

// Create a compound index for shop and cart ID
CartSchema.index({ shopDomain: 1, cartId: 1 }, { unique: true });

// Create an index for finding abandoned carts
CartSchema.index({ 
  shopDomain: 1, 
  updatedAt: 1, 
  converted: 1, 
  reminderSent: 1 
});

module.exports = mongoose.model('Cart', CartSchema);
