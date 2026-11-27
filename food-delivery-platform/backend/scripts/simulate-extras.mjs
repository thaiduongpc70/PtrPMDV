/* Hành vi phụ của người dùng, vẫn gọi qua API thật: quán trả lời đánh giá, khách yêu thích/tìm kiếm/nạp ví, tài xế rút tiền.
   Chạy sau simulate-activity.mjs:  node scripts/simulate-extras.mjs */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { api, tokenFor, pool } from './lib/api-client.mjs';
import { BANKS } from './data/vietnamese-people.mjs';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261015);
const pick = list => list[Math.floor(rnd() * list.length)];
const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4'
});
const sql = async (text, params = []) => (await db.query(text, params))[0];

/* ---------- 1. Quán trả lời đánh giá (ưu tiên đánh giá thấp) ---------- */
const REPLIES = {
  low: ['Quán xin lỗi bạn về trải nghiệm chưa tốt. Quán đã ghi nhận và sẽ cải thiện khâu đóng gói và thời gian chuẩn bị.', 'Cảm ơn phản hồi của bạn. Quán rất tiếc vì món chưa đúng ý, mong bạn cho quán cơ hội phục vụ lại.', 'Quán đã nhắc nhở bếp về lỗi này. Bạn nhắn quán để được hỗ trợ ở đơn sau nhé.'],
  mid: ['Cảm ơn bạn đã góp ý, quán sẽ điều chỉnh khẩu vị cho vừa miệng hơn.', 'Quán ghi nhận góp ý của bạn, hẹn bạn ở đơn sau.'],
  high: ['Cảm ơn bạn đã ủng hộ quán!', 'Quán rất vui vì bạn hài lòng, hẹn gặp lại bạn nhé.', 'Cảm ơn bạn đã tin tưởng đặt món của quán.']
};
const reviews = await sql(`SELECT rr.id, rr.rating, rr.restaurant_id AS restaurantId, u.username AS owner
  FROM restaurant_reviews rr INNER JOIN restaurants r ON r.id = rr.restaurant_id INNER JOIN users u ON u.id = r.owner_user_id
  WHERE rr.comment IS NOT NULL AND rr.restaurant_reply IS NULL AND rr.deleted_at IS NULL`); // bỏ qua đánh giá đã gỡ mềm
const toReply = reviews.filter(review => rnd() < (review.rating <= 2 ? 0.9 : review.rating === 3 ? 0.55 : 0.2));
await pool(toReply, 6, async review => {
  const replies = review.rating <= 2 ? REPLIES.low : review.rating === 3 ? REPLIES.mid : REPLIES.high;
  await api('POST', `/api/restaurant/manage/${review.restaurantId}/reviews/${review.id}/reply`, { token: await tokenFor(review.owner), body: { reply: pick(replies) } });
});
console.log(`Quán trả lời ${toReply.length} đánh giá`);

/* --incremental: chạy bổ sung sau một đợt đơn mới (chỉ trả lời đánh giá mới và xử lý hoàn tiền), không lặp yêu thích/nạp ví/rút tiền */
const INCREMENTAL = process.argv.includes('--incremental');
if (!INCREMENTAL) {
/* ---------- 2. Khách: yêu thích, tìm kiếm, nạp ví ---------- */
const customers = await sql(`SELECT u.username FROM users u INNER JOIN customer_profiles cp ON cp.user_id = u.id
  WHERE u.status = 'ACTIVE' AND cp.total_orders > 0`);
const restaurantIds = (await sql("SELECT id FROM restaurants WHERE status = 'ACTIVE'")).map(row => Number(row.id));
const dishIds = (await sql('SELECT id FROM menu_items WHERE total_reviews >= 20')).map(row => Number(row.id));
const KEYWORDS = ['phở', 'trà sữa', 'cơm tấm', 'pizza', 'bánh mì', 'gà rán', 'bún bò', 'cà phê', 'chè', 'lẩu', 'gỏi cuốn', 'mì ý', 'cháo', 'nước ép', 'burger', 'đồ chay'];
await pool(customers, 6, async customer => {
  const token = await tokenFor(customer.username);
  for (let i = between(1, 4); i > 0; i -= 1) await api('POST', `/api/customer/favorites/restaurants/${pick(restaurantIds)}`, { token });
  for (let i = between(1, 5); i > 0; i -= 1) await api('POST', `/api/customer/favorites/menu-items/${pick(dishIds)}`, { token });
  for (let i = between(2, 5); i > 0; i -= 1) await api('GET', `/api/catalog/menu-items?keyword=${encodeURIComponent(pick(KEYWORDS))}&pageSize=12`, { token });
  if (rnd() < 0.3) await api('POST', '/api/payments/wallet/deposit', { token, body: { amount: pick([100000, 200000, 300000, 500000]) } });
});
console.log(`Hành vi phụ của ${customers.length} khách (yêu thích, tìm kiếm, nạp ví)`);

/* ---------- 3. Tài xế rút một phần thu nhập ---------- */
const shippers = await sql(`SELECT u.username, sp.full_name AS name, COALESCE(SUM(se.net_earning), 0) AS earned
  FROM shipper_profiles sp INNER JOIN users u ON u.id = sp.user_id LEFT JOIN shipper_earnings se ON se.shipper_id = sp.id
  WHERE u.status = 'ACTIVE' GROUP BY sp.id HAVING earned > 200000`);
for (const shipper of shippers) {
  const [bank, code] = pick(BANKS);
  const amount = Math.floor(Number(shipper.earned) * (0.5 + rnd() * 0.3) / 1000) * 1000;
  await api('POST', '/api/shippers/withdrawals', {
    token: await tokenFor(shipper.username),
    body: { amount, bankName: bank, bankAccount: `${code === 'MB' ? '0' : '1'}${between(100000000, 999999999)}`, accountHolder: shipper.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase() }
  });
}
console.log(`${shippers.length} tài xế gửi yêu cầu rút tiền`);

}

/* ---------- 4. Admin xử lý hoàn tiền (đơn khách huỷ / quán từ chối / giao thất bại) ---------- */
const adminToken = await tokenFor('thaiduongpc7');
const failedPaid = await sql(`SELECT o.id FROM orders o WHERE o.order_status = 'FAILED' AND o.payment_method <> 'COD' AND o.payment_status = 'PAID'
  AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = o.id)`);
await pool(failedPaid, 6, order => api('POST', `/api/payments/orders/${order.id}/refund`, { token: adminToken, body: { reason: 'Hoàn tiền do giao hàng thất bại' } }));
const refunds = await sql("SELECT id FROM refunds WHERE status = 'PENDING' ORDER BY id");
let completed = 0;
await pool(refunds, 6, async (refund, index) => {
  const recent = index >= refunds.length - 40; // 40 yêu cầu gần nhất còn chờ xử lý
  if (recent) return;
  const roll = rnd();
  const status = roll < 0.93 ? 'COMPLETED' : roll < 0.97 ? 'REJECTED' : 'PROCESSING';
  await api('PATCH', `/api/admin/manage/refunds/${refund.id}`, { token: adminToken, body: { status } });
  if (status === 'COMPLETED') completed += 1;
});
console.log(`Hoàn tiền: tạo mới ${failedPaid.length}, xử lý ${completed} đã hoàn tất, giữ ${Math.min(40, refunds.length)} yêu cầu đang chờ`);

await db.end();
