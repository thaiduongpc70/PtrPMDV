import assert from 'node:assert/strict';
import test from 'node:test';
import { validateItemCreate, validateItemPatch, validateToppingGroup, validateVariant } from '../src/modules/menus/menu.validation.js';

test('menu item validation rejects a discount higher than the base price', () => {
  assert.throws(() => validateItemCreate({ name: 'Pho', basePrice: 30000, discountPrice: 35000 }), error => error.statusCode === 400 && /discount/i.test(error.message));
});

test('menu item patch preserves availability and accepts an explicit zero discount', () => {
  const result = validateItemPatch({ name: 'Pho', categoryId: null, description: null, imageUrl: null, basePrice: 30000, discountPrice: 20000, preparationTime: 20, isAvailable: true, isFeatured: false }, { discountPrice: 0, isAvailable: false });
  assert.equal(result.discountPrice, 0);
  assert.equal(result.isAvailable, false);
});

test('variants allow a negative price adjustment while topping bounds stay coherent', () => {
  assert.equal(validateVariant({ name: 'Small', priceAdjustment: -5000 }).priceAdjustment, -5000);
  assert.deepEqual(validateToppingGroup({ name: 'Size', minSelect: 1, maxSelect: 2, required: true }), { name: 'Size', minSelect: 1, maxSelect: 2, required: true });
});
