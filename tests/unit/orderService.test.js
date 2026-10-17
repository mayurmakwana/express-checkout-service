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

    it('should maintain exact reconciliation where total equals subtotal - discount + tax + shipping without float rounding discrepancies', () => {
      // Subtotal = 10.05, discountRate = 0.15 (15%), taxRate = 0.0825 (8.25%)
      const items = [
        { id: 'item_edge', name: 'Precision Widget', price: 10.05, quantity: 1 }
      ];
      const totals = orderService.calculateTotals(items, { discountRate: 0.15, taxRate: 0.0825 });

      // In pure floats:
      // discountAmount = 10.05 * 0.15 = 1.5075 -> rounded 1.51
      // taxableAmount = 10.05 - 1.51 = 8.54
      // taxAmount = 8.54 * 0.0825 = 0.70455 -> rounded 0.70
      // shipping = 10.00
      // expected total = 8.54 + 0.70 + 10.00 = 19.24
      const calculatedComponentSum = Number(
        (totals.subtotal - totals.discountAmount + totals.taxAmount + totals.shipping).toFixed(2)
      );

      expect(totals.total).toBe(calculatedComponentSum);
      expect(totals.total).toBe(19.24);
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

    it('should reject creation when discountRate is negative or exceeds 1.0', async () => {
      await expect(
        orderService.createOrder({
          customerId: 'cust_123',
          items: [{ name: 'Item', price: 10, quantity: 1 }],
          discountRate: -0.1
        })
      ).rejects.toThrow('discountRate must be a number between 0 and 1');

      await expect(
        orderService.createOrder({
          customerId: 'cust_123',
          items: [{ name: 'Item', price: 10, quantity: 1 }],
          discountRate: 1.2
        })
      ).rejects.toThrow('discountRate must be a number between 0 and 1');
    });

    it('should reject creation when taxRate is negative', async () => {
      await expect(
        orderService.createOrder({
          customerId: 'cust_123',
          items: [{ name: 'Item', price: 10, quantity: 1 }],
          taxRate: -0.05
        })
      ).rejects.toThrow('taxRate must be a non-negative number');
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

    it('should prevent updating a CANCELLED or REFUNDED order', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });

      await orderService.updateStatus(order.id, 'CANCELLED');

      await expect(
        orderService.updateStatus(order.id, 'PAID')
      ).rejects.toThrow('Cannot update status of an order that is cancelled');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a PENDING order with zero refund', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });

      const cancelled = await orderService.cancelOrder(order.id, { reason: 'User mind change' });
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellation.refundAmount).toBe(0);
      expect(cancelled.cancellation.reason).toBe('User mind change');
      expect(cancelled.cancellation.cancelledAt).toBeDefined();
    });

    it('should refund a PAID order with full total by default', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });
      await orderService.updateStatus(order.id, 'PAID');

      const refunded = await orderService.cancelOrder(order.id, { reason: 'Out of stock' });
      expect(refunded.status).toBe('REFUNDED');
      expect(refunded.cancellation.refundAmount).toBe(order.total);
      expect(refunded.cancellation.reason).toBe('Out of stock');
    });

    it('should allow partial refund amount for PAID order', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 50.0, quantity: 2 }]
      });
      await orderService.updateStatus(order.id, 'PAID');

      const refunded = await orderService.cancelOrder(order.id, { refundAmount: 20.0 });
      expect(refunded.status).toBe('REFUNDED');
      expect(refunded.cancellation.refundAmount).toBe(20.0);
    });

    it('should reject refundAmount greater than order total', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });
      await orderService.updateStatus(order.id, 'PAID');

      await expect(
        orderService.cancelOrder(order.id, { refundAmount: 999.99 })
      ).rejects.toThrow('refundAmount must be a positive number less than or equal to total');
    });

    it('should reject cancelling SHIPPED or DELIVERED orders', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });
      await orderService.updateStatus(order.id, 'SHIPPED');

      await expect(
        orderService.cancelOrder(order.id)
      ).rejects.toThrow('Cannot cancel order in SHIPPED state');
    });

    it('should reject cancelling already cancelled or refunded orders', async () => {
      const order = await orderService.createOrder({
        customerId: 'cust_123',
        items: [{ id: 'p1', name: 'Item', price: 25.0, quantity: 1 }]
      });
      await orderService.cancelOrder(order.id);

      await expect(
        orderService.cancelOrder(order.id)
      ).rejects.toThrow('is already cancelled');
    });
  });
});
