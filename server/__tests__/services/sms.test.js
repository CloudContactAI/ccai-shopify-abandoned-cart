const SMSService = require('../../services/sms');
const SMSHistory = require('../../models/sms-history');

// Mock the CCAI module
jest.mock('ccai-node', () => {
  return {
    CCAI: jest.fn().mockImplementation(() => {
      return {
        sms: {
          sendSingle: jest
            .fn()
            .mockImplementation((_firstName, _lastName, _phone, _message, _title) => {
              return Promise.resolve({
                id: 'mock-message-id',
                status: 'sent',
                timestamp: new Date().toISOString(),
              });
            }),
        },
      };
    }),
  };
});

// Mock the SMSHistory model
jest.mock('../../models/sms-history', () => {
  return {
    find: jest.fn(),
    countDocuments: jest.fn(),
    prototype: {
      save: jest.fn(),
    },
  };
});

describe('SMS Service', () => {
  let smsService;

  beforeEach(() => {
    // Create a new SMS service instance for each test
    smsService = new SMSService('test-client-id', 'test-api-key');

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock the save method for SMSHistory
    SMSHistory.prototype.save = jest.fn().mockResolvedValue({
      _id: 'mock-history-id',
      shopDomain: 'test-shop.myshopify.com',
      recipient: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567',
      },
      message: 'Test message',
      title: 'Test Title',
      messageId: 'mock-message-id',
      status: 'sent',
      timestamp: new Date(),
    });
  });

  describe('sendSingle', () => {
    it('should send an SMS message successfully', async () => {
      const result = await smsService.sendSingle(
        'John',
        'Doe',
        '+15551234567',
        'Test message',
        'Test Title',
        'test-shop.myshopify.com'
      );

      expect(result).toEqual({
        success: true,
        messageId: 'mock-message-id',
        status: 'sent',
        timestamp: expect.any(String),
      });
    });

    it('should format phone numbers correctly', async () => {
      await smsService.sendSingle(
        'John',
        'Doe',
        '5551234567', // No + prefix
        'Test message',
        'Test Title'
      );

      expect(smsService.ccai.sms.sendSingle).toHaveBeenCalledWith(
        'John',
        'Doe',
        '+15551234567', // Should add +1 prefix for US/Canada
        'Test message',
        'Test Title'
      );
    });

    it('should record SMS history when shop is provided', async () => {
      await smsService.sendSingle(
        'John',
        'Doe',
        '+15551234567',
        'Test message',
        'Test Title',
        'test-shop.myshopify.com'
      );

      expect(SMSHistory.prototype.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock the CCAI sendSingle method to throw an error
      smsService.ccai.sms.sendSingle.mockRejectedValueOnce(new Error('API Error'));

      const result = await smsService.sendSingle(
        'John',
        'Doe',
        '+15551234567',
        'Test message',
        'Test Title',
        'test-shop.myshopify.com'
      );

      expect(result).toEqual({
        success: false,
        error: 'API Error',
      });
    });
  });

  describe('sendAbandonedCartReminder', () => {
    it('should send an abandoned cart reminder', async () => {
      const customer = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567',
      };

      const cartUrl = 'https://test-shop.myshopify.com/cart/abc123';
      const storeInfo = { name: 'Test Shop' };

      const result = await smsService.sendAbandonedCartReminder(
        customer,
        cartUrl,
        storeInfo,
        'test-shop.myshopify.com'
      );

      expect(result.success).toBe(true);
      expect(smsService.ccai.sms.sendSingle).toHaveBeenCalledWith(
        'John',
        'Doe',
        '+15551234567',
        expect.stringContaining('Test Shop'),
        expect.stringContaining('Test Shop')
      );
    });
  });

  describe('formatPhoneNumber', () => {
    it('should add +1 to 10-digit US/Canada numbers', () => {
      expect(smsService.formatPhoneNumber('5551234567')).toBe('+15551234567');
    });

    it('should keep existing + prefix', () => {
      expect(smsService.formatPhoneNumber('+445551234567')).toBe('+445551234567');
    });

    it('should remove non-digit characters', () => {
      expect(smsService.formatPhoneNumber('(555) 123-4567')).toBe('+15551234567');
    });
  });
});
