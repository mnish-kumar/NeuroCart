const jwt = require("jsonwebtoken");

function createAuthMiddleware(roles = []) {
  return async function authMiddleware(req, res, next) {
    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userRole = decoded?.role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Insufficient permissions",
        });
      }

      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
  };
}

module.exports = {
  createAuthMiddleware,
};
