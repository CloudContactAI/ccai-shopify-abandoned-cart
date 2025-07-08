import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  TextContainer,
  SkeletonBodyText,
  Button,
  Banner,
  Text,
  ProgressBar,
} from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from '@shopify/app-bridge-utils';

import { useShop } from '../ShopContext';

const HomePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  const app = useAppBridge();
  const fetch = authenticatedFetch(app);
  const { shop } = useShop();

  // Fetch settings, enabled only if shop is defined
  const { data: settings, isLoading: settingsLoading, isError: settingsError, error: settingsFetchError } = useQuery(
    ['settings', shop],
    async () => {
      if (!shop) throw new Error('Shop is not defined');
      const response = await fetch('/api/settings'); // backend can use session to identify shop
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    { enabled: !!shop }
  );

  // Fetch abandoned carts count
  const { data: abandonedCarts, isLoading: cartsLoading, isError: cartsError, error: cartsFetchError } = useQuery(
    ['abandoned-carts'],
    async () => {
      if (!shop) throw new Error('Shop is not defined');
      const response = await fetch('/api/abandoned-carts');
      if (!response.ok) throw new Error('Failed to fetch abandoned carts');
      return response.json();
    },
    { enabled: !!shop }
  );

  const triggerReminders = async () => {
    if (!shop) {
      setTriggerResult({ error: 'Shop is not defined' });
      return;
    }
    setIsLoading(true);
    setTriggerResult(null);
    try {
      const response = await fetch('/api/trigger-reminders', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to trigger reminders');
      const result = await response.json();
      setTriggerResult(result);
    } catch (error) {
      setTriggerResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isConfigured = settings?.ccai?.clientId && settings?.ccai?.apiKey;
  const isEnabled = settings?.abandonedCartReminders?.enabled;

  return (
    <Page title="CloudContactAI Abandoned Cart Reminders">
      <Layout>
        <Layout.Section>
          {settingsLoading ? (
            <Card sectioned>
              <SkeletonBodyText />
            </Card>
          ) : settingsError ? (
            <Banner title="Error loading settings" status="critical">
              <Text>{settingsFetchError.message}</Text>
            </Banner>
          ) : !isConfigured ? (
            <Banner
              title="Setup Required"
              status="warning"
              action={{ content: 'Configure Now', onAction: () => navigate('/settings') }}
            >
              <Text>
                You need to configure your CloudContactAI credentials before you can send SMS reminders.
              </Text>
            </Banner>
          ) : !isEnabled ? (
            <Banner
              title="Reminders Disabled"
              status="info"
              action={{ content: 'Enable Now', onAction: () => navigate('/settings') }}
            >
              <Text>
                Abandoned cart reminders are currently disabled. Enable them in settings to start recovering lost sales.
              </Text>
            </Banner>
          ) : (
            <Banner title="Reminders Active" status="success">
              <Text>Your abandoned cart reminders are active and will be sent automatically.</Text>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card title="Abandoned Carts" sectioned>
            {cartsLoading ? (
              <SkeletonBodyText lines={2} />
            ) : cartsError ? (
              <Banner title="Error loading carts" status="critical">
                <Text>{cartsFetchError.message}</Text>
              </Banner>
            ) : (
              <TextContainer spacing="tight">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text as="h3" variant="headingMd" fontWeight="bold">
                    {abandonedCarts?.length ?? 0}
                  </Text>
                  <Button
                    primary
                    disabled={!isConfigured || !isEnabled || isLoading}
                    onClick={() => navigate('/abandoned-carts')}
                  >
                    View Carts
                  </Button>
                </div>
                <Text>
                  Carts abandoned in the last{' '}
                  {settings?.abandonedCartReminders?.hourThreshold ?? 24} hours.
                </Text>
              </TextContainer>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card title="Recovery Status" sectioned>
            {settingsLoading ? (
              <SkeletonBodyText lines={2} />
            ) : (
              <TextContainer spacing="tight">
                <ProgressBar progress={isEnabled ? 100 : isConfigured ? 50 : 25} size="medium" />
                <Text>
                  {isEnabled
                    ? 'Your abandoned cart recovery system is fully operational.'
                    : isConfigured
                    ? 'Almost there! Enable reminders in settings to complete setup.'
                    : 'Get started by configuring your CloudContactAI credentials.'}
                </Text>
              </TextContainer>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card title="Manual Actions" sectioned>
            <TextContainer spacing="loose">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text>Manually send reminders for all eligible abandoned carts.</Text>
                <Button
                  primary
                  loading={isLoading}
                  disabled={
                    !isConfigured || !isEnabled || cartsLoading || abandonedCarts?.length === 0
                  }
                  onClick={triggerReminders}
                >
                  Send Reminders Now
                </Button>
              </div>

              {triggerResult && (
                <div>
                  {triggerResult.error ? (
                    <Banner title="Error" status="critical">
                      <Text>{triggerResult.error}</Text>
                    </Banner>
                  ) : (
                    <Banner title="Success" status="success">
                      <Text>
                        Successfully processed {triggerResult.processed} abandoned carts.
                      </Text>
                    </Banner>
                  )}
                </div>
              )}
            </TextContainer>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default HomePage;
