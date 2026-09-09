import { HttpError } from './http-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500;

  res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : error.message
  });
}
