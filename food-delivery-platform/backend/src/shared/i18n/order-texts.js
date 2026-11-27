/* Bảng mẫu TẬP TRUNG: mã trạng thái đơn -> câu tiếng Việt cho thông báo và ghi chú lịch sử trạng thái (dữ liệu MỚI).
   Thêm trạng thái mới chỉ cần thêm một dòng ở đây (có test kiểm tra đủ mọi trạng thái). */

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'SHIPPER_ASSIGNED', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'CANCELLED', 'FAILED'];

/** Tên trạng thái hiển thị. */
export const ORDER_STATUS_LABEL = {
  PENDING: 'Chờ quán xác nhận',
  CONFIRMED: 'Quán đã xác nhận',
  PREPARING: 'Đang chuẩn bị món',
  READY_FOR_PICKUP: 'Món đã sẵn sàng chờ lấy',
  SHIPPER_ASSIGNED: 'Đã có tài xế nhận đơn',
  PICKED_UP: 'Tài xế đã lấy món',
  DELIVERING: 'Đang giao hàng',
  DELIVERED: 'Đã giao thành công',
  CANCELLED: 'Đã huỷ',
  FAILED: 'Giao hàng thất bại'
};

/** Ghi chú lịch sử trạng thái (order_status_history.note) khi không có lý do riêng. */
export const ORDER_STATUS_NOTE = {
  PENDING: 'Đơn hàng được tạo',
  CONFIRMED: 'Quán đã xác nhận đơn',
  PREPARING: 'Bếp bắt đầu chuẩn bị món',
  READY_FOR_PICKUP: 'Món đã sẵn sàng để tài xế lấy',
  SHIPPER_ASSIGNED: 'Đã có tài xế nhận đơn',
  PICKED_UP: 'Tài xế đã lấy món',
  DELIVERING: 'Tài xế đang giao hàng',
  DELIVERED: 'Đơn hàng đã được giao thành công',
  CANCELLED: 'Quán đã từ chối đơn',
  FAILED: 'Giao hàng thất bại'
};

/** Nội dung thông báo gửi KHÁCH khi đơn chuyển sang trạng thái này. */
export const CUSTOMER_NOTICE = {
  PENDING: code => `Đơn ${code} đã được đặt và đang chờ quán xác nhận.`,
  CONFIRMED: code => `Quán đã xác nhận đơn ${code}.`,
  PREPARING: code => `Quán đang chuẩn bị món cho đơn ${code}.`,
  READY_FOR_PICKUP: code => `Món của đơn ${code} đã sẵn sàng, đang chờ tài xế lấy.`,
  SHIPPER_ASSIGNED: code => `Đã có tài xế nhận đơn ${code}.`,
  PICKED_UP: code => `Tài xế đã lấy món của đơn ${code}.`,
  DELIVERING: code => `Đơn ${code} đang trên đường giao tới bạn.`,
  DELIVERED: code => `Đơn ${code} đã được giao thành công. Chúc bạn ngon miệng!`,
  CANCELLED: code => `Đơn ${code} đã bị huỷ.`,
  FAILED: code => `Đơn ${code} giao không thành công.`
};

/** Nội dung thông báo gửi CHỦ QUÁN. */
export const OWNER_NOTICE = {
  PENDING: code => `Có đơn mới ${code}, vui lòng xác nhận.`,
  CONFIRMED: code => `Bạn đã xác nhận đơn ${code}.`,
  PREPARING: code => `Đơn ${code} đang được chuẩn bị.`,
  READY_FOR_PICKUP: code => `Đơn ${code} đã sẵn sàng, đang chờ tài xế lấy.`,
  SHIPPER_ASSIGNED: code => `Đã có tài xế nhận đơn ${code}.`,
  PICKED_UP: code => `Tài xế đã lấy món của đơn ${code}.`,
  DELIVERING: code => `Đơn ${code} đang được giao.`,
  DELIVERED: code => `Đơn ${code} đã giao thành công.`,
  CANCELLED: code => `Đơn ${code} đã bị huỷ.`,
  FAILED: code => `Đơn ${code} giao không thành công.`
};

const orDefault = (table, status, code, fallback) => (table[status] ? table[status](code) : fallback(code));

export const statusLabel = status => ORDER_STATUS_LABEL[status] ?? String(status);
export const statusNote = status => ORDER_STATUS_NOTE[status] ?? `Đơn chuyển sang trạng thái ${statusLabel(status)}`;
export const customerNotice = (status, code) => orDefault(CUSTOMER_NOTICE, status, code, c => `Đơn ${c} hiện ở trạng thái: ${statusLabel(status)}.`);
export const ownerNotice = (status, code) => orDefault(OWNER_NOTICE, status, code, c => `Đơn ${c} hiện ở trạng thái: ${statusLabel(status)}.`);
