import assert from 'node:assert/strict';
import test from 'node:test';
import { createRegistry, dishTags, makeUniqueComment, replyOpenerCount, replyVariantCount, shopOpenerCount, shopTag } from '../scripts/data/review-phrases.mjs';
import { violations } from '../scripts/lib/comment-checks.mjs';

const rng = seed => { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; };

test('gắn nhãn món: đồ uống, tráng miệng, món lạnh, món nóng, chay', () => {
  assert.deepEqual([dishTags('Trà vải hoa hồng').kind, dishTags('Trà vải hoa hồng').sub, dishTags('Trà vải hoa hồng').temp], ['drink', 'tea', 'cold']);
  assert.equal(dishTags('Tiramisu').kind, 'dessert');
  assert.equal(dishTags('Panna cotta').kind, 'dessert');
  assert.equal(dishTags('Chè hạt sen').kind, 'dessert');
  assert.equal(dishTags('Gỏi cuốn chay').temp, 'cold');
  assert.equal(dishTags('Gỏi ngó sen').temp, 'cold');
  assert.equal(dishTags('Phở bò tái').sub, 'soup');
  assert.equal(dishTags('Phở bò tái').temp, 'hot');
  assert.equal(dishTags('Bún chay riêu').veg, true);
  assert.equal(dishTags('Cà phê trứng').temp, 'hot');
  assert.equal(dishTags('Combo 2 ly', 'Đồ uống').kind, 'drink');
  assert.equal(dishTags('Cacao nóng').verb, 'uống');
  assert.equal(dishTags('Tokbokki phô mai').verb, 'ăn');
});

test('gắn nhãn quán: cà phê/trà → drink, chè/bánh kem → dessert, gỏi cuốn → fresh, còn lại hot', () => {
  assert.equal(shopTag('Trà sữa', 'Trà Sữa Lá Non'), 'drink');
  assert.equal(shopTag('Đồ uống', 'Cà Phê Gió Hồ Tây'), 'drink');
  assert.equal(shopTag('Bánh & Kem', 'Chè & Kem Nhãn Lồng'), 'dessert');
  assert.equal(shopTag('Món Việt', 'Gỏi Cuốn Tươi Mỗi Ngày'), 'fresh');
  assert.equal(shopTag('Bún - Phở', 'Phở Bò Phố Cổ'), 'hot');
});

test('bình luận món: không nêu số sao, không placeholder, đúng ngữ cảnh nhiệt độ/đồ uống (3.000 mẫu)', () => {
  const dishes = [['Tiramisu', 'Bánh & Kem'], ['Panna cotta', 'Bánh & Kem'], ['Gỏi cuốn chay', 'Đồ chay'], ['Gỏi ngó sen', 'Món Việt'], ['Trà vải hoa hồng', 'Trà sữa'], ['Sinh tố bơ', 'Đồ uống'],
    ['Cà phê muối', 'Đồ uống'], ['Soda chanh dây', 'Trà sữa'], ['Chè khúc bạch', 'Đồ ăn vặt'], ['Phở bò tái', 'Bún - Phở'], ['Pizza hải sản', 'Pizza'], ['Gà rán giòn 2 miếng', 'Gà rán']];
  const registry = createRegistry(3);
  const rnd = rng(5);
  for (let i = 0; i < 3000; i += 1) {
    const [name, category] = dishes[i % dishes.length];
    const stars = 1 + (i % 5);
    const text = makeUniqueComment(rnd, { kind: 'dish', stars, dishName: name, category }, registry);
    const tags = dishTags(name, category);
    assert.deepEqual(violations(text, { rating: stars, kind: tags.kind, temp: tags.temp, drink: tags.kind === 'drink' }), [], text);
    assert.ok(!/\{[a-zA-Z]+\}/.test(text), `placeholder: ${text}`);
    assert.ok(!/\b\d sao\b/.test(text), text);
    assert.ok(!/đúng kiểu/.test(text), text);
  }
  assert.ok(Math.max(...registry.counts.values()) <= 3);
});

