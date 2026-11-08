import test from 'node:test';
import assert from 'node:assert/strict';
import { isOpenNow } from '../src/shared/time/opening-hours.js';

const at = (h, m = 0) => new Date(2026, 10, 8, h, m);

test('quán mở trong ngày', () => {
  assert.equal(isOpenNow('07:00:00', '22:00:00', at(12)), true);
  assert.equal(isOpenNow('07:00:00', '22:00:00', at(22)), false);
  assert.equal(isOpenNow('07:00:00', '22:00:00', at(6, 59)), false);
});

test('quán mở qua nửa đêm', () => {
  assert.equal(isOpenNow('18:00:00', '02:00:00', at(23)), true);
  assert.equal(isOpenNow('18:00:00', '02:00:00', at(1)), true);
  assert.equal(isOpenNow('18:00:00', '02:00:00', at(10)), false);
});

test('thiếu giờ hoặc giờ mở = giờ đóng nghĩa là mở cả ngày', () => {
  assert.equal(isOpenNow(null, null, at(3)), true);
  assert.equal(isOpenNow('00:00:00', '00:00:00', at(3)), true);
});
