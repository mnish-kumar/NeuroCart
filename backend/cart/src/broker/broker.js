const amqplib = require("amqplib");

let channel = null;
let connection = null;
let connectingPromise = null;
let reconnectTimer = null;

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectRabbitMQ();
    } catch {
      // connectRabbitMQ() already logs + re-schedules
    }
  }, 5000);
}

// Connect server to RabbitMQ
async function connectRabbitMQ() {
  if (channel && connection) return channel;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      if (!process.env.RABBIT_MQ_URL) {
        throw new Error("RABBIT_MQ_URL is not set");
      }

      console.log("Connecting to RabbitMQ...");

      connection = await amqplib.connect(process.env.RABBIT_MQ_URL);

      connection.on("error", (err) => {
        console.error("RabbitMQ connection error:", err.message);
      });

      connection.on("close", () => {
        console.warn("RabbitMQ connection closed! Reconnecting...");
        connection = null;
        channel = null;
        connectingPromise = null;
        scheduleReconnect();
      });

      channel = await connection.createChannel();

      console.log("RabbitMQ connected✅");
      return channel;
    } catch (error) {
      console.error("❌ Failed to connect RabbitMQ:", error.message);
      connection = null;
      channel = null;
      scheduleReconnect();
      return null;
    }
  })()
    .finally(() => {
      // Allow future reconnect attempts after this attempt finishes.
      connectingPromise = null;
    });

  return connectingPromise;
}

// Push data to RabbitMQ queue
async function publishToQueue(queueName, message) {
  if (!channel || !connection) {
    await connectRabbitMQ();
  }

  await channel.assertQueue(queueName, {
    durable: true,
  });
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));

  console.log(`Message sent to queue ${queueName}:`, message);
}

async function consume(queueName, callback) {
    if (!channel || !connection) {
        await connectRabbitMQ();
    }
    
  await channel.assertQueue(queueName, {
    durable: true,
  });

  channel.consume(queueName, (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      callback(data);
      channel.ack(msg);
    }
  });
}


module.exports = {
  connectRabbitMQ,
  publishToQueue,
  consume,
};
