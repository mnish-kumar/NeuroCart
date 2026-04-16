const { subscribeToQueue } = require("./broker");
const userModel = require("../models/user.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const paymentModel = require("../models/payment.model");

module.exports = function () {
  subscribeToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", async (user) => {
    try {
      await userModel.create(user)
    } catch (error) {
      console.error("Error creating user:", error);
    }
  });

  subscribeToQueue("PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED", async (product) => {
    try {
      await productModel.create(product);
    } catch (error) {
      console.error("Error updating user's products:", error);
    }
  });

  subscribeToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", async (order) => {
    try {
      await orderModel.create(order);
    } catch (error) {
      console.error("Error updating user's orders:", error);
    }
  });

  subscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", async (payment) => {
    try {
      await paymentModel.create(payment);
    } catch (error) {
      console.error("Error updating user's payments:", error);
    }
  });

  subscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATE", async (payment) => {
    try {
      await paymentModel.findOneAndUpdate({ _id: payment._id }, payment);
    } catch (error) {
      console.error("Error updating user's payments:", error);
    }
  });
};
