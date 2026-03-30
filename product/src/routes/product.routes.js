const express = require('express');
const productController = require('../controllers/product.controller');
const uploads = require('../middlewares/upload.middleware');
const { createAuthMiddleware } = require('../middlewares/auth.middleware');
const productValidators = require('../validators/product.validators');

const router = express.Router();

/**
 * @route POST /api/products/
 * @desc Create a new product
 * @access Private (Only authenticated sellers can create products)
 */
router.post('/',
    createAuthMiddleware(['admin','seller']), 
    uploads.array('images', 5), // Handle multiple image uploads (up to 5)
    productValidators.createProductValidators,
    productController.createProduct
);


/**
 * @route GET /api/products/
 * @desc List products with optional search/filters
 * @access Public
 */
router.get('/', productController.getProducts);


/**
 * @route GET /api/products/:id
 * @desc Get product details by ID
 * @access Public
 */
router.get('/:id', productController.getProductById);

module.exports = router;