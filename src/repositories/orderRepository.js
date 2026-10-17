/**
 * In-memory Order Repository
 * Simulates asynchronous database persistence with deep copy isolation.
 */
class OrderRepository {
  constructor() {
    this.orders = new Map();
  }

  async findById(id) {
    const order = this.orders.get(id);
    if (!order) return null;
    return JSON.parse(JSON.stringify(order));
  }

  async findAll(filter = {}) {
    let results = Array.from(this.orders.values());
    if (filter.status) {
      results = results.filter((o) => o.status === filter.status);
    }
    if (filter.customerId) {
      results = results.filter((o) => o.customerId === filter.customerId);
    }
    return JSON.parse(JSON.stringify(results));
  }

  async create(orderData) {
    const order = {
      id: orderData.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.orders.set(order.id, JSON.parse(JSON.stringify(order)));
    return JSON.parse(JSON.stringify(order));
  }

  async update(id, updates) {
    const existing = this.orders.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.orders.set(id, JSON.parse(JSON.stringify(updated)));
    return JSON.parse(JSON.stringify(updated));
  }

  async clear() {
    this.orders.clear();
  }
}

module.exports = new OrderRepository();
