const express = require("express");
const cookieParser = require("cookie-parser");

const authRoute = require("./routes/auth.route");

const app = express();

app.use(express.json());
app.use(cookieParser());

// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Authentication API",
  })
});

// Authentication routes
app.use("/api/auth", authRoute);

module.exports = app;
