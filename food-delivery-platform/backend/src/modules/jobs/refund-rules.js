/* Quy tắc thuần cho hoàn tiền tự động (dùng chung job refund-sweeper và scripts/refund-failed-orders.mjs). */

/** Các bước PATCH trạng thái hoàn tiền cần gọi để đi tới COMPLETED qua luồng thật: PENDING/REJECTED -> PROCESSING -> COMPLETED. */
export function stepsToComplete(status) {
  if (status === 'COMPLETED') return [];
  if (status === 'PROCESSING') return ['COMPLETED'];
  return ['PROCESSING', 'COMPLETED'];
}

/** Yêu cầu hoàn đến hạn tự duyệt: chưa xong, đơn đã huỷ/thất bại, tồn quá `minutes` phút (0 = tắt). */
export function isRefundDue(refund, now, minutes) {
  if (!minutes || minutes <= 0) return false;
  if (!['PENDING', 'PROCESSING'].includes(refund.status)) return false;
  if (!['CANCELLED', 'FAILED'].includes(refund.orderStatus)) return false;
  const created = new Date(refund.createdAt).getTime();
  return Number.isFinite(created) && now - created >= minutes * 60_000;
}

/** Đơn huỷ/thất bại đã trả online mà yêu cầu hoàn đang bị REJECTED: cần mở lại và hoàn (không dùng cho COD). */
export function needsReopen(refund, order) {
  return refund.status === 'REJECTED' && ['CANCELLED', 'FAILED'].includes(order.orderStatus) && order.paymentStatus === 'PAID' && order.paymentMethod !== 'COD';
}
