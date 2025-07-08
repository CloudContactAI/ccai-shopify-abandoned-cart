import '@shopify/polaris/build/esm/styles.css'; // Polaris CSS

/**
 * Frontend entry point for the CloudContactAI Abandoned Cart Recovery app
 *
 * @license MIT
 * © 2025 CloudContactAI
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';

import enTranslations from '@shopify/polaris/locales/en.json';

import App from './App';
import './index.css';
import { ShopProvider } from './ShopContext'; // ✅ updated import

const queryClient = new QueryClient();

const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;
const searchParams = new URLSearchParams(window.location.search);
const host = searchParams.get('host') || '';
const shop = searchParams.get('shop') || '';
const container = document.getElementById('app');

if (!apiKey) {
  document.body.innerHTML =
    "<div style='color:red;text-align:center;margin-top:2rem;'>VITE_SHOPIFY_API_KEY environment variable is not defined.</div>";
  console.error('VITE_SHOPIFY_API_KEY environment variable is not defined.');
} else if (!host || !shop) {
  document.body.innerHTML =
    "<div style='color:red;text-align:center;margin-top:2rem;'>Missing required query parameters (<code>host</code> and/or <code>shop</code>).</div>";
  console.error("Missing 'host' or 'shop' query parameter in URL.");
} else if (!container) {
  document.body.innerHTML =
    "<div style='color:red;text-align:center;margin-top:2rem;'>Root element with id 'app' not found.</div>";
  console.error("Root element with id 'app' not found.");
} else {
  const root = createRoot(container);

  root.render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppBridgeProvider config={{ apiKey, host, forceRedirect: true }}>
          <AppProvider i18n={enTranslations}>
            <ShopProvider shopOrigin={shop}>
              <Routes>
                <Route path="*" element={<App />} />
              </Routes>
            </ShopProvider>
          </AppProvider>
        </AppBridgeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
