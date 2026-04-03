const express = require('express');
const router = express.Router();
const orderValidators = require('../validators/order.validator');
const getMyOrdersValidator = require('../validators/getMyOrder.validator');
const authMiddleware = require('../middleware/auth.middleware');
const orderController = require('../controllers/order.controllers');

/**
 * @route POST /api/orders
 * @desc Create a new order based on the user's cart
 * @access Private (requires 'user' role)
 */
router.post(
    '/', 
    authMiddleware.createAuthMiddleware(['user']), 
    orderValidators.orderValidators,
    orderController.createOrder
);


/**
 * @route GET /api/orders/
 * @desc Get all orders for the authenticated user
 * @access Private (requires 'user' role)
 */
router.get(
    '/me', 
    authMiddleware.createAuthMiddleware(['user']), 
    getMyOrdersValidator,
    orderController.getMyOrders
);


/**
 * @route GET /api/orders/:id
 * @desc Get details of a specific order by ID (only if it belongs to the authenticated user)
 * @access Private (requires 'user' role or 'admin' role)
 */
router.get(
    '/:id', 
    authMiddleware.createAuthMiddleware(['user', 'admin']), 
    orderController.getOrderById
);


/**
 * @route POST /api/orders/:id/cancel
 * @desc Cancel an order by ID (only if it belongs to the authenticated user and is in a cancellable state)
 * @access Private (requires 'user' role)
 */
router.post(
    '/:id/cancel',
    authMiddleware.createAuthMiddleware(['user']),
    orderController.cancelOrderById
);


/**
 * @route PATCH /api/orders/:id/address
 * @desc Update the shipping address of an order (only if it belongs to the authenticated user and is in a modifiable state)
 * @access Private (requires 'user' role)
 */
router.patch(
    '/:id/address',
    authMiddleware.createAuthMiddleware(['user']),
    orderValidators.updateOrderAddressValidators,
    orderController.updateOrderAddress
);

module.exports = router;