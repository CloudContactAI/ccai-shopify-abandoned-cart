import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';

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
}));

const { useQuery } = require('react-query');

// Wrap component with necessary providers
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    // Reset mocks
    useQuery.mockReset();
  });

  it('renders loading state', () => {
    // Mock loading state
    useQuery.mockImplementation(() => ({
      isLoading: true,
      data: null,
    }));

    renderWithProviders(<HomePage />);
    
    expect(screen.getByText('CloudContactAI Abandoned Cart Reminders')).toBeInTheDocument();
  });

  it('renders configuration required banner when not configured', async () => {
    // Mock settings with no CCAI credentials
    useQuery.mockImplementation((key) => {
      if (key === 'settings') {
        return {
          isLoading: false,
          data: {
            shopName: 'Test Shop',
            ccai: {
              clientId: '',
              apiKey: '',
            },
            abandonedCartReminders: {
              enabled: false,
            },
          },
        };
      }
      return {
        isLoading: false,
        data: [],
      };
    });

    renderWithProviders(<HomePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Setup Required')).toBeInTheDocument();
      expect(screen.getByText(/You need to configure your CloudContactAI credentials/)).toBeInTheDocument();
    });
  });

  it('renders reminders disabled banner when configured but disabled', async () => {
    // Mock settings with CCAI credentials but reminders disabled
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
              enabled: false,
            },
          },
        };
      }
      return {
        isLoading: false,
        data: [],
      };
    });

    renderWithProviders(<HomePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Reminders Disabled')).toBeInTheDocument();
      expect(screen.getByText(/Abandoned cart reminders are currently disabled/)).toBeInTheDocument();
    });
  });

  it('renders active state when configured and enabled', async () => {
    // Mock settings with CCAI credentials and reminders enabled
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
