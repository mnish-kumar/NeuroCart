const express = require('express');
const cookieParser = require('cookie-parser');
const paymentRouter = require('../src/routes/payment.routes');
const app = express();

app.use(express.json());
app.use(cookieParser());

// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Payment API",
  })
});

// Mount payment routes at /payments
app.use('/api/payments', paymentRouter);

module.exports = app;