const { body, validationResult } = require("express-validator");

const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};

const registerUserValidation = [
  body("username")
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("email").isEmail().withMessage("Invalid email format"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullName.firstName")
    .isString()
    .withMessage("First name must be a string")
    .notEmpty()
    .withMessage("First name is required"),
  body("fullName.lastName")
    .isString()
    .withMessage("Last name must be a string")
    .notEmpty()
    .withMessage("Last name is required"),

  body("role")
    .optional()
    .isIn(["user", "seller"])
    .withMessage("Role must be either 'user' or 'seller'"),

  responseWithValidationErrors,
];

const loginUserValidation = [
  body("username")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Username must be a string"),

  body("email")
    .optional({ values: "falsy" })
    .isEmail()
    .withMessage("Invalid email address"),

  body().custom((value, { req }) => {
    const { username, email } = req.body || {};
    if (!username && !email) {
      throw new Error("Either email or username is required");
    }
    return true;
  }),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  responseWithValidationErrors,
];

const addAddressValidation = [
  body("street").isString().notEmpty().withMessage("Street is required"),
  body("city").isString().notEmpty().withMessage("City is required"),
  body("state").isString().notEmpty().withMessage("State is required"),
  body("country").isString().notEmpty().withMessage("Country is required"),

  body("pincode")
    .isString()
    .matches(/^\d{6}$/)
    .withMessage("Invalid pincode"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),

  responseWithValidationErrors,
];

module.exports = {
  registerUserValidation,
  loginUserValidation,
  addAddressValidation,
};
