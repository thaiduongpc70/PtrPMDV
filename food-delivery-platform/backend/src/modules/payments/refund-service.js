/* Một nguồn DUY NHẤT cho hoàn tiền: tạo yêu cầu, đổi trạng thái, đồng bộ payments/orders.
   Quy tắc: tổng hoàn (PENDING + PROCESSING + COMPLETED) không bao giờ vượt số khách đã trả; yêu cầu đã COMPLETED là bất biến.
   Chống đua song song: mọi thao tác khoá dòng đơn (SELECT … FOR UPDATE) TRƯỚC khi đọc/ghi hoàn tiền, trong cùng giao dịch. */
import { HttpError } from '../../shared/http/http-error.js';
import { formatVnd } from '../../shared/pricing/format-money.js';

export const OPEN_REFUND_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED'];
const EPSILON = 0.005;

/** Số còn được hoàn = đã trả − tổng các yêu cầu đang mở/đã hoàn (bỏ qua excludeId). */
export function refundableRemaining(paid, refunds, excludeId = null) {
  const used = (refunds ?? []).filter(r => OPEN_REFUND_STATUSES.includes(r.status) && Number(r.id) !== Number(excludeId)).reduce((sum, r) => sum + Number(r.amount), 0);
  return Math.max(0, Math.round((Number(paid) - used) * 100) / 100);
}

/** Trạng thái thanh toán của đơn sau khi đã hoàn `completed` trên `paid`: REFUNDED, PARTIALLY_REFUNDED hoặc null (không đổi). */
export function orderPaymentStatusAfter(paid, completed) {
  if (Number(completed) <= EPSILON) return null;
  return Number(completed) >= Number(paid) - EPSILON ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
}

/** Khoá đơn và đọc số đã trả + các yêu cầu hoàn. */
async function loadLocked(connection, orderId) {
  const orders = await connection.execute('SELECT id, payment_status, order_status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
  if (!orders[0]) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  const payments = await connection.execute("SELECT id, amount, status FROM payments WHERE order_id = ? AND status IN ('PAID', 'REFUNDED') ORDER BY id DESC", [orderId]);
  const refunds = await connection.execute('SELECT id, amount, status FROM refunds WHERE order_id = ? FOR UPDATE', [orderId]);
  return { order: orders[0], payments, paid: payments.reduce((sum, p) => sum + Number(p.amount), 0), refunds };
}

/** Tạo yêu cầu hoàn tiền (PENDING). amount = null → hoàn phần còn lại. `soft`: không còn gì để hoàn thì trả null thay vì báo lỗi. */
export async function createRefund(connection, { orderId, amount = null, reason = null, userId = null, soft = false }) {
  const { payments, paid, refunds } = await loadLocked(connection, orderId);
  const remaining = refundableRemaining(paid, refunds);
  if (paid <= EPSILON) {
    if (soft) return null;
    throw new HttpError(409, 'Đơn chưa được thanh toán nên không có gì để hoàn');
  }
  if (remaining <= EPSILON) {
    if (soft) return null;
    throw new HttpError(409, 'Đơn này đã được hoàn (hoặc đang chờ hoàn) đủ số tiền đã trả');
  }
  const value = amount === null || amount === undefined ? remaining : Number(amount);
  if (!(value > 0)) throw new HttpError(400, 'Số tiền hoàn phải lớn hơn 0');
  if (value > remaining + EPSILON) throw new HttpError(409, `Số tiền hoàn vượt quá số còn được hoàn (${formatVnd(remaining)})`);
  const result = await connection.execute(
    "INSERT INTO refunds (order_id, payment_id, amount, reason, status, processed_by) VALUES (?, ?, ?, ?, 'PENDING', ?)",
    [orderId, payments[0]?.id ?? null, value, reason, userId]
  );
  return { id: Number(result.insertId), orderId, amount: value, status: 'PENDING' };
}

/** Đồng bộ payments + orders theo tổng đã hoàn COMPLETED. */
export async function syncRefundState(connection, orderId) {
  const { paid, refunds, payments } = await loadLocked(connection, orderId);
  const completed = refunds.filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + Number(r.amount), 0);
  const status = orderPaymentStatusAfter(paid, completed);
  if (!status) return null;
  await connection.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [status, orderId]);
  // payments không có trạng thái "hoàn một phần": chỉ chuyển REFUNDED khi đã hoàn đủ
  if (status === 'REFUNDED' && payments.length) await connection.execute("UPDATE payments SET status = 'REFUNDED' WHERE order_id = ? AND status = 'PAID'", [orderId]);
  return status;
}

/** Đổi trạng thái yêu cầu hoàn (PROCESSING/COMPLETED/REJECTED) trong giao dịch, có kiểm tra không hoàn vượt và đồng bộ trạng thái. */
export async function setRefundStatus(connection, { refundId, status, userId = null }) {
  const found = await connection.execute('SELECT id, order_id FROM refunds WHERE id = ? LIMIT 1', [refundId]);
  if (!found[0]) throw new HttpError(404, 'Không tìm thấy yêu cầu hoàn tiền');
  const orderId = Number(found[0].order_id);
  const { paid, refunds } = await loadLocked(connection, orderId);
  const current = refunds.find(r => Number(r.id) === Number(refundId));
  if (current.status === 'COMPLETED') {
    if (status === 'COMPLETED') return { orderId, status, unchanged: true };
    throw new HttpError(409, 'Yêu cầu hoàn tiền đã hoàn tất, không thể thay đổi');
  }
  if (OPEN_REFUND_STATUSES.includes(status)) {
    const remaining = refundableRemaining(paid, refunds, refundId);
    if (Number(current.amount) > remaining + EPSILON) throw new HttpError(409, `Không thể chuyển sang ${status}: tổng hoàn sẽ vượt số khách đã trả (còn được hoàn ${formatVnd(remaining)})`);
  }
  await connection.execute('UPDATE refunds SET status = ?, processed_by = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?', [status, userId, refundId]);
  if (status === 'COMPLETED') await syncRefundState(connection, orderId);
  return { orderId, status };
}

/** Đóng giao dịch chưa thu của đơn đã huỷ (CANCELLED) hoặc giao thất bại (FAILED). */
export async function closeOpenPayments(connection, orderId, status = 'CANCELLED') {
  const result = await connection.execute("UPDATE payments SET status = ? WHERE order_id = ? AND status IN ('PENDING', 'PROCESSING')", [status, orderId]);
  // đơn chưa thu được tiền: trạng thái thanh toán của đơn cũng đóng theo (CANCELLED / FAILED)
  await connection.execute("UPDATE orders SET payment_status = ? WHERE id = ? AND payment_status = 'PENDING'", [status, orderId]);
  return Number(result?.affectedRows ?? 0);
}
