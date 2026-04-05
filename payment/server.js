require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
// const PORT = process.env.PORT;

// Connect to the database and start the server
connectDB();


app.listen(3004, () => {
  console.log(`Server is running on port 3004`);
});