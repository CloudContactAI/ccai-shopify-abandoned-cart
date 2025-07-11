import '@shopify/polaris/build/esm/styles.css'; // Polaris CSS

/**
 * Frontend entry point for the CloudContactAI Abandoned Cart Recovery app
 *x
 * @license MIT
 * © 2025 CloudContactAI
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import enTranslations from '@shopify/polaris/locales/en.json';
import App from './App';
import '@shopify/polaris/build/esm/styles.css';

import './index.css';
import { ShopProvider } from './ShopContext';

const container = document.getElementById('app');
const searchParams = new URLSearchParams(window.location.search);

const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;
const host = searchParams.get('host');
const shop = searchParams.get('shop');

const queryClient = new QueryClient();

if (!apiKey || !host || !shop || !container) {
  document.body.innerHTML = `
    <div style='color:red;text-align:center;margin-top:2rem;'>
      ${!apiKey ? '❌ VITE_SHOPIFY_API_KEY is missing.<br>' : ''}
      ${!host || !shop ? '❌ Missing required query parameters: <code>host</code> and/or <code>shop</code>.<br>' : ''}
      ${!container ? '❌ Root element with id <code>app</code> not found.<br>' : ''}
    </div>
  `;
  console.error('🚫 Missing required initialization details.');
} else {
  ReactDOM.createRoot(container).render(
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
