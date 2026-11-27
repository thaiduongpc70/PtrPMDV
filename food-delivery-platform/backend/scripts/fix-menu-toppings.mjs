/*
 * Sửa topping/tuỳ chọn cho ĐÚNG TỪNG MÓN (qua API chủ quán):
 *   - topping thêm (có giá) KHÔNG giới hạn số lượng chọn (maxSelect = số topping của nhóm), chỉ đúng loại món:
 *     trà sữa → trân châu/thạch/kem cheese…, cà phê → shot espresso/sữa đặc/kem muối, nước ép → hạt chia…, pizza → phô mai/nấm…
 *   - "Mức đường" chỉ cho đồ uống, "Mức đá" chỉ cho đồ uống lạnh; "Độ cay" chỉ món mặn hợp lý; "Loại đế" chỉ pizza
 *   - đơn cũ: dòng topping không còn hợp với món được chuyển sang topping hợp lệ cùng món (giữ nguyên số tiền đã tính)
 * Chạy khi server đang chạy:  API_BASE_URL=http://localhost:3001 node scripts/fix-menu-toppings.mjs [--dry-run]
 */
import { connect } from './lib/db.mjs';
import { api, tokenFor } from './lib/api-client.mjs';

const DRY = process.argv.includes('--dry-run');

/* ===== Nhóm topping thêm (không giới hạn số lần chọn) ===== */
const ADDONS = {
  tea_milk: ['Topping trà sữa', [['Trân châu đen', 7000], ['Trân châu trắng', 7000], ['Thạch trái cây', 8000], ['Pudding trứng', 9000], ['Kem cheese', 10000], ['Sương sáo', 7000], ['Thạch dừa', 7000]]],
  tea_fruit: ['Topping trà trái cây', [['Thạch trái cây', 8000], ['Trân châu trắng', 7000], ['Hạt chia', 5000], ['Thạch dừa', 7000], ['Kem cheese', 10000]]],
  ice_blend: ['Topping đá xay', [['Kem whipping', 8000], ['Sốt caramel', 5000], ['Sốt socola', 5000], ['Trân châu đen', 7000], ['Bánh cookie vụn', 8000]]],
  yogurt: ['Topping sữa chua', [['Thạch trái cây', 8000], ['Trân châu trắng', 7000], ['Hạt chia', 5000]]],
  coffee: ['Thêm vào ly cà phê', [['Thêm shot espresso', 10000], ['Thêm sữa đặc', 5000], ['Thêm kem muối', 9000], ['Kem whipping', 8000], ['Sốt caramel', 5000]]],
  cacao: ['Thêm vào ly cacao', [['Kem whipping', 8000], ['Sốt caramel', 5000], ['Trân châu đen', 7000], ['Thêm sữa đặc', 5000]]],
  juice: ['Thêm vào nước ép', [['Hạt chia', 5000], ['Thạch dừa', 7000], ['Thạch trái cây', 8000]]],
  smoothie: ['Thêm vào sinh tố', [['Sữa chua', 8000], ['Hạt chia', 5000], ['Yến mạch', 7000], ['Trân châu trắng', 7000]]],
  croissant: ['Ăn kèm bánh', [['Bơ lạt', 5000], ['Mứt dâu', 5000], ['Phô mai kem', 9000]]],
  sweet: ['Thêm vào bánh', [['Kem tươi', 8000], ['Sốt caramel', 5000], ['Kem vani', 10000]]],
  rice_side: ['Ăn kèm', [['Thêm trứng ốp la', 7000], ['Thêm chả trứng', 10000], ['Thêm đồ chua', 4000], ['Thêm canh', 8000]]],
  noodle_bowl: ['Thêm vào tô', [['Thêm thịt', 15000], ['Thêm trứng cút', 6000], ['Thêm rau sống', 3000], ['Thêm quẩy', 5000]]],
  hue_extra: ['Thêm vào tô bún', [['Thêm thịt bò', 15000], ['Thêm giò heo', 20000], ['Thêm chả cua', 12000], ['Thêm huyết', 8000], ['Thêm rau sống bắp chuối', 3000]]],
  chicken_extra: ['Thêm vào phần gà', [['Thêm sốt chấm', 4000], ['Thêm khoai chiên', 18000], ['Thêm sốt phô mai', 9000]]],
  burger_extra: ['Thêm vào burger', [['Thêm phô mai lát', 9000], ['Thêm bacon', 14000], ['Thêm trứng ốp la', 7000], ['Thêm sốt', 4000]]],
  side_sauce: ['Chấm kèm', [['Sốt phô mai', 6000], ['Sốt tương cà', 3000], ['Sốt mayonnaise', 3000]]],
  pizza_top: ['Thêm topping pizza', [['Thêm phô mai', 15000], ['Thêm nấm', 12000], ['Thêm xúc xích', 15000], ['Thêm ô liu', 10000], ['Thêm thịt xông khói', 18000]]],
  pasta_top: ['Thêm vào mì', [['Thêm phô mai parmesan', 10000], ['Thêm nấm', 12000], ['Thêm thịt viên', 18000]]],
  salad_top: ['Thêm vào salad', [['Thêm gà nướng', 18000], ['Thêm trứng luộc', 6000], ['Thêm phô mai', 10000]]],
  veg_extra: ['Thêm món', [['Thêm đậu hũ', 8000], ['Thêm nấm', 10000], ['Thêm rau củ', 7000], ['Thêm cơm', 5000]]],
  banhmi_extra: ['Thêm vào bánh mì', [['Thêm pate', 5000], ['Thêm trứng ốp la', 7000], ['Thêm chả lụa', 8000], ['Thêm thịt nướng', 12000]]],
  dip: ['Thêm nước chấm', [['Thêm tương đậu phộng', 3000], ['Thêm nước mắm chua ngọt', 3000], ['Thêm rau sống', 4000]]],
  snack_sauce: ['Thêm sốt', [['Sốt phô mai', 6000], ['Sốt me', 4000], ['Sa tế', 3000]]],
  tranh_tron: ['Thêm vào bánh tráng', [['Thêm trứng cút', 6000], ['Thêm khô bò', 12000], ['Thêm xoài', 5000]]],
  tokbokki: ['Thêm vào tokbokki', [['Thêm phô mai', 8000], ['Thêm chả cá', 6000], ['Thêm trứng', 5000]]],
  che_extra: ['Thêm vào chè', [['Thêm thạch', 5000], ['Thêm nước cốt dừa', 5000], ['Thêm trân châu', 7000]]],
  lau_extra: ['Thêm vào lẩu', [['Thêm bò viên', 8000], ['Thêm tôm viên', 10000], ['Thêm nấm', 8000], ['Thêm rau', 5000], ['Thêm mì', 5000]]],
  bun_bac: ['Thêm vào phần ăn', [['Thêm chả', 10000], ['Thêm đậu rán', 8000], ['Thêm bún', 5000], ['Thêm rau sống', 3000]]],
  xoi_extra: ['Thêm vào xôi', [['Thêm chà bông', 8000], ['Thêm trứng cút', 6000], ['Thêm chả', 8000]]],
  side_extra: ['Thêm ăn kèm', [['Thêm nước chấm', 3000], ['Thêm ớt tươi', 2000], ['Thêm cơm trắng', 5000], ['Thêm đồ chua', 4000]]],
  glass_extra: ['Thêm vào ly', [['Thêm chanh tươi', 3000], ['Thêm sả tắc', 3000], ['Thêm mật ong', 5000]]],
  chao_extra: ['Thêm vào cháo', [['Thêm thịt bằm', 10000], ['Thêm trứng muối', 7000], ['Thêm quẩy', 5000], ['Thêm hành phi', 3000]]]
};
/* Nhóm chọn đúng 1 hoặc tuỳ chọn 1 (đã có sẵn theo tên trong từng quán) */
const SINGLE = { sugar: 'Mức đường', ice: 'Mức đá', spicy: 'Độ cay', crust: 'Loại đế', drinkpick: 'Chọn nước uống' };

