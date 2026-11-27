import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogRepository } from '../src/modules/catalog/catalog.repository.js';
import { catalogService } from '../src/modules/catalog/catalog.service.js';

test('catalog search records a customer keyword and returns a paged response', async t => {
  let recorded;
  const originals = { searchRestaurants: catalogRepository.searchRestaurants, addSearchHistory: catalogRepository.addSearchHistory };
  catalogRepository.searchRestaurants = async filters => { assert.equal(filters.keyword, 'pho'); return { items: [{ id: 1 }], totalItems: 1 }; };
  catalogRepository.addSearchHistory = async (userId, keyword) => { recorded = { userId, keyword }; };
  const originalPoint = catalogRepository.findDefaultAddressPoint;
  catalogRepository.findDefaultAddressPoint = async () => null;
  t.after(() => { catalogRepository.findDefaultAddressPoint = originalPoint; });
  t.after(() => { catalogRepository.searchRestaurants = originals.searchRestaurants; catalogRepository.addSearchHistory = originals.addSearchHistory; });

  const result = await catalogService.searchRestaurants({ keyword: 'pho', userId: 7, page: 1, pageSize: 10 });
  assert.equal(result.items.length, 1);
  assert.deepEqual(recorded, { userId: 7, keyword: 'pho' });
});

const stubRepository = (t, overrides) => {
  const originals = {};
  for (const [name, fn] of Object.entries(overrides)) { originals[name] = catalogRepository[name]; catalogRepository[name] = fn; }
  t.after(() => { for (const [name, fn] of Object.entries(originals)) catalogRepository[name] = fn; });
};

test('sort=rating là tên gọi khác của top_rated; price_asc/price_desc hợp lệ', async t => {
  const seen = [];
  stubRepository(t, { searchRestaurants: async filters => { seen.push(filters.sort); return { items: [], totalItems: 0 }; } });
  await catalogService.searchRestaurants({ sort: 'rating' });
  await catalogService.searchRestaurants({ sort: 'price_asc' });
  await catalogService.searchRestaurants({ sort: 'price_desc' });
  assert.deepEqual(seen, ['top_rated', 'price_asc', 'price_desc']);
});

test('sort không hợp lệ: lỗi 400 tiếng Việt liệt kê giá trị hợp lệ', async () => {
  await assert.rejects(() => catalogService.searchRestaurants({ sort: 'abc' }), error => {
    assert.equal(error.statusCode ?? error.status, 400);
    assert.match(error.message, /không hợp lệ/);
    for (const value of ['featured', 'nearest', 'rating', 'price_asc', 'price_desc']) assert.ok(error.message.includes(value), value);
    return true;
  });
  await assert.rejects(() => catalogService.searchMenuItems({ sort: 'zzz' }), /price_asc/);
});

test('hideOutOfRange và lọc giá/giảm giá được chuyển xuống repository; priceMin > priceMax bị từ chối', async t => {
  let received;
  stubRepository(t, { searchRestaurants: async filters => { received = filters; return { items: [], totalItems: 0, maxDeliveryKm: 15 }; } });
  const result = await catalogService.searchRestaurants({ lat: '20.64', lng: '106.05', hideOutOfRange: '1', discount: '1', priceMin: '20000', priceMax: '90000', vegetarian: '1', spicy: 'true' });
  assert.equal(received.hideOutOfRange, true);
  assert.equal(received.hasDiscount, true);
  assert.equal(received.vegetarian, true);
  assert.equal(received.spicy, true);
  assert.equal(received.priceMin, 20000);
  assert.equal(received.priceMax, 90000);
  assert.equal(result.maxDeliveryKm, 15);
  await assert.rejects(() => catalogService.searchRestaurants({ priceMin: '100', priceMax: '50' }), /priceMin/);
});

test('0 kết quả với từ khoá: trả suggestions; có kết quả thì không có', async t => {
  let asked;
  stubRepository(t, {
    searchRestaurants: async filters => ({ items: filters.search.phrase === 'pho' ? [{ id: 1 }] : [], totalItems: filters.search.phrase === 'pho' ? 1 : 0 }),
    suggestSearch: async (parsed) => { asked = parsed.phrase; return [{ type: 'category', text: 'Bún - Phở', categoryId: 3 }]; }
  });
  const empty = await catalogService.searchRestaurants({ keyword: 'phở xyz' });
  assert.deepEqual(empty.suggestions, [{ type: 'category', text: 'Bún - Phở', categoryId: 3 }]);
  assert.equal(asked, 'phở xyz');
  const hit = await catalogService.searchRestaurants({ keyword: 'pho' });
  assert.equal(hit.suggestions, undefined);
});

test('khách đăng nhập không gửi lat/lng: dùng địa chỉ mặc định; khách ẩn danh thì không', async t => {
  const seen = [];
  stubRepository(t, {
    searchRestaurants: async filters => { seen.push({ lat: filters.lat, lng: filters.lng }); return { items: [], totalItems: 0 }; },
    findDefaultAddressPoint: async () => ({ lat: 20.64, lng: 106.05 })
  });
  const withUser = await catalogService.searchRestaurants({ userId: 5 });
  await catalogService.searchRestaurants({});
  await catalogService.searchRestaurants({ userId: 5, lat: '21', lng: '105' });
  assert.deepEqual(seen, [{ lat: 20.64, lng: 106.05 }, { lat: null, lng: null }, { lat: 21, lng: 105 }]);
  assert.equal(withUser.originSource, 'DEFAULT_ADDRESS');
});
