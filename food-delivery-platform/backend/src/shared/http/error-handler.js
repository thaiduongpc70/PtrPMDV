import { HttpError } from './http-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalizedError = normalizeError(error);
  const statusCode = normalizedError instanceof HttpError
    ? normalizedError.statusCode
    : 500;

  res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : normalizedError.message
  });
}

function normalizeError(error) {
  if (error?.type === 'entity.parse.failed') {
    return new HttpError(400, 'Request body contains invalid JSON');
  }

  if (error?.type === 'entity.too.large') {
    return new HttpError(413, 'Request body is too large');
  }

  return error;
}
