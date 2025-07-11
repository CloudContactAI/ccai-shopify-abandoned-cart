require('dotenv').config({ path: __dirname + '/../.env' });
console.log('🔍 Loaded SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY);

require('@shopify/shopify-api/adapters/node'); // ✅ Node adapter

const { shopifyApp } = require('@shopify/shopify-app-express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { MongoDBSessionStorage } = require('@shopify/shopify-app-session-storage-mongodb');


// 🛡️ Validate required Shopify env vars
const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SHOPIFY_API_SCOPES,
  SHOPIFY_APP_URL,
} = process.env;

if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !SHOPIFY_API_SCOPES || !SHOPIFY_APP_URL) {
  throw new Error('Missing required Shopify environment variables. Please check your .env file.');
}

// 💾 Initialize session storage
const sessionStorage = new MongoDBSessionStorage(process.env.MONGODB_URI);

// 🔧 Create raw API instance with access to sessionStorage methods
const api = shopifyApi({
  apiKey: SHOPIFY_API_KEY,
  apiSecretKey: SHOPIFY_API_SECRET,
  scopes: SHOPIFY_API_SCOPES.split(','),
  hostName: SHOPIFY_APP_URL.replace(/^https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage,
});

// 🚀 Create Express-compatible app instance for embedded flow
const shopify = shopifyApp({
  api: {
    apiKey: SHOPIFY_API_KEY,
    apiSecretKey: SHOPIFY_API_SECRET,
    scopes: SHOPIFY_API_SCOPES.split(','),
    hostName: SHOPIFY_APP_URL.replace(/^https?:\/\//, ''),
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
  },
  auth: {
    path: '/auth',
    callbackPath: '/auth/callback',
    cookieOptions: {
      sameSite: 'none',
      secure: true,
    },
  },
  sessionStorage,
  webhooks: {
    path: '/webhooks',
  },
});

module.exports = {
  shopify,
  api,
  sessionStorage,
};
