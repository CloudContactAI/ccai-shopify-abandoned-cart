require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { resolve } = require('node:path');
const compression = require('compression');
const cron = require('node-cron');
const serveStatic = require('serve-static');

const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { shopify } = require('./shopify');
const apiRoutes = require('./handlers/api');
const Cart = require('./models/cart');
const Shop = require('./models/shop');
const { processAbandonedCarts } = require('./jobs/abandoned-cart');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '8081', 10);

// 🔌 MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// 🛡️ Security headers for Shopify embedding
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    'frame-ancestors https://*.myshopify.com https://admin.shopify.com'
  );
  next();
});

// 🧠 Core Middleware
app.use(cookieParser());
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(compression());
app.set('trust proxy', 1);

// 🔐 Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'some-very-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// 🧬 Shopify API setup
const shopifyApiInstance = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_API_SCOPES.split(','),
  hostName: process.env.SHOPIFY_APP_URL.replace(/^https:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

// 🔄 OAuth Callback
app.use('/auth/callback', shopify.auth.callback());

app.get('/auth/callback', async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const shop = session.shop;
    const host = req.query.host;

    req.session.shop = shop;
    req.session.host = host;

    await Shop.findOneAndUpdate(
      { shopDomain: shop },
      {
        shopDomain: shop,
        isActive: true,
        accessToken: session.accessToken,
        installedAt: new Date(),
        scopes: process.env.SHOPIFY_API_SCOPES,
      },
      { upsert: true, new: true }
    );

    await new Promise((resolve, reject) => {
      req.session.save((err) => err ? reject(err) : resolve());
    });

    const registrationSuccess = await shopifyApiInstance.webhooks.register({
      session,
      webhookHandlers: {
        'customers/create': async (_topic, _shop, body) => {
          const payload = JSON.parse(body);
          if (payload.phone) {
            try {
              console.log(`📲 Sending SMS to ${payload.phone}`);
            } catch (smsError) {
              console.error('SMS sending error:', smsError);
            }
          } else {
            console.log('⚠️ No phone in payload');
          }
        }
      }
    });

    if (!registrationSuccess) {
      console.warn('❌ Webhook registration failed');
    } else {
      console.log('✅ customers/create webhook registered');
    }

    res.redirect(`/?shop=${shop}&host=${host}`);
  } catch (error) {
    console.error('❌ Auth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// 🚀 Begin OAuth
app.use('/auth', (req, _res, next) => {
  console.log('[DEBUG /auth] Incoming request:', req.query);
  next();
}, shopify.auth.begin());

// 🕸️ Webhooks
app.post('/webhooks/:topic', async (req, res) => {
  try {
    const response = await shopifyApiInstance.webhooks.process({
      rawBody: req.rawBody,
      rawRequest: req,
      rawResponse: res
    });

    if (!response.success) throw new Error(`Webhook failed for topic ${req.params.topic}`);
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).send('Webhook failed');
  }
});

// 🧪 Manual test cart
app.post('/store-cart', async (req, res) => {
  try {
    const cart = new Cart({
      shopDomain: 'ccai-andreas-test.myshopify.com',
      cartId: 'test123',
      cartToken: 'abc123token',
      customer: {
        id: 'cust001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '+15551234567',
      },
      cartData: {
        line_items: [{ title: 'Sample Item', quantity: 1, price: '29.99' }],
        currency: 'USD',
        subtotal: '29.99',
      },
      isAbandoned: true,
      abandonedAt: new Date(Date.now() - 20 * 60 * 1000),
    });

    await cart.save();
    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('❌ Failed to store cart:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔐 Protected API routes
app.use('/api', shopify.validateAuthenticatedSession(), apiRoutes);

// 🌐 Serve frontend
app.use(serveStatic(resolve(__dirname, '../frontend/dist')));
app.get('/loader', (_req, res) => {
  res.sendFile(resolve(__dirname, '../frontend/dist/index.html'));
});
app.get('/', (_req, res) => {
  res.send(`
    <h2>👋 Welcome to Test1Andreas</h2>
    <p>Your Shopify app backend is running.</p>
    <a href="/auth?shop=ccai-andreas-test.myshopify.com">→ Click here to install the app</a>
  `);
});

// 🛡️ Redirect Middleware for Embedded Context
app.use((req, res, next) => {
  const whitelist = ['/auth', '/auth/callback', '/webhooks', '/api', '/favicon.ico', '/loader', '/store-cart'];
  if (whitelist.some((path) => req.path.startsWith(path))) return next();

  const { shop, host } = req.query;
  if (typeof shop !== 'string' || !shop || typeof host !== 'string' || !host) {
    const fallbackShop = req.session?.shop || 'ccai-andreas-test.myshopify.com';
    const fallbackHost = req.session?.host || '';
    const redirectUrl = new URL(req.originalUrl, `https://${req.headers.host}`);
    redirectUrl.searchParams.set('shop', fallbackShop);
    if (fallbackHost) redirectUrl.searchParams.set('host', fallbackHost);

    console.log(`⚠️ Redirecting to embedded route with shop: ${fallbackShop}, path: ${req.originalUrl}`);
    return res.redirect(redirectUrl.toString());
  }

  next();
});

// 🧩 Catch-all route
app.get('*', shopify.ensureInstalledOnShop(), (_req, res) => {
  res.sendFile(resolve(__dirname, '../frontend/dist/index.html'));
});

// 🕓 Cron job
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = { app, shopify };
