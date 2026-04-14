require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
const { connectRabbitMQ } = require('./src/brokers/broker');

// Connect to the database before starting the server
connectDB();

// Connect to RabbitMQ before starting the server
connectRabbitMQ()


app.listen(3001, () => {
    console.log('Product service is running on port 3001');
});