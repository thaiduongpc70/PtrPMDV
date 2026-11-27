/* Đợt 20: đơn đã huỷ/thất bại còn orders.payment_status = PENDING (giao dịch đã CANCELLED/FAILED) -> CANCELLED (đơn huỷ) / FAILED (giao thất bại).
   Không xoá bản ghi, giữ updated_at. Cần chạy migration 20261127c trước.  Dùng:  node scripts/close-order-payment-status.mjs --dry-run | (không cờ) */
import { connect } from './lib/db.mjs';

const DRY = process.argv.includes('--dry-run');
const db = await connect();
const q = async sql => (await db.query(sql))[0];
const snapshot = async () => ({
  theoTrangThai: await q("SELECT order_status, payment_status, COUNT(*) AS n FROM orders WHERE order_status IN ('CANCELLED','FAILED') GROUP BY 1, 2 ORDER BY 1, 2"),
  tongDon: Number((await q('SELECT COUNT(*) n FROM orders'))[0].n),
  checksum: (await q("SELECT BIT_XOR(CRC32(CONCAT_WS('|', id, order_status, total_amount, ordered_at, IFNULL(updated_at, '')))) c FROM orders"))[0].c
});
console.log('TRƯỚC:', JSON.stringify(await snapshot()));
const enumType = (await q("SHOW COLUMNS FROM orders LIKE 'payment_status'"))[0].Type;
if (!enumType.includes("'CANCELLED'")) { console.log('Chưa có giá trị CANCELLED trong enum: chạy migration 20261127c trước.'); if (!DRY) process.exit(1); }
const todo = await q("SELECT order_status, COUNT(*) AS n FROM orders WHERE order_status IN ('CANCELLED','FAILED') AND payment_status = 'PENDING' GROUP BY order_status");
console.log('Sẽ đổi:', JSON.stringify(todo));
if (DRY) console.log('DRY-RUN: chưa thay đổi gì.');
else {
  const [r] = await db.query("UPDATE orders SET payment_status = IF(order_status = 'FAILED', 'FAILED', 'CANCELLED'), updated_at = updated_at WHERE order_status IN ('CANCELLED','FAILED') AND payment_status = 'PENDING'");
  console.log('Đã đổi', r.affectedRows);
  console.log('SAU:', JSON.stringify(await snapshot()));
}
await db.end();
