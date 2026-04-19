const { Redis } = require("ioredis");

let redis;

if (process.env.NODE_ENV === "test") {
  console.log("⚠️ Using Mock Redis");

  redis = {
    get: async () => null,
    set: async () => "OK",
    del: async () => 0,
    expire: async () => 1,
    incr: async () => 1,
    quit: async () => undefined,
    disconnect: () => undefined,
    on: () => undefined,
  };
} else {
  const redisUrl = process.env.REDIS_URL;

  const commonOptions = {
    password: process.env.REDIS_PASSWORD,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  };

  if (redisUrl) {
    redis = new Redis(redisUrl, commonOptions);
  } else {
    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT);

    redis = new Redis({
      host,
      port,
      ...commonOptions,
    });
  }

  redis.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  redis.on("connect", () => {
    console.log("Connected to Redis✅");
  });

 
  redis.connect().catch((err) => {
    console.error("Redis initial connect failed", err);
  });
}

module.exports = redis;