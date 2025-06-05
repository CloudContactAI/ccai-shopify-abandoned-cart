/**
 * Main App component for the CloudContactAI Abandoned Cart Recovery app
 * 
 * @license MIT
 * @copyright 2025 CloudContactAI LLC
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Frame, Navigation } from '@shopify/polaris';
import { HomeIcon, SettingsIcon, HistoryIcon, CartIcon } from '@shopify/polaris-icons';

// Import pages
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import AbandonedCartsPage from './pages/AbandonedCartsPage';
import SMSHistoryPage from './pages/SMSHistoryPage';

const App = () => {
  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            url: '/',
            label: 'Home',
            icon: HomeIcon,
          },
          {
            url: '/abandoned-carts',
            label: 'Abandoned Carts',
            icon: CartIcon,
          },
          {
            url: '/sms-history',
            label: 'SMS History',
            icon: HistoryIcon,
          },
          {
            url: '/settings',
            label: 'Settings',
            icon: SettingsIcon,
          },
        ]}
      />
    </Navigation>
  );

  return (
    <Frame navigation={navigationMarkup}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/abandoned-carts" element={<AbandonedCartsPage />} />
        <Route path="/sms-history" element={<SMSHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Frame>
  );
};

export default App;

export default App;
