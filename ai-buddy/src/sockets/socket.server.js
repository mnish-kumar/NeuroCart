const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const agent = require('../agent/agent');

async function initSocketServer(server) {
    const io = new Server(server, {
        cors: {
            origin: '*',
        }
    });

    // Middleware to authenticate socket connections
    io.use((socket, next) => {
        const cookies = socket.handshake.headers.cookie;
        const { token } = cookie.parse(cookies || '');

        if (!token) {
            return next(new Error('No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (!decoded) {
                return next(new Error('Authentication error: Invalid token'));
            }

            socket.user = decoded; // Attach user info to the socket object
            socket.token = token; // Attach token to the socket object for later use

            next();
        }catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    })

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('message', async (data) => {
            console.log('Received message from client:', data);
            try {
                const agentResponse = await agent.invoke({
                    messages: [
                        {
                            role: 'user',
                            content: data
                        }
                    ]
                }, {
                    metadata:
                    {
                        token: socket.token // Pass the token to the agent for tool calls
                    }
                });

                console.log('Agent response:', agentResponse);
            } catch (err) {
                console.error('Error handling message:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected.');
        });
    });
}

module.exports = initSocketServer;