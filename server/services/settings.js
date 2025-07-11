const Settings = require('../models/settings');

/**
 * Get settings for a shop
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} - Shop settings
 */
const getShopSettings = async (shop) => {
  try {
    let settings = await Settings.findOne({ shopDomain: shop });

    if (!settings) {
      // Create default settings if none exist
      settings = await createDefaultSettings(shop);
    }

    return settings;
  } catch (error) {
    console.error('Error getting shop settings:', error);
    throw error;
  }
};

/**
 * Create default settings for a shop
 * @param {string} shop - Shop domain
 * @returns {Promise<Object>} - Default shop settings
 */
const createDefaultSettings = async (shop) => {
  try {
    const shopName = shop.split('.')[0]; // Extract shop name from domain

    const settings = new Settings({
      shopDomain: shop,
      shopName: shopName,
      abandonedCartReminders: {
        enabled: false,
        hourThreshold: 24,
        messageTemplate:
          'Hi ${firstName}, you have items waiting in your cart at ${shopName}. Complete your purchase here: ${cartUrl}',
      },
      ccai: {
        clientId: process.env.DEFAULT_CCAI_CLIENT_ID || '',
        apiKey: process.env.DEFAULT_CCAI_API_KEY || '',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await settings.save();
    return settings;
  } catch (error) {
    console.error('Error creating default settings:', error);
    throw error;
  }
};

/**
 * Update settings for a shop
 * @param {string} shop - Shop domain
 * @param {Object} updatedSettings - Updated settings
 * @returns {Promise<Object>} - Updated shop settings
 */
const updateShopSettings = async (shop, updatedSettings) => {
  try {
    let settings = await Settings.findOne({ shopDomain: shop });

    if (!settings) {
      settings = await createDefaultSettings(shop);
    }

    // Update only the fields that are provided
    if (updatedSettings.shopName) {
      settings.shopName = updatedSettings.shopName;
    }

    if (updatedSettings.abandonedCartReminders) {
      settings.abandonedCartReminders = {
        ...settings.abandonedCartReminders,
        ...updatedSettings.abandonedCartReminders,
      };
    }

    if (updatedSettings.ccai) {
      settings.ccai = {
        ...settings.ccai,
        ...updatedSettings.ccai,
      };
    }

    settings.updatedAt = new Date();

    await settings.save();
    return settings;
  } catch (error) {
    console.error('Error updating shop settings:', error);
    throw error;
  }
};

module.exports = {
  getShopSettings,
  updateShopSettings,
};
