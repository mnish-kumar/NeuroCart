const orderModel = require("../models/order.model");
const axios = require("axios");
const CART_SERVICE_URL =process.env.CART_SERVICE_URL || "http://localhost:3002";
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "INR";
const CART_SERVICE_TIMEOUT_MS =parseInt(process.env.CART_SERVICE_TIMEOUT_MS) || 5000;

async function createOrder(req, res) {
  const user = req.user;
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  let cartResponseData;
  try {
    const cartResponse = await axios.get(`${CART_SERVICE_URL}/api/cart/`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: CART_SERVICE_TIMEOUT_MS,
    });
    cartResponseData = cartResponse.data?.cart;

  } catch (err) {
    console.error("Error fetching cart data:", err.message);
    return res.status(502).json({
      success: false,
      message: "Failed to fetch cart data. Please try again later.",
    });
  }

  if (
    !cartResponseData ||
    !cartResponseData.items ||
    cartResponseData.items.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Cart is empty. Please add items to cart before placing an order.",
    });
  }


  const products = await Promise.all(cartResponseData.items.map(async (item) => {
    return (await axios.get(`http://localhost:3001/api/products/${item.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: CART_SERVICE_TIMEOUT_MS,
    })).data;
    
  }));

  let priceAmount = 0;
  const productMap = new Map();
  products.forEach(p => {
    productMap.set(p.product._id.toString(), p.product);
  });

  const orderItems = cartResponseData.items.map((item) => {
    const product = productMap.get(item.productId);
       
    if (!product) {
      return res.status(400).json({
        success: false,
        message: `Product with ID ${item.productId} not found.`,
      });
    }
 
    // Stock check
    if (product.stock < item.qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for product ${product.title}. Available: ${product.stock}, Requested: ${item.qty}`,
      });
    }
 
    const unitPrice = product.price?.amount;
    const currency  = product.price?.currency || DEFAULT_CURRENCY;
 
    const itemTotal = unitPrice * item.qty;
    priceAmount += itemTotal;
 
    return {
      product:  item.productId,
      quantity: item.qty,
      price: {
        amount:   itemTotal,
        currency: currency,
      },
    };
  });

  // --- Persist the order ──────────────────────────────────────────────────
  let order;
  try {
    order = await orderModel.create({
      user:            user.id,
      items:           orderItems,
      totalPrice: {
        amount:   priceAmount,
        currency: DEFAULT_CURRENCY,
      },
      shippingAddress: req.body.shippingAddress,
      status:          "PENDING",
      createdAt:       new Date(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to create order. Please try again.",
    });
  }

  return res.status(201).json({
    success: true,
    order: order,
  });

}

module.exports = {
  createOrder,
};
