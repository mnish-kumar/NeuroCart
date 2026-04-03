const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Connected to MongoDB order service successfully✅');
    }catch (error) {
        console.error('Error connecting to MongoDB order service:', error);
    }
}

module.exports = connectDB;