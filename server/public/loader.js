document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Loader] 🚀 DOM loaded');

  const AppBridge = window['app-bridge'];
  const createApp = AppBridge?.default;
  const getSessionToken = window.getSessionToken;

  if (!createApp) {
    document.body.innerHTML = '<p>⚠️ App Bridge failed to initialize.</p>';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  let shop = urlParams.get('shop');
  const host = urlParams.get('host');
  console.log('[Loader] Query string →', { shop, host });

  if (!host && shop) {
    const retryUrl = `/loader?shop=${shop}`;
    console.warn('[Loader] ⚠️ Missing host — retrying with:', retryUrl);
    window.top.location.href = retryUrl;
    return;
  }

  if (!host) {
    document.body.innerHTML = '<p>❌ Missing host parameter — cannot continue.</p>';
    console.error('[Loader] Aborting: no host or shop param.');
    return;
  }

  const app = createApp({
    apiKey: window.__SHOPIFY_API_KEY__,
    host: host,
  });

  if (!shop) {
    try {
      if (window !== window.top && typeof getSessionToken === 'function') {
        const token = await getSessionToken(app);
        const payload = JSON.parse(atob(token.split('.')[1]));
        shop = payload.dest.replace(/^https:\/\//, '');
        console.log('[Loader] 🏪 shop extracted from token:', shop);
      }
    } catch (err) {
      console.error('[Loader] ❌ getSessionToken failed:', err);
    }
  }

  if (shop) {
    const redirectUrl = `/auth?shop=${shop}&host=${host}`;
    console.log('[Loader] 🔁 Redirecting to:', redirectUrl);
    window.top.location.href = redirectUrl;
  }
});
