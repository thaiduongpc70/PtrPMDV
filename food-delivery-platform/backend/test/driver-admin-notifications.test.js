import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationService } from '../src/modules/notifications/notification.service.js';
import { notificationRepository } from '../src/modules/notifications/notification.repository.js';
import { alertStaleRefunds } from '../src/modules/jobs/refund-sweeper.js';

const original = { ...notificationRepository };
function stub(overrides) { Object.assign(notificationRepository, overrides); }
test.afterEach(() => Object.assign(notificationRepository, original));

test('tài xế nhận thông báo "Bạn được giao đơn mới" (loại DELIVERY_ASSIGNED, tham chiếu đơn)', async () => {
  const created = [];
  stub({ shipperUserById: async () => ({ userId: 77, orderCode: 'FD-ABC' }), createOnce: async items => { created.push(...items); return items.length; } });
  await notificationService.notifyShipperAssigned({ orderId: 5, shipperId: 3 });
  assert.equal(created.length, 1);
  assert.equal(created[0].userId, 77);
  assert.equal(created[0].title, 'Bạn được giao đơn mới');
  assert.match(created[0].message, /FD-ABC/);
  assert.equal(created[0].type, 'DELIVERY');
  assert.equal(created[0].referenceId, 5);
});
test('tài xế cũ nhận thông báo khi đơn được chuyển cho người khác', async () => {
  const created = [];
  stub({ shipperUserById: async () => ({ userId: 11, orderCode: 'FD-X' }), createOnce: async items => { created.push(...items); return items.length; } });
  await notificationService.notifyShipperReassigned({ orderId: 9, previousShipperId: 2 });
  assert.equal(created[0].type, 'DELIVERY');
  assert.match(created[0].title, /chuyển cho tài xế khác/);
});
test('đơn bị huỷ: khách, chủ quán và tài xế đang giữ đơn đều được báo bằng thông báo tiếng Việt theo trạng thái', async () => {
  const once = [];
  stub({ shipperUserOfOrder: async () => ({ userId: 90, orderCode: 'FD-1' }), createOnce: async items => { once.push(...items); return items.length; } });
  await notificationService.notifyOrderStatus({ orderId: 1, orderCode: 'FD-1', status: 'CANCELLED', customerUserId: 10, restaurantOwnerUserId: 20 });
  assert.deepEqual(once.map(item => item.userId).sort((a, b) => a - b), [10, 20, 90]);
  assert.equal(once.find(item => item.userId === 10).title, 'Đơn FD-1: Đã huỷ');
  assert.match(once.find(item => item.userId === 90).message, /đã bị huỷ/);
  assert.equal(once.find(item => item.userId === 90).type, 'DELIVERY');
});
test('đơn đang giao bình thường (không huỷ) không phát sinh thông báo tài xế', async () => {
  const once = [];
  stub({ shipperUserOfOrder: async () => ({ userId: 90, orderCode: 'FD-1' }), createOnce: async items => { once.push(...items); return items.length; } });
  await notificationService.notifyOrderStatus({ orderId: 1, orderCode: 'FD-1', status: 'DELIVERING', customerUserId: 10, restaurantOwnerUserId: 20 });
  assert.deepEqual(once.map(item => item.userId).sort((a, b) => a - b), [10, 20]);
});
test('mọi trạng thái giao hàng có thông báo riêng cho khách (tiêu đề khác nhau => không bị coi là trùng)', async () => {
  const titles = new Set(); const messages = [];
  stub({ shipperUserOfOrder: async () => null, createOnce: async items => { for (const item of items) { titles.add(item.title); messages.push(item.message); } return items.length; } });
  for (const status of ['SHIPPER_ASSIGNED', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'CANCELLED', 'FAILED']) {
    await notificationService.notifyOrderStatus({ orderId: 3, orderCode: 'FD-3', status, customerUserId: 10, restaurantOwnerUserId: null, message: undefined });
  }
  assert.equal(titles.size, 6);
  assert.ok(messages.some(text => /tài xế nhận đơn/.test(text)));
  assert.ok(messages.some(text => /đang trên đường giao/.test(text)));
  assert.ok(messages.some(text => /giao thành công/.test(text)));
  assert.ok(messages.every(text => !/Order|updated/.test(text)));
});
test('job tự huỷ đơn quá hạn: cảnh báo MỌI quản trị viên một lần (type SYSTEM)', async () => {
  const once = [];
  stub({ createMany: async () => {}, shipperUserOfOrder: async () => null, adminUserIds: async () => [1, 2], createOnce: async items => { once.push(...items); return items.length; } });
  await notificationService.notifyOrderStatus({ orderId: 8, orderCode: 'FD-8', status: 'CANCELLED', customerUserId: 10, restaurantOwnerUserId: 20, alertAdmins: true });
  const alerts = once.filter(item => item.type === 'SYSTEM');
  assert.deepEqual(alerts.map(item => item.userId), [1, 2]);
  assert.match(alerts[0].title, /Hệ thống tự huỷ đơn FD-8/);
});
test('hoàn tiền PENDING lâu: cảnh báo admin, không gửi trùng, tắt khi minutes = 0', async () => {
  const alerts = [];
  const seen = new Set();
  const alert = async input => { const key = `${input.title}:${input.referenceId}`; if (seen.has(key)) return 0; seen.add(key); alerts.push(input); return 1; };
  const find = async () => [{ id: 7, order_id: 3, amount: 120000, order_code: 'FD-3' }];
  assert.equal(await alertStaleRefunds({ minutes: 120, windowDays: 2, find, alert }), 1);
  assert.equal(await alertStaleRefunds({ minutes: 120, windowDays: 2, find, alert }), 0);
  assert.equal(await alertStaleRefunds({ minutes: 0, windowDays: 2, find, alert }), 0);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, 'SYSTEM');
  assert.match(alerts[0].message, /FD-3/);
});
test('createOnce chặn trùng bằng NOT EXISTS theo người nhận + loại + đối tượng', async () => {
  const { query } = await import('../src/shared/database/mysql.js');
  assert.equal(typeof query, 'function');
  assert.match(String(original.createOnce), /NOT EXISTS/);
});
