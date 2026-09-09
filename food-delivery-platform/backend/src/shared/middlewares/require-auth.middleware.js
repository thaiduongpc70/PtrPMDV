import { HttpError } from '../http/http-error.js';

export function requireAuth(req, res, next) {
  if (req.user?.id) {
    next();
    return;
  }

  next(new HttpError(
    401,
    req.authError === 'INVALID_TOKEN'
      ? 'Invalid or expired token'
      : 'Authentication required'
  ));
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, 'Permission denied'));
      return;
    }

    next();
  };
}
