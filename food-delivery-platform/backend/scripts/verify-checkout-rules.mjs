/* Kiểm chứng bằng API THẬT (khách minh.anh) các luật đặt hàng; không để lại đơn/giỏ rác:
   (1) thiếu trường -> 400; (2) paymentMethod='BITCOIN' -> 400; (3) địa chỉ cách quán > 15 km -> 400 tiếng Việt, không tạo đơn.
   Tạo 1 địa chỉ tạm + 1 món trong giỏ, sau đó xoá cả hai; so sánh COUNT(orders) trước/sau.  Dùng: node scripts/verify-checkout-rules.mjs */
import 'dotenv/config';
import { api, tokenFor, ApiError } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const db = await connect();
const count = async () => (await db.query('SELECT COUNT(*) n FROM orders'))[0][0].n;
const before = await count();
const token = await tokenFor('minh.anh');
const results = [];
const expectFail = async (label, body) => {
  try { await api('POST', '/api/customer/orders/checkout', { token, body }); results.push({ label, status: 'KHÔNG BỊ TỪ CHỐI', message: '' }); }
  catch (error) { results.push({ label, status: error.status, message: String(error.body?.message ?? error.body?.error ?? JSON.stringify(error.body)).slice(0, 160) }); }
};

const [[shop]] = await db.query(`SELECT r.id restaurant_id, r.latitude lat, mi.id item_id FROM restaurants r JOIN menu_items mi ON mi.restaurant_id = r.id
  WHERE r.deleted_at IS NULL AND r.latitude IS NOT NULL AND mi.deleted_at IS NULL AND mi.is_available = 1 AND mi.item_type = 'DISH'
    AND NOT EXISTS (SELECT 1 FROM menu_item_variants v WHERE v.menu_item_id = mi.id)
    AND r.opening_time <= CURTIME() AND (r.closing_time > CURTIME() OR r.closing_time <= r.opening_time) ORDER BY r.id LIMIT 1`);
const [[beerShop]] = await db.query(`SELECT r.id restaurant_id, mi.id item_id FROM restaurants r JOIN menu_items mi ON mi.restaurant_id = r.id WHERE r.deleted_at IS NULL AND mi.deleted_at IS NULL AND mi.is_available = 1 AND mi.name LIKE 'Bia %'
    AND r.opening_time <= CURTIME() AND (r.closing_time > CURTIME() OR r.closing_time <= r.opening_time) ORDER BY r.id LIMIT 1`);
const [[comboShop]] = await db.query(`SELECT r.id restaurant_id, mi.id item_id FROM restaurants r JOIN menu_items mi ON mi.restaurant_id = r.id WHERE r.deleted_at IS NULL AND mi.deleted_at IS NULL AND mi.is_available = 1 AND mi.item_type = 'COMBO'
    AND mi.id IN (SELECT c.combo_item_id FROM menu_item_combo_components c JOIN menu_items d ON d.id = c.component_item_id WHERE d.name LIKE 'Bia %')
    AND r.opening_time <= CURTIME() AND (r.closing_time > CURTIME() OR r.closing_time <= r.opening_time) ORDER BY r.id LIMIT 1`);
let addressId = null;
try {
  await expectFail('Thiếu trường (body rỗng)', {});
  const address = await api('POST', '/api/customer/addresses', { token, body: { label: 'Kiểm thử tạm', receiverName: 'Kiểm thử', receiverPhone: '0901234567', addressLine: '1 Nguyễn Huệ', ward: 'Bến Nghé', district: 'Quận 1', city: 'Hồ Chí Minh', latitude: 10.7745, longitude: 106.7032, isDefault: false } });
  addressId = address.id ?? address.address?.id;
  await expectFail("paymentMethod='BITCOIN'", { restaurantId: shop.restaurant_id, addressId, paymentMethod: 'BITCOIN' });
  await api('POST', '/api/customer/cart/items', { token, body: { restaurantId: shop.restaurant_id, menuItemId: shop.item_id, quantity: 1 } });
  const farQuote = await api('POST', '/api/customer/orders/quote', { token, body: { restaurantId: shop.restaurant_id, addressId } }).catch(error => ({ error: error.message }));
  console.log(`Báo giá địa chỉ ${farQuote.distanceKm} km: outOfRange=${farQuote.outOfRange}, phí giao=${farQuote.deliveryFee}, thông báo=${farQuote.outOfRangeMessage ?? ''}`);
  await expectFail('Địa chỉ > 15 km (Hồ Chí Minh)', { restaurantId: shop.restaurant_id, addressId, paymentMethod: 'COD' });
  if (beerShop) {
    await api('DELETE', `/api/customer/cart/${shop.restaurant_id}`, { token }).catch(() => {});
    await api('POST', '/api/customer/cart/items', { token, body: { restaurantId: beerShop.restaurant_id, menuItemId: beerShop.item_id, quantity: 1 } });
    await expectFail('Có bia, thiếu ageConfirmed', { restaurantId: beerShop.restaurant_id, addressId, paymentMethod: 'COD' });
    await expectFail('Có bia, ageConfirmed=true nhưng địa chỉ > 15 km (không tạo đơn)', { restaurantId: beerShop.restaurant_id, addressId, paymentMethod: 'COD', ageConfirmed: true });
    await api('DELETE', `/api/customer/cart/${beerShop.restaurant_id}`, { token }).catch(() => {});
  if (comboShop) {
    await api('POST', '/api/customer/cart/items', { token, body: { restaurantId: comboShop.restaurant_id, menuItemId: comboShop.item_id, quantity: 1 } });
    const quote = await api('POST', '/api/customer/orders/quote', { token, body: { restaurantId: comboShop.restaurant_id, addressId } }).catch(error => ({ error: error.message }));
    console.log(`Quote combo chứa bia: requiresAgeConfirmation=${quote.requiresAgeConfirmation}`);
    await expectFail('Combo chứa bia (tên dòng giỏ không có chữ bia), thiếu ageConfirmed', { restaurantId: comboShop.restaurant_id, addressId, paymentMethod: 'COD' });
    await api('DELETE', `/api/customer/cart/${comboShop.restaurant_id}`, { token }).catch(() => {});
  } else console.log('(Không có combo chứa bia ở quán đang mở cửa — bỏ qua ca combo)');
  } else console.log('(Không có quán bán bia đang mở cửa lúc này — bỏ qua ca bia)');
} finally {
  try { await api('DELETE', `/api/customer/cart/${shop.restaurant_id}`, { token }); } catch {}
  if (addressId) { try { await api('DELETE', `/api/customer/addresses/${addressId}`, { token }); } catch {} }
}
const after = await count();
for (const row of results) console.log(`${row.label}: HTTP ${row.status} — ${row.message}`);
console.log(`COUNT(orders) trước ${before} / sau ${after}: ${before === after ? 'KHỚP' : 'LỆCH'}`);
const [[leftover]] = await db.query("SELECT COUNT(*) n FROM cart_items ci JOIN carts c ON c.id = ci.cart_id JOIN customer_profiles cp ON cp.id = c.customer_id JOIN users u ON u.id = cp.user_id WHERE u.username = 'minh.anh' AND c.restaurant_id = ?", [shop.restaurant_id]).catch(() => [[{ n: '?' }]]);
console.log('Mục giỏ còn lại của minh.anh ở quán thử:', leftover.n);
await db.end();
process.exit(results.every(row => row.status === 400) && before === after ? 0 : 1);
