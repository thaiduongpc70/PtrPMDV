/* Nạp giờ mở cửa theo ngày (restaurant_operating_hours) và điền phường/xã (ward) cho mọi quán đang hoạt động, qua API chủ quán.
   - Giờ 7 ngày khớp opening_time/closing_time hiện có của quán (quán mở qua nửa đêm giữ nguyên). Quán nhậu (Izakaya) mở đến 23:00.
   - ward = phường/xã đang lưu ở cột district (cột ward cũ của dữ liệu TP.HCM không còn đúng sau khi chuyển về Hưng Yên/Hà Nội).
   Chạy khi server đang chạy, chạy lại không đổi gì thêm:  node scripts/set-weekly-hours.mjs */
import { api, tokenFor, pool } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const LATE_CLOSING = { Izakaya: '23:00:00' };
// Quán "Đêm" mở buổi chiều tối (không phải từ sáng): đổi cả giờ mở lẫn giờ đóng
const NIGHT_HOURS = { 'Lẩu Ly Đêm': ['17:00:00', '02:00:00'], 'Cháo Đêm': ['17:00:00', '01:00:00'] };
const db = await connect();
const [owners] = await db.query(
  `SELECT r.id, r.name, r.ward, r.district, TIME_FORMAT(r.opening_time, '%H:%i:%s') AS opening, TIME_FORMAT(r.closing_time, '%H:%i:%s') AS closing, u.username
   FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL ORDER BY r.id`
);
const [existing] = await db.query('SELECT restaurant_id, COUNT(*) AS n FROM restaurant_operating_hours GROUP BY restaurant_id');
await db.end();
const hasHours = new Map(existing.map(row => [Number(row.restaurant_id), Number(row.n)]));
const stats = { hours: 0, ward: 0, closing: 0 };

await pool(owners, 4, async owner => {
  const token = await tokenFor(owner.username);
  const base = `/api/restaurant/restaurants/${owner.id}`;
  const lateKey = Object.keys(LATE_CLOSING).find(key => owner.name.includes(key));
  const nightKey = Object.keys(NIGHT_HOURS).find(key => owner.name.includes(key));
  const patch = {};
  if (nightKey && (owner.opening !== NIGHT_HOURS[nightKey][0] || owner.closing !== NIGHT_HOURS[nightKey][1])) { patch.openingTime = NIGHT_HOURS[nightKey][0]; patch.closingTime = NIGHT_HOURS[nightKey][1]; stats.closing += 1; }
  if (lateKey && owner.closing !== LATE_CLOSING[lateKey]) { patch.closingTime = LATE_CLOSING[lateKey]; stats.closing += 1; }
  if (owner.district && owner.ward !== owner.district) { patch.ward = owner.district; stats.ward += 1; }
  if (Object.keys(patch).length) await api('PATCH', base, { token, body: patch });
  const closing = patch.closingTime ?? owner.closing;
  const opening = patch.openingTime ?? owner.opening;
  if ((hasHours.get(owner.id) ?? 0) !== 7 || patch.closingTime || patch.openingTime) {
    const operatingHours = [1, 2, 3, 4, 5, 6, 7].map(dayOfWeek => ({ dayOfWeek, openTime: opening, closeTime: closing, isClosed: false }));
    await api('PUT', `${base}/operating-hours`, { token, body: { operatingHours } });
    stats.hours += 1;
  }
});
console.log('Đã xử lý:', stats, `(${owners.length} quán)`);
