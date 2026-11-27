/* Hoàn tiền cho đơn ĐÃ HUỶ / THẤT BẠI nhưng vẫn "đã thanh toán" (không phải COD) qua API admin thật:
   yêu cầu hoàn đang PENDING/PROCESSING/REJECTED -> PROCESSING -> COMPLETED (API tự chuyển đơn sang REFUNDED).
   Không tạo/xoá dữ liệu bằng SQL. Dùng:  node scripts/refund-failed-orders.mjs --dry-run   |   node scripts/refund-failed-orders.mjs */
import 'dotenv/config';
import { api, tokenFor } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';
import { stepsToComplete } from '../src/modules/jobs/refund-rules.js';

const DRY = process.argv.includes('--dry-run');
const db = await connect();
const [rows] = await db.query(`SELECT f.id, f.status, o.id AS order_id, o.order_status FROM refunds f JOIN orders o ON o.id = f.order_id
  WHERE o.order_status IN ('CANCELLED', 'FAILED') AND o.payment_status = 'PAID' AND o.payment_method <> 'COD' AND o.deleted_at IS NULL ORDER BY f.id`);
const byStatus = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
const [[{ n }]] = await db.query(`SELECT COUNT(*) n FROM orders o WHERE o.order_status IN ('CANCELLED','FAILED') AND o.payment_status = 'PAID' AND o.payment_method <> 'COD' AND NOT EXISTS (SELECT 1 FROM refunds f WHERE f.order_id = o.id)`);
console.log(`Đơn huỷ/thất bại còn PAID: ${rows.length} có yêu cầu hoàn`, JSON.stringify(byStatus), `| chưa có yêu cầu hoàn: ${n}`);
if (DRY) { console.log('DRY-RUN: chưa thay đổi gì.'); await db.end(); process.exit(0); }
const token = await tokenFor('thaiduongpc7');
let done = 0;
for (const row of rows) {
  for (const status of stepsToComplete(row.status)) await api('PATCH', `/api/admin/manage/refunds/${row.id}`, { token, body: { status } });
  done += 1;
}
const [[after]] = await db.query(`SELECT COUNT(*) n FROM orders WHERE order_status IN ('CANCELLED','FAILED') AND payment_status = 'PAID' AND payment_method <> 'COD'`);
console.log(`Đã hoàn ${done} đơn. Còn PAID: ${after.n}`);
await db.end();
