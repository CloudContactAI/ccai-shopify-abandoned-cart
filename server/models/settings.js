const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  shopDomain: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  shopName: {
    type: String,
    required: true
  },
  abandonedCartReminders: {
    enabled: {
      type: Boolean,
      default: false
    },
    hourThreshold: {
      type: Number,
      default: 24
    },
    messageTemplate: {
      type: String,
      default: 'Hi ${firstName}, you have items waiting in your cart at ${shopName}. Complete your purchase here: ${cartUrl}'
    }
  },
  ccai: {
    clientId: {
      type: String,
      default: ''
    },
    apiKey: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Settings', SettingsSchema);
