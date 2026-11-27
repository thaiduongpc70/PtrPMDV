import { HttpError } from './http-error.js';
import { logger } from '../observability/logger.js';
import { M } from './messages.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalizedError = normalizeError(error);
  const statusCode = normalizedError instanceof HttpError
    ? normalizedError.statusCode
    : 500;

  if (statusCode === 500) {
    logger.error('http.unhandled_error', { method: req.method, path: req.originalUrl, errorMessage: error?.message, code: error?.code, stack: error?.stack });
  }

  res.status(statusCode).json({
    message: statusCode === 500 ? M.internalError : normalizedError.message
  });
}

function normalizeError(error) {
  if (error?.type === 'entity.parse.failed') {
    return new HttpError(400, M.bodyJsonInvalid);
  }

  if (error?.type === 'entity.too.large') {
    return new HttpError(413, M.bodyTooLarge);
  }

  return error;
}
