/* Trải mốc thời gian của dữ liệu mô phỏng ra ~6 tuần (29/08 -> hôm nay).
   Mô phỏng chạy trong vài chục phút nên mọi bản ghi đang mang cùng một ngày và nhiều bước của một đơn rơi vào cùng một giây.
   Script này gán lại thời điểm đặt đơn theo phân bố thật (giờ cao điểm trưa/tối, cuối tuần đông hơn, lượng đơn tăng dần),
   rồi dựng dòng thời gian riêng cho từng đơn theo SỰ KIỆN (xác nhận -> chế biến -> sẵn sàng -> giao tài xế -> lấy hàng -> GPS -> giao xong)
   với thời gian chuẩn bị/giao hợp lý, và đặt lại mốc cho mọi bảng liên quan theo đúng sự kiện của nó
   (lịch sử trạng thái, thanh toán, giao hàng, GPS, hoa hồng, đánh giá, thông báo, nhật ký...).
   Chỉ thay đổi thời gian (và mã đơn cho khớp ngày); không thêm/xoá/sửa nội dung giao dịch.
   Chạy sau simulate-activity.mjs, simulate-extras.mjs, finalize-realistic-data.mjs:  node scripts/spread-timeline.mjs --yes */
import 'dotenv/config';
import mysql from 'mysql2/promise';

if (!process.argv.includes('--yes')) {
  console.log('Thêm --yes để xác nhận gán lại mốc thời gian cho toàn bộ đơn hàng.');
  process.exit(1);
}

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
const rnd = mulberry32(20261014);
const between = (min, max) => min + rnd() * (max - min);

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4', dateStrings: true
});
const run = async (text, params = []) => (await db.query(text, params))[0];
await run("SET time_zone = '+00:00'"); // chuỗi datetime trong DB là giờ địa phương (naive); coi như UTC để tính epoch ổn định
const epoch = value => (value ? Date.parse(String(value).replace(' ', 'T') + 'Z') / 1000 : null);

const argValue = name => { const index = process.argv.indexOf(name); return index >= 0 ? Number(process.argv[index + 1]) : null; };
const RECENT_FROM = argValue('--recent-from-id'); // đơn mới (tính năng combo/voucher/điểm thưởng) chỉ rải vào RECENT_DAYS ngày gần đây
const RECENT_DAYS = argValue('--recent-days') ?? 21;

const nowNaive = Math.floor(Date.now() / 1000 - new Date().getTimezoneOffset() * 60);
const START = Date.UTC(2026, 7, 29, 0, 0, 0) / 1000;
const LAST_START = nowNaive - 4500; // đơn mới nhất bắt đầu cách hiện tại ít nhất 75 phút để kịp hoàn tất

/* ---------- 1. Thời điểm đặt đơn ---------- */
const orders = await run('SELECT id, order_status, payment_method, ordered_at FROM orders ORDER BY id');
const spanDays = (epoch(orders[orders.length - 1].ordered_at) - epoch(orders[0].ordered_at)) / 86400;
const alreadySpread = spanDays > 3; // chạy lại trên dữ liệu đã trải: giữ nguyên thời điểm đặt đơn, chỉ dựng lại các sự kiện

