import { HttpError } from '../http/http-error.js';
import { M } from '../http/messages.js';

const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 120, key = defaultKey } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = key(req);
    const current = buckets.get(bucketKey);
    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    const limit = typeof max === 'function' ? max(req) : max;
    if (current.count > limit) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      next(new HttpError(429, M.tooManyRequests));
      return;
    }
    next();
  };
}

export function clearRateLimitBuckets() {
  buckets.clear();
}

function defaultKey(req) {
  return `${req.ip}:${req.path}`;
}
