const express = require('express');
const app = express();
const { connect } = require('./broker/broker');
const setupListeners = require('./broker/listner');


// Connect to RabbitMQ
connect().then(() => {
    setupListeners();
}).catch((error) => {
    console.error('Failed to connect to RabbitMQ:', error);
    process.exit(1); // Exit the application if connection fails
});

// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Notification API",
  })
});

module.exports = app;