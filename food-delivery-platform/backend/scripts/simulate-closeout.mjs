/* Khép sổ vận hành, vẫn qua API thật: admin xử lý hoàn tiền còn tồn, tạo quyết toán hàng tuần cho từng quán, đối soát COD đã thu,
   khách/chủ quán đánh dấu đã đọc thông báo. Sau đó đặt mốc thời gian của các bản ghi này về đúng thời điểm nghiệp vụ.
   Chạy sau spread-timeline.mjs (server đang chạy):  node scripts/simulate-closeout.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, tokenFor, pool } from './lib/api-client.mjs';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261017);

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4', dateStrings: true
});
const sql = async (text, params = []) => (await db.query(text, params))[0];
const nowNaive = Math.floor(Date.now() / 1000 - new Date().getTimezoneOffset() * 60);
// --since 'YYYY-MM-DD HH:MM:SS': chạy lại sau khi lần trước dừng giữa chừng để vẫn chỉnh mốc các bản ghi đã tạo
const sinceIndex = process.argv.indexOf('--since');
const [{ started }] = sinceIndex >= 0 ? [{ started: process.argv[sinceIndex + 1] }] : await sql('SELECT NOW() AS started');
const adminToken = await tokenFor('thaiduongpc7');
const threeDaysAgo = "DATE_SUB(NOW(), INTERVAL 3 DAY)";

const ADJUST_ONLY = process.argv.includes('--adjust-only'); // chỉ chỉnh mốc thời gian (khi bước API đã chạy xong)
if (!ADJUST_ONLY) {
/* 1. Hoàn tiền còn tồn của đơn cũ */
const refunds = await sql(`SELECT r.id FROM refunds r INNER JOIN orders o ON o.id = r.order_id
  WHERE r.status IN ('PENDING', 'PROCESSING') AND o.ordered_at < ${threeDaysAgo} ORDER BY r.id`);
await pool(refunds, 6, async refund => {
  const roll = rnd();
  await api('PATCH', `/api/admin/manage/refunds/${refund.id}`, { token: adminToken, body: { status: roll < 0.94 ? 'COMPLETED' : 'REJECTED' } });
});
console.log(`Hoàn tiền xử lý thêm: ${refunds.length}`);

/* 2. Quyết toán hàng tuần (thứ Hai -> Chủ nhật), chỉ các tuần đã kết thúc */
const weeks = [];
for (let start = Date.UTC(2026, 7, 24); start + 6 * 86400000 < nowNaive * 1000 - 86400000; start += 7 * 86400000) {
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  weeks.push([iso(start), iso(start + 6 * 86400000)]);
}
// --regenerate-settlements: sau khi có thêm đơn mới ở các tuần cũ, quyết toán phải tính lại từ đầu cho đúng doanh thu
if (process.argv.includes('--regenerate-settlements')) {
  await sql('DELETE FROM restaurant_settlements');
  await sql("DELETE FROM audit_logs WHERE action IN ('RESTAURANT_SETTLEMENT_GENERATE', 'ADMIN_SETTLEMENT_UPDATE')");
}
const existing = Number((await sql('SELECT COUNT(*) AS n FROM restaurant_settlements'))[0].n);
if (existing === 0) {
  for (const [periodStart, periodEnd] of weeks) {
    await api('POST', '/api/settlements/admin/settlements/generate', { token: adminToken, body: { periodStart, periodEnd } });
  }
}
const settlements = await sql('SELECT id, period_end FROM restaurant_settlements ORDER BY id');
const lastPeriod = settlements.reduce((max, row) => (row.period_end > max ? row.period_end : max), '');
await pool(settlements.filter(row => row.period_end !== lastPeriod), 6, row => api('PATCH', `/api/admin/manage/settlements/${row.id}`, { token: adminToken, body: { status: 'SETTLED' } }));
console.log(`Quyết toán: ${weeks.length} tuần, ${settlements.length} bản ghi (tuần gần nhất để chờ thanh toán)`);

/* 3. Đối soát COD đã thu hơn 3 ngày */
const cods = await sql(`SELECT ct.id FROM cod_transactions ct WHERE ct.status = 'COLLECTED' AND ct.collected_at < ${threeDaysAgo} ORDER BY ct.id`);
await pool(cods, 8, cod => api('POST', `/api/payments/cod/${cod.id}/settle`, { token: adminToken, body: {} }));
console.log(`Đối soát COD: ${cods.length}`);

