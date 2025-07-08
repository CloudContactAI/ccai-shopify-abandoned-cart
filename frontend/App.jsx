/**
 * Main App component for the CloudContactAI Abandoned Cart Recovery app
 *
 * @license MIT
 * © 2025 CloudContactAI LLC
 */
import React, { useMemo, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Frame, Navigation, Icon, Spinner, Text, Box } from '@shopify/polaris';
import {
  HomeMajor,
  SettingsMajor,
  ClockMajor,
  CartMajor,
} from '@shopify/polaris-icons';

import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge-utils';

import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import AbandonedCartsPage from './pages/AbandonedCartsPage';
import SMSHistoryPage from './pages/SMSHistoryPage';
import Loader from './Loader';

import { useShop } from './ShopContext';

const App = () => {
  const { shop, host, loading, error } = useShop();
  const location = useLocation();
  const navigate = useNavigate();

  const config = useMemo(() => ({
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host,
    forceRedirect: true,
  }), [host]);

  useEffect(() => {
    if (!host || !shop) return;

    const app = createApp(config);
    getSessionToken(app)
      .then((token) => {
        console.log('[AppBridge] ✅ Session token retrieved:', token);
      })
      .catch((err) => {
        console.error('[AppBridge] ❌ Failed to get session token:', err);
      });
  }, [config, host, shop]);

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: 'Home',
            icon: () => <Icon source={HomeMajor} />,
            onClick: () => navigate('/'),
          },
          {
            label: 'Abandoned Carts',
            icon: () => <Icon source={CartMajor} />,
            onClick: () => navigate('/abandoned-carts'),
          },
          {
            label: 'SMS History',
            icon: () => <Icon source={ClockMajor} />,
            onClick: () => navigate('/sms-history'),
          },
          {
            label: 'Settings',
            icon: () => <Icon source={SettingsMajor} />,
            onClick: () => navigate('/settings'),
          },
        ]}
      />
    </Navigation>
  );

  if (loading) {
    return (
      <Box padding="500" align="center">
        <Spinner size="large" />
        <Text variant="bodyMd" as="p" alignment="center">
          Loading your shop...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="500" align="center">
        <Text variant="headingLg" as="h2" tone="critical">
          ❌ {error}
        </Text>
        <Text as="p">Please launch the app from your Shopify admin.</Text>
      </Box>
    );
  }

  return (
    <Frame navigation={navigationMarkup}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/abandoned-carts" element={<AbandonedCartsPage />} />
        <Route path="/sms-history" element={<SMSHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/loader" element={<Loader />} />
        <Route
          path="*"
          element={
            <div style={{ padding: 40, textAlign: 'center' }}>
              <h2>Page not found</h2>
              <p>The page you are looking for does not exist.</p>
              <button
                style={{
                  marginTop: '1rem',
                  padding: '0.6rem 1.2rem',
                  backgroundColor: '#008060',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/')}
              >
                Return Home
              </button>
            </div>
          }
        />
      </Routes>
    </Frame>
  );
};

export default App;
