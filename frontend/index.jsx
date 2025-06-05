/**
 * Frontend entry point for the CloudContactAI Abandoned Cart Recovery app
 * 
 * @license MIT
 * @copyright 2025 CloudContactAI LLC
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import enTranslations from '@shopify/polaris/locales/en.json';
import App from './App';

// Create a client for React Query
const queryClient = new QueryClient();

// Get the API key and host from the window
const apiKey = process.env.SHOPIFY_API_KEY;
const host = new URLSearchParams(window.location.search).get('host');

// Render the app
const root = createRoot(document.getElementById('app'));

root.render(
  <BrowserRouter>
    <AppBridgeProvider
      config={{
        apiKey,
        host,
        forceRedirect: true
      }}
    >
      <AppProvider i18n={enTranslations}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AppProvider>
    </AppBridgeProvider>
  </BrowserRouter>
);
