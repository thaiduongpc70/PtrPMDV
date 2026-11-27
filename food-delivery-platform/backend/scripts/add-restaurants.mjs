/*
 * Thêm quán mới (Hà Nội + Hưng Yên) bằng chính các API của hệ thống — không chèn SQL:
 *   1. admin tạo thêm danh mục quán (Món Hàn, Món Nhật, Dimsum & Món Hoa, Bánh & Kem, Lẩu & Nướng)
 *   2. chủ quán nộp hồ sơ đối tác (kèm cam kết đã đọc hết) -> admin duyệt
 *   3. địa chỉ/toạ độ thật: tên đường + phường/xã lấy từ OpenStreetMap quanh điểm neo, chủ quán cập nhật qua PATCH
 *   4. thực đơn: nhóm món, món, size, nhóm topping thêm (không giới hạn) + mức đường/đá/độ cay đúng từng món
 * Voucher + combo: node scripts/load-promotions.mjs ; ảnh: scripts/image-library/apply.mjs ; đánh giá/đơn: simulate-activity.mjs
 *
 *   API_BASE_URL=http://localhost:3001 node scripts/add-restaurants.mjs [--dry-run] [--only key1,key2] [--cache osm.json]
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { connect } from './lib/db.mjs';
import { api, tokenFor, DEFAULT_PASSWORD } from './lib/api-client.mjs';
import { openCache, streetsAround, wardAt } from './lib/osm.mjs';
import { NEW_RESTAURANTS, NEW_CATEGORIES } from './data/new-restaurants.mjs';
import { ADDONS, SINGLE, VARIANT_SETS } from './data/option-catalog.mjs';

const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const DRY = args.includes('--dry-run');
const only = opt('--only')?.split(',');
const store = openCache(opt('--cache'));

const db = await connect();
const q = async (sql, params) => (await db.query(sql, params))[0];
const admin = DRY ? null : await tokenFor('thaiduongpc7');

/* ---------- 1. danh mục quán ---------- */
const have = new Map((await q('SELECT id, name FROM restaurant_categories')).map(row => [row.name, Number(row.id)]));
for (const [name, description] of NEW_CATEGORIES) {
  if (have.has(name)) continue;
  if (DRY) { have.set(name, -1); continue; }
  const created = await api('POST', '/api/admin/restaurant-categories', { token: admin, body: { name, description, status: 'ACTIVE' } });
  have.set(name, Number(created.id));
  console.log(`Danh mục mới: ${name}`);
}

/* ---------- địa chỉ thật ---------- */
const NAMED_STREET = /^(Phố|Đường|Đại lộ|Quốc lộ|Tỉnh lộ|Thôn|Xóm)\b/i;
const usedStreets = new Set();
// Quán có `sameAreaAs`: dùng phường + đường THẬT đã tra cứu OSM cho quán gốc (new-places.json), không gọi lại Overpass
const PLACES_FILE = new URL('./data/new-places.json', import.meta.url);
const knownPlaces = existsSync(PLACES_FILE) ? JSON.parse(readFileSync(PLACES_FILE, 'utf8')) : [];
async function locate(restaurant, index) {
  if (restaurant.sameAreaAs) {
    const ref = NEW_RESTAURANTS.find(item => item.key === restaurant.sameAreaAs);
    const entry = ref && knownPlaces.find(item => item.anchor[0] === ref.anchor[0] && item.anchor[1] === ref.anchor[1]);
    if (entry?.streets?.length) {
      const street = entry.streets[index % entry.streets.length];
      // lệch nhẹ vài chục mét để các quán cùng đường không trùng toạ độ
      const jitterLat = ((index % 7) - 3) * 0.00012; const jitterLng = (((index * 3) % 7) - 3) * 0.00012;
      return { ward: entry.ward, street: street.name, lat: Number((street.lat + jitterLat).toFixed(7)), lng: Number((street.lng + jitterLng).toFixed(7)), address: `${12 + ((index * 53) % 160)} ${street.name}`, streets: entry.streets };
    }
  }
  const [lat, lng] = restaurant.anchor;
  const anchorWard = await wardAt(lat, lng, store);
  const named = street => NAMED_STREET.test(street.name) || (restaurant.region === 'HY' && !/^\d|Ngõ|Ngách|Hẻm/i.test(street.name));
  let streets = (await streetsAround(lat, lng, restaurant.region === 'HN' ? 500 : 1500, store)).filter(named);
  if (!streets.length) streets = (await streetsAround(lat, lng, 1500, store)).filter(named); // điểm neo nằm ngoài khu có đường: mở rộng bán kính
  const street = streets.find(item => !usedStreets.has(item.name)) ?? streets[index % Math.max(1, streets.length)] ?? { name: 'Phố Chính', lat, lng };
  usedStreets.add(street.name);
  const ward = (await wardAt(street.lat, street.lng, store)) ?? anchorWard ?? (restaurant.region === 'HN' ? 'Phường Hoàn Kiếm' : 'Phường Phố Hiến');
  const number = 8 + ((index * 37) % 170);
  return { ward, street: street.name, lat: Number(street.lat.toFixed(7)), lng: Number(street.lng.toFixed(7)), address: `${number} ${street.name}`, streets: streets.slice(0, 8) };
}

/* ---------- 2–4. từng quán ---------- */
const commitmentVersion = DRY ? null : (await api('GET', '/api/partners/commitments/restaurant')).version;
const list = NEW_RESTAURANTS.filter(item => !only || only.includes(item.key));
const summary = { restaurants: 0, dishes: 0, groups: 0 };
const places = []; // điểm neo + đường thật, dùng để tạo địa chỉ khách ở cùng khu vực (simulate-activity)

