import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  TextContainer,
  SkeletonBodyText,
  Button,
  Banner,
  Stack,
  Heading,
  TextStyle,
  ProgressBar
} from '@shopify/polaris';
import { useQuery } from 'react-query';

const HomePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  // Fetch settings to check if the app is configured
  const { data: settings, isLoading: settingsLoading } = useQuery('settings', async () => {
    const response = await fetch('/api/settings');
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  });

  // Fetch abandoned carts count
  const { data: abandonedCarts, isLoading: cartsLoading } = useQuery('abandoned-carts', async () => {
    const response = await fetch('/api/abandoned-carts');
    if (!response.ok) throw new Error('Failed to fetch abandoned carts');
    return response.json();
  });

  // Trigger abandoned cart reminders manually
  const triggerReminders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trigger-reminders', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to trigger reminders');
      
      const result = await response.json();
      setTriggerResult(result);
    } catch (error) {
      console.error('Error triggering reminders:', error);
      setTriggerResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the app is configured
  const isConfigured = settings?.ccai?.clientId && settings?.ccai?.apiKey;
  const isEnabled = settings?.abandonedCartReminders?.enabled;

  return (
    <Page title="CloudContactAI Abandoned Cart Reminders">
      <Layout>
        {/* Configuration Status */}
        <Layout.Section>
          {settingsLoading ? (
            <Card sectioned>
              <SkeletonBodyText />
            </Card>
          ) : !isConfigured ? (
            <Banner
              title="Setup Required"
              status="warning"
              action={{ content: 'Configure Now', onAction: () => navigate('/settings') }}
            >
              <p>You need to configure your CloudContactAI credentials before you can send SMS reminders.</p>
            </Banner>
          ) : !isEnabled ? (
            <Banner
              title="Reminders Disabled"
              status="info"
              action={{ content: 'Enable Now', onAction: () => navigate('/settings') }}
            >
              <p>Abandoned cart reminders are currently disabled. Enable them in settings to start recovering lost sales.</p>
            </Banner>
          ) : (
            <Banner title="Reminders Active" status="success">
              <p>Your abandoned cart reminders are active and will be sent automatically.</p>
            </Banner>
          )}
        </Layout.Section>

        {/* Stats Cards */}
        <Layout.Section oneHalf>
          <Card title="Abandoned Carts" sectioned>
            {cartsLoading ? (
              <SkeletonBodyText lines={2} />
            ) : (
              <TextContainer>
                <Stack distribution="equalSpacing" alignment="center">
                  <Heading element="h3">
                    <TextStyle variation="strong">{abandonedCarts?.length || 0}</TextStyle>
                  </Heading>
                  <Button 
                    primary 
                    disabled={!isConfigured || !isEnabled || isLoading}
                    onClick={() => navigate('/abandoned-carts')}
                  >
                    View Carts
                  </Button>
                </Stack>
                <p>Carts abandoned in the last {settings?.abandonedCartReminders?.hourThreshold || 24} hours.</p>
              </TextContainer>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card title="Recovery Status" sectioned>
            {settingsLoading ? (
              <SkeletonBodyText lines={2} />
            ) : (
              <TextContainer>
                <ProgressBar progress={isEnabled ? 100 : isConfigured ? 50 : 25} size="medium" />
                <p>
                  {isEnabled
                    ? 'Your abandoned cart recovery system is fully operational.'
                    : isConfigured
                    ? 'Almost there! Enable reminders in settings to complete setup.'
                    : 'Get started by configuring your CloudContactAI credentials.'}
                </p>
              </TextContainer>
            )}
          </Card>
        </Layout.Section>

        {/* Manual Trigger Section */}
        <Layout.Section>
          <Card title="Manual Actions" sectioned>
            <Stack distribution="equalSpacing" alignment="center">
              <TextContainer>
                <p>Manually send reminders for all eligible abandoned carts.</p>
              </TextContainer>
              <Button 
                primary 
                loading={isLoading}
                disabled={!isConfigured || !isEnabled || cartsLoading || abandonedCarts?.length === 0}
                onClick={triggerReminders}
              >
                Send Reminders Now
              </Button>
            </Stack>

            {triggerResult && (
              <div style={{ marginTop: '1rem' }}>
                {triggerResult.error ? (
                  <Banner title="Error" status="critical">
                    <p>{triggerResult.error}</p>
                  </Banner>
                ) : (
                  <Banner title="Success" status="success">
                    <p>Successfully processed {triggerResult.processed} abandoned carts.</p>
                  </Banner>
                )}
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default HomePage;
