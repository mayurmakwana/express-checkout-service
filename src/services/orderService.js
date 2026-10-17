const orderRepository = require('../repositories/orderRepository');
const config = require('../config');

const VALID_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

class OrderService {
  /**
   * Calculate financial breakdown for an order
   */
  calculateTotals(items, options = {}) {
    const discountRate = options.discountRate || 0;
    const taxRate = options.taxRate !== undefined ? options.taxRate : config.taxRateDefault;

    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }

    // Baseline calculation: basic arithmetic
    const discountAmount = subtotal * discountRate;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * taxRate;
    const shipping = subtotal >= 100 || subtotal === 0 ? 0 : 10.0;
    const total = taxableAmount + taxAmount + shipping;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      shipping: Number(shipping.toFixed(2)),
      total: Number(total.toFixed(2))
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

    for (const item of data.items) {
      if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        const error = new Error('Each item must have name, numeric price, and numeric quantity');
        error.statusCode = 400;
        throw error;
      }
      if (item.price <= 0 || item.quantity <= 0) {
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

    // Business rule: Cannot change status of cancelled order
    if (order.status === 'CANCELLED') {
      const error = new Error('Cannot update status of a cancelled order');
      error.statusCode = 409;
      throw error;
    }

    return await orderRepository.update(id, { status: newStatus });
  }
}

module.exports = new OrderService();
