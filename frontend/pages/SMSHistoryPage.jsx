import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  ResourceList,
  TextStyle,
  Badge,
  Stack,
  Pagination,
  EmptyState,
  Filters,
  Select
} from '@shopify/polaris';
import { useQuery } from 'react-query';

const SMSHistoryPage = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');

  // Fetch SMS history
  const { data, isLoading } = useQuery(['sms-history', page, typeFilter], async () => {
    let url = `/api/sms-history?page=${page}&limit=20`;
    if (typeFilter !== 'all') {
      url += `&type=${typeFilter}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch SMS history');
    return response.json();
  });

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <Badge status="success">Sent</Badge>;
      case 'delivered':
        return <Badge status="success">Delivered</Badge>;
      case 'failed':
        return <Badge status="critical">Failed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Get type badge
  const getTypeBadge = (type) => {
    switch (type) {
      case 'abandoned_cart':
        return <Badge status="info">Abandoned Cart</Badge>;
      case 'test':
        return <Badge status="attention">Test</Badge>;
      default:
        return <Badge>Other</Badge>;
    }
  };

  // Filter options
  const typeOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Abandoned Cart', value: 'abandoned_cart' },
    { label: 'Test', value: 'test' },
    { label: 'Other', value: 'other' }
  ];

  // Empty state
  if (!isLoading && (!data?.history || data.history.length === 0)) {
    return (
      <Page title="SMS History">
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <EmptyState
                heading="No SMS history found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  No SMS messages have been sent yet.
                  Try sending a test message from the settings page or wait for abandoned cart reminders to be sent.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="SMS History">
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Section>
              <Filters>
                <Filters.Filter
                  label="Message type"
                  filter={
                    <Select
                      options={typeOptions}
                      value={typeFilter}
                      onChange={setTypeFilter}
                      labelHidden
                    />
                  }
                />
              </Filters>
            </Card.Section>
            
            <ResourceList
              resourceName={{ singular: 'message', plural: 'messages' }}
              items={data?.history || []}
              loading={isLoading}
              renderItem={(sms) => {
                return (
                  <ResourceList.Item
                    id={sms._id}
                  >
                    <Stack>
                      <Stack.Item fill>
                        <h3>
                          <TextStyle variation="strong">
                            {sms.recipient?.firstName || ''} {sms.recipient?.lastName || ''}
                          </TextStyle>
                        </h3>
                        <div>
                          <TextStyle variation="subdued">
                            Phone: {sms.recipient?.phone}
                          </TextStyle>
                        </div>
                        <div>
                          <TextStyle variation="subdued">
                            Sent: {formatDate(sms.timestamp)}
                          </TextStyle>
                        </div>
                      </Stack.Item>
                      
                      <Stack.Item>
                        <Stack vertical spacing="tight">
                          {getStatusBadge(sms.status)}
                          {getTypeBadge(sms.type)}
                        </Stack>
                      </Stack.Item>
                    </Stack>
                    
                    <div style={{ marginTop: '10px' }}>
                      <TextStyle>
                        {sms.message}
                      </TextStyle>
                    </div>
                    
                    {sms.error && (
                      <div style={{ marginTop: '5px' }}>
                        <TextStyle variation="negative">
                          Error: {sms.error}
                        </TextStyle>
                      </div>
                    )}
                  </ResourceList.Item>
                );
              }}
            />
            
            {data?.pagination && data.pagination.pages > 1 && (
              <Card.Section>
                <Stack distribution="center">
                  <Pagination
                    hasPrevious={page > 1}
                    onPrevious={() => setPage(page - 1)}
                    hasNext={page < data.pagination.pages}
                    onNext={() => setPage(page + 1)}
                  />
                </Stack>
              </Card.Section>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default SMSHistoryPage;
