const productModel = require('../models/product.model');
const { uploadImageBuffer } = require('../services/imagekit.service');
const mongoose = require('mongoose');

async function createProduct(req, res) {
  try {
    const { title, description, priceAmount, priceCurrency } = req.body;

    // Route-level validators should handle this, but keep a defensive check.
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'title is required',
      });
    }

    if (priceAmount === undefined || priceAmount === null || priceAmount === '') {
      return res.status(400).json({
        success: false,
        message: 'priceAmount is required',
      });
    }

    const seller = req.user?.id;
    if (!seller) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const amount = Number(priceAmount);
    const price = {
      amount: Number.isFinite(amount) ? amount : undefined,
      currency: priceCurrency || 'INR',
    };

    const imageUrl = await Promise.all(
      (req.files || []).map((file) => uploadImageBuffer({ buffer: file.buffer }))
    );

    const createProduct = await productModel.create({
      title,
      description,
      seller,
      price,
      imageUrl,
    });

    return res.status(201).json({
      success: true,
      product: createProduct,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error creating product:', error);
    }
    
    // Handle ImageKit errors specifically
    if (error.status && error.message) {
      return res.status(error.status || 500).json({ 
        success: false, 
        message: `Image upload failed: ${error.message}` 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
}

async function getProducts(req, res) {
  const { q, minprice, maxprice, skip, limit = 20 } = req.query;

  const filter = {};

  if (q) {
    filter.$text = { $search: q };
  }

  const min = minprice !== undefined ? Number(minprice) : undefined;
  const max = maxprice !== undefined ? Number(maxprice) : undefined;

  if (Number.isFinite(min)) {
    filter['price.amount'] = { ...filter['price.amount'], $gte: min };
  }

  if (Number.isFinite(max)) {
    filter['price.amount'] = { ...filter['price.amount'], $lte: max };
  }

  try {
    const skipValue = Number(skip) || 0;
    const limitValue = Math.min(Number(limit) || 20);

    const products = await productModel
      .find(filter)
      .skip(skipValue)
      .limit(limitValue)
      .exec();

    return res.status(200).json({ 
      success: true, 
      data: products 
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching products:', error);
    }
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }

}

async function getProductById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid product ID',
    });
  }

  try {
    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      product: product,
    });
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error fetching product by ID:', error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
    });
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
};
