/* Phần thuần (có test) của scripts/fix-money-consistency.mjs. */
import { statusLabel } from '../../src/shared/i18n/order-texts.js';
import { staleKitchenReason } from '../../src/modules/jobs/stale-reasons.js';

export const ORDER_STATUS_NOTE_BY_STATUS = {
  PENDING: 'Đơn hàng được tạo', CONFIRMED: 'Quán đã xác nhận đơn', PREPARING: 'Bếp bắt đầu chuẩn bị món', READY_FOR_PICKUP: 'Món đã sẵn sàng để tài xế lấy',
  SHIPPER_ASSIGNED: 'Đã có tài xế nhận đơn', PICKED_UP: 'Tài xế đã lấy món', DELIVERING: 'Đang giao hàng', DELIVERED: 'Đã giao thành công',
  CANCELLED: 'Đơn hàng đã bị huỷ', FAILED: 'Giao hàng thất bại'
};

/** rows: yêu cầu hoàn đang mở/đã hoàn, đã sắp theo (order_id, created_at, id), kèm paid. Giữ lần lượt tới khi đủ số đã trả; phần còn lại là thừa. */
export function planDuplicateRefunds(rows) {
  const plan = []; const used = new Map(); const kept = new Map();
  for (const row of rows) {
    const orderId = Number(row.order_id); const paid = Number(row.paid); const amount = Number(row.amount);
    const sum = used.get(orderId) ?? 0;
    if (sum + amount <= paid + 0.005) { used.set(orderId, sum + amount); if (!kept.has(orderId)) kept.set(orderId, Number(row.id)); } else if (kept.has(orderId)) plan.push({ id: Number(row.id), orderId, amount, keptId: kept.get(orderId) });
  }
  return plan;
}

const STALE = /Đơn ở trạng thái (PREPARING|READY_FOR_PICKUP|SHIPPER_ASSIGNED) quá (\d+) phút không có tiến triển nên hệ thống tự huỷ( và hoàn tiền)?/;

/** Thay câu "Đơn ở trạng thái <MÃ> quá N phút…" bằng câu dùng nhãn tiếng Việt, giữ phần trước/sau (vd "Đơn FD-…: "). */
export function rewriteStaleText(text) {
  const source = String(text ?? '');
  return source.replace(STALE, (match, status, minutes, refund, offset) => {
    const reason = staleKitchenReason(status, Number(minutes), Boolean(refund));
    return offset > 0 ? `${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : reason;
  });
}
export { statusLabel };
