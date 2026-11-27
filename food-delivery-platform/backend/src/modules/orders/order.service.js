import { HttpError } from '../../shared/http/http-error.js';
import { readPagination, toPagedResponse } from '../../shared/http/pagination.js';
import { formatVnd } from '../../shared/pricing/format-money.js';
import { notificationService } from '../notifications/notification.service.js';
import { engagementRepository } from '../engagement/engagement.repository.js';
import { orderRepository } from './order.repository.js';
import { customerNotice, ownerNotice, statusNote } from '../../shared/i18n/order-texts.js';
import { restaurantOrderTransitions, validateCartItem, validateCartItemPatch, validateCheckout } from './order.validation.js';
import { M } from '../../shared/http/messages.js';

export const orderService = {
  async getCart(userId, restaurantId) {
    const cart = await orderRepository.getCartForUser(userId, restaurantId);
    return cart ?? { restaurantId: restaurantId ? Number(restaurantId) : null, items: [], subtotal: 0 };
  },
  async addCartItem(userId, input) {
    const data = validateCartItem(input);
    let result;
    try { result = await orderRepository.addCartItemForUser(userId, data); } catch (error) { throw mapCartError(error); }
    handleCartResult(result);
    const cart = await orderRepository.getCartForUser(userId, data.restaurantId);
    return { cart, audit: { oldValues: null, newValues: cart } };
  },
  async updateCartItem(userId, cartItemId, input) {
    const data = validateCartItemPatch(input);
    let result;
    try { result = await orderRepository.updateCartItemForUser(userId, cartItemId, data); } catch (error) { throw mapCartError(error); }
    if (!result) throw new HttpError(404, M.cartItemNotFound);
    const cart = await orderRepository.getCartForUser(userId, result.restaurantId);
    return { cart, audit: { oldValues: null, newValues: cart } };
  },
  async removeCartItem(userId, cartItemId) {
    if (!await orderRepository.removeCartItemForUser(userId, cartItemId)) throw new HttpError(404, M.cartItemNotFound);
    return { audit: { oldValues: { id: cartItemId }, newValues: { deleted: true } } };
  },
  async clearCart(userId, restaurantId) {
    await orderRepository.clearCartForUser(userId, restaurantId);
    return { audit: { oldValues: { restaurantId }, newValues: { cleared: true } } };
  },
  async checkout(userId, input, headerIdempotencyKey) {
    const data = validateCheckout(input, headerIdempotencyKey);
    let result;
    try { result = await orderRepository.checkoutForUser(userId, data, engagementRepository); } catch (error) { throw mapCheckoutError(error); }
    handleCheckoutResult(result);
    const alreadyProcessed = Boolean(result.existing);
    const order = await orderRepository.findOrderForCustomer(userId, result.orderId);
    if (!order) throw new HttpError(500, M.orderNotCreated);
    if (!alreadyProcessed) await notify(order, customerNotice('PENDING', order.orderCode), ownerNotice('PENDING', order.orderCode));
    return { order, alreadyProcessed, idempotencyKey: data.idempotencyKey, audit: { oldValues: alreadyProcessed ? order : null, newValues: order } };
  },
  async listCustomerOrders(userId, query) {
    const pagination = readPagination(query, 100);
    const result = await orderRepository.listOrdersForCustomer(userId, { status: normalizeStatus(query.status), pageSize: pagination.pageSize, offset: pagination.offset });
    return toPagedResponse(result.items, pagination.pageNumber, pagination.pageSize, result.totalItems);
  },
  async getCustomerOrder(userId, orderId) { const order = await orderRepository.findOrderForCustomer(userId, orderId); if (!order) throw new HttpError(404, M.orderNotFound); return order; },
  listRestaurantOrders: (userId, query) => orderRepository.listOrdersForRestaurant(userId, { status: normalizeStatus(query.status) }),
  async getRestaurantOrder(userId, orderId) { const order = await orderRepository.findOrderForRestaurant(userId, orderId); if (!order) throw new HttpError(404, M.orderNotFound); return order; },
  async transitionRestaurantOrder(userId, orderId, targetStatus, note) {
    const current = await this.getRestaurantOrder(userId, orderId);
    const allowed = restaurantOrderTransitions[current.status] ?? new Set();
    if (!allowed.has(targetStatus)) throw new HttpError(409, M.orderTransitionInvalid(current.status, targetStatus));
    const result = await orderRepository.transitionRestaurantOrder(userId, orderId, targetStatus, note ?? statusNote(targetStatus), targetStatus === 'CANCELLED' ? 'RESTAURANT_REJECTED' : null);
    if (result?.error === 'NOT_FOUND') throw new HttpError(404, M.orderNotFound);
    const order = await this.getRestaurantOrder(userId, orderId);
    await notify({ ...order, customerUserId: result.customerUserId, restaurantOwnerUserId: result.restaurantOwnerUserId, customerEmail: result.customerEmail }, customerNotice(targetStatus, order.orderCode), ownerNotice(targetStatus, order.orderCode));
    return { order, audit: { oldValues: current, newValues: order } };
  }
};

