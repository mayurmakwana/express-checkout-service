const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/', (req, res, next) => webhookController.handle(req, res, next));

module.exports = router;
