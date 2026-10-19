import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

// validate(schema) validates req.body; validate(schema, 'query') validates req.query (stored in req.validatedQuery).
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.') || source,
        message: i.message,
      }));
      return next(new ApiError(400, `Invalid input: ${errors[0].field} – ${errors[0].message}`, errors));
    }
    if (source === 'body') req.body = result.data;
    else req.validatedQuery = result.data;
    next();
  };

export const validateObjectId =
  (...params) =>
  (req, _res, next) => {
    for (const p of params) {
      if (!mongoose.isValidObjectId(req.params[p])) {
        return next(new ApiError(400, `Invalid ${p}`));
      }
    }
    next();
  };
