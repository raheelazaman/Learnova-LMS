import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err?.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  } else if (err?.name === 'MulterError') {
    status = 400;
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  }

  if (status >= 500 && !err.isOperational) console.error('💥', err);

  res.status(status).json({
    success: false,
    message: status >= 500 && env.nodeEnv === 'production' ? 'Internal server error' : message,
    ...(errors ? { errors } : {}),
    ...(env.nodeEnv === 'development' && status >= 500 ? { stack: err.stack } : {}),
  });
};
