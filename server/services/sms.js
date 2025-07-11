const { CCAI } = require('ccai-node');
const SMSHistory = require('../models/sms-history');

class SMSService {
  /**
   * Create a new SMS service instance
   * @param {string} clientId - CloudContactAI client ID
   * @param {string} apiKey - CloudContactAI API key
   */
  constructor(clientId, apiKey) {
    this.ccai = new CCAI({
      clientId,
      apiKey,
    });
  }

  /**
   * Send an SMS message to a single recipient
   * @param {string} firstName - Recipient's first name
   * @param {string} lastName - Recipient's last name
   * @param {string} phone - Recipient's phone number
   * @param {string} message - Message content
   * @param {string} title - Message title/campaign name
   * @param {string} shop - Shop domain
   * @returns {Promise<Object>} - Result of the SMS send operation
   */
  async sendSingle(firstName, lastName, phone, message, title, shop = null) {
    try {
      // Format phone number if needed (ensure E.164 format)
      const formattedPhone = this.formatPhoneNumber(phone);

      // Send the SMS
      const response = await this.ccai.sms.sendSingle(
        firstName,
        lastName,
        formattedPhone,
        message,
        title
      );

      // Record the SMS in history if shop is provided
      if (shop) {
        await this.recordSMSHistory(shop, {
          recipient: {
            firstName,
            lastName,
            phone: formattedPhone,
          },
          message,
          title,
          messageId: response.id || response.messageId,
          status: response.status || 'sent',
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        messageId: response.id || response.messageId,
        status: response.status || 'sent',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to send SMS:', error);

      // Record the failed SMS in history if shop is provided
      if (shop) {
        await this.recordSMSHistory(shop, {
          recipient: {
            firstName,
            lastName,
            phone,
          },
          message,
          title,
          status: 'failed',
          error: error.message,
          timestamp: new Date(),
        });
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send an abandoned cart reminder SMS
   * @param {Object} customer - Customer information
   * @param {string} cartUrl - URL to recover the cart
   * @param {Object} storeInfo - Store information
   * @param {string} shop - Shop domain
   * @returns {Promise<Object>} - Result of the SMS send operation
   */
  async sendAbandonedCartReminder(customer, cartUrl, storeInfo, shop) {
    const { firstName, lastName, phone } = customer;

    // Format the message with store name and recovery link
    const message = `Hi ${firstName}, you have items waiting in your cart at ${storeInfo.name}. Complete your purchase here: ${cartUrl}`;
    const title = `${storeInfo.name} - Cart Reminder`;

    return this.sendSingle(firstName, lastName, phone, message, title, shop);
  }

  /**
   * Format a phone number to E.164 format
   * @param {string} phone - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If the number doesn't start with +, add the + sign
    if (!phone.startsWith('+')) {
      // If it's a US/Canada number without country code (10 digits)
      if (digits.length === 10) {
        return `+1${digits}`;
      }
      // Otherwise just add the + sign
      return `+${digits}`;
    }

    return phone;
  }

  /**
   * Record an SMS in the history
   * @param {string} shop - Shop domain
   * @param {Object} smsData - SMS data to record
   * @returns {Promise<Object>} - Recorded SMS history entry
   */
  async recordSMSHistory(shop, smsData) {
    try {
      const history = new SMSHistory({
        shopDomain: shop,
        recipient: smsData.recipient,
        message: smsData.message,
        title: smsData.title,
        messageId: smsData.messageId,
        status: smsData.status,
        error: smsData.error,
        timestamp: smsData.timestamp || new Date(),
        type: 'abandoned_cart',
      });

      await history.save();
      return history;
    } catch (error) {
      console.error('Error recording SMS history:', error);
      // Don't throw the error as this is a non-critical operation
      return null;
    }
  }

  /**
   * Get SMS history for a shop
   * @param {string} shop - Shop domain
   * @param {number} page - Page number
   * @param {number} limit - Number of items per page
   * @returns {Promise<Object>} - Paginated SMS history
   */
  static async getSMSHistory(shop, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [history, total] = await Promise.all([
        SMSHistory.find({ shopDomain: shop }).sort({ timestamp: -1 }).skip(skip).limit(limit),
        SMSHistory.countDocuments({ shopDomain: shop }),
      ]);

      return {
        history,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting SMS history:', error);
      throw error;
    }
  }
}

module.exports = SMSService;
