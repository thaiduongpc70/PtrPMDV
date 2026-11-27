/* Đợt 18 (D7): đổi email *.local của tài khoản mô phỏng sang @example.com.
   - Email QUÁN: qua API admin thật PATCH /api/admin/restaurants/:id.
   - Email TÀI KHOẢN: hệ thống KHÔNG có API đổi email, nên cập nhật trực tiếp bảng users (giữ nguyên updated_at), có kiểm tra trùng trước.
   Dùng:  node scripts/change-local-emails.mjs --dry-run   |   node scripts/change-local-emails.mjs  (server đang chạy) */
import { api, tokenFor } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const DRY = process.argv.includes('--dry-run');
const db = await connect();
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const next = email => email.replace(/@fooddelivery\.local$/i, '@example.com');
const users = await q("SELECT id, username, email FROM users WHERE email LIKE '%@fooddelivery.local' ORDER BY id");
const shops = await q("SELECT id, name, email FROM restaurants WHERE email LIKE '%@fooddelivery.local' ORDER BY id");
const wanted = users.map(u => next(u.email));
const clash = wanted.length ? await q(`SELECT email FROM users WHERE email IN (${wanted.map(() => '?').join(',')})`, wanted) : [];
const dupes = wanted.filter((email, index) => wanted.indexOf(email) !== index);
console.log(`Tài khoản .local: ${users.length}; quán .local: ${shops.length}; email mới bị trùng: ${clash.length + dupes.length}`);
users.slice(0, 3).forEach(u => console.log(`  ${u.username}: ${u.email} -> ${next(u.email)}`));
if (DRY || clash.length || dupes.length) { console.log(DRY ? 'DRY-RUN: chưa thay đổi gì.' : 'DỪNG vì trùng email.'); await db.end(); process.exit(DRY ? 0 : 1); }
const admin = await tokenFor('thaiduongpc7');
let viaApi = 0;
for (const shop of shops) { await api('PATCH', `/api/admin/restaurants/${shop.id}`, { token: admin, body: { email: next(shop.email) } }); viaApi += 1; }
let direct = 0;
for (const user of users) { const [result] = await db.query('UPDATE users SET email = ?, updated_at = updated_at WHERE id = ? AND email = ?', [next(user.email), user.id, user.email]); direct += result.affectedRows; }
const [left] = await q("SELECT (SELECT COUNT(*) FROM users WHERE email LIKE '%.local') u, (SELECT COUNT(*) FROM restaurants WHERE email LIKE '%.local') r");
console.log(`Quán đổi qua API: ${viaApi}; tài khoản đổi trực tiếp: ${direct}; còn .local: users=${left.u}, restaurants=${left.r}`);
await db.end();
