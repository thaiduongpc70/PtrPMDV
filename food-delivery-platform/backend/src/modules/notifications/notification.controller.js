import { asyncHandler } from '../../shared/http/async-handler.js';
import { HttpError } from '../../shared/http/http-error.js';
import { notificationService } from './notification.service.js';
import { M } from '../../shared/http/messages.js';
import { readPagination } from '../../shared/http/pagination.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const { pageNumber, pageSize, offset } = readPagination(req.query, 100, 30); // page/pageSize (hoặc limit cũ); sai -> 400 tiếng Việt
  const items = await notificationService.list(req.user.id, { pageSize, offset });
  const { total, unread } = await notificationService.counts(req.user.id);
  const totalPages = Math.ceil(total / pageSize);
  // Trường cũ giữ nguyên (items, totalItems); thêm page/pageSize/totalPages, pagination và unreadCount
  res.json({ items, totalItems: total, page: pageNumber, pageSize, totalPages, pagination: { page: pageNumber, pageSize, totalItems: total, totalPages }, unreadCount: unread });
});
export const markAllNotificationsRead = asyncHandler(async (req, res) => { res.json(await notificationService.markAllRead(req.user.id)); });
export const markNotificationRead = asyncHandler(async (req, res) => { const id = Number(req.params.notificationId); if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, M.notificationIdInvalid); const result = await notificationService.markRead(req.user.id, id); if (!result.marked) throw new HttpError(404, M.notificationNotFound); res.json(result); });
