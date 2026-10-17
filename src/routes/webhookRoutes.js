const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Rate limit webhooks to 30 requests per minute to thwart volumetric DoS
const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many webhook requests from this IP'
});

router.post('/', webhookLimiter, (req, res, next) => webhookController.handle(req, res, next));

module.exports = router;
