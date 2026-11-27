/* Đợt 6 — gỡ/gán lại ảnh món dùng chung SAI TÊN (đã xem từng ảnh trong thư viện bằng mắt), qua API chủ quán (PATCH menu-items imageUrl).
   Quy tắc: ảnh không thể hiện đúng tên món (chay/mặn, bò/gà, chiên/nướng, thiếu nguyên liệu chính) -> gỡ (NULL) hoặc gán ảnh đúng trong thư viện.
   Dùng:  node scripts/fix-shared-images.mjs --dry-run   |   node scripts/fix-shared-images.mjs  (server đang chạy) */
import { connect } from './lib/db.mjs';
import { api, tokenFor, pool } from './lib/api-client.mjs';

const DRY = process.argv.includes('--dry-run');
const L = file => `/uploads/library/${file}.jpg`;
/** [ảnh hiện tại, tên món (null = mọi món dùng ảnh đó), ảnh thay thế (null = để trống)] */
export const FIXES = [
  ['banh-cuon-1', 'Bánh cuốn chay', null],
  ['bun-dau-1', 'Bún đậu chay', null],
  ['bun-bo-hue-4', 'Bún bò Nam Bộ', null],
  ['bun-cha-1', 'Bún chả cá', null],
  ['bun-dau-2', 'Bún đậu chay', null],
  ['ca-chien-1', 'Chả cá chiên giòn', null],
  ['ca-phe-sua-da-1', 'Cà phê đen đá', 'americano-1'],
  ['ca-phe-sua-da-2', 'Cà phê đen đá', 'americano-1'],
  ['com-rang-2', 'Cơm chiên dương châu chay', 'com-chien-chay-1'],
  ['com-rang-2', 'Cơm chiên nấm', null],
  ['ga-ran-2', null, null],
  ['goi-cuon-1', 'Gỏi cuốn cá hồi (3 cuốn)', null],
  ['goi-cuon-1', 'Gỏi cuốn nem nướng (3 cuốn)', null],
  ['goi-cuon-2', 'Gỏi cuốn heo quay (3 cuốn)', null],
  ['goi-cuon-3', 'Gỏi cuốn bò nướng (3 cuốn)', null],
  ['hu-tieu-2', 'Hủ tiếu Nam Vang khô', null],
  ['kem-1', 'Kem ốc quế', null],
  ['khoai-lang-1', null, null],
  ['lau-thai-1', 'Lẩu nấm chay', null],
  ['lau-thai-3', null, null],
  ['pho-cuon-1', 'Phở cuốn chay', null],
  ['pho-cuon-1', 'Phở cuốn tôm', null],
  ['ramen-2', 'Ramen gà', null],
  ['ramen-2', 'Ramen shoyu', null],
  ['rau-song-2', 'Rau sống bắp chuối', null],
  ['socola-da-xay-1', 'Cookie đá xay', null],
  ['spaghetti-ca-chua-1', 'Mì Ý chay sốt cà', null],
  ['teriyaki-1', 'Cơm bò teriyaki', null],
  ['tra-vai-1', null, null],
  ['trung-chien-2', 'Trứng ốp la', 'trung-chien-1'],
  ['udon-2', null, null],
  ['xoi-1', 'Xôi gấc', 'xoi-3'],
  ['xoi-1', 'Xôi ruốc', null],
  ['xoi-1', 'Xôi thịt kho', null],
  ['xoi-3', 'Xôi lạc', null],
  ['xoi-3', 'Xôi xéo', 'xoi-2'],
  ['xoi-4', 'Xôi thịt kho', null],
  // đợt 19: ảnh có watermark/logo
  ['w18-soda-chanh-day-3', null, 'w19-soda-chanh-day-2'],
  ['w18-udon-bo-2', null, 'w19-udon-bo-1'],
  ['w18-sua-hat-oc-cho-1', null, 'w19-sua-oc-cho-1'],
  ['w18-com-bo-teriyaki-1', null, null], // chưa tìm được ảnh sạch đúng món -> để trống
  ['tra-gao-lut-3', null, 'tra-gao-lut-2'], // ảnh cốc có ớt đỏ, không giống trà
  ['nuoc-sam-bi-dao-3', null, 'nuoc-sam-bi-dao-1'], // ảnh đã bị loại khỏi thư viện
  ['dau-ran-1', null, 'dau-ran-2'], // ảnh đậu hũ trắng chưa rán -> ảnh đậu rán vàng
  ['canh-ga-chien-nm-3', 'Cánh gà chiên nước mắm', 'canh-ga-chien-nm-1'] // ảnh cánh gà rõ hơn cho combo cánh gà
];

