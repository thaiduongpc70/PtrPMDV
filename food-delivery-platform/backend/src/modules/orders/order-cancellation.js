import { query, withTransaction } from '../../shared/database/mysql.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/observability/logger.js';
import { notificationService } from '../notifications/notification.service.js';
import { closeOpenPayments, createRefund } from '../payments/refund-service.js';

/* Huỷ đơn: một luồng duy nhất cho khách/quán/admin (POST /api/payments/orders/:id/cancel) và cho job tự huỷ đơn quá hạn xác nhận. */

export const CANCEL_REASON_CODES = ['CUSTOMER_CHANGED_MIND', 'RESTAURANT_REJECTED', 'OUT_OF_STOCK', 'SHIPPER_UNAVAILABLE', 'PAYMENT_FAILED', 'SYSTEM_TIMEOUT', 'OTHER'];
export const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING'];

/**
 * Thực hiện huỷ đơn trong một giao dịch đã mở: đổi trạng thái (trigger ghi lịch sử, ở đây chỉ bổ sung người/ghi chú),
 * ghi order_cancellations, tạo yêu cầu hoàn tiền nếu đơn đã thanh toán, huỷ chuyến giao/đề nghị nhận chuyến.
 * `actorUserId` = null khi hệ thống tự huỷ.
 */
export async function cancelOrderInTransaction(connection, order, { actorUserId = null, reasonCode = 'CUSTOMER_CHANGED_MIND', reason = null, historyNote = null }) {
  const orderId = Number(order.id);
  await connection.execute('SELECT id FROM orders WHERE id = ? FOR UPDATE', [orderId]); // khoá đơn: chặn đua với luồng hoàn tiền
  await connection.execute(
    `UPDATE orders SET order_status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [orderId]
  );
  await connection.execute(
    `UPDATE order_status_history SET changed_by = ?, note = ? WHERE order_id = ? AND new_status = 'CANCELLED' ORDER BY id DESC LIMIT 1`,
    [actorUserId, historyNote ?? reason ?? 'Đơn hàng đã bị huỷ', orderId]
  );
  // Hoàn đúng phần CÒN LẠI chưa hoàn (không tạo trùng nếu đã có yêu cầu); giao dịch chưa thu được đóng lại
  const refund = ['PAID', 'PARTIALLY_REFUNDED'].includes(order.payment_status) ? await createRefund(connection, { orderId, reason, userId: actorUserId, soft: true }) : null;
  const refundAmount = refund?.amount ?? 0;
  await closeOpenPayments(connection, orderId, 'CANCELLED');
  await connection.execute(
    `INSERT INTO order_cancellations (order_id, cancelled_by, reason_code, reason, refund_amount)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason), refund_amount = VALUES(refund_amount)`,
    [orderId, actorUserId, reasonCode, reason, refundAmount]
  );
  await connection.execute(`UPDATE deliveries SET delivery_status = 'CANCELLED' WHERE order_id = ?`, [orderId]);
  await connection.execute(`UPDATE delivery_assignments SET assignment_status = 'CANCELLED' WHERE order_id = ? AND assignment_status = 'OFFERED'`, [orderId]);
  return { orderId, status: 'CANCELLED', refundAmount };
}

/* ---- Job: tự huỷ đơn PENDING (quán chưa xác nhận) quá N phút, kể cả đã thanh toán ---- */

export const pendingTimeoutMinutes = () => env.orders.pendingTimeoutMinutes;

/** Đơn PENDING chưa thanh toán đã tạo quá `minutes` phút (cũ nhất trước). */
export async function findExpiredPendingOrders(minutes, limit = 50, exec = query) {
  return exec(
    `SELECT o.id, o.order_code, o.created_at
     FROM orders o
     WHERE o.order_status = 'PENDING' AND o.deleted_at IS NULL
       AND o.created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)
     ORDER BY o.created_at ASC LIMIT ?`,
    [minutes, limit]
  );
}

/** Lý do tự huỷ đơn quán không xác nhận; đơn đã trả tiền thì tạo yêu cầu hoàn trong cùng giao dịch. */
export function pendingTimeoutReason(minutes, paid = false) {
  return `Quán chưa xác nhận trong ${minutes} phút nên hệ thống tự huỷ đơn${paid ? ' và hoàn tiền' : ''}`;
}

/** Khoá đơn và huỷ nếu vẫn còn PENDING (quán có thể vừa xác nhận). Trả về thông tin để báo cho khách, hoặc null nếu bỏ qua. */
export async function cancelPendingOrderOnTimeout(orderId, minutes) {
  return withTransaction(async connection => {
    const rows = await connection.execute(
      `SELECT o.*, r.owner_user_id, cp.user_id AS customer_user_id, u.email AS customer_email
       FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
       INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN users u ON u.id = cp.user_id
       WHERE o.id = ? FOR UPDATE`, [orderId]
    );
    const order = rows[0];
    if (!order || order.order_status !== 'PENDING') return null; // quán vừa xác nhận/khách vừa huỷ thì bỏ qua
    const reason = pendingTimeoutReason(minutes, ['PAID', 'PARTIALLY_REFUNDED'].includes(order.payment_status));
    await cancelOrderInTransaction(connection, order, { actorUserId: null, reasonCode: 'SYSTEM_TIMEOUT', reason, historyNote: reason });
    return { orderId: Number(order.id), orderCode: order.order_code, customerUserId: Number(order.customer_user_id), restaurantOwnerUserId: Number(order.owner_user_id), email: order.customer_email, message: reason };
  });
}

/**
 * Chạy một lượt. Các hàm phụ thuộc được truyền vào để kiểm thử không cần DB.
 * Trả về danh sách mã đơn đã huỷ. Lỗi của một đơn không làm dừng các đơn còn lại.
 */
export async function cancelExpiredPendingOrders({
  minutes = pendingTimeoutMinutes(),
  findExpired = findExpiredPendingOrders,
  cancel = cancelPendingOrderOnTimeout,
  notify = notifyTimeout
} = {}) {
  if (!Number.isFinite(minutes) || minutes <= 0) return [];
  const expired = await findExpired(minutes);
  const cancelled = [];
  for (const order of expired) {
    try {
      const result = await cancel(Number(order.id), minutes);
      if (!result) continue;
      cancelled.push(result.orderCode ?? order.order_code);
      await notify(result).catch(error => logger.warn('orders.timeout.notify_failed', { orderId: result.orderId, error: error.message }));
    } catch (error) {
      logger.error('orders.timeout.cancel_failed', { orderId: Number(order.id), error: error.message });
    }
  }
  if (cancelled.length) logger.info('orders.timeout.cancelled', { count: cancelled.length, minutes, orders: cancelled });
  return cancelled;
}

async function notifyTimeout(result) {
  await notificationService.notifyOrderStatus({
    orderId: result.orderId, orderCode: result.orderCode, status: 'CANCELLED', customerUserId: result.customerUserId,
    restaurantOwnerUserId: result.restaurantOwnerUserId, email: result.email, message: `Đơn ${result.orderCode} đã bị huỷ: ${result.message}.`, alertAdmins: true
  });
}
