import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { HISTORY_MAP, NOTIFICATION_MESSAGES, translateMessage, translateTitle } from '../scripts/lib/legacy-translations.mjs';

test('dịch đúng mẫu, giữ mã đơn', () => {
  assert.equal(translateTitle('Order FD-MV6PXR45-8F5Y4 updated'), 'Đơn FD-MV6PXR45-8F5Y4 có cập nhật');
  assert.equal(translateMessage('Order FD-AB1-C2 was placed and is waiting for restaurant confirmation.'), 'Đơn FD-AB1-C2 đã được đặt và đang chờ quán xác nhận.');
  assert.equal(translateMessage('Restaurant confirmed order'), 'Quán đã xác nhận đơn hàng.');
});
test('câu không khớp CHÍNH XÁC giữ nguyên', () => {
  for (const text of ['Order FD-1 updated by admin', 'order FD-AB updated', 'Order XYZ updated', 'Restaurant confirmed order!', 'Đơn FD-1 đã xong', '', 'Order created extra']) {
    assert.equal(translateTitle(text), text);
    assert.equal(translateMessage(text), text);
  }
});
test('bảng dịch không trùng và đích là tiếng Việt', () => {
  for (const [from, to] of [...HISTORY_MAP, ...NOTIFICATION_MESSAGES]) { assert.match(to, /[À-ỹĐđ]/, from); assert.notEqual(from, to); }
  assert.equal(new Set(HISTORY_MAP.map(([from]) => from)).size, HISTORY_MAP.length);
});
test('trigger trong migration và file SQL gốc ghi tiếng Việt', () => {
  const migration = readFileSync(new URL('../database/migrations/20261127_vietnamese_trigger_note.sql', import.meta.url), 'utf8');
  const root = readFileSync(new URL('../../../food_delivery_db.sql', import.meta.url), 'utf8');
  assert.match(migration, /Hệ thống tự ghi nhận chuyển trạng thái/);
  assert.ok(!root.includes("'Status automatically recorded by trigger'"));
  assert.ok(root.includes('Hệ thống tự ghi nhận chuyển trạng thái'));
  const byStatus = readFileSync(new URL('../database/migrations/20261127b_trigger_note_by_status.sql', import.meta.url), 'utf8');
  for (const text of [byStatus, root]) for (const note of ['Tài xế đã lấy món', 'Đang giao hàng', 'Đã giao thành công', 'Giao hàng thất bại']) assert.ok(text.includes(note), note);
});
