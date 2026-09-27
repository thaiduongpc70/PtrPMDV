import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { resolve } from 'node:path';
import { addressRoutes } from './modules/addresses/address.routes.js';
import { auditLogRoutes } from './modules/audit/audit.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { engagementAdminRoutes, engagementCustomerRoutes, engagementPublicRoutes, engagementRestaurantRoutes } from './modules/engagement/engagement.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { customerOrderRoutes, restaurantOrderRoutes } from './modules/orders/order.routes.js';
import {
  accountRoutes,
  communicationRoutes,
  deliveryRoutes,
  paymentRoutes,
  settlementRoutes,
  shipperRoutes
} from './modules/operations/operations.routes.js';
import { restaurantMenuRoutes } from './modules/menus/menu.routes.js';
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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(authContextMiddleware);
  app.use(requestAuditMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(resolve(process.cwd(), '..', '..', 'storage')));
  app.use(express.static(resolve(process.cwd(), '..', 'frontend')));

  app.use('/health', healthRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/customer/profile', customerProfileRoutes);
  app.use('/api/customer/addresses', addressRoutes);
  app.use('/api/catalog', catalogRoutes);
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
  app.use('/api/restaurant/restaurants', restaurantOwnerRoutes);
  app.use('/api/restaurant/restaurants', restaurantMenuRoutes);
  app.use('/api/restaurant/restaurants', engagementRestaurantRoutes);
  app.use('/api/restaurant', restaurantOrderRoutes);
  app.use('/api/admin/restaurants', restaurantAdminRoutes);
  app.use('/api/admin/restaurant-categories', restaurantCategoryAdminRoutes);
  app.use('/api/admin/audit-logs', requireAuth, requireRole('ADMIN'), auditLogRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
