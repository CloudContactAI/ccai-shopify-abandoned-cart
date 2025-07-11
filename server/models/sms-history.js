const mongoose = require('mongoose');

const SMSHistorySchema = new mongoose.Schema({
  shopDomain: {
    type: String,
    required: true,
    index: true,
  },
  recipient: {
    firstName: String,
    lastName: String,
    phone: {
      type: String,
      required: true,
    },
  },
  message: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  messageId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'unknown'],
    default: 'unknown',
  },
  error: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  type: {
    type: String,
    enum: ['abandoned_cart', 'test', 'other'],
    default: 'other',
  },
  cartId: {
    type: String,
  },
});

// Create index for querying by shop and timestamp
SMSHistorySchema.index({ shopDomain: 1, timestamp: -1 });

module.exports = mongoose.model('SMSHistory', SMSHistorySchema);
