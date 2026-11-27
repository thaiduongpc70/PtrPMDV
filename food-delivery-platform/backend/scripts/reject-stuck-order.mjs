/* Từ chối (qua API chủ quán) các đơn CONFIRMED bị kẹt sau khi mô phỏng dừng giữa chừng:  node scripts/reject-stuck-order.mjs */
import { connect } from './lib/db.mjs';
import { api, tokenFor } from './lib/api-client.mjs';
const db = await connect();
const [rows] = await db.query("SELECT o.id, u.username FROM orders o JOIN restaurants r ON r.id = o.restaurant_id JOIN users u ON u.id = r.owner_user_id WHERE o.order_status = 'CONFIRMED'");
for (const row of rows) {
  await api('POST', `/api/restaurant/orders/${row.id}/reject`, { token: await tokenFor(row.username), body: { note: 'Quán tạm hết nguyên liệu, xin lỗi bạn' } });
  console.log('Đã từ chối đơn', row.id);
}
await db.end();
