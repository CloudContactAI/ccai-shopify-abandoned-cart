require('dotenv').config({ path: '../.env' });

const { api, sessionStorage } = require('../shopify');

async function loadSessionForShop(shopDomain) {
  try {
    const offlineId = api.session.getOfflineId(shopDomain); // ✅ Get stable offline session ID
    const session = await sessionStorage.loadSession(offlineId); // ✅ Load it by ID

    if (!session) {
      throw new Error(`No offline session found for ${shopDomain}`);
    }

    return session;
  } catch (err) {
    console.error(`Failed to load session for ${shopDomain}:`, err.message);
    throw err;
  }
}

module.exports = loadSessionForShop;
