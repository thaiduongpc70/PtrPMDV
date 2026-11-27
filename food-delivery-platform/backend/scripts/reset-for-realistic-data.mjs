/* Dọn dữ liệu mẫu/test để chạy mô phỏng thật (simulate-activity.mjs):
   - xoá quán "Demo Kitchen", "Smoke Import Kitchen", tài khoản demo/Postman và toàn bộ thực đơn cũ (món ghép máy);
   - xoá dữ liệu giao dịch cũ (đơn, thanh toán, giao hàng, đánh giá, nhật ký...) để dữ liệu mới sinh ra hoàn toàn từ API thật.
   Giữ lại: tài khoản admin, chủ quán, khách và tài xế có tên thật, danh mục, khuyến mãi, cấu hình hệ thống.
   Chạy:  node scripts/reset-for-realistic-data.mjs --yes   (nên sao lưu DB trước: npm run db:backup) */
import 'dotenv/config';
import mysql from 'mysql2/promise';

if (!process.argv.includes('--yes')) {
  console.log('Thêm --yes để xác nhận xoá dữ liệu giao dịch và dữ liệu mẫu.');
  process.exit(1);
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const q = async (sql, params = []) => (await db.query(sql, params))[0];

const TRANSACTIONAL = [
  'order_item_toppings', 'order_items', 'order_status_history', 'order_cancellations', 'menu_item_reviews', 'restaurant_reviews', 'shipper_reviews',
  'promotion_usage', 'refunds', 'invoices', 'cod_transactions', 'payment_transactions', 'payments',
  'delivery_status_history', 'delivery_assignments', 'shipper_locations', 'shipper_earnings', 'shipper_withdrawals', 'deliveries',
  'restaurant_commissions', 'restaurant_settlements', 'orders',
  'chat_messages', 'chat_sessions', 'support_messages', 'support_tickets', 'notifications',
  'cart_item_toppings', 'cart_items', 'carts', 'search_history', 'favorite_menu_items', 'favorite_restaurants',
  'export_jobs', 'import_jobs', 'partner_applications', 'wallet_transactions',
  'audit_logs', 'login_history', 'refresh_tokens', 'password_reset_tokens', 'email_verification_tokens'
];

await q('SET FOREIGN_KEY_CHECKS = 0');
for (const table of TRANSACTIONAL) {
  await q(`TRUNCATE TABLE \`${table}\``);
  console.log('đã xoá dữ liệu', table);
}

// Quán mẫu / quán nhập thử và chủ quán của chúng.
const junkRestaurants = await q("SELECT id, owner_user_id FROM restaurants WHERE name LIKE 'Demo Kitchen%' OR name = 'Smoke Import Kitchen'");
const junkRestaurantIds = junkRestaurants.map(row => row.id);
if (junkRestaurantIds.length) {
  for (const table of ['restaurant_operating_hours', 'restaurant_images', 'topping_groups', 'menu_categories', 'menus', 'menu_items', 'promotions']) {
    await q(`DELETE FROM \`${table}\` WHERE restaurant_id IN (?)`, [junkRestaurantIds]);
  }
  await q('DELETE FROM restaurants WHERE id IN (?)', [junkRestaurantIds]);
  console.log('đã xoá quán mẫu:', junkRestaurantIds.length);
}

// Toàn bộ thực đơn cũ của quán thật (sẽ nạp lại bằng API chủ quán).
await q('DELETE FROM menu_item_topping_groups');
await q('DELETE FROM menu_item_variants');
await q('DELETE FROM menu_items');
await q('DELETE FROM toppings');
await q('DELETE FROM topping_groups');
await q('DELETE FROM menu_categories');
await q('DELETE FROM menus');
console.log('đã xoá thực đơn cũ');

// Khuyến mãi do test Postman sinh ra (mã PM... / WEB...).
await q("DELETE FROM promotions WHERE code LIKE 'PM%' OR code LIKE 'WEB%'");

// Tài khoản demo và tài khoản do test tự động tạo.
const junkUsers = await q(`SELECT id FROM users WHERE username LIKE 'demo.%' OR username IN ('customer01', 'ops.admin', 'saigon.bites')
  OR username REGEXP '^(e2e|auth|tx|nha|nhb)(mv)?[0-9a-z]+$' AND username NOT LIKE 'nha.%'`);
const junkUserIds = junkUsers.map(row => row.id);
if (junkUserIds.length) {
  const owned = await q('SELECT id FROM restaurants WHERE owner_user_id IN (?)', [junkUserIds]);
  if (owned.length) {
    const ids = owned.map(row => row.id);
    for (const table of ['restaurant_operating_hours', 'restaurant_images', 'promotions']) await q(`DELETE FROM \`${table}\` WHERE restaurant_id IN (?)`, [ids]);
    await q('DELETE FROM restaurants WHERE id IN (?)', [ids]);
  }
  await q('DELETE FROM customer_addresses WHERE customer_id IN (SELECT id FROM customer_profiles WHERE user_id IN (?))', [junkUserIds]);
  await q('DELETE FROM shipper_documents WHERE shipper_id IN (SELECT id FROM shipper_profiles WHERE user_id IN (?))', [junkUserIds]);
  for (const table of ['customer_profiles', 'shipper_profiles', 'notification_preferences', 'wallets']) await q(`DELETE FROM \`${table}\` WHERE user_id IN (?)`, [junkUserIds]);
  await q('DELETE FROM users WHERE id IN (?)', [junkUserIds]);
  console.log('đã xoá tài khoản mẫu/test:', junkUserIds.length);
}

// Đưa số liệu cộng dồn về 0 để trigger/API tự cộng lại từ giao dịch thật.
await q('UPDATE restaurants SET rating = 0, total_reviews = 0, total_orders = 0, total_revenue = 0');
await q('UPDATE customer_profiles SET total_orders = 0, total_spent = 0, loyalty_points = 0');
await q("UPDATE shipper_profiles SET rating = 0, total_reviews = 0, total_deliveries = 0, total_earnings = 0, availability_status = 'OFFLINE', current_latitude = NULL, current_longitude = NULL, last_location_at = NULL");
await q('UPDATE promotions SET used_count = 0');
await q('UPDATE wallets SET balance = 0');
await q('SET FOREIGN_KEY_CHECKS = 1');

const [counts] = await q(`SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM restaurants) AS restaurants,
  (SELECT COUNT(*) FROM customer_profiles) AS customers, (SELECT COUNT(*) FROM shipper_profiles) AS shippers, (SELECT COUNT(*) FROM orders) AS orders`);
console.log('Còn lại:', counts);
await db.end();
