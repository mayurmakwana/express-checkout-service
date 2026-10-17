const request = require('supertest');
const app = require('../../src/app');
const orderRepository = require('../../src/repositories/orderRepository');

describe('Orders API Integration Tests', () => {
  beforeEach(async () => {
    await orderRepository.clear();
  });

  describe('GET /api/health', () => {
    it('should return health status 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('express-checkout-service');
    });
  });

  describe('POST /api/orders', () => {
    it('should create order and return 201 with calculation', async () => {
      const payload = {
        customerId: 'cust_abc123',
        items: [
          { name: 'Mechanical Keyboard', price: 79.99, quantity: 1 },
          { name: 'Mouse Pad', price: 15.0, quantity: 2 }
        ]
      };

      const res = await request(app)
        .post('/api/orders')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toMatch(/^ord_/);
      expect(res.body.data.subtotal).toBe(109.99);
      expect(res.body.data.shipping).toBe(0.0); // >= 100
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should return 400 for invalid request body', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ customerId: 'cust_only' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details by ID', async () => {
      const created = await request(app)
        .post('/api/orders')
        .send({
          customerId: 'cust_xyz',
          items: [{ name: 'Monitor', price: 250.0, quantity: 1 }]
        });

      const orderId = created.body.data.id;
      const res = await request(app).get(`/api/orders/${orderId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderId);
      expect(res.body.data.customerId).toBe('cust_xyz');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).get('/api/orders/ord_nonexistent_999');
      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('not found');
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should update status and return 200', async () => {
      const created = await request(app)
        .post('/api/orders')
        .send({
          customerId: 'cust_update',
          items: [{ name: 'Cable', price: 10.0, quantity: 1 }]
        });

      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: 'SHIPPED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SHIPPED');
    });
  });
});
