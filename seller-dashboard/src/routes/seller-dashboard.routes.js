const express = require('express');
const router = express.Router();
const createAuthMiddleware = require('../middleware/auth.middleware');
const controller = require('../controllers/seller.controller');


/**
 * @route GET /seller/metrics
 * @desc Get seller metrics (total sales, total orders, etc.)
 * @access Private (seller only)
 */
router.get(
    '/metrics', 
    createAuthMiddleware(['seller']),
    controller.getSellerMetrics
);


/**
 * @route GET /seller/orders
 * @desc Get all orders for the seller
 * @access Private (seller only)
 */
router.get(
    '/orders', 
    createAuthMiddleware(['seller']),
    controller.getSellerOrders
);


/**
 * @route GET /seller/products
 * @desc Get all products for the seller
 * @access Private (seller only)
 */
router.get(
    '/products', 
    createAuthMiddleware(['seller']),
    controller.getSellerProducts
);


module.exports = router;