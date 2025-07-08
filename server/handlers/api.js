const express = require('express');
const router = express.Router();

const settingsService = require('../services/settings');
const cartService = require('../services/cart');
const SMSService = require('../services/sms');

// Helper to get shop domain from Shopify session or fallback to req.session
function getShopFromSession(req, res) {
  if (res.locals?.shopify?.session?.shop) {
    return res.locals.shopify.session.shop;
  }
  if (req.session && req.session.shop) {
    return req.session.shop;
  }
  return null;
}

// Get current shop domain for frontend usage
router.get('/shop', (req, res) => {
  const shop = getShopFromSession(req, res);
  if (!shop) return res.status(401).json({ error: 'Shop not found in session' });
  res.json({ shop });
});

// Get app settings for the current shop
router.get('/settings', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const settings = await settingsService.getShopSettings(shop);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

// Update app settings for the current shop
router.post('/settings', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const settings = req.body;
    const updatedSettings = await settingsService.updateShopSettings(shop, settings);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

// Get abandoned carts for the current shop
router.get('/abandoned-carts', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const { hours = 24 } = req.query;
    const carts = await cartService.getAbandonedCarts(shop, parseInt(hours, 10));
    res.json(carts);
  } catch (error) {
    console.error('Error fetching abandoned carts:', error);
    res.status(500).json({
      error: 'Failed to fetch abandoned carts',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

// Send test SMS
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
    res.status(500).json({
      error: 'Failed to send test SMS',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

// Get SMS history for the current shop
router.get('/sms-history', async (req, res) => {
  try {
    const shop = getShopFromSession(req, res);
    if (!shop) return res.status(400).json({ error: 'Shop not found in session' });

    const { page = 1, limit = 20, type } = req.query;

    const history = await SMSService.getSMSHistory(
      shop,
      parseInt(page, 10),
      parseInt(limit, 10),
      type
    );

    res.json(history);
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    res.status(500).json({
      error: 'Failed to fetch SMS history',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

// Manually trigger abandoned cart reminders
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
    res.status(500).json({
      error: 'Failed to trigger reminders',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

module.exports = router;
