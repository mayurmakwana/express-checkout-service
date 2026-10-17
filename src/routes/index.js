const express = require('express');
const router = express.Router();
const orderRoutes = require('./orderRoutes');
const webhookRoutes = require('./webhookRoutes');

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'express-checkout-service',
    version: '1.0.0'
  });
});

router.use('/orders', orderRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
