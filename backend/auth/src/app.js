const express = require("express");
const cookieParser = require("cookie-parser");

const authRoute = require("./routes/auth.route");
const rateLimiter = require("./middleware/rateLimiter.middleware");

const app = express();

// Trust first proxy (if behind a reverse proxy like Nginx or Heroku)
app.set("trust proxy", 1); 

app.use(express.json());
app.use(cookieParser());

// Apply global API rate limiter to all routes
app.use(rateLimiter.globalAPIRateLimiter); 


// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Authentication API",
  })
});

// Authentication routes
app.use("/api/auth", authRoute);

module.exports = app;
