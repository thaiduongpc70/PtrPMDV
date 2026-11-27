/* Kiểm chứng SỐNG thông báo khi đơn bị huỷ / giao thất bại (có tài xế), qua API thật, bằng khách mô phỏng kh.* (không phải minh.anh). Tạo đúng 3 đơn:
   A) có tài xế, bếp kẹt -> job huỷ quá hạn;  B) tài xế đã lấy món, kẹt giao -> job đánh dấu thất bại;  C) khách tự huỷ lúc PENDING.
   Chạy server TẠM với STALE_ORDER_MINUTES=1 STALE_DELIVERY_MINUTES=1, rồi:  node scripts/verify-cancel-fail-notifications.mjs   (tự đợi job tối đa ~4 phút)
   Chạy xong khởi động lại server bình thường. */
import { api, tokenFor } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const db = await connect();
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const customers = await q(`SELECT u.username, ca.id address_id, ca.latitude lat, ca.longitude lng FROM users u JOIN customer_profiles cp ON cp.user_id = u.id
  JOIN customer_addresses ca ON ca.customer_id = cp.id AND ca.is_default = 1 WHERE u.username LIKE 'kh.%' AND cp.id > 255 AND ca.latitude > 20.85 ORDER BY cp.id DESC LIMIT 3`);
const shopFor = async customer => (await q(`SELECT r.id, u.username owner, r.name, r.minimum_order,
    ROUND(6371 * 2 * ASIN(SQRT(POW(SIN(RADIANS(r.latitude - ?) / 2), 2) + COS(RADIANS(?)) * COS(RADIANS(r.latitude)) * POW(SIN(RADIANS(r.longitude - ?) / 2), 2))), 2) km,
    (SELECT mi.id FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.deleted_at IS NULL AND mi.is_available = 1 AND mi.item_type = 'DISH' AND mi.name NOT LIKE 'Bia %'
       AND NOT EXISTS (SELECT 1 FROM menu_item_variants v WHERE v.menu_item_id = mi.id) AND NOT EXISTS (SELECT 1 FROM menu_item_topping_groups g WHERE g.menu_item_id = mi.id) ORDER BY mi.base_price DESC LIMIT 1) item_id
  FROM restaurants r JOIN users u ON u.id = r.owner_user_id WHERE r.deleted_at IS NULL AND r.status = 'ACTIVE' AND r.latitude > 20.85
    AND r.opening_time <= CURTIME() AND (r.closing_time > CURTIME() OR r.closing_time <= r.opening_time) HAVING km <= 8 AND item_id IS NOT NULL ORDER BY km LIMIT 1`, [customer.lat, customer.lat, customer.lng]))[0];
const shippers = await q("SELECT sp.id, u.username FROM shipper_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.availability_status = 'AVAILABLE' AND sp.deleted_at IS NULL AND sp.vehicle_plate LIKE '29%' ORDER BY sp.id LIMIT 2");
if (customers.length < 3 || shippers.length < 2) { console.log('Không đủ khách/tài xế Hà Nội'); process.exit(1); }
const admin = await tokenFor('thaiduongpc7');

async function createOrder(customer) {
  const shop = await shopFor(customer);
  if (!shop) throw new Error('Không có quán Hà Nội đang mở gần khách');
  const token = await tokenFor(customer.username);
  const [{ base }] = await q('SELECT base_price base FROM menu_items WHERE id = ?', [shop.item_id]);
  await api('DELETE', `/api/customer/cart/${shop.id}`, { token }).catch(() => {});
  await api('POST', '/api/customer/cart/items', { token, body: { restaurantId: shop.id, menuItemId: shop.item_id, quantity: Math.max(1, Math.ceil(Number(shop.minimum_order) / Number(base))) } });
  const order = await api('POST', '/api/customer/orders/checkout', { token, headers: { 'Idempotency-Key': `verify-cf-${customer.username}-${Date.now()}` }, body: { restaurantId: shop.id, addressId: customer.address_id, paymentMethod: 'COD', ageConfirmed: true } });
  console.log(`Đơn ${order.orderCode} (#${order.id}) khách ${customer.username}, quán "${shop.name}"`);
  return { order, shop, customer };
}
async function toReady(job) { const owner = await tokenFor(job.shop.owner); for (const step of ['confirm', 'prepare', 'ready']) await api('POST', `/api/restaurant/orders/${job.order.id}/${step}`, { token: owner }); }
const assign = (job, shipper) => api('POST', '/api/deliveries/assign', { token: admin, body: { orderId: job.order.id, shipperId: shipper.id, distanceKm: job.shop.km } });

// C: khách tự huỷ lúc PENDING
const c = await createOrder(customers[2]);
await api('POST', `/api/payments/orders/${c.order.id}/cancel`, { token: await tokenFor(c.customer.username), body: { reasonCode: 'CUSTOMER_CHANGED_MIND', reason: 'Đổi ý, không muốn đặt nữa' } });
// A: có tài xế, kẹt bếp (SHIPPER_ASSIGNED)
const a = await createOrder(customers[0]); await toReady(a); await assign(a, shippers[0]);
// B: tài xế đã lấy món, kẹt giao
const b = await createOrder(customers[1]); await toReady(b); const assigned = await assign(b, shippers[1]);
const driverB = await tokenFor(shippers[1].username);
await api('POST', `/api/shippers/assignments/${assigned.assignmentId}/accept`, { token: driverB, body: {} });
await api('POST', `/api/shippers/deliveries/${assigned.deliveryId}/status`, { token: driverB, body: { status: 'PICKED_UP' } });
console.log('Chờ job huỷ / đánh dấu thất bại (STALE_*_MINUTES=1)…');
let statuses = {};
for (let i = 0; i < 24; i += 1) {
  await sleep(10000);
  const rows = await q('SELECT id, order_status FROM orders WHERE id IN (?, ?, ?)', [a.order.id, b.order.id, c.order.id]);
  statuses = Object.fromEntries(rows.map(row => [row.id, row.order_status]));
  if (statuses[a.order.id] === 'CANCELLED' && statuses[b.order.id] === 'FAILED') break;
}
await sleep(3000);
console.log('Trạng thái:', JSON.stringify(statuses));
for (const [label, job, shipper] of [['A (huỷ do hệ thống, có tài xế)', a, shippers[0]], ['B (giao thất bại, có tài xế)', b, shippers[1]], ['C (khách tự huỷ)', c, null]]) {
  console.log(`--- ${label} đơn #${job.order.id} ${job.order.orderCode}`);
  const who = [['khách', job.customer.username], ['chủ quán', job.shop.owner], ...(shipper ? [['tài xế', shipper.username]] : []), ['admin', 'thaiduongpc7']];
  for (const [role, username] of who) {
    const rows = await q(`SELECT n.type, n.title, n.message FROM notifications n JOIN users u ON u.id = n.user_id WHERE u.username = ? AND n.reference_id = ? AND n.reference_type = 'ORDER' ORDER BY n.id`, [username, job.order.id]);
    const ending = rows.filter(row => /huỷ|thất bại|không thành công|tự huỷ/i.test(`${row.title} ${row.message}`));
    console.log(`  ${role} (${username}): ${rows.length} thông báo; liên quan huỷ/thất bại: ${ending.map(row => `[${row.type}] ${row.title}`).join(' | ') || 'không có'}`);
  }
}
const history = await q('SELECT order_id, new_status, note FROM order_status_history WHERE order_id IN (?, ?, ?) ORDER BY order_id, id', [a.order.id, b.order.id, c.order.id]);
console.log('Ghi chú trạng thái đơn mới:', history.map(row => `#${row.order_id} ${row.new_status}: ${row.note}`).join(' | '));
await db.end();