for (const [index, restaurant] of list.entries()) {
  const place = await locate(restaurant, index);
  places.push({ region: restaurant.region, city: restaurant.city, ward: place.ward, anchor: restaurant.anchor, streets: place.streets });
  const email = `${restaurant.owner.username.replace(/\./g, '')}@example.vn`;
  console.log(`\n${restaurant.name} — ${place.address}, ${place.ward}, ${restaurant.city} (${place.lat}, ${place.lng})`);
  if (DRY) continue;

  const exists = (await q('SELECT r.id FROM restaurants r JOIN users u ON u.id = r.owner_user_id WHERE u.username = ?', [restaurant.owner.username]))[0];
  let restaurantId = exists ? Number(exists.id) : null;
  if (!restaurantId) {
    const application = await api('POST', '/api/partners/register/restaurant', {
      body: {
        username: restaurant.owner.username, email, phone: restaurant.owner.phone, password: DEFAULT_PASSWORD,
        ownerName: restaurant.owner.ownerName, restaurantName: restaurant.name, restaurantPhone: restaurant.owner.phone,
        address: place.address, ward: '', district: place.ward, city: restaurant.city, description: restaurant.description,
        openingTime: restaurant.hours[0], closingTime: restaurant.hours[1], minimumOrder: restaurant.minOrder,
        categoryId: have.get(restaurant.category), businessLicense: `0${3000000000 + Math.floor(Math.random() * 999999999)}`,
        commitment: { kind: 'restaurant', version: commitmentVersion, accepted: true, readToEnd: true }
      }
    });
    await api('POST', `/api/admin/partners/applications/${application.applicationId}/approve`, { token: admin, body: { note: 'Hồ sơ hợp lệ, đã đối chiếu giấy phép kinh doanh.', commissionRate: 15 } });
    restaurantId = Number((await q('SELECT r.id FROM restaurants r JOIN users u ON u.id = r.owner_user_id WHERE u.username = ?', [restaurant.owner.username]))[0].id);
  }

  const token = await tokenFor(restaurant.owner.username);
  const base = `/api/restaurant/restaurants/${restaurantId}`;
  const current = await api('GET', base, { token });
  await api('PATCH', base, { token, body: { ...current, latitude: place.lat, longitude: place.lng, address: place.address, openingTime: restaurant.hours[0], closingTime: restaurant.hours[1] } });
  summary.restaurants += 1;

  const existing = await api('GET', `${base}/menu-items?pageSize=100`, { token });
  if ((existing.items ?? []).length > 0) { console.log(`  đã có ${existing.items.length} món — bỏ qua thực đơn`); continue; }

  const menu = await api('POST', `${base}/menus`, { token, body: { name: 'Thực đơn chính', description: `Thực đơn ${restaurant.name}`, status: 'ACTIVE' } });
  const categoryIds = [];
  for (const [position, [name]] of restaurant.cats.entries()) {
    const category = await api('POST', `${base}/menu-categories`, { token, body: { menuId: menu.id, name, sortOrder: position + 1 } });
    categoryIds.push(category.id);
  }

  const groupIds = new Map(); // khoá nhóm -> id (tạo khi cần dùng)
  const ensureAddon = async key => {
    if (groupIds.has(`a:${key}`)) return groupIds.get(`a:${key}`);
    const [name, items] = ADDONS[key];
    const group = await api('POST', `${base}/topping-groups`, { token, body: { name, minSelect: 0, maxSelect: items.length, required: false } });
    for (const [optionName, price] of items) await api('POST', `${base}/topping-groups/${group.id}/toppings`, { token, body: { name: optionName, price } });
    groupIds.set(`a:${key}`, group.id); summary.groups += 1;
    return group.id;
  };
  const ensureSingle = async key => {
    if (groupIds.has(`s:${key}`)) return groupIds.get(`s:${key}`);
    const spec = SINGLE[key];
    const group = await api('POST', `${base}/topping-groups`, { token, body: { name: spec.name, minSelect: spec.min, maxSelect: spec.max, required: spec.required } });
    for (const [optionName, price] of spec.items) await api('POST', `${base}/topping-groups/${group.id}/toppings`, { token, body: { name: optionName, price } });
    groupIds.set(`s:${key}`, group.id); summary.groups += 1;
    return group.id;
  };

  for (const [categoryIndex, name, price, description, options = {}] of restaurant.dishes) {
    const catDefaults = restaurant.cats[categoryIndex][1] ?? {};
    const addon = options.a !== undefined ? options.a : catDefaults.a;
    const single = options.s ?? catDefaults.s ?? [];
    const item = await api('POST', `${base}/menu-items`, {
      token,
      body: { categoryId: categoryIds[categoryIndex], name, description, basePrice: price, discountPrice: options.d ?? null, preparationTime: options.t ?? 15, isAvailable: true, isFeatured: Boolean(options.f) }
    });
    for (const [variantName, adjustment] of VARIANT_SETS[options.v] ?? []) {
      await api('POST', `${base}/menu-items/${item.id}/variants`, { token, body: { name: variantName, priceAdjustment: adjustment } });
    }
    const ids = [];
    if (addon) ids.push(await ensureAddon(addon));
    for (const key of single) ids.push(await ensureSingle(key));
    if (ids.length) await api('PUT', `${base}/menu-items/${item.id}/topping-groups`, { token, body: { groupIds: ids } });
    summary.dishes += 1;
  }
  console.log(`  ${restaurant.dishes.length} món, ${groupIds.size} nhóm tuỳ chọn`);
}
if (!only) writeFileSync(new URL('./data/new-places.json', import.meta.url), JSON.stringify(places, null, 1));
console.log('\nXong:', summary);
await db.end();
