/* Đảm bảo một câu bình luận không xuất hiện quá 3 lần trong toàn hệ thống (3 bảng đánh giá): các dòng thừa được viết lại
   bằng bộ câu đa dạng (data/review-phrases.mjs). Không đụng điểm sao.  node scripts/dedupe-review-comments.mjs */
import { connect } from './lib/db.mjs';
import { createRegistry, makeUniqueComment } from './data/review-phrases.mjs';
const db = await connect();
const TABLES = [['restaurant_reviews', 'shop'], ['menu_item_reviews', 'dish'], ['shipper_reviews', 'ship']];
const registry = createRegistry(3);
const rows = [];
for (const [table, kind] of TABLES) {
  const [list] = await db.query(`SELECT id, rating, comment FROM ${table} WHERE deleted_at IS NULL AND comment IS NOT NULL AND comment <> '' ORDER BY id`);
  for (const row of list) rows.push({ table, kind, ...row });
}
const seen = new Map();
const extra = [];
for (const row of rows) {
  const count = (seen.get(row.comment) ?? 0) + 1;
  seen.set(row.comment, count);
  if (count > 3) extra.push(row);
  else registry.counts.set(row.comment, count);
}
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
for (const row of extra) {
  const ctx = row.kind === 'dish' ? { kind: 'dish', stars: row.rating, dishName: 'món này', drink: false } : row.kind === 'shop' ? { kind: 'shop', stars: row.rating, shopName: 'quán' } : { kind: 'ship', stars: row.rating };
  await db.query(`UPDATE ${row.table} SET comment = ?, updated_at = updated_at WHERE id = ?`, [makeUniqueComment(rnd, ctx, registry), row.id]);
}
console.log(`Viết lại ${extra.length} bình luận lặp quá 3 lần.`);
await db.end();
