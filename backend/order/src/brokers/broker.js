const amqplib = require('amqplib');

let channel, connection;

// Connect server to RabbitMQ
async function connectRabbitMQ() {
    try {
        console.log("Connecting to RabbitMQ...");

        connection = await amqplib.connect(process.env.RABBIT_MQ_URL);

        connection.on("error", (err) => {
            console.error("RabbitMQ connection error:", err.message);
        });

        connection.on("close", () => {
            console.warn("RabbitMQ connection closed! Reconnecting...");
            connection = null;
            channel = null;
            setTimeout(connectRabbitMQ, 5000); // retry after 5 sec
        });

        channel = await connection.createChannel();

        console.log("RabbitMQ connected✅");

        return channel;

    } catch (error) {
        console.error("❌ Failed to connect RabbitMQ:", error.message);
        setTimeout(connectRabbitMQ, 5000); // retry
    }
};


// Push data to RabbitMQ queue
async function publishToQueue(queueName, message) {
    if (!channel || !connection) {
        await connectRabbitMQ();
    }

    await channel.assertQueue(queueName, { 
        durable: true 
    });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)),
        { persistent: true }
    );

}

// Subscribe to RabbitMQ queue(consume messages)
async function subscribeToQueue(queueName, callback) {
    if (!channel || !connection) {
        await connectRabbitMQ();
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
    connectRabbitMQ,
    publishToQueue,
    subscribeToQueue,
    channel,
    connection
};