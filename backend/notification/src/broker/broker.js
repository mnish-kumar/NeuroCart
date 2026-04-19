const amqplib = require('amqplib');

let channel, connection;

// Connect server to RabbitMQ
async function connect() {
    if (connection) return connection;

    try {
        connection = await amqplib.connect(process.env.RABBIT_MQ_URL);
        channel = await connection.createChannel();
        console.log('Connected to RabbitMQ');
        return connection;
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        throw error;
    }
}


// Push data to RabbitMQ queue
async function publishToQueue(queueName, message) {
    if (!channel || !connection) {
        await connect();
    }

    await channel.assertQueue(queueName, { 
        durable: true 
    });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));

    console.log(`Message sent to queue ${queueName}:`, message);

}

// Subscribe to RabbitMQ queue(consume messages)
async function subscribeToQueue(queueName, callback) {
    if (!channel || !connection) {
        await connect();
    }

    await channel.assertQueue(queueName, { 
        durable: true 
    });

    channel.consume(queueName, async (msg) => {
        if (msg !== null) {
            const messageContent = JSON.parse(msg.content.toString());
            await callback(messageContent);
            channel.ack(msg);
        }
    });
}


module.exports = { 
    connect,
    publishToQueue,
    subscribeToQueue,
    channel,
    connection
};