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
import { NEW_RESTAURANTS } from './data/new-restaurants.mjs';

// --from-id N: chỉ xử lý quán có id >= N (thêm quán mới); quán mới tra loại hình (đồ uống/đồ ăn) theo tên
const fromIdArg = process.argv.indexOf('--from-id');
const FROM_ID = fromIdArg >= 0 ? Number(process.argv[fromIdArg + 1]) : 0;
const NEW_BY_NAME = new Map(NEW_RESTAURANTS.map(item => [item.name, item]));
const kindOf = owner => MENUS[owner.id]?.toppings ?? (NEW_BY_NAME.get(owner.name)?.kind === 'drink' ? 'drink' : NEW_BY_NAME.has(owner.name) ? 'food' : null);

const DAY = 86400000;
const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const admin = await tokenFor('thaiduongpc7');
const created = { platform: 0, shop: 0, rewards: 0, combos: 0 };
const ignoreDuplicate = error => { if (error instanceof ApiError && error.status === 409) return null; throw error; };

/* 1. Voucher nền tảng (giảm % / trực tiếp không giới hạn lượt nhưng có hạn dùng thật, mặc định ${PLATFORM_DAYS} ngày) */
const PLATFORM_DAYS = 90;
const platformEnd = () => new Date(Date.now() + PLATFORM_DAYS * DAY).toISOString();
const PLATFORM = [
  { code: 'CHAOBAN', name: 'Chào bạn mới - giảm 30K', description: 'Dành cho đơn đầu tiên, đơn từ 80K.', discountType: 'FIXED_AMOUNT', discountValue: 30000, minimumOrder: 80000, usagePerCustomer: 1, firstOrderOnly: true, endAt: platformEnd() },
  { code: 'GIAM20K', name: 'Giảm 20K cho đơn từ 150K', description: 'Áp dụng mọi quán, không giới hạn lượt.', discountType: 'FIXED_AMOUNT', discountValue: 20000, minimumOrder: 150000, usagePerCustomer: 999999, endAt: platformEnd() },
  { code: 'GIAM10', name: 'Giảm 10% tối đa 30K', description: 'Đơn từ 100K, áp dụng mọi quán.', discountType: 'PERCENT', discountValue: 10, maxDiscount: 30000, minimumOrder: 100000, usagePerCustomer: 999999, endAt: platformEnd() },
  { code: 'GIAM15', name: 'Giảm 15% tối đa 45K', description: 'Đơn từ 200K, áp dụng mọi quán.', discountType: 'PERCENT', discountValue: 15, maxDiscount: 45000, minimumOrder: 200000, usagePerCustomer: 999999, endAt: platformEnd() },
  { code: 'GIAM50K', name: 'Giảm 50K cho đơn từ 350K', description: 'Đặt tiệc, đặt nhóm tiết kiệm hơn.', discountType: 'FIXED_AMOUNT', discountValue: 50000, minimumOrder: 350000, usagePerCustomer: 999999, endAt: platformEnd() },
  { code: 'FREESHIP99', name: 'Freeship tối đa 15K cho đơn từ 99K', description: 'Hạn ngạch có hạn, mỗi khách 4 lượt.', discountType: 'FREE_DELIVERY', discountValue: 15000, maxDiscount: 15000, minimumOrder: 99000, usagePerCustomer: 4, usageLimit: 3000, endAt: new Date(Date.now() + 30 * DAY).toISOString() },
  { code: 'FREESHIP199', name: 'Freeship tối đa 30K cho đơn từ 199K', description: 'Hạn ngạch có hạn, mỗi khách 6 lượt.', discountType: 'FREE_DELIVERY', discountValue: 30000, maxDiscount: 30000, minimumOrder: 199000, usagePerCustomer: 6, usageLimit: 2000, endAt: new Date(Date.now() + 30 * DAY).toISOString() }
];
for (const promo of PLATFORM) {
  const result = await api('POST', '/api/admin/manage/promotions', { token: admin, body: promo }).catch(ignoreDuplicate);
  if (result) created.platform += 1;
}
// Voucher toàn sàn còn hạn 2099 (dữ liệu cũ) hoặc đã quá hạn: đặt lại hạn thật qua API admin (PATCH endAt)
const [staleRows] = await db.query("SELECT id FROM promotions WHERE restaurant_id IS NULL AND customer_id IS NULL AND status = 'ACTIVE' AND deleted_at IS NULL AND (end_at > '2090-01-01' OR end_at < CURRENT_TIMESTAMP)");
for (const row of staleRows) await api('PATCH', `/api/admin/manage/promotions/${row.id}`, { token: admin, body: { endAt: platformEnd() } });
if (staleRows.length) console.log(`Đã đặt lại hạn ${PLATFORM_DAYS} ngày cho ${staleRows.length} voucher toàn sàn.`);
// Mô tả voucher toàn sàn còn chữ "dữ liệu vận hành mẫu": viết lại bằng tên voucher (qua API admin)
const [sampleText] = await db.query("SELECT id, name FROM promotions WHERE restaurant_id IS NULL AND customer_id IS NULL AND description LIKE '%dữ liệu vận hành mẫu%'");
for (const row of sampleText) await api('PATCH', `/api/admin/manage/promotions/${row.id}`, { token: admin, body: { description: `${row.name}.` } });
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
const [owners] = await db.query('SELECT r.id, r.name, r.minimum_order AS min_order, u.username FROM restaurants r INNER JOIN users u ON u.id = r.owner_user_id ORDER BY r.id');
const [dishRows] = await db.query(`SELECT mi.id, mi.restaurant_id, mi.name, mi.preparation_time AS prep, COALESCE(mi.discount_price, mi.base_price) AS price, mc.sort_order AS cat
  FROM menu_items mi LEFT JOIN menu_categories mc ON mc.id = mi.category_id WHERE mi.deleted_at IS NULL AND mi.item_type = 'DISH' ORDER BY mi.restaurant_id, mc.sort_order, mi.id`);
