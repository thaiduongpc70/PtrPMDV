import assert from 'node:assert/strict';
import test from 'node:test';
import { discountFor, listVouchers, priceOrder } from '../src/modules/engagement/voucher.js';
import { deliveryFeeFor, distanceKm } from '../src/shared/pricing/delivery-fee.js';
import { findProvince } from '../src/shared/data/vn-provinces.js';

const percent = { discountType: 'PERCENT', discountValue: 10, maxDiscount: 30000 };
const fixed = { discountType: 'FIXED_AMOUNT', discountValue: 20000, maxDiscount: null };
const freeship = { discountType: 'FREE_DELIVERY', discountValue: 25000, maxDiscount: 25000 };

test('percent voucher is capped by max discount, fixed voucher by subtotal', () => {
  assert.equal(discountFor(percent, 200000, 15000), 20000);
  assert.equal(discountFor(percent, 500000, 15000), 30000);
  assert.equal(discountFor(fixed, 15000, 15000), 15000);
});

test('freeship waives at most the real delivery fee', () => {
  assert.equal(discountFor(freeship, 100000, 15000), 15000);
  assert.equal(discountFor({ ...freeship, maxDiscount: 10000 }, 100000, 30000), 10000);
});

test('freeship keeps the delivery fee on the order and the customer pays the food only', () => {
  const price = priceOrder({ subtotal: 120000, deliveryFee: 15000, promotion: freeship });
  assert.equal(price.deliveryFee, 15000);
  assert.equal(price.discountAmount, 15000);
  assert.equal(price.totalAmount, 120000);
});

test('money voucher reduces the food price and the delivery fee is still charged', () => {
  const price = priceOrder({ subtotal: 150000, deliveryFee: 20000, promotion: fixed });
  assert.equal(price.totalAmount, 150000);
});

test('listVouchers reports shortfall and hides vouchers the customer can no longer use', async () => {
  const rows = [
    { id: 1, code: 'A', name: 'a', discount_type: 'FIXED_AMOUNT', discount_value: 20000, max_discount: null, minimum_order: 150000, end_at: '2099-12-31', usage_per_customer: 1, customer_usage: 0, first_order_only: 0, has_orders: 1, restaurant_id: null, customer_id: null },
    { id: 2, code: 'B', name: 'b', discount_type: 'FIXED_AMOUNT', discount_value: 30000, max_discount: null, minimum_order: 80000, end_at: '2099-12-31', usage_per_customer: 1, customer_usage: 1, first_order_only: 0, has_orders: 1, restaurant_id: null, customer_id: null },
    { id: 3, code: 'C', name: 'c', discount_type: 'FIXED_AMOUNT', discount_value: 30000, max_discount: null, minimum_order: 80000, end_at: '2099-12-31', usage_per_customer: 1, customer_usage: 0, first_order_only: 1, has_orders: 1, restaurant_id: null, customer_id: null }
  ];
  const result = await listVouchers(async () => rows, { customerId: 1, subtotal: 100000, deliveryFee: 15000 });
  assert.deepEqual(result.map(item => item.code), ['A']);
  assert.equal(result[0].eligible, false);
  assert.equal(result[0].shortfall, 50000);
});

test('delivery fee grows after the included kilometres and stops beyond the range', () => {
  const options = { base: 15000, perKm: 5000, maxKm: 10 };
  assert.deepEqual(deliveryFeeFor(options, 2.5), { fee: 15000, km: 2.5, tooFar: false });
  assert.equal(deliveryFeeFor(options, 4.3).fee, 25000);
  assert.equal(deliveryFeeFor(options, 11).tooFar, true);
  assert.equal(deliveryFeeFor(options, null).fee, 15000);
});

test('mặc định: đúng 15 km vẫn giao, trên 15 km thì không giao', () => {
  assert.equal(deliveryFeeFor({}, 15).tooFar, false);
  assert.equal(deliveryFeeFor({}, 15.01).tooFar, true);
  assert.equal(deliveryFeeFor({ base: 15000, perKm: 5000 }, 20).tooFar, true);
});

test('distance between two points is plausible', () => {
  const km = distanceKm(10.7721, 106.698, 10.8231, 106.6297);
  assert.ok(km > 8 && km < 10, `got ${km}`);
  assert.equal(distanceKm(null, 1, 2, 3), null);
});

test('province lookup accepts common spellings', () => {
  assert.equal(findProvince('TP.HCM').name, 'Hồ Chí Minh');
  assert.equal(findProvince('hà nội').name, 'Hà Nội');
  assert.equal(findProvince('Atlantis'), null);
});
