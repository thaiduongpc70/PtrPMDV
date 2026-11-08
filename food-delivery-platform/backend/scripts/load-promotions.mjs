/* Nạp ưu đãi thật bằng chính API, đúng phân quyền:
   - voucher nền tảng: do ADMIN tạo (mã giảm giá không giới hạn hạn ngạch/ngày; freeship có hạn ngạch + ngày kết thúc);
   - voucher từng quán: do CHỦ QUÁN tự cấp (giảm % hoặc giảm trực tiếp, có hạn ngạch và hạn dùng);
   - quà đổi điểm thưởng: do ADMIN tạo danh mục;
   - combo: do CHỦ QUÁN tạo từ các món của quán (giá combo rẻ hơn mua lẻ).
   Chạy khi server đang chạy (chạy lại không tạo trùng):  node scripts/load-promotions.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, tokenFor, pool, ApiError } from './lib/api-client.mjs';
import { MENUS } from './data/realistic-menus.mjs';

const DAY = 86400000;
const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const admin = await tokenFor('thaiduongpc7');
const created = { platform: 0, shop: 0, rewards: 0, combos: 0 };
const ignoreDuplicate = error => { if (error instanceof ApiError && error.status === 409) return null; throw error; };

/* 1. Voucher nền tảng */
const PLATFORM = [
  { code: 'CHAOBAN', name: 'Chào bạn mới - giảm 30K', description: 'Dành cho đơn đầu tiên, đơn từ 80K.', discountType: 'FIXED_AMOUNT', discountValue: 30000, minimumOrder: 80000, usagePerCustomer: 1, firstOrderOnly: true },
  { code: 'GIAM20K', name: 'Giảm 20K cho đơn từ 150K', description: 'Áp dụng mọi quán, không giới hạn lượt.', discountType: 'FIXED_AMOUNT', discountValue: 20000, minimumOrder: 150000, usagePerCustomer: 999999 },
  { code: 'GIAM10', name: 'Giảm 10% tối đa 30K', description: 'Đơn từ 100K, áp dụng mọi quán.', discountType: 'PERCENT', discountValue: 10, maxDiscount: 30000, minimumOrder: 100000, usagePerCustomer: 999999 },
  { code: 'GIAM15', name: 'Giảm 15% tối đa 45K', description: 'Đơn từ 200K, áp dụng mọi quán.', discountType: 'PERCENT', discountValue: 15, maxDiscount: 45000, minimumOrder: 200000, usagePerCustomer: 999999 },
  { code: 'GIAM50K', name: 'Giảm 50K cho đơn từ 350K', description: 'Đặt tiệc, đặt nhóm tiết kiệm hơn.', discountType: 'FIXED_AMOUNT', discountValue: 50000, minimumOrder: 350000, usagePerCustomer: 999999 },
  { code: 'FREESHIP99', name: 'Freeship tối đa 15K cho đơn từ 99K', description: 'Hạn ngạch có hạn, mỗi khách 4 lượt.', discountType: 'FREE_DELIVERY', discountValue: 15000, maxDiscount: 15000, minimumOrder: 99000, usagePerCustomer: 4, usageLimit: 3000, endAt: new Date(Date.now() + 30 * DAY).toISOString() },
  { code: 'FREESHIP199', name: 'Freeship tối đa 30K cho đơn từ 199K', description: 'Hạn ngạch có hạn, mỗi khách 6 lượt.', discountType: 'FREE_DELIVERY', discountValue: 30000, maxDiscount: 30000, minimumOrder: 199000, usagePerCustomer: 6, usageLimit: 2000, endAt: new Date(Date.now() + 30 * DAY).toISOString() }
];
for (const promo of PLATFORM) {
  const result = await api('POST', '/api/admin/manage/promotions', { token: admin, body: promo }).catch(ignoreDuplicate);
  if (result) created.platform += 1;
}
// Mã freeship cũ FREESHIP25 (đơn từ 50K, trần 25K) lấn át các mã theo ngưỡng mới nên được ngưng; lịch sử dùng vẫn giữ nguyên.
const [legacy] = await db.query("SELECT id FROM promotions WHERE code = 'FREESHIP25' AND status = 'ACTIVE'");
for (const row of legacy) await api('PATCH', `/api/admin/manage/promotions/${row.id}`, { token: admin, body: { status: 'INACTIVE' } });

/* 2. Quà đổi điểm (1 điểm = 1.000đ tiền món) */
const REWARDS = [
  { name: 'Freeship tối đa 15K', description: 'Miễn phí giao hàng cho 1 đơn bất kỳ.', pointsCost: 600, discountType: 'FREE_DELIVERY', discountValue: 15000, maxDiscount: 15000, minimumOrder: 0, validDays: 30 },
  { name: 'Voucher giảm 20K', description: 'Cho đơn từ 100K.', pointsCost: 1500, discountType: 'FIXED_AMOUNT', discountValue: 20000, minimumOrder: 100000, validDays: 30 },
  { name: 'Voucher giảm 15% tối đa 50K', description: 'Cho đơn từ 150K.', pointsCost: 2500, discountType: 'PERCENT', discountValue: 15, maxDiscount: 50000, minimumOrder: 150000, validDays: 30 },
  { name: 'Voucher giảm 50K', description: 'Cho đơn từ 250K.', pointsCost: 4000, discountType: 'FIXED_AMOUNT', discountValue: 50000, minimumOrder: 250000, validDays: 45 },
  { name: 'Voucher giảm 100K', description: 'Cho đơn từ 400K, số lượng có hạn.', pointsCost: 8000, discountType: 'FIXED_AMOUNT', discountValue: 100000, minimumOrder: 400000, validDays: 60, stock: 300 }
];
const existingRewards = new Set((await api('GET', '/api/admin/manage/loyalty-rewards', { token: admin })).items.map(item => item.name));
for (const reward of REWARDS.filter(item => !existingRewards.has(item.name))) {
  await api('POST', '/api/admin/manage/loyalty-rewards', { token: admin, body: reward });
  created.rewards += 1;
}

/* 3. Voucher của từng quán + 4. Combo, đều qua API chủ quán */
const [owners] = await db.query('SELECT r.id, r.name, u.username FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id ORDER BY r.id');
const [dishRows] = await db.query(`SELECT mi.id, mi.restaurant_id, mi.name, mi.preparation_time AS prep, COALESCE(mi.discount_price, mi.base_price) AS price, mc.sort_order AS cat
  FROM menu_items mi LEFT JOIN menu_categories mc ON mc.id = mi.category_id WHERE mi.deleted_at IS NULL AND mi.item_type = 'DISH' ORDER BY mi.restaurant_id, mc.sort_order, mi.id`);
const [existingCodes] = await db.query('SELECT code FROM promotions');
const [existingCombos] = await db.query("SELECT restaurant_id, name FROM menu_items WHERE item_type = 'COMBO'");
await db.end();

const strip = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
const roundK = value => Math.round(value / 1000) * 1000;
const fmt = value => `${Math.round(value / 1000)}K`;

