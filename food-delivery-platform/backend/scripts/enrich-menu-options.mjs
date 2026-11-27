/* Bổ sung nhóm tuỳ chọn kiểu ShopeeFood/GrabFood cho thực đơn, vẫn qua API chủ quán:
   - đồ uống/cà phê: "Mức đường" và "Mức đá" (bắt buộc chọn 1);
   - pizza: "Loại đế" (bắt buộc chọn 1);
   - phở/bún/mì, cơm, đồ ăn vặt: "Độ cay" (tuỳ chọn, chọn 1);
   - combo/set của đồ ăn nhanh: "Chọn nước uống" (tuỳ chọn, chọn 1).
   Các nhóm cũ (Ăn kèm, Topping...) được giữ nguyên; món được gắn thêm nhóm mới. Chạy lại không tạo trùng.
   Chạy khi server đang chạy:  node scripts/enrich-menu-options.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, tokenFor, pool } from './lib/api-client.mjs';
import { MENUS } from './data/realistic-menus.mjs';

const GROUPS = {
  sugar: { name: 'Mức đường', min: 1, max: 1, required: true, items: [['100% đường', 0], ['70% đường', 0], ['50% đường', 0], ['30% đường', 0], ['Không đường', 0]] },
  ice: { name: 'Mức đá', min: 1, max: 1, required: true, items: [['Đá bình thường', 0], ['Ít đá', 0], ['Không đá', 0]] },
  crust: { name: 'Loại đế', min: 1, max: 1, required: true, items: [['Đế mỏng giòn', 0], ['Đế dày mềm', 0], ['Đế viền phô mai', 20000]] },
  spicy: { name: 'Độ cay', min: 0, max: 1, required: false, items: [['Không cay', 0], ['Cay vừa', 0], ['Cay nhiều', 0]] },
  drink: { name: 'Chọn nước uống', min: 0, max: 1, required: false, items: [['Pepsi lon', 12000], ['7Up lon', 12000], ['Trà đào cam sả', 20000], ['Nước suối', 8000]] }
};

/* Nhóm nào áp cho món nào, theo loại thực đơn của quán (xem TOPPING_SETS trong realistic-menus.mjs). */
function groupsFor(type, dish) {
  const text = `${dish.category} ${dish.name}`.toLowerCase();
  if (type === 'drink' || type === 'coffee') return /bánh|croissant|sandwich|mì|cơm/.test(text) ? [] : ['sugar', 'ice'];
  if (type === 'pizza') return /pizza/.test(text) ? ['crust'] : [];
  if (type === 'noodle') return /phở|bún|mì|hủ tiếu|miến|lẩu|cháo/.test(text) && !/quẩy|trứng cút|rau/.test(dish.category.toLowerCase()) ? ['spicy'] : [];
  if (type === 'rice') return /cơm/.test(text) ? ['spicy'] : [];
  if (type === 'snack') return /cay|xiên|nướng|chiên|tokbokki|sa tế|bánh tráng|gỏi|mực/.test(text) ? ['spicy'] : [];
  if (type === 'fastfood') return /combo|set|phần/.test(text) ? ['drink'] : [];
  return [];
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const [owners] = await db.query('SELECT r.id, r.name, u.username FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id ORDER BY r.id');
const [dishes] = await db.query(`SELECT mi.id, mi.restaurant_id, mi.name, COALESCE(mc.name, '') AS category,
  (SELECT GROUP_CONCAT(l.topping_group_id) FROM menu_item_topping_groups l WHERE l.menu_item_id = mi.id) AS linked
  FROM menu_items mi LEFT JOIN menu_categories mc ON mc.id = mi.category_id WHERE mi.deleted_at IS NULL`);
const [existingGroups] = await db.query('SELECT id, restaurant_id, name FROM topping_groups');
await db.end();

let attached = 0;
let created = 0;
await pool(owners.filter(owner => MENUS[owner.id]), 4, async owner => {
  const type = MENUS[owner.id].toppings;
  const token = await tokenFor(owner.username);
  const base = `/api/restaurant/restaurants/${owner.id}`;
  const wanted = new Map(); // khóa nhóm -> các món cần gắn
  for (const dish of dishes.filter(row => Number(row.restaurant_id) === owner.id)) {
    for (const key of groupsFor(type, dish)) wanted.set(key, [...(wanted.get(key) ?? []), dish]);
  }
  const groupIds = {};
  for (const key of wanted.keys()) {
    const spec = GROUPS[key];
    const found = existingGroups.find(row => Number(row.restaurant_id) === owner.id && row.name === spec.name);
    if (found) { groupIds[key] = Number(found.id); continue; }
    const group = await api('POST', `${base}/topping-groups`, { token, body: { name: spec.name, minSelect: spec.min, maxSelect: spec.max, required: spec.required } });
    for (const [name, price] of spec.items) await api('POST', `${base}/topping-groups/${group.id}/toppings`, { token, body: { name, price } });
    groupIds[key] = Number(group.id);
    created += 1;
  }
  const perDish = new Map();
  for (const [key, list] of wanted) for (const dish of list) perDish.set(dish.id, [...(perDish.get(dish.id) ?? []), groupIds[key]]);
  for (const [dishId, newIds] of perDish) {
    const dish = dishes.find(row => row.id === dishId);
    const current = (dish.linked ?? '').split(',').filter(Boolean).map(Number);
    const merged = [...new Set([...current, ...newIds])];
    if (merged.length === current.length) continue;
    await api('PUT', `${base}/menu-items/${dishId}/topping-groups`, { token, body: { groupIds: merged } });
    attached += 1;
  }
  console.log(`${owner.name}: ${perDish.size} món có thêm tuỳ chọn`);
});
console.log(`Xong. Tạo ${created} nhóm tuỳ chọn mới, gắn thêm cho ${attached} món.`);
