import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from '@shopify/app-bridge-utils';
import {
  Banner,
  Button,
  Card,
  FormLayout,
  Layout,
  Page,
  Select,
  SettingToggle,
  Text,
  TextField,
  Toast,
} from '@shopify/polaris';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';

import { useShop } from '../ShopContext';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ content: '', error: false });
  const [testSMS, setTestSMS] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    message: '',
  });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const app = useAppBridge();
  const fetch = authenticatedFetch(app);

  const { shop } = useShop();

  const {
    data: settings,
    isLoading,
    isError,
    error,
  } = useQuery(
    ['settings'],
    async () => {
      if (!shop) throw new Error('Shop is not defined');
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    { enabled: !!shop }
  );

  const updateSettings = useMutation(
    async (newSettings) => {
      if (!shop) throw new Error('Shop is not defined');
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['settings']);
        setToastContent({ content: 'Settings saved successfully', error: false });
        setShowToast(true);
      },
      onError: (error) => {
        setToastContent({ content: `Error: ${error.message}`, error: true });
        setShowToast(true);
      },
    }
  );

  const sendTestSMS = async () => {
    if (!shop) {
      setTestResult({ success: false, error: 'Shop is not defined' });
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSMS),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send test SMS');
      setTestResult({ success: true, messageId: result.messageId });
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSubmit = () => {
    if (settings) updateSettings.mutate(settings);
  };

  const handleToggle = () => {
    if (settings) {
      updateSettings.mutate({
        ...settings,
        abandonedCartReminders: {
          ...settings.abandonedCartReminders,
          enabled: !settings.abandonedCartReminders.enabled,
        },
      });
    }
  };

  const handleChange = (field, value) => {
    if (!settings) return;

    if (field.includes('.')) {
      const [section, key] = field.split('.');
      updateSettings.mutate({
        ...settings,
        [section]: {
          ...settings[section],
          [key]: value,
        },
      });
    } else {
      updateSettings.mutate({
        ...settings,
        [field]: value,
      });
    }
  };

  const handleTestSMSChange = (field, value) => {
    setTestSMS({ ...testSMS, [field]: value });
  };

  if (isLoading) {
    return (
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <p>Loading settings...</p>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Banner status="critical" title="Error loading settings">
              <p>{error.message}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const hourOptions = [
    { label: '1 minutes', value: '0.0167' },
    { label: '6 hours', value: '6' },
    { label: '12 hours', value: '12' },
    { label: '24 hours', value: '24' },
    { label: '48 hours', value: '48' },
  ];

  return (
    <>
      {showToast && (
        <Toast
          content={toastContent.content}
          error={toastContent.error}
          onDismiss={() => setShowToast(false)}
        />
      )}

      <Page
        title="Settings"
        primaryAction={{
          content: 'Save',
          onAction: handleSubmit,
          loading: updateSettings.isLoading,
        }}
      >
        <Layout>
          <Layout.Section>
            <Card title="General Settings" sectioned>
              <FormLayout>
                <TextField
                  label="Shop Name"
                  value={settings?.shopName ?? ''}
                  onChange={(value) => handleChange('shopName', value)}
                  helpText="This name will be used in SMS messages"
                />
              </FormLayout>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card title="CloudContactAI Integration" sectioned>
              <FormLayout>
                <TextField
                  label="Client ID"
                  value={settings?.ccai?.clientId ?? ''}
                  onChange={(value) => handleChange('ccai.clientId', value)}
                  type="text"
                  helpText="Enter CCAI Client ID"
                />
                <TextField
                  label="API Key"
                  value={settings?.ccai?.apiKey ?? ''}
                  onChange={(value) => handleChange('ccai.apiKey', value)}
                  type="password"
                  helpText="Enter CCAI Api Key"
                />
              </FormLayout>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card title="Abandoned Cart Settings" sectioned>
              <FormLayout>
                <Select
                  label="Consider cart abandoned after"
                  options={hourOptions}
                  value={settings?.abandonedCartReminders?.hourThreshold?.toString() ?? '24'}
                  onChange={(value) =>
                    handleChange('abandonedCartReminders.hourThreshold', Number.parseInt(value, 10))
                  }
                  helpText="Time after which a cart is considered abandoned"
                />
                <TextField
                  label="Message Template"
                  value={settings?.abandonedCartReminders?.messageTemplate ?? ''}
                  onChange={(value) =>
                    handleChange('abandonedCartReminders.messageTemplate', value)
                  }
                  multiline={3}
                  helpText="Use ${firstName}, ${lastName}, ${shopName}, and ${cartUrl} as variables"
                />
                <SettingToggle
                  action={{
                    content: settings?.abandonedCartReminders?.enabled ? 'Disable' : 'Enable',
                    onAction: handleToggle,
                  }}
                  enabled={settings?.abandonedCartReminders?.enabled}
                >
                  <Text
                    as="span"
                    tone={settings?.abandonedCartReminders?.enabled ? 'success' : 'subdued'}
                    fontWeight="medium"
                  >
                    Abandoned cart reminders are{' '}
                    {settings?.abandonedCartReminders?.enabled ? 'enabled' : 'disabled'}
                  </Text>
                </SettingToggle>
              </FormLayout>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card title="Test SMS" sectioned>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="First Name"
                    value={testSMS.firstName}
                    onChange={(value) => handleTestSMSChange('firstName', value)}
                  />
                  <TextField
                    label="Last Name"
                    value={testSMS.lastName}
                    onChange={(value) => handleTestSMSChange('lastName', value)}
                  />
                </FormLayout.Group>
                <TextField
                  label="Phone Number"
                  value={testSMS.phone}
                  onChange={(value) => handleTestSMSChange('phone', value)}
                  helpText="Enter phone number in E.164 format (e.g., +12345678901)"
                />
                <TextField
                  label="Message"
                  value={testSMS.message}
                  onChange={(value) => handleTestSMSChange('message', value)}
                  multiline={2}
                  helpText="Leave blank to use default template"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    primary
                    onClick={sendTestSMS}
                    loading={isSendingTest}
                    disabled={
                      !settings?.ccai?.clientId || !settings?.ccai?.apiKey || !testSMS.phone
                    }
                  >
                    Send Test SMS
                  </Button>
                </div>

                {testResult && (
                  <div style={{ marginTop: '1rem' }} aria-live="polite">
                    {testResult.success ? (
                      <Banner title="SMS Sent Successfully" status="success">
                        <p>Message ID: {testResult.messageId}</p>
                      </Banner>
                    ) : (
                      <Banner title="Failed to Send SMS" status="critical">
                        <p>{testResult.error}</p>
                      </Banner>
                    )}
                  </div>
                )}
              </FormLayout>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </>
  );
};

export default SettingsPage;
