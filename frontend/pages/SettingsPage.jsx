import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  SettingToggle,
  TextStyle,
  Banner,
  Select,
  Stack,
  Frame,
  Toast
} from '@shopify/polaris';
import { useQuery, useMutation, useQueryClient } from 'react-query';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ content: '', error: false });
  const [testSMS, setTestSMS] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    message: ''
  });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Fetch settings
  const { data: settings, isLoading } = useQuery('settings', async () => {
    const response = await fetch('/api/settings');
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  });

  // Update settings mutation
  const updateSettings = useMutation(
    async (newSettings) => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
      
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        setToastContent({ content: 'Settings saved successfully', error: false });
        setShowToast(true);
      },
      onError: (error) => {
        setToastContent({ content: `Error: ${error.message}`, error: true });
        setShowToast(true);
      }
    }
  );

  // Send test SMS
  const sendTestSMS = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testSMS)
      });
      
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'Failed to send test SMS');
      
      setTestResult({
        success: true,
        messageId: result.messageId
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    updateSettings.mutate(settings);
  };

  // Handle toggle for enabling/disabling reminders
  const handleToggle = () => {
    updateSettings.mutate({
      ...settings,
      abandonedCartReminders: {
        ...settings.abandonedCartReminders,
        enabled: !settings.abandonedCartReminders.enabled
      }
    });
  };

  // Handle input changes
  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [section, key] = field.split('.');
      updateSettings.mutate({
        ...settings,
        [section]: {
          ...settings[section],
          [key]: value
        }
      });
    } else {
      updateSettings.mutate({
        ...settings,
        [field]: value
      });
    }
  };

  // Handle test SMS input changes
  const handleTestSMSChange = (field, value) => {
    setTestSMS({
      ...testSMS,
      [field]: value
    });
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

  const hourOptions = [
    { label: '1 hour', value: '1' },
    { label: '6 hours', value: '6' },
    { label: '12 hours', value: '12' },
    { label: '24 hours', value: '24' },
    { label: '48 hours', value: '48' }
  ];

  return (
    <Frame>
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
          loading: updateSettings.isLoading
        }}
      >
        <Layout>
          {/* General Settings */}
          <Layout.Section>
            <Card title="General Settings" sectioned>
              <FormLayout>
                <TextField
                  label="Shop Name"
                  value={settings.shopName || ''}
                  onChange={(value) => handleChange('shopName', value)}
                  helpText="This name will be used in SMS messages"
                />
              </FormLayout>
            </Card>
          </Layout.Section>

          {/* CloudContactAI Settings */}
          <Layout.Section>
            <Card title="CloudContactAI Integration" sectioned>
              <FormLayout>
                <TextField
                  label="Client ID"
                  value={settings.ccai?.clientId || ''}
                  onChange={(value) => handleChange('ccai.clientId', value)}
                  type="text"
                  helpText="Your CloudContactAI client ID"
                />
                <TextField
                  label="API Key"
                  value={settings.ccai?.apiKey || ''}
                  onChange={(value) => handleChange('ccai.apiKey', value)}
                  type="password"
                  helpText="Your CloudContactAI API key"
                />
              </FormLayout>
            </Card>
          </Layout.Section>

          {/* Abandoned Cart Settings */}
          <Layout.Section>
            <Card title="Abandoned Cart Settings" sectioned>
              <FormLayout>
                <Select
                  label="Consider cart abandoned after"
                  options={hourOptions}
                  value={settings.abandonedCartReminders?.hourThreshold?.toString() || '24'}
                  onChange={(value) => handleChange('abandonedCartReminders.hourThreshold', parseInt(value, 10))}
                  helpText="Time after which a cart is considered abandoned"
                />
                <TextField
                  label="Message Template"
                  value={settings.abandonedCartReminders?.messageTemplate || ''}
                  onChange={(value) => handleChange('abandonedCartReminders.messageTemplate', value)}
                  multiline={3}
                  helpText="Use ${firstName}, ${lastName}, ${shopName}, and ${cartUrl} as variables"
                />
                <SettingToggle
                  action={{
                    content: settings.abandonedCartReminders?.enabled ? 'Disable' : 'Enable',
                    onAction: handleToggle
                  }}
                  enabled={settings.abandonedCartReminders?.enabled}
                >
                  <TextStyle variation={settings.abandonedCartReminders?.enabled ? 'positive' : 'subdued'}>
                    Abandoned cart reminders are {settings.abandonedCartReminders?.enabled ? 'enabled' : 'disabled'}
                  </TextStyle>
                </SettingToggle>
              </FormLayout>
            </Card>
          </Layout.Section>

          {/* Test SMS */}
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
                <Stack distribution="trailing">
                  <Button
                    primary
                    onClick={sendTestSMS}
                    loading={isSendingTest}
                    disabled={!settings.ccai?.clientId || !settings.ccai?.apiKey || !testSMS.phone}
                  >
                    Send Test SMS
                  </Button>
                </Stack>

                {testResult && (
                  <div style={{ marginTop: '1rem' }}>
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
    </Frame>
  );
};

export default SettingsPage;
