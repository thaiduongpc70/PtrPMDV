import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/require-auth.middleware.js';
import { listNotifications, markNotificationRead } from './notification.controller.js';

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);
notificationRoutes.get('/', listNotifications);
notificationRoutes.patch('/:notificationId/read', markNotificationRead);
