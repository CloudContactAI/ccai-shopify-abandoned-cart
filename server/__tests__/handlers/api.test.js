const request = require('supertest');
const express = require('express');
const apiRoutes = require('../../handlers/api');
const settingsService = require('../../services/settings');
const cartService = require('../../services/cart');
const SMSService = require('../../services/sms');

// Mock the services
jest.mock('../../services/settings', () => ({
  getShopSettings: jest.fn(),
  updateShopSettings: jest.fn(),
}));

jest.mock('../../services/cart', () => ({
  getAbandonedCarts: jest.fn(),
  processShopAbandonedCarts: jest.fn(),
}));

jest.mock('../../services/sms', () => {
  return jest.fn().mockImplementation(() => {
    return {
      sendSingle: jest.fn(),
      getSMSHistory: jest.fn(),
    };
  });
});

// Create a test Express app
const app = express();
app.use(express.json());
app.use('/', apiRoutes);

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /settings', () => {
    it('should return settings for a shop', async () => {
      const mockSettings = {
        shopName: 'Test Shop',
        abandonedCartReminders: {
          enabled: true,
          hourThreshold: 24,
        },
      };

      settingsService.getShopSettings.mockResolvedValueOnce(mockSettings);

      const response = await request(app)
        .get('/settings')
        .query({ shop: 'test-shop.myshopify.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSettings);
      expect(settingsService.getShopSettings).toHaveBeenCalledWith('test-shop.myshopify.com');
    });

    it('should handle errors', async () => {
      settingsService.getShopSettings.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/settings')
        .query({ shop: 'test-shop.myshopify.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /settings', () => {
    it('should update settings for a shop', async () => {
      const updatedSettings = {
        shopName: 'Updated Shop Name',
        abandonedCartReminders: {
          enabled: true,
        },
      };

      settingsService.updateShopSettings.mockResolvedValueOnce(updatedSettings);

      const response = await request(app)
        .post('/settings')
        .query({ shop: 'test-shop.myshopify.com' })
        .send(updatedSettings);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedSettings);
      expect(settingsService.updateShopSettings).toHaveBeenCalledWith(
        'test-shop.myshopify.com',
        updatedSettings
      );
    });
  });

  describe('GET /abandoned-carts', () => {
    it('should return abandoned carts for a shop', async () => {
      const mockCarts = [
        { cartId: '123', customer: { firstName: 'John' } },
        { cartId: '456', customer: { firstName: 'Jane' } },
      ];

      cartService.getAbandonedCarts.mockResolvedValueOnce(mockCarts);

      const response = await request(app)
        .get('/abandoned-carts')
        .query({ shop: 'test-shop.myshopify.com', hours: '24' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCarts);
      expect(cartService.getAbandonedCarts).toHaveBeenCalledWith('test-shop.myshopify.com', 24);
    });
  });

  describe('POST /test-sms', () => {
    it('should send a test SMS', async () => {
      const mockSettings = {
        ccai: {
          clientId: 'test-client-id',
          apiKey: 'test-api-key',
        },
      };

      const mockSMSResponse = {
        success: true,
        messageId: 'test-message-id',
      };

      settingsService.getShopSettings.mockResolvedValueOnce(mockSettings);
      SMSService.prototype.sendSingle.mockResolvedValueOnce(mockSMSResponse);

      const response = await request(app)
        .post('/test-sms')
        .query({ shop: 'test-shop.myshopify.com' })
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+15551234567',
          message: 'Test message',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSMSResponse);
      expect(SMSService).toHaveBeenCalledWith('test-client-id', 'test-api-key');
      expect(SMSService.prototype.sendSingle).toHaveBeenCalledWith(
        'John',
        'Doe',
        '+15551234567',
        'Test message',
        expect.any(String)
      );
    });

    it('should return error if CCAI credentials are missing', async () => {
      const mockSettings = {
        ccai: {
          clientId: '',
          apiKey: '',
        },
      };

      settingsService.getShopSettings.mockResolvedValueOnce(mockSettings);

      const response = await request(app)
        .post('/test-sms')
        .query({ shop: 'test-shop.myshopify.com' })
        .send({
          firstName: 'John',
          lastName: 'Doe',
          phone: '+15551234567',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('credentials');
    });
  });

  describe('POST /trigger-reminders', () => {
    it('should trigger abandoned cart reminders', async () => {
      const mockResult = {
        success: true,
        processed: 2,
        results: [
          { cartId: '123', success: true },
          { cartId: '456', success: true },
        ],
      };

      cartService.processShopAbandonedCarts.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/trigger-reminders')
        .query({ shop: 'test-shop.myshopify.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(cartService.processShopAbandonedCarts).toHaveBeenCalledWith('test-shop.myshopify.com');
    });
  });
});
