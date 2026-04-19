const express = require("express");
const validators = require("../middleware/validator.middleware");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const rateLimiter = require("../middleware/rateLimiter.middleware");

const router = express.Router();

/**
 * @route POST api/auth/register
 * @description Register a new user account (create user document).
 * @access Public
 * @body { username, email, password, fullName: { firstName, lastName } }
 * @notes Keep this in sync with validator + controller requirements.
 */
router.post("/register", rateLimiter.registerRateLimit, validators.registerUserValidation, authController.register);

/**
 * @route POST api/auth/login
 * @description Login user and set JWT cookie.
 * @access Public
 * @body { username || email, password }
 */
router.post("/login", rateLimiter.loginRateLimiter, validators.loginUserValidation, authController.loginUser);

/**
 * @route GET api/auth/me
 * @description Get current authenticated user info (from JWT cookie).
 * @access Private (requires auth middleware to set req.user)
 */
router.get("/me", authMiddleware.authMiddleware, authController.getCurrentUser);

/**
 * @route GET api/auth/logout
 * @description Logout user by clearing JWT cookie.
 * @access Public (can be accessed without authentication, but will still clear cookie if present)
 */
router.get("/logout", authController.logoutUser);


/**
 * @route GET api/auth/users/me/addresses
 * @description Get current authenticated user's addresses.
 * @access Private (requires auth middleware to set req.user)
 */
router.get("/users/me/addresses", authMiddleware.authMiddleware, authController.getUserAddresses);

/**
 * @route POST api/auth/users/me/addresses
 * @description Add a new address to the current authenticated user.
 * @access Private (requires auth middleware to set req.user)
 * @body { street, city, state, country, pincode, isDefault }
 */
router.post("/users/me/addresses", validators.addAddressValidation, authMiddleware.authMiddleware, authController.addUserAddress);


/** * @route DELETE api/auth/users/me/addresses/:addressId
 * @description Delete an address from the current authenticated user.
 * @access Private (requires auth middleware to set req.user)
 */
router.delete("/users/me/addresses/:addressId", authMiddleware.authMiddleware, authController.deleteUserAddress);

module.exports = router;
