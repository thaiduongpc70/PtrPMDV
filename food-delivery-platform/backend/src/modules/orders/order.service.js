import { HttpError } from '../../shared/http/http-error.js';
import { notificationService } from '../notifications/notification.service.js';
import { engagementRepository } from '../engagement/engagement.repository.js';
import { orderRepository } from './order.repository.js';
import { restaurantOrderTransitions, validateCartItem, validateCartItemPatch, validateCheckout } from './order.validation.js';

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
    if (!result) throw new HttpError(404, 'Cart item not found');
    const cart = await orderRepository.getCartForUser(userId, result.restaurantId);
    return { cart, audit: { oldValues: null, newValues: cart } };
  },
  async removeCartItem(userId, cartItemId) {
    if (!await orderRepository.removeCartItemForUser(userId, cartItemId)) throw new HttpError(404, 'Cart item not found');
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
    if (!order) throw new HttpError(500, 'Order was not created correctly');
    if (!alreadyProcessed) await notify(order, `Order ${order.orderCode} was placed and is waiting for restaurant confirmation.`);
    return { order, alreadyProcessed, idempotencyKey: data.idempotencyKey, audit: { oldValues: alreadyProcessed ? order : null, newValues: order } };
  },
  listCustomerOrders: (userId, query) => orderRepository.listOrdersForCustomer(userId, { status: normalizeStatus(query.status) }),
  async getCustomerOrder(userId, orderId) { const order = await orderRepository.findOrderForCustomer(userId, orderId); if (!order) throw new HttpError(404, 'Order not found'); return order; },
  listRestaurantOrders: (userId, query) => orderRepository.listOrdersForRestaurant(userId, { status: normalizeStatus(query.status) }),
  async getRestaurantOrder(userId, orderId) { const order = await orderRepository.findOrderForRestaurant(userId, orderId); if (!order) throw new HttpError(404, 'Order not found'); return order; },
  async transitionRestaurantOrder(userId, orderId, targetStatus, note) {
    const current = await this.getRestaurantOrder(userId, orderId);
    const allowed = restaurantOrderTransitions[current.status] ?? new Set();
    if (!allowed.has(targetStatus)) throw new HttpError(409, `Order cannot move from ${current.status} to ${targetStatus}`);
    const result = await orderRepository.transitionRestaurantOrder(userId, orderId, targetStatus, note ?? defaultNote(targetStatus), targetStatus === 'CANCELLED' ? 'RESTAURANT_REJECTED' : null);
    if (result?.error === 'NOT_FOUND') throw new HttpError(404, 'Order not found');
    const order = await this.getRestaurantOrder(userId, orderId);
    await notify({ ...order, customerUserId: result.customerUserId, restaurantOwnerUserId: result.restaurantOwnerUserId, customerEmail: result.customerEmail }, notificationMessage(targetStatus));
    return { order, audit: { oldValues: current, newValues: order } };
  }
};

function handleCartResult(result) {
  const messages = { CUSTOMER_NOT_FOUND: [404, 'Customer profile not found'], RESTAURANT_UNAVAILABLE: [409, 'Restaurant is not accepting orders'], MENU_ITEM_UNAVAILABLE: [409, 'Menu item is unavailable'], VARIANT_UNAVAILABLE: [400, 'Variant is unavailable'] };
  if (result?.error) { const [status, message] = messages[result.error] ?? [400, 'Cart item is invalid']; throw new HttpError(status, message); }
}
function handleCheckoutResult(result) {
  if (result?.existing) return;
  const messages = { CUSTOMER_NOT_FOUND: [404, 'Customer profile not found'], ADDRESS_NOT_FOUND: [400, 'Delivery address not found'], CART_EMPTY: [409, 'Cart is empty'], CART_ITEM_UNAVAILABLE: [409, 'One or more menu items are unavailable'], MINIMUM_ORDER_NOT_MET: [400, `Minimum order is ${result.minimumOrder}`], PROMOTION_INVALID: [400, 'Promotion is invalid or expired'] };
  if (result?.error) { const [status, message] = messages[result.error] ?? [400, 'Checkout cannot be completed']; throw new HttpError(status, message); }
}
function mapCartError(error) { if (error?.message === 'REQUIRED_TOPPINGS_MISSING' || error?.message === 'TOPPING_SELECTION_INVALID') return new HttpError(400, 'Topping selection does not meet the group limits'); if (error?.message === 'TOPPING_UNAVAILABLE') return new HttpError(400, 'One or more toppings are unavailable'); return error; }
function mapCheckoutError(error) { if (error?.code === 'ER_DUP_ENTRY') return new HttpError(409, 'Checkout was already submitted with this idempotency key'); if (error?.message === 'REQUIRED_TOPPINGS_MISSING' || error?.message === 'TOPPING_SELECTION_INVALID') return new HttpError(400, 'Topping selection does not meet the group limits'); if (error?.message === 'TOPPING_UNAVAILABLE') return new HttpError(400, 'One or more toppings are unavailable'); return error; }
function normalizeStatus(value) { if (value === undefined || value === null || value === '') return null; const status = String(value).trim().toUpperCase(); return status; }
async function notify(order, message) { try { await notificationService.notifyOrderStatus({ orderId: order.id, orderCode: order.orderCode, status: order.status ?? order.orderStatus, customerUserId: order.customerUserId, restaurantOwnerUserId: order.restaurantOwnerUserId, email: order.customerEmail, message }); } catch (error) { console.warn('Could not publish order notification:', error.message); } }
function defaultNote(status) { return status === 'CONFIRMED' ? 'Restaurant confirmed order' : status === 'PREPARING' ? 'Kitchen started preparing order' : status === 'READY_FOR_PICKUP' ? 'Order is ready for pickup' : 'Restaurant rejected order'; }
function notificationMessage(status) { return status === 'CANCELLED' ? 'Restaurant rejected the order.' : defaultNote(status); }
