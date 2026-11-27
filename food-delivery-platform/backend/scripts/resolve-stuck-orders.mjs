/* Hoàn tất giao các đơn kẹt ở SHIPPER_ASSIGNED bằng đúng API tài xế (nhận chuyến -> lấy hàng -> đang giao -> đã giao).
   Dùng:  node scripts/resolve-stuck-orders.mjs <orderId> [<orderId> ...]   (server phải đang chạy; đơn phải có chuyến giao ở trạng thái ASSIGNED) */
import { api, tokenFor } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const orderIds = process.argv.slice(2).map(Number).filter(Number.isInteger);
if (!orderIds.length) { console.error('Cần ít nhất một orderId'); process.exit(1); }
const db = await connect();
for (const orderId of orderIds) {
  const [rows] = await db.query(
    `SELECT d.id AS delivery_id, da.id AS assignment_id, da.assignment_status, u.username,
            r.latitude AS r_lat, r.longitude AS r_lng, o.delivery_latitude AS d_lat, o.delivery_longitude AS d_lng, o.order_status
     FROM orders o INNER JOIN deliveries d ON d.order_id = o.id INNER JOIN delivery_assignments da ON da.order_id = o.id AND da.shipper_id = d.shipper_id
     INNER JOIN shipper_profiles sp ON sp.id = d.shipper_id INNER JOIN users u ON u.id = sp.user_id INNER JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.id = ? ORDER BY da.id DESC LIMIT 1`, [orderId]
  );
  const row = rows[0];
  if (!row || row.order_status !== 'SHIPPER_ASSIGNED') { console.log(`Bỏ qua đơn ${orderId}: không ở trạng thái SHIPPER_ASSIGNED`); continue; }
  const token = await tokenFor(row.username);
  if (row.assignment_status === 'OFFERED') await api('POST', `/api/shippers/assignments/${row.assignment_id}/accept`, { token, body: {} });
  const base = `/api/shippers/deliveries/${row.delivery_id}/status`;
  await api('POST', base, { token, body: { status: 'PICKED_UP', latitude: Number(row.r_lat), longitude: Number(row.r_lng) } });
  await api('POST', base, { token, body: { status: 'DELIVERING', latitude: Number(row.r_lat), longitude: Number(row.r_lng) } });
  await api('POST', base, { token, body: { status: 'DELIVERED', latitude: Number(row.d_lat), longitude: Number(row.d_lng), note: 'Giao thành công' } });
  console.log(`Đơn ${orderId}: đã giao xong (${row.username})`);
}
await db.end();
