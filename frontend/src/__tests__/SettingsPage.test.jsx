import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../pages/SettingsPage';

// Create a test QueryClient with retry disabled for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock React Query hooks
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

const { useQuery, useMutation, useQueryClient } = require('@tanstack/react-query');

// Helper to mock useQuery hook for settings data
const mockUseQueryForSettings = (settingsData, isLoading = false) => {
  useQuery.mockImplementation(() => ({
    isLoading,
    data: settingsData,
  }));
};

// Helper to mock useMutation hook
const mockUseMutation = (mutateFn = jest.fn(), isLoading = false) => {
  useMutation.mockImplementation(() => ({
    mutate: mutateFn,
    isLoading,
  }));
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useQueryClient
    useQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });

    // Default mutation mock
    mockUseMutation();
  });

  it('renders loading state', () => {
    mockUseQueryForSettings(null, true);

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('renders settings form with data', async () => {
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

    mockUseQueryForSettings(mockSettings);

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Shop Name')).toHaveValue('Test Shop');
      expect(screen.getByLabelText('Client ID')).toHaveValue('test-client-id');
      expect(screen.getByLabelText('API Key')).toHaveValue('test-api-key');
      expect(screen.getByText('Abandoned cart reminders are enabled')).toBeInTheDocument();
    });
  });

  it('renders test SMS form', async () => {
    mockUseQueryForSettings({
      shopName: 'Test Shop',
      ccai: {
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test SMS')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByText('Send Test SMS')).toBeInTheDocument();
    });
  });
});
