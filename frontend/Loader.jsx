import { useEffect } from 'react';
import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { useShop } from './ShopContext';

const Loader = () => {
  const { shop: contextShop } = useShop();

  useEffect(() => {
    const url = new URL(window.location.href);
    const shop = url.searchParams.get('shop') || contextShop;
    const host = url.searchParams.get('host');

    if (!host) {
      if (shop) {
        const retryUrl = `/loader?shop=${shop}`;
        console.warn('[Loader] Missing host — retrying:', retryUrl);
        window.top.location.href = retryUrl;
      } else {
        document.body.innerHTML = '<p>❌ Missing host parameter.</p>';
        console.error('[Loader] Aborting — no host or shop.');
      }
      return;
    }

    const app = createApp({
      apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
      host,
    });

    const redirectToAuth = (resolvedShop) => {
      const redirectUrl = `/auth?shop=${resolvedShop}&host=${host}`;
      console.log('[Loader] Redirecting to:', redirectUrl);
      window.top.location.href = redirectUrl;
    };

    if (shop) {
      redirectToAuth(shop);
    } else {
      getSessionToken(app)
        .then((token) => {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const derivedShop = payload.dest.replace(/^https:\/\/?/, '');
          redirectToAuth(derivedShop);
        })
        .catch((err) => {
          console.error('[Loader] Token error:', err);
          document.body.innerHTML = '<p>❌ Failed to extract shop domain from token.</p>';
        });
    }
  }, [contextShop]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>🚀 Loading your Shopify app...</p>
      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Please wait while we connect you securely.
      </p>
    </div>
  );
};

export default Loader;
