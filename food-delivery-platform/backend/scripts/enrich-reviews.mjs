/*
 * Làm dày và đa dạng hoá đánh giá (vẫn qua API khách hàng thật):
 *   --add       thêm đánh giá món cho các dòng đơn ĐÃ GIAO chưa được đánh giá, mỗi món đạt 10–30% số lượt đã giao (đợt 2: trước đây 72–92% làm mọi quán có đánh giá phủ ~80% số đơn)
 *               (món nhiều đơn → nhiều đánh giá); số sao theo "chất lượng" từng món (mỗi món một mức trung bình khác nhau)
 *   --timeline  đặt thời điểm đánh giá mới = sau lúc giao hàng 6 phút – ~2 ngày (giống dữ liệu cũ)
 *   --comments  viết lại bình luận món/quán/tài xế theo LOẠI MÓN, LOẠI QUÁN (đúng "uống"/"ăn", đúng nhiệt độ…)
 * Chạy khi server đang chạy:  API_BASE_URL=http://localhost:3001 RATE_LIMIT_MAX=10000 node scripts/enrich-reviews.mjs [--add] [--timeline] [--comments]
 */
import { connect } from './lib/db.mjs';
import { api, tokenFor, pool } from './lib/api-client.mjs';
import { dishProfile } from './data/review-comments.mjs';
import { createRegistry, makeUniqueComment } from './data/review-phrases.mjs';

const args = process.argv.slice(2);
const all = !args.some(arg => ['--add', '--timeline', '--comments'].includes(arg));
const want = flag => all || args.includes(flag);

function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash01 = (id, salt) => mulberry32(id * 2654435761 + salt)();
const normal = rnd => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

const db = await connect();
const q = async (sql, params) => (await db.query(sql, params))[0];

/* ===================== 1. Thêm đánh giá món qua API ===================== */
if (want('--add')) {
  const lines = await q(`SELECT oi.id AS line_id, oi.order_id, oi.menu_item_id, u.username,
      EXISTS(SELECT 1 FROM menu_item_reviews r WHERE r.order_item_id = oi.id) AS reviewed
    FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.order_status = 'DELIVERED'
    JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id
    WHERE oi.menu_item_id IS NOT NULL`);
  const byItem = new Map();
  for (const line of lines) { const list = byItem.get(line.menu_item_id) ?? []; list.push(line); byItem.set(line.menu_item_id, list); }
  const picked = [];
  for (const [itemId, list] of byItem) {
    const coverage = 0.10 + 0.20 * hash01(itemId, 11); // phủ 10–30% số dòng đã giao
    const target = Math.floor(list.length * coverage);
    const reviewed = list.filter(line => line.reviewed).length;
    const need = Math.max(0, target - reviewed);
    const rnd = mulberry32(itemId * 7919);
    const pool_ = list.filter(line => !line.reviewed).sort(() => rnd() - 0.5).slice(0, need);
    // "chất lượng" món: trung bình 3.7 – 4.8, mỗi món một mức
    const mean = 3.7 + 1.1 * hash01(itemId, 23);
    for (const line of pool_) picked.push({ ...line, rating: Math.max(1, Math.min(5, Math.round(mean + normal(rnd) * 0.85))) });
  }
  const byOrder = new Map();
  for (const line of picked) { const list = byOrder.get(line.order_id) ?? { username: line.username, items: [] }; list.items.push({ orderItemId: line.line_id, rating: line.rating, comment: null }); byOrder.set(line.order_id, list); }
  console.log(`Thêm ${picked.length} đánh giá món cho ${byOrder.size} đơn…`);
  let done = 0; let failed = 0;
  await pool([...byOrder], 6, async ([orderId, entry]) => {
    try {
      for (let start = 0; start < entry.items.length; start += 50) await api('POST', `/api/communications/orders/${orderId}/item-reviews`, { token: await tokenFor(entry.username), body: { items: entry.items.slice(start, start + 50) } });
    } catch (error) { failed += 1; if (failed <= 3) console.log('lỗi', error.message.slice(0, 160)); }
    done += 1;
    if (done % 1000 === 0) console.log(`  ${done}/${byOrder.size} đơn`);
  });
  console.log(`Xong phần thêm: ${byOrder.size - failed} đơn thành công, ${failed} lỗi.`);
}

/* ===================== 2. Mốc thời gian đánh giá mới ===================== */
if (want('--timeline')) {
  // đánh giá mới (vừa tạo qua API) có created_at = hôm nay; dữ liệu cũ nằm trong quá khứ xa hơn
  const fresh = await q(`SELECT r.id, r.order_id, d.delivered_at FROM menu_item_reviews r JOIN deliveries d ON d.order_id = r.order_id
    WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR) AND d.delivered_at IS NOT NULL`);
  const updates = fresh.map(row => {
    const rnd = mulberry32(Number(row.order_id) * 40503); // cùng đơn → cùng mốc
    const minutes = Math.min(2500, 6 + Math.floor(-Math.log(1 - rnd()) * 480));
    return [row.id, new Date(new Date(row.delivered_at).getTime() + minutes * 60_000)];
  });
  if (updates.length) {
    await db.query('CREATE TEMPORARY TABLE tmp_review_time (id BIGINT PRIMARY KEY, at DATETIME)');
    for (let start = 0; start < updates.length; start += 2000) await db.query('INSERT INTO tmp_review_time VALUES ?', [updates.slice(start, start + 2000)]);
    await db.query('UPDATE menu_item_reviews r JOIN tmp_review_time t ON t.id = r.id SET r.created_at = t.at, r.updated_at = t.at');
  }
  console.log(`Đã đặt thời điểm cho ${updates.length} đánh giá mới.`);
}

/* ===================== 3. Viết lại bình luận ===================== */
async function rewrite(table, rows, makeText) {
  await db.query(`CREATE TEMPORARY TABLE tmp_comment (id BIGINT PRIMARY KEY, comment TEXT)`);
  let changed = 0;
  const batch = [];
  for (const row of rows) { const text = makeText(row); if (text !== row.comment) batch.push([row.id, text]); }
  for (let start = 0; start < batch.length; start += 1500) {
    await db.query('INSERT INTO tmp_comment VALUES ?', [batch.slice(start, start + 1500)]);
    const [result] = await db.query(`UPDATE ${table} r JOIN tmp_comment t ON t.id = r.id SET r.comment = t.comment, r.updated_at = r.updated_at`);
    changed += result.changedRows ?? 0;
    await db.query('TRUNCATE TABLE tmp_comment');
  }
  await db.query('DROP TEMPORARY TABLE tmp_comment');
  return batch.length;
}

if (want('--comments')) {
  // Bộ câu đa dạng (data/review-phrases.mjs): rỗng ~10%, một câu tối đa 3 lần toàn hệ thống (đếm cả bình luận sẵn có không bị ghi lại)
  const registry = createRegistry(3);
  const fresh = new Set();
  const items = await q(`SELECT r.id, r.rating, r.comment, mi.name AS dish, COALESCE(rc.name, '') AS category
    FROM menu_item_reviews r JOIN menu_items mi ON mi.id = r.menu_item_id JOIN restaurants rs ON rs.id = mi.restaurant_id
    LEFT JOIN restaurant_categories rc ON rc.id = rs.category_id
    JOIN orders o ON o.id = r.order_id JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id
    WHERE r.deleted_at IS NULL AND u.username LIKE 'kh.%' ORDER BY r.id`);
  const itemCount = await rewrite('menu_item_reviews', items, row => {
    const rnd = mulberry32(row.id * 2246822519);
    if (rnd() < 0.1) return null;
    const drink = dishProfile(row.dish, row.category).verb === 'uống';
    return makeUniqueComment(rnd, { kind: 'dish', stars: row.rating, dishName: row.dish, drink }, registry);
  });
  console.log(`Bình luận món: viết lại ${itemCount} dòng.`);

  const shops = await q(`SELECT r.id, r.rating, r.comment, rs.name AS shop, (r.restaurant_reply IS NOT NULL) AS replied FROM restaurant_reviews r JOIN restaurants rs ON rs.id = r.restaurant_id
    JOIN customer_profiles cp ON cp.id = r.customer_id JOIN users u ON u.id = cp.user_id WHERE r.deleted_at IS NULL AND u.username LIKE 'kh.%' ORDER BY r.id`);
  const shopCount = await rewrite('restaurant_reviews', shops, row => {
    const rnd = mulberry32(row.id * 3266489917);
    if (!row.replied && rnd() < 0.1) return null;
    return makeUniqueComment(rnd, { kind: 'shop', stars: row.rating, shopName: row.shop }, registry);
  });
  console.log(`Bình luận quán: viết lại ${shopCount} dòng.`);

  const ships = await q("SELECT sr.id, sr.order_id, sr.rating, sr.comment FROM shipper_reviews sr JOIN orders o ON o.id = sr.order_id JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id WHERE u.username LIKE 'kh.%' ORDER BY sr.id");
  const shipCount = await rewrite('shipper_reviews', ships, row => {
    const rnd = mulberry32(row.id * 668265263);
    if (rnd() < 0.15) return null;
    return makeUniqueComment(rnd, { kind: 'ship', stars: row.rating }, registry);
  });
  console.log(`Bình luận tài xế: viết lại ${shipCount} dòng.`);
}

/* thống kê cuối */
const [stats] = await q(`SELECT COUNT(*) total, MIN(n) mn, ROUND(AVG(n)) av, MAX(n) mx FROM (SELECT menu_item_id, COUNT(*) n FROM menu_item_reviews WHERE deleted_at IS NULL GROUP BY 1) t`).then(rows => [{ ...rows[0] }]);
console.log('Số đánh giá mỗi món:', stats);
await db.end();
