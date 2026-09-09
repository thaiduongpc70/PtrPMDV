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

function readString(name, fallback = '') {
  const value = process.env[name];
  return value === undefined ? fallback : value;
}

export const env = Object.freeze({
  nodeEnv: readString('NODE_ENV', 'development'),
  port: readNumber('PORT', 3000),
  auth: {
    jwtSecret: readString('JWT_SECRET', 'change-this-secret-before-production'),
    accessTokenTtlSeconds: readNumber('ACCESS_TOKEN_TTL_SECONDS', 3600),
    refreshTokenTtlDays: readNumber('REFRESH_TOKEN_TTL_DAYS', 30)
  },
  database: {
    host: readString('DB_HOST', 'localhost'),
    port: readNumber('DB_PORT', 3306),
    name: readString('DB_NAME', 'food_delivery_db'),
    user: readString('DB_USER', 'food_delivery_app'),
    password: readString('DB_PASSWORD'),
    connectionLimit: readNumber('DB_CONNECTION_LIMIT', 10)
  }
});
