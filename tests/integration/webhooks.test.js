const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const config = require('../../src/config');
const orderRepository = require('../../src/repositories/orderRepository');

describe('Webhook API Integration Tests', () => {
  beforeEach(async () => {
    await orderRepository.clear();
  });

  function generateSignature(payload) {
    const raw = JSON.stringify(payload);
    return crypto.createHmac('sha256', config.webhookSecret).update(raw).digest('hex');
  }

  describe('POST /api/webhooks', () => {
    it('should reject webhook without signature with 401', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({ type: 'payment.succeeded', data: { orderId: 'ord_123' } });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid signature');
    });

    it('should reject webhook with tampered/invalid signature with 401', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('x-signature', 'invalidsignaturehex123456789')
        .send({ type: 'payment.succeeded', data: { orderId: 'ord_123' } });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid signature');
    });

    it('should process payment.succeeded event and update order to PAID', async () => {
      // First create an order
      const createRes = await request(app)
        .post('/api/orders')
        .send({
          customerId: 'cust_pay',
          items: [{ name: 'Test Product', price: 50.0, quantity: 1 }]
        });

      const orderId = createRes.body.data.id;

      const payload = {
        type: 'payment.succeeded',
        data: {
          orderId,
          transactionId: 'txn_987654321'
        }
      };

      const signature = generateSignature(payload);

      const res = await request(app)
        .post('/api/webhooks')
        .set('x-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('30');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe('ORDER_MARKED_PAID');

      // Verify order status updated in repo
      const checkRes = await request(app).get(`/api/orders/${orderId}`);
      expect(checkRes.body.data.status).toBe('PAID');
    });
  });
});
