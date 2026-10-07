const sensitiveKeys = new Set([
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'authorization',
  'cookie'
]);

export const logger = {
  info(message, context = {}) {
    write('info', message, context);
  },
  warn(message, context = {}) {
    write('warn', message, context);
  },
  error(message, context = {}) {
    write('error', message, context);
  }
};

function write(level, message, context) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'food-delivery-api',
    message,
    ...redact(context)
  };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    sensitiveKeys.has(key.toLowerCase()) ? '***' : redact(child)
  ]));
}
