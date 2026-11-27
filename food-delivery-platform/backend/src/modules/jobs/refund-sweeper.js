import { query, withTransaction } from '../../shared/database/mysql.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/observability/logger.js';
import { auditLogService } from '../audit/audit.service.js';
import { setRefundStatus } from '../payments/refund-service.js';
import { notificationService } from '../notifications/notification.service.js';

/* Job tự duyệt hoàn tiền: yêu cầu hoàn PENDING/PROCESSING của đơn CANCELLED/FAILED tồn quá REFUND_AUTO_APPROVE_MINUTES
   (mặc định 240 phút, 0 = tắt) -> COMPLETED + đơn REFUNDED (cùng hiệu ứng PATCH /api/admin/manage/refunds/:id), ghi audit REFUND_AUTO_COMPLETE. */
export async function approveStaleRefunds(limit = 100) {
  const minutes = env.orders.refundAutoApproveMinutes;
  if (!minutes) return 0;
  const due = await query(
    `SELECT f.id, f.order_id FROM refunds f JOIN orders o ON o.id = f.order_id
     WHERE f.status IN ('PENDING', 'PROCESSING') AND o.order_status IN ('CANCELLED', 'FAILED')
       AND f.created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE) ORDER BY f.id LIMIT ?`, [minutes, limit]);
  let done = 0;
  for (const row of due) {
    try {
      await withTransaction(connection => setRefundStatus(connection, { refundId: Number(row.id), status: 'COMPLETED', userId: null }));
    } catch (error) { logger.warn?.('refund.auto_complete_skipped', { refundId: Number(row.id), error: error.message }); continue; }
    done += 1;
    await auditLogService.write({ userId: null, action: 'REFUND_AUTO_COMPLETE', entityType: 'REFUND', entityId: Number(row.id), newValuesJson: { orderId: Number(row.order_id), afterMinutes: minutes } }).catch(() => {});
  }
  if (done) logger.info('refund.auto_completed', { count: done });
  return done;
}

/* Cảnh báo quản trị viên: yêu cầu hoàn tiền PENDING tồn quá REFUND_ALERT_MINUTES (mặc định 120; 0 = tắt).
   Chỉ xét yêu cầu tạo trong REFUND_ALERT_WINDOW_DAYS ngày gần đây (không phát sinh thông báo cho dữ liệu cũ) và mỗi yêu cầu chỉ cảnh báo MỘT lần. */
export async function findRefundsToAlert(minutes, windowDays, exec = query, limit = 100) {
  return exec(
    `SELECT f.id, f.order_id, f.amount, o.order_code FROM refunds f INNER JOIN orders o ON o.id = f.order_id
     WHERE f.status = 'PENDING' AND f.created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? MINUTE)
       AND f.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY) ORDER BY f.id LIMIT ?`, [minutes, windowDays, limit]);
}

export async function alertStaleRefunds({
  minutes = env.orders.refundAlertMinutes, windowDays = env.orders.refundAlertWindowDays,
  find = findRefundsToAlert, alert = input => notificationService.alertAdmins(input)
} = {}) {
  if (!minutes) return 0;
  const rows = await find(minutes, windowDays);
  let created = 0;
  for (const row of rows) {
    created += Number(await alert({
      title: `Yêu cầu hoàn tiền chờ xử lý lâu (đơn ${row.order_code})`,
      message: `Yêu cầu hoàn ${Number(row.amount).toLocaleString('vi-VN')}đ của đơn ${row.order_code} đang chờ xử lý quá ${minutes} phút.`,
      type: 'SYSTEM', referenceType: 'REFUND', referenceId: Number(row.id)
    }) ?? 0) > 0 ? 1 : 0;
  }
  return created;
}
