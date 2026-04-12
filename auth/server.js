require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
const { connectRabbitMQ } = require('./src/brokers/broker');

// Connnect to Database
connectDB();

// Connect to RabbitMQ
connectRabbitMQ();

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});