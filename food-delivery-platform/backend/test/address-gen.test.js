import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildAddress, isRealStreet, usablePlaces } from '../scripts/lib/address-gen.mjs';

const places = JSON.parse(readFileSync(new URL('../scripts/data/new-places.json', import.meta.url), 'utf8'));
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

test('isRealStreet loại tên chung chung, giữ tên riêng thật', () => {
  for (const bad of ['Đường chung cư', 'Đường trục phía Bắc', 'Đường số 5', 'Khu tập thể', '', null]) assert.equal(isRealStreet(bad), false, String(bad));
  for (const good of ['Đường Nguyễn Trãi', 'Phố Hiến', 'Đê Hữu Hồng', 'Mậu Dương', 'Hàn Lâm', 'Đường Võ Nguyên Giáp']) assert.equal(isRealStreet(good), true, good);
});
test('usablePlaces: HN và HY, mọi đường đều thật', () => {
  const usable = usablePlaces(places);
  assert.ok(usable.some(place => place.region === 'HN') && usable.some(place => place.region === 'HY'));
  assert.ok(usable.every(place => place.streets.every(street => isRealStreet(street.name))));
});
test('1.000 địa chỉ mới: ≥95% có tên đường thật, ≥50 địa chỉ khác nhau, không "Số N" trống đường', () => {
  const usable = usablePlaces(places);
  const rnd = seeded(2026);
  const list = Array.from({ length: 1000 }, (_, i) => buildAddress(rnd, usable[i % usable.length], ['Chung cư Mỹ Đình Pearl', 'Tòa nhà Keangnam']));
  const real = list.filter(item => /^\d+ (Đường|Phố|Đê)? ?[A-ZÀ-Ỵ]/.test(item.addressLine) && !/chung cư$/i.test(item.addressLine.split(',')[0]));
  assert.ok(real.length / list.length >= 0.95, String(real.length));
  assert.ok(new Set(list.map(item => item.addressLine)).size >= 50);
  assert.ok(list.every(item => !/^Số \d+$/.test(item.addressLine) && !/Đường chung cư/.test(item.addressLine)));
  assert.ok(list.every(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)));
});
