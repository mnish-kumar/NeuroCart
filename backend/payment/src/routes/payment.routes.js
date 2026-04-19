const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const paymentController = require('../controllers/payment.controller');
const router = express.Router();

/**
 * @route POST /api/payments/create/:orderId
 * @desc Create a new payment for the specified order
 * @access Private (requires user authentication)
 */
router.post(
    '/create/:orderId', 
    authMiddleware.createAuthMiddleware(['user']),
    paymentController.createPayment
);



/**
 * @route POST /api/payments/verify
 * @desc Verify the status of a payment
 * @access Private (requires user authentication)
 */
router.post(
    '/verify', 
    authMiddleware.createAuthMiddleware(['user']),
    paymentController.verifyPayment
);

module.exports = router;