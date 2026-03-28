const { Redis } = require("ioredis");

// Never connect to a real Redis instance during tests.
// Jest sets NODE_ENV=test in src/test/jest.setup.js.
if (process.env.NODE_ENV === "test") {
  module.exports = {
    get: async () => null,
    set: async () => "OK",
    del: async () => 0,
    expire: async () => 1,
    quit: async () => undefined,
    disconnect: () => undefined,
    on: () => undefined,
  };
} else {
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  });

  redis.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  redis.on("connect", () => {
    console.log("Connected to Redis");
  });

  module.exports = redis;
}