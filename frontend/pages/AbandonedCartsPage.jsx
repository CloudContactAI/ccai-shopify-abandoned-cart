import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  ResourceList,
  TextStyle,
  Button,
  Badge,
  Stack,
  Filters,
  Select,
  Frame,
  Toast,
  EmptyState
} from '@shopify/polaris';
import { useQuery, useMutation, useQueryClient } from 'react-query';

const AbandonedCartsPage = () => {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState([]);
  const [hourFilter, setHourFilter] = useState('24');
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ content: '', error: false });

  // Fetch abandoned carts
  const { data: carts, isLoading } = useQuery(['abandoned-carts', hourFilter], async () => {
    const response = await fetch(`/api/abandoned-carts?hours=${hourFilter}`);
    if (!response.ok) throw new Error('Failed to fetch abandoned carts');
    return response.json();
  });

  // Send reminders mutation
  const sendReminders = useMutation(
    async (cartIds) => {
      const response = await fetch('/api/trigger-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cartIds })
      });
      
      if (!response.ok) throw new Error('Failed to send reminders');
      return response.json();
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('abandoned-carts');
        setToastContent({ 
          content: `Successfully sent ${data.processed} reminders`, 
          error: false 
        });
        setShowToast(true);
        setSelectedItems([]);
      },
      onError: (error) => {
        setToastContent({ 
          content: `Error: ${error.message}`, 
          error: true 
        });
        setShowToast(true);
      }
    }
  );

  // Handle sending reminders for selected carts
  const handleSendReminders = () => {
    sendReminders.mutate(selectedItems);
  };

  // Filter options
  const hourOptions = [
    { label: 'Last 1 hour', value: '1' },
    { label: 'Last 6 hours', value: '6' },
    { label: 'Last 12 hours', value: '12' },
    { label: 'Last 24 hours', value: '24' },
    { label: 'Last 48 hours', value: '48' }
  ];

  // Format currency
  const formatCurrency = (value) => {
    return `$${parseFloat(value).toFixed(2)}`;
  };

  // Calculate cart total
  const getCartTotal = (cart) => {
    if (!cart.cartData || !cart.cartData.line_items) return 0;
    
    return cart.cartData.line_items.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Empty state
  if (!isLoading && (!carts || carts.length === 0)) {
    return (
      <Page title="Abandoned Carts">
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <EmptyState
                heading="No abandoned carts found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  No customers have abandoned their carts in the selected time period.
                  Check back later or adjust the time filter.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

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
        title="Abandoned Carts"
        primaryAction={{
          content: 'Send Reminders',
          disabled: selectedItems.length === 0,
          onAction: handleSendReminders,
          loading: sendReminders.isLoading
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                <Filters>
                  <Filters.Filter
                    label="Time period"
                    filter={
                      <Select
                        options={hourOptions}
                        value={hourFilter}
                        onChange={setHourFilter}
                        labelHidden
                      />
                    }
                  />
                </Filters>
              </Card.Section>
              
              <ResourceList
                resourceName={{ singular: 'cart', plural: 'carts' }}
                items={carts || []}
                loading={isLoading}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                selectable
                renderItem={(cart) => {
                  const total = getCartTotal(cart);
                  const itemCount = cart.cartData?.line_items?.length || 0;
                  
                  return (
                    <ResourceList.Item
                      id={cart.cartId}
                      accessibilityLabel={`Cart for ${cart.customer?.firstName || 'Unknown'} ${cart.customer?.lastName || 'Customer'}`}
                    >
                      <Stack>
                        <Stack.Item fill>
                          <h3>
                            <TextStyle variation="strong">
                              {cart.customer?.firstName || 'Unknown'} {cart.customer?.lastName || 'Customer'}
                            </TextStyle>
                          </h3>
                          <div>
                            {cart.customer?.phone && (
                              <TextStyle variation="subdued">
                                Phone: {cart.customer.phone}
                              </TextStyle>
                            )}
                          </div>
                          <div>
                            <TextStyle variation="subdued">
                              Last updated: {formatDate(cart.updatedAt)}
                            </TextStyle>
                          </div>
                        </Stack.Item>
                        
                        <Stack.Item>
                          <Stack vertical spacing="tight">
                            <Badge status="info">{itemCount} {itemCount === 1 ? 'item' : 'items'}</Badge>
                            <TextStyle variation="strong">{formatCurrency(total)}</TextStyle>
                          </Stack>
                        </Stack.Item>
                        
                        <Stack.Item>
                          <Button
                            size="slim"
                            url={`https://${cart.shopDomain}/admin/customers/${cart.customer?.id}`}
                            external
                          >
                            View Customer
                          </Button>
                        </Stack.Item>
                      </Stack>
                    </ResourceList.Item>
                  );
                }}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
};

export default AbandonedCartsPage;
