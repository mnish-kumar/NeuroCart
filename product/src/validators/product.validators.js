const { body, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
	const errors = validationResult(req);
	if (errors.isEmpty()) return next();

	return res.status(400).json({
		success: false,
		message: 'Validation failed',
		errors: errors.array().map((e) => ({
			field: e.path,
			message: e.msg,
		})),
	});
}

function validateFiles(req, res, next) {
	if (!req.files || req.files.length === 0) {
		return res.status(400).json({
			success: false,
			message: 'At least one image file is required',
		});
	}
	next();
}

const createProductValidators = [
	body('title')
		.exists({ checkFalsy: true })
		.withMessage('title is required')
		.bail()
		.isString()
		.withMessage('title must be a string')
		.trim(),

	body('description')
		.optional({ nullable: true })
		.isString()
		.withMessage('description must be a string')
		.trim()
        .isLength({ max: 500 })
        .withMessage('description can be at most 500 characters long'),

	body('priceAmount')
		.exists({ checkFalsy: true })
		.withMessage('priceAmount is required')
		.bail()
		.isFloat({ gt: 0 })
		.withMessage('priceAmount must be a number > 0')
		.toFloat(),

	body('priceCurrency')
		.optional({ nullable: true })
		.isIn(['USD', 'INR'])
		.withMessage('priceCurrency must be INR or USD'),
    
    handleValidationErrors,
];

const createProductValidatorsWithFiles = [
	...createProductValidators,
	validateFiles,
];

module.exports = {
	createProductValidators,
	createProductValidatorsWithFiles,
};
