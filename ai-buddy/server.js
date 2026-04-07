require('dotenv').config();
const app = require('./src/app');
const initSocketServer = require('./src/sockets/socket.server');
const PORT = process.env.PORT || 3005;
const http = require('http');
const httpServer = http.createServer(app);

// Initialize Socket.IO server
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});