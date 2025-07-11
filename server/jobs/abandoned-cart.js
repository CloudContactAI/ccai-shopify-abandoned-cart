const dotenv = require('dotenv');
dotenv.config({ path: '../.env' }); // ✅ Load env from parent directory

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
    const shops = await Shop.find({ isActive: true });
    console.log(`⏱ Processing abandoned carts for ${shops.length} shops`);

    const results = [];

    for (const shop of shops) {
      try {
        console.log(`📦 Checking abandoned carts for ${shop.shopDomain}...`);
        const session = await loadSessionForShop(shop.shopDomain);
        const client = new shopify.api.clients.Rest({ session });
        const checkoutsRes = await client.get({ path: 'checkouts' });
        const checkouts = checkoutsRes?.body?.checkouts || [];

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
        const abandonedCarts = await Cart.find({
          shopDomain: shop.shopDomain,
          isAbandoned: true,
          reminderSent: false,
          abandonedAt: { $lte: new Date(Date.now() - 15 * 60 * 1000) },
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
