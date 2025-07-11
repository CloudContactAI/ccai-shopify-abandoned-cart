const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  shopDomain: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  installedAt: {
    type: Date,
    default: Date.now,
  },
  uninstalledAt: {
    type: Date,
  },
  shopifyPlan: {
    type: String,
  },
  shopifyId: {
    type: String,
  },
});

module.exports = mongoose.model('Shop', ShopSchema);
