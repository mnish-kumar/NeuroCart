const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const sellerDashboard_Routes = require('./routes/seller-dashboard.routes');

app.use(express.json());
app.use(cookieParser());

// Seller Dashboard Routes
app.use('/api/seller/dashboard', sellerDashboard_Routes);

module.exports = app;