/* Nhóm topping chính của từng quán — gắn cho combo của quán đó (áp cho cả combo) */
const PRIMARY = { 22: 'rice_side', 23: 'noodle_bowl', 24: 'rice_side', 25: 'chicken_extra', 26: 'pizza_top', 27: 'tea_milk', 28: 'hue_extra', 29: 'veg_extra', 30: 'burger_extra', 31: 'snack_sauce', 32: 'coffee', 33: 'banhmi_extra', 34: 'noodle_bowl', 35: 'rice_side', 36: 'pasta_top', 37: 'dip', 38: 'lau_extra', 39: 'juice', 40: 'bun_bac', 41: 'chao_extra' };
const SIMPLE_DRINK = /^(trà đá|trà gừng|trà hoa|trà gạo|nước sâm|nước vối|sữa đậu nành|nước mía|pepsi|coca|nước ngọt|soda|nước suối|sữa hạt|trà chanh|trà tắc|trà sen)/;

const rx = text => new RegExp(text, 'i');
const HOT_DRINK = rx('nóng|latte|cappuccino|americano|trà gừng|sữa đậu nành nóng');
const NOT_SPICY = rx('chè|trà|nước|sữa|cà phê|sinh tố|kem|flan|đá xay|quẩy|trứng gà chần|^thêm|đồ chua|dưa|rau sống|tiramisu|cookie|croissant|panna|pepsi|coca');
const SPICY_OK = rx('cơm|phở|bún|mì|hủ tiếu|miến|cháo|lẩu|gà rán|gà sốt|bánh tráng trộn|xiên|tokbokki|ốc|gỏi|cá chiên|mực|nem chua|bánh mì|cánh gà|đùi gà|thịt rim');

