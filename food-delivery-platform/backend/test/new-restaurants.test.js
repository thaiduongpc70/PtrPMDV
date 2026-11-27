import test from 'node:test';
import assert from 'node:assert/strict';
import { NEW_RESTAURANTS, NEW_CATEGORIES } from '../scripts/data/new-restaurants.mjs';
import { ADDONS, SINGLE, VARIANT_SETS } from '../scripts/data/option-catalog.mjs';

const KNOWN_CATEGORIES = new Set(['Cơm', 'Bún - Phở', 'Đồ ăn nhanh', 'Gà rán', 'Pizza', 'Trà sữa', 'Đồ uống', 'Đồ ăn vặt', 'Đồ chay', 'Món Việt', ...NEW_CATEGORIES.map(([name]) => name)]);

test('quán mới: tài khoản, tên và số điện thoại không trùng nhau', () => {
  for (const field of [item => item.owner.username, item => item.owner.phone, item => item.name, item => item.key]) {
    const values = NEW_RESTAURANTS.map(field);
    assert.equal(new Set(values).size, values.length);
  }
});

test('quán mới: chỉ ở Hà Nội và Hưng Yên, toạ độ neo đúng vùng', () => {
  for (const restaurant of NEW_RESTAURANTS) {
    assert.ok(['HN', 'HY'].includes(restaurant.region));
    assert.equal(restaurant.city, restaurant.region === 'HN' ? 'Hà Nội' : 'Hưng Yên');
    const [lat] = restaurant.anchor;
    assert.equal(lat > 20.85, restaurant.region === 'HN', `${restaurant.name}: vĩ độ không khớp vùng`);
  }
  assert.ok(NEW_RESTAURANTS.filter(item => item.region === 'HN').length >= 10);
  assert.ok(NEW_RESTAURANTS.filter(item => item.region === 'HY').length >= 4);
});

test('quán mới: danh mục có thật, nhóm món/tuỳ chọn tham chiếu đúng', () => {
  for (const restaurant of NEW_RESTAURANTS) {
    assert.ok(KNOWN_CATEGORIES.has(restaurant.category), `${restaurant.name}: danh mục ${restaurant.category}`);
    assert.ok(restaurant.dishes.length >= 12, `${restaurant.name}: quá ít món`);
    const names = new Set();
    for (const [categoryIndex, name, price, description, options = {}] of restaurant.dishes) {
      assert.ok(restaurant.cats[categoryIndex], `${restaurant.name}/${name}: nhóm món không tồn tại`);
      assert.ok(price >= 5000 && price % 1000 === 0, `${name}: giá không hợp lệ`);
      assert.ok(description.length > 8);
      assert.ok(!names.has(name), `${restaurant.name}: trùng món ${name}`);
      names.add(name);
      if (options.v) assert.ok(VARIANT_SETS[options.v], `${name}: bộ size ${options.v}`);
      const addon = options.a !== undefined ? options.a : restaurant.cats[categoryIndex][1]?.a;
      if (addon) assert.ok(ADDONS[addon], `${name}: nhóm topping ${addon}`);
      for (const key of options.s ?? restaurant.cats[categoryIndex][1]?.s ?? []) assert.ok(SINGLE[key], `${name}: nhóm chọn 1 ${key}`);
    }
  }
});

test('tuỳ chọn: đồ uống có mức đường, đồ ăn không có mức đường/đá', () => {
  for (const restaurant of NEW_RESTAURANTS) {
    for (const [categoryIndex, name, , , options = {}] of restaurant.dishes) {
      const single = options.s ?? restaurant.cats[categoryIndex][1]?.s ?? [];
      const drink = /^(trà|cà phê|cacao|nước ép|soda|bạc xỉu|pepsi)/i.test(name);
      if (!drink) assert.ok(!single.includes('sugar') && !single.includes('ice'), `${restaurant.name}/${name}: món ăn không có mức đường/đá`);
    }
  }
});
