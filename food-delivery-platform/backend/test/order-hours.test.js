import assert from 'node:assert/strict';
import test from 'node:test';
import { inWindow, makeSampler, peakHour, profileFor, windowOf } from '../scripts/lib/order-hours.mjs';

const rng = seed => { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; };

const SHOPS = [
  { name: 'Bún Riêu Cháo Sườn Buổi Sáng', category: 'Bún - Phở', opening: '05:30:00', closing: '14:00:00', expect: 'breakfast' },
  { name: 'Lẩu Ly Đêm Phố Hiến', category: 'Đồ ăn vặt', opening: '17:00:00', closing: '02:00:00', expect: 'night' },
  { name: 'Cháo Đêm Ấm Bụng', category: 'Bún - Phở', opening: '17:00:00', closing: '01:00:00', expect: 'night' },
  { name: 'Lẩu Nướng Tây Sơn', category: 'Lẩu & Nướng', opening: '16:00:00', closing: '23:30:00', expect: 'night' },
  { name: 'Trà Sữa Lá Non', category: 'Trà sữa', opening: '07:00:00', closing: '23:00:00', expect: 'drink' },
  { name: 'Cà Phê Gió Hồ Tây', category: 'Đồ uống', opening: '07:00:00', closing: '22:00:00', expect: 'drink' },
  { name: 'Phở Bò Phố Cổ', category: 'Bún - Phở', opening: '06:00:00', closing: '22:00:00', expect: 'meal' },
  { name: 'Izakaya Nhật Phố Hiến', category: 'Món Nhật', opening: '10:30:00', closing: '23:00:00', expect: 'night' },
  { name: 'Cơm Tấm Sài Gòn Mỹ Đình', category: 'Cơm', opening: '10:00:00', closing: '21:30:00', expect: 'meal' }
];

test('loại đường cong suy ra từ giờ mở cửa, danh mục và tên quán', () => {
  for (const shop of SHOPS) assert.equal(profileFor(shop), shop.expect, shop.name);
});

test('1.000 mẫu mỗi quán đều nằm trong giờ mở cửa (kể cả qua nửa đêm)', () => {
  for (const shop of SHOPS) {
    const sampler = makeSampler(shop);
    const rnd = rng(shop.name.length * 7919);
    for (let i = 0; i < 1000; i += 1) {
      const minute = sampler.sample(rnd);
      assert.ok(minute >= sampler.window.open && minute < sampler.window.close, `${shop.name}: ${minute}`);
      assert.ok(inWindow(minute % 1440, shop.opening, shop.closing), `${shop.name}: ${minute % 1440} ngoài giờ`);
    }
  }
});

test('giờ cao điểm khác nhau ≥ 3 giờ giữa quán ăn sáng, quán nhậu và quán trà sữa', () => {
  const peak = shop => peakHour(profileFor(shop), shop.opening, shop.closing);
  const breakfast = peak(SHOPS[0]); const night = peak(SHOPS[1]); const drink = peak(SHOPS[4]);
  assert.ok(Math.abs(breakfast - drink) >= 3, `${breakfast} vs ${drink}`);
  assert.ok(Math.abs(night - drink) >= 3, `${night} vs ${drink}`);
  assert.ok(Math.abs(night - breakfast) >= 3);
});

test('phân bố mẫu thực tế: quán ăn sáng nhiều đơn lúc 6–9h, quán nhậu nhiều lúc 18–22h, không có đơn 15–21h ở quán sáng', () => {
  const share = (shop, from, to) => {
    const sampler = makeSampler(shop); const rnd = rng(99); let hit = 0;
    for (let i = 0; i < 4000; i += 1) { const hour = Math.floor((sampler.sample(rnd) % 1440) / 60); if (hour >= from && hour < to) hit += 1; }
    return hit / 4000;
  };
  assert.ok(share(SHOPS[0], 6, 9) > 0.5);
  assert.equal(share(SHOPS[0], 15, 21), 0);
  assert.ok(share(SHOPS[1], 18, 22) > 0.6);
  assert.equal(share(SHOPS[3], 0, 16), 0);
  assert.ok(share(SHOPS[4], 14, 18) > 0.4);
});

test('cửa sổ giờ mở cửa: qua nửa đêm và cả ngày', () => {
  assert.deepEqual(windowOf('17:00:00', '02:00:00'), { open: 1020, close: 1560, span: 540 });
  assert.equal(windowOf('00:00:00', '00:00:00').span, 1440);
  assert.equal(inWindow(60, '17:00:00', '02:00:00'), true);
  assert.equal(inWindow(600, '17:00:00', '02:00:00'), false);
});

test('đơn quá xa: deliveryFeeFor báo tooFar để báo giá/thanh toán từ chối', async () => {
  const { deliveryFeeFor } = await import('../src/shared/pricing/delivery-fee.js');
  assert.equal(deliveryFeeFor({ base: 15000, perKm: 5000, maxKm: 15 }, 15.01).tooFar, true);
  assert.equal(deliveryFeeFor({ base: 15000, perKm: 5000, maxKm: 15 }, 15).tooFar, false);
});
