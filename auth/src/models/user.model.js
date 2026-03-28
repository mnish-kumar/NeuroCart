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

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select: false,
  },
  fullName: {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  addresses: [addressesSchema],
});

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
