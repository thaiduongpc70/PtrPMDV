import assert from 'node:assert/strict';
import test from 'node:test';
import { CUSTOMER_NOTICE, ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_NOTE, OWNER_NOTICE, customerNotice, ownerNotice, statusLabel, statusNote } from '../src/shared/i18n/order-texts.js';

const english = /\b(Order|order|Restaurant|restaurant|Kitchen|was placed|is now|updated|rejected)\b/;

test('bảng mẫu phủ đủ mọi trạng thái đơn (nhãn, ghi chú, thông báo khách, thông báo chủ quán)', () => {
  for (const status of ORDER_STATUSES) {
    assert.ok(ORDER_STATUS_LABEL[status], `thiếu nhãn ${status}`);
    assert.ok(ORDER_STATUS_NOTE[status], `thiếu ghi chú ${status}`);
    assert.equal(typeof CUSTOMER_NOTICE[status], 'function', `thiếu thông báo khách ${status}`);
    assert.equal(typeof OWNER_NOTICE[status], 'function', `thiếu thông báo chủ quán ${status}`);
  }
  assert.deepEqual(Object.keys(ORDER_STATUS_LABEL).sort(), [...ORDER_STATUSES].sort());
});
test('không còn tiếng Anh trong câu chữ mẫu, mọi thông báo có mã đơn', () => {
  for (const status of ORDER_STATUSES) {
    for (const text of [statusNote(status), statusLabel(status), customerNotice(status, 'FD-1'), ownerNotice(status, 'FD-1')]) assert.doesNotMatch(text, english, text);
    assert.match(customerNotice(status, 'FD-1'), /FD-1/);
    assert.match(ownerNotice(status, 'FD-1'), /FD-1/);
  }
});
test('ghi chú theo yêu cầu: tạo đơn, quán xác nhận', () => {
  assert.equal(statusNote('PENDING'), 'Đơn hàng được tạo');
  assert.equal(statusNote('CONFIRMED'), 'Quán đã xác nhận đơn');
});
test('trạng thái lạ có câu dự phòng tiếng Việt', () => {
  assert.match(customerNotice('NEW_STATE', 'FD-2'), /FD-2/);
  assert.doesNotMatch(statusNote('NEW_STATE'), english);
});
