import assert from 'node:assert/strict';
import test from 'node:test';
import { DELIVERY_STATUSES, KITCHEN_STATUSES, sweepStaleOrders } from '../src/modules/jobs/order-sweeper.js';

const base = { notifyFn: async () => {}, expire: async () => 0 };

test('dọn đơn: ngưỡng 0 tắt từng nhóm, không truy vấn', async () => {
  let calls = 0;
  const result = await sweepStaleOrders({ ...base, kitchenMinutes: 0, deliveryMinutes: 0, findStale: async () => { calls += 1; return []; } });
  assert.equal(calls, 0);
  assert.deepEqual(result, { cancelled: [], failed: [], expiredPromotions: 0 });
});

test('dọn đơn: khâu bếp -> huỷ; khâu giao -> thất bại; đúng nhóm trạng thái và ngưỡng', async () => {
  const asked = [];
  const result = await sweepStaleOrders({
    ...base, kitchenMinutes: 180, deliveryMinutes: 240,
    findStale: async (statuses, minutes) => { asked.push([statuses, minutes]); return statuses === KITCHEN_STATUSES ? [{ id: 1, order_code: 'K1' }, { id: 2, order_code: 'K2' }] : [{ id: 3, order_code: 'D1' }]; },
    cancelKitchen: async id => (id === 2 ? null : { orderId: id, orderCode: `K${id}`, message: 'x' }),
    failDelivery: async id => ({ orderId: id, orderCode: `D${id - 2}`, message: 'y' })
  });
  assert.deepEqual(asked, [[KITCHEN_STATUSES, 180], [DELIVERY_STATUSES, 240]]);
  assert.deepEqual(KITCHEN_STATUSES, ['PREPARING', 'READY_FOR_PICKUP', 'SHIPPER_ASSIGNED']);
  assert.deepEqual(DELIVERY_STATUSES, ['PICKED_UP', 'DELIVERING']);
  assert.deepEqual(result.cancelled, ['K1']);
  assert.deepEqual(result.failed, ['D1']);
});

test('dọn đơn: lỗi một đơn không chặn đơn khác; voucher quá hạn được chuyển EXPIRED', async () => {
  const notified = [];
  const result = await sweepStaleOrders({
    kitchenMinutes: 60, deliveryMinutes: 0,
    findStale: async () => [{ id: 1, order_code: 'A' }, { id: 2, order_code: 'B' }],
    cancelKitchen: async id => { if (id === 1) throw new Error('deadlock'); return { orderId: id, orderCode: 'B', message: 'm' }; },
    notifyFn: async item => { notified.push(item.orderCode); },
    expire: async () => 34
  });
  assert.deepEqual(result.cancelled, ['B']);
  assert.deepEqual(notified, ['B']);
  assert.equal(result.expiredPromotions, 34);
});

test('lỗi khi chuyển voucher hết hạn không làm hỏng lượt dọn', async () => {
  const result = await sweepStaleOrders({ ...base, kitchenMinutes: 0, deliveryMinutes: 0, findStale: async () => [], expire: async () => { throw new Error('db'); } });
  assert.equal(result.expiredPromotions, 0);
});
