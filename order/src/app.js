const express = require('express');
const cookieParser = require('cookie-parser');
const orderRoutes = require('./routes/order.routes');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Order API",
  })
});

// Mount order routes at /orders
app.use('/api/orders', orderRoutes);

module.exports = app;