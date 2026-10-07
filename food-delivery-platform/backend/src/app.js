import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { resolve } from 'node:path';
import { env } from './shared/config/env.js';
import { logger } from './shared/observability/logger.js';
import { addressRoutes } from './modules/addresses/address.routes.js';
import { auditLogRoutes } from './modules/audit/audit.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { engagementAdminRoutes, engagementCustomerRoutes, engagementPublicRoutes, engagementRestaurantRoutes } from './modules/engagement/engagement.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { customerOrderRoutes, restaurantOrderRoutes } from './modules/orders/order.routes.js';
import { adminDashboardRoutes } from './modules/dashboard/admin-dashboard.routes.js';
import {
  accountRoutes,
  communicationRoutes,
  deliveryRoutes,
  paymentRoutes,
  settlementRoutes,
  shipperRoutes
} from './modules/operations/operations.routes.js';
import { restaurantMenuRoutes } from './modules/menus/menu.routes.js';
import { jobRoutes } from './modules/jobs/job.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { customerProfileRoutes } from './modules/customers/customer.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import {
  restaurantAdminRoutes,
  restaurantCategoryAdminRoutes,
  restaurantOwnerRoutes,
  restaurantPublicRoutes
} from './modules/restaurants/restaurant.routes.js';
import { errorHandler } from './shared/http/error-handler.js';
import { notFoundHandler } from './shared/http/not-found-handler.js';
import { authContextMiddleware } from './shared/middlewares/auth-context.middleware.js';
import { requireAuth, requireRole } from './shared/middlewares/require-auth.middleware.js';
import { requestAuditMiddleware } from './shared/middlewares/request-audit.middleware.js';
import { rateLimit } from './shared/middlewares/rate-limit.middleware.js';
import { invalidateResponseCache, responseCache } from './shared/cache/response-cache.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin is not allowed'));
    }
  }));
  app.use(morgan((tokens, req, res) => JSON.stringify({
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    durationMs: Number(tokens['response-time'](req, res))
  }), {
    stream: {
      write(line) {
        try { logger.info('http.request', JSON.parse(line)); } catch { logger.info('http.request', { line: line.trim() }); }
      }
    }
  }));
  app.use(rateLimit(env.rateLimit));
  app.use(authContextMiddleware);
  app.use(requestAuditMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(resolve(process.cwd(), '..', '..', 'storage')));
  app.use('/exports', express.static(resolve(process.cwd(), '..', '..', 'storage', 'exports')));
  app.use('/docs', express.static(resolve(process.cwd(), '..', '..', 'docs')));
  app.use(express.static(resolve(process.cwd(), '..', 'frontend')));

  app.use('/health', healthRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/admin/system-settings', settingsRoutes);
  app.get('/api/docs', (_req, res) => res.sendFile(resolve(process.cwd(), '..', '..', 'docs', 'swagger.html')));
  app.get('/docs/swagger', (_req, res) => res.sendFile(resolve(process.cwd(), '..', '..', 'docs', 'swagger.html')));
  app.get('/api/openapi.json', (_req, res) => res.sendFile(resolve(process.cwd(), '..', '..', 'docs', 'openapi.json')));
  app.use('/api/customer/profile', customerProfileRoutes);
  app.use('/api/customer/addresses', addressRoutes);
  app.use('/api/catalog', responseCache({ ttlMs: 30000, prefix: 'catalog' }), catalogRoutes);
  app.use('/api/catalog', engagementPublicRoutes);
  app.use('/api/admin/banners', engagementAdminRoutes);
  app.use('/api/customer', engagementCustomerRoutes);
  app.use('/api/customer', customerOrderRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/shippers', shipperRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/communications', communicationRoutes);
  app.use('/api/settlements', settlementRoutes);
  app.use('/api/catalog', restaurantPublicRoutes);
  app.use('/api/restaurant/restaurants', invalidateMenuCache, restaurantOwnerRoutes);
  app.use('/api/restaurant/restaurants', restaurantMenuRoutes);
  app.use('/api/restaurant/restaurants', engagementRestaurantRoutes);
  app.use('/api/restaurant', restaurantOrderRoutes);
  app.use('/api/admin/restaurants', restaurantAdminRoutes);
  app.use('/api/admin/restaurant-categories', restaurantCategoryAdminRoutes);
  app.use('/api/admin/dashboard', adminDashboardRoutes);
  app.use('/api/admin/audit-logs', requireAuth, requireRole('ADMIN'), auditLogRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function invalidateMenuCache(req, res, next) {
  if (req.method !== 'GET') res.on('finish', () => invalidateResponseCache('catalog:'));
  next();
}
