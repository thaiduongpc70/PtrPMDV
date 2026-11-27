/* Dọn dấu vết do bộ test Postman tạo trong DB dùng chung (tài khoản/quán/món/mã khuyến mãi/phiếu hỗ trợ mang tên "Postman").
   Lịch sử chạy test vẫn được giữ trong postman/runs/. Chạy sau khi chạy newman:  node scripts/cleanup-test-artifacts.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const q = async (text, params = []) => (await db.query(text, params))[0];
const log = (label, result) => console.log(`${label}: ${Array.isArray(result) ? result.length : result.affectedRows}`);

const users = await q("SELECT id FROM users WHERE username REGEXP '^(e2e|auth|tx|nha|nhb)(mv)?[0-9a-z]+$' AND username NOT LIKE '%.%'");
const userIds = users.map(row => row.id);
await q('SET FOREIGN_KEY_CHECKS = 0');

if (userIds.length) {
  const restaurants = await q('SELECT id FROM restaurants WHERE owner_user_id IN (?)', [userIds]);
  const restaurantIds = restaurants.map(row => row.id);
  if (restaurantIds.length) {
    for (const table of ['restaurant_operating_hours', 'restaurant_images', 'promotions', 'menu_items', 'menu_categories', 'menus', 'topping_groups']) {
      await q(`DELETE FROM \`${table}\` WHERE restaurant_id IN (?)`, [restaurantIds]);
    }
    log('Quán test', await q('DELETE FROM restaurants WHERE id IN (?)', [restaurantIds]));
  }
  const customers = (await q('SELECT id FROM customer_profiles WHERE user_id IN (?)', [userIds])).map(row => row.id);
  if (customers.length) {
    await q('DELETE FROM customer_addresses WHERE customer_id IN (?)', [customers]);
    await q('DELETE FROM carts WHERE customer_id IN (?)', [customers]);
  }
  const shippers = (await q('SELECT id FROM shipper_profiles WHERE user_id IN (?)', [userIds])).map(row => row.id);
  if (shippers.length) await q('DELETE FROM shipper_documents WHERE shipper_id IN (?)', [shippers]);
  for (const table of ['partner_applications', 'customer_profiles', 'shipper_profiles', 'notification_preferences', 'wallets', 'login_history', 'refresh_tokens', 'notifications']) {
    await q(`DELETE FROM \`${table}\` WHERE user_id IN (?)`, [userIds]);
  }
  log('Tài khoản test', await q('DELETE FROM users WHERE id IN (?)', [userIds]));
}

log('Món test', await q("DELETE FROM menu_items WHERE name LIKE '%(Postman)%'"));
log('Mã khuyến mãi test', await q("DELETE FROM promotions WHERE code REGEXP '^(PM|WEB)[A-Z0-9]+$'"));
const tickets = await q("SELECT id FROM support_tickets WHERE subject LIKE 'Postman%'");
if (tickets.length) {
  await q('DELETE FROM support_messages WHERE ticket_id IN (?)', [tickets.map(row => row.id)]);
  log('Phiếu hỗ trợ test', await q('DELETE FROM support_tickets WHERE id IN (?)', [tickets.map(row => row.id)]));
}

// Văn bản nhãn "Postman" nằm lại trong dữ liệu của tài khoản thật (đơn thử của minh.anh): bỏ nhãn, giữ nguyên giao dịch.
log('Địa chỉ test đã xoá', await q("DELETE FROM customer_addresses WHERE deleted_at IS NOT NULL AND address_line LIKE '%Postman%'"));
log('Khu vực test', await q("DELETE FROM delivery_zones WHERE name LIKE 'Postman%'"));
log('Ghi chú đơn', await q("UPDATE orders SET customer_note = NULL, updated_at = updated_at WHERE customer_note LIKE '%Postman%'"));
log('Ghi chú giao hàng', await q("UPDATE deliveries SET delivery_note = NULL, updated_at = updated_at WHERE delivery_note LIKE '%Postman%'"));
log('Lịch sử giao hàng', await q("UPDATE delivery_status_history SET note = NULL WHERE note LIKE '%Postman%'"));
log('Lý do huỷ', await q("UPDATE order_cancellations SET reason = 'Khách đổi ý' WHERE reason LIKE '%Postman%'"));
log('Lịch sử đơn', await q("UPDATE order_status_history SET note = 'Khách đổi ý' WHERE note LIKE '%Postman%'"));
log('Bình luận đánh giá', await q("UPDATE restaurant_reviews SET comment = NULL, updated_at = updated_at WHERE comment LIKE '%Postman%'"));
await q('SET FOREIGN_KEY_CHECKS = 1');
await db.end();
