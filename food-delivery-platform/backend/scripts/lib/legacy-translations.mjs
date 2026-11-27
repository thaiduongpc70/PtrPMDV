/* Bảng dịch chuỗi tiếng Anh cũ (thuần dữ liệu + hàm, có test). Khớp CHÍNH XÁC cả chuỗi, giữ mã đơn. */
export const ORDER_CODE = 'FD-[A-Z0-9]+(-[A-Z0-9]+)*';

/** notifications.message cố định (không chứa mã đơn). */
export const NOTIFICATION_MESSAGES = [
  ['Restaurant confirmed order', 'Quán đã xác nhận đơn hàng.'],
  ['Kitchen started preparing order', 'Bếp bắt đầu chuẩn bị món.'],
  ['Order is ready for pickup', 'Món đã sẵn sàng để tài xế lấy.'],
  ['Restaurant rejected the order.', 'Quán đã từ chối đơn.']
];

/** order_status_history.note. */
export const HISTORY_MAP = [
  ['Order created', 'Đơn hàng được tạo'],
  ['Restaurant confirmed order', 'Quán đã xác nhận đơn'],
  ['Kitchen started preparing order', 'Bếp bắt đầu chuẩn bị món'],
  ['Order is ready for pickup', 'Món đã sẵn sàng để tài xế lấy'],
  ['Shipper assigned', 'Đã có tài xế nhận đơn'],
  ['Restaurant rejected order', 'Quán đã từ chối đơn'],
  ['Order cancelled', 'Đơn hàng đã bị huỷ'],
  ['Status automatically recorded by trigger', 'Hệ thống tự ghi nhận chuyển trạng thái']
];

const TITLE = new RegExp(`^Order (${ORDER_CODE}) updated$`);
const PLACED = new RegExp(`^Order (${ORDER_CODE}) was placed and is waiting for restaurant confirmation\\.$`);

export function translateTitle(title) {
  const match = TITLE.exec(String(title ?? ''));
  return match ? `Đơn ${match[1]} có cập nhật` : title;
}

export function translateMessage(message) {
  const placed = PLACED.exec(String(message ?? ''));
  if (placed) return `Đơn ${placed[1]} đã được đặt và đang chờ quán xác nhận.`;
  return NOTIFICATION_MESSAGES.find(([from]) => from === message)?.[1] ?? message;
}
