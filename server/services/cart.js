const { Shopify } = require('@shopify/shopify-api');
const Cart = require('../models/cart');
const settingsService = require('./settings');
const SMSService = require('./sms');

/**
 * Store a cart in the database for tracking
 */
const storeCart = async (shop, cartData) => {
  try {
    // Check if we already have this cart
    const cart = await Cart.findOne({
      shopDomain: shop,
      cartId: cartData.id,
    });

    if (cart) {
      // Update existing cart
      cart.updatedAt = new Date();
      cart.cartData = cartData;

      if (cartData.customer) {
        cart.customer = {
          id: cartData.customer.id,
          firstName: cartData.customer.first_name,
          lastName: cartData.customer.last_name,
          email: cartData.customer.email,
          phone: cartData.customer.phone,
        };
      }

      await cart.save();
      return cart;
    }
    // Create new cart
    const newCart = new Cart({
      shopDomain: shop,
      cartId: cartData.id,
      cartToken: cartData.token,
      createdAt: new Date(),
      updatedAt: new Date(),
      cartData: cartData,
      isAbandoned: false,
      reminderSent: false,
      converted: false,
    });

    if (cartData.customer) {
      newCart.customer = {
        id: cartData.customer.id,
        firstName: cartData.customer.first_name,
        lastName: cartData.customer.last_name,
        email: cartData.customer.email,
        phone: cartData.customer.phone,
      };
    }

    await newCart.save();
    return newCart;
  } catch (error) {
    console.error('Error storing cart:', error);
    throw error;
  }
};

/**
 * Update a cart in the database
 */
const updateCart = async (shop, cartData) => {
  try {
    const cart = await Cart.findOne({
      shopDomain: shop,
      cartId: cartData.id,
    });

    if (cart) {
      cart.updatedAt = new Date();
      cart.cartData = cartData;

      if (cartData.customer) {
        cart.customer = {
          id: cartData.customer.id,
          firstName: cartData.customer.first_name,
          lastName: cartData.customer.last_name,
          email: cartData.customer.email,
          phone: cartData.customer.phone,
        };
      }

      await cart.save();
      return cart;
    }
    // If cart doesn't exist, create it
    return storeCart(shop, cartData);
  } catch (error) {
    console.error('Error updating cart:', error);
    throw error;
  }
};

/**
 * Mark a cart as converted (checkout completed)
 */
const markCartAsConverted = async (shop, cartToken) => {
  try {
    const cart = await Cart.findOne({
      shopDomain: shop,
      cartToken: cartToken,
    });

    if (cart) {
      cart.converted = true;
      cart.convertedAt = new Date();
      await cart.save();
      return cart;
    }

    return null;
  } catch (error) {
    console.error('Error marking cart as converted:', error);
    throw error;
  }
};

/**
 * Get abandoned carts for a shop
 */
const getAbandonedCarts = async (shop, hoursThreshold = 24) => {
  try {
    // Calculate the timestamp for X hours ago
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - hoursThreshold);

    // Find carts that:
    // 1. Haven't been updated in X hours
    // 2. Haven't been converted
    // 3. Have customer information with a phone number
    // 4. Haven't had a reminder sent yet
    const abandonedCarts = await Cart.find({
      shopDomain: shop,
      updatedAt: { $lt: threshold },
      converted: false,
      reminderSent: false,
      'customer.phone': { $exists: true, $ne: null },
    });

    return abandonedCarts;
  } catch (error) {
    console.error('Error getting abandoned carts:', error);
    throw error;
  }
};

/**
 * Record that a reminder has been sent for a cart
 */
const recordReminderSent = async (cartId) => {
  try {
    const cart = await Cart.findOne({ cartId });

    if (cart) {
      cart.reminderSent = true;
      cart.reminderSentAt = new Date();
      await cart.save();
      return cart;
    }

    return null;
  } catch (error) {
    console.error('Error recording reminder sent:', error);
    throw error;
  }
};

/**
 * Process abandoned carts for a specific shop
 */
const processShopAbandonedCarts = async (shop) => {
  try {
    // Get shop settings
    const settings = await settingsService.getShopSettings(shop);

    // Skip if feature is disabled
    if (!settings.abandonedCartReminders || !settings.abandonedCartReminders.enabled) {
      return {
        success: true,
        message: 'Abandoned cart reminders are disabled for this shop',
        processed: 0,
      };
    }

    // Skip if CCAI credentials are not configured
    if (!settings.ccai || !settings.ccai.clientId || !settings.ccai.apiKey) {
      return {
        success: false,
        error: 'CloudContactAI credentials not configured',
        processed: 0,
      };
    }

    // Initialize SMS service with shop's CCAI credentials
    const sms = new SMSService(settings.ccai.clientId, settings.ccai.apiKey);

    // Get abandoned carts
    const hourThreshold = settings.abandonedCartReminders.hourThreshold || 24;
    const abandonedCarts = await getAbandonedCarts(shop, hourThreshold);

    // Process each abandoned cart
    const results = [];
    for (const cart of abandonedCarts) {
      try {
        // Skip if no customer or phone
        if (!cart.customer || !cart.customer.phone) {
          continue;
        }

        // Generate cart recovery URL
        const cartUrl = `https://${shop}/cart/${cart.cartToken}`;

        // Get message template or use default
        const messageTemplate =
          settings.abandonedCartReminders.messageTemplate ||
          'Hi ${firstName}, you have items waiting in your cart at ${shopName}. Complete your purchase here: ${cartUrl}';

        // Replace variables in template
        const message = messageTemplate
          .replace('${firstName}', cart.customer.firstName || 'there')
          .replace('${lastName}', cart.customer.lastName || '')
          .replace('${shopName}', settings.shopName || shop.split('.')[0])
          .replace('${cartUrl}', cartUrl);

        // Send SMS
        const result = await sms.sendSingle(
          cart.customer.firstName || '',
          cart.customer.lastName || '',
          cart.customer.phone,
          message,
          `${settings.shopName || shop} - Cart Reminder`
        );

        // Record that reminder was sent
        if (result.success) {
          await recordReminderSent(cart.cartId);
        }

        results.push({
          cartId: cart.cartId,
          customer: `${cart.customer.firstName} ${cart.customer.lastName}`,
          phone: cart.customer.phone,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        });
      } catch (error) {
        console.error(`Error processing cart ${cart.cartId}:`, error);
        results.push({
          cartId: cart.cartId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error) {
    console.error(`Error processing abandoned carts for ${shop}:`, error);
    throw error;
  }
};

module.exports = {
  storeCart,
  updateCart,
  markCartAsConverted,
  getAbandonedCarts,
  recordReminderSent,
  processShopAbandonedCarts,
};
