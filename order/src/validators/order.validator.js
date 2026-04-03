const { body, validationResult } = require('express-validator');

const errorValidator = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const orderValidators = [
    // Shipping Address
    body('shippingAddress.street')
        .notEmpty()
        .withMessage('Street is required')
        .isString()
        .withMessage('Street must be a string'),

    body('shippingAddress.city')
        .notEmpty()
        .withMessage('City is required')
        .isString()
        .withMessage('City must be a string'),

    body('shippingAddress.state')
        .notEmpty()
        .withMessage('State is required')
        .isString()
        .withMessage('State must be a string'),

    body('shippingAddress.country')
        .notEmpty()
        .withMessage('Country is required')
        .isString()
        .withMessage('Country must be a string'),

    body('shippingAddress.pincode')
        .notEmpty()
        .withMessage('Pincode is required')
        .matches(/^\d{6}$/)
        .withMessage('Pincode must be a 6-digit number'),

    errorValidator,
];

const updateOrderAddressValidators = [
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
    body('shippingAddress.street')
        .notEmpty()
        .withMessage('Street is required')
        .isString()
        .withMessage('Street must be a string'),
    body('shippingAddress.city')
        .notEmpty()
        .withMessage('City is required')
        .isString()
        .withMessage('City must be a string'),
    body('shippingAddress.state')
        .notEmpty()
        .withMessage('State is required')
        .isString()
        .withMessage('State must be a string'),

    body('shippingAddress.country')
        .notEmpty()
        .withMessage('Country is required')
        .isString()
        .withMessage('Country must be a string'),
    body('shippingAddress.pincode')
        .notEmpty()
        .withMessage('Pincode is required')
        .matches(/^\d{6}$/)
        .withMessage('Pincode must be a 6-digit number'),

    errorValidator,
]

module.exports = {
    orderValidators,
    updateOrderAddressValidators,
};