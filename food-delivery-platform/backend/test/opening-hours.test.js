import test from 'node:test';
import assert from 'node:assert/strict';
import { isOpenNow, vietnamClock } from '../src/shared/time/opening-hours.js';

/* Mọi mốc thời gian là UTC cố định; giờ Việt Nam = UTC + 7. Kết quả không phụ thuộc múi giờ máy chạy test. */
const vn = (hour, minute = 0, day = 9) => new Date(Date.UTC(2026, 10, day, hour - 7, minute)); // 09/11/2026 là Thứ hai

test('đồng hồ Việt Nam cố định UTC+7, thứ trong tuần 1..7', () => {
  const clock = vietnamClock(new Date('2026-11-08T17:30:00Z')); // 00:30 Thứ hai 09/11 theo giờ VN
  assert.equal(clock.time, '00:30:00');
  assert.equal(clock.isoDay, 1);
  assert.equal(clock.previousIsoDay, 7);
  assert.equal(vietnamClock(new Date('2026-11-08T10:00:00Z')).isoDay, 7); // 17:00 Chủ nhật 08/11
});

test('quán mở trong ngày (giờ VN, không theo múi giờ máy chủ)', () => {
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(12)), true);
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(22)), false);
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(6, 59)), false);
  // 12:00 giờ VN = 05:00 UTC: vẫn mở dù giờ UTC của máy là 05:00
  assert.equal(isOpenNow('07:00:00', '22:00:00', new Date('2026-11-09T05:00:00Z')), true);
  // 23:30 UTC = 06:30 hôm sau giờ VN: chưa mở
  assert.equal(isOpenNow('07:00:00', '22:00:00', new Date('2026-11-08T23:30:00Z')), false);
});

test('quán mở qua nửa đêm', () => {
  assert.equal(isOpenNow('18:00:00', '02:00:00', vn(23)), true);
  assert.equal(isOpenNow('18:00:00', '02:00:00', vn(1)), true);
  assert.equal(isOpenNow('18:00:00', '02:00:00', vn(10)), false);
});

test('thiếu giờ hoặc giờ mở = giờ đóng nghĩa là mở cả ngày', () => {
  assert.equal(isOpenNow(null, null, vn(3)), true);
  assert.equal(isOpenNow('00:00:00', '00:00:00', vn(3)), true);
});

test('restaurant_operating_hours có dữ liệu thì ưu tiên theo thứ trong tuần', () => {
  const hours = [
    { dayOfWeek: 1, openTime: '08:00:00', closeTime: '12:00:00', isClosed: false },
    { dayOfWeek: 2, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 3, openTime: '18:00:00', closeTime: '02:00:00', isClosed: false }
  ];
  // Thứ hai 09/11: chỉ mở 08–12 dù opening/closing chung là 07–22
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(10), hours), true);
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(15), hours), false);
  // Thứ ba 10/11 nghỉ
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(10, 0, 10), hours), false);
  // Thứ tư 11/11 mở 18:00–02:00 và phần khuya của đêm đó sang Thứ năm (không có dòng Thứ năm => dùng giờ chung)
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(19, 0, 11), hours), true);
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(1, 0, 12), [...hours, { dayOfWeek: 4, openTime: '09:00:00', closeTime: '10:00:00', isClosed: false }]), true);
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(3, 0, 12), [...hours, { dayOfWeek: 4, openTime: '09:00:00', closeTime: '10:00:00', isClosed: false }]), false);
});

test('ngày không có dòng giờ riêng thì dùng giờ chung của quán', () => {
  const hours = [{ dayOfWeek: 2, openTime: '10:00:00', closeTime: '11:00:00', isClosed: false }];
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(12, 0, 9), hours), true); // Thứ hai không có dòng
  assert.equal(isOpenNow('07:00:00', '22:00:00', vn(12, 0, 10), hours), false); // Thứ ba chỉ mở 10–11
});
