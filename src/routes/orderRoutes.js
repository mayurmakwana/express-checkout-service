const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', (req, res, next) => orderController.create(req, res, next));
router.get('/', (req, res, next) => orderController.list(req, res, next));
router.get('/:id', (req, res, next) => orderController.getById(req, res, next));
router.patch('/:id/status', (req, res, next) => orderController.updateStatus(req, res, next));
router.post('/:id/cancel', (req, res, next) => orderController.cancel(req, res, next));

module.exports = router;