await pool(owners.filter(owner => MENUS[owner.id]), 4, async owner => {
  const token = await tokenFor(owner.username);
  const base = `/api/restaurant/restaurants/${owner.id}`;
  const prefix = strip(owner.name).split(' ').filter(word => word.length > 1).slice(-2).join('').slice(0, 10);
  const used = new Set(existingCodes.map(row => row.code));
  const now = Date.now();

  // Voucher quán: 1 giảm trực tiếp + 1 giảm %, hạn dùng 14-45 ngày, hạn ngạch 120-400 lượt
  const fixed = [8000, 10000, 15000, 20000][owner.id % 4];
  const percent = [8, 10, 12, 15][(owner.id >> 1) % 4];
  const shopVouchers = [
    { code: `${prefix}${fmt(fixed)}`, name: `Giảm ${fmt(fixed)} đơn từ ${fmt(fixed * 8)}`, description: `Voucher của ${owner.name}.`, discountType: 'FIXED_AMOUNT', discountValue: fixed, minimumOrder: fixed * 8, usageLimit: 150 + (owner.id % 5) * 50, usagePerCustomer: 2, days: 30 },
    { code: `${prefix}${percent}`, name: `Giảm ${percent}% tối đa ${fmt(percent * 2500)}`, description: `Voucher của ${owner.name}, đơn từ ${fmt(percent * 12000)}.`, discountType: 'PERCENT', discountValue: percent, maxDiscount: percent * 2500, minimumOrder: percent * 12000, usageLimit: 120 + (owner.id % 4) * 70, usagePerCustomer: 1, days: 21 + (owner.id % 3) * 7 }
  ];
  for (const voucher of shopVouchers.filter(item => !used.has(item.code))) {
    const { days, ...body } = voucher;
    await api('POST', `${base}/promotions`, { token, body: { ...body, startAt: new Date(now - 2 * DAY).toISOString(), endAt: new Date(now + days * DAY).toISOString() } });
    created.shop += 1;
  }

  // Combo: món chính (nhóm đầu) + món phụ rẻ nhất của nhóm cuối; giảm 10-15% so với mua lẻ
  const dishes = dishRows.filter(row => Number(row.restaurant_id) === owner.id);
  const mains = dishes.filter(row => Number(row.cat) === Math.min(...dishes.map(item => Number(item.cat)))).sort((a, b) => Number(b.price) - Number(a.price));
  const lastCat = Math.max(...dishes.map(item => Number(item.cat)));
  const side = dishes.filter(row => Number(row.cat) === lastCat && !mains.includes(row)).sort((a, b) => Number(a.price) - Number(b.price))[0] ?? mains[mains.length - 1];
  const drinkShop = ['drink', 'coffee'].includes(MENUS[owner.id].toppings);
  const [a, b, c] = [mains[0], mains[Math.min(1, mains.length - 1)], mains[Math.min(2, mains.length - 1)]];
  const plans = drinkShop
    ? [['Combo 2 ly', 0.10, [[a, 1], [b, 1]]], ['Combo 3 ly', 0.12, [[a, 1], [b, 1], [c, 1]]], ['Combo team 5 ly', 0.15, [[a, 2], [b, 2], [c, 1]]]]
    : [['Combo 1 người', 0.10, [[a, 1], [side, 1]]], ['Combo 2 người', 0.12, [[a, 1], [b, 1], [side, 2]]], ['Combo gia đình', 0.15, [[a, 2], [b, 2], [side, 3]]]];
  const menus = await api('GET', `${base}/menus`, { token });
  const menuId = (menus.items ?? menus)[0].id;
  const categories = await api('GET', `${base}/menu-categories`, { token });
  let category = (categories.items ?? categories).find(item => item.name === 'Combo ưu đãi');
  if (!category) category = await api('POST', `${base}/menu-categories`, { token, body: { menuId, name: 'Combo ưu đãi', description: 'Mua theo combo rẻ hơn mua lẻ', sortOrder: 0 } });
  for (const [name, discount, parts] of plans) {
    if (existingCombos.some(row => Number(row.restaurant_id) === owner.id && row.name === name)) continue;
    const merged = new Map();
    for (const [dish, quantity] of parts) merged.set(dish.id, { dish, quantity: (merged.get(dish.id)?.quantity ?? 0) + quantity });
    const components = [...merged.values()];
    if (components.length < 2) continue;
    const original = components.reduce((sum, part) => sum + Number(part.dish.price) * part.quantity, 0);
    const price = roundK(original * (1 - discount));
    const item = await api('POST', `${base}/menu-items`, {
      token,
      body: {
        categoryId: category.id, name, basePrice: original, discountPrice: price, isAvailable: true, isFeatured: true,
        preparationTime: Math.max(...components.map(part => Number(part.dish.prep))) + 5,
        description: `Gồm: ${components.map(part => `${part.quantity} ${part.dish.name}`).join(', ')}. Tiết kiệm ${(original - price).toLocaleString('vi-VN')}đ so với mua lẻ.`
      }
    });
    await api('PUT', `${base}/menu-items/${item.id}/combo`, { token, body: { components: components.map(part => ({ itemId: part.dish.id, quantity: part.quantity })) } });
    created.combos += 1;
  }

  // Voucher cũ của quán chưa có hạn ngạch: bổ sung theo quy định mới
  const own = await api('GET', `${base}/promotions`, { token });
  for (const promo of (own.items ?? []).filter(item => item.usageLimit == null && item.status === 'ACTIVE' && item.discountType !== 'FREE_DELIVERY')) {
    await api('PATCH', `${base}/promotions/${promo.id}`, { token, body: { usageLimit: 300 } });
  }
});
console.log('Đã tạo:', created);
