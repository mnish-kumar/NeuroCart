const express = require('express');
const cookieParser = require('cookie-parser');
const paymentRouter = require('../src/routes/payment.routes');
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/payments', paymentRouter);

module.exports = app;