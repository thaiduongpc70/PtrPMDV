/* Đưa các đơn đặt NGOÀI giờ mở cửa của quán về giờ mở cửa hợp lý (cùng ngày), theo đường cong của loại quán (lib/order-hours.mjs).
   Chỉ đổi thời điểm đặt đơn (orders.ordered_at/created_at); không xoá/sửa tiền/trạng thái. Sau đó chạy:
     node scripts/spread-timeline.mjs --yes     (dựng lại TOÀN BỘ chuỗi mốc theo ordered_at mới: lịch sử trạng thái, thanh toán, giao hàng, GPS, hoa hồng,
                                                 đánh giá, thông báo, nhật ký, mã đơn — mọi sự kiện luôn sau ordered_at và không vượt hiện tại)
     node scripts/simulate-closeout.mjs --regenerate-settlements   (quyết toán/đối soát tính lại theo ngày mới)
   Dùng:  node scripts/retime-out-of-hours-orders.mjs --dry-run   |   node scripts/retime-out-of-hours-orders.mjs */
import { connect } from './lib/db.mjs';
import { inWindow, makeSampler } from './lib/order-hours.mjs';

const DRY = process.argv.includes('--dry-run');
const db = await connect({ dateStrings: true });
const [shops] = await db.query(`SELECT r.id, r.name, TIME_FORMAT(r.opening_time, '%H:%i:%s') AS opening, TIME_FORMAT(r.closing_time, '%H:%i:%s') AS closing, COALESCE(c.name, '') AS category
  FROM restaurants r LEFT JOIN restaurant_categories c ON c.id = r.category_id`);
const samplers = new Map(shops.map(row => [Number(row.id), { row, sampler: makeSampler({ opening: row.opening, closing: row.closing, category: row.category, name: row.name }) }]));
const [orders] = await db.query("SELECT id, restaurant_id, order_status, ordered_at FROM orders WHERE deleted_at IS NULL ORDER BY id");

function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const epochOf = text => { const [d, t] = String(text).split(' '); const [y, m, day] = d.split('-').map(Number); const [h, mi, s] = t.split(':').map(Number); return Date.UTC(y, m - 1, day, h, mi, s) / 1000; };
const fmt = epoch => new Date(epoch * 1000).toISOString().slice(0, 19).replace('T', ' ');
const [[{ nowText }]] = await db.query("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS nowText");
const LAST_START = epochOf(nowText) - 4500; // khớp spread-timeline: đơn cuối bắt đầu cách hiện tại ≥ 75 phút

const plan = [];
const perShop = new Map();
let pushedToPreviousDay = 0;
for (const order of orders) {
  const entry = samplers.get(Number(order.restaurant_id));
  if (!entry) continue;
  const old = epochOf(order.ordered_at);
  const minuteOfDay = Math.floor((old % 86400) / 60);
  if (inWindow(minuteOfDay, entry.row.opening, entry.row.closing)) continue;
  const rnd = mulberry32(Number(order.id) * 2654435761);
  const dayStart = old - (old % 86400);
  let value = null;
  for (let attempt = 0; attempt < 40 && value === null; attempt += 1) {
    const candidate = dayStart + entry.sampler.sample(rnd) * 60 + Math.floor(rnd() * 60);
    if (candidate <= LAST_START) value = candidate;
  }
  if (value === null) { // hôm nay chưa tới giờ mở cửa: dời sang hôm trước
    value = dayStart - 86400 + entry.sampler.sample(rnd) * 60 + Math.floor(rnd() * 60);
    pushedToPreviousDay += 1;
  }
  plan.push({ id: Number(order.id), shop: Number(order.restaurant_id), from: old, to: value });
  perShop.set(entry.row.name, (perShop.get(entry.row.name) ?? 0) + 1);
}
const hist = Array(24).fill(0);
for (const item of plan) hist[Math.floor((item.to % 86400) / 3600)] += 1;
console.log(`Đơn ngoài giờ mở cửa: ${plan.length}/${orders.length} (${(100 * plan.length / orders.length).toFixed(2)}%); dời sang hôm trước vì chưa tới giờ mở cửa: ${pushedToPreviousDay}`);
console.log('Theo quán (nhiều nhất):', [...perShop.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => `${name} ${n}`).join(' | '));
console.log('Phân bố giờ mới (0–23h):', hist.join(','));
console.log('Ví dụ:', plan.slice(0, 3).map(item => `#${item.id}: ${fmt(item.from)} -> ${fmt(item.to)}`).join(' ; '));
if (DRY) { console.log('DRY-RUN: chưa thay đổi gì.'); await db.end(); process.exit(0); }

await db.query('DROP TABLE IF EXISTS tmp_retime');
await db.query('CREATE TABLE tmp_retime (order_id BIGINT UNSIGNED PRIMARY KEY, new_at DATETIME NOT NULL)');
for (let start = 0; start < plan.length; start += 1000) {
  await db.query('INSERT INTO tmp_retime VALUES ?', [plan.slice(start, start + 1000).map(item => [item.id, fmt(item.to)])]);
}
const [result] = await db.query('UPDATE orders o JOIN tmp_retime t ON t.order_id = o.id SET o.ordered_at = t.new_at, o.created_at = t.new_at, o.updated_at = o.updated_at');
await db.query('DROP TABLE tmp_retime');
console.log(`Đã đổi ordered_at cho ${result.affectedRows} đơn. Tiếp theo: node scripts/spread-timeline.mjs --yes ; node scripts/simulate-closeout.mjs --regenerate-settlements`);
await db.end();
