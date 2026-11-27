import assert from 'node:assert/strict';
import test from 'node:test';
import { cancelExpiredPendingOrders, cancelOrderInTransaction } from '../src/modules/orders/order-cancellation.js';

test('job tự huỷ: tắt khi số phút = 0, không đụng DB', async () => {
  let called = false;
  const result = await cancelExpiredPendingOrders({ minutes: 0, findExpired: async () => { called = true; return []; } });
  assert.deepEqual(result, []);
  assert.equal(called, false);
});

test('job tự huỷ: huỷ từng đơn quá hạn, bỏ qua đơn vừa được xác nhận, lỗi một đơn không chặn các đơn khác', async () => {
  const cancelled = [];
  const notified = [];
  const result = await cancelExpiredPendingOrders({
    minutes: 30,
    findExpired: async minutes => { assert.equal(minutes, 30); return [{ id: 1, order_code: 'A' }, { id: 2, order_code: 'B' }, { id: 3, order_code: 'C' }, { id: 4, order_code: 'D' }]; },
    cancel: async (id, minutes) => {
      assert.equal(minutes, 30);
      if (id === 2) return null; // quán vừa xác nhận
      if (id === 3) throw new Error('deadlock');
      cancelled.push(id);
      return { orderId: id, orderCode: id === 1 ? 'A' : 'D', message: 'x' };
    },
    notify: async item => { notified.push(item.orderId); if (item.orderId === 1) throw new Error('mail down'); }
  });
  assert.deepEqual(result, ['A', 'D']);
  assert.deepEqual(cancelled, [1, 4]);
  assert.deepEqual(notified, [1, 4]);
});

test('luồng huỷ dùng chung: SYSTEM_TIMEOUT, người huỷ = hệ thống, đơn đã thanh toán sinh yêu cầu hoàn tiền', async () => {
  const calls = [];
  const connection = {
    async execute(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (sql.includes('FROM payments')) return [{ id: 77, amount: 125000, status: 'PAID' }];
      if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) return [{ id: params[0], payment_status: 'PAID' }];
      if (sql.includes('INSERT INTO refunds')) return { insertId: 1 };
      return [];
    }
  };
  const unpaid = await cancelOrderInTransaction(connection, { id: 5, payment_status: 'PENDING', total_amount: 100000 }, { actorUserId: null, reasonCode: 'SYSTEM_TIMEOUT', reason: 'hết hạn' });
  assert.deepEqual(unpaid, { orderId: 5, status: 'CANCELLED', refundAmount: 0 });
  const cancellation = calls.find(call => call.sql.startsWith('INSERT INTO order_cancellations'));
  assert.deepEqual(cancellation.params, [5, null, 'SYSTEM_TIMEOUT', 'hết hạn', 0]);
  assert.equal(calls.some(call => call.sql.startsWith('INSERT INTO refunds')), false);
  assert.ok(calls.some(call => call.sql.includes("order_status = 'CANCELLED'")));

  calls.length = 0;
  const paid = await cancelOrderInTransaction(connection, { id: 6, payment_status: 'PAID', total_amount: 125000 }, { actorUserId: 9, reasonCode: 'CUSTOMER_CHANGED_MIND', reason: null });
  assert.equal(paid.refundAmount, 125000);
  const refund = calls.find(call => call.sql.startsWith('INSERT INTO refunds'));
  assert.deepEqual(refund.params, [6, 77, 125000, null, 9]);
});

test('job tự huỷ tìm MỌI đơn PENDING quá hạn, kể cả đã thanh toán (lỗi đơn #45688)', async () => {
  const { findExpiredPendingOrders } = await import('../src/modules/orders/order-cancellation.js');
  const calls = [];
  await findExpiredPendingOrders(30, 50, async (sql, params) => { calls.push({ sql, params }); return []; });
  assert.match(calls[0].sql, /order_status = 'PENDING'/);
  assert.doesNotMatch(calls[0].sql, /payment_status/);
  assert.deepEqual(calls[0].params, [30, 50]);
});
test('lý do tự huỷ đơn đã trả tiền nói rõ sẽ hoàn tiền; chưa trả thì không', async () => {
  const { pendingTimeoutReason } = await import('../src/modules/orders/order-cancellation.js');
  assert.match(pendingTimeoutReason(30, true), /hệ thống tự huỷ đơn và hoàn tiền$/);
  assert.match(pendingTimeoutReason(30, false), /hệ thống tự huỷ đơn$/);
});
