const express = require('express');
const cookieParser = require('cookie-parser');
const productRoutes = require('./routes/product.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Product API",
  })
});

// Use product routes
app.use('/api/products', productRoutes);

// Error handler (multer + generic)
app.use((err, req, res, next) => {
	if (!err) return next();

	const statusCode = err.name === 'MulterError' ? 400 : 500;
	return res.status(statusCode).json({
		success: false,
		message: err.message || 'Internal Server Error',
	});
});


module.exports = app;