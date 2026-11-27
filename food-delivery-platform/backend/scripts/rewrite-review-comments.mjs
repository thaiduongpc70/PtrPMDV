/* Viết lại bình luận đánh giá + phản hồi của quán cho dữ liệu mô phỏng (tài khoản kh.*) theo NHÃN món/quán thật và số sao thật
   (data/review-phrases.mjs). Chỉ UPDATE cột comment / restaurant_reply của dòng ĐÃ CÓ nội dung; không đổi rating, quan hệ, dòng rỗng, thời điểm;
   không đụng tài khoản thật (minh.anh…). Một câu bình luận ≤ 3 lần, một câu phản hồi ≤ 5 lần toàn hệ thống.
   Dùng:  node scripts/rewrite-review-comments.mjs --dry-run   |   node scripts/rewrite-review-comments.mjs */
import { connect } from './lib/db.mjs';
import { createRegistry, makeUniqueComment, dishTags } from './data/review-phrases.mjs';
import { violations } from './lib/comment-checks.mjs';

const DRY = process.argv.includes('--dry-run');
const db = await connect();
const q = async (sql, params) => (await db.query(sql, params))[0];
const mulberry32 = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const registry = createRegistry(3);
const replyRegistry = createRegistry(5);
const protectedComments = await q(`SELECT comment, COUNT(*) n FROM (
    SELECT rr.comment FROM restaurant_reviews rr JOIN customer_profiles cp ON cp.id = rr.customer_id JOIN users u ON u.id = cp.user_id WHERE rr.deleted_at IS NULL AND u.username NOT LIKE 'kh.%'
    UNION ALL SELECT r.comment FROM menu_item_reviews r JOIN orders o ON o.id = r.order_id JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id WHERE r.deleted_at IS NULL AND u.username NOT LIKE 'kh.%'
    UNION ALL SELECT sr.comment FROM shipper_reviews sr JOIN customer_profiles cp ON cp.id = sr.customer_id JOIN users u ON u.id = cp.user_id WHERE sr.deleted_at IS NULL AND u.username NOT LIKE 'kh.%'
  ) x WHERE comment IS NOT NULL AND comment <> '' GROUP BY comment`);
for (const row of protectedComments) registry.counts.set(row.comment, Number(row.n));

const shopReviews = await q(`SELECT rr.id, rr.rating, rr.comment, rr.restaurant_reply, rs.name AS shop, COALESCE(rc.name, '') AS category
  FROM restaurant_reviews rr JOIN restaurants rs ON rs.id = rr.restaurant_id LEFT JOIN restaurant_categories rc ON rc.id = rs.category_id
  JOIN customer_profiles cp ON cp.id = rr.customer_id JOIN users u ON u.id = cp.user_id
  WHERE rr.deleted_at IS NULL AND u.username LIKE 'kh.%' AND ((rr.comment IS NOT NULL AND rr.comment <> '') OR rr.restaurant_reply IS NOT NULL) ORDER BY rr.id`);
const itemReviews = await q(`SELECT r.id, r.rating, r.comment, mi.name AS dish, COALESCE(rc.name, '') AS category
  FROM menu_item_reviews r JOIN menu_items mi ON mi.id = r.menu_item_id JOIN restaurants rs ON rs.id = mi.restaurant_id LEFT JOIN restaurant_categories rc ON rc.id = rs.category_id
  JOIN orders o ON o.id = r.order_id JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id
  WHERE r.deleted_at IS NULL AND u.username LIKE 'kh.%' AND r.comment IS NOT NULL AND r.comment <> '' ORDER BY r.id`);
const shipReviews = await q(`SELECT sr.id, sr.rating, sr.comment FROM shipper_reviews sr JOIN customer_profiles cp ON cp.id = sr.customer_id JOIN users u ON u.id = cp.user_id
  WHERE sr.deleted_at IS NULL AND u.username LIKE 'kh.%' AND sr.comment IS NOT NULL AND sr.comment <> '' ORDER BY sr.id`);

// trước: đếm lỗi
const before = { sao_khác_rating: 0, đúng_kiểu: 0, nóng_sai_nhãn: 0, phần_ăn_đồ_uống: 0 };
for (const row of itemReviews) { const tags = dishTags(row.dish, row.category); for (const code of violations(row.comment, { rating: row.rating, kind: tags.kind, temp: tags.temp, drink: tags.kind === 'drink' })) before[code] += 1; }
for (const row of shopReviews.filter(item => item.comment)) for (const code of violations(row.comment, { rating: row.rating })) before[code] += 1;
for (const row of shipReviews) for (const code of violations(row.comment, { rating: row.rating })) before[code] += 1;
const replyCounts = new Map(); for (const row of shopReviews) if (row.restaurant_reply) replyCounts.set(row.restaurant_reply, (replyCounts.get(row.restaurant_reply) ?? 0) + 1);
console.log('TRƯỚC — lỗi:', JSON.stringify(before), '| phản hồi:', [...replyCounts.values()].reduce((a, b) => a + b, 0), 'câu, khác nhau', replyCounts.size, ', lặp nhiều nhất', Math.max(0, ...replyCounts.values()));

const updates = { restaurant_reviews: [], menu_item_reviews: [], shipper_reviews: [] };
for (const row of itemReviews) {
  const rnd = mulberry32(Number(row.id) * 2246822519 + 5);
  updates.menu_item_reviews.push([row.id, makeUniqueComment(rnd, { kind: 'dish', stars: row.rating, dishName: row.dish, category: row.category }, registry), null]);
}
for (const row of shopReviews) {
  const rnd = mulberry32(Number(row.id) * 3266489917 + 11);
  const comment = row.comment ? makeUniqueComment(rnd, { kind: 'shop', stars: row.rating, shopName: row.shop, category: row.category }, registry) : row.comment;
  const reply = row.restaurant_reply ? makeUniqueComment(mulberry32(Number(row.id) * 40503 + 3), { kind: 'reply', stars: row.rating, shopName: row.shop }, replyRegistry) : null;
  updates.restaurant_reviews.push([row.id, comment, reply]);
}
for (const row of shipReviews) {
  const rnd = mulberry32(Number(row.id) * 668265263 + 7);
  updates.shipper_reviews.push([row.id, makeUniqueComment(rnd, { kind: 'ship', stars: row.rating }, registry), null]);
}
const after = { sao_khác_rating: 0, đúng_kiểu: 0, nóng_sai_nhãn: 0, phần_ăn_đồ_uống: 0 };
itemReviews.forEach((row, index) => { const tags = dishTags(row.dish, row.category); for (const code of violations(updates.menu_item_reviews[index][1], { rating: row.rating, kind: tags.kind, temp: tags.temp, drink: tags.kind === 'drink' })) after[code] += 1; });
const newReplies = new Map(); for (const row of updates.restaurant_reviews) if (row[2]) newReplies.set(row[2], (newReplies.get(row[2]) ?? 0) + 1);
const maxComment = Math.max(0, ...registry.counts.values());
console.log('SAU (dự kiến) — lỗi món:', JSON.stringify(after), '| phản hồi khác nhau', newReplies.size, ', lặp nhiều nhất', Math.max(0, ...newReplies.values()), '| bình luận lặp nhiều nhất', maxComment);
console.log(`Sẽ ghi: ${updates.restaurant_reviews.length} đánh giá quán (kèm phản hồi), ${updates.menu_item_reviews.length} đánh giá món, ${updates.shipper_reviews.length} đánh giá tài xế.`);
console.log('Ví dụ món:', updates.menu_item_reviews.slice(0, 2).map(row => row[1]).join(' || '));
console.log('Ví dụ phản hồi:', [...newReplies.keys()].slice(0, 2).join(' || '));
if (DRY) { console.log('DRY-RUN: chưa thay đổi gì.'); await db.end(); process.exit(0); }

for (const [table, rows] of Object.entries(updates)) {
  await db.query('DROP TABLE IF EXISTS tmp_rw');
  await db.query('CREATE TABLE tmp_rw (id BIGINT UNSIGNED PRIMARY KEY, comment TEXT NULL, reply TEXT NULL)');
  for (let start = 0; start < rows.length; start += 1000) await db.query('INSERT INTO tmp_rw VALUES ?', [rows.slice(start, start + 1000)]);
  if (table === 'restaurant_reviews') await db.query('UPDATE restaurant_reviews r JOIN tmp_rw t ON t.id = r.id SET r.comment = COALESCE(t.comment, r.comment), r.restaurant_reply = IF(r.restaurant_reply IS NULL, NULL, t.reply), r.updated_at = r.updated_at');
  else await db.query(`UPDATE ${table} r JOIN tmp_rw t ON t.id = r.id SET r.comment = t.comment, r.updated_at = r.updated_at`);
  await db.query('DROP TABLE tmp_rw');
  console.log(`  ${table}: ${rows.length} dòng`);
}
console.log('Xong.');
await db.end();
