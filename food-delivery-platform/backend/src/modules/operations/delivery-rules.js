/* Máy trạng thái phân công và giao hàng (docs/dev/business-rules.md §1). */
import { HttpError } from '../../shared/http/http-error.js';
import { M } from '../../shared/http/messages.js';
import { statusLabel } from '../../shared/i18n/order-texts.js';

/** Chỉ phân công (hoặc đổi tài xế) khi món đã sẵn sàng hoặc đơn đang chờ tài xế đi lấy. */
export const ASSIGNABLE_ORDER_STATUSES = ['READY_FOR_PICKUP', 'SHIPPER_ASSIGNED'];

const NEXT_DELIVERY_STATUSES = {
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  ACCEPTED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['DELIVERING', 'DELIVERED', 'FAILED'],
  DELIVERING: ['DELIVERED', 'FAILED']
};
const CLOSED_ORDER_STATUSES = ['DELIVERED', 'CANCELLED', 'FAILED'];

export function assertAssignable(orderStatus) {
  if (!ASSIGNABLE_ORDER_STATUSES.includes(orderStatus)) throw new HttpError(409, M.orderNotAssignable(statusLabel(orderStatus)));
}

/** true = gửi lại đúng trạng thái hiện tại (không làm gì thêm); ném 409 nếu bước chuyển không hợp lệ. */
export function checkDeliveryTransition(deliveryStatus, orderStatus, next) {
  if (deliveryStatus === next) return true;
  if (CLOSED_ORDER_STATUSES.includes(orderStatus) || !(NEXT_DELIVERY_STATUSES[deliveryStatus] ?? []).includes(next)) {
    const current = CLOSED_ORDER_STATUSES.includes(orderStatus) ? orderStatus : deliveryStatus;
    throw new HttpError(409, M.deliveryTransitionInvalid(statusLabel(current), statusLabel(next)));
  }
  return false;
}

/** Tài xế tự đổi trạng thái nhận đơn: không tự khoá/mở khoá (SUSPENDED do quản trị viên quản lý). */
export function assertOwnAvailabilityChange(current, next) {
  if (current === 'SUSPENDED' || next === 'SUSPENDED') throw new HttpError(403, M.shipperSuspended);
}
