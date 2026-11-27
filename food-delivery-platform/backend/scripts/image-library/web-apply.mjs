/* Gán ảnh web đã duyệt (web-spec.mjs) cho món đang TRỐNG ảnh, qua API chủ quán (không SQL).
 * Chỉ gán khi image_url đang NULL và tên món khớp mẫu; nhiều ảnh thì xoay vòng theo id món.
 *   node scripts/image-library/web-apply.mjs --dry-run   |   node scripts/image-library/web-apply.mjs  (server đang chạy) */
import { readFileSync } from 'node:fs';
import { connect } from '../lib/db.mjs';
import { api, tokenFor, pool } from '../lib/api-client.mjs';
import { WEB } from './web-spec.mjs';

const DRY = process.argv.includes('--dry-run');
const library = JSON.parse(readFileSync(new URL('../data/image-library.json', import.meta.url), 'utf8')).items;
const byKey = new Map();
for (const item of library) { const list = byKey.get(item.key) ?? []; list.push(item.url); byKey.set(item.key, list); }
const db = await connect();
const [dishes] = await db.query(`SELECT mi.id, mi.restaurant_id, mi.name, u.username FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id JOIN users u ON u.id = r.owner_user_id
  WHERE mi.deleted_at IS NULL AND mi.image_url IS NULL AND mi.item_type <> 'COMBO' ORDER BY mi.id`);
const plan = [];
for (const dish of dishes) {
  const spec = WEB.find(item => byKey.has(item.key) && item.match.test(dish.name));
  if (spec) { const images = byKey.get(spec.key); plan.push({ ...dish, imageUrl: images[Number(dish.id) % images.length] }); }
}
console.log(`Sẽ gán ảnh cho ${plan.length} món đang trống.`);
if (DRY) { console.log(plan.slice(0, 15).map(p => `#${p.id} ${p.name} -> ${p.imageUrl.split('/').pop()}`).join('\n')); await db.end(); process.exit(0); }
await pool(plan, 6, async item => { await api('PATCH', `/api/restaurant/restaurants/${item.restaurant_id}/menu-items/${item.id}`, { token: await tokenFor(item.username), body: { imageUrl: item.imageUrl } }); });
console.log('Xong.');
await db.end();
