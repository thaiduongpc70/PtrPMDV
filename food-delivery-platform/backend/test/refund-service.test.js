import assert from 'node:assert/strict';
import test from 'node:test';
import { closeOpenPayments, createRefund, orderPaymentStatusAfter, refundableRemaining, setRefundStatus } from '../src/modules/payments/refund-service.js';
import { staleKitchenReason } from '../src/modules/jobs/stale-reasons.js';

/* Kết nối giả giữ trạng thái trong bộ nhớ. */
function fakeDb({ paid = 100000, refunds = [], paymentStatus = 'PAID' } = {}) {
  const state = { refunds: refunds.map(r => ({ ...r })), payments: [{ id: 1, amount: paid, status: paymentStatus }], order: { id: 9, payment_status: 'PAID', order_status: 'CANCELLED' }, log: [] };
  const connection = {
    async execute(sql, params = []) {
      const text = sql.replace(/\s+/g, ' ').trim();
      state.log.push(text);
      if (text.startsWith('UPDATE orders SET payment_status')) { state.order.payment_status = params[0]; return { affectedRows: 1 }; }
      if (text.startsWith("UPDATE payments SET status = 'REFUNDED'")) { state.payments.forEach(p => { if (p.status === 'PAID') p.status = 'REFUNDED'; }); return { affectedRows: 1 }; }
      if (text.startsWith('UPDATE payments SET status = ?')) return { affectedRows: 2 };
      if (text.startsWith('UPDATE refunds')) { state.refunds.find(r => r.id === params[2]).status = params[0]; return { affectedRows: 1 }; }
      if (text.startsWith('INSERT INTO refunds')) { const id = state.refunds.length + 1; state.refunds.push({ id, amount: params[2], status: 'PENDING' }); return { insertId: id }; }
      if (text.startsWith('SELECT id, order_id FROM refunds')) return state.refunds.filter(r => r.id === params[0]).map(r => ({ id: r.id, order_id: 9 }));
      if (text.includes('FROM refunds')) return state.refunds.map(r => ({ ...r }));
      if (text.includes('FROM payments')) return state.payments.filter(p => ['PAID', 'REFUNDED'].includes(p.status));
      if (text.includes('FROM orders')) return [state.order];
      return [];
    }
  };
  return { state, connection };
}
const conflict = error => error.statusCode === 409;

test('refundableRemaining tính cả PENDING/PROCESSING/COMPLETED, bỏ REJECTED/FAILED', () => {
  const list = [{ id: 1, amount: 40000, status: 'COMPLETED' }, { id: 2, amount: 20000, status: 'PENDING' }, { id: 3, amount: 99999, status: 'REJECTED' }];
  assert.equal(refundableRemaining(100000, list), 40000);
  assert.equal(refundableRemaining(100000, list, 2), 60000);
  assert.equal(refundableRemaining(0, list), 0);
});
test('orderPaymentStatusAfter: đủ -> REFUNDED, một phần -> PARTIALLY_REFUNDED, 0 -> giữ nguyên', () => {
  assert.equal(orderPaymentStatusAfter(100000, 100000), 'REFUNDED');
  assert.equal(orderPaymentStatusAfter(100000, 30000), 'PARTIALLY_REFUNDED');
  assert.equal(orderPaymentStatusAfter(100000, 0), null);
});
test('createRefund khoá đơn trước khi đọc và chặn yêu cầu thứ hai (hoàn trùng)', async () => {
  const { connection, state } = fakeDb();
  const first = await createRefund(connection, { orderId: 9 });
  assert.equal(first.amount, 100000);
  assert.match(state.log[0], /FROM orders WHERE id = \? FOR UPDATE/);
  await assert.rejects(createRefund(connection, { orderId: 9 }), conflict);
  assert.equal(await createRefund(connection, { orderId: 9, soft: true }), null);
  assert.equal(state.refunds.length, 1);
});
test('createRefund: hoàn một phần tới đúng số đã trả, lần vượt bị từ chối', async () => {
  const { connection } = fakeDb();
  await createRefund(connection, { orderId: 9, amount: 30000 });
  await assert.rejects(createRefund(connection, { orderId: 9, amount: 80000 }), conflict);
  assert.equal((await createRefund(connection, { orderId: 9, amount: 70000 })).amount, 70000);
  await assert.rejects(createRefund(connection, { orderId: 9, amount: 1 }), conflict);
});
test('createRefund: đơn chưa thanh toán -> 409', async () => {
  const { connection } = fakeDb({ paymentStatus: 'PENDING' });
  await assert.rejects(createRefund(connection, { orderId: 9 }), conflict);
});
test('hoàn đủ -> đơn và giao dịch REFUNDED; hoàn một phần -> PARTIALLY_REFUNDED, giao dịch vẫn PAID', async () => {
  const full = fakeDb({ refunds: [{ id: 1, amount: 100000, status: 'PENDING' }] });
  await setRefundStatus(full.connection, { refundId: 1, status: 'COMPLETED' });
  assert.equal(full.state.order.payment_status, 'REFUNDED');
  assert.equal(full.state.payments[0].status, 'REFUNDED');
  const part = fakeDb({ refunds: [{ id: 1, amount: 40000, status: 'PENDING' }] });
  await setRefundStatus(part.connection, { refundId: 1, status: 'COMPLETED' });
  assert.equal(part.state.order.payment_status, 'PARTIALLY_REFUNDED');
  assert.equal(part.state.payments[0].status, 'PAID');
});
test('không hoàn tất bản trùng; COMPLETED bất biến; mở lại REJECTED khi đã hoàn đủ bị chặn', async () => {
  const { connection } = fakeDb({ refunds: [{ id: 1, amount: 100000, status: 'COMPLETED' }, { id: 2, amount: 100000, status: 'REJECTED' }, { id: 3, amount: 100000, status: 'PENDING' }] });
  await assert.rejects(setRefundStatus(connection, { refundId: 3, status: 'COMPLETED' }), conflict);
  await assert.rejects(setRefundStatus(connection, { refundId: 2, status: 'PROCESSING' }), conflict);
  await assert.rejects(setRefundStatus(connection, { refundId: 1, status: 'REJECTED' }), conflict);
  assert.equal((await setRefundStatus(connection, { refundId: 1, status: 'COMPLETED' })).unchanged, true);
  assert.equal((await setRefundStatus(connection, { refundId: 3, status: 'REJECTED' })).status, 'REJECTED');
});
test('closeOpenPayments chỉ đổi giao dịch PENDING/PROCESSING', async () => {
  const { connection, state } = fakeDb();
  assert.equal(await closeOpenPayments(connection, 9, 'CANCELLED'), 2);
  assert.match(state.log.at(-2), /status IN \('PENDING', 'PROCESSING'\)/);
  assert.match(state.log.at(-1), /^UPDATE orders SET payment_status = \? WHERE id = \? AND payment_status = 'PENDING'$/);
});
test('lý do tự huỷ dùng nhãn tiếng Việt, không còn mã trạng thái, không lặp "Đơn"', () => {
  for (const status of ['PREPARING', 'READY_FOR_PICKUP', 'SHIPPER_ASSIGNED']) {
    const text = staleKitchenReason(status, 180, true);
    assert.doesNotMatch(text, /PREPARING|READY_FOR_PICKUP|SHIPPER_ASSIGNED|^Đơn/);
    assert.match(text, /hoàn tiền$/);
  }
});
