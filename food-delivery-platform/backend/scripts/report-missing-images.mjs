/* Sinh docs/dev/missing-images.md từ DB: món chưa có ảnh (theo quán, tên món, danh mục) để chủ hệ thống biết cần chụp gì,
   và danh sách ảnh dùng chung CÓ CHỦ ĐÍCH (cùng loại món) để không bị tính là lỗi.   Dùng: node scripts/report-missing-images.mjs */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { connect } from './lib/db.mjs';

const db = await connect();
const q = async sql => (await db.query(sql))[0];
const missing = await q(`SELECT r.id rid, r.name shop, r.city, mc.name category, mi.name dish, mi.item_type
  FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id LEFT JOIN menu_categories mc ON mc.id = mi.category_id
  WHERE mi.deleted_at IS NULL AND r.deleted_at IS NULL AND mi.image_url IS NULL ORDER BY r.name, mc.name, mi.name`);
const total = (await q('SELECT COUNT(*) n FROM menu_items WHERE deleted_at IS NULL'))[0].n;
const shared = await q(`SELECT image_url, COUNT(DISTINCT restaurant_id) shops, COUNT(*) items, GROUP_CONCAT(DISTINCT name ORDER BY name SEPARATOR ' | ') names
  FROM menu_items WHERE deleted_at IS NULL AND image_url LIKE '/uploads/library/%' AND image_url NOT LIKE '%/combo-%' GROUP BY image_url HAVING COUNT(DISTINCT name) > 1 OR COUNT(DISTINCT restaurant_id) > 1 ORDER BY items DESC, image_url`);
const byShop = new Map();
for (const row of missing) { const list = byShop.get(row.shop) ?? []; list.push(row); byShop.set(row.shop, list); }
const ranking = [...byShop.entries()].sort((a, b) => b[1].length - a[1].length);
const lines = [];
lines.push('# Món chưa có ảnh đúng tên (sinh từ DB — đừng sửa tay)', '',
  `Sinh bởi \`node scripts/report-missing-images.mjs\`. Tổng: **${missing.length}/${total}** món chưa có ảnh (${(100 * missing.length / total).toFixed(1)}%). Món để trống vì chưa có ảnh ĐÚNG tên (thà trống còn hơn ảnh gần giống).`,
  'Cần chụp/cấp phép ảnh thật cho các món dưới đây (ưu tiên quán đầu bảng).', '');
lines.push('## Quán thiếu nhiều nhất', '', '| Quán | Số món thiếu |', '|---|---|', ...ranking.slice(0, 10).map(([shop, list]) => `| ${shop} | ${list.length} |`), '');
lines.push('## Chi tiết theo quán', '');
for (const [shop, list] of ranking) {
  lines.push(`### ${shop} (${list.length})`, '', '| Danh mục | Món |', '|---|---|', ...list.map(row => `| ${row.category ?? '—'} | ${row.dish}${row.item_type === 'COMBO' ? ' (combo)' : ''} |`), '');
}
lines.push('## Ảnh dùng chung CÓ CHỦ ĐÍCH (không phải lỗi)', '',
  'Quy tắc: một ảnh được dùng chung chỉ khi các món thật sự CÙNG LOẠI (vd cùng là đậu rán, cháo, gà rán, cơm tấm…). Không dùng chung giữa chay/mặn, bò/gà, nước/khô, chiên/nướng. Ảnh ghép combo (`combo-*.jpg`) không tính.', '',
  `Hiện có ${shared.length} ảnh dùng chung (cùng tên ở nhiều quán hoặc các biến thể cùng loại):`, '',
  '| Ảnh | Số quán | Số món | Các món |', '|---|---|---|---|', ...shared.map(row => `| ${row.image_url.replace('/uploads/library/', '')} | ${row.shops} | ${row.items} | ${String(row.names).slice(0, 220)} |`), '');
writeFileSync(resolve('..', '..', 'docs', 'dev', 'missing-images.md'), lines.join('\n'));
console.log(`Thiếu ${missing.length}/${total}; ${byShop.size} quán; ${shared.length} ảnh dùng chung. Top: ${ranking.slice(0, 6).map(([s, l]) => `${s} ${l.length}`).join(' | ')}`);
await db.end();
