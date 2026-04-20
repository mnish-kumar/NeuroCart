const express = require('express');
const cookieParser = require('cookie-parser');
const cartRoutes = require('./routes/cart.routes');


const app = express();

app.use(express.json());
app.use(cookieParser());

// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Cart API",
  })
});

// Mount cart routes at /cart
app.use('/api/cart', cartRoutes);


module.exports = app;
