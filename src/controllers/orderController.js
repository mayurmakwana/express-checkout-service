const orderService = require('../services/orderService');

class OrderController {
  async create(req, res, next) {
    try {
      const order = await orderService.createOrder(req.body);
      res.status(201).json({
        success: true,
        data: order
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.params.id);
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const { status, customerId } = req.query;
      const orders = await orderService.listOrders({ status, customerId });
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const updated = await orderService.updateStatus(req.params.id, status);
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const { reason, refundAmount } = req.body || {};
      const cancelled = await orderService.cancelOrder(req.params.id, { reason, refundAmount });
      res.status(200).json({
        success: true,
        data: cancelled
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
