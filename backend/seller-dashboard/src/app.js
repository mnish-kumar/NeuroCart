const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const sellerDashboard_Routes = require('./routes/seller-dashboard.routes');

app.use(express.json());
app.use(cookieParser());

// Basic route to check if the server is running
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Welcome to the Seller Dashboard API' 
    });
});

// Seller Dashboard Routes
app.use('/api/seller/dashboard', sellerDashboard_Routes);

module.exports = app;