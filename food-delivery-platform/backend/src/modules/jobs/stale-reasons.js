import { statusLabel } from '../../shared/i18n/order-texts.js';

/** Lý do tự huỷ đơn kẹt ở bếp, dùng NHÃN tiếng Việt thay cho mã trạng thái, không lặp "Đơn …" (thông báo đã có mã đơn). */
export function staleKitchenReason(status, minutes, refund = false) {
  return `Quá ${minutes} phút ở trạng thái "${statusLabel(status)}" không có tiến triển nên hệ thống tự huỷ${refund ? ' và hoàn tiền' : ''}`;
}