/** Trả về { addons: [key], single: [key] } cho một món. */
function plan(restaurantId, dish) {
  const name = dish.name.toLowerCase();
  const addons = []; const single = [];
  const isCombo = dish.item_type === 'COMBO';
  const spicy = () => { if (SPICY_OK.test(name) && !NOT_SPICY.test(name)) single.push('spicy'); };
  const drink = (add) => { if (add) addons.push(add); single.push('sugar'); if (!HOT_DRINK.test(name)) single.push('ice'); };

  if (isCombo) { if (PRIMARY[restaurantId]) addons.push(PRIMARY[restaurantId]); return { addons, single }; } // sugar/ice/cay của combo: enrich-combo-options.mjs
  switch (restaurantId) {
    case 22: case 24: case 35:
      if (/^cơm/.test(name)) { addons.push('rice_side'); spicy(); }
      else if (/^(mì quảng|cao lầu|cháo)/.test(name)) { addons.push('noodle_bowl'); spicy(); }
      else if (/cá chiên|mực xào/.test(name)) spicy();
      else if (/^bánh mì/.test(name)) { addons.push('banhmi_extra'); spicy(); }
      else if (/bánh xèo|bánh bao|bánh vạc/.test(name)) addons.push('dip');
      break;
    case 23: case 34:
      if (/^(phở|hủ tiếu|mì|bún|miến|bánh canh)/.test(name) && !/cuốn|trộn/.test(name)) { addons.push('noodle_bowl'); spicy(); }
      break;
    case 25:
      if (/^(gà rán|đùi gà|phi lê|cánh gà|gà (viên|sốt|nướng))/.test(name)) { addons.push('chicken_extra'); spicy(); }
      else if (/^khoai|^bánh mì bơ tỏi/.test(name)) addons.push('side_sauce');
      break;
    case 26:
      if (/^pizza/.test(name)) { addons.push('pizza_top'); single.push('crust'); }
      else if (/^(mì ý|lasagna)/.test(name)) addons.push('pasta_top');
      else if (/salad/.test(name)) addons.push('salad_top');
      break;
    case 27:
      if (/trà sữa|sữa tươi trân châu/.test(name)) drink('tea_milk');
      else if (/đá xay/.test(name)) drink('ice_blend');
      else if (/sữa chua/.test(name)) drink('yogurt');
      else if (/latte/.test(name)) drink('coffee');
      else drink('tea_fruit');
      break;
    case 28:
      if (/^(bún|mì)/.test(name)) { addons.push('hue_extra'); spicy(); }
      break;
    case 29:
      if (!/cuốn|chả giò|^trà|canh|súp|gỏi|nước|sữa/.test(name)) addons.push('veg_extra');
      break;
    case 30:
      if (/^(burger|hotdog|sandwich)/.test(name)) addons.push('burger_extra');
      else if (/^(khoai|hành tây|phô mai que|gà viên)/.test(name)) addons.push('side_sauce');
      break;
    case 31:
      if (/^bánh tráng trộn/.test(name)) { addons.push('tranh_tron'); spicy(); }
      else if (/^tokbokki/.test(name)) { addons.push('tokbokki'); spicy(); }
      else if (/^chè|rau câu/.test(name)) addons.push('che_extra');
      else if (/cá viên|nem chua|xiên|khoai lang|hoành thánh chiên|bánh bao chiên|bắp xào|ốc|há cảo|^gỏi/.test(name)) { addons.push('snack_sauce'); spicy(); }
      break;
    case 32:
      if (/cà phê|bạc xỉu|americano|latte|cappuccino|cold brew/.test(name)) drink('coffee');
      else if (/cacao/.test(name)) drink('cacao');
      else if (/nước ép/.test(name)) drink('juice');
      else if (/sinh tố/.test(name)) drink('smoothie');
      else if (/^trà/.test(name)) drink('tea_fruit');
      else if (/croissant/.test(name)) addons.push('croissant');
      else if (/tiramisu|flan|cookie/.test(name)) addons.push('sweet');
      break;
    case 33:
      if (/^bánh mì/.test(name)) { addons.push('banhmi_extra'); spicy(); }
      else if (/gỏi cuốn|nem nướng|chả giò|bì cuốn|bánh xèo|bò nướng/.test(name)) addons.push('dip');
      break;
    case 36:
      if (/^(spaghetti|penne|fettuccine|linguine|mì ý)/.test(name)) addons.push('pasta_top');
      else if (/salad/.test(name)) addons.push('salad_top');
      else if (/tiramisu|panna cotta/.test(name)) addons.push('sweet');
      break;
    case 37:
      if (/cuốn|chả giò|nem rán|bánh xèo|bánh cuốn|tôm chiên/.test(name)) addons.push('dip');
      else if (/^gỏi/.test(name)) { addons.push('dip'); spicy(); }
      break;
    case 38:
      if (/^lẩu/.test(name)) { addons.push('lau_extra'); spicy(); }
      else if (/xiên|cánh gà|bạch tuộc|tôm nướng|trứng cút|nem chua|khoai|phô mai que/.test(name)) { addons.push('snack_sauce'); spicy(); }
      break;
    case 39:
      if (/^nước (ép|detox)/.test(name)) drink('juice');
      else if (/^sinh tố/.test(name)) drink('smoothie');
      else drink('glass_extra');
      break;
    case 40:
      if (/^bún (đậu|chả)/.test(name)) addons.push('bun_bac');
      else if (/^(bún|miến)/.test(name)) { addons.push('noodle_bowl'); spicy(); }
      else if (/^xôi/.test(name)) addons.push('xoi_extra');
      break;
    case 41:
      if (/^cháo/.test(name)) addons.push('chao_extra');
      else if (/^gỏi/.test(name)) spicy();
      break;
    default: break;
  }
  // đồ uống đơn giản trong quán không chuyên đồ uống: chỉ thêm chanh/sả/mật ong
  if (!addons.length && ![27, 32, 39].includes(restaurantId)) {
    if (/cà phê|bạc xỉu/.test(name)) { addons.push('coffee'); single.push('sugar'); }
    else if (/^(chè|rau câu|kem|sữa chua|bánh flan|panna)/.test(name)) addons.push(/bánh flan|panna|kem/.test(name) ? 'sweet' : 'che_extra');
    else if (SIMPLE_DRINK.test(name) || /^(trà|nước|sữa|bia|soda)/.test(name)) addons.push('glass_extra');
    else addons.push('side_extra'); // món ăn kèm/canh/súp… chỉ có tuỳ chọn ăn kèm nhẹ
  }
  return { addons, single };
}

