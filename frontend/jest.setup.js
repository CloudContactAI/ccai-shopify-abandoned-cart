// Add any global Jest setup here
import '@testing-library/jest-dom';

// Mock Shopify App Bridge
jest.mock('@shopify/app-bridge-react', () => ({
  useAppBridge: jest.fn(() => ({
    apiKey: 'test-api-key',
    host: 'test-host',
  })),
  Provider: ({ children }) => children,
}));

// Mock Shopify Polaris components if needed
jest.mock('@shopify/polaris', () => {
  const originalModule = jest.requireActual('@shopify/polaris');
  return {
    ...originalModule,
    // Add any specific component mocks here
  };
});
