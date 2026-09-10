import dotenv from 'dotenv';

dotenv.config();

function readNumber(name, fallback) {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number.`);
  }

  return parsed;
}

function readInteger(name, fallback, minimum, maximum) {
  const value = readNumber(name, fallback);

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }

  return value;
}

function readString(name, fallback = '') {
  const value = process.env[name];
  return value === undefined ? fallback : value;
}

const nodeEnv = readString('NODE_ENV', 'development').toLowerCase();
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test or production.');
}

const jwtSecret = readString('JWT_SECRET', 'change-this-secret-before-production');
if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production.');
}

const databasePassword = readString('DB_PASSWORD');
if (!databasePassword) {
  throw new Error('DB_PASSWORD is required.');
}

export const env = Object.freeze({
  nodeEnv,
  port: readInteger('PORT', 3000, 1, 65535),
  shutdownTimeoutMs: readInteger('SHUTDOWN_TIMEOUT_MS', 10000, 1000, 60000),
  auth: {
    jwtSecret,
    accessTokenTtlSeconds: readInteger(
      'ACCESS_TOKEN_TTL_SECONDS',
      3600,
      60,
      86400
    ),
    refreshTokenTtlDays: readInteger('REFRESH_TOKEN_TTL_DAYS', 30, 1, 365)
  },
  database: {
    host: readString('DB_HOST', 'localhost'),
    port: readInteger('DB_PORT', 3306, 1, 65535),
    name: readString('DB_NAME', 'food_delivery_db'),
    user: readString('DB_USER', 'food_delivery_app'),
    password: databasePassword,
    connectionLimit: readInteger('DB_CONNECTION_LIMIT', 10, 1, 100),
    healthCheckTimeoutMs: readInteger(
      'DB_HEALTHCHECK_TIMEOUT_MS',
      2000,
      250,
      30000
    )
  }
});
