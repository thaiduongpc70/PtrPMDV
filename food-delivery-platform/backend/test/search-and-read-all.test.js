import assert from 'node:assert/strict';
import test from 'node:test';
import { readSearchTerm } from '../src/shared/http/search-param.js';
import { notificationService } from '../src/modules/notifications/notification.service.js';
import { notificationRepository } from '../src/modules/notifications/notification.repository.js';

test('readSearchTerm: nhận search, keyword hoặc q; ưu tiên search; bỏ chuỗi rỗng/khoảng trắng', () => {
  assert.equal(readSearchTerm({ search: ' Minh ' }), 'Minh');
  assert.equal(readSearchTerm({ keyword: 'abc' }), 'abc');
  assert.equal(readSearchTerm({ q: '0901' }), '0901');
  assert.equal(readSearchTerm({ search: 'a', keyword: 'b', q: 'c' }), 'a');
  assert.equal(readSearchTerm({ search: '   ', keyword: 'k' }), 'k');
  assert.equal(readSearchTerm({ search: '' }), null);
  assert.equal(readSearchTerm({}), null);
  assert.equal(readSearchTerm(undefined), null);
});
test('readSearchTerm: bỏ qua giá trị không phải chuỗi (mảng/đối tượng) và cắt tối đa 200 ký tự', () => {
  assert.equal(readSearchTerm({ search: ['a', 'b'] }), null);
  assert.equal(readSearchTerm({ search: { $ne: 1 } }), null);
  assert.equal(readSearchTerm({ search: 'x'.repeat(500) }).length, 200);
});
test('đánh dấu tất cả đã đọc: chỉ của chính người dùng, trả số đã đổi và unreadCount mới', async () => {
  const original = { ...notificationRepository };
  const calls = [];
  Object.assign(notificationRepository, { markAllRead: async userId => { calls.push(userId); return 481; }, countForUser: async () => ({ total: 3962, unread: 0 }) });
  try {
    const result = await notificationService.markAllRead(27);
    assert.deepEqual(calls, [27]);
    assert.deepEqual(result, { updated: 481, unreadCount: 0, totalItems: 3962 });
  } finally { Object.assign(notificationRepository, original); }
});
test('markAllRead của repository chỉ UPDATE dòng chưa đọc của đúng user (không DELETE)', () => {
  const source = String(notificationRepository.markAllRead);
  assert.match(source, /UPDATE notifications SET is_read = TRUE/);
  assert.match(source, /user_id = \? AND is_read = FALSE/);
  assert.doesNotMatch(source, /DELETE/i);
});
