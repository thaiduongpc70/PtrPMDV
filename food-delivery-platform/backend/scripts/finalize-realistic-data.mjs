/* Bước chốt dữ liệu sau mô phỏng:
   - giữ mỗi món 20-50 đánh giá (món nào vượt hạn mức thì bỏ bớt ngẫu nhiên phần dư, như khách không để lại đánh giá);
   - tính lại điểm trung bình/số đánh giá của món, quán, tài xế từ dữ liệu gốc;
   - đối soát tổng thu nhập và số chuyến giao của tài xế từ shipper_earnings / deliveries.
   Chạy:  node scripts/finalize-realistic-data.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261016);
const MIN = 20;
const MAX = 50;

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const sql = async (text, params = []) => (await db.query(text, params))[0];

const dishes = await sql(`SELECT mi.id, mi.is_featured AS featured, COUNT(r.id) AS total
  FROM menu_items mi LEFT JOIN menu_item_reviews r ON r.menu_item_id = mi.id AND r.deleted_at IS NULL GROUP BY mi.id`);
let trimmed = 0;
let topUp = 0;
// --no-trim: thêm quán mới — không cắt đánh giá của các món đã được làm dày (enrich-reviews.mjs), chỉ tính lại điểm
const NO_TRIM = process.argv.includes('--no-trim');
for (const dish of NO_TRIM ? [] : dishes) {
  const quota = Math.min(MAX, MIN + Math.floor((MAX - MIN + 1) * Math.pow(rnd(), dish.featured ? 0.6 : 1.25)));
  const total = Number(dish.total);
  if (total > quota) {
    const removed = await sql(
      `DELETE FROM menu_item_reviews WHERE menu_item_id = ? ORDER BY MD5(CONCAT(id, ?)) LIMIT ?`,
      [dish.id, `seed${dish.id}`, total - quota]
    );
    trimmed += removed.affectedRows;
  } else if (total < MIN) {
    topUp += 1;
  }
}
console.log(`Đã bỏ bớt ${trimmed} đánh giá món vượt hạn mức ${MAX}; món còn thiếu (<${MIN}): ${topUp}`);

await sql(`UPDATE menu_items mi LEFT JOIN (SELECT menu_item_id, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS total
  FROM menu_item_reviews WHERE deleted_at IS NULL GROUP BY menu_item_id) r ON r.menu_item_id = mi.id
  SET mi.rating = COALESCE(r.avg_rating, 0), mi.total_reviews = COALESCE(r.total, 0)`);
await sql(`UPDATE restaurants r LEFT JOIN (SELECT restaurant_id, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS total
  FROM restaurant_reviews WHERE deleted_at IS NULL GROUP BY restaurant_id) x ON x.restaurant_id = r.id
  SET r.rating = COALESCE(x.avg_rating, 0), r.total_reviews = COALESCE(x.total, 0)`);
await sql(`UPDATE shipper_profiles sp LEFT JOIN (SELECT shipper_id, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS total
  FROM shipper_reviews WHERE deleted_at IS NULL GROUP BY shipper_id) x ON x.shipper_id = sp.id
  LEFT JOIN (SELECT shipper_id, SUM(net_earning) AS earned FROM shipper_earnings GROUP BY shipper_id) e ON e.shipper_id = sp.id
  SET sp.rating = COALESCE(x.avg_rating, 0), sp.total_reviews = COALESCE(x.total, 0), sp.total_earnings = COALESCE(e.earned, 0)`);
await sql(`UPDATE shipper_profiles sp LEFT JOIN (SELECT shipper_id, COUNT(*) AS delivered FROM deliveries WHERE delivery_status = 'DELIVERED' GROUP BY shipper_id) d ON d.shipper_id = sp.id
  SET sp.total_deliveries = COALESCE(d.delivered, 0)`);

const [summary] = await sql(`SELECT COUNT(*) AS dishes, MIN(total_reviews) AS min_reviews, MAX(total_reviews) AS max_reviews,
  ROUND(AVG(total_reviews), 1) AS avg_reviews, ROUND(MIN(rating), 2) AS min_rating, ROUND(MAX(rating), 2) AS max_rating FROM menu_items`);
console.log('Tóm tắt món:', summary);
await db.end();
