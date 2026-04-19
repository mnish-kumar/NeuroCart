require('dotenv').config();
const app = require('./src/app');
const connectToDb = require('./src/db/db');

// Connect to the database before starting the server
connectToDb();

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});