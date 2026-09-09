import { readBearerToken, verifyAccessToken } from '../security/token.js';

export function authContextMiddleware(req, res, next) {
  const token = readBearerToken(req);

  if (!token) {
    next();
    return;
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    req.authError = 'INVALID_TOKEN';
    next();
    return;
  }

  req.user = {
    id: Number(payload.sub),
    username: payload.username,
    role: payload.role
  };

  next();
}
