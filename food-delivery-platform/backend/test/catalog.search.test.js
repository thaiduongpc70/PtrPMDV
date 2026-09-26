import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogRepository } from '../src/modules/catalog/catalog.repository.js';
import { catalogService } from '../src/modules/catalog/catalog.service.js';

test('catalog search records a customer keyword and returns a paged response', async t => {
  let recorded;
  const originals = { searchRestaurants: catalogRepository.searchRestaurants, addSearchHistory: catalogRepository.addSearchHistory };
  catalogRepository.searchRestaurants = async filters => { assert.equal(filters.keyword, 'pho'); return { items: [{ id: 1 }], totalItems: 1 }; };
  catalogRepository.addSearchHistory = async (userId, keyword) => { recorded = { userId, keyword }; };
  t.after(() => { catalogRepository.searchRestaurants = originals.searchRestaurants; catalogRepository.addSearchHistory = originals.addSearchHistory; });

  const result = await catalogService.searchRestaurants({ keyword: 'pho', userId: 7, page: 1, pageSize: 10 });
  assert.equal(result.items.length, 1);
  assert.deepEqual(recorded, { userId: 7, keyword: 'pho' });
});
