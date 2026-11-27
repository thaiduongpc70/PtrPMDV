import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRestaurantTransition } from '../src/modules/orders/order.repository.js';
import { menuRepository } from '../src/modules/menus/menu.repository.js';
import { menuService } from '../src/modules/menus/menu.service.js';
import { createExport } from '../src/modules/jobs/job.service.js';
import { M } from '../src/shared/http/messages.js';
import { assertAssignable, assertOwnAvailabilityChange, checkDeliveryTransition } from '../src/modules/operations/delivery-rules.js';
import { collectCod, settleCod } from '../src/modules/payments/cod-service.js';
import { assertOwnDelivery } from '../src/modules/operations/operations.routes.js';

/* Các lỗi phát hiện khi chạy toàn bộ collection Postman trên DB bản sao (đợt 21). */

test('quán từ chối đơn chỉ ghi order_cancellations đúng một lần', async () => {
  const statements = [];
  const connection = { async execute(sql) { statements.push(sql.replace(/\s+/g, ' ').trim()); return []; } };
  await applyRestaurantTransition(connection, { id: 41, payment_status: 'PENDING', order_status: 'PENDING' }, { userId: 9, orderId: 41, targetStatus: 'CANCELLED', note: 'Hết món' });
  assert.equal(statements.filter(sql => sql.startsWith('INSERT INTO order_cancellations')).length, 1);
  assert.equal(statements.filter(sql => sql.startsWith('UPDATE orders SET order_status')).length, 1);
});

test('quán xác nhận đơn ghi mốc thời gian và không đụng order_cancellations', async () => {
  const statements = [];
  const connection = { async execute(sql) { statements.push(sql); return []; } };
  await applyRestaurantTransition(connection, { id: 41 }, { userId: 9, orderId: 41, targetStatus: 'CONFIRMED', note: 'ok' });
  assert.ok(statements.some(sql => sql.includes('confirmed_at = CURRENT_TIMESTAMP')));
  assert.ok(!statements.some(sql => sql.includes('order_cancellations')));
});

test('PATCH size/topping/nhóm topping chỉ đổi trường được gửi', async t => {
  const saved = {};
  const group = { id: 3, name: 'Topping', minSelect: 1, maxSelect: 3, required: true };
  stub(t, menuRepository, {
    async findRestaurantForOwner() { return { id: 1 }; },
    async findItem() { return { id: 2 }; },
    async findToppingGroup() { return group; },
    async listVariants() { return [{ id: 4, name: 'Lớn', priceAdjustment: 5000, status: 'ACTIVE' }]; },
    async listToppings() { return [{ id: 5, name: 'Trứng', price: 8000, status: 'INACTIVE' }]; },
    async listToppingGroups() { return [group]; },
    async updateVariant(id, itemId, data) { saved.variant = data; },
    async updateTopping(id, groupId, data) { saved.topping = data; },
    async updateToppingGroup(id, restaurantId, data) { saved.group = data; }
  });
  await menuService.updateVariant(9, 1, 2, 4, { priceAdjustment: 7000 });
  await menuService.updateTopping(9, 1, 3, 5, { price: 9000 });
  await menuService.updateToppingGroup(9, 1, 3, { name: 'Topping mới' });
  assert.deepEqual(saved.variant, { name: 'Lớn', priceAdjustment: 7000, status: 'ACTIVE' });
  assert.deepEqual(saved.topping, { name: 'Trứng', price: 9000, status: 'INACTIVE' });
  assert.deepEqual(saved.group, { name: 'Topping mới', minSelect: 1, maxSelect: 3, required: true });
});

test('gắn nhóm topping và đặt thành phần combo trả nội dung phản hồi', async t => {
  stub(t, menuRepository, {
    async findRestaurantForOwner() { return { id: 1 }; },
    async findItem() { return { id: 2 }; },
    async listToppingGroups() { return [{ id: 3 }]; },
    async linkToppingGroups() { return true; },
    async setComboComponents() { return {}; }
  });
  assert.deepEqual((await menuService.linkToppingGroups(9, 1, 2, { groupIds: [3] })).value, { itemId: 2, groupIds: [3] });
  assert.deepEqual((await menuService.setCombo(9, 1, 2, { components: [{ itemId: 7, quantity: 2 }] })).value, { itemId: 2, components: [{ itemId: 7, quantity: 2 }] });
});

test('loại dữ liệu xuất không hỗ trợ bị từ chối 400 trước khi tạo job', async () => {
  await assert.rejects(() => createExport({ userId: 1, exportType: 'XXX' }), error => error.statusCode === 400);
});

