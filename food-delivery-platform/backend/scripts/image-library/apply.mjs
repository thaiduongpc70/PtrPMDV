/*
 * Gắn ảnh đã duyệt vào món + quán qua API chủ quán (không sửa SQL):
 *   - món: loại món khớp theo tên (spec.mjs) → xoay vòng các ảnh đã duyệt của loại đó; món không khớp → KHÔNG gắn ảnh
 *   - quán: LOGO + COVER lấy từ các món bán chạy của chính quán đó đã có ảnh
 *   - combo: không gắn ảnh (một ảnh món lẻ không thể hiện đúng cả combo)
 * Chạy khi server đang chạy:  API_BASE_URL=http://localhost:3001 node scripts/image-library/apply.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { connect } from '../lib/db.mjs';
import { api, tokenFor, pool } from '../lib/api-client.mjs';
import { TYPES } from './spec.mjs';

const DRY = process.argv.includes('--dry-run');
const library = JSON.parse(readFileSync(new URL('../data/image-library.json', import.meta.url), 'utf8')).items;
const byKey = new Map();
for (const item of library) { const list = byKey.get(item.key) ?? []; list.push(item.url); byKey.set(item.key, list); }

const db = await connect();
const [dishes] = await db.query(`SELECT mi.id, mi.restaurant_id, mi.name, mi.item_type, mi.sold_count, mi.image_url, u.username
  FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id JOIN users u ON u.id = r.owner_user_id WHERE mi.deleted_at IS NULL ORDER BY mi.id`);

const plan = [];
for (const dish of dishes) {
  if (dish.item_type === 'COMBO') continue;
  const lower = dish.name.toLowerCase();
  const type = TYPES.find(item => byKey.has(item.key) && item.match.test(lower));
  if (!type) continue;
  const images = byKey.get(type.key);
  plan.push({ ...dish, key: type.key, imageUrl: images[dish.id % images.length] });
}
const covered = new Set(plan.map(item => item.id));
console.log(`Món có ảnh đúng: ${plan.length}/${dishes.filter(d => d.item_type !== 'COMBO').length} (combo bỏ qua)`);
if (DRY) {
  const missing = dishes.filter(d => d.item_type !== 'COMBO' && !covered.has(d.id));
  console.log('Một số món chưa có ảnh:', missing.slice(0, 25).map(d => d.name).join(' | '));
  await db.end(); process.exit(0);
}

let done = 0;
await pool(plan.filter(item => item.image_url !== item.imageUrl), 6, async item => {
  await api('PATCH', `/api/restaurant/restaurants/${item.restaurant_id}/menu-items/${item.id}`, { token: await tokenFor(item.username), body: { imageUrl: item.imageUrl } });
  done += 1;
});
console.log(`Đã gắn ảnh cho ${done} món.`);

// LOGO + COVER cho quán từ chính các món bán chạy của quán
const [restaurants] = await db.query(`SELECT r.id, r.name, u.username, (SELECT COUNT(*) FROM restaurant_images ri WHERE ri.restaurant_id = r.id) AS n FROM restaurants r JOIN users u ON u.id = r.owner_user_id WHERE r.deleted_at IS NULL`);
let shops = 0;
for (const restaurant of restaurants) {
  if (restaurant.n > 0) continue;
  const mine = plan.filter(item => item.restaurant_id === restaurant.id).sort((a, b) => b.sold_count - a.sold_count);
  const distinct = [...new Set(mine.map(item => item.imageUrl))];
  if (!distinct.length) continue;
  const token = await tokenFor(restaurant.username);
  const base = `/api/restaurant/restaurants/${restaurant.id}/images`;
  await api('POST', base, { token, body: { imageUrl: distinct[0], imageType: 'LOGO', sortOrder: 0 } });
  await api('POST', base, { token, body: { imageUrl: distinct[1] ?? distinct[0], imageType: 'COVER', sortOrder: 0 } });
  shops += 1;
}
console.log(`Đã gắn logo + ảnh bìa cho ${shops} quán.`);
await db.end();
