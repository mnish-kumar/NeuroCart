const { query, validationResult } = require("express-validator");

const validateError = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg, // first error message
    });
  }
  next();
};

const getMyOrdersValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Invalid 'page' query parameter. Must be an integer >= 1.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Invalid 'limit' query parameter. Must be an integer between 1 and 100.")
    .toInt(),

    validateError,
];



module.exports = getMyOrdersValidator;