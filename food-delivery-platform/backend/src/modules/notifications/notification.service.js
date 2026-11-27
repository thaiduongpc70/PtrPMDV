import { EventEmitter } from 'node:events';
import { notificationRepository } from './notification.repository.js';
import { customerNotice, ownerNotice, statusLabel } from '../../shared/i18n/order-texts.js';
import { query } from '../../shared/database/mysql.js';

export const notificationEvents = new EventEmitter();
export const emailQueue = [];

export const notificationService = {
  async notifyOrderStatus(input) {
    const valid = value => Number.isInteger(Number(value)) && Number(value) > 0;
    const recipients = [input.customerUserId, input.restaurantOwnerUserId].filter(valid);
    const uniqueRecipients = [...new Set(recipients.map(Number))];
    const title = `Đơn ${input.orderCode}: ${statusLabel(input.status)}`; // tiêu đề theo trạng thái => mỗi trạng thái một thông báo, chống trùng bằng createOnce
    const message = input.message ?? customerNotice(input.status, input.orderCode);
    // Chủ quán có thể nhận nội dung riêng (ownerMessage); khách và các người nhận khác nhận `message`
    const items = uniqueRecipients.map(userId => ({ userId, title, message: input.ownerMessage && userId === Number(input.restaurantOwnerUserId) && userId !== Number(input.customerUserId) ? input.ownerMessage : message, type: 'ORDER', referenceType: 'ORDER', referenceId: input.orderId }));
    if (items.length > 0) await notificationRepository.createOnce(items);
    // Tài xế được giao đơn: báo khi đơn bị huỷ / giao thất bại (không gửi trùng)
    if (['CANCELLED', 'FAILED'].includes(input.status)) await this.notifyShipperOrderEnded(input.orderId, input.status).catch(() => {});
    // Thao tác của hệ thống (job tự huỷ đơn quá hạn): cảnh báo quản trị viên một lần cho mỗi đơn
    if (input.alertAdmins) await this.alertAdmins({ title: input.status === 'FAILED' ? `Hệ thống ghi nhận giao thất bại đơn ${input.orderCode}` : `Hệ thống tự huỷ đơn ${input.orderCode}`, message: input.message ?? `Đơn ${input.orderCode} bị hệ thống tự huỷ do quá hạn.`, type: 'SYSTEM', referenceType: 'ORDER', referenceId: input.orderId }).catch(() => {});
    if (input.email) emailQueue.push({ to: input.email, subject: title, text: message, orderId: input.orderId });
    notificationEvents.emit('order.status', { ...input, recipients: uniqueRecipients });
    return { recipients: uniqueRecipients, queuedEmail: Boolean(input.email) };
  },
  /** Gửi thông báo trạng thái đơn cho khách + chủ quán theo bảng mẫu order-texts (tra thông tin đơn từ DB). Không gửi trùng. */
  async notifyOrderProgress(orderId, status, extra = {}) {
    const rows = await query(
      `SELECT o.id, o.order_code, cp.user_id AS customer_user_id, r.owner_user_id FROM orders o
       INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ? LIMIT 1`, [orderId]);
    if (!rows[0]) return null;
    return this.notifyOrderStatus({
      orderId: Number(rows[0].id), orderCode: rows[0].order_code, status, customerUserId: Number(rows[0].customer_user_id), restaurantOwnerUserId: Number(rows[0].owner_user_id),
      message: customerNotice(status, rows[0].order_code), ownerMessage: ownerNotice(status, rows[0].order_code), ...extra
    });
  },
  /** Báo tài xế: được giao đơn mới (type DELIVERY_ASSIGNED, một lần cho mỗi đơn + tài xế). */
  async notifyShipperAssigned({ orderId, shipperId }) {
    const target = await notificationRepository.shipperUserById(shipperId, orderId);
    if (!target) return 0;
    return notificationRepository.createOnce([{ userId: target.userId, title: 'Bạn được giao đơn mới', message: `Đơn ${target.orderCode} vừa được giao cho bạn, hãy nhận đơn và tới quán lấy món.`, type: 'DELIVERY', referenceType: 'ORDER', referenceId: orderId }]);
  },
  /** Báo tài xế cũ: đơn đã được chuyển cho tài xế khác. */
  async notifyShipperReassigned({ orderId, previousShipperId }) {
    const target = await notificationRepository.shipperUserById(previousShipperId, orderId);
    if (!target) return 0;
    return notificationRepository.createOnce([{ userId: target.userId, title: 'Đơn đã được chuyển cho tài xế khác', message: `Đơn ${target.orderCode} không còn thuộc về bạn, vui lòng bỏ qua đơn này.`, type: 'DELIVERY', referenceType: 'ORDER', referenceId: orderId }]);
  },
  /** Báo tài xế đang giữ đơn: đơn bị huỷ / giao thất bại. */
  async notifyShipperOrderEnded(orderId, status) {
    const target = await notificationRepository.shipperUserOfOrder(orderId);
    if (!target) return 0;
    const cancelled = status === 'CANCELLED';
    return notificationRepository.createOnce([{ userId: target.userId, title: cancelled ? 'Đơn đã bị huỷ' : 'Đơn giao không thành công', message: cancelled ? `Đơn ${target.orderCode} đã bị huỷ, bạn không cần giao nữa.` : `Đơn ${target.orderCode} được ghi nhận giao không thành công.`, type: 'DELIVERY', referenceType: 'ORDER', referenceId: orderId }]);
  },
  /** Cảnh báo cho mọi quản trị viên đang hoạt động (không trùng theo loại + đối tượng). */
  async alertAdmins({ title, message, type, referenceType, referenceId }) {
    const admins = await notificationRepository.adminUserIds();
    return notificationRepository.createOnce(admins.map(userId => ({ userId, title, message, type, referenceType, referenceId })));
  },
  list: (userId, filters) => notificationRepository.listForUser(userId, filters),
  counts: userId => notificationRepository.countForUser(userId),
  async markAllRead(userId) {
    const updated = await notificationRepository.markAllRead(userId);
    const { total, unread } = await notificationRepository.countForUser(userId);
    return { updated, unreadCount: unread, totalItems: total };
  },
  async markRead(userId, notificationId) {
    return { marked: await notificationRepository.markRead(userId, notificationId) };
  }
};
