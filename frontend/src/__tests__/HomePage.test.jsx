import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';

// Create a test QueryClient with retry disabled for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock the API responses for useQuery
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));

const { useQuery } = require('@tanstack/react-query');

// Helper to mock useQuery based on query key
const mockUseQueryForSettings = (settingsData) => {
  useQuery.mockImplementation((key) => {
    if (key === 'settings') {
      return {
        isLoading: false,
        data: settingsData,
      };
    }
    return {
      isLoading: false,
      data: [],
    };
  });
};

// Wrap component with necessary providers for routing and react-query context
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    // Mock loading state of the useQuery hook
    useQuery.mockImplementation(() => ({
      isLoading: true,
      data: null,
    }));

    renderWithProviders(<HomePage />);

    expect(screen.getByText('CloudContactAI Abandoned Cart Reminders')).toBeInTheDocument();
  });

  it('renders configuration required banner when not configured', async () => {
    mockUseQueryForSettings({
      shopName: 'Test Shop',
      ccai: {
        clientId: '',
        apiKey: '',
      },
      abandonedCartReminders: {
        enabled: false,
      },
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Setup Required')).toBeInTheDocument();
      expect(
        screen.getByText(/You need to configure your CloudContactAI credentials/)
      ).toBeInTheDocument();
    });
  });

  it('renders reminders disabled banner when configured but disabled', async () => {
    mockUseQueryForSettings({
      shopName: 'Test Shop',
      ccai: {
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
      },
      abandonedCartReminders: {
        enabled: false,
      },
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Reminders Disabled')).toBeInTheDocument();
      expect(
        screen.getByText(/Abandoned cart reminders are currently disabled/)
      ).toBeInTheDocument();
    });
  });

  it('renders active state when configured and enabled', async () => {
    mockUseQueryForSettings({
      shopName: 'Test Shop',
      ccai: {
        clientId: 'test-client-id',
        apiKey: 'test-api-key',
      },
      abandonedCartReminders: {
        enabled: true,
        hourThreshold: 24,
      },
    });

    useQuery.mockImplementation((key) => {
      if (key === 'settings') {
        return {
          isLoading: false,
          data: {
            shopName: 'Test Shop',
            ccai: {
              clientId: 'test-client-id',
              apiKey: 'test-api-key',
            },
            abandonedCartReminders: {
              enabled: true,
              hourThreshold: 24,
            },
          },
        };
      }
      // Simulate abandoned carts data for other keys
      return {
        isLoading: false,
        data: [{ id: '123' }, { id: '456' }],
      };
    });

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Reminders Active')).toBeInTheDocument();
      expect(screen.getByText(/Your abandoned cart reminders are active/)).toBeInTheDocument();
    });
  });
});
