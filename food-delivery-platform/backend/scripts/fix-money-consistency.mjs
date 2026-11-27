/* Đợt 19: đồng bộ dữ liệu cũ về tiền và chữ (KHÔNG xoá bản ghi nào).
   B) yêu cầu hoàn trùng/vượt số đã trả -> giữ yêu cầu sớm nhất đủ số đã trả, các yêu cầu thừa đổi REJECTED kèm lý do tiếng Việt;
   A) payments/orders đồng bộ với tổng đã hoàn (REFUNDED / PARTIALLY_REFUNDED);
   C) giao dịch chưa thu của đơn huỷ -> CANCELLED, giao thất bại -> FAILED;
   D) lý do tự huỷ còn mã trạng thái thô -> nhãn tiếng Việt;  E) ghi chú trigger chung chung -> ghi chú theo new_status.
   Dùng:  node scripts/fix-money-consistency.mjs --dry-run   |   node scripts/fix-money-consistency.mjs */
import { connect } from './lib/db.mjs';
import { ORDER_STATUS_NOTE_BY_STATUS, planDuplicateRefunds, rewriteStaleText } from './lib/money-fixes.mjs';

const DRY = process.argv.includes('--dry-run');
const db = await connect();
const q = async (sql, params = []) => (await db.query(sql, params))[0];
const one = async (sql, params) => Number((await q(sql, params))[0].n);
const PAID_SQL = "SELECT order_id, SUM(amount) AS paid FROM payments WHERE status IN ('PAID', 'REFUNDED') GROUP BY order_id";

async function metrics() {
  return {
    donHoanVuot: await one(`SELECT COUNT(*) n FROM (SELECT order_id, SUM(amount) s FROM refunds WHERE status IN ('PENDING','PROCESSING','COMPLETED') GROUP BY order_id) r LEFT JOIN (${PAID_SQL}) p ON p.order_id = r.order_id WHERE r.s > COALESCE(p.paid, 0) + 0.005`),
    tongHoanCompleted: await one("SELECT COALESCE(SUM(amount),0) n FROM refunds WHERE status = 'COMPLETED'"),
    soYeuCau: await one('SELECT COUNT(*) n FROM refunds'),
    donRefundedNhungPaymentPaid: await one("SELECT COUNT(*) n FROM orders o WHERE o.payment_status = 'REFUNDED' AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.status = 'PAID')"),
    paymentsRefunded: await one("SELECT COUNT(*) n FROM payments WHERE status = 'REFUNDED'"),
    paidRevenueOrders: await one("SELECT COALESCE(SUM(total_amount),0) n FROM orders WHERE payment_status = 'PAID'"),
    giaoDichMoCuaDonDaDong: await one("SELECT COUNT(*) n FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.order_status IN ('CANCELLED','FAILED') AND p.status IN ('PENDING','PROCESSING')"),
    maThoTrongLyDo: await one("SELECT (SELECT COUNT(*) FROM order_status_history WHERE note LIKE '%SHIPPER_ASSIGNED%' OR note LIKE '%READY_FOR_PICKUP%' OR note LIKE '%trạng thái PREPARING%') + (SELECT COUNT(*) FROM refunds WHERE reason LIKE '%Đơn ở trạng thái %') + (SELECT COUNT(*) FROM order_cancellations WHERE reason LIKE '%Đơn ở trạng thái %') + (SELECT COUNT(*) FROM notifications WHERE message LIKE '%Đơn ở trạng thái %') n"),
    ghiChuTriggerChung: await one("SELECT COUNT(*) n FROM order_status_history WHERE note = 'Hệ thống tự ghi nhận chuyển trạng thái'"),
    banGhi: await q("SELECT (SELECT COUNT(*) FROM refunds) refunds, (SELECT COUNT(*) FROM payments) payments, (SELECT COUNT(*) FROM orders) orders, (SELECT COUNT(*) FROM order_status_history) history, (SELECT COUNT(*) FROM notifications) notifications, (SELECT COUNT(*) FROM order_cancellations) cancellations").then(r => r[0])
  };
}

console.log('TRƯỚC:', JSON.stringify(await metrics()));

// B) hoàn trùng/vượt
const rows = await q(`SELECT f.id, f.order_id, f.amount, f.status, f.reason, f.created_at, COALESCE(p.paid, 0) paid FROM refunds f LEFT JOIN (${PAID_SQL}) p ON p.order_id = f.order_id WHERE f.status IN ('PENDING','PROCESSING','COMPLETED') ORDER BY f.order_id, f.created_at, f.id`);
const plan = planDuplicateRefunds(rows);
console.log(`B) đơn có yêu cầu thừa: ${new Set(plan.map(p => p.orderId)).size}; yêu cầu sẽ đổi REJECTED: ${plan.length}; số tiền hoàn trùng bỏ: ${plan.reduce((s, p) => s + p.amount, 0)}`);
console.log('   ví dụ:', plan.slice(0, 3).map(p => `đơn #${p.orderId}: giữ #${p.keptId}, từ chối #${p.id} (${p.amount})`).join(' | '));
if (!DRY && plan.length) {
  await db.query('DROP TABLE IF EXISTS tmp_dup');
  await db.query('CREATE TABLE tmp_dup (id BIGINT UNSIGNED PRIMARY KEY, kept BIGINT UNSIGNED NOT NULL)');
  for (let i = 0; i < plan.length; i += 1000) await db.query('INSERT INTO tmp_dup VALUES ?', [plan.slice(i, i + 1000).map(p => [p.id, p.keptId])]);
  const [r] = await db.query("UPDATE refunds f JOIN tmp_dup t ON t.id = f.id SET f.status = 'REJECTED', f.reason = CONCAT(COALESCE(f.reason, ''), ' — Trùng lặp: từ chối ngày 27/11/2026 vì đơn đã được hoàn ở yêu cầu #', t.kept)");
  await db.query('DROP TABLE tmp_dup');
  console.log('   -> đã đổi', r.affectedRows);
}

