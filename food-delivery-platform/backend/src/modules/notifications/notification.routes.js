import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/require-auth.middleware.js';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from './notification.controller.js';

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);
notificationRoutes.get('/', listNotifications);
// Đánh dấu tất cả đã đọc (của chính người dùng); đặt TRƯỚC route có :notificationId. PATCH và POST đều được.
notificationRoutes.patch('/read-all', markAllNotificationsRead);
notificationRoutes.post('/read-all', markAllNotificationsRead);
notificationRoutes.patch('/:notificationId/read', markNotificationRead);
