const paymentModel = require("../models/payment.model");
const axios = require("axios");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const logger = require("../utils/logger");
const { publishToQueue } = require("../broker/broker");

let razorpayClient;
function getRazorpayClient() {
  if (razorpayClient) return razorpayClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay keys are not configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)",
    );
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  return razorpayClient;
}

async function createPayment(req, res) {
  const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  if (!token) {
    logger.warn("Unauthorized createPayment: no token", {
      route: "createPayment",
      ip: req.ip,
    });
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }

  try {
    let razorpay;
    try {
      razorpay = getRazorpayClient();
    } catch (err) {
      logger.error("Razorpay client not configured", {
        route: "createPayment",
        userId: req.user?.id,
        error: err,
      });
      return res.status(500).json({
        success: false,
        message: "Payment provider is not configured",
      });
    }

    const orderId = req.params.orderId;
    if (!orderId) {
      logger.warn("createPayment missing orderId", {
        route: "createPayment",
        userId: req.user?.id,
      });
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    logger.info("Creating payment for order", {
      route: "createPayment",
      orderId,
      userId: req.user?.id,
    });

    const orderResponse = await axios.get(
      `neurocart-ALB-518956108.ap-south-1.elb.amazonaws.com/api/orders/` + orderId,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const price = orderResponse.data.order.totalPrice;
    const amountInPaise = price.amount; // Convert to paise
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: price.currency,
      receipt: `receipt_${orderId}`,
    });

    const payment = await paymentModel.create({
      order: orderId,
      razorpayOrderId: order.id,
      user: req.user.id,
      price: {
        amount: order.amount,
        currency: order.currency,
      },
    });

    // --- Publish payment initiated event to RabbitMQ ─────────────────────────────
    await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", {
      email: req.user.email,
      orderId: payment.order,
      paymentId: payment._id,
      amount: payment.price.amount,
      currency: payment.price.currency,
      username: req.user.username,
    });

    // --- Publish payment created event to RabbitMQ ─────────────────────────────
    await publishToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", payment);

    return res.status(201).json({
      success: true,
      message: "Payment initialized successfully",
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      payment,
    });
  } catch (err) {
    logger.error("Failed to create payment", {
      route: "createPayment",
      orderId: req.params?.orderId,
      userId: req.user?.id,
      error: err,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to create payment",
    });
  }
}

async function verifyPayment(req, res) {
    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }

  
  if (!process.env.RAZORPAY_KEY_SECRET) {
    logger.error("Razorpay secret not configured", {
      route: "verifyPayment",
      userId: req.user?.id,
    });
    return res.status(500).json({
      success: false,
      message: "Payment provider is not configured",
    });
  }

  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    logger.warn("verifyPayment missing required fields", {
      route: "verifyPayment",
      userId: req.user?.id,
    });
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  // Verify the HMAC payment signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    logger.warn("verifyPayment invalid signature", {
      route: "verifyPayment",
      razorpayOrderId,
      razorpayPaymentId,
      userId: req.user?.id,
    });
    return res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });
  }

  try {
    logger.info("Verifying payment", {
      route: "verifyPayment",
      razorpayOrderId,
      razorpayPaymentId,
      userId: req.user?.id,
    });

    const payment = await paymentModel.findOneAndUpdate(
      { razorpayOrderId, status: "PENDING" },
      {
        $set: {
          razorpayPaymentId: razorpayPaymentId,
          razorpaySignature: razorpaySignature,
          status: "COMPLETED",
        },
      },
      { new: true },
    );

    if (!payment) {
      logger.warn("verifyPayment payment not found", {
        route: "verifyPayment",
        razorpayOrderId,
        userId: req.user?.id,
      });
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // --- Publish payment completed event to RabbitMQ ─────────────────────────────
    await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
      email: req.user.email,
      orderId: payment.order,
      paymentId: payment._id,
      amount: payment.price.amount,
      currency: payment.price.currency,
      username: req.user.username,
    });

    // --- Publish payment verified event to RabbitMQ ─────────────────────────────
    await publishToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATE", payment);

    // --- Publish payment success event to RabbitMQ ─────────────────────────────
    try {
      // publish event
      await publishToQueue("PAYMENT.SUCCESS", {
        userId: payment.user,
        orderId: payment.order,
      });
    } catch (err) {
      console.error("Publish failed, using fallback:", err.message);

        // call cart service API
      try {
        await axios.delete(`neurocart-ALB-518956108.ap-south-1.elb.amazonaws.com/api/cart/clear`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        });

        console.log("Cart cleared via fallback API");
      } catch (apiErr) {
        console.error("Fallback cart clear failed:", apiErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment,
    });
  } catch (err) {
    logger.error("Failed to verify payment", {
      route: "verifyPayment",
      razorpayOrderId,
      razorpayPaymentId,
      userId: req.user?.id,
      error: err,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to verify payment",
    });
  }
}

module.exports = {
  createPayment,
  verifyPayment,
};
