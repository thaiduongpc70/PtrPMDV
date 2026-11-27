/* Nạp thực đơn thật cho 20 quán bằng chính API chủ quán (đăng nhập -> tạo nhóm món, món, biến thể, topping).
   Chạy khi server đang chạy:  node scripts/load-menus.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, tokenFor, pool } from './lib/api-client.mjs';
import { MENUS, VARIANT_SETS, TOPPING_SETS } from './data/realistic-menus.mjs';

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const [owners] = await db.query('SELECT r.id, r.name, u.username FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id ORDER BY r.id');
await db.end();

let totalItems = 0;
await pool(owners.filter(owner => MENUS[owner.id]), 5, async owner => {
  const plan = MENUS[owner.id];
  const token = await tokenFor(owner.username);
  const base = `/api/restaurant/restaurants/${owner.id}`;

  const existing = await api('GET', `${base}/menu-items?pageSize=100`, { token });
  if ((existing.items ?? []).length > 0) {
    console.log(`bỏ qua ${owner.name}: đã có ${existing.items.length} món`);
    return;
  }

  const menu = await api('POST', `${base}/menus`, { token, body: { name: 'Thực đơn chính', description: `Thực đơn ${owner.name}`, status: 'ACTIVE' } });
  const categoryIds = [];
  for (const [index, name] of plan.cats.entries()) {
    const category = await api('POST', `${base}/menu-categories`, { token, body: { menuId: menu.id, name, sortOrder: index + 1 } });
    categoryIds.push(category.id);
  }

  const toppingSet = TOPPING_SETS[plan.toppings];
  const group = await api('POST', `${base}/topping-groups`, { token, body: { name: toppingSet.name, minSelect: 0, maxSelect: toppingSet.max, required: false } });
  for (const [name, price] of toppingSet.items) {
    await api('POST', `${base}/topping-groups/${group.id}/toppings`, { token, body: { name, price } });
  }

  for (const [categoryIndex, name, price, description, options = {}] of plan.dishes) {
    const item = await api('POST', `${base}/menu-items`, {
      token,
      body: {
        categoryId: categoryIds[categoryIndex], name, description, basePrice: price,
        discountPrice: options.d ?? null, preparationTime: options.t ?? 15, isAvailable: true, isFeatured: Boolean(options.f)
      }
    });
    for (const [variantName, adjustment] of VARIANT_SETS[options.v] ?? []) {
      await api('POST', `${base}/menu-items/${item.id}/variants`, { token, body: { name: variantName, priceAdjustment: adjustment } });
    }
    await api('PUT', `${base}/menu-items/${item.id}/topping-groups`, { token, body: { groupIds: [group.id] } });
    totalItems += 1;
  }
  console.log(`${owner.name}: ${plan.dishes.length} món`);
});
console.log(`Xong. Đã tạo ${totalItems} món qua API.`);
