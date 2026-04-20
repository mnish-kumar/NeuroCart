require('dotenv').config();
const app = require('./src/app');
const connectToDb = require('./src/db/db');
const { connectRabbitMQ } = require('./src/broker/broker');
const startCartConsumer = require('./src/broker/listner');

// Connect to the database before starting the server
connectToDb();

startCartConsumer()

// Connect to RabbitMQ when the server starts
connectRabbitMQ();

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});