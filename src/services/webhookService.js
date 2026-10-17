const crypto = require('crypto');
const config = require('../config');
const orderService = require('./orderService');

class WebhookService {
  /**
   * Verify HMAC signature for incoming webhook
   */
  verifySignature(rawPayload, signature) {
    if (!signature || !rawPayload || typeof signature !== 'string') {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', config.webhookSecret);
      const expectedSignature = hmac.update(rawPayload).digest('hex');

      const sigBuffer = Buffer.from(signature, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      // Prevent length-leak timing attacks by executing constant-time comparison
      if (sigBuffer.length !== expectedBuffer.length) {
        crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Process incoming webhook event
   */
  async processEvent(event) {
    if (!event || !event.type || !event.data) {
      const error = new Error('Invalid webhook payload structure');
      error.statusCode = 400;
      throw error;
    }

    switch (event.type) {
      case 'payment.succeeded': {
        const { orderId, transactionId } = event.data;
        if (!orderId) {
          const error = new Error('Missing orderId in payment event');
          error.statusCode = 400;
          throw error;
        }

        const updated = await orderService.updateStatus(orderId, 'PAID');
        return {
          processed: true,
          action: 'ORDER_MARKED_PAID',
          orderId,
          transactionId
        };
      }

      case 'payment.failed': {
        const { orderId, reason } = event.data;
        return {
          processed: true,
          action: 'PAYMENT_FAILURE_LOGGED',
          orderId,
          reason: reason || 'Unknown error'
        };
      }

      default: {
        return {
          processed: false,
          action: 'IGNORED_UNKNOWN_EVENT',
          eventType: event.type
        };
      }
    }
  }
}

module.exports = new WebhookService();
