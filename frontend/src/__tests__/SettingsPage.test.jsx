import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import SettingsPage from '../pages/SettingsPage';

// Create a test QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock the API responses
jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

const { useQuery, useMutation, useQueryClient } = require('react-query');

// Wrap component with necessary providers
const renderWithProviders = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    // Reset mocks
    useQuery.mockReset();
    useMutation.mockReset();
    useQueryClient.mockReset();
    
    // Mock useQueryClient
    useQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });
    
    // Mock useMutation
    useMutation.mockImplementation(() => ({
      mutate: jest.fn(),
      isLoading: false,
    }));
  });

  it('renders loading state', () => {
    // Mock loading state
    useQuery.mockImplementation(() => ({
      isLoading: true,
      data: null,
    }));

    renderWithProviders(<SettingsPage />);
    
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('renders settings form with data', async () => {
    // Mock settings data
    const mockSettings = {
      shopName: 'Test Shop',
      ccai: {
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
      },
      abandonedCartReminders: {
        enabled: true,
        hourThreshold: 24,
        messageTemplate: 'Hi ${firstName}, complete your purchase: ${cartUrl}',
      },
    };
    
    useQuery.mockImplementation(() => ({
      isLoading: false,
      data: mockSettings,
    }));

    renderWithProviders(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Shop Name')).toHaveValue('Test Shop');
      expect(screen.getByLabelText('Client ID')).toHaveValue('test-client-id');
      expect(screen.getByLabelText('API Key')).toHaveValue('test-api-key');
      expect(screen.getByText('Abandoned cart reminders are enabled')).toBeInTheDocument();
    });
  });

  it('renders test SMS form', async () => {
    // Mock settings data
    useQuery.mockImplementation(() => ({
      isLoading: false,
      data: {
        shopName: 'Test Shop',
        ccai: {
          clientId: 'test-client-id',
          apiKey: 'test-api-key',
        },
      },
    }));

    renderWithProviders(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test SMS')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByText('Send Test SMS')).toBeInTheDocument();
    });
  });
});
