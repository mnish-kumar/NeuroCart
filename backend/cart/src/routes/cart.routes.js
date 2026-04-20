const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validation = require('../middleware/validaion.middleware');

/**
 * @route GET /api/cart
 * @desc Get the current user's cart with item details and totals.
 * @access Private (requires 'user' role)
 */
router.get(
    '/', 
    authMiddleware.createAuthMiddleware(['user']), 
    cartController.getCart
);


/**
* @route POST /api/cart/items
* @desc Add an item to the cart or update quantity if it already exists. Returns the updated cart with recalculated totals.
* @access Private (requires 'user' role)
* @body { productId: string, qty: number }
*/
router.post(
    '/items', 
    validation.validateAddItemToCart, 
    authMiddleware.createAuthMiddleware(['user']), 
    cartController.addItemToCart
);


/**
* @route PATCH /api/cart/items/:productId
* @desc Update quantity of an existing cart item. Returns the updated cart.
* @access Private (requires 'user' role)
* @param {string} productId
* @body { qty: number }
*/
router.patch(
    '/items/:productId',
    validation.validateUpdateCartItemQty,
    authMiddleware.createAuthMiddleware(['user']),
    cartController.updateCartItemQty
);


/**
 * @route DELETE /api/cart/items/:productId
 * @desc Remove an item from the cart. Returns the updated cart.
 * @access Private (requires 'user' role)
 * @param {string} productId
 */
router.delete(
    '/items/:productId',
    authMiddleware.createAuthMiddleware(['user']),
    cartController.removeItemFromCart
);

/**
 * @route DELETE /api/cart
 * @desc Delete the entire cart for the current user. Returns the deleted cart.
 * @access Private (requires 'user' role)
 */
router.delete(
    '/',
    authMiddleware.createAuthMiddleware(['user']),
    cartController.deleteCart
);


router.delete(
    '/clear',
    authMiddleware.createAuthMiddleware(['user']),
    cartController.clearCart
);

module.exports = router;