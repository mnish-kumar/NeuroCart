const mongoose = require('mongoose');

async function connectDB() {
    try {
        mongoose.connect(process.env.MONGODB_URI)
        console.log("Connected to MongoDB Payment service✅");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }  
}

module.exports = connectDB;