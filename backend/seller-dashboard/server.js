require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
const { connectRabbitMQ } = require('./src/broker/broker');
const listener = require('./src/broker/listner');

// Connect to MongoDB
connectDB();

// Start RabbitMQ consumer
connectRabbitMQ().then(() => {
  listener();
}).catch((err) => {
  console.error("Failed to start RabbitMQ listener:", err);
});

app.listen(3007, () => {
  console.log('Seller server is running on port 3007');
});