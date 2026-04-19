require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
const { connectRabbitMQ } = require('./src/brokers/broker');

// Connnect to Database
connectDB();

// Connect to RabbitMQ
connectRabbitMQ();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});