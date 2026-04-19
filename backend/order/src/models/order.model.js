const mongoose = require("mongoose");

const addressesSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  country: String,
  pincode: {
    type: String,
    required: true,
    match: [/^\d{6}$/, "Invalid pincode"], // Indian 6-digit pincode validation
  },
  isDefault: { type: Boolean, default: false },
});

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  price: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ["USD", "INR"],
    },
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    items: [orderItemSchema],

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },
    totalPrice: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        required: true,
        enum: ["USD", "INR"],
      },
    },

    shippingAddress: {
      type: addressesSchema,
      required: true,
    },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;
