/* Cho combo cũng chọn được tuỳ chọn của các món bên trong (qua API chủ quán):
   combo đồ uống → "Mức đường", "Mức đá"; combo pizza → "Loại đế"; combo có món cay → "Độ cay"; combo có "Chọn nước uống" → giữ.
   Một lựa chọn áp cho cả combo (khách ghi chú thêm nếu muốn mỗi món một kiểu). Chạy lại không gắn trùng.
   Chạy khi server đang chạy:  API_BASE_URL=http://localhost:3001 node scripts/enrich-combo-options.mjs */
import { connect } from './lib/db.mjs';
import { api, tokenFor } from './lib/api-client.mjs';

const WANTED = ['Mức đường', 'Mức đá', 'Loại đế', 'Độ cay', 'Chọn nước uống'];
const fromIdArg = process.argv.indexOf('--from-id');
const FROM_ID = fromIdArg >= 0 ? Number(process.argv[fromIdArg + 1]) : 0; // quán mới: combo cũng nhận nhóm topping thêm phổ biến nhất của các món bên trong
const db = await connect();
const [combos] = await db.query(`SELECT mi.id, mi.restaurant_id, mi.name, u.username FROM menu_items mi
  JOIN restaurants r ON r.id = mi.restaurant_id JOIN users u ON u.id = r.owner_user_id
  WHERE mi.item_type = 'COMBO' AND mi.deleted_at IS NULL AND mi.restaurant_id >= ${FROM_ID} ORDER BY mi.restaurant_id, mi.id`);
let linked = 0; let skipped = 0;
for (const combo of combos) {
  const [groups] = await db.query(
    `SELECT DISTINCT tg.id, tg.name FROM menu_item_combo_components c
     JOIN menu_item_topping_groups l ON l.menu_item_id = c.component_item_id
     JOIN topping_groups tg ON tg.id = l.topping_group_id
     WHERE c.combo_item_id = ? AND tg.name IN (${WANTED.map(() => '?').join(',')})`, [combo.id, ...WANTED]);
  // một nhóm cho mỗi tên (các món cùng quán dùng chung nhóm)
  const byName = new Map(); for (const group of groups) if (!byName.has(group.name)) byName.set(group.name, Number(group.id));
  if (FROM_ID) {
    const [addons] = await db.query(`SELECT tg.id, COUNT(*) AS n FROM menu_item_combo_components c
      JOIN menu_item_topping_groups l ON l.menu_item_id = c.component_item_id JOIN topping_groups tg ON tg.id = l.topping_group_id
      WHERE c.combo_item_id = ? AND tg.name NOT IN (${WANTED.map(() => '?').join(',')}) GROUP BY tg.id ORDER BY n DESC, tg.id LIMIT 1`, [combo.id, ...WANTED]);
    if (addons[0]) byName.set('(topping chính)', Number(addons[0].id));
  }
  const [current] = await db.query('SELECT topping_group_id FROM menu_item_topping_groups WHERE menu_item_id = ?', [combo.id]);
  const have = new Set(current.map(row => Number(row.topping_group_id)));
  const merged = [...new Set([...have, ...byName.values()])];
  if (merged.length === have.size) { skipped += 1; continue; }
  const token = await tokenFor(combo.username);
  await api('PUT', `/api/restaurant/restaurants/${combo.restaurant_id}/menu-items/${combo.id}/topping-groups`, { token, body: { groupIds: merged } });
  linked += 1;
  console.log(`${combo.name} (quán ${combo.restaurant_id}): ${[...byName.keys()].join(', ') || '—'}`);
}
console.log(`Xong. Gắn tuỳ chọn cho ${linked} combo, bỏ qua ${skipped}.`);
await db.end();