function handleCartResult(result) {
  const messages = { CUSTOMER_NOT_FOUND: [404, M.customerNotFound], RESTAURANT_UNAVAILABLE: [409, M.restaurantNotAccepting], MENU_ITEM_UNAVAILABLE: [409, M.menuItemUnavailable], VARIANT_UNAVAILABLE: [400, M.variantUnavailable] };
  if (result?.error) { const [status, message] = messages[result.error] ?? [400, M.cartItemInvalid]; throw new HttpError(status, message); }
}
function handleCheckoutResult(result) {
  if (result?.existing) return;
  const messages = { CUSTOMER_NOT_FOUND: [404, M.customerNotFound], ADDRESS_NOT_FOUND: [400, M.deliveryAddressNotFound], AGE_CONFIRMATION_REQUIRED: [400, 'Giỏ hàng có đồ uống có cồn: bạn cần xác nhận đủ 18 tuổi trước khi đặt'], UNDER_AGE: [403, 'Hồ sơ của bạn cho thấy chưa đủ 18 tuổi nên không thể đặt đồ uống có cồn'], ADDRESS_TOO_FAR: [400, `Địa chỉ cách quán ${result.km} km, vượt quá giới hạn giao hàng ${result.maxKm} km nên đơn này không được giao`], RESTAURANT_CLOSED: [409, `Quán đang đóng cửa${result.openingTime ? ` (mở cửa ${result.openingTime.slice(0, 5)} – ${result.closingTime.slice(0, 5)})` : ''}, vui lòng đặt lại trong giờ mở cửa`], CART_EMPTY: [409, 'Giỏ hàng đang trống, hãy thêm món trước khi đặt hàng'], CART_ITEM_UNAVAILABLE: [409, M.cartItemsUnavailable], MINIMUM_ORDER_NOT_MET: [400, `Đơn tối thiểu của quán là ${formatVnd(result.minimumOrder)}${result.subtotal != null ? `, bạn cần mua thêm ${formatVnd(result.minimumOrder - result.subtotal)}` : ''}`], PROMOTION_INVALID: [400, M.promoExpired] };
  if (result?.error) { const [status, message] = messages[result.error] ?? [400, M.checkoutFailed]; throw new HttpError(status, message); }
}
function mapCartError(error) { if (error?.message === 'REQUIRED_TOPPINGS_MISSING' || error?.message === 'TOPPING_SELECTION_INVALID') return new HttpError(400, M.toppingLimits); if (error?.message === 'TOPPING_UNAVAILABLE') return new HttpError(400, M.toppingsUnavailable); return error; }
function mapCheckoutError(error) { if (error?.code === 'ER_DUP_ENTRY') return new HttpError(409, M.checkoutDuplicate); if (error?.message === 'REQUIRED_TOPPINGS_MISSING' || error?.message === 'TOPPING_SELECTION_INVALID') return new HttpError(400, M.toppingLimits); if (error?.message === 'TOPPING_UNAVAILABLE') return new HttpError(400, M.toppingsUnavailable); return error; }
function normalizeStatus(value) { if (value === undefined || value === null || value === '') return null; const status = String(value).trim().toUpperCase(); return status; }
async function notify(order, message, ownerMessage = message) { try { await notificationService.notifyOrderStatus({ orderId: order.id, orderCode: order.orderCode, status: order.status ?? order.orderStatus, customerUserId: order.customerUserId, restaurantOwnerUserId: order.restaurantOwnerUserId, email: order.customerEmail, message, ownerMessage }); } catch (error) { console.warn('Could not publish order notification:', error.message); } }
