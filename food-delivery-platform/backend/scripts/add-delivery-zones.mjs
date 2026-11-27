/* Thêm vùng giao hàng Hà Nội (tên địa danh thật) qua API admin THẬT (POST /api/admin/manage/zones). Phí cơ bản, giá/km và bán kính tối đa
   lấy từ cấu hình hệ thống (system_settings: delivery_base_fee, delivery_price_per_km, max_delivery_distance — hiện 15.000đ / 5.000đ / 15 km).
   Idempotent: vùng đã có (cùng tên) thì bỏ qua.   Dùng:  node scripts/add-delivery-zones.mjs [--dry-run] */
import { api, tokenFor } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const DRY = process.argv.includes('--dry-run');
const db = await connect();
const [settings] = await db.query("SELECT setting_key k, setting_value v FROM system_settings WHERE setting_key IN ('delivery_base_fee', 'delivery_price_per_km', 'max_delivery_distance')");
const cfg = Object.fromEntries(settings.map(row => [row.k, Number(row.v)]));
const [wards] = await db.query("SELECT DISTINCT district FROM restaurants WHERE city = 'Hà Nội' AND deleted_at IS NULL ORDER BY district");
await db.end();
const base = { baseFee: cfg.delivery_base_fee ?? 15000, pricePerKm: cfg.delivery_price_per_km ?? 5000, minimumFee: cfg.delivery_base_fee ?? 15000, maximumDistance: cfg.max_delivery_distance ?? 15 };
const wanted = [
  { name: 'Hà Nội — toàn thành phố', city: 'Hà Nội', district: null },
  { name: 'Hà Nội — khu vực Hồ Tây, Ba Đình, Long Biên', city: 'Hà Nội', district: 'Phường Tây Hồ' },
  { name: 'Hà Nội — khu vực Cầu Giấy, Từ Liêm, Nghĩa Đô', city: 'Hà Nội', district: 'Phường Nghĩa Đô' },
  { name: 'Hà Nội — khu vực Hà Đông', city: 'Hà Nội', district: 'Phường Hà Đông' }
].filter(zone => zone.district === null || wards.some(row => row.district === zone.district));
const token = await tokenFor('thaiduongpc7');
const existing = (await api('GET', '/api/admin/manage/zones', { token })).items;
for (const zone of wanted) {
  if (existing.some(item => item.name === zone.name)) { console.log(`Đã có: ${zone.name}`); continue; }
  if (DRY) { console.log(`Sẽ thêm: ${zone.name}`, JSON.stringify(base)); continue; }
  const created = await api('POST', '/api/admin/manage/zones', { token, body: { ...zone, ...base } });
  console.log(`Đã thêm vùng #${created.id}: ${zone.name} (${base.maximumDistance} km, ${base.baseFee}đ + ${base.pricePerKm}đ/km)`);
}
const after = (await api('GET', '/api/admin/manage/zones', { token })).items;
console.log(`Tổng số vùng giao: ${after.length}:`, after.map(item => `${item.name} [${item.city}${item.district ? '/' + item.district : ''}] ${item.maximumDistance} km`).join(' | '));