/* 4. Đánh dấu đã đọc thông báo (đa số thông báo cũ đã đọc, thông báo mới còn chưa đọc) */
const notes = await sql(`SELECT n.id, u.username, u.role_id, n.created_at < DATE_SUB(NOW(), INTERVAL 1 DAY) AS old FROM notifications n
  INNER JOIN users u ON u.id = n.user_id WHERE n.is_read = 0 ORDER BY n.id`);
const toRead = notes.filter(note => rnd() < (Number(note.old) ? (note.role_id === 4 ? 0.93 : 0.88) : 0.35));
await pool(toRead, 10, async note => api('PATCH', `/api/notifications/${note.id}/read`, { token: await tokenFor(note.username) }));
console.log(`Thông báo đã đọc: ${toRead.length}/${notes.length}`);

}

/* 5. Đưa mốc thời gian của các bản ghi vừa tạo về đúng thời điểm nghiệp vụ */
console.log('Điều chỉnh mốc thời gian:');
await sql("SET time_zone = '+00:00'");
const clock = `FROM_UNIXTIME(${nowNaive} - 120)`;
const touch = async (label, text, params = []) => console.log(`  ${label}: ${(await sql(text, params)).affectedRows}`);
const cutoff = String(started);
await touch('refunds.processed_at', `UPDATE refunds SET processed_at = LEAST(DATE_ADD(created_at, INTERVAL 3600 + MOD(id * 911, 172800) SECOND), ${clock}) WHERE processed_at >= ?`, [cutoff]);
await touch('restaurant_settlements', `UPDATE restaurant_settlements SET created_at = LEAST(DATE_ADD(period_end, INTERVAL (86400 + 9 * 3600 + MOD(id * 137, 7200)) SECOND), ${clock}),
  settled_at = IF(status = 'SETTLED', LEAST(DATE_ADD(period_end, INTERVAL (172800 + 9 * 3600 + MOD(id * 211, 14400)) SECOND), ${clock}), settled_at)
  WHERE created_at >= ?`, [cutoff]);
await touch('cod_transactions.settled_at', `UPDATE cod_transactions SET settled_at = LEAST(DATE_ADD(collected_at, INTERVAL 86400 + MOD(id * 977, 172800) SECOND), ${clock}) WHERE settled_at >= ?`, [cutoff]);
await touch('notifications.read_at', `UPDATE notifications SET read_at = LEAST(DATE_ADD(created_at, INTERVAL 30 + ROUND(POW(MOD(id * 2654435761, 10007) / 10007, 2.5) * 36000) SECOND), ${clock}) WHERE read_at >= ?`, [cutoff]);
await touch('audit đọc thông báo', `UPDATE audit_logs a JOIN notifications n ON n.id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.path')), '/', 2), '/', -1) AS UNSIGNED)
  SET a.created_at = n.read_at WHERE a.created_at >= ? AND a.action = 'PATCH_REQUEST' AND JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.path')) REGEXP '^/[0-9]+/read$'`, [cutoff]);
await touch('audit COD_SETTLE', `UPDATE audit_logs a JOIN cod_transactions c ON c.id = a.entity_id SET a.created_at = c.settled_at WHERE a.created_at >= ? AND a.action = 'COD_SETTLE'`, [cutoff]);
await touch('audit ADMIN_REFUND_UPDATE', `UPDATE audit_logs a JOIN refunds r ON r.id = a.entity_id SET a.created_at = r.processed_at WHERE a.created_at >= ? AND a.action = 'ADMIN_REFUND_UPDATE'`, [cutoff]);
await touch('audit ADMIN_SETTLEMENT_UPDATE', `UPDATE audit_logs a JOIN restaurant_settlements s ON s.id = a.entity_id SET a.created_at = COALESCE(s.settled_at, s.created_at) WHERE a.created_at >= ? AND a.action = 'ADMIN_SETTLEMENT_UPDATE'`, [cutoff]);
await touch('audit RESTAURANT_SETTLEMENT_GENERATE', `UPDATE audit_logs a JOIN (SELECT period_end, MIN(created_at) AS at FROM restaurant_settlements GROUP BY period_end) s
  ON s.period_end = JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.changes.periodEnd')) SET a.created_at = s.at WHERE a.created_at >= ? AND a.action = 'RESTAURANT_SETTLEMENT_GENERATE'`, [cutoff]);
await db.end();