const HOURS = [[7, 2], [8, 4], [9, 3], [10, 4], [11, 10], [12, 14], [13, 9], [14, 4], [15, 4], [16, 5], [17, 8], [18, 13], [19, 14], [20, 9], [21, 3]];
const days = [];
for (let t = START; t < LAST_START; t += 86400) days.push(t);
const dayEntries = days.map((t, index) => {
  const dow = new Date(t * 1000).getUTCDay();
  const weekday = dow === 0 || dow === 6 ? 1.3 : dow === 5 ? 1.15 : dow === 1 ? 0.9 : 1;
  return [t, (0.55 + 0.9 * index / (days.length - 1)) * weekday * (0.9 + rnd() * 0.2)];
});
function sampleWeighted(entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let r = rnd() * total;
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
const sampleStart = () => {
  for (;;) {
    const value = sampleWeighted(dayEntries) + sampleWeighted(HOURS) * 3600 + Math.floor(rnd() * 3600);
    if (value <= LAST_START) return value;
  }
};

const recentEntries = dayEntries.filter(([t]) => t >= nowNaive - RECENT_DAYS * 86400);
const sampleRecentStart = () => {
  for (;;) {
    const value = sampleWeighted(recentEntries) + sampleWeighted(HOURS) * 3600 + Math.floor(rnd() * 3600);
    if (value <= LAST_START && value >= nowNaive - RECENT_DAYS * 86400) return value;
  }
};

const finalStatuses = new Set(['DELIVERED', 'CANCELLED', 'FAILED']);
const finishedOrders = orders.filter(order => finalStatuses.has(order.order_status));
const starts = new Map();
if (alreadySpread) {
  for (const order of orders) {
    const id = Number(order.id);
    const finished = finalStatuses.has(order.order_status);
    starts.set(id, !finished ? nowNaive - Math.floor(between(3, 40) * 60) : RECENT_FROM && id >= RECENT_FROM ? sampleRecentStart() : epoch(order.ordered_at));
  }
} else {
  const sortedTimes = finishedOrders.map(sampleStart).sort((a, b) => a - b);
  finishedOrders.forEach((order, index) => starts.set(Number(order.id), sortedTimes[index]));
  for (const order of orders.filter(o => !finalStatuses.has(o.order_status))) starts.set(Number(order.id), nowNaive - Math.floor(between(3, 40) * 60));
}

/* ---------- 2. Dòng thời gian sự kiện của từng đơn ---------- */
const statusRows = await run('SELECT order_id, GROUP_CONCAT(DISTINCT new_status) AS statuses FROM order_status_history GROUP BY order_id');
const reached = new Map(statusRows.map(row => [Number(row.order_id), new Set(String(row.statuses).split(','))]));
const failedPay = new Set((await run("SELECT DISTINCT p.order_id FROM payment_transactions pt INNER JOIN payments p ON p.id = pt.payment_id WHERE pt.status = 'FAILED'")).map(row => Number(row.order_id)));
const cancelledByRestaurant = new Set((await run("SELECT order_id FROM order_cancellations WHERE reason_code = 'RESTAURANT_REJECTED'")).map(row => Number(row.order_id)));

const cap = value => (value === null ? null : Math.min(Math.round(value), nowNaive - 15));
const events = [];
for (const order of orders) {
  const id = Number(order.id);
  const seen = reached.get(id) ?? new Set();
  const t0 = starts.get(id);
  const ev = { id, t0, tConf: null, tPrep: null, tReady: null, tAssign: null, tAccept: null, tPick: null, tG1: null, tG2: null, tDlv: null, tEnd: null, tCancel: null, tPay: null, tPayFail: null };
  if (order.payment_method !== 'COD') {
    ev.tPay = t0 + between(8, 50);
    if (failedPay.has(id)) ev.tPayFail = t0 + between(2, 7);
  }
  if (seen.has('CONFIRMED')) ev.tConf = t0 + between(40, 240);
  if (seen.has('PREPARING')) ev.tPrep = ev.tConf + between(15, 90);
  if (seen.has('READY_FOR_PICKUP')) ev.tReady = ev.tPrep + between(8, 24) * 60;
  if (seen.has('SHIPPER_ASSIGNED')) {
    ev.tAssign = ev.tReady + between(30, 170);
    ev.tAccept = ev.tAssign + between(10, 60);
  }
  if (seen.has('PICKED_UP')) {
    ev.tPick = ev.tAccept + between(90, 400);
    const leg = between(8, 26) * 60;
    ev.tG1 = ev.tPick + leg * 0.2;
    ev.tG2 = ev.tPick + leg * 0.4;
    if (seen.has('DELIVERING')) ev.tDlv = ev.tPick + leg * 0.55;
    if (seen.has('DELIVERED') || seen.has('FAILED')) ev.tEnd = ev.tPick + leg;
  }
  if (seen.has('CANCELLED')) ev.tCancel = t0 + (cancelledByRestaurant.has(id) ? between(120, 600) : between(60, 420));
  for (const key of Object.keys(ev)) if (key !== 'id' && key !== 't0') ev[key] = cap(ev[key]);
  ev.tLast = ev.tEnd ?? ev.tDlv ?? ev.tPick ?? ev.tAccept ?? ev.tAssign ?? ev.tReady ?? ev.tPrep ?? ev.tConf ?? ev.tCancel ?? t0;
  events.push(ev);
}

await run('DROP TABLE IF EXISTS tmp_ev');
await run(`CREATE TABLE tmp_ev (order_id BIGINT UNSIGNED PRIMARY KEY, t0 BIGINT, t_conf BIGINT, t_prep BIGINT, t_ready BIGINT, t_assign BIGINT, t_accept BIGINT,
  t_pick BIGINT, t_g1 BIGINT, t_g2 BIGINT, t_dlv BIGINT, t_end BIGINT, t_cancel BIGINT, t_pay BIGINT, t_payfail BIGINT, t_last BIGINT)`);
for (let i = 0; i < events.length; i += 500) {
  await run('INSERT INTO tmp_ev VALUES ?', [events.slice(i, i + 500).map(e => [e.id, e.t0, e.tConf, e.tPrep, e.tReady, e.tAssign, e.tAccept, e.tPick, e.tG1, e.tG2, e.tDlv, e.tEnd, e.tCancel, e.tPay, e.tPayFail, e.tLast])]);
}
console.log(`Đã dựng dòng thời gian cho ${events.length} đơn (${alreadySpread ? 'giữ thời điểm đặt đơn hiện có' : 'gán thời điểm đặt đơn mới'}).`);

/* ---------- 3. Cập nhật các bảng theo sự kiện ---------- */
const F = expr => `FROM_UNIXTIME(${expr})`;
/* Độ trễ sau khi giao (đánh giá, hỗ trợ): 10 phút -> ~1.8 ngày, lệch về phía ngắn, ổn định theo mã đơn; không vượt quá hiện tại */
const DELAY = (extra = 0) => F(`LEAST(e.t_last + 600 + ROUND(POW(MOD(e.order_id * 2654435761, 10007) / 10007, 2.2) * 150000) + ${extra}, ${nowNaive} - 120 - MOD(e.order_id, 1800))`);

async function update(label, text) {
  const result = await run(text);
  console.log(`  ${label}: ${result.affectedRows} dòng`);
}
const gpsRank = "(SELECT id, ROW_NUMBER() OVER (PARTITION BY delivery_id ORDER BY id) AS rn FROM delivery_status_history WHERE note = 'GPS update')";
const locRank = '(SELECT id, ROW_NUMBER() OVER (PARTITION BY delivery_id ORDER BY id) AS rn FROM shipper_locations)';

console.log('Bảng theo đơn:');
await update('orders', `UPDATE orders t JOIN tmp_ev e ON e.order_id = t.id SET
  t.ordered_at = ${F('e.t0')}, t.created_at = ${F('e.t0')},
  t.confirmed_at = IF(t.confirmed_at IS NULL, NULL, ${F('e.t_conf')}),
  t.prepared_at = IF(t.prepared_at IS NULL, NULL, ${F('e.t_ready')}),
  t.picked_up_at = IF(t.picked_up_at IS NULL, NULL, ${F('e.t_pick')}),
  t.delivered_at = IF(t.delivered_at IS NULL, NULL, ${F('e.t_end')}),
  t.cancelled_at = IF(t.cancelled_at IS NULL, NULL, ${F('e.t_cancel')}),
  t.updated_at = ${F('e.t_last')}`);
await update('order_items', `UPDATE order_items t JOIN tmp_ev e ON e.order_id = t.order_id SET t.created_at = ${F('e.t0')}`);
await update('order_item_toppings', `UPDATE order_item_toppings t JOIN order_items oi ON oi.id = t.order_item_id JOIN tmp_ev e ON e.order_id = oi.order_id SET t.created_at = ${F('e.t0')}`);
await update('order_status_history', `UPDATE order_status_history t JOIN tmp_ev e ON e.order_id = t.order_id SET t.created_at = ${F(`CASE t.new_status
  WHEN 'PENDING' THEN e.t0 WHEN 'CONFIRMED' THEN e.t_conf WHEN 'PREPARING' THEN e.t_prep WHEN 'READY_FOR_PICKUP' THEN e.t_ready
  WHEN 'SHIPPER_ASSIGNED' THEN e.t_assign WHEN 'PICKED_UP' THEN e.t_pick WHEN 'DELIVERING' THEN e.t_dlv
  WHEN 'DELIVERED' THEN e.t_end WHEN 'FAILED' THEN e.t_end WHEN 'CANCELLED' THEN e.t_cancel ELSE e.t0 END`)}`);
await update('order_cancellations', `UPDATE order_cancellations t JOIN tmp_ev e ON e.order_id = t.order_id SET t.created_at = ${F('COALESCE(e.t_cancel, e.t0)')}`);
await update('payments', `UPDATE payments t JOIN tmp_ev e ON e.order_id = t.order_id SET
  t.created_at = ${F('e.t0 + 2')},
  t.paid_at = IF(t.paid_at IS NULL, NULL, ${F("IF(t.method = 'COD', COALESCE(e.t_end, e.t_last), COALESCE(e.t_pay, e.t0 + 20))")}),
  t.updated_at = COALESCE(t.paid_at, t.created_at)`);
await update('payment_transactions', `UPDATE payment_transactions t JOIN payments p ON p.id = t.payment_id JOIN tmp_ev e ON e.order_id = p.order_id
  SET t.created_at = ${F("IF(t.status = 'FAILED', COALESCE(e.t_payfail, e.t0 + 5), COALESCE(e.t_pay, e.t0 + 20))")}`);
await update('cod_transactions', `UPDATE cod_transactions t JOIN tmp_ev e ON e.order_id = t.order_id SET
  t.collected_at = IF(t.collected_at IS NULL, NULL, ${F('COALESCE(e.t_end, e.t_last)')}), t.settled_at = IF(t.settled_at IS NULL, NULL, ${F('COALESCE(e.t_end, e.t_last) + 86400')}),
  t.created_at = ${F('COALESCE(e.t_end, e.t_last)')}, t.updated_at = ${F('COALESCE(e.t_end, e.t_last)')}`);
await update('deliveries', `UPDATE deliveries t JOIN tmp_ev e ON e.order_id = t.order_id SET
  t.created_at = ${F('e.t_assign')}, t.assigned_at = IF(t.assigned_at IS NULL, NULL, ${F('e.t_assign')}),
  t.accepted_at = IF(t.accepted_at IS NULL, NULL, ${F('e.t_accept')}), t.picked_up_at = IF(t.picked_up_at IS NULL, NULL, ${F('e.t_pick')}),
  t.delivered_at = IF(t.delivered_at IS NULL, NULL, ${F('e.t_end')}),
  t.updated_at = ${F('COALESCE(e.t_end, e.t_dlv, e.t_pick, e.t_accept, e.t_assign)')}`);
await update('delivery_assignments', `UPDATE delivery_assignments t JOIN tmp_ev e ON e.order_id = t.order_id SET
  t.offered_at = ${F('e.t_assign')}, t.accepted_at = IF(t.accepted_at IS NULL, NULL, ${F('e.t_accept')})`);
await update('delivery_status_history', `UPDATE delivery_status_history t JOIN deliveries d ON d.id = t.delivery_id JOIN tmp_ev e ON e.order_id = d.order_id
  LEFT JOIN ${gpsRank} g ON g.id = t.id
  SET t.created_at = ${F(`CASE WHEN g.id IS NOT NULL THEN IF(g.rn = 1, e.t_g1, e.t_g2)
    WHEN t.status = 'ASSIGNED' THEN e.t_assign WHEN t.status = 'ACCEPTED' THEN e.t_accept WHEN t.status = 'PICKED_UP' THEN e.t_pick
    WHEN t.status = 'DELIVERING' THEN e.t_dlv ELSE e.t_end END`)}`);
await update('shipper_locations', `UPDATE shipper_locations t JOIN deliveries d ON d.id = t.delivery_id JOIN tmp_ev e ON e.order_id = d.order_id
  JOIN ${locRank} g ON g.id = t.id SET t.recorded_at = ${F('COALESCE(IF(g.rn = 1, e.t_g1, IF(g.rn = 2, e.t_g2, e.t_dlv)), e.t_last)')}`);
await update('shipper_earnings', `UPDATE shipper_earnings t JOIN deliveries d ON d.id = t.delivery_id JOIN tmp_ev e ON e.order_id = d.order_id SET t.created_at = ${F('COALESCE(e.t_end, e.t_last)')}`);
await update('restaurant_commissions', `UPDATE restaurant_commissions t JOIN tmp_ev e ON e.order_id = t.order_id SET t.created_at = ${F('COALESCE(e.t_end, e.t_last)')}`);
await update('invoices', `UPDATE invoices t JOIN tmp_ev e ON e.order_id = t.order_id SET t.issued_at = ${F('COALESCE(e.t_end, e.t_last) + 60 + MOD(t.order_id * 37, 2400)')}, t.created_at = ${F('COALESCE(e.t_end, e.t_last) + 60 + MOD(t.order_id * 37, 2400)')}`);
await update('refunds', `UPDATE refunds t JOIN tmp_ev e ON e.order_id = t.order_id SET
  t.created_at = ${F(`LEAST(IF(e.t_cancel IS NOT NULL, e.t_cancel + 30 + MOD(t.id, 120), COALESCE(e.t_end, e.t_last) + 600 + MOD(t.id, 1800)), ${nowNaive} - 60)`)},
  t.processed_at = IF(t.processed_at IS NULL, NULL, ${F(`LEAST(IF(e.t_cancel IS NOT NULL, e.t_cancel, COALESCE(e.t_end, e.t_last)) + 3600 + MOD(t.id * 911, 86400), ${nowNaive} - 30)`)})`);
await update('promotion_usage', `UPDATE promotion_usage t JOIN tmp_ev e ON e.order_id = t.order_id SET t.used_at = ${F('e.t0')}`);
await update('chat_sessions', `UPDATE chat_sessions t JOIN tmp_ev e ON e.order_id = t.order_id SET t.created_at = ${F('COALESCE(e.t_conf, e.t0) + 120')}, t.closed_at = IF(t.closed_at IS NULL, NULL, ${F('COALESCE(e.t_end, e.t_last) + 600')})`);
await update('chat_messages', 'UPDATE chat_messages t JOIN chat_sessions s ON s.id = t.session_id SET t.created_at = DATE_ADD(s.created_at, INTERVAL 40 + MOD(t.id * 37, 600) SECOND)');

console.log('Đánh giá và hỗ trợ (trễ sau khi giao):');
for (const table of ['restaurant_reviews', 'shipper_reviews', 'menu_item_reviews']) {
  await update(table, `UPDATE ${table} t JOIN tmp_ev e ON e.order_id = t.order_id SET t.created_at = ${DELAY('MOD(t.id, 240)')}, t.updated_at = ${DELAY('MOD(t.id, 240)')}`);
}
await update('restaurant_reviews.replied_at', `UPDATE restaurant_reviews SET replied_at = LEAST(DATE_ADD(created_at, INTERVAL 1800 + MOD(id * 977, 86400) SECOND), FROM_UNIXTIME(${nowNaive} - 60)) WHERE restaurant_reply IS NOT NULL`);
await update('support_tickets', `UPDATE support_tickets t JOIN tmp_ev e ON e.order_id = t.order_id SET t.created_at = ${DELAY(1200)}, t.updated_at = ${DELAY(1200)}, t.resolved_at = IF(t.resolved_at IS NULL, NULL, ${DELAY(7200)})`);
await update('support_messages', `UPDATE support_messages t JOIN support_tickets s ON s.id = t.ticket_id SET t.created_at = LEAST(DATE_ADD(s.created_at, INTERVAL 600 + MOD(t.id * 131, 5400) SECOND), FROM_UNIXTIME(${nowNaive} - 30))`);

/* ---------- 4. Thông báo và nhật ký: lấy mốc từ chính sự kiện mà chúng ghi lại ---------- */
console.log('Thông báo và nhật ký:');
await update('notifications', `UPDATE notifications n JOIN tmp_ev e ON e.order_id = n.reference_id AND n.reference_type = 'ORDER' SET n.created_at = ${F(`CASE
  WHEN n.message LIKE '%was placed%' THEN e.t0 + 1 WHEN n.message LIKE 'Restaurant confirmed%' THEN e.t_conf + 1
  WHEN n.message LIKE 'Kitchen started%' THEN e.t_prep + 1 WHEN n.message LIKE 'Order is ready%' THEN e.t_ready + 1
  WHEN n.message LIKE '%rejected%' THEN COALESCE(e.t_cancel, e.t0) + 1 ELSE e.t_last END`)}, n.read_at = NULL, n.is_read = 0`);

const audit = (label, actions, source, value) => update(`audit ${label}`, `UPDATE audit_logs a ${source} SET a.created_at = ${value} WHERE a.action IN (${actions.map(x => `'${x}'`).join(',')})`);
await audit('ORDER_CREATE', ['ORDER_CREATE'], 'JOIN tmp_ev e ON e.order_id = a.entity_id', F('e.t0 + 1'));
await audit('ORDER_CONFIRM', ['ORDER_CONFIRM'], 'JOIN tmp_ev e ON e.order_id = a.entity_id', F('e.t_conf'));
await audit('ORDER_PREPARE', ['ORDER_PREPARE'], 'JOIN tmp_ev e ON e.order_id = a.entity_id', F('e.t_prep'));
await audit('ORDER_READY', ['ORDER_READY'], 'JOIN tmp_ev e ON e.order_id = a.entity_id', F('e.t_ready'));
await audit('ORDER_CANCEL/REJECT', ['ORDER_CANCEL', 'ORDER_REJECT'], 'JOIN tmp_ev e ON e.order_id = a.entity_id', F('COALESCE(e.t_cancel, e.t0)'));
await audit('DELIVERY_ASSIGN', ['DELIVERY_ASSIGN'], 'JOIN delivery_assignments da ON da.id = a.entity_id JOIN tmp_ev e ON e.order_id = da.order_id', F('e.t_assign'));
await audit('DELIVERY_ASSIGNMENT_ACCEPT', ['DELIVERY_ASSIGNMENT_ACCEPT'], 'JOIN delivery_assignments da ON da.id = a.entity_id JOIN tmp_ev e ON e.order_id = da.order_id', F('e.t_accept'));
await audit('DELIVERY_STATUS_UPDATE', ['DELIVERY_STATUS_UPDATE'], 'JOIN deliveries d ON d.id = a.entity_id JOIN tmp_ev e ON e.order_id = d.order_id',
  F("CASE JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.changes.status')) WHEN 'PICKED_UP' THEN e.t_pick WHEN 'DELIVERING' THEN e.t_dlv ELSE e.t_end END"));
await audit('PAYMENT_MOCK_PAY', ['PAYMENT_MOCK_PAY'], 'JOIN payments p ON p.id = a.entity_id JOIN tmp_ev e ON e.order_id = p.order_id',
  F("IF(JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.changes.status')) = 'FAILED', COALESCE(e.t_payfail, e.t0 + 5), COALESCE(e.t_pay, e.t0 + 20))"));
await audit('MENU_ITEM_REVIEW_CREATE', ['MENU_ITEM_REVIEW_CREATE'], 'JOIN (SELECT order_id, MIN(created_at) AS at FROM menu_item_reviews GROUP BY order_id) r ON r.order_id = a.entity_id', 'r.at');
await audit('RESTAURANT_REVIEW_CREATE', ['RESTAURANT_REVIEW_CREATE'], 'JOIN restaurant_reviews r ON r.id = a.entity_id', 'r.created_at');
await audit('SHIPPER_REVIEW_CREATE', ['SHIPPER_REVIEW_CREATE'], 'JOIN shipper_reviews r ON r.id = a.entity_id', 'r.created_at');
await audit('RESTAURANT_REVIEW_REPLY', ['RESTAURANT_REVIEW_REPLY'], 'JOIN restaurant_reviews r ON r.id = a.entity_id', 'COALESCE(r.replied_at, r.created_at)');
await audit('INVOICE_CREATE', ['INVOICE_CREATE'], 'JOIN invoices i ON i.id = a.entity_id', 'i.created_at');
await audit('REFUND_CREATE', ['REFUND_CREATE'], 'JOIN refunds r ON r.id = a.entity_id', 'r.created_at');
await audit('ADMIN_REFUND_UPDATE', ['ADMIN_REFUND_UPDATE'], 'JOIN refunds r ON r.id = a.entity_id', 'COALESCE(r.processed_at, r.created_at)');
await audit('SUPPORT_TICKET', ['SUPPORT_TICKET_CREATE', 'SUPPORT_TICKET_UPDATE'], 'JOIN support_tickets s ON s.id = a.entity_id', "DATE_ADD(s.created_at, INTERVAL IF(a.action = 'SUPPORT_TICKET_CREATE', 0, 900) SECOND)");
await audit('SUPPORT_MESSAGE_CREATE', ['SUPPORT_MESSAGE_CREATE'], 'JOIN support_messages m ON m.id = a.entity_id', 'm.created_at');
await audit('CHAT_SESSION_CREATE', ['CHAT_SESSION_CREATE'], 'JOIN chat_sessions s ON s.id = a.entity_id', 's.created_at');
await audit('CHAT_MESSAGE_CREATE', ['CHAT_MESSAGE_CREATE'], 'JOIN chat_messages m ON m.id = a.entity_id', 'm.created_at');

// Nhật ký tạo đánh giá món của các đơn có đánh giá đã bị bỏ bớt (finalize-realistic-data.mjs): đặt sau thời điểm giao
await update('audit MENU_ITEM_REVIEW_CREATE (đánh giá đã bỏ bớt)', `UPDATE audit_logs a JOIN orders o ON o.id = a.entity_id
  SET a.created_at = DATE_ADD(o.delivered_at, INTERVAL 600 + MOD(o.id * 131, 7200) SECOND)
  WHERE a.action = 'MENU_ITEM_REVIEW_CREATE' AND o.delivered_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM menu_item_reviews r WHERE r.order_id = o.id)`);
await update('audit (chặn tương lai)', `UPDATE audit_logs SET created_at = FROM_UNIXTIME(${nowNaive} - 60 - MOD(id, 600)) WHERE created_at > FROM_UNIXTIME(${nowNaive} - 30)`);

/* ---------- 5. Hành vi của người dùng: rải theo vòng đời từng khách ---------- */
console.log('Hành vi phụ của người dùng:');
const customerSpan = '(SELECT cp.id AS customer_id, cp.user_id, MIN(o.ordered_at) AS first_order FROM customer_profiles cp INNER JOIN orders o ON o.customer_id = cp.id GROUP BY cp.id, cp.user_id)';
const spread = (alias, seedColumn) => `DATE_ADD(fo.first_order, INTERVAL ROUND(TIMESTAMPDIFF(SECOND, fo.first_order, FROM_UNIXTIME(${nowNaive} - 3600)) * MOD(${alias}.${seedColumn} * 2654435761, 10007) / 10007) SECOND)`;
await update('favorite_restaurants', `UPDATE favorite_restaurants f JOIN ${customerSpan} fo ON fo.customer_id = f.customer_id SET f.created_at = ${spread('f', 'restaurant_id')}`);
await update('favorite_menu_items', `UPDATE favorite_menu_items f JOIN ${customerSpan} fo ON fo.customer_id = f.customer_id SET f.created_at = ${spread('f', 'menu_item_id')}`);
await update('search_history', `UPDATE search_history s JOIN ${customerSpan} fo ON fo.customer_id = s.customer_id SET s.searched_at = ${spread('s', 'id')}`);
await update('wallet_transactions', `UPDATE wallet_transactions t JOIN wallets w ON w.id = t.wallet_id JOIN ${customerSpan} fo ON fo.user_id = w.user_id SET t.created_at = ${spread('t', 'id')}`);
await update('wallets', `UPDATE wallets w LEFT JOIN (SELECT wallet_id, MIN(created_at) AS first_tx, MAX(created_at) AS last_tx FROM wallet_transactions GROUP BY wallet_id) t ON t.wallet_id = w.id
  SET w.created_at = COALESCE(DATE_SUB(t.first_tx, INTERVAL 60 SECOND), w.created_at), w.updated_at = COALESCE(t.last_tx, w.updated_at)`);
await update('shipper_withdrawals', `UPDATE shipper_withdrawals w SET w.requested_at = FROM_UNIXTIME(${nowNaive} - (1 + MOD(w.id * 37, 12)) * 86400 - MOD(w.id * 911, 40000)), w.processed_at = NULL`);

/* ---------- 6. Tài khoản, quán, thực đơn: ngày tạo hợp lý ---------- */
console.log('Ngày tạo tài khoản và thực đơn:');
await update('khách hàng', `UPDATE users u JOIN (SELECT cp.user_id, MIN(o.ordered_at) AS first_order, MAX(o.ordered_at) AS last_order FROM orders o
  JOIN customer_profiles cp ON cp.id = o.customer_id GROUP BY cp.user_id) f ON f.user_id = u.id
  SET u.created_at = DATE_SUB(f.first_order, INTERVAL ROUND(900 + MOD(u.id * 7919, 10007) / 10007 * 4 * 86400) SECOND),
      u.last_login_at = DATE_ADD(f.last_order, INTERVAL 120 + MOD(u.id, 900) SECOND),
      u.updated_at = DATE_ADD(f.last_order, INTERVAL 120 + MOD(u.id, 900) SECOND)`);
await update('hồ sơ khách', 'UPDATE customer_profiles cp JOIN users u ON u.id = cp.user_id SET cp.created_at = u.created_at, cp.updated_at = u.updated_at');
await update('địa chỉ khách', 'UPDATE customer_addresses ca JOIN customer_profiles cp ON cp.id = ca.customer_id SET ca.created_at = DATE_ADD(cp.created_at, INTERVAL 90 SECOND), ca.updated_at = DATE_ADD(cp.created_at, INTERVAL 90 SECOND)');
await update('tài xế', `UPDATE users u JOIN shipper_profiles sp ON sp.user_id = u.id
  SET u.created_at = FROM_UNIXTIME(${START} - 86400 * (4 + MOD(u.id * 31, 9))), u.updated_at = FROM_UNIXTIME(${START} - 86400 * (3 + MOD(u.id * 31, 3)))
  WHERE u.role_id = 3`);
await update('hồ sơ tài xế', `UPDATE shipper_profiles sp JOIN users u ON u.id = sp.user_id
  LEFT JOIN (SELECT shipper_id, MAX(delivered_at) AS last_delivery FROM deliveries GROUP BY shipper_id) d ON d.shipper_id = sp.id
  SET sp.created_at = u.created_at, sp.updated_at = COALESCE(d.last_delivery, u.updated_at), sp.last_location_at = d.last_delivery`);
await update('tài liệu tài xế', 'UPDATE shipper_documents sd JOIN shipper_profiles sp ON sp.id = sd.shipper_id SET sd.created_at = sp.created_at, sd.verified_at = IF(sd.verified_at IS NULL, NULL, DATE_ADD(sp.created_at, INTERVAL 1 DAY))');
await update('hồ sơ đối tác', `UPDATE partner_applications pa JOIN users u ON u.id = pa.user_id
  SET pa.created_at = u.created_at, pa.updated_at = DATE_ADD(u.created_at, INTERVAL 1 DAY), pa.reviewed_at = IF(pa.reviewed_at IS NULL, NULL, DATE_ADD(u.created_at, INTERVAL 1 DAY))`);
await update('quán', `UPDATE restaurants SET created_at = FROM_UNIXTIME(${START - 14 * 86400} + MOD(id * 53, 6) * 86400), updated_at = FROM_UNIXTIME(${START} - 86400)`);
await update('chủ quán', 'UPDATE users u JOIN restaurants r ON r.owner_user_id = u.id SET u.created_at = r.created_at, u.updated_at = r.created_at');
for (const table of ['menus', 'menu_categories', 'topping_groups', 'toppings']) {
  const parent = table === 'toppings' ? 'JOIN topping_groups g ON g.id = t.group_id JOIN restaurants r ON r.id = g.restaurant_id' : 'JOIN restaurants r ON r.id = t.restaurant_id';
  await update(table, `UPDATE ${table} t ${parent} SET t.created_at = DATE_ADD(r.created_at, INTERVAL 2 HOUR), t.updated_at = DATE_ADD(r.created_at, INTERVAL 2 HOUR)`);
}
await update('món ăn', 'UPDATE menu_items t JOIN restaurants r ON r.id = t.restaurant_id SET t.created_at = DATE_ADD(r.created_at, INTERVAL 3 HOUR), t.updated_at = DATE_ADD(r.created_at, INTERVAL 3 HOUR)');
await update('biến thể', 'UPDATE menu_item_variants v JOIN menu_items m ON m.id = v.menu_item_id SET v.created_at = m.created_at, v.updated_at = m.created_at');
// Đăng nhập, token: theo vòng đời của người dùng
await update('login_history', `UPDATE login_history l JOIN users u ON u.id = l.user_id LEFT JOIN ${customerSpan} fo ON fo.user_id = u.id
  SET l.logged_in_at = IF(fo.first_order IS NULL, DATE_ADD(u.created_at, INTERVAL 600 + MOD(l.id * 977, 40000) SECOND), ${spread('l', 'id')})`);
await update('refresh_tokens', `UPDATE refresh_tokens r JOIN users u ON u.id = r.user_id LEFT JOIN ${customerSpan} fo ON fo.user_id = u.id
  SET r.created_at = IF(fo.first_order IS NULL, DATE_ADD(u.created_at, INTERVAL 600 + MOD(r.id * 977, 40000) SECOND), ${spread('r', 'id')}),
      r.expires_at = DATE_ADD(IF(fo.first_order IS NULL, DATE_ADD(u.created_at, INTERVAL 600 + MOD(r.id * 977, 40000) SECOND), ${spread('r', 'id')}), INTERVAL 7 DAY),
      r.revoked_at = NULL`);

/* ---------- 7. Mã đơn/mã thanh toán/hoá đơn phản ánh đúng ngày ---------- */
console.log('Mã đơn, mã thanh toán, hoá đơn:');
const base36 = value => Math.floor(value * 1000).toString(36).toUpperCase();
const rows = await run('SELECT o.id, o.order_code, UNIX_TIMESTAMP(o.ordered_at) AS t FROM orders o ORDER BY o.id');
for (const row of rows) {
  const suffix = String(row.order_code).split('-').slice(2).join('-');
  const code = `FD-${base36(Number(row.t))}-${suffix}`;
  await run('UPDATE orders SET order_code = ?, updated_at = updated_at WHERE id = ?', [code, row.id]);
  await run('UPDATE payments SET payment_code = CONCAT(\'PAY-\', ?), transaction_id = IF(transaction_id LIKE \'MOCK-%\', CONCAT(\'MOCK-\', ?), transaction_id), updated_at = updated_at WHERE order_id = ?', [code, Math.floor(Number(row.t) * 1000) + 30000, row.id]);
  await run('UPDATE invoices SET invoice_number = CONCAT(\'INV-\', ?) WHERE order_id = ?', [code, row.id]);
}
const tickets = await run('SELECT id, ticket_code, UNIX_TIMESTAMP(created_at) AS t FROM support_tickets');
for (const ticket of tickets) {
  const suffix = String(ticket.ticket_code).split('-').slice(2).join('-');
  await run('UPDATE support_tickets SET ticket_code = ?, updated_at = updated_at WHERE id = ?', [`SP-${base36(Number(ticket.t))}-${suffix}`, ticket.id]);
}
console.log(`  đã đổi mã cho ${rows.length} đơn và ${tickets.length} phiếu hỗ trợ`);

/* ---------- 8. Mốc ISO nhúng trong nội dung nhật ký khớp với thời điểm của dòng nhật ký ---------- */
const isoPattern = '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z';
for (const column of ['new_values', 'old_values']) {
  await update(`audit_logs.${column}`, `UPDATE audit_logs SET ${column} = CAST(REGEXP_REPLACE(CAST(${column} AS CHAR), '${isoPattern}', DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z')) AS JSON)
    WHERE ${column} IS NOT NULL AND CAST(${column} AS CHAR) REGEXP '${isoPattern}'`);
}

/* ---------- 9. Ưu đãi, combo, điểm thưởng: mốc ra mắt và thời điểm đổi điểm hợp lý ---------- */
if (RECENT_FROM) {
  console.log('Ưu đãi, combo, điểm thưởng:');
  const LAUNCH = nowNaive - RECENT_DAYS * 86400;
  const todayStart = Math.floor(nowNaive / 86400) * 86400;
  await update('combo', `UPDATE menu_items SET created_at = FROM_UNIXTIME(${LAUNCH} - 18000 - MOD(id * 977, 36000)), updated_at = created_at WHERE item_type = 'COMBO'`);
  await update('nhóm Combo ưu đãi', `UPDATE menu_categories SET created_at = FROM_UNIXTIME(${LAUNCH} - 21600), updated_at = created_at WHERE name = 'Combo ưu đãi'`);
  await update('quà đổi điểm', `UPDATE loyalty_rewards SET created_at = FROM_UNIXTIME(${LAUNCH} - 86400), updated_at = created_at`);
  // Voucher công khai mới tạo: có hiệu lực từ ngày ra mắt (không muộn hơn lần dùng đầu tiên)
  await update('voucher nền tảng/quán', `UPDATE promotions p LEFT JOIN (SELECT promotion_id, MIN(used_at) AS first_used FROM promotion_usage GROUP BY promotion_id) u ON u.promotion_id = p.id
    SET p.start_at = LEAST(FROM_UNIXTIME(${LAUNCH} + MOD(p.id * 7919, 3 * 86400)), COALESCE(DATE_SUB(u.first_used, INTERVAL 1 HOUR), FROM_UNIXTIME(${nowNaive}))),
        p.created_at = p.start_at, p.updated_at = p.start_at
    WHERE p.customer_id IS NULL AND p.created_at >= FROM_UNIXTIME(${todayStart})`);
  // Mọi voucher phải có hiệu lực bao trùm các lần đã dùng (kể cả voucher cũ có đơn dùng từ những ngày đầu)
  await update('hiệu lực bao trùm lượt dùng', `UPDATE promotions p JOIN (SELECT promotion_id, MIN(used_at) AS f, MAX(used_at) AS l FROM promotion_usage GROUP BY promotion_id) u ON u.promotion_id = p.id
    SET p.start_at = LEAST(p.start_at, DATE_SUB(u.f, INTERVAL 1 HOUR)), p.created_at = LEAST(p.created_at, DATE_SUB(u.f, INTERVAL 1 HOUR)),
        p.end_at = GREATEST(p.end_at, DATE_ADD(u.l, INTERVAL 1 HOUR))`);
  // Điểm tích: thời điểm = lúc đơn giao thành công
  await update('điểm tích', `UPDATE loyalty_transactions lt JOIN orders o ON o.id = lt.order_id SET lt.created_at = o.delivered_at WHERE lt.type = 'EARN' AND o.delivered_at IS NOT NULL`);
  // Đổi điểm: sau khi khách đã đủ điểm, trước lần dùng voucher đầu tiên, trong khoảng từ ngày ra mắt tới hiện tại
  const redeems = await run(`SELECT lt.id AS tx_id, lt.customer_id, -lt.points AS cost, lt.promotion_id, lr.valid_days, cp.user_id,
      (SELECT UNIX_TIMESTAMP(MIN(pu.used_at)) FROM promotion_usage pu WHERE pu.promotion_id = lt.promotion_id) AS first_used
    FROM loyalty_transactions lt LEFT JOIN loyalty_rewards lr ON lr.id = lt.reward_id JOIN customer_profiles cp ON cp.id = lt.customer_id WHERE lt.type = 'REDEEM' ORDER BY lt.id`);
  const earns = await run("SELECT customer_id, UNIX_TIMESTAMP(created_at) AS t, points FROM loyalty_transactions WHERE type = 'EARN' ORDER BY customer_id, created_at");
  const earnsByCustomer = new Map();
  for (const row of earns) { const list = earnsByCustomer.get(row.customer_id) ?? []; list.push([Number(row.t), Number(row.points)]); earnsByCustomer.set(row.customer_id, list); }
  const spentSoFar = new Map();
  const redeemTimes = new Map();
  let tooEarly = 0;
  for (const redeem of redeems) {
    const earned = earnsByCustomer.get(redeem.customer_id) ?? [];
    const alreadySpent = spentSoFar.get(redeem.customer_id) ?? 0;
    let running = 0;
    let enoughAt = LAUNCH;
    for (const [t, points] of earned) { running += points; if (running - alreadySpent >= Number(redeem.cost)) { enoughAt = Math.max(LAUNCH, t); break; } }
    let at = Math.max(enoughAt + 600, LAUNCH + 3600 + Math.floor(rnd() * Math.max(1, nowNaive - LAUNCH - 2 * 86400)));
    if (redeem.first_used) at = Math.min(at, Number(redeem.first_used) - 1800 - Math.floor(rnd() * 40) * 3600);
    at = Math.min(at, nowNaive - 600);
    if (running - alreadySpent < Number(redeem.cost) || at < enoughAt) tooEarly += 1;
    spentSoFar.set(redeem.customer_id, alreadySpent + Number(redeem.cost));
    redeemTimes.set(redeem.tx_id, at);
    await run('UPDATE loyalty_transactions SET created_at = FROM_UNIXTIME(?) WHERE id = ?', [at, redeem.tx_id]);
    await run('UPDATE promotions SET created_at = FROM_UNIXTIME(?), start_at = FROM_UNIXTIME(?), end_at = DATE_ADD(FROM_UNIXTIME(?), INTERVAL ? DAY), updated_at = FROM_UNIXTIME(?) WHERE id = ?',
      [at, at, at, Number(redeem.valid_days ?? 30), at, redeem.promotion_id]);
  }
  console.log(`  đã đặt lại thời điểm đổi điểm cho ${redeems.length} lượt (không đủ điểm tại thời điểm đổi: ${tooEarly})`);
  // Nhật ký của chính các yêu cầu đổi điểm: gán theo thứ tự thời gian cho từng khách
  const byUser = new Map();
  for (const redeem of redeems) { const list = byUser.get(redeem.user_id) ?? []; list.push(redeemTimes.get(redeem.tx_id)); byUser.set(redeem.user_id, list); }
  for (const [userId, times] of byUser) {
    const logs = await run("SELECT id FROM audit_logs WHERE user_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(new_values, '$.path')) REGEXP '^/loyalty/rewards/[0-9]+/redeem$' ORDER BY id", [userId]);
    times.sort((a, b) => a - b);
    for (let i = 0; i < Math.min(logs.length, times.length); i += 1) await run('UPDATE audit_logs SET created_at = FROM_UNIXTIME(?) WHERE id = ?', [times[i], logs[i].id]);
  }
  // Khách đổi điểm khi số điểm tích lũy theo dòng thời gian chưa đủ (đã dùng voucher từ sớm): ghi nhận điểm thưởng chào mừng chương trình thành viên
  const deficits = await run(`SELECT customer_id, -MIN(running) AS need FROM (SELECT customer_id, SUM(points) OVER (PARTITION BY customer_id ORDER BY created_at, id) AS running FROM loyalty_transactions) x GROUP BY customer_id HAVING MIN(running) < 0`);
  for (const row of deficits) {
    const bonus = Math.ceil(Number(row.need) / 100) * 100;
    await run("INSERT INTO loyalty_transactions (customer_id, type, points, balance_after, description, created_at) VALUES (?, 'ADJUST', ?, 0, 'Điểm chào mừng chương trình thành viên', FROM_UNIXTIME(?))", [row.customer_id, bonus, LAUNCH - 3600]);
  }
  console.log(`  điểm chào mừng cho ${deficits.length} khách có lượt đổi sớm`);
  // Số dư sau mỗi giao dịch = tổng luỹ kế theo thời gian
  await update('số dư sổ điểm', `UPDATE loyalty_transactions lt JOIN (SELECT id, SUM(points) OVER (PARTITION BY customer_id ORDER BY created_at, id) AS running FROM loyalty_transactions) x ON x.id = lt.id SET lt.balance_after = x.running`);
  await update('báo giá không phải thao tác ghi', `DELETE FROM audit_logs WHERE JSON_UNQUOTE(JSON_EXTRACT(new_values, '$.path')) = '/orders/quote'`);
}

await run('DROP TABLE tmp_ev');
const [range] = await run('SELECT MIN(ordered_at) AS first_order, MAX(ordered_at) AS last_order, COUNT(*) AS total FROM orders');
console.log('Xong. Đơn đầu:', range.first_order, '| đơn cuối:', range.last_order, '| tổng:', range.total);
await db.end();
