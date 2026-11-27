/* Sửa các đơn dùng mã freeship tạo trước khi sửa công thức tính giá.
   Lỗi cũ: freeship vừa đặt phí giao = 0 vừa trừ phí giao vào tiền món -> khách trả thiếu phí giao, tài xế nhận 0đ.
   Đúng: orders.delivery_fee giữ phí giao thật, discount_amount = phần phí được miễn, khách trả đúng tiền món.
   Cập nhật đồng bộ: orders, payments, cod_transactions, invoices, deliveries, shipper_earnings, tổng thu nhập tài xế,
   total_spent của khách (đơn đã giao) và số tiền hoàn của đơn đã huỷ. Chạy lại không đổi gì thêm.
   Chạy:  node scripts/repair-freeship-orders.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const q = async (sql, params = []) => (await db.query(sql, params))[0];

const [{ fee }] = await q("SELECT CAST(setting_value AS DECIMAL(15,2)) AS fee FROM system_settings WHERE setting_key = 'delivery_base_fee'");
await q('DROP TEMPORARY TABLE IF EXISTS tmp_freeship_fix');
await q(`CREATE TEMPORARY TABLE tmp_freeship_fix AS
  SELECT o.id AS order_id, o.order_status, o.customer_id, o.total_amount AS old_total,
         o.subtotal + ? + o.service_fee + o.tax_amount - o.discount_amount AS new_total
  FROM orders o INNER JOIN promotion_usage pu ON pu.order_id = o.id INNER JOIN promotions p ON p.id = pu.promotion_id
  WHERE p.discount_type = 'FREE_DELIVERY' AND o.delivery_fee = 0 AND o.discount_amount > 0 AND o.discount_amount <= ?`, [fee, fee]);
const [{ n, gap }] = await q('SELECT COUNT(*) AS n, COALESCE(SUM(new_total - old_total), 0) AS gap FROM tmp_freeship_fix');
console.log(`Đơn freeship cần sửa: ${n}, tổng tiền khách trả thiếu: ${Number(gap).toLocaleString('vi-VN')}đ`);
if (Number(n) === 0) { await db.end(); process.exit(0); }

await db.beginTransaction();
try {
  await q('UPDATE refunds r INNER JOIN tmp_freeship_fix f ON f.order_id = r.order_id SET r.amount = f.new_total WHERE r.amount = f.old_total');
  await q('UPDATE payments p INNER JOIN tmp_freeship_fix f ON f.order_id = p.order_id SET p.amount = f.new_total');
  await q('UPDATE cod_transactions c INNER JOIN tmp_freeship_fix f ON f.order_id = c.order_id SET c.amount = f.new_total');
  await q('UPDATE invoices i INNER JOIN tmp_freeship_fix f ON f.order_id = i.order_id SET i.delivery_fee = ?, i.total_amount = f.new_total', [fee]);
  await q('UPDATE deliveries d INNER JOIN tmp_freeship_fix f ON f.order_id = d.order_id SET d.delivery_fee = ?, d.updated_at = d.updated_at', [fee]);
  const earned = await q(`UPDATE shipper_earnings se INNER JOIN deliveries d ON d.id = se.delivery_id INNER JOIN tmp_freeship_fix f ON f.order_id = d.order_id
    SET se.delivery_fee = ?, se.net_earning = ? WHERE se.delivery_fee = 0`, [fee, fee]);
  await q(`UPDATE shipper_profiles sp INNER JOIN (SELECT d.shipper_id, COUNT(*) AS cnt FROM shipper_earnings se INNER JOIN deliveries d ON d.id = se.delivery_id
      INNER JOIN tmp_freeship_fix f ON f.order_id = d.order_id GROUP BY d.shipper_id) x ON x.shipper_id = sp.id SET sp.total_earnings = sp.total_earnings + x.cnt * ?`, [fee]);
  await q(`UPDATE customer_profiles cp INNER JOIN (SELECT customer_id, COUNT(*) AS cnt FROM tmp_freeship_fix WHERE order_status = 'DELIVERED' GROUP BY customer_id) x
    ON x.customer_id = cp.id SET cp.total_spent = cp.total_spent + x.cnt * ?`, [fee]);
  await q('UPDATE orders o INNER JOIN tmp_freeship_fix f ON f.order_id = o.id SET o.delivery_fee = ?, o.total_amount = f.new_total, o.updated_at = o.updated_at', [fee]);
  await db.commit();
  console.log(`Đã sửa ${n} đơn; thu nhập tài xế được bổ sung cho ${earned.affectedRows} chuyến.`);
} catch (error) {
  await db.rollback();
  throw error;
}
const [check] = await q(`SELECT COUNT(*) AS bad FROM orders o INNER JOIN payments p ON p.order_id = o.id WHERE o.total_amount <> p.amount`);
console.log('Đơn lệch giữa orders.total_amount và payments.amount:', check.bad);
await db.end();