const db = await connect();
const q = async (sql, params) => (await db.query(sql, params))[0];
const restaurants = await q(`SELECT r.id, r.name, u.username FROM restaurants r JOIN users u ON u.id = r.owner_user_id WHERE r.deleted_at IS NULL ORDER BY r.id`);
const dishes = await q(`SELECT mi.id, mi.restaurant_id, mi.name, mi.item_type FROM menu_items mi WHERE mi.deleted_at IS NULL ORDER BY mi.id`);
const groupsDb = await q(`SELECT id, restaurant_id, name FROM topping_groups`);
const toppingsDb = await q(`SELECT id, group_id, name, price FROM toppings`);
const linksDb = await q(`SELECT menu_item_id, topping_group_id FROM menu_item_topping_groups`);
const oldGroupIds = new Set(groupsDb.map(group => Number(group.id)));

const keepNames = new Set(Object.values(SINGLE));
const summary = { createdGroups: 0, createdToppings: 0, linked: 0 };
const desired = new Map(); // dishId -> Set(groupId)
const addonGroupIds = new Set(); // nhóm topping thêm đang dùng (mới hoặc tái sử dụng)

for (const restaurant of restaurants) {
  const base = `/api/restaurant/restaurants/${restaurant.id}`;
  const token = DRY ? null : await tokenFor(restaurant.username);
  const myDishes = dishes.filter(dish => dish.restaurant_id === restaurant.id);
  const groupId = new Map(groupsDb.filter(group => group.restaurant_id === restaurant.id).map(group => [group.name, Number(group.id)]));
  const needed = new Set();
  const plans = new Map();
  for (const dish of myDishes) { const p = plan(restaurant.id, dish); plans.set(dish.id, p); p.addons.forEach(key => needed.add(key)); }

  for (const key of needed) {
    const [name, options] = ADDONS[key];
    const existing = groupId.get(name);
    const existingOptions = existing ? toppingsDb.filter(t => Number(t.group_id) === existing).map(t => `${t.name}:${Number(t.price)}`).sort().join('|') : null;
    const wanted = options.map(([n, p]) => `${n}:${p}`).sort().join('|');
    if (existing && existingOptions === wanted) { addonGroupIds.add(existing); continue; } // đã đúng — dùng lại
    if (DRY) { groupId.set(name, -1); summary.createdGroups += 1; continue; }
    // trùng tên nhưng khác lựa chọn: đặt tên tạm để tạo nhóm mới, nhóm cũ sẽ bị xoá ở cuối
    const createName = existing ? `${name} ` : name;
    const group = await api('POST', `${base}/topping-groups`, { token, body: { name: createName, minSelect: 0, maxSelect: options.length, required: false } });
    for (const [optionName, price] of options) { await api('POST', `${base}/topping-groups/${group.id}/toppings`, { token, body: { name: optionName, price } }); summary.createdToppings += 1; }
    groupId.set(name, Number(group.id));
    addonGroupIds.add(Number(group.id));
    summary.createdGroups += 1;
  }

  // gắn nhóm cho từng món (thay toàn bộ liên kết)
  for (const dish of myDishes) {
    const { addons, single } = plans.get(dish.id);
    const ids = new Set();
    for (const key of addons) ids.add(groupId.get(ADDONS[key][0]));
    for (const key of single) { const id = groupId.get(SINGLE[key]); if (id) ids.add(id); }
    // món combo giữ nhóm hiện có (sẽ chạy lại enrich-combo-options.mjs), "Chọn nước uống" của món giữ nguyên
    if (dish.item_type === 'COMBO') for (const link of linksDb) { const old = groupsDb.find(group => Number(group.id) === Number(link.topping_group_id)); if (Number(link.menu_item_id) === Number(dish.id) && old && keepNames.has(old.name)) ids.add(Number(link.topping_group_id)); }
    const keepDrinkPick = linksDb.some(link => Number(link.menu_item_id) === Number(dish.id) && Number(link.topping_group_id) === groupId.get(SINGLE.drinkpick));
    if (keepDrinkPick && groupId.get(SINGLE.drinkpick)) ids.add(groupId.get(SINGLE.drinkpick));
    desired.set(dish.id, ids);
    const current = new Set(linksDb.filter(link => Number(link.menu_item_id) === Number(dish.id)).map(link => Number(link.topping_group_id)));
    const same = current.size === ids.size && [...ids].every(id => current.has(id));
    if (same) continue;
    summary.linked += 1;
    if (!DRY) await api('PUT', `${base}/menu-items/${dish.id}/topping-groups`, { token, body: { groupIds: [...ids] } });
  }
  console.log(`${restaurant.name}: ${needed.size} nhóm topping thêm, ${myDishes.filter(dish => (plans.get(dish.id).addons.length + plans.get(dish.id).single.length) > 0).length}/${myDishes.length} món có tuỳ chọn`);
}
console.log(DRY ? '[dry-run]' : '', summary);
if (DRY) { await db.end(); process.exit(0); }

