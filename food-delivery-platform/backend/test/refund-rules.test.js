import assert from 'node:assert/strict';
import test from 'node:test';
import { isRefundDue, needsReopen, stepsToComplete } from '../src/modules/jobs/refund-rules.js';

test('stepsToComplete: đi tới COMPLETED qua luồng hoàn thật', () => {
  assert.deepEqual(stepsToComplete('PENDING'), ['PROCESSING', 'COMPLETED']);
  assert.deepEqual(stepsToComplete('REJECTED'), ['PROCESSING', 'COMPLETED']);
  assert.deepEqual(stepsToComplete('PROCESSING'), ['COMPLETED']);
  assert.deepEqual(stepsToComplete('COMPLETED'), []);
});
test('isRefundDue: chỉ đơn huỷ/thất bại, chưa xong, quá ngưỡng; 0 = tắt', () => {
  const now = Date.parse('2026-11-24T12:00:00Z');
  const old = { status: 'PENDING', orderStatus: 'FAILED', createdAt: '2026-11-24T05:00:00Z' };
  assert.equal(isRefundDue(old, now, 240), true);
  assert.equal(isRefundDue(old, now, 0), false);
  assert.equal(isRefundDue({ ...old, createdAt: '2026-11-24T11:00:00Z' }, now, 240), false);
  assert.equal(isRefundDue({ ...old, status: 'COMPLETED' }, now, 240), false);
  assert.equal(isRefundDue({ ...old, status: 'REJECTED' }, now, 240), false);
  assert.equal(isRefundDue({ ...old, orderStatus: 'DELIVERED' }, now, 240), false);
});
test('needsReopen: REJECTED + đơn huỷ/thất bại đã PAID online', () => {
  const order = { orderStatus: 'CANCELLED', paymentStatus: 'PAID', paymentMethod: 'MOMO' };
  assert.equal(needsReopen({ status: 'REJECTED' }, order), true);
  assert.equal(needsReopen({ status: 'REJECTED' }, { ...order, paymentMethod: 'COD' }), false);
  assert.equal(needsReopen({ status: 'PENDING' }, order), false);
  assert.equal(needsReopen({ status: 'REJECTED' }, { ...order, orderStatus: 'DELIVERED' }), false);
});

test('readLimitOffset: limit ≤ 100, offset ≥ 0, giá trị sai -> 400 tiếng Việt', async () => {
  const { readLimitOffset } = await import('../src/shared/http/pagination.js');
  assert.deepEqual(readLimitOffset({}), { limit: 20, offset: 0 });
  assert.deepEqual(readLimitOffset({ limit: '100', offset: '40' }), { limit: 100, offset: 40 });
  assert.throws(() => readLimitOffset({ limit: '500' }), error => error.statusCode === 400 && /vượt/.test(error.message));
  for (const bad of [{ limit: '-5' }, { limit: '0' }, { limit: 'abc' }, { offset: 'abc' }, { offset: '-3' }, { limit: '1.5' }]) {
    assert.throws(() => readLimitOffset(bad), error => error.statusCode === 400 && /không hợp lệ/.test(error.message), JSON.stringify(bad));
  }
});
