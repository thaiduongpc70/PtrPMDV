import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_RESULTS_WHEN_FEW, MIN_DISH_HITS, matchRestaurant, parseSearchQuery, scoreRestaurant, selectAndRank } from '../src/modules/catalog/search-text.js';

const shop = (name, category, dishes = [], description = '') => ({ name, category, dishes, description });
const run = (keyword, shops) => {
  const parsed = parseSearchQuery(keyword);
  return selectAndRank(shops, parsed, { match: matchRestaurant, score: s => scoreRestaurant(s, parsed), textsOf: s => [s.name, s.category, s.description, ...s.dishes] });
};
const many = (word, n) => Array.from({ length: n }, (_, i) => `${word} món ${i}`);

test('quán chỉ tình cờ có 1-2 món khớp không phải kết quả chính', () => {
  assert.ok(MIN_DISH_HITS >= 3);
  const shops = [shop('Phở Bò Phố Cổ', 'Bún - Phở', many('Phở', 6)), shop('Quán Chay', 'Chay', ['Phở chay nấm']), shop('Pizza Lò', 'Pizza', ['Pizza bò'])];
  const [first, ...rest] = run('phở', shops);
  assert.equal(first.name, 'Phở Bò Phố Cổ');
  assert.ok(!rest.some(s => s.name === 'Pizza Lò'));
});
test('khớp tên quán luôn đứng đầu', () => {
  const shops = [shop('Bún Bò A', 'Bún', many('Gà', 8)), shop('Gà Rán Vui', 'Gà rán', many('Gà', 3))];
  assert.equal(run('gà', shops)[0].name, 'Gà Rán Vui');
});
test('quá nhiều quán khớp nhờ món nhưng yếu: số kết quả bị chặn', () => {
  const weakShops = Array.from({ length: 30 }, (_, i) => shop(`Quán ${i}`, 'Khác', ['Món gà 1'], 'có gà'));
  const shops = [shop('Gà Ngon', 'Gà', many('Gà', 5)), ...weakShops];
  assert.ok(run('gà', shops).length <= MAX_RESULTS_WHEN_FEW);
});
test('đủ kết quả chính thì giữ nguyên danh sách kết quả chính', () => {
  const shops = Array.from({ length: 12 }, (_, i) => shop(`Gà Quán ${i}`, 'Gà', many('Gà', 4)));
  assert.equal(run('gà', shops).length, 12);
});
test('chỉ trùng danh mục (điểm thấp) bị hạ so với quán đúng tên', () => {
  const shops = [shop('Phở Gánh', 'Bún - Phở', many('Phở', 6)), shop('Bún Bò Cố Đô', 'Bún - Phở', ['Bún bò'])];
  const result = run('phở', shops);
  assert.equal(result[0].name, 'Phở Gánh');
});
test('bia/ my y vẫn tìm thấy', () => {
  const shops = [shop('Lẩu Ly', 'Lẩu', ['Bia lon Tiger', 'Bia Heineken', 'Bia Hà Nội']), shop('Mì Ý Sốt', 'Mì Ý', ['Mì Ý bò bằm'])];
  assert.equal(run('bia', shops)[0].name, 'Lẩu Ly');
  assert.equal(run('my y', shops)[0].name, 'Mì Ý Sốt');
});