function codDb(row) {
  const writes = [];
  return { writes, connection: { async execute(sql) { if (sql.startsWith('SELECT')) return row ? [{ ...row }] : []; writes.push(sql); return { affectedRows: 1 }; } } };
}

test('COD: tài xế khác không được thu, giao dịch đã đối soát không bị kéo ngược', async () => {
  const other = codDb({ id: 1, shipper_id: 2, status: 'PENDING' });
  await assert.rejects(() => collectCod(other.connection, 1, { shipperId: 3 }), error => error.statusCode === 403);
  const settled = codDb({ id: 1, shipper_id: 2, status: 'SETTLED' });
  await assert.rejects(() => collectCod(settled.connection, 1, { shipperId: 2 }), error => error.statusCode === 409);
  assert.equal(other.writes.length + settled.writes.length, 0);
  await assert.rejects(() => collectCod(codDb(null).connection, 9), error => error.statusCode === 404);
});

test('COD: chỉ đối soát giao dịch đã thu; thu/đối soát lặp lại không ghi đè mốc thời gian', async () => {
  const pending = codDb({ id: 1, shipper_id: 2, status: 'PENDING' });
  await assert.rejects(() => settleCod(pending.connection, 1), error => error.statusCode === 409);
  assert.equal((await collectCod(pending.connection, 1, { shipperId: 2 })).status, 'COLLECTED');
  assert.equal(pending.writes.length, 1);
  const done = codDb({ id: 1, shipper_id: 2, status: 'COLLECTED' });
  await collectCod(done.connection, 1);
  assert.equal(done.writes.length, 0);
  assert.equal((await settleCod(done.connection, 1)).status, 'SETTLED');
});

test('GPS: không ghi vị trí vào chuyến giao của tài xế khác', async () => {
  await assert.rejects(() => assertOwnDelivery(async () => [], 5, 2), error => error.statusCode === 404);
  await assertOwnDelivery(async () => [{ id: 5 }], 5, 2);
});

test('chỉ phân công tài xế khi món sẵn sàng; đơn đóng hoặc chưa xác nhận bị từ chối', () => {
  for (const status of ['READY_FOR_PICKUP', 'SHIPPER_ASSIGNED']) assertAssignable(status);
  for (const status of ['PENDING', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'CANCELLED', 'FAILED']) {
    assert.throws(() => assertAssignable(status), error => error.statusCode === 409, status);
  }
});

test('chuyến giao không đi lùi, không nhảy bước lấy hàng, không đổi đơn đã đóng', () => {
  assert.equal(checkDeliveryTransition('ACCEPTED', 'SHIPPER_ASSIGNED', 'PICKED_UP'), false);
  assert.equal(checkDeliveryTransition('PICKED_UP', 'PICKED_UP', 'DELIVERING'), false);
  assert.equal(checkDeliveryTransition('DELIVERING', 'DELIVERING', 'DELIVERED'), false);
  assert.equal(checkDeliveryTransition('DELIVERED', 'DELIVERED', 'DELIVERED'), true);
  for (const [delivery, order, next] of [['DELIVERED', 'DELIVERED', 'DELIVERING'], ['CANCELLED', 'CANCELLED', 'DELIVERED'], ['ASSIGNED', 'SHIPPER_ASSIGNED', 'DELIVERED'], ['PICKED_UP', 'CANCELLED', 'DELIVERED'], ['FAILED', 'FAILED', 'DELIVERED']]) {
    assert.throws(() => checkDeliveryTransition(delivery, order, next), error => error.statusCode === 409, `${delivery}->${next}`);
  }
});

test('tài xế bị tạm khoá không tự mở khoá được', () => {
  assert.throws(() => assertOwnAvailabilityChange('SUSPENDED', 'AVAILABLE'), error => error.statusCode === 403);
  assert.throws(() => assertOwnAvailabilityChange('AVAILABLE', 'SUSPENDED'), error => error.statusCode === 403);
  assertOwnAvailabilityChange('OFFLINE', 'AVAILABLE');
});

function stub(t, target, methods) {
  const originals = new Map();
  for (const [name, implementation] of Object.entries(methods)) { originals.set(name, target[name]); target[name] = implementation; }
  t.after(() => { for (const [name, original] of originals) target[name] = original; });
}

test('thông báo trạng thái tài khoản không lộ mã trạng thái tiếng Anh', () => {
  for (const status of ['PENDING', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'KHAC']) assert.doesNotMatch(M.accountStatus(status), /[A-Z]{4,}/);
  assert.match(M.accountStatus('PENDING'), /chờ duyệt/);
});
