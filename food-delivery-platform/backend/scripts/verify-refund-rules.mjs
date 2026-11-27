/* Kiểm chứng SỐNG luật hoàn tiền qua API thật (tạo đúng 1 đơn trả online của khách mô phỏng kh.*, không phải minh.anh):
   gọi hoàn 60% song song 6 lần -> chỉ 1 thành công; duyệt -> hoàn một phần; huỷ đơn -> chỉ tạo phần còn lại; duyệt -> REFUNDED; gọi hoàn thêm -> 409.
   Dùng:  node scripts/verify-refund-rules.mjs   (server đang chạy) */
import { api, tokenFor } from './lib/api-client.mjs';
import { connect } from './lib/db.mjs';

const db = await connect();
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const [pick] = await q(`SELECT u.username, ca.id address_id, ca.latitude lat, ca.longitude lng FROM users u JOIN customer_profiles cp ON cp.user_id = u.id
  JOIN customer_addresses ca ON ca.customer_id = cp.id AND ca.is_default = 1 WHERE u.username LIKE 'kh.%' AND cp.id > 255 AND ca.latitude > 20.85 ORDER BY cp.id LIMIT 1`);
const [shop] = await q(`SELECT r.id, r.name, r.minimum_order,
    ROUND(6371 * 2 * ASIN(SQRT(POW(SIN(RADIANS(r.latitude - ?) / 2), 2) + COS(RADIANS(?)) * COS(RADIANS(r.latitude)) * POW(SIN(RADIANS(r.longitude - ?) / 2), 2))), 2) km,
    (SELECT mi.id FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.deleted_at IS NULL AND mi.is_available = 1 AND mi.item_type = 'DISH' AND mi.name NOT LIKE 'Bia %'
       AND NOT EXISTS (SELECT 1 FROM menu_item_variants v WHERE v.menu_item_id = mi.id) AND NOT EXISTS (SELECT 1 FROM menu_item_topping_groups g WHERE g.menu_item_id = mi.id) ORDER BY mi.base_price DESC LIMIT 1) item_id
  FROM restaurants r WHERE r.deleted_at IS NULL AND r.status = 'ACTIVE' AND r.latitude > 20.85
    AND r.opening_time <= CURTIME() AND (r.closing_time > CURTIME() OR r.closing_time <= r.opening_time) HAVING km <= 8 AND item_id IS NOT NULL ORDER BY km LIMIT 1`, [pick.lat, pick.lat, pick.lng]);
if (!pick || !shop) { console.log('Không có khách/quán phù hợp lúc này'); process.exit(1); }
const customer = await tokenFor(pick.username); const admin = await tokenFor('thaiduongpc7');
const [{ base }] = await q('SELECT base_price base FROM menu_items WHERE id = ?', [shop.item_id]);
await api('DELETE', `/api/customer/cart/${shop.id}`, { token: customer }).catch(() => {});
await api('POST', '/api/customer/cart/items', { token: customer, body: { restaurantId: shop.id, menuItemId: shop.item_id, quantity: Math.max(1, Math.ceil(Number(shop.minimum_order) / Number(base))) } });
const order = await api('POST', '/api/customer/orders/checkout', { token: customer, headers: { 'Idempotency-Key': `verify-refund-${Date.now()}` }, body: { restaurantId: shop.id, addressId: pick.address_id, paymentMethod: 'MOMO', ageConfirmed: true } });
await api('POST', `/api/payments/orders/${order.id}/mock-pay`, { token: customer, body: { outcome: 'PAID' } });
console.log(`Đơn ${order.orderCode} (#${order.id}) khách ${pick.username}, đã trả MOMO ${order.totalAmount}`);
const state = async label => {
  const [o] = await q('SELECT order_status, payment_status FROM orders WHERE id = ?', [order.id]);
  const p = await q('SELECT status, amount FROM payments WHERE order_id = ?', [order.id]);
  const f = await q('SELECT id, amount, status FROM refunds WHERE order_id = ? ORDER BY id', [order.id]);
  console.log(`  [${label}] đơn ${o.order_status}/${o.payment_status}; giao dịch ${p.map(x => `${x.status}:${x.amount}`).join(',')}; hoàn ${f.map(x => `#${x.id} ${x.status}:${x.amount}`).join(', ') || '(chưa)'}`);
  return f;
};
const part = Math.round(Number(order.totalAmount) * 0.6);
const attempts = await Promise.all(Array.from({ length: 6 }, () => api('POST', `/api/payments/orders/${order.id}/refund`, { token: admin, body: { amount: part, reason: 'Kiểm thử đua song song' } }).then(r => ({ ok: true, id: r.id }), e => ({ ok: false, status: e.status, message: e.body?.message }))));
console.log(`6 yêu cầu hoàn 60% đồng thời: thành công ${attempts.filter(a => a.ok).length}, bị từ chối ${attempts.filter(a => !a.ok).map(a => a.status).join(',')} — "${attempts.find(a => !a.ok)?.message}"`);
let refunds = await state('sau đua');
await api('PATCH', `/api/admin/manage/refunds/${refunds[0].id}`, { token: admin, body: { status: 'COMPLETED' } });
await state('duyệt 60%');
await api('POST', `/api/payments/orders/${order.id}/cancel`, { token: customer, body: { reason: 'Kiểm thử huỷ sau hoàn một phần' } }).catch(e => console.log('  huỷ:', e.status, e.body?.message));
refunds = await state('khách huỷ');
const pending = refunds.find(f => f.status === 'PENDING');
if (pending) await api('PATCH', `/api/admin/manage/refunds/${pending.id}`, { token: admin, body: { status: 'COMPLETED' } });
await state('duyệt phần còn lại');
for (const [label, call] of [['hoàn thêm', () => api('POST', `/api/payments/orders/${order.id}/refund`, { token: admin, body: {} })], ['đổi bản đã hoàn tất sang REJECTED', () => api('PATCH', `/api/admin/manage/refunds/${refunds[0].id}`, { token: admin, body: { status: 'REJECTED' } })]]) {
  try { await call(); console.log(`  ${label}: KHÔNG BỊ CHẶN`); } catch (e) { console.log(`  ${label}: HTTP ${e.status} — ${e.body?.message}`); }
}
const history = await q('SELECT new_status, note FROM order_status_history WHERE order_id = ? ORDER BY id', [order.id]);
console.log('Lịch sử:', history.map(h => `${h.new_status}: ${h.note}`).join(' | '));
await db.end();