/** Món đang trống ảnh nhưng thư viện đã có ảnh ĐÚNG (đã xem bằng mắt): [tên món, ảnh] — chỉ gán khi image_url đang NULL. */
/** Theo mẫu tên: [regex, khoá thư viện, số ảnh] — ảnh = khoá-(id % số ảnh + 1); chỉ gán khi image_url đang NULL. */
export const PATTERN_ADDS = [
  [/^đậu hũ chiên/i, 'dau-hu-chien', 3], [/^(đậu rán|đậu hũ rán)/i, 'dau-ran', 1, 2], [/^cà phê cold brew$/i, 'cold-brew', 1, 2], [/^cơm chay thập cẩm/i, 'com-chay', 1, 1], [/^xoài lắc/i, 'xoai-lac', 2]
];

export const ADDS = [
  ['Mẹt bún đậu cơ bản', 'bun-dau-1'], ['Mẹt bún đậu đầy đủ', 'bun-dau-3'], ['Mẹt bún đậu thịt chân giò', 'bun-dau-3'],
  ['Chả cá thì là', 'cha-ca-la-vong-3'], ['Chả cá thập cẩm', 'cha-ca-la-vong-2'],
  ['Gà popcorn', 'ga-vien-2'], ['Gà rán 1 miếng', 'ga-ran-1'], ['Đùi gà góc tư chiên', 'ga-ran-1']
];

if (process.argv[1].endsWith('fix-shared-images.mjs')) {
  const db = await connect();
  const [dishes] = await db.query(`SELECT mi.id, mi.restaurant_id, mi.name, mi.image_url, u.username FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id JOIN users u ON u.id = r.owner_user_id WHERE mi.deleted_at IS NULL AND mi.image_url LIKE '/uploads/library/%'`);
  const plan = [];
  for (const dish of dishes) {
    const fix = FIXES.find(([file, name]) => dish.image_url === L(file) && (name === null || name === dish.name));
    if (fix) plan.push({ ...dish, to: fix[2] ? L(fix[2]) : null });
  }
  const [nullDishes] = await db.query("SELECT mi.id, mi.restaurant_id, mi.name, mi.image_url, u.username FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id JOIN users u ON u.id = r.owner_user_id WHERE mi.deleted_at IS NULL AND mi.image_url IS NULL");
  const planned = new Set(plan.map(p => p.id));
  for (const dish of [...nullDishes, ...plan.filter(p => !p.to)]) { const pattern = PATTERN_ADDS.find(([regex]) => regex.test(dish.name)); const add = ADDS.find(([name]) => name === dish.name) ?? (pattern && [dish.name, pattern[3] ? `${pattern[1]}-${pattern[3]}` : `${pattern[1]}-${Number(dish.id) % pattern[2] + 1}`]); if (add) { const hit = plan.find(p => p.id === dish.id); if (hit) hit.to = L(add[1]); else plan.push({ ...dish, to: L(add[1]) }); } }
  console.log(`Sẽ đổi ${plan.length} món: gỡ ảnh ${plan.filter(p => !p.to).length}, gán ảnh đúng ${plan.filter(p => p.to).length}`);
  if (DRY) { console.log(plan.slice(0, 12).map(p => `#${p.id} ${p.name}: ${(p.image_url ?? "NULL").split('/').pop()} -> ${p.to ? p.to.split('/').pop() : 'NULL'}`).join('\n')); console.log('DRY-RUN: chưa thay đổi gì.'); await db.end(); process.exit(0); }
  await pool(plan, 6, async item => { await api('PATCH', `/api/restaurant/restaurants/${item.restaurant_id}/menu-items/${item.id}`, { token: await tokenFor(item.username), body: { imageUrl: item.to } }); });
  console.log('Xong.');
  await db.end();
}
