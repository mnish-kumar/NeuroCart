const redsi = require("../config/redis");

const orderLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    const key = `order_limit:${userId}`;

    const LIMIT = 5;
    const WINDOW = 60 * 60;

    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      await redis.expire(key, WINDOW);
    }

    if (currentCount > LIMIT) {
      const ttl = await redis.ttl(key);
      return res.status(429).json({
        success: false,
        message: `Order limit exceeded. You can place up to ${LIMIT} orders per hour.`,
        retryAfter: ttl, // seconds until reset
      });
    }

    next();
  } catch (error) {
    console.error("Error in orderLimiter middleware:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = orderLimiter;