/* ===== Đơn cũ: chuyển dòng topping không hợp với món sang topping hợp lệ cùng món (giữ nguyên số tiền) ===== */
const toppings = await q(`SELECT t.id, t.group_id, t.name, t.price, tg.name AS group_name FROM toppings t JOIN topping_groups tg ON tg.id = t.group_id`);
const links = await q(`SELECT menu_item_id, topping_group_id FROM menu_item_topping_groups`);
const byGroup = new Map(); for (const topping of toppings) { if (!byGroup.has(Number(topping.group_id))) byGroup.set(Number(topping.group_id), []); byGroup.get(Number(topping.group_id)).push(topping); }
const dishGroups = new Map(); for (const link of links) { const set = dishGroups.get(Number(link.menu_item_id)) ?? new Set(); set.add(Number(link.topping_group_id)); dishGroups.set(Number(link.menu_item_id), set); }
const toppingById = new Map(toppings.map(topping => [Number(topping.id), topping]));
const rows = await q(`SELECT oit.id, oit.order_item_id, oit.topping_id, oit.topping_name, oit.price, oi.menu_item_id FROM order_item_toppings oit JOIN order_items oi ON oi.id = oit.order_item_id WHERE oi.menu_item_id IS NOT NULL ORDER BY oit.order_item_id, oit.id`);
const singleNames = new Set(Object.values(SINGLE));
let kept = 0; let moved = 0; let removed = 0; let stuck = 0;
const usedByOrderItem = new Map();
for (const row of rows) {
  const valid = dishGroups.get(Number(row.menu_item_id)) ?? new Set();
  const current = row.topping_id ? toppingById.get(Number(row.topping_id)) : null;
  const used = usedByOrderItem.get(row.order_item_id) ?? new Set(); usedByOrderItem.set(row.order_item_id, used);
  if (current && valid.has(Number(current.group_id)) && !used.has(Number(current.id))) { used.add(Number(current.id)); kept += 1; continue; }
  const oldName = current?.group_name ?? '';
  if (Number(row.price) === 0 && (singleNames.has(oldName) || /đường|đá|cay|đế/i.test(row.topping_name))) { await db.query('DELETE FROM order_item_toppings WHERE id = ?', [row.id]); removed += 1; continue; }
  const candidates = [...valid].filter(id => addonGroupIds.has(id)).flatMap(id => byGroup.get(id) ?? []).filter(topping => !used.has(Number(topping.id)));
  if (!candidates.length) { stuck += 1; continue; }
  const sameName = candidates.find(topping => topping.name === row.topping_name);
  const target = sameName ?? candidates.reduce((best, topping) => (Math.abs(Number(topping.price) - Number(row.price)) < Math.abs(Number(best.price) - Number(row.price)) ? topping : best));
  used.add(Number(target.id));
  await db.query('UPDATE order_item_toppings SET topping_id = ?, topping_name = ? WHERE id = ?', [target.id, target.name, row.id]);
  moved += 1;
}
console.log(`Đơn cũ: giữ ${kept}, chuyển sang topping đúng món ${moved}, bỏ dòng tuỳ chọn không còn áp dụng ${removed}, chưa xử lý ${stuck}`);

/* ===== Xoá nhóm cũ không còn gắn món nào (qua API) ===== */
const stillLinked = new Set((await q(`SELECT DISTINCT topping_group_id AS id FROM menu_item_topping_groups`)).map(row => Number(row.id)));
const finalGroups = await q(`SELECT tg.id, tg.restaurant_id, tg.name FROM topping_groups tg`);
let deleted = 0;
for (const group of finalGroups) {
  if (stillLinked.has(Number(group.id)) || !oldGroupIds.has(Number(group.id))) continue;
  const owner = restaurants.find(restaurant => restaurant.id === group.restaurant_id);
  await api('DELETE', `/api/restaurant/restaurants/${group.restaurant_id}/topping-groups/${group.id}`, { token: await tokenFor(owner.username) });
  deleted += 1;
}
// đặt lại tên nhóm mới bị thêm khoảng trắng khi trùng tên tạm thời
await db.query(`UPDATE topping_groups SET name = TRIM(name), updated_at = updated_at WHERE name <> TRIM(name)`);
console.log(`Đã xoá ${deleted} nhóm topping cũ không còn dùng.`);
await db.end();
