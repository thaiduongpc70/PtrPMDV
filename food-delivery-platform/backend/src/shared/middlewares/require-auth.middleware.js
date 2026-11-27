import { HttpError } from '../http/http-error.js';
import { M } from '../http/messages.js';

export function requireAuth(req, res, next) {
  if (req.user?.id) {
    next();
    return;
  }

  next(new HttpError(
    401,
    req.authError === 'INVALID_TOKEN'
      ? M.tokenInvalid
      : M.authRequired
  ));
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      next(new HttpError(401, M.authRequired));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, M.permissionDenied));
      return;
    }

    next();
  };
}
