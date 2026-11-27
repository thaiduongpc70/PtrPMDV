import assert from 'node:assert/strict';
import test from 'node:test';
import { ageOn, alcoholicNames, checkAgeRule, isAlcoholic } from '../src/modules/orders/alcohol-rules.js';
import { validateCheckout } from '../src/modules/orders/order.validation.js';

test('isAlcoholic: nhận diện bia/rượu rõ ràng, không nhầm món khác', () => {
  for (const yes of ['Bia lon Tiger', 'Bia Heineken', 'Rượu vang đỏ', 'Soju đào', 'Cocktail mojito', 'Tiger bạc']) assert.equal(isAlcoholic(yes), true, yes);
  for (const no of ['Bò bía', 'Cơm rượu nếp', 'Hủ tiếu Nam Vang', 'Nước ngọt Pepsi', 'Trà đào', 'Bánh mì', '', null]) assert.equal(isAlcoholic(no), false, String(no));
});
test('alcoholicNames: lọc và khử trùng', () => {
  assert.deepEqual(alcoholicNames(['Bia lon Tiger', 'Bia lon Tiger', 'Phở bò']), ['Bia lon Tiger']);
});
test('ageOn: tính tuổi tròn', () => {
  const now = new Date('2026-11-24T00:00:00Z');
  assert.equal(ageOn('2008-11-25', now), 17);
  assert.equal(ageOn('2008-11-24', now), 18);
  assert.equal(ageOn(null, now), null);
});
test('checkAgeRule: thiếu xác nhận bị chặn, có xác nhận được đặt, hồ sơ dưới 18 bị từ chối kể cả có xác nhận', () => {
  const now = new Date('2026-11-24T00:00:00Z');
  const items = ['Phở bò', 'Bia lon Tiger'];
  assert.equal(checkAgeRule({ itemNames: items, ageConfirmed: false, now }), 'AGE_CONFIRMATION_REQUIRED');
  assert.equal(checkAgeRule({ itemNames: items, ageConfirmed: true, now }), null);
  assert.equal(checkAgeRule({ itemNames: items, ageConfirmed: true, dateOfBirth: '2012-01-01', now }), 'UNDER_AGE');
  assert.equal(checkAgeRule({ itemNames: ['Phở bò'], ageConfirmed: false, now }), null);
});
test('validateCheckout: ageConfirmed mặc định false, nhận true', () => {
  assert.equal(validateCheckout({ restaurantId: 1, addressId: 1 }).ageConfirmed, false);
  assert.equal(validateCheckout({ restaurantId: 1, addressId: 1, ageConfirmed: true }).ageConfirmed, true);
});

test('combo chứa bia: tên thành phần được tính vào kiểm tra 18 tuổi', async () => {
  const { loadComboComponentNames } = await import('../src/modules/orders/order.repository.js');
  const calls = [];
  const exec = async (sql, params) => { calls.push({ sql, params }); return [{ name: 'Lẩu ly bò Mỹ' }, { name: 'Bia lon Tiger' }]; };
  const components = await loadComboComponentNames(exec, [4668, '4669', 4668, null]);
  assert.deepEqual(calls[0].params, [4668, 4669]);
  assert.match(calls[0].sql, /menu_item_combo_components/);
  const names = ['Combo 2 người', ...components];
  assert.equal(checkAgeRule({ itemNames: names, ageConfirmed: false }), 'AGE_CONFIRMATION_REQUIRED');
  assert.equal(checkAgeRule({ itemNames: names, ageConfirmed: true }), null);
  // tên combo thường không có "bia" nên chỉ nhìn tên dòng giỏ là KHÔNG đủ
  assert.equal(checkAgeRule({ itemNames: ['Combo 2 người'], ageConfirmed: false }), null);
  assert.deepEqual(await loadComboComponentNames(exec, []), []);
});
