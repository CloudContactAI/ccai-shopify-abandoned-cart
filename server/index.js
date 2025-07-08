require('dotenv').config();
console.log("📦 Environment variables loaded from .env file");
console.log("Shopify API Key:", process.env.SHOPIFY_API_KEY);

const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { resolve } = require('path');
const compression = require('compression');
const cron = require('node-cron');
const serveStatic = require('serve-static');

const { shopifyApp } = require('@shopify/shopify-app-express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { SQLiteSessionStorage } = require('@shopify/shopify-app-session-storage-sqlite');

const apiRoutes = require('./handlers/api');
const webhookHandlers = require('./handlers/webhooks');
const { processAbandonedCarts } = require('./jobs/abandoned-cart');

const app = express();
const PORT = parseInt(process.env.PORT || "8081", 10);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Middleware: Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com"
  );
  next();
});

app.use(cookieParser());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf; // for webhook verification
  }
}));
app.use(compression());
app.set('trust proxy', 1);

// EXPRESS-SESSION setup - must come BEFORE any routes using req.session
app.use(session({
  secret: process.env.SESSION_SECRET || 'some-very-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // false on localhost, true on HTTPS/ngrok
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

// SQLite session storage for Shopify session
const sessionStorage = new SQLiteSessionStorage(
  resolve(__dirname, '../database.sqlite')
);

console.log('📦 SCOPES from .env:', process.env.SHOPIFY_API_SCOPES);

const shopifyApiInstance = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_API_SCOPES.split(','),
  hostName: process.env.SHOPIFY_APP_URL.replace(/^https:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_API_SCOPES.split(','),
    hostName: process.env.SHOPIFY_APP_URL.replace(/^https:\/\//, ''),
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

// OAuth callback - save shop domain into express-session before redirect
app.use('/auth/callback', shopify.auth.callback(), async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    req.session.shop = session.shop;
    await new Promise((resolve, reject) => {
      req.session.save(err => (err ? reject(err) : resolve()));
    });
    const host = req.query.host;
    res.redirect(`/?shop=${session.shop}&host=${host}`);
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).send('Authentication error');
  }
});

// Debug logging on /auth route
app.use('/auth', (req, res, next) => {
  console.log('[DEBUG /auth] Incoming request:', req.query);
  next();
}, shopify.auth.begin());

// Webhook handling
app.post('/webhooks/:topic', async (req, res) => {
  try {
    const topic = req.params.topic.replace(/-/g, '/');
    const response = await shopifyApiInstance.webhooks.process({
      rawBody: req.rawBody,
      rawRequest: req,
      rawResponse: res,
    });
    if (!response.success) throw new Error('Webhook not processed: ' + topic);
    res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook Error');
  }
});

// API routes with authenticated Shopify session
app.use('/api', shopify.validateAuthenticatedSession(), apiRoutes);

// Serve React frontend static files
app.use(serveStatic(resolve(__dirname, '../frontend/dist')));

// Loader route for SPA direct navigation
app.get('/loader', (req, res) => {
  res.sendFile(resolve(__dirname, '../frontend/dist/index.html'));
});

// Local dev landing page
app.get("/", (req, res) => {
  const shop = 'ccai-andreas-test.myshopify.com';
  res.send(`
    <h2>👋 Welcome to Test1Andreas</h2>
    <p>Your Shopify app backend is running.</p>
    <a href="/auth?shop=${shop}">→ Click here to install the app</a>
  `);
});

// Middleware to ensure 'shop' query param is always present
app.use((req, res, next) => {
  const whitelist = [
    '/auth',
    '/auth/callback',
    '/webhooks',
    '/api',
    '/favicon.ico',
    '/loader',
  ];

  if (whitelist.some(path => req.path.startsWith(path))) {
    return next();
  }

  if (!req.query.shop) {
    const shopFromSession = req.session?.shop;
    if (shopFromSession) {
      const url = new URL(req.originalUrl, `https://${req.headers.host}`);
      url.searchParams.set('shop', shopFromSession);
      console.log(`[Middleware] Redirecting to URL with shop query param: ${url.toString()}`);
      return res.redirect(url.toString());
    }

    const fallbackShop = 'ccai-andreas-test.myshopify.com';
    console.log(`[Middleware] No shop param found - redirecting to /auth?shop=${fallbackShop}`);
    return res.redirect(`/auth?shop=${fallbackShop}`);
  }
  next();
});

// Catch-all route for React Router SPA, ensure app installed on shop
app.get("*", shopify.ensureInstalledOnShop(), (req, res) => {
  res.sendFile(resolve(__dirname, '../frontend/dist/index.html'));
});

// Abandoned cart cron job
if (process.env.ABANDONED_CART_CHECK_SCHEDULE) {
  cron.schedule(process.env.ABANDONED_CART_CHECK_SCHEDULE, async () => {
    console.log('⏱ Running abandoned cart job...');
    try {
      await processAbandonedCarts();
      console.log('✅ Abandoned cart job completed');
    } catch (error) {
      console.error('❌ Abandoned cart job failed:', error);
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
