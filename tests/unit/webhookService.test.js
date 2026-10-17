const crypto = require('crypto');
const webhookService = require('../../src/services/webhookService');
const config = require('../../src/config');

describe('WebhookService Unit Tests', () => {
  function createSignature(payload) {
    return crypto.createHmac('sha256', config.webhookSecret).update(payload).digest('hex');
  }

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const payload = JSON.stringify({ type: 'payment.succeeded', id: 1 });
      const validSig = createSignature(payload);

      expect(webhookService.verifySignature(payload, validSig)).toBe(true);
    });

    it('should return false for invalid/tampered signature', () => {
      const payload = JSON.stringify({ type: 'payment.succeeded', id: 1 });
      const tamperedSig = 'a'.repeat(64);

      expect(webhookService.verifySignature(payload, tamperedSig)).toBe(false);
    });

    it('should safely return false when signature has different length without crashing', () => {
      const payload = JSON.stringify({ type: 'payment.succeeded', id: 1 });
      const shortSig = 'tooshort';

      expect(webhookService.verifySignature(payload, shortSig)).toBe(false);
    });

    it('should return false when payload or signature is missing/null/non-string', () => {
      expect(webhookService.verifySignature(null, 'sig')).toBe(false);
      expect(webhookService.verifySignature('payload', null)).toBe(false);
      expect(webhookService.verifySignature('payload', 12345)).toBe(false);
    });
  });

  describe('processEvent', () => {
    it('should reject invalid payload structure without type or data', async () => {
      await expect(
        webhookService.processEvent({ foo: 'bar' })
      ).rejects.toThrow('Invalid webhook payload structure');
    });

    it('should handle payment.failed event cleanly', async () => {
      const result = await webhookService.processEvent({
        type: 'payment.failed',
        data: { orderId: 'ord_fail_1', reason: 'Insufficient funds' }
      });

      expect(result.processed).toBe(true);
      expect(result.action).toBe('PAYMENT_FAILURE_LOGGED');
      expect(result.reason).toBe('Insufficient funds');
    });

    it('should gracefully ignore unknown event types', async () => {
      const result = await webhookService.processEvent({
        type: 'customer.created',
        data: { customerId: 'cust_unknown' }
      });

      expect(result.processed).toBe(false);
      expect(result.action).toBe('IGNORED_UNKNOWN_EVENT');
    });
  });
});