// A) đồng bộ payments/orders theo tổng đã hoàn (sau khi đã loại bản trùng; ở dry-run tính theo kế hoạch)
const excluded = new Set(plan.map(p => p.id));
const done = await q(`SELECT f.id, f.order_id, f.amount, COALESCE(p.paid, 0) paid, o.payment_status FROM refunds f JOIN orders o ON o.id = f.order_id LEFT JOIN (${PAID_SQL}) p ON p.order_id = f.order_id WHERE f.status = 'COMPLETED'`);
const byOrder = new Map();
for (const row of done) { if (excluded.has(Number(row.id))) continue; const entry = byOrder.get(Number(row.order_id)) ?? { paid: Number(row.paid), sum: 0, status: row.payment_status }; entry.sum += Number(row.amount); byOrder.set(Number(row.order_id), entry); }
const full = []; const partial = [];
for (const [orderId, e] of byOrder) (e.sum >= e.paid - 0.005 ? full : partial).push(orderId);
console.log(`A) đơn hoàn đủ: ${full.length}; hoàn một phần: ${partial.length}`);
if (!DRY) {
  for (let i = 0; i < full.length; i += 1000) {
    const ids = full.slice(i, i + 1000);
    await db.query("UPDATE payments SET status = 'REFUNDED', updated_at = updated_at WHERE order_id IN (?) AND status = 'PAID'", [ids]);
    await db.query("UPDATE orders SET payment_status = 'REFUNDED', updated_at = updated_at WHERE id IN (?) AND payment_status <> 'REFUNDED'", [ids]);
  }
  if (partial.length) await db.query("UPDATE orders SET payment_status = 'PARTIALLY_REFUNDED', updated_at = updated_at WHERE id IN (?)", [partial]);
}

// C) giao dịch chưa thu của đơn đã đóng
const closed = await q("SELECT o.order_status, COUNT(*) n FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.order_status IN ('CANCELLED','FAILED') AND p.status IN ('PENDING','PROCESSING') GROUP BY o.order_status");
console.log('C) giao dịch đóng lại:', JSON.stringify(closed));
if (!DRY) {
  await db.query("UPDATE payments p JOIN orders o ON o.id = p.order_id SET p.status = IF(o.order_status = 'FAILED', 'FAILED', 'CANCELLED'), p.updated_at = p.updated_at WHERE o.order_status IN ('CANCELLED','FAILED') AND p.status IN ('PENDING','PROCESSING')");
}

// D) chữ tự huỷ có mã trạng thái thô
let changedText = 0;
for (const [table, column] of [['order_status_history', 'note'], ['refunds', 'reason'], ['order_cancellations', 'reason'], ['notifications', 'message']]) {
  const found = await q(`SELECT id, ${column} v FROM ${table} WHERE ${column} LIKE '%Đơn ở trạng thái %'`);
  const updates = found.map(row => ({ id: row.id, next: rewriteStaleText(row.v) })).filter((u, i) => u.next !== found[i].v);
  console.log(`D) ${table}.${column}: ${found.length} dòng khớp, đổi được ${updates.length}`, updates.slice(0, 1).map(u => `"${u.next}"`).join(''));
  changedText += updates.length;
  if (!DRY) for (const u of updates) await db.query(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [u.next, u.id]);
}

// E) ghi chú trigger theo new_status
const generic = await q("SELECT new_status, COUNT(*) n FROM order_status_history WHERE note = 'Hệ thống tự ghi nhận chuyển trạng thái' GROUP BY new_status");
console.log('E) ghi chú theo trạng thái:', generic.map(r => `${r.new_status}=${r.n} -> "${ORDER_STATUS_NOTE_BY_STATUS[r.new_status]}"`).join(' | '));
if (!DRY) {
  for (const row of generic) await db.query("UPDATE order_status_history SET note = ? WHERE note = 'Hệ thống tự ghi nhận chuyển trạng thái' AND new_status = ?", [ORDER_STATUS_NOTE_BY_STATUS[row.new_status], row.new_status]);
}
console.log(DRY ? 'DRY-RUN: chưa thay đổi gì.' : `Đổi chữ: ${changedText} dòng.`);
if (!DRY) console.log('SAU:', JSON.stringify(await metrics()));
await db.end();
