const productModel = require("../models/product.model");
const { uploadImageBuffer } = require("../services/imagekit.service");
const mongoose = require("mongoose");
const cacheService = require("../services/cache.service");

async function createProduct(req, res) {
  try {
    const { title, description, priceAmount, priceCurrency } = req.body;

    // Route-level validators should handle this, but keep a defensive check.
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "title is required",
      });
    }

    if (
      priceAmount === undefined ||
      priceAmount === null ||
      priceAmount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "priceAmount is required",
      });
    }

    const seller = req.user?.id;
    if (!seller) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const amount = Number(priceAmount);
    const price = {
      amount: Number.isFinite(amount) ? amount : undefined,
      currency: priceCurrency || "INR",
    };

    const imageUrl = await Promise.all(
      (req.files || []).map((file) =>
        uploadImageBuffer({ buffer: file.buffer }),
      ),
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
    if (process.env.NODE_ENV !== "test") {
      console.error("Error creating product:", error);
    }

    // Handle ImageKit errors specifically
    if (error.status && error.message) {
      return res.status(error.status || 500).json({
        success: false,
        message: `Image upload failed: ${error.message}`,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
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
    filter["price.amount"] = { ...filter["price.amount"], $gte: min };
  }

  if (Number.isFinite(max)) {
    filter["price.amount"] = { ...filter["price.amount"], $lte: max };
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
      data: products,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Error fetching products:", error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}


async function getProductById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product: product,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Error fetching product by ID:", error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}


async function updateProduct(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    const allowedUpdates = ["title", "description", "price"];
    const updateData = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const product = await productModel.findOne({
      _id: id,
      seller: req.user.id, // Ensure the seller owns the product
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not own this product",
      });
    }

    const updatedProduct = await productModel.findOneAndUpdate(
      { _id: id, seller: req.user.id }, // Ensure the seller owns the product
      { $set: updateData },
      { new: true },
    );

    // Invalidate caches related to this product
    await Promise.all([
      cacheService.invalidateProductCache(id),
      cacheService.invalidateProductsListCache()
    ]);

    return res.status(200).json({
      success: true,
      product: updatedProduct,
    });
    
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Error updating product:", error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}


async function deleteProduct(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    const deleteProduct = await productModel.findOneAndDelete({_id: id, seller: req.user.id });

    if (!deleteProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (deleteProduct.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not own this product",
      });
    }

    // Invalidate caches related to this product
    await Promise.all([
      cacheService.invalidateProductCache(id),
      cacheService.invalidateProductsListCache()
    ]);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });

  }catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Error deleting product:", error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}


async function getProductBySeller(req, res) {
  try {

    const seller = req.user;
    const { skip = 0, limit = 20 } = req.query;

    const skipProduct = Number(skip) || 0;
    const limitProduct = Math.min(Number(limit) || 20);

    const products = await productModel.find({ seller: seller.id })
      .skip(skipProduct)
      .limit(limitProduct)
      .exec();

    return res.status(200).json({
      success: true,
      data: products,
    });
  }catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Error fetching products by seller:", error);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}


module.exports = {
  createProduct,
  getProducts,
  getProductBySeller,
  getProductById,
  updateProduct,
  deleteProduct,
};
