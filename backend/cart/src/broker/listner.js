const { consume } = require("./broker");
const cartModel = require("../models/cart.model");

// Example of consuming messages from a queue
module.exports = function startCartConsumer() {
  try {
    consume("PAYMENT.SUCCESS", async (data) => {
      await cartModel.findOneAndUpdate(
        { user: data.userId },
        { $set: { items: [] } },
      );
    });
  } catch (err) {
    console.error("Error in startCartConsumer:", err);
    process.exit(1); // Exit the process if the consumer fails to start
  }
};
