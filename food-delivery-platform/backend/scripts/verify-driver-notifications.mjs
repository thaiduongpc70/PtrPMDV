/* Kiểm chứng THẬT (qua API) thông báo cho tài xế khi được giao đơn: 1 khách mô phỏng (kh.*, KHÔNG phải minh.anh) đặt 1 đơn COD ở quán Hà Nội đang mở,
   chủ quán xác nhận -> chuẩn bị -> sẵn sàng, admin giao tài xế, rồi đọc thông báo của tài xế. Đơn được giao xong bằng resolve-stuck-orders.mjs để không để kẹt.
   Tạo đúng 1 đơn thật (DELIVERED).   Dùng:  node scripts/verify-driver-notifications.mjs */
import { api, tokenFor } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const db = await connect();
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const [pick] = await q(`SELECT u.username customer, cp.id cpid, ca.id address_id, ca.latitude lat, ca.longitude lng FROM users u JOIN customer_profiles cp ON cp.user_id = u.id
  JOIN customer_addresses ca ON ca.customer_id = cp.id AND ca.is_default = 1 WHERE u.username LIKE 'kh.%' AND cp.id > 255 AND ca.latitude > 20.85 ORDER BY cp.id DESC LIMIT 1`);
const [shop] = await q(`SELECT r.id, u.username owner, r.name, r.minimum_order, ROUND(6371 * 2 * ASIN(SQRT(POW(SIN(RADIANS(r.latitude - ?) / 2), 2) + COS(RADIANS(?)) * COS(RADIANS(r.latitude)) * POW(SIN(RADIANS(r.longitude - ?) / 2), 2))), 2) km,
    (SELECT mi.id FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.deleted_at IS NULL AND mi.is_available = 1 AND mi.item_type = 'DISH' AND mi.name NOT LIKE 'Bia %'
       AND NOT EXISTS (SELECT 1 FROM menu_item_variants v WHERE v.menu_item_id = mi.id) AND NOT EXISTS (SELECT 1 FROM menu_item_topping_groups g WHERE g.menu_item_id = mi.id) ORDER BY mi.base_price DESC LIMIT 1) item_id
  FROM restaurants r JOIN users u ON u.id = r.owner_user_id WHERE r.deleted_at IS NULL AND r.status = 'ACTIVE' AND r.latitude > 20.85
    AND r.opening_time <= CURTIME() AND (r.closing_time > CURTIME() OR r.closing_time <= r.opening_time) HAVING km <= 8 AND item_id IS NOT NULL ORDER BY km LIMIT 1`, [pick.lat, pick.lat, pick.lng]);
if (!pick || !shop) { console.log('Không có khách/quán Hà Nội phù hợp lúc này (quán đóng cửa?)'); await db.end(); process.exit(1); }
const [shipper] = await q("SELECT sp.id, u.username FROM shipper_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.availability_status = 'AVAILABLE' AND sp.deleted_at IS NULL AND sp.vehicle_plate LIKE '29%' ORDER BY sp.id LIMIT 1");
console.log(`Khách ${pick.customer} -> quán "${shop.name}" (${shop.km} km), tài xế ${shipper.username}`);
const customer = await tokenFor(pick.customer); const owner = await tokenFor(shop.owner); const admin = await tokenFor('thaiduongpc7'); const driver = await tokenFor(shipper.username);
const before = (await api('GET', '/api/notifications?pageSize=5', { token: driver })).totalItems;
const [{ min }] = [{ min: Number(shop.minimum_order) }];
const [{ base }] = await q('SELECT base_price base FROM menu_items WHERE id = ?', [shop.item_id]);
await api('DELETE', `/api/customer/cart/${shop.id}`, { token: customer }).catch(() => {});
await api('POST', '/api/customer/cart/items', { token: customer, body: { restaurantId: shop.id, menuItemId: shop.item_id, quantity: Math.max(1, Math.ceil(min / Number(base))) } });
const order = await api('POST', '/api/customer/orders/checkout', { token: customer, headers: { 'Idempotency-Key': `verify-driver-${Date.now()}` }, body: { restaurantId: shop.id, addressId: pick.address_id, paymentMethod: 'COD', ageConfirmed: true } });
console.log(`Đơn ${order.orderCode} (#${order.id}) đã tạo`);
for (const step of ['confirm', 'prepare', 'ready']) await api('POST', `/api/restaurant/orders/${order.id}/${step}`, { token: owner });
const assigned = await api('POST', '/api/deliveries/assign', { token: admin, body: { orderId: order.id, shipperId: shipper.id, distanceKm: shop.km } });
await new Promise(resolve => setTimeout(resolve, 1500));
const notices = await api('GET', '/api/notifications?pageSize=5', { token: driver });
const mine = notices.items.filter(item => item.referenceType === 'ORDER' && Number(item.referenceId) === Number(order.id));
console.log(`Thông báo của tài xế (trước ${before}, sau ${notices.totalItems}):`);
for (const item of mine) console.log(`  [${item.type}] ${item.title} — ${item.message}`);
const ownerNotices = (await api('GET', '/api/notifications?pageSize=10', { token: owner })).items.filter(item => Number(item.referenceId) === Number(order.id));
console.log('Thông báo của chủ quán:', ownerNotices.map(item => item.message).join(' | '));
const history = await q('SELECT new_status, note FROM order_status_history WHERE order_id = ? ORDER BY id', [order.id]);
console.log('Ghi chú trạng thái:', history.map(row => `${row.new_status}: ${row.note}`).join(' | '));
console.log(`Giao đơn: assignment #${assigned.assignmentId}. Hoàn tất giao đơn bằng: node scripts/resolve-stuck-orders.mjs ${order.id}`);
await db.end();
