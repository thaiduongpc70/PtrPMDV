import assert from 'node:assert/strict';
import test from 'node:test';
import { createRegistry, makeUniqueComment, poolSize } from '../scripts/data/review-phrases.mjs';

const rng = seed => { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; };

test('bình luận đa dạng: một câu không lặp quá 3 lần, không có khuôn "Tạm được, X. Sẽ cân nhắc đặt lại"', () => {
  const registry = createRegistry(3);
  const rnd = rng(7);
  const texts = Array.from({ length: 3000 }, (_, i) => makeUniqueComment(rnd, { kind: 'dish', stars: 1 + (i % 5), dishName: `Món ${i % 7}`, drink: i % 3 === 0 }, registry));
  assert.ok(Math.max(...registry.counts.values()) <= 3);
  assert.ok(new Set(texts).size / texts.length > 0.7);
  assert.ok(texts.every(text => !/Tạm được, .*Sẽ cân nhắc đặt lại/.test(text)));
});

test('đồ uống dùng "uống", món ăn dùng "ăn" khi có động từ', () => {
  const registry = createRegistry(3);
  const rnd = rng(11);
  const drinks = Array.from({ length: 400 }, () => makeUniqueComment(rnd, { kind: 'dish', stars: 5, dishName: 'trà sữa', drink: true }, registry));
  const foods = Array.from({ length: 400 }, () => makeUniqueComment(rnd, { kind: 'dish', stars: 5, dishName: 'phở bò', drink: false }, registry));
  assert.ok(drinks.every(text => !/Mình ăn |cùng ăn /.test(text)));
  assert.ok(foods.every(text => !/Mình uống |cùng uống /.test(text)));
});

test('bình luận quán không lặp hai câu giống nhau liên tiếp và bộ câu đủ lớn', () => {
  const registry = createRegistry(3);
  const rnd = rng(3);
  for (let i = 0; i < 500; i += 1) {
    const text = makeUniqueComment(rnd, { kind: 'shop', stars: 1 + (i % 5), shopName: 'Quán A' }, registry);
    const sentences = text.split('. ').map(item => item.replace(/\.$/, ''));
    assert.equal(new Set(sentences).size, sentences.length, text);
  }
  assert.ok(poolSize('dish', 5, true) >= 5000);
});

test('thứ tự sao: bình luận 1 sao khác nhóm với 5 sao', () => {
  const registry = createRegistry(3);
  const low = makeUniqueComment(rng(5), { kind: 'shop', stars: 1, shopName: 'Quán B' }, registry);
  const high = makeUniqueComment(rng(5), { kind: 'shop', stars: 5, shopName: 'Quán B' }, registry);
  assert.notEqual(low, high);
});

test('bình luận tài xế: kho câu đủ lớn, một câu không lặp quá 3 lần trên 6.000 đánh giá', () => {
  assert.ok(poolSize('ship', 5) >= 20000);
  const registry = createRegistry(3);
  const rnd = rng(21);
  const texts = Array.from({ length: 6000 }, (_, i) => makeUniqueComment(rnd, { kind: 'ship', stars: [5, 5, 5, 4, 4, 3][i % 6] }, registry));
  assert.ok(Math.max(...registry.counts.values()) <= 3);
  assert.ok(new Set(texts).size / texts.length > 0.75);
});
