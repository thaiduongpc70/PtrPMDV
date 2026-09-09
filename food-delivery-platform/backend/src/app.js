import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { addressRoutes } from './modules/addresses/address.routes.js';
import { auditLogRoutes } from './modules/audit/audit.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { errorHandler } from './shared/http/error-handler.js';
import { notFoundHandler } from './shared/http/not-found-handler.js';
import { authContextMiddleware } from './shared/middlewares/auth-context.middleware.js';
import { requireAuth, requireRole } from './shared/middlewares/require-auth.middleware.js';
import { requestAuditMiddleware } from './shared/middlewares/request-audit.middleware.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));
  app.use(authContextMiddleware);
  app.use(requestAuditMiddleware);

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'food-delivery-api'
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/customer/addresses', addressRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/admin/audit-logs', requireAuth, requireRole('ADMIN'), auditLogRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