const [existingCodes] = await db.query('SELECT code FROM promotions');
const [existingCombos] = await db.query("SELECT restaurant_id, name FROM menu_items WHERE item_type = 'COMBO'");
const [topDishRows] = await db.query("SELECT restaurant_id, name FROM menu_items WHERE item_type = 'DISH' AND deleted_at IS NULL AND is_available = TRUE ORDER BY sold_count DESC, id");
await db.end();

const strip = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
const roundK = value => Math.round(value / 1000) * 1000;
const fmt = value => `${Math.round(value / 1000)}K`;
const vnd = value => `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
// Đơn tối thiểu của voucher quán: ≥ 2× đơn tối thiểu của quán và ≥ 4× mức giảm tối đa (để voucher có ý nghĩa)
const voucherMin = (shopMin, benefit) => roundK(Math.max(Number(shopMin) * 2, benefit * 4));
// Tên + mô tả voucher quán khác nhau theo quán: chọn mẫu theo id quán và chèn tên quán/món bán chạy nhất thật (không dùng một khuôn chung)
const topDish = new Map();
for (const row of topDishRows) if (!topDish.has(Number(row.restaurant_id))) topDish.set(Number(row.restaurant_id), row.name);
function voucherStyle(owner, v) {
  const shop = owner.name;
  const dish = topDish.get(owner.id) ?? 'món đặc trưng';
  const n = v.usagePerCustomer ?? 1;
  const min = vnd(v.minimumOrder);
  const pick = (list, offset) => list[(owner.id + offset) % list.length];
  if (v.discountType === 'PERCENT') {
    const p = Number(v.discountValue);
    const cap = vnd(v.maxDiscount ?? p * 2500);
    return {
      name: pick([`${shop} giảm ${p}%`, `Mê ${dish}: giảm ${p}%`, `Đặt nhóm tại ${shop} -${p}%`, `Giảm ${p}% · ${shop}`, `Thưởng ${p}% cho đơn ${dish}`], 3),
      description: pick([
        `Giảm ${p}% (tối đa ${cap}) cho đơn từ ${min} tại ${shop}, hợp để gọi ${dish} cho cả nhóm. Mỗi khách dùng ${n} lần.`,
        `${shop} giảm ${p}% tổng tiền món khi đơn đạt ${min}; mức giảm không quá ${cap}. Thử ${dish} nhé. Giới hạn ${n} lượt/khách.`,
        `Ưu đãi theo phần trăm của ${shop}: -${p}% (trần ${cap}) với đơn từ ${min}. Món được gọi nhiều nhất: ${dish}. Mỗi khách ${n} lần.`,
        `Đơn từ ${min} ở ${shop} được trừ ${p}% tiền món, tối đa ${cap}; dùng tối đa ${n} lần cho mỗi khách.`,
        `Gom đơn từ ${min} tại ${shop} (nên thử ${dish}) để giảm ${p}%, trần ${cap} mỗi đơn, ${n} lượt/khách.`
      ], 1)
    };
  }
  const val = vnd(v.discountValue);
  const k = fmt(Number(v.discountValue));
  return {
    name: pick([`${dish} giảm ${k}`, `${shop} tặng bạn ${k}`, `Đơn từ ${fmt(Number(v.minimumOrder))} giảm ${k} · ${shop}`, `Ưu đãi ${dish}: bớt ${k}`, `Bớt ${k} tại ${shop}`], 2),
    description: pick([
      `Gọi ${dish} (hoặc món bất kỳ) tại ${shop}, đơn từ ${min} được giảm ${val}. Mỗi khách dùng ${n} lần.`,
      `${shop} gửi bạn ${val} cho đơn từ ${min} — hợp để đặt thêm ${dish}. Giới hạn ${n} lượt/khách.`,
      `Ưu đãi nhà ${shop}: trừ thẳng ${val} khi đơn đạt ${min}. Món được gọi nhiều nhất: ${dish}. Mỗi khách ${n} lần.`,
      `Giảm ${val} trên tổng đơn từ ${min} ở ${shop}; dùng được ${n} lần cho mỗi khách.`,
      `Đơn từ ${min} tại ${shop} (thử ${dish}) được giảm ${val}, tối đa ${n} lần mỗi khách.`
    ], 4)
  };
}
/** Hạn voucher quán 30-90 ngày kể từ ngày chạy, khác nhau theo quán/voucher. */
const voucherDays = (ownerId, index) => 30 + ((ownerId * 7 + index * 11) % 59);

// Mã voucher phải duy nhất toàn hệ thống: hai quán cùng phường/cùng đuôi tên (vd 'Nghĩa Đô') thêm id quán vào mã nếu trùng
const usedCodes = new Set(existingCodes.map(row => row.code));
const uniqueCode = (code, ownerId) => { let result = code; if (usedCodes.has(result)) result = `${code}${ownerId}`; usedCodes.add(result); return result; };

await pool(owners.filter(owner => owner.id >= FROM_ID && kindOf(owner)), 4, async owner => {
  const token = await tokenFor(owner.username);
  const base = `/api/restaurant/restaurants/${owner.id}`;
  const prefix = strip(owner.name).split(' ').filter(word => word.length > 1).slice(-2).join('').slice(0, 10);
  const now = Date.now();

  // Voucher quán: 1 giảm trực tiếp + 1 giảm %, hạn dùng 14-45 ngày, hạn ngạch 120-400 lượt
  const fixed = [8000, 10000, 15000, 20000][owner.id % 4];
  const percent = [8, 10, 12, 15][(owner.id >> 1) % 4];
  // Mã giảm % có hậu tố PT để không nhầm với mã giảm tiền (vd BACHMAI8K = giảm 8K, BACHMAI8PT = giảm 8%)
  const fixedMin = voucherMin(owner.min_order, fixed);
  const percentMin = voucherMin(owner.min_order, percent * 2500);
  const shopVouchers = [
    { code: `${prefix}${fmt(fixed)}`, name: `Giảm ${fmt(fixed)} đơn từ ${fmt(fixedMin)}`, discountType: 'FIXED_AMOUNT', discountValue: fixed, minimumOrder: fixedMin, usageLimit: 150 + (owner.id % 5) * 50, usagePerCustomer: 2, days: voucherDays(owner.id, 0) },
    { code: `${prefix}${percent}PT`, name: `Giảm ${percent}% tối đa ${fmt(percent * 2500)}`, discountType: 'PERCENT', discountValue: percent, maxDiscount: percent * 2500, minimumOrder: percentMin, usageLimit: 120 + (owner.id % 4) * 70, usagePerCustomer: 1, days: voucherDays(owner.id, 1) }
  ];
  for (const voucher of shopVouchers) Object.assign(voucher, voucherStyle(owner, voucher));
  // Chạy lại không tạo trùng: quán đã có voucher cùng loại + cùng mức giảm (kể cả đã INACTIVE) thì bỏ qua, dù mã khác kiểu đặt tên
  const ownBefore = (await api('GET', `${base}/promotions`, { token })).items ?? [];
  for (const voucher of shopVouchers.filter(item => !ownBefore.some(p => p.discountType === item.discountType && Number(p.discountValue) === item.discountValue))) {
    const { days, ...body } = voucher;
    body.code = uniqueCode(body.code, owner.id);
    await api('POST', `${base}/promotions`, { token, body: { ...body, startAt: new Date(now - 2 * DAY).toISOString(), endAt: new Date(now + days * DAY).toISOString() } });
    created.shop += 1;
  }

  // Combo: món chính (nhóm đầu) + món phụ rẻ nhất của nhóm cuối; giảm 10-15% so với mua lẻ
  const dishes = dishRows.filter(row => Number(row.restaurant_id) === owner.id);
  const mains = dishes.filter(row => Number(row.cat) === Math.min(...dishes.map(item => Number(item.cat)))).sort((a, b) => Number(b.price) - Number(a.price));
  const lastCat = Math.max(...dishes.map(item => Number(item.cat)));
  const side = dishes.filter(row => Number(row.cat) === lastCat && !mains.includes(row)).sort((a, b) => Number(a.price) - Number(b.price))[0] ?? mains[mains.length - 1];
  const drinkShop = ['drink', 'coffee'].includes(kindOf(owner));
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
  if (FROM_ID) return;
  const own = await api('GET', `${base}/promotions`, { token });
  // Chuẩn hoá voucher cũ: mô tả có nghĩa (bỏ "Voucher của <quán>" / "dữ liệu vận hành mẫu"), đơn tối thiểu hợp lý so với quán,
  // vô hiệu hoá (INACTIVE, không xoá) bản trùng ngữ nghĩa: cùng quán có mã giảm % và mã giảm tiền cùng con số (8% / 8K) gây nhầm
  const active = (own.items ?? []).filter(item => item.status === 'ACTIVE');
  for (const promo of own.items ?? []) {
    const patchBody = {};
    const benefit = promo.discountType === 'PERCENT' ? Number(promo.maxDiscount ?? promo.discountValue * 2500) : Number(promo.discountValue);
    const wantMin = voucherMin(owner.min_order, benefit);
    // Voucher đã có người dùng thì KHÔNG đổi giá trị/ngưỡng; chỉ đổi chữ (tên, mô tả) và hạn dùng
    if (!Number(promo.usedCount) && Number(promo.minimumOrder) < wantMin) patchBody.minimumOrder = wantMin;
    const next = { ...promo, ...patchBody, discountValue: Number(promo.discountValue), minimumOrder: Number(patchBody.minimumOrder ?? promo.minimumOrder), maxDiscount: promo.maxDiscount == null ? null : Number(promo.maxDiscount) };
    const style = voucherStyle(owner, next);
    if (promo.name !== style.name) patchBody.name = style.name;
    if (promo.description !== style.description) patchBody.description = style.description;
    const twin = promo.discountType === 'PERCENT' && active.some(other => other.id !== promo.id && other.discountType === 'FIXED_AMOUNT' && Number(other.discountValue) / 1000 === Number(promo.discountValue));
    if (twin && promo.status === 'ACTIVE') { patchBody.status = 'INACTIVE'; created.deduped = (created.deduped ?? 0) + 1; }
    if (Object.keys(patchBody).length) { await api('PATCH', `${base}/promotions/${promo.id}`, { token, body: patchBody }); created.tidied = (created.tidied ?? 0) + 1; }
  }
  for (const promo of (own.items ?? []).filter(item => item.usageLimit == null && item.status === 'ACTIVE' && item.discountType !== 'FREE_DELIVERY')) {
    await api('PATCH', `${base}/promotions/${promo.id}`, { token, body: { usageLimit: 300 } });
  }
  // Gia hạn qua API chủ quán (/extend): voucher hết hạn (EXPIRED) hoặc còn dưới 30 ngày được kéo tới hạn 30-90 ngày kể từ hôm nay;
  // hết hạn ngạch thì cộng thêm 100 lượt. Voucher INACTIVE (bản trùng đã tắt) giữ nguyên.
  const fresh = (await api('GET', `${base}/promotions`, { token })).items ?? [];
  for (const [index, promo] of fresh.filter(item => item.status !== 'INACTIVE').entries()) {
    const remaining = (new Date(promo.endAt).getTime() - Date.now()) / DAY;
    if (promo.status === 'ACTIVE' && remaining >= 30) continue;
    const days = Math.min(90, Math.max(1, Math.ceil(voucherDays(owner.id, index) - Math.max(remaining, 0))));
    const exhausted = promo.usageLimit != null && Number(promo.usedCount) >= Number(promo.usageLimit);
    await api('POST', `${base}/promotions/${promo.id}/extend`, { token, body: { days, ...(exhausted ? { addQuota: 100 } : {}) } });
    created.renewed = (created.renewed ?? 0) + 1;
  }
});
console.log('Đã tạo:', created);
