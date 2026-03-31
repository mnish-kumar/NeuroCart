const mongoose = require("mongoose");

async function connectToDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to Cart DB successfully✅");
  } catch (error) {
    console.error("Error connecting to Cart DB:", error);
  }
}

module.exports = connectToDb;