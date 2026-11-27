/* Dịch chuỗi tiếng Anh CŨ trong notifications (title, message) và order_status_history.note sang tiếng Việt.
   Chỉ đổi khi khớp CHÍNH XÁC mẫu (giữ nguyên mã đơn); câu khác giữ nguyên và được báo lại. Không đụng cột trạng thái/thời gian/người dùng.
   Dùng:  node scripts/translate-legacy-notes.mjs --dry-run   |   node scripts/translate-legacy-notes.mjs */
import { connect } from './lib/db.mjs';
import { HISTORY_MAP, NOTIFICATION_MESSAGES, ORDER_CODE, translateMessage, translateTitle } from './lib/legacy-translations.mjs';

const DRY = process.argv.includes('--dry-run');
const db = await connect();
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const checksum = async () => ({
  notifications: await q("SELECT COUNT(*) n, BIT_XOR(CRC32(CONCAT_WS('|', id, user_id, type, IFNULL(reference_type, ''), IFNULL(reference_id, ''), is_read, IFNULL(read_at, ''), created_at))) cks FROM notifications").then(r => r[0]),
  history: await q("SELECT COUNT(*) n, BIT_XOR(CRC32(CONCAT_WS('|', id, order_id, IFNULL(old_status, ''), new_status, IFNULL(changed_by, ''), created_at))) cks FROM order_status_history").then(r => r[0])
});

// các mẫu: [nhãn, bảng, cột, điều kiện, biểu thức mới]
const steps = [
  ['notifications.title "Order <mã> updated"', 'notifications', 'title', `title REGEXP '^Order ${ORDER_CODE} updated$'`, "CONCAT('Đơn ', SUBSTRING(title, 7, CHAR_LENGTH(title) - 14), ' có cập nhật')"],
  ['notifications.message "Order <mã> was placed…"', 'notifications', 'message', `message REGEXP '^Order ${ORDER_CODE} was placed and is waiting for restaurant confirmation[.]$'`, "CONCAT('Đơn ', SUBSTRING_INDEX(SUBSTRING(message, 7), ' was placed', 1), ' đã được đặt và đang chờ quán xác nhận.')"],
  ...NOTIFICATION_MESSAGES.map(([from, to]) => [`notifications.message "${from}"`, 'notifications', 'message', { sql: 'message = ?', params: [from] }, { sql: '?', params: [to] }]),
  ...HISTORY_MAP.map(([from, to]) => [`order_status_history.note "${from}"`, 'order_status_history', 'note', { sql: 'note = ?', params: [from] }, { sql: '?', params: [to] }])
];

const before = await checksum();
console.log('TRƯỚC:', JSON.stringify(before));
let total = 0;
for (const [label, table, column, where, value] of steps) {
  const whereSql = typeof where === 'string' ? where : where.sql;
  const whereParams = typeof where === 'string' ? [] : where.params;
  const [{ n }] = await q(`SELECT COUNT(*) n FROM ${table} WHERE ${whereSql}`, whereParams);
  console.log(`  ${label}: ${n} dòng`);
  total += Number(n);
  if (!DRY && n > 0) {
    const valueSql = typeof value === 'string' ? value : value.sql;
    const valueParams = typeof value === 'string' ? [] : value.params;
    const [result] = await db.query(`UPDATE ${table} SET ${column} = ${valueSql} WHERE ${whereSql}`, [...valueParams, ...whereParams]);
    console.log(`    -> đã đổi ${result.affectedRows}`);
  }
}
console.log(`Tổng số dòng khớp mẫu: ${total}${DRY ? ' (DRY-RUN: chưa thay đổi gì)' : ''}`);

// câu còn lại không có chữ tiếng Việt (chỉ ASCII) — báo cáo để biết còn bao nhiêu
for (const [table, column] of [['notifications', 'title'], ['notifications', 'message'], ['order_status_history', 'note']]) {
  const rows = await q(`SELECT ${column} v, COUNT(*) n FROM ${table} WHERE ${column} IS NOT NULL AND ${column} <> '' AND NOT (${column} REGEXP '[^ -~]') GROUP BY ${column} ORDER BY n DESC LIMIT 5`);
  const [{ n }] = await q(`SELECT COUNT(*) n FROM ${table} WHERE ${column} IS NOT NULL AND ${column} <> '' AND NOT (${column} REGEXP '[^ -~]')`);
  console.log(`Còn chuỗi thuần ASCII ở ${table}.${column}: ${n}`, rows.map(r => `"${String(r.v).slice(0, 60)}" x${r.n}`).join(' ; '));
}
const after = await checksum();
console.log('SAU:', JSON.stringify(after));
console.log('Số dòng và checksum cột trạng thái/thời gian/người dùng:', JSON.stringify(before) === JSON.stringify(after) ? 'KHÔNG ĐỔI' : 'THAY ĐỔI (kiểm tra lại)');
await db.end();
