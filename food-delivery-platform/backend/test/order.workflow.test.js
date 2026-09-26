import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationService } from '../src/modules/notifications/notification.service.js';
import { orderRepository } from '../src/modules/orders/order.repository.js';
import { orderService } from '../src/modules/orders/order.service.js';

test('checkout workflow returns an order and publishes an order notification', async t => {
  const calls = [];
  stub(t, orderRepository, {
    async checkoutForUser(userId, input) {
      assert.equal(userId, 7);
      assert.equal(input.paymentMethod, 'COD');
      calls.push(['checkout', input.idempotencyKey]);
      return { orderId: 41 };
    },
    async findOrderForCustomer(userId, orderId) {
      assert.equal(userId, 7); assert.equal(orderId, 41);
      return { id: 41, orderCode: 'FD-41', status: 'PENDING', customerUserId: 7, restaurantOwnerUserId: 9, customerEmail: 'customer@example.com', totalAmount: 45000 };
    }
  });
  stub(t, notificationService, { async notifyOrderStatus(input) { calls.push(['notification', input.status, input.orderId]); } });

  const result = await orderService.checkout(7, { restaurantId: 11, addressId: 3, paymentMethod: 'COD' }, 'retry-key-41');
  assert.equal(result.order.orderCode, 'FD-41');
  assert.deepEqual(calls, [['checkout', 'retry-key-41'], ['notification', 'PENDING', 41]]);
});

test('restaurant order workflow enforces PENDING to CONFIRMED to PREPARING to READY_FOR_PICKUP', async t => {
  let status = 'PENDING';
  const transitions = [];
  stub(t, orderRepository, {
    async findOrderForRestaurant() { return { id: 41, orderCode: 'FD-41', status, customerUserId: 7, restaurantOwnerUserId: 9, customerEmail: 'customer@example.com' }; },
    async transitionRestaurantOrder(userId, orderId, next) { transitions.push([userId, orderId, next]); status = next; return { customerUserId: 7, restaurantOwnerUserId: 9, customerEmail: 'customer@example.com' }; }
  });
  stub(t, notificationService, { async notifyOrderStatus() {} });

  await orderService.transitionRestaurantOrder(9, 41, 'CONFIRMED');
  await orderService.transitionRestaurantOrder(9, 41, 'PREPARING');
  await orderService.transitionRestaurantOrder(9, 41, 'READY_FOR_PICKUP');
  assert.deepEqual(transitions, [[9, 41, 'CONFIRMED'], [9, 41, 'PREPARING'], [9, 41, 'READY_FOR_PICKUP']]);
  await assert.rejects(() => orderService.transitionRestaurantOrder(9, 41, 'DELIVERED'), error => error.statusCode === 409);
});

test('restaurant cannot transition an order it does not own', async t => {
  stub(t, orderRepository, { async findOrderForRestaurant() { throw Object.assign(new Error('not found'), { statusCode: 404 }); } });
  await assert.rejects(() => orderService.transitionRestaurantOrder(9, 999, 'CONFIRMED'), error => error.statusCode === 404);
});

function stub(t, target, methods) {
  const originals = new Map();
  for (const [name, implementation] of Object.entries(methods)) { originals.set(name, target[name]); target[name] = implementation; }
  t.after(() => { for (const [name, original] of originals) target[name] = original; });
}
