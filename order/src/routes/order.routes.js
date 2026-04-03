const express = require('express');
const router = express.Router();
const orderValidators = require('../validators/order.validator');
const authMiddleware = require('../middleware/auth.middleware');
const orderController = require('../controllers/order.controllers');

router.post(
    '/', 
    authMiddleware.createAuthMiddleware(['user']), 
    orderValidators.orderValidators,
    orderController.createOrder
);

module.exports = router;