const { default: mongoose } = require("mongoose");
const orderModel = require("../models/order.model");
const axios = require("axios");
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || "http://localhost:3002";
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "INR";
const CART_SERVICE_TIMEOUT_MS = parseInt(process.env.CART_SERVICE_TIMEOUT_MS) || 5000;
const { publishToQueue } = require("../brokers/broker");


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

  const products = await Promise.all(
    cartResponseData.items.map(async (item) => {
      return (
        await axios.get(
          `http://localhost:3001/api/products/${item.productId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CART_SERVICE_TIMEOUT_MS,
          },
        )
      ).data;
    }),
  );

  let priceAmount = 0;
  const productMap = new Map();
  products.forEach((p) => {
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
    const currency = product.price?.currency || DEFAULT_CURRENCY;

    const itemTotal = unitPrice * item.qty;
    priceAmount += itemTotal;

    return {
      product: item.productId,
      quantity: item.qty,
      price: {
        amount: itemTotal,
        currency: currency,
      },
    };
  });

  // --- Persist the order ──────────────────────────────────────────────────
  let order;
  try {
    order = await orderModel.create({
      user: user.id,
      items: orderItems,
      totalPrice: {
        amount: priceAmount,
        currency: DEFAULT_CURRENCY,
      },
      shippingAddress: req.body.shippingAddress,
      status: "PENDING",
      createdAt: new Date(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to create order. Please try again.",
    });
  }

  // --- Publish order created event to RabbitMQ ─────────────────────────────
  await publishToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", order);

  return res.status(201).json({
    success: true,
    order: order,
  });
}

async function getMyOrders(req, res) {
  const userId = req.user?.id;

  const pageRaw = req.query?.page;
  const limitRaw = req.query?.limit;

  const page = pageRaw === undefined ? 1 : Number(pageRaw);
  const limit = limitRaw === undefined ? 10 : Number(limitRaw);

  try {
    const filter = { user: userId };
    const totalOrders = await orderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit) || 1;

    const orders = await orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        totalOrders,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error fetching orders for user:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders. Please try again.",
    });
  }
}

async function getOrderById(req, res) {
  const userId = req.user?.id;
  const orderId = req.params?.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
  }

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Error fetching order by ID:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order. Please try again.",
    });
  }
}

async function cancelOrderById(req, res) {
  const userId = req.user?.id;
  const orderId = req.params?.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
  }

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: "Access denied.",
      });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled.",
      });
    }

    const cancellableStatuses = ["PENDING", "CONFIRMED"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Only orders in ${cancellableStatuses.join(", ")} status can be cancelled.`,
      });
    }

    order.status = "CANCELLED";
    await order.save();

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Error cancelling order:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order. Please try again.",
    });
  }
}

async function updateOrderAddress(req, res) {
  const userId = req.user?.id;
  const orderId = req.params?.id;
  const newAddress = req.body?.shippingAddress;

  if (!newAddress) {
    return res.status(400).json({
      success: false,
      message: "At least one address field is required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
  }

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or cannot be updated.",
      });
    }

    if (order.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: "Access denied.",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only orders in PENDING status can be updated.",
      });
    }

    order.shippingAddress = newAddress;
    await order.save();

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Error updating order address:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update order. Please try again.",
    });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrderById,
  updateOrderAddress,
};
