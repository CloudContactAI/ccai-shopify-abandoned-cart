import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  ResourceList,
  Badge,
  Pagination,
  EmptyState,
  Filters,
  Select,
  Text,
  SkeletonBodyText,
  Banner,
} from '@shopify/polaris';
import { useQuery } from '@tanstack/react-query';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from '@shopify/app-bridge-utils';

import { useShop } from '../ShopContext';

const STATUS_BADGES = {
  sent: <Badge status="success">Sent</Badge>,
  delivered: <Badge status="success">Delivered</Badge>,
  failed: <Badge status="critical">Failed</Badge>,
};

const TYPE_BADGES = {
  abandoned_cart: <Badge status="info">Abandoned Cart</Badge>,
  test: <Badge status="attention">Test</Badge>,
  other: <Badge>Other</Badge>,
};

const getStatusBadge = (status) => STATUS_BADGES[status] ?? <Badge>Unknown</Badge>;
const getTypeBadge = (type) => TYPE_BADGES[type] ?? <Badge>Other</Badge>;

const SMSHistoryPage = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');

  const app = useAppBridge();
  const fetch = authenticatedFetch(app);
  const { shop, host, loading: contextLoading, error: contextError } = useShop();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery(
    ['sms-history', page, typeFilter, shop],
    async () => {
      if (!shop) throw new Error('Shop is not defined');
      let url = `/api/sms-history?page=${page}&limit=20`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch SMS history');
      return response.json();
    },
    { enabled: !!shop }
  );

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  if (contextLoading || isLoading) {
    return (
      <Page title="SMS History">
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <SkeletonBodyText lines={6} />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (contextError) {
    return (
      <Page title="SMS History">
        <Layout>
          <Layout.Section>
            <Banner title="Context error" status="critical">
              <p>{contextError}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!shop) {
    return (
      <Page title="SMS History">
        <Layout>
          <Layout.Section>
            <Banner title="Missing shop context" status="warning">
              <p>This page requires a valid shop to display SMS history. Try reloading from the Shopify admin.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page title="SMS History">
        <Layout>
          <Layout.Section>
            <Banner title="Error loading SMS history" status="critical">
              <p>{error?.message || 'An unknown error occurred.'}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!Array.isArray(data?.history) || data.history.length === 0) {
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
                  No SMS messages have been sent yet. Try sending a test message from the settings page or wait for abandoned cart reminders to be sent.
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
          {/* Debug Info — remove when shipping */}
          <Banner title="Debug Info" status="info">
            <p>Shop: {shop}</p>
            <p>Host: {host}</p>
          </Banner>

          <Card>
            <Card.Section>
              <Filters
                queryValue={typeFilter}
                onQueryChange={setTypeFilter}
                queryPlaceholder="Filter by type"
                filters={[
                  {
                    key: 'type',
                    label: 'Message type',
                    filter: (
                      <Select
                        options={[
                          { label: 'All Types', value: 'all' },
                          { label: 'Abandoned Cart', value: 'abandoned_cart' },
                          { label: 'Test', value: 'test' },
                          { label: 'Other', value: 'other' },
                        ]}
                        value={typeFilter}
                        onChange={setTypeFilter}
                        labelHidden
                      />
                    ),
                  },
                ]}
                hideQueryField
              />
            </Card.Section>

            <ResourceList
              resourceName={{ singular: 'message', plural: 'messages' }}
              items={data.history}
              renderItem={(sms) => {
                const recipientName = `${sms.recipient?.firstName ?? ''} ${sms.recipient?.lastName ?? ''}`.trim() || 'Unknown Recipient';
                return (
                  <ResourceList.Item id={sms._id} accessibilityLabel={`SMS to ${recipientName}`}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '1.5rem',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <Text as="h3" fontWeight="bold">{recipientName}</Text>
                        <Text tone="subdued">Phone: {sms.recipient?.phone ?? 'N/A'}</Text>
                        <Text tone="subdued">Sent: {formatDate(sms.timestamp)}</Text>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
                        {getStatusBadge(sms.status)}
                        {getTypeBadge(sms.type)}
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <Text>{sms.message}</Text>
                    </div>

                    {sms.error && (
                      <div style={{ marginTop: 5 }}>
                        <Text tone="critical">Error: {sms.error}</Text>
                      </div>
                    )}
                  </ResourceList.Item>
                );
              }}
            />

            {data.pagination?.pages > 1 && (
              <Card.Section>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    hasPrevious={page > 1}
                    onPrevious={() => setPage(page - 1)}
                    hasNext={page < data.pagination.pages}
                    onNext={() => setPage(page + 1)}
                    accessibilityLabel="SMS History pagination"
                    accessibilityPreviousLabel="Previous page"
                    accessibilityNextLabel="Next page"
                  />
                </div>
              </Card.Section>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default SMSHistoryPage;
