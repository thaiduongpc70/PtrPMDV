/* Giờ mở cửa đúng loại hình (quán đêm mở qua nửa đêm), cập nhật qua API chủ quán.
   Giờ mở vẫn từ 07:00 nên mọi đơn đã phát sinh (07h-22h) đều nằm trong giờ mở cửa. Chạy khi server đang chạy:  node scripts/set-opening-hours.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, tokenFor } from './lib/api-client.mjs';

const CLOSING = { 'Lẩu Ly Đêm Sài Gòn': '02:00', 'Cháo Đêm Ấm Bụng': '01:00', 'Quán Vặt Cô Ba': '23:00', 'Trà Sữa Lá Non': '23:00', 'Nước Ép Mùa Xanh': '22:30', 'Pizza Lò Gạch': '23:00', 'Burger Phố Nướng': '23:00' };

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const [owners] = await db.query('SELECT r.id, r.name, u.username FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id ORDER BY r.id');
await db.end();

let changed = 0;
for (const owner of owners.filter(item => CLOSING[item.name])) {
  const token = await tokenFor(owner.username);
  const current = await api('GET', `/api/restaurant/restaurants/${owner.id}`, { token });
  if (String(current.closingTime).slice(0, 5) === CLOSING[owner.name]) continue;
  await api('PATCH', `/api/restaurant/restaurants/${owner.id}`, { token, body: { ...current, closingTime: CLOSING[owner.name] } });
  changed += 1;
}
console.log(`Đã cập nhật giờ mở cửa cho ${changed} quán.`);
