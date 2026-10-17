const orderService = require('../../src/services/orderService');
const orderRepository = require('../../src/repositories/orderRepository');

describe('OrderService Unit Tests', () => {
  beforeEach(async () => {
    await orderRepository.clear();
  });

  describe('calculateTotals', () => {
    it('should correctly calculate subtotal, default tax, and shipping for orders under threshold', () => {
      const items = [
        { id: 'item_1', name: 'Book', price: 20.0, quantity: 2 }
      ];
      // Subtotal = 40, Tax = 40 * 0.08 = 3.20, Shipping = 10, Total = 53.20
      const totals = orderService.calculateTotals(items);

      expect(totals.subtotal).toBe(40.0);
      expect(totals.discountAmount).toBe(0.0);
      expect(totals.taxAmount).toBe(3.2);
      expect(totals.shipping).toBe(10.0);
      expect(totals.total).toBe(53.2);
    });

    it('should grant free shipping for orders of 100 or more', () => {
      const items = [
        { id: 'item_2', name: 'Keyboard', price: 100.0, quantity: 1 }
      ];
      const totals = orderService.calculateTotals(items);

      expect(totals.subtotal).toBe(100.0);
      expect(totals.shipping).toBe(0.0);
      expect(totals.total).toBe(108.0); // 100 + 8% tax
    });

    it('should apply discount rate properly', () => {
      const items = [
        { id: 'item_3', name: 'Headphones', price: 100.0, quantity: 1 }
      ];
      const totals = orderService.calculateTotals(items, { discountRate: 0.1 });

      expect(totals.subtotal).toBe(100.0);
      expect(totals.discountAmount).toBe(10.0);
      expect(totals.taxAmount).toBe(7.2); // (100 - 10) * 0.08 = 7.20
      expect(totals.total).toBe(97.2); // 90 + 7.20 + 0 shipping
    });
  });

  describe('createOrder', () => {
    it('should create an order with PENDING status', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Pen', price: 5.0, quantity: 3 }]
      });

      expect(order).toBeDefined();
      expect(order.id).toMatch(/^ord_/);
      expect(order.status).toBe('PENDING');
      expect(order.customerId).toBe('cust_123');
      expect(order.subtotal).toBe(15.0);
    });

    it('should reject creation when customerId is missing', async () => {
      await expect(
        orderService.createOrder({
          items: [{ id: 'p1', name: 'Pen', price: 5.0, quantity: 1 }]
        })
      ).rejects.toThrow('customerId is required');
    });

    it('should reject creation when items array is empty', async () => {
      await expect(
        orderService.createOrder({
          customerId: 'cust_123',
          items: []
        })
      ).rejects.toThrow('Order must contain at least one item');
    });

    it('should reject creation with invalid item price', async () => {
      await expect(
        orderService.createOrder({
          customerId: 'cust_123',
          items: [{ name: 'Invalid', price: -10, quantity: 1 }]
        })
      ).rejects.toThrow('Item price and quantity must be greater than zero');
    });
  });

  describe('updateStatus', () => {
    it('should update valid status', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });

      const updated = await orderService.updateStatus(order.id, 'PROCESSING');
      expect(updated.status).toBe('PROCESSING');
    });

    it('should prevent updating a CANCELLED order', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });

      await orderService.updateStatus(order.id, 'CANCELLED');

      await expect(
        orderService.updateStatus(order.id, 'PAID')
      ).rejects.toThrow('Cannot update status of a cancelled order');
    });
  });
});
