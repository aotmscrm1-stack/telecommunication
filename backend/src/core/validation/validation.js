const { z } = require('zod');

/**
 * Express middleware for validating request data against a Zod schema.
 * @param {z.ZodSchema} schema - Zod validation schema
 * @param {'body' | 'query' | 'params'} target - Request property to validate (default: 'body')
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const formattedErrors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }

    // Replace target with parsed & sanitized data
    req[target] = result.data;
    next();
  };
};

module.exports = {
  validate,
  z,
};
