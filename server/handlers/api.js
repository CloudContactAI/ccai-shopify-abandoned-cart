const express = require('express');
const router = express.Router();

const settingsService = require('../services/settings');
const cartService = require('../services/cart');
const SMSService = require('../services/sms');
const Shop = require('../models/shop');
const Cart = require('../models/cart');

function getShopFromSession(req, res) {
  const sessionShop = res.locals?.shopify?.session?.shop;
  const fallbackShop = req.session?.shop;
  const shop = sessionShop || fallbackShop;

  if (!shop || typeof shop !== 'string') {
    console.warn('⚠️ getShopFromSession: Missing or invalid shop.', { sessionShop, fallbackShop });
    return null;
  }

  return shop;
}

// 📦 Get current shop domain
router.get('/shop', (req, res) => {
  const shop = getShopFromSession(req, res);
  if (!shop) return res.status(401).json({ error: 'Shop not found in session' });
  res.json({ shop });
});

// ⚙️ App settings
router.get('/settings', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const settings = await settingsService.getShopSettings(shop);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const updatedSettings = await settingsService.updateShopSettings(shop, req.body);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
  }
});

// 🛒 Abandoned carts
router.get('/abandoned-carts', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const hours = Number.parseInt(req.query.hours || '24', 10);
    const carts = await cartService.getAbandonedCarts(shop, hours);
    res.json(carts);
  } catch (error) {
    console.error('Error fetching abandoned carts:', error);
    res.status(500).json({ error: 'Failed to fetch abandoned carts', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
  }
});

// 🧪 Test SMS
router.post('/test-sms', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const { firstName, lastName, phone, message } = req.body;
    const settings = await settingsService.getShopSettings(shop);

    if (!settings.ccai?.clientId || !settings.ccai?.apiKey) {
      return res.status(400).json({ error: 'CloudContactAI credentials not configured' });
    }

    const sms = new SMSService(settings.ccai.clientId, settings.ccai.apiKey);
    const result = await sms.sendSingle(
      firstName,
      lastName,
      phone,
      message || `Hi ${firstName}, this is a test message from ${shop}`,
      `Test Message - ${shop}`
    );

    res.json(result);
  } catch (error) {
    console.error('Error sending test SMS:', error);
    res.status(500).json({ error: 'Failed to send test SMS', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
  }
});

// 📜 SMS history
router.get('/sms-history', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const { page = 1, limit = 20, type } = req.query;

    // 🛠️ Debug log added here
    console.log('📨 Incoming SMS history request:', {
      shop,
      page,
      limit,
      type
    });

    const history = await SMSService.getSMSHistory(shop, Number(page), Number(limit), type);

    res.json(history);
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    res.status(500).json({ error: 'Failed to fetch SMS history', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
  }
});

// 🔔 Trigger SMS reminders
router.post('/trigger-reminders', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const { cartIds } = req.body;
    if (!Array.isArray(cartIds) || cartIds.length === 0) {
      return res.status(400).json({ error: 'cartIds must be a non-empty array' });
    }

    const result = await cartService.processShopAbandonedCarts(shop, cartIds);
    res.json(result);
  } catch (error) {
    console.error('Error triggering reminders:', error);
    res.status(500).json({ error: 'Failed to trigger reminders', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
  }
});

// 🧪 Test abandoned checkout recovery
router.get('/test-checkouts', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const loadSessionForShop = require('../services/sessionLoader');
    const { shopifyApi } = require('@shopify/shopify-api');

    const session = await loadSessionForShop(shop);
    const checkoutsRes = await shopifyApi.rest.Checkout.all({ session });

    const checkoutsWithPhone = checkoutsRes.data?.checkouts
      ?.filter((co) => co.phone)
      ?.map((co) => ({
        id: co.id,
        phone: co.phone,
        email: co.email,
        url: co.abandoned_checkout_url,
        createdAt: co.created_at,
      }));

    res.status(200).json({ checkouts: checkoutsWithPhone });
  } catch (error) {
    console.error('Error fetching test checkouts:', error);
    res.status(500).json({ error: 'Failed to fetch abandoned checkouts', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
  }
});

// 🔎 Debug: Shops in MongoDB
router.get('/debug-shops', async (_req, res) => {
  try {
    const shops = await Shop.find({}, 'shopDomain isActive accessToken installedAt');
    res.json({ success: true, shops });
  } catch (error) {
    console.error('❌ Error fetching debug shops:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🧪 Debug: Abandoned carts
router.get('/debug-carts', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(401).json({ error: 'Shop not found in session' });

    const carts = await Cart.find({ shopDomain: shop })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ success: true, count: carts.length, carts });
  } catch (error) {
    console.error('❌ Error fetching debug carts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
