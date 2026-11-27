import assert from 'node:assert/strict';
import test from 'node:test';
import { comboTiles } from '../scripts/lib/combo-tiles.mjs';

test('comboTiles: mỗi ảnh khác nhau một ô, theo số lượng giảm dần, tối đa 4', () => {
  const tiles = comboTiles([{ url: 'a', quantity: 1 }, { url: 'b', quantity: 2 }, { url: 'c', quantity: 1 }, { url: 'd', quantity: 1 }, { url: 'e', quantity: 1 }]);
  assert.deepEqual(tiles.map(tile => tile.url), ['b', 'a', 'c', 'd']);
  assert.equal(tiles[0].quantity, 2);
});
test('comboTiles: cùng ảnh gộp số lượng, không nhân đôi ô; thiếu ảnh thì bỏ', () => {
  const tiles = comboTiles([{ url: 'a', quantity: 1 }, { url: 'a', quantity: 2 }, { url: null, quantity: 5 }]);
  assert.deepEqual(tiles, [{ url: 'a', quantity: 3 }]);
});
test('comboTiles: set 1 người và 2 người khác nhau nhờ số lượng', () => {
  const one = comboTiles([{ url: 'ga', quantity: 1 }, { url: 'khoai', quantity: 1 }, { url: 'pepsi', quantity: 1 }]);
  const two = comboTiles([{ url: 'ga', quantity: 2 }, { url: 'khoai', quantity: 1 }, { url: 'pepsi', quantity: 2 }]);
  assert.notDeepEqual(one, two);
  assert.equal(comboTiles([{ url: 'cold', quantity: 1 }]).length, 1);
});
