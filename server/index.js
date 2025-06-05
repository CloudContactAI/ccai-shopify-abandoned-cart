/**
 * CloudContactAI Abandoned Cart Recovery for Shopify
 * 
 * Main server file
 * 
 * @license MIT
 * @copyright 2025 CloudContactAI LLC
 */

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { resolve } = require('path');
const compression = require('compression');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
const { shopifyApp } = require('@shopify/shopify-app-express');
const serveStatic = require('serve-static');

// Import routes and handlers
const apiRoutes = require('./handlers/api');
const webhookHandlers = require('./handlers/webhooks');

// Import jobs
const { processAbandonedCarts } = require('./jobs/abandoned-cart');

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT || "8081", 10);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ccai-shopify-abandoned-cart')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Set up Shopify authentication
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_API_SCOPES.split(','),
    hostName: process.env.SHOPIFY_APP_URL.replace(/https:\/\//, ''),
    apiVersion: ApiVersion.July23,
    isEmbeddedApp: true,
  },
  auth: {
    path: '/auth',
    callbackPath: '/auth/callback',
  },
  webhooks: {
    path: '/webhooks',
  },
});

// Register webhooks
shopify.webhooks.addHandlers({
  'carts/create': {
    deliveryMethod: shopify.webhooks.DeliveryMethod.Http,
    callbackUrl: '/webhooks/cart/create',
    callback: webhookHandlers.handleCartCreate,
  },
  'carts/update': {
    deliveryMethod: shopify.webhooks.DeliveryMethod.Http,
    callbackUrl: '/webhooks/cart/update',
    callback: webhookHandlers.handleCartUpdate,
  },
  'checkouts/create': {
    deliveryMethod: shopify.webhooks.DeliveryMethod.Http,
    callbackUrl: '/webhooks/checkout/create',
    callback: webhookHandlers.handleCheckoutCreate,
  },
});

// Set up middleware
app.use(compression());
app.use(cookieParser(process.env.SESSION_SECRET));

// Set up Shopify auth middleware
app.use('/auth', shopify.auth.begin());
app.use('/auth/callback', shopify.auth.callback());
app.use('/webhooks', shopify.webhooks.process());
app.use('/api', shopify.validateAuthenticatedSession(), apiRoutes);

// Serve static frontend assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(serveStatic(resolve(__dirname, '../frontend/dist')));
  app.use('/*', (req, res) => {
    res.sendFile(resolve(__dirname, '../frontend/dist/index.html'));
  });
}

// Schedule abandoned cart check job
if (process.env.ABANDONED_CART_CHECK_SCHEDULE) {
  cron.schedule(process.env.ABANDONED_CART_CHECK_SCHEDULE, async () => {
    console.log('Running abandoned cart check job...');
    try {
      await processAbandonedCarts();
      console.log('Abandoned cart check job completed successfully');
    } catch (error) {
      console.error('Error running abandoned cart check job:', error);
    }
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
