import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { notificationService } from './notification.service.js';

export const listNotifications = asyncHandler(async (req, res) => { const items = await notificationService.list(req.user.id, req.query); res.json({ items, totalItems: items.length }); });
export const markNotificationRead = asyncHandler(async (req, res) => { const id = Number(req.params.notificationId); if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid notification id'); const result = await notificationService.markRead(req.user.id, id); if (!result.marked) throw new HttpError(404, 'Notification not found'); res.json(result); });
