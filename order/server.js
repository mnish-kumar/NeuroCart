require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');

// Connect to the database before starting the server
connectDB();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});