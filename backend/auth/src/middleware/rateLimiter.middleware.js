const redisClient = require("../config/redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");

/**
 * LOGIN per IP: 5 attempts per 15 minutes,
 * LOGIN per USER: 5 attempts per 15 minutes,
 * • 1-hour block after consecutive fails
 */
const loginByIP = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "login_ip",
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
  blockDuration: 60 * 60, // block for 1 hour if consumed
});

const loginByUser = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "login_user",
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
  blockDuration: 60 * 60, // block for 1 hour if consumed
});

const registerByIP = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "register_ip",
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
  blockDuration: 60 * 60, // block for 1 hour if consumed
});

/**
 * GLOBAL API — general abuse prevention
 *  • 100 requests / minute per IP
 */
const globalAPIByIP = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "global_api_ip",
  points: 100, // 100 requests
  duration: 60, // per 1 minute
});

const loginRateLimiter = async (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;
  
  const userKey = (req.body?.email || "unknown_user").toLowerCase().trim();

  try {
    // Consume points for IP
    await loginByIP.consume(ip);

    // Consume points for User
    await loginByUser.consume(userKey);

    next();
  } catch (err) {
    if (err instanceof Error) {
      // unexpected error
      console.error("Rate Limiter Error:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    return res.status(429).json({
      success: false,
      message: "Too many login attempts. Try again later.",
      retryAfter: Math.round(err.msBeforeNext / 1000) || 60,
    });
  }
};

const registerRateLimit = async (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;

  try {
    await registerByIP.consume(ip);

    next();
  } catch (err) {
    if (err instanceof Error) {
      console.error("Rate Limiter Error:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    return res.status(429).json({
      success: false,
      message: "Too many registration attempts. Try again later.",
      retryAfter: Math.round(err.msBeforeNext / 1000) || 60,
    });
  }
};


module.exports = {
  loginRateLimiter,
  registerRateLimit,
};
