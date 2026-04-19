require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
const { connectRabbitMQ } = require('./src/brokers/broker');

// Connect to the database before starting the server
connectDB();

// Connect to RabbitMQbefore starting the server
connectRabbitMQ();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});