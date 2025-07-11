const cartService = require('../../services/cart');
const Cart = require('../../models/cart');
const settingsService = require('../../services/settings');
const SMSService = require('../../services/sms');

// Mock the Cart model
jest.mock('../../models/cart', () => {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    prototype: {
      save: jest.fn(),
    },
  };
});

// Mock the settings service
jest.mock('../../services/settings', () => {
  return {
    getShopSettings: jest.fn(),
  };
});

// Mock the SMS service
jest.mock('../../services/sms', () => {
  return jest.fn().mockImplementation(() => {
    return {
      sendSingle: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock-message-id',
      }),
    };
  });
});

describe('Cart Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock the save method for Cart
    Cart.prototype.save = jest.fn().mockResolvedValue({
      _id: 'mock-cart-id',
      shopDomain: 'test-shop.myshopify.com',
      cartId: '123456',
      cartToken: 'abc123',
      createdAt: new Date(),
      updatedAt: new Date(),
      isAbandoned: false,
      reminderSent: false,
      converted: false,
    });
  });

  describe('storeCart', () => {
    it('should create a new cart if it does not exist', async () => {
      // Mock findOne to return null (cart not found)
      Cart.findOne.mockResolvedValueOnce(null);

      const cartData = {
        id: '123456',
        token: 'abc123',
        customer: {
          id: 'cust123',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+15551234567',
        },
      };

      await cartService.storeCart('test-shop.myshopify.com', cartData);

      expect(Cart.prototype.save).toHaveBeenCalled();
    });

    it('should update an existing cart', async () => {
      // Mock findOne to return an existing cart
      const existingCart = {
        shopDomain: 'test-shop.myshopify.com',
        cartId: '123456',
        cartToken: 'abc123',
        updatedAt: new Date(),
        cartData: {},
        save: jest.fn().mockResolvedValue({}),
      };

      Cart.findOne.mockResolvedValueOnce(existingCart);

      const cartData = {
        id: '123456',
        token: 'abc123',
        customer: {
          id: 'cust123',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+15551234567',
        },
      };

      await cartService.storeCart('test-shop.myshopify.com', cartData);

      expect(existingCart.save).toHaveBeenCalled();
      expect(existingCart.cartData).toEqual(cartData);
    });
  });

  describe('getAbandonedCarts', () => {
    it('should find abandoned carts', async () => {
      const mockCarts = [
        {
          cartId: '123456',
          customer: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+15551234567',
          },
        },
      ];

      Cart.find.mockResolvedValueOnce(mockCarts);

      const result = await cartService.getAbandonedCarts('test-shop.myshopify.com', 24);

      expect(result).toEqual(mockCarts);
      expect(Cart.find).toHaveBeenCalledWith({
        shopDomain: 'test-shop.myshopify.com',
        updatedAt: { $lt: expect.any(Date) },
        converted: false,
        reminderSent: false,
        'customer.phone': { $exists: true, $ne: null },
      });
    });
  });

  describe('processShopAbandonedCarts', () => {
    it('should skip processing if reminders are disabled', async () => {
      // Mock settings with reminders disabled
      settingsService.getShopSettings.mockResolvedValueOnce({
        abandonedCartReminders: {
          enabled: false,
        },
      });

      const result = await cartService.processShopAbandonedCarts('test-shop.myshopify.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('disabled');
      expect(Cart.find).not.toHaveBeenCalled();
    });

    it('should skip processing if CCAI credentials are missing', async () => {
      // Mock settings with reminders enabled but no CCAI credentials
      settingsService.getShopSettings.mockResolvedValueOnce({
        abandonedCartReminders: {
          enabled: true,
        },
        ccai: {
          clientId: '',
          apiKey: '',
        },
      });

      const result = await cartService.processShopAbandonedCarts('test-shop.myshopify.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
      expect(Cart.find).not.toHaveBeenCalled();
    });

    it('should process abandoned carts and send reminders', async () => {
      // Mock settings with reminders enabled and CCAI credentials
      settingsService.getShopSettings.mockResolvedValueOnce({
        abandonedCartReminders: {
          enabled: true,
          hourThreshold: 24,
          messageTemplate: 'Hi ${firstName}, complete your purchase: ${cartUrl}',
        },
        ccai: {
          clientId: 'test-client-id',
          apiKey: 'test-api-key',
        },
        shopName: 'Test Shop',
      });

      // Mock abandoned carts
      const mockCarts = [
        {
          cartId: '123456',
          cartToken: 'abc123',
          customer: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+15551234567',
          },
        },
      ];

      Cart.find.mockResolvedValueOnce(mockCarts);

      // Mock recordReminderSent
      Cart.findOne.mockResolvedValue({
        reminderSent: false,
        reminderSentAt: null,
        save: jest.fn().mockResolvedValue({}),
      });

      const result = await cartService.processShopAbandonedCarts('test-shop.myshopify.com');

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(SMSService).toHaveBeenCalledWith('test-client-id', 'test-api-key');
    });
  });
});
