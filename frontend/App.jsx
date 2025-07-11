import {
  Box,
  Frame,
  Icon,
  Navigation,
  Spinner,
  Text,
  Button,
} from '@shopify/polaris';
import {
  CartMajor,
  ClockMajor,
  HomeMajor,
  SettingsMajor,
} from '@shopify/polaris-icons';

import React, { useMemo, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge-utils';

import Loader from './Loader';
import AbandonedCartsPage from './pages/AbandonedCartsPage';
import HomePage from './pages/HomePage';
import SMSHistoryPage from './pages/SMSHistoryPage';
import SettingsPage from './pages/SettingsPage';

import { useShop } from './ShopContext';

const App = () => {
  const { shop, host, loading, error } = useShop();
  const location = useLocation();
  const navigate = useNavigate();

  // 🔐 Shopify App Bridge config
  const config = useMemo(() => ({
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host,
    forceRedirect: true,
  }), [host]);

  // 🔄 Session token fetch (for authenticated requests)
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

  // 📚 Sidebar Navigation
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

  // 🚧 Loading state
  if (loading) {
    return (
      <Box padding="500" align="center">
        <Spinner size="large" />
        <Text variant="bodyMd">Loading your shop...</Text>
      </Box>
    );
  }

  // ❌ Context error state
  if (error) {
    return (
      <Box padding="500" align="center">
        <Text variant="headingLg" tone="critical">
          ❌ {error}
        </Text>
        <Text>Please launch the app from your Shopify admin.</Text>
      </Box>
    );
  }

  // ✅ Main App Layout
  return (
    <Frame navigation={navigationMarkup}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/abandoned-carts" element={<AbandonedCartsPage />} />
        <Route path="/sms-history" element={<SMSHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/loader" element={<Loader />} />

        {/* 🧭 Catch-all fallback */}
        <Route
          path="*"
          element={
            <Box padding="500" align="center">
              <Text variant="headingLg">🚫 Page not found</Text>
              <Text>The page you requested doesn’t exist.</Text>
              <Box padding="200">
                <Button primary onClick={() => navigate('/')}>
                  Return Home
                </Button>
              </Box>
            </Box>
          }
        />
      </Routes>
    </Frame>
  );
};

export default App;
