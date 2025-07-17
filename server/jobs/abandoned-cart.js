const dotenv = require('dotenv');
// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '../.env.production' });
} else {
  dotenv.config({ path: '../.env' });
}

const Shop = require('../models/shop');
const Cart = require('../models/cart');
const cartService = require('../services/cart');
const SMSServiceClass = require('../services/sms');
const loadSessionForShop = require('../services/sessionLoader');
const { shopify } = require('../shopify');

// ✅ Validate CloudContactAI credentials
const clientId = process.env.DEFAULT_CCAI_CLIENT_ID;
const apiKey = process.env.DEFAULT_CCAI_API_KEY;

console.log('🔐 CCAI_CLIENT_ID:', clientId);
console.log('🔐 CCAI_API_KEY:', apiKey);

if (!clientId || !apiKey) {
  throw new Error('Missing CloudContactAI credentials. Check your .env file!');
}

const SMSService = new SMSServiceClass(clientId, apiKey);

/**
 * Check if a checkout is truly abandoned
 */
const isAbandoned = (checkout, thresholdMinutes = 15) => {
  if (!checkout.created_at) return false;
  const createdAt = new Date(checkout.created_at);
  const now = new Date();
  const diffMinutes = (now - createdAt) / (1000 * 60);
  return diffMinutes >= thresholdMinutes;
};

/**
 * Process abandoned carts for all shops
 */
const processAbandonedCarts = async () => {
  try {
    // Check if MongoDB is connected
    if (!require('mongoose').connection.readyState) {
      console.log('⚠️ MongoDB not connected, skipping abandoned cart processing');
      return { totalShops: 0, results: [], error: 'MongoDB not connected' };
    }

    const shops = await Shop.find({ isActive: true });
    console.log(`⏱ Processing abandoned carts for ${shops.length} shops`);

    const results = [];

    for (const shop of shops) {
      try {
        console.log(`📦 Checking abandoned carts for ${shop.shopDomain}...`);
        const session = await loadSessionForShop(shop.shopDomain);
        const client = new shopify.api.clients.Rest({ session });
        
        let checkouts = [];
        try {
          const checkoutsRes = await client.get({ path: 'checkouts' });
          checkouts = checkoutsRes?.body?.checkouts || [];
        } catch (apiError) {
          // Handle protected customer data error gracefully
          if (apiError.message && apiError.message.includes('protected customer data')) {
            console.log(`⚠️ App not yet approved for protected customer data in ${shop.shopDomain}`);
            console.log(`ℹ️ Using only locally stored carts until approval`);
          } else {
            throw apiError; // Re-throw other errors
          }
        }

        let processed = 0;

        // ✅ 1. Shopify-sourced abandoned checkouts
        for (const checkout of checkouts) {
          if (!checkout.phone || !isAbandoned(checkout)) continue;

          try {
            await cartService.updateCart(shop.shopDomain, checkout);
            console.log(`✅ Cart saved for ${checkout.email || checkout.phone}`);

            const smsResult = await SMSService.sendSingle(
              checkout.first_name || 'Shopper',
              checkout.last_name || '',
              checkout.phone,
              `👋 You left items in your cart at ${shop.shopDomain}. Complete your purchase here: ${checkout.abandoned_checkout_url}`,
              `${shop.shopDomain} Reminder`,
              shop.shopDomain
            );

            if (smsResult.success) {
              processed++;
              console.log(`📤 SMS sent to ${checkout.phone} (Shopify)`);
            } else {
              console.error(`❌ SMS failed for ${checkout.phone}:`, smsResult.error);
            }
          } catch (smsError) {
            console.error(`❌ SMS failed for ${checkout.phone}:`, smsError.message);
          }
        }

        // ✅ 2. Locally stored MongoDB carts
        console.log(`🔍 DEBUG: Looking for carts with shopDomain=${shop.shopDomain}, isAbandoned=true, reminderSent=false`);
        console.log(`🔍 DEBUG: Current time: ${new Date().toISOString()}, Threshold: ${new Date(Date.now() - 1 * 60 * 1000).toISOString()}`);
        
        // First check if any carts exist at all
        const allCarts = await Cart.find({});
        console.log(`🔍 DEBUG: Total carts in database: ${allCarts.length}`);
        if (allCarts.length > 0) {
          console.log(`🔍 DEBUG: First cart: ${JSON.stringify(allCarts[0])}`);
        }
        
        const abandonedCarts = await Cart.find({
          shopDomain: shop.shopDomain,
          isAbandoned: true,
          reminderSent: false,
          abandonedAt: { $lte: new Date(Date.now() - 1 * 60 * 1000) }, // 1 minute for testing
        });

        console.log(`🔍 Found ${abandonedCarts.length} local abandoned carts`);

        for (const cart of abandonedCarts) {
          try {
            const smsResult = await SMSService.sendSingle(
              cart.customer.firstName || 'Shopper',
              cart.customer.lastName || '',
              cart.customer.phone,
              `👋 You left items in your cart at ${shop.shopDomain}. Complete your purchase before it disappears!`,
              `${shop.shopDomain} Reminder`,
              shop.shopDomain
            );

            if (smsResult.success) {
              cart.reminderSent = true;
              cart.reminderSentAt = new Date();
              await cart.save();

              processed++;
              console.log(`📤 SMS sent to ${cart.customer.phone} (MongoDB)`);
            } else {
              console.error(`❌ SMS failed for ${cart.customer.phone}:`, smsResult.error);
            }
          } catch (err) {
            console.error(`❌ SMS failed for ${cart.customer.phone}:`, err.message);
          }
        }

        results.push({ shop: shop.shopDomain, success: true, processed });
        console.log(`✅ Processed ${processed} SMS reminders for ${shop.shopDomain}`);
      } catch (error) {
        console.error(`❌ Error with ${shop.shopDomain}:`, error);
        results.push({ shop: shop.shopDomain, success: false, processed: 0, error: error.message });
      }
    }

    return {
      totalShops: shops.length,
      results,
    };
  } catch (error) {
    console.error('❌ Failed to process abandoned carts:', error);
    throw error;
  }
};

module.exports = {
  processAbandonedCarts,
};
