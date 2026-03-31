const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');


function validateErrorCartItem(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

const validateAddItemToCart = [
    body('productId')
        .exists().withMessage('productId is required')
        .isString().withMessage('productId must be a string')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid productId format'),
    body('qty')
        .exists()
        .withMessage('qty is required')
        .isInt({ gt: 0 })
        .withMessage('qty must be an integer greater than 0'),

    validateErrorCartItem,
]

const validateUpdateCartItemQty = [
    param('productId')
        .exists().withMessage('productId is required')
        .isString().withMessage('productId must be a string')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid productId format'),
    body('qty')
        .exists()
        .withMessage('qty is required')
        .isInt({ gt: 0 })
        .withMessage('qty must be an integer greater than 0'),
    validateErrorCartItem,
];

module.exports = {
    validateAddItemToCart,
    validateUpdateCartItemQty,
}