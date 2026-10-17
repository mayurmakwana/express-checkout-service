const webhookService = require('../services/webhookService');

class WebhookController {
  async handle(req, res, next) {
    try {
      const signature = req.headers['x-signature'];
      const rawBody = JSON.stringify(req.body);

      const isValid = webhookService.verifySignature(rawBody, signature);
      if (!isValid) {
        return res.status(401).json({
          error: {
            message: 'Invalid signature',
            statusCode: 401
          }
        });
      }

      const result = await webhookService.processEvent(req.body);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WebhookController();
