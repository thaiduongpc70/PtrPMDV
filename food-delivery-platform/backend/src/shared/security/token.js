import { createHash, createHmac, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const algorithm = 'HS256';

export function createAccessToken(payload) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + env.auth.accessTokenTtlSeconds;

  return signJwt({
    ...payload,
    iat: issuedAt,
    exp: expiresAt
  });
}

export function verifyAccessToken(token) {
  const parts = String(token ?? '').split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`);

  if (signature !== expectedSignature) {
    return null;
  }

  const header = parseBase64UrlJson(encodedHeader);
  const payload = parseBase64UrlJson(encodedPayload);

  if (!header || !payload || header.alg !== algorithm) {
    return null;
  }

  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function createRefreshToken() {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + env.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

export function readBearerToken(req) {
  const authorization = req.get('authorization');

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function signJwt(payload) {
  const encodedHeader = base64UrlJson({
    alg: algorithm,
    typ: 'JWT'
  });
  const encodedPayload = base64UrlJson(payload);
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function createSignature(value) {
  return createHmac('sha256', env.auth.jwtSecret)
    .update(value)
    .digest('base64url');
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function parseBase64UrlJson(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
