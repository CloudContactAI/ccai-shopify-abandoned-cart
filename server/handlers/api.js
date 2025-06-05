const express = require('express');
const router = express.Router();
const settingsService = require('../services/settings');
const cartService = require('../services/cart');
const smsService = require('../services/sms');

// Get app settings for the current shop
router.get('/settings', async (req, res) => {
  try {
    const { shop } = req.query;
    const settings = await settingsService.getShopSettings(shop);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update app settings for the current shop
router.post('/settings', express.json(), async (req, res) => {
  try {
    const { shop } = req.query;
    const settings = req.body;
    const updatedSettings = await settingsService.updateShopSettings(shop, settings);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get abandoned carts for the current shop
router.get('/abandoned-carts', async (req, res) => {
  try {
    const { shop } = req.query;
    const { hours = 24 } = req.query;
    const carts = await cartService.getAbandonedCarts(shop, parseInt(hours, 10));
    res.json(carts);
  } catch (error) {
    console.error('Error fetching abandoned carts:', error);
    res.status(500).json({ error: 'Failed to fetch abandoned carts' });
  }
});

// Send test SMS
router.post('/test-sms', express.json(), async (req, res) => {
  try {
    const { shop } = req.query;
    const { firstName, lastName, phone, message } = req.body;
    
    // Get shop settings to retrieve CCAI credentials
    const settings = await settingsService.getShopSettings(shop);
    
    if (!settings.ccai || !settings.ccai.clientId || !settings.ccai.apiKey) {
      return res.status(400).json({ error: 'CloudContactAI credentials not configured' });
    }
    
    // Initialize SMS service with shop's CCAI credentials
    const sms = new smsService(settings.ccai.clientId, settings.ccai.apiKey);
    
    // Send test message
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
    res.status(500).json({ error: 'Failed to send test SMS' });
  }
});

// Get SMS history for the current shop
router.get('/sms-history', async (req, res) => {
  try {
    const { shop } = req.query;
    const { page = 1, limit = 20 } = req.query;
    
    const history = await smsService.getSMSHistory(
      shop, 
      parseInt(page, 10), 
      parseInt(limit, 10)
    );
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    res.status(500).json({ error: 'Failed to fetch SMS history' });
  }
});

// Manually trigger abandoned cart reminders
router.post('/trigger-reminders', async (req, res) => {
  try {
    const { shop } = req.query;
    const result = await cartService.processShopAbandonedCarts(shop);
    res.json(result);
  } catch (error) {
    console.error('Error triggering reminders:', error);
    res.status(500).json({ error: 'Failed to trigger reminders' });
  }
});

module.exports = router;
