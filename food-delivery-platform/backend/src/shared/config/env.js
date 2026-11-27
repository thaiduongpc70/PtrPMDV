import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
  require('dotenv').config();
} catch (error) {
  if (error?.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

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
  port: readInteger('PORT', 3001, 1, 65535),
  shutdownTimeoutMs: readInteger('SHUTDOWN_TIMEOUT_MS', 10000, 1000, 60000),
  corsOrigins: readString('CORS_ORIGINS', 'http://localhost:3001,http://localhost:3000,http://localhost:4173')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean),
  rateLimit: {
    windowMs: readInteger('RATE_LIMIT_WINDOW_MS', 60000, 1000, 3600000),
    max: readInteger('RATE_LIMIT_MAX', 240, 10, 10000),
    // Trần cao hơn cho quản trị viên đã đăng nhập khi đọc danh sách/báo cáo; khách và khách ẩn danh giữ trần `max`
    adminMax: readInteger('RATE_LIMIT_ADMIN_MAX', 2400, 10, 100000)
  },
  redis: {
    url: readString('REDIS_URL')
  },
  catalog: {
    // Bộ lọc "chay": quán chỉ được tính là quán chay khi có danh mục/tên chay hoặc ≥ tỷ lệ này số món thường có chữ "chay" (0–1)
    vegetarianMinShare: Math.min(1, Math.max(0, readNumber('VEGETARIAN_MIN_SHARE', 0.5)))
  },
  orders: {
    // Đơn PENDING chưa thanh toán mà quán không xác nhận sau chừng này phút thì hệ thống tự huỷ (0 = tắt)
    pendingTimeoutMinutes: readInteger('PENDING_ORDER_TIMEOUT_MINUTES', 30, 0, 10080),
    // Đơn đang PREPARING/READY_FOR_PICKUP/SHIPPER_ASSIGNED không đổi trạng thái quá chừng này phút thì bị huỷ (0 = tắt)
    staleKitchenMinutes: readInteger('STALE_ORDER_MINUTES', 180, 0, 10080),
    // Đơn PICKED_UP/DELIVERING không đổi trạng thái quá chừng này phút thì đánh dấu giao thất bại (0 = tắt)
    staleDeliveryMinutes: readInteger('STALE_DELIVERY_MINUTES', 240, 0, 10080),
    // Yêu cầu hoàn tiền PENDING/PROCESSING của đơn huỷ/thất bại tồn quá chừng này phút thì job tự duyệt COMPLETED (0 = tắt)
    refundAutoApproveMinutes: readInteger('REFUND_AUTO_APPROVE_MINUTES', 240, 0, 10080),
    // Cảnh báo quản trị viên khi hoàn tiền PENDING tồn quá chừng này phút (0 = tắt); chỉ xét yêu cầu trong cửa sổ ngày gần đây
    refundAlertMinutes: readInteger('REFUND_ALERT_MINUTES', 120, 0, 10080),
    refundAlertWindowDays: readInteger('REFUND_ALERT_WINDOW_DAYS', 2, 1, 365)
  },
  auth: {
    jwtSecret,
    // Chỉ để thử trên máy (dự án chưa gửi email): trả mã đặt lại/xác minh ngay trong response.
    // Luôn tắt ở production, kể cả khi đặt biến.
    exposeAuthTokens: nodeEnv !== 'production' && readString('AUTH_EXPOSE_TOKENS') === 'true',
    accessTokenTtlSeconds: readInteger(
      'ACCESS_TOKEN_TTL_SECONDS',
      3600,
      60,
      86400
    ),
    refreshTokenTtlDays: readInteger('REFRESH_TOKEN_TTL_DAYS', 30, 1, 365),
    passwordResetTokenTtlMinutes: readInteger(
      'PASSWORD_RESET_TOKEN_TTL_MINUTES',
      30,
      5,
      1440
    ),
    emailVerificationTokenTtlHours: readInteger(
      'EMAIL_VERIFICATION_TOKEN_TTL_HOURS',
      24,
      1,
      168
    )
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
