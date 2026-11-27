import test from 'node:test';
import assert from 'node:assert/strict';
import { dishProfile, makeDishComment, makeRestaurantComment, makeShipperComment } from '../scripts/data/review-comments.mjs';

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Khớp nguyên từ tiếng Việt ( của JS không hiểu chữ có dấu). */
const has = (text, words) => new RegExp(`(^|[^\p{L}])(${words})([^\p{L}]|$)`, 'iu').test(text);
const sample = (dish, category, n = 300) => { const r = rng(7); const out = []; for (let i = 0; i < n; i += 1) for (const rating of [1, 2, 3, 4, 5]) out.push(makeDishComment(r, { dishName: dish, category, rating })); return out; };

test('đồ uống dùng "uống", không dùng "ăn"/nóng hổi/rau', () => {
  for (const [dish, category] of [['Trà sữa trân châu đường đen', 'Trà sữa'], ['Cà phê sữa đá', 'Đồ uống'], ['Nước ép cam', 'Đồ uống'], ['Sinh tố bơ', 'Đồ uống'], ['Trà đào cam sả', 'Trà sữa'], ['Pepsi lon', 'Đồ ăn nhanh']]) {
    for (const text of sample(dish, category)) {
      assert.ok(!/\b(ăn|nóng hổi|nóng sốt|rau|bột|nước chấm|nguội ngắt)\b/i.test(text), `${dish}: "${text}"`);
    }
  }
});

test('món ăn dùng "ăn", không dùng "uống"/mát lạnh/đá tan', () => {
  for (const [dish, category] of [['Phở bò tái', 'Bún - Phở'], ['Cơm tấm sườn nướng', 'Cơm'], ['Pizza Margherita', 'Pizza'], ['Gà rán giòn cay', 'Gà rán'], ['Bánh mì thịt nướng', 'Món Việt']]) {
    for (const text of sample(dish, category)) {
      assert.ok(!/\b(uống|mát lạnh|đá tan|ly nước|trân châu|ít đá)\b/i.test(text), `${dish}: "${text}"`);
    }
  }
});

test('combo trong quán đồ uống là combo ly (uống)', () => {
  assert.equal(dishProfile('Combo 3 ly', 'Trà sữa').verb, 'uống');
  assert.equal(dishProfile('Combo 2 người', 'Gà rán').verb, 'ăn');
});

test('bình luận đa dạng và có chi tiết đặc trưng món', () => {
  const texts = new Set(sample('Trà sữa trân châu đường đen', 'Trà sữa', 200));
  assert.ok(texts.size > 400, `chỉ có ${texts.size} câu khác nhau`);
  assert.ok([...texts].some(text => /trân châu/.test(text)));
});

test('bình luận quán và tài xế không nhắc nhiệt độ sai loại', () => {
  const r = rng(3);
  for (let i = 0; i < 400; i += 1) {
    assert.ok(!/\bnóng\b/.test(makeShipperComment(r, { rating: 5, drinksOnly: true })));
    assert.ok(!/\b(ăn|nóng)\b/i.test(makeRestaurantComment(r, { category: 'Trà sữa', rating: 5 })));
  }
});
