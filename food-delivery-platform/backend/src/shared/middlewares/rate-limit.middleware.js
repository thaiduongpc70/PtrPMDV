import { HttpError } from '../http/http-error.js';

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
    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      next(new HttpError(429, 'Too many requests'));
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
