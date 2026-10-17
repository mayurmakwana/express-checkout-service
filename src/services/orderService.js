const orderRepository = require('../repositories/orderRepository');
const config = require('../config');

const VALID_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

class OrderService {
  /**
   * Calculate financial breakdown for an order
   */
  calculateTotals(items, options = {}) {
    const discountRate = options.discountRate || 0;
    const taxRate = options.taxRate !== undefined ? options.taxRate : config.taxRateDefault;

    // Use cent-based integer calculations to eliminate IEEE-754 floating-point drift
    let subtotalCents = 0;
    for (const item of items) {
      const itemPriceCents = Math.round(item.price * 100);
      subtotalCents += itemPriceCents * item.quantity;
    }

    const discountCents = Math.round(subtotalCents * discountRate);
    const taxableCents = Math.max(0, subtotalCents - discountCents);
    const taxCents = Math.round(taxableCents * taxRate);
    const shippingCents = subtotalCents >= 10000 || subtotalCents === 0 ? 0 : 1000;
    const totalCents = taxableCents + taxCents + shippingCents;

    return {
      subtotal: subtotalCents / 100,
      discountAmount: discountCents / 100,
      taxAmount: taxCents / 100,
      shipping: shippingCents / 100,
      total: totalCents / 100
    };
  }

  /**
   * Create a new order
   */
  async createOrder(data) {
    if (!data.customerId || typeof data.customerId !== 'string') {
      const error = new Error('customerId is required and must be a string');
      error.statusCode = 400;
      throw error;
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      const error = new Error('Order must contain at least one item');
      error.statusCode = 400;
      throw error;
    }

    if (data.discountRate !== undefined) {
      if (typeof data.discountRate !== 'number' || Number.isNaN(data.discountRate) || data.discountRate < 0 || data.discountRate > 1) {
        const error = new Error('discountRate must be a number between 0 and 1');
        error.statusCode = 400;
        throw error;
      }
    }

    if (data.taxRate !== undefined) {
      if (typeof data.taxRate !== 'number' || Number.isNaN(data.taxRate) || data.taxRate < 0) {
        const error = new Error('taxRate must be a non-negative number');
        error.statusCode = 400;
        throw error;
      }
    }

    for (const item of data.items) {
      if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        const error = new Error('Each item must have name, numeric price, and numeric quantity');
        error.statusCode = 400;
        throw error;
      }
      if (item.price <= 0 || item.quantity <= 0 || !Number.isFinite(item.price) || !Number.isFinite(item.quantity)) {
        const error = new Error('Item price and quantity must be greater than zero');
        error.statusCode = 400;
        throw error;
      }
    }

    const totals = this.calculateTotals(data.items, {
      discountRate: data.discountRate,
      taxRate: data.taxRate
    });

    const orderData = {
      customerId: data.customerId,
      items: data.items,
      currency: data.currency || config.defaultCurrency,
      discountRate: data.discountRate || 0,
      taxRate: data.taxRate !== undefined ? data.taxRate : config.taxRateDefault,
      ...totals,
      status: 'PENDING',
      paymentDetails: null
    };

    return await orderRepository.create(orderData);
  }

  /**
   * Retrieve order by ID
   */
  async getOrderById(id) {
    const order = await orderRepository.findById(id);
    if (!order) {
      const error = new Error(`Order with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    return order;
  }

  /**
   * List all orders with optional filter
   */
  async listOrders(filter) {
    return await orderRepository.findAll(filter);
  }

  /**
   * Transition order status
   */
  async updateStatus(id, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      const error = new Error(`Invalid status: ${newStatus}. Allowed: ${VALID_STATUSES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const order = await this.getOrderById(id);

    // Business rule: Cannot change status of cancelled or refunded order
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      const error = new Error(`Cannot update status of an order that is ${order.status.toLowerCase()}`);
      error.statusCode = 409;
      throw error;
    }

    return await orderRepository.update(id, { status: newStatus });
  }

  /**
   * Cancel and optionally refund an order
   */
  async cancelOrder(id, options = {}) {
    const order = await this.getOrderById(id);

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      const error = new Error(`Order ${id} is already ${order.status.toLowerCase()}`);
      error.statusCode = 409;
      throw error;
    }

    if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
      const error = new Error(`Cannot cancel order in ${order.status} state. Returns must be initiated instead.`);
      error.statusCode = 409;
      throw error;
    }

    let refundAmount = 0;
    let targetStatus = 'CANCELLED';

    if (['PAID', 'PROCESSING'].includes(order.status)) {
      targetStatus = 'REFUNDED';
      if (options.refundAmount !== undefined) {
        if (
          typeof options.refundAmount !== 'number' ||
          !Number.isFinite(options.refundAmount) ||
          options.refundAmount <= 0 ||
          options.refundAmount > order.total
        ) {
          const error = new Error(`refundAmount must be a positive number less than or equal to total (${order.total})`);
          error.statusCode = 400;
          throw error;
        }
        refundAmount = options.refundAmount;
      } else {
        refundAmount = order.total;
      }
    }

    const cancellation = {
      reason: options.reason || 'Customer requested cancellation',
      refundAmount: Math.round(refundAmount * 100) / 100,
      cancelledAt: new Date().toISOString()
    };

    return await orderRepository.update(id, {
      status: targetStatus,
      cancellation
    });
  }
}

module.exports = new OrderService();
