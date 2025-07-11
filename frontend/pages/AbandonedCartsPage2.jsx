import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch, getSessionToken } from '@shopify/app-bridge-utils';
import {
  Badge,
  Banner,
  Card,
  EmptyState,
  Layout,
  Page,
  Pagination,
  ResourceList,
  Select,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';

import { ResourceItem } from '@shopify/polaris';
console.log('✅ ResourceItem is:', ResourceItem);
console.log('✅ ResourceItem is:', ResourceList);


import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';

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

const AbandonedCartsPage = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('abandoned_cart');

  const app = useAppBridge();
  const fetch = authenticatedFetch(app);
  const { shop, host, loading: contextLoading, error: contextError } = useShop();

  useEffect(() => {
    if (app) {
      getSessionToken(app)
        .then((token) => {
          console.log('🪪 Session token for manual testing:', token);
        })
        .catch((err) => {
          console.error('❌ Failed to fetch session token:', err);
        });
    }
  }, [app]);

  const { data, isLoading, isError, error } = useQuery(
    ['abandoned-cart-history', page, typeFilter, shop],
    async () => {
      if (!shop) throw new Error('Shop is not defined');
      const url = `/api/sms-history?page=${page}&limit=20&type=${typeFilter}`;
      const response = await fetch(url);

      console.log('[Fetch] Response status:', response.status);
      console.log('[Fetch] Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) throw new Error('Failed to fetch abandoned cart messages');
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
      <Page title="Abandoned Cart Messages">
        <Banner title="🔄 Loading..." status="info">
          <p>Shop: {shop}</p>
          <p>Host: {host}</p>
        </Banner>
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
      <Page title="Abandoned Cart Messages">
        <Banner title="Context error" status="critical">
          <p>{contextError}</p>
          <p>Shop: {shop}</p>
          <p>Host: {host}</p>
        </Banner>
      </Page>
    );
  }

  if (!shop) {
    return (
      <Page title="Abandoned Cart Messages">
        <Banner title="Missing shop context" status="warning">
          <p>This page requires a valid shop. Try reloading from the Shopify admin.</p>
        </Banner>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page title="Abandoned Cart Messages">
        <Banner title="Error loading abandoned carts" status="critical">
          <p>{error?.message || 'An unknown error occurred.'}</p>
        </Banner>
      </Page>
    );
  }

  if (!Array.isArray(data?.history) || data.history.length === 0) {
    return (
      <Page title="Abandoned Cart Messages">
        <Banner title="No Abandoned Cart Messages" status="info">
          <p>Shop: {shop}</p>
          <p>Host: {host}</p>
        </Banner>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <EmptyState
                heading="No abandoned cart messages found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  No messages have been sent for abandoned carts yet. Try enabling recovery or send a test message from the settings page.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Abandoned Cart Messages">
      <Banner title="🔍 Page mounted" status="info">
        <p>Shop: {shop}</p>
        <p>Host: {host}</p>
      </Banner>
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Section title="Message Type">
              <Select
                label="Type"
                options={[
                  { label: 'Abandoned Cart', value: 'abandoned_cart' },
                  { label: 'Test', value: 'test' },
                  { label: 'Other', value: 'other' },
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </Card.Section>

            <ResourceList
              resourceName={{ singular: 'message', plural: 'messages' }}
              items={data.history}
              renderItem={(sms) => {
                //console.log('[🔍 sms item]', sms);

                if (!sms || !sms._id) {
                  return (
                    <ResourceItem id="missing" accessibilityLabel="Missing SMS data">
                      <Text>{sms?.message ?? 'No message content available.'}</Text>
                    </ResourceItem>
                  );
                }

                const recipientName =
                  typeof sms.recipient === 'object' && sms.recipient !== null
                    ? `${sms.recipient.firstName ?? ''} ${sms.recipient.lastName ?? ''}`.trim() || 'Unknown Recipient'
                    : 'Unknown Recipient';

                return (
                  <ResourceItem id={sms._id} accessibilityLabel={`SMS to ${recipientName}`}>
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
                        <Text as="h3" fontWeight="bold">
                          {recipientName}
                        </Text>
                        <Text tone="subdued">Phone: {sms.recipient?.phone ?? 'N/A'}</Text>
                        <Text tone="subdued">Sent: {formatDate(sms.timestamp)}</Text>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
                        {getStatusBadge(sms.status)}
                        {getTypeBadge(sms.type)}
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <Text>{sms.message ?? 'No message content available.'}</Text>
                    </div>

                    {sms.error && (
                      <div style={{ marginTop: 5 }}>
                        <Text tone="critical">Error: {sms.error}</Text>
                      </div>
                    )}
                  </ResourceItem>
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

export default AbandonedCartsPage;
