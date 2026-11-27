import { query, withTransaction } from '../../shared/database/mysql.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/observability/logger.js';
import { notificationService } from '../notifications/notification.service.js';
import { cancelOrderInTransaction } from '../orders/order-cancellation.js';
import { closeOpenPayments, createRefund } from '../payments/refund-service.js';
import { staleKitchenReason } from './stale-reasons.js';
import { updateDeliveryStatus } from '../operations/operations.routes.js';

/* Job dọn đơn dở dang và voucher quá hạn (chạy cùng job.worker.js):
   - PREPARING / READY_FOR_PICKUP / SHIPPER_ASSIGNED quá STALE_ORDER_MINUTES không đổi trạng thái -> huỷ SYSTEM_TIMEOUT (kèm yêu cầu hoàn tiền nếu đã trả online);
   - PICKED_UP / DELIVERING quá STALE_DELIVERY_MINUTES -> chuyến giao FAILED qua luồng cập nhật chuyến thật (+ hoàn tiền nếu đã trả online, nhả tài xế);
   - voucher ACTIVE có end_at < hiện tại -> EXPIRED. */

export const KITCHEN_STATUSES = ['PREPARING', 'READY_FOR_PICKUP', 'SHIPPER_ASSIGNED'];
export const DELIVERY_STATUSES = ['PICKED_UP', 'DELIVERING'];

/** Đơn ở các trạng thái `statuses` mà lần đổi trạng thái gần nhất đã quá `minutes` phút (cũ nhất trước). */
export async function findStaleOrders(statuses, minutes, limit = 100) {
  return query(
    `SELECT o.id, o.order_code, o.order_status
     FROM orders o
     WHERE o.order_status IN (${statuses.map(() => '?').join(',')}) AND o.deleted_at IS NULL
       AND COALESCE((SELECT MAX(h.created_at) FROM order_status_history h WHERE h.order_id = o.id), o.created_at) < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)
     ORDER BY o.created_at ASC LIMIT ?`,
    [...statuses, minutes, limit]
  );
}

async function releaseShipper(connection, shipperId) {
  if (!shipperId) return;
  await connection.execute(
    `UPDATE shipper_profiles sp SET availability_status = 'AVAILABLE'
     WHERE sp.id = ? AND sp.availability_status = 'BUSY'
       AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.shipper_id = sp.id AND d.delivery_status IN ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'DELIVERING'))`,
    [shipperId]
  );
}

async function loadForUpdate(connection, orderId) {
  const rows = await connection.execute(
    `SELECT o.*, r.owner_user_id, cp.user_id AS customer_user_id, u.email AS customer_email
     FROM orders o INNER JOIN restaurants r ON r.id = o.restaurant_id
     INNER JOIN customer_profiles cp ON cp.id = o.customer_id INNER JOIN users u ON u.id = cp.user_id
     WHERE o.id = ? FOR UPDATE`, [orderId]
  );
  return rows[0] ?? null;
}

const toNotice = (order, message, status = 'CANCELLED') => ({
  status, orderId: Number(order.id), orderCode: order.order_code, customerUserId: Number(order.customer_user_id),
  restaurantOwnerUserId: Number(order.owner_user_id), email: order.customer_email, message
});

/** Huỷ đơn quá hạn ở khâu bếp/chờ tài xế (khoá dòng, kiểm lại trạng thái). Trả thông tin báo khách hoặc null nếu đã đổi trạng thái. */
export async function cancelStaleKitchenOrder(orderId, minutes) {
  return withTransaction(async connection => {
    const order = await loadForUpdate(connection, orderId);
    if (!order || !KITCHEN_STATUSES.includes(order.order_status)) return null;
    const reason = staleKitchenReason(order.order_status, minutes, ['PAID', 'PARTIALLY_REFUNDED'].includes(order.payment_status) && order.payment_method !== 'COD');
    await cancelOrderInTransaction(connection, order, { actorUserId: null, reasonCode: 'SYSTEM_TIMEOUT', reason, historyNote: reason });
    await releaseShipper(connection, order.shipper_id);
    return toNotice(order, reason);
  });
}