test('đồ uống không có "phần ăn" hay "đá xay mịn" cho trà; món lạnh/tráng miệng không "nóng hổi"', () => {
  const rnd = rng(8);
  const registry = createRegistry(3);
  for (let i = 0; i < 1500; i += 1) {
    const tea = makeUniqueComment(rnd, { kind: 'dish', stars: 1 + (i % 5), dishName: 'Trà vải hoa hồng', category: 'Trà sữa' }, registry);
    assert.ok(!/phần ăn|đá xay mịn|nóng hổi/i.test(tea), tea);
    const dessert = makeUniqueComment(rnd, { kind: 'dish', stars: 1 + (i % 5), dishName: 'Tiramisu', category: 'Bánh & Kem' }, registry);
    assert.ok(!/nóng|phần ăn đầy/i.test(dessert), dessert);
  }
});

test('bình luận quán: quán cà phê/trà/chè/gỏi cuốn không có "Món nóng, giao còn nguyên hình"; quán món nóng thì có thể có', () => {
  const rnd = rng(13);
  const registry = createRegistry(1000);
  let hotHit = false;
  for (let i = 0; i < 4000; i += 1) {
    const stars = 4 + (i % 2);
    for (const [name, category] of [['Cà Phê Gió Hồ Tây', 'Đồ uống'], ['Trà Sữa Lá Non', 'Trà sữa'], ['Chè & Kem Nhãn Lồng', 'Bánh & Kem'], ['Gỏi Cuốn Tươi Mỗi Ngày', 'Món Việt']]) {
      const text = makeUniqueComment(rnd, { kind: 'shop', stars, shopName: name, category }, registry);
      assert.ok(!/món nóng|nóng hổi|giao còn nguyên hình/i.test(text), text);
    }
    if (/món nóng|nóng hổi|giao còn nguyên hình/i.test(makeUniqueComment(rnd, { kind: 'shop', stars, shopName: 'Phở Bò', category: 'Bún - Phở' }, registry))) hotHit = true;
  }
  assert.ok(hotHit);
});

test('kho mở đầu review quán ≥ 60 mẫu, phản hồi quán ≥ 40 mở đầu+nội dung mỗi nhóm sao; phản hồi lặp ≤ 5', () => {
  assert.ok(shopOpenerCount() >= 60, String(shopOpenerCount()));
  for (const stars of [5, 3, 1]) { assert.ok(replyOpenerCount(stars) >= 10); assert.ok(replyVariantCount(stars) >= 40, `${stars}: ${replyVariantCount(stars)}`); }
  const registry = createRegistry(5);
  const rnd = rng(21);
  const replies = Array.from({ length: 4000 }, (_, i) => makeUniqueComment(rnd, { kind: 'reply', stars: [5, 4, 3, 2, 1][i % 5], shopName: 'Quán A' }, registry));
  assert.ok(Math.max(...registry.counts.values()) <= 5);
  assert.ok(new Set(replies).size >= replies.length / 5);
});

test('bộ kiểm tra bắt đúng lỗi cũ: số sao khác rating, "đúng kiểu", nóng cho món lạnh, phần ăn cho đồ uống', () => {
  assert.deepEqual(violations('Cho 5 sao không do dự.', { rating: 4 }), ['sao_khác_rating']);
  assert.deepEqual(violations('Chấm 3 sao.', { rating: 3 }), []);
  assert.ok(violations('Món còn nóng đúng kiểu', { rating: 5 }).includes('đúng_kiểu'));
  assert.ok(violations('Tiramisu: nóng hổi', { rating: 5, kind: 'dessert', temp: 'cold' }).includes('nóng_sai_nhãn'));
  assert.ok(violations('Phần ăn đầy đặn', { rating: 5, drink: true }).includes('phần_ăn_đồ_uống'));
});
