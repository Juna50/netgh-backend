const { validationResult } = require('express-validator');
const { BadRequestError } = require('../shared/errors');

/**
 * Run after express-validator rules.
 * Collects all errors and throws a BadRequestError with the first message.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw new BadRequestError(messages[0]);
  }
  next();
};

module.exports = { validate };