/** Chuyến giao quá hạn: FAILED qua luồng cập nhật chuyến thật; đơn đã trả online sinh yêu cầu hoàn tiền; tài xế được nhả. */
export async function failStaleDelivery(orderId, minutes) {
  const info = await query(
    `SELECT d.id AS delivery_id, d.shipper_id, o.order_status FROM deliveries d INNER JOIN orders o ON o.id = d.order_id
     WHERE d.order_id = ? ORDER BY d.id DESC LIMIT 1`, [orderId]
  );
  if (!info[0] || !DELIVERY_STATUSES.includes(info[0].order_status) || !info[0].shipper_id) return null;
  const note = `Chuyến giao quá ${minutes} phút không hoàn tất nên hệ thống đánh dấu giao thất bại`;
  await updateDeliveryStatus({ userId: null, deliveryId: Number(info[0].delivery_id), shipperId: Number(info[0].shipper_id), status: 'FAILED', latitude: null, longitude: null, proofImageUrl: null, receiverSignatureUrl: null, note });
  return withTransaction(async connection => {
    const order = await loadForUpdate(connection, orderId);
    if (!order || order.order_status !== 'FAILED') return null;
    if (['PAID', 'PARTIALLY_REFUNDED'].includes(order.payment_status) && order.payment_method !== 'COD') {
      await createRefund(connection, { orderId, reason: note, userId: null, soft: true });
    }
    await closeOpenPayments(connection, orderId, 'FAILED');
    await releaseShipper(connection, order.shipper_id);
    return toNotice(order, note, 'FAILED');
  });
}

/** Voucher còn ACTIVE nhưng đã quá end_at -> EXPIRED. Trả số voucher được chuyển. */
export async function expirePromotions(exec = query) {
  const result = await exec(`UPDATE promotions SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND deleted_at IS NULL AND end_at < CURRENT_TIMESTAMP`);
  return Number(result?.affectedRows ?? 0);
}

async function notify(result) {
  await notificationService.notifyOrderStatus({
    orderId: result.orderId, orderCode: result.orderCode, status: result.status ?? 'CANCELLED', customerUserId: result.customerUserId,
    restaurantOwnerUserId: result.restaurantOwnerUserId, email: result.email, message: `Đơn ${result.orderCode}: ${result.message.charAt(0).toLowerCase()}${result.message.slice(1)}.`, alertAdmins: true
  });
}

/**
 * Một lượt dọn. Các hàm phụ thuộc truyền vào để test không cần DB.
 * Trả { cancelled: [mã đơn], failed: [mã đơn], expiredPromotions: n }. Lỗi của một đơn không chặn các đơn khác.
 */
export async function sweepStaleOrders({
  kitchenMinutes = env.orders.staleKitchenMinutes,
  deliveryMinutes = env.orders.staleDeliveryMinutes,
  findStale = findStaleOrders, cancelKitchen = cancelStaleKitchenOrder, failDelivery = failStaleDelivery, expire = expirePromotions, notifyFn = notify
} = {}) {
  const summary = { cancelled: [], failed: [], expiredPromotions: 0 };
  const run = async (minutes, statuses, action, bucket) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    for (const order of await findStale(statuses, minutes)) {
      try {
        const result = await action(Number(order.id), minutes);
        if (!result) continue;
        bucket.push(result.orderCode ?? order.order_code);
        await notifyFn(result).catch(error => logger.warn('orders.sweep.notify_failed', { orderId: Number(order.id), error: error.message }));
      } catch (error) {
        logger.error('orders.sweep.failed', { orderId: Number(order.id), error: error.message });
      }
    }
  };
  await run(kitchenMinutes, KITCHEN_STATUSES, cancelKitchen, summary.cancelled);
  await run(deliveryMinutes, DELIVERY_STATUSES, failDelivery, summary.failed);
  try { summary.expiredPromotions = await expire(); } catch (error) { logger.error('promotions.expire.failed', { error: error.message }); }
  if (summary.cancelled.length || summary.failed.length || summary.expiredPromotions) logger.info('orders.sweep.done', summary);
  return summary;
}
