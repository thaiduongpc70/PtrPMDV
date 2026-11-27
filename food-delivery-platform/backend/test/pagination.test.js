import assert from 'node:assert/strict';
import test from 'node:test';
import { readLimitOffset, readPagination } from '../src/shared/http/pagination.js';
import { methodNotAllowed } from '../src/shared/http/method-not-allowed.js';

const bad = fn => assert.throws(fn, error => error.statusCode === 400 && /không hợp lệ|vượt/.test(error.message));

test('readPagination: mặc định, page/pageNumber, pageSize/limit', () => {
  assert.deepEqual(readPagination({}), { pageNumber: 1, pageSize: 20, offset: 0 });
  assert.deepEqual(readPagination({ page: '3', pageSize: '10' }), { pageNumber: 3, pageSize: 10, offset: 20 });
  assert.deepEqual(readPagination({ pageNumber: '2', limit: '5' }), { pageNumber: 2, pageSize: 5, offset: 5 });
});
test('readPagination: số âm / 0 / chữ / thập phân -> 400 tiếng Việt', () => {
  for (const query of [{ limit: '-1' }, { limit: '0' }, { limit: 'abc' }, { pageSize: '1.5' }, { page: '0' }, { page: '-2' }, { page: 'x' }]) bad(() => readPagination(query));
});
test('readPagination: vượt tối đa -> 400 (không âm thầm cắt)', () => {
  bad(() => readPagination({ pageSize: '9999' }, 50));
  assert.equal(readPagination({ pageSize: '50' }, 50).pageSize, 50);
});
test('readPagination: tối đa tuỳ endpoint và mặc định không vượt tối đa', () => {
  assert.equal(readPagination({}, 10, 30).pageSize, 10);
  assert.equal(readPagination({ pageSize: '100' }, 100).pageSize, 100);
});
test('readLimitOffset: offset âm/chữ và limit vượt -> 400', () => {
  bad(() => readLimitOffset({ offset: '-1' }));
  bad(() => readLimitOffset({ offset: 'abc' }));
  bad(() => readLimitOffset({ limit: '9999' }));
  assert.deepEqual(readLimitOffset({ limit: '100', offset: '0' }), { limit: 100, offset: 0 });
});
test('methodNotAllowed: sai phương thức -> 405 + Allow; đúng phương thức đi tiếp', () => {
  const mw = methodNotAllowed(['GET', 'patch']);
  const headers = {};
  let error = null; let passed = false;
  mw({ method: 'POST' }, { setHeader: (k, v) => { headers[k] = v; } }, e => { if (e) error = e; else passed = true; });
  assert.equal(error.statusCode, 405);
  assert.equal(headers.Allow, 'GET, PATCH');
  assert.match(error.message, /Phương thức POST/);
  mw({ method: 'GET' }, { setHeader() {} }, e => { if (!e) passed = true; });
  assert.equal(passed, true);
});

test('phí giao theo vùng Hà Nội: trong 15 km tính theo bảng giá, quá 15 km là tooFar', async () => {
  const { deliveryFeeFor, feeSettings } = await import('../src/shared/pricing/delivery-fee.js');
  const options = feeSettings({ delivery_base_fee: 15000, delivery_price_per_km: 5000, max_delivery_distance: 15 });
  assert.deepEqual(deliveryFeeFor(options, 2.5), { fee: 15000, km: 2.5, tooFar: false });
  assert.equal(deliveryFeeFor(options, 4.2).fee, 15000 + 2 * 5000);
  assert.equal(deliveryFeeFor(options, 15).tooFar, false);
  assert.equal(deliveryFeeFor(options, 15.01).tooFar, true);
});

test('pagedMeta: totalPages đúng và cấu trúc pagination + trường cũ tương thích', async () => {
  const { pagedMeta } = await import('../src/shared/http/pagination.js');
  assert.deepEqual(pagedMeta(2, 10, 3083), { totalItems: 3083, page: 2, pageSize: 10, totalPages: 309, pagination: { page: 2, pageSize: 10, totalItems: 3083, totalPages: 309 } });
  assert.equal(pagedMeta(1, 20, 0).totalPages, 0);
  assert.equal(pagedMeta(1, 100, 100).totalPages, 1);
  assert.equal(pagedMeta(1, 100, 101).totalPages, 2);
});
test('phân trang admin: page=2 bắt đầu sau pageSize dòng; limit/pageNumber là bí danh; vượt trần 100 -> 400', () => {
  const second = readPagination({ page: '2', pageSize: '10' }, 100);
  assert.equal(second.offset, 10);
  assert.equal(readPagination({ pageNumber: '2', limit: '10' }, 100).offset, 10);
  assert.throws(() => readPagination({ pageSize: '101' }, 100), error => error.statusCode === 400);
  assert.equal(readPagination({}, 100, 20).pageSize, 20);
});

test('readPagination: nhận offset khi không có page (limit=5&offset=200 -> trang 41); page được ưu tiên; offset sai -> 400', () => {
  assert.deepEqual(readPagination({ limit: '5', offset: '200' }, 100), { pageNumber: 41, pageSize: 5, offset: 200 });
  assert.deepEqual(readPagination({ pageSize: '5', page: '2', offset: '999' }, 100), { pageNumber: 2, pageSize: 5, offset: 5 });
  assert.throws(() => readPagination({ offset: '-1' }, 100), error => error.statusCode === 400);
  assert.throws(() => readPagination({ offset: 'abc' }, 100), error => error.statusCode === 400);
});
