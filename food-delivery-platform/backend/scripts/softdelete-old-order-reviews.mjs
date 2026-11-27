/* Đợt 13: gỡ MỀM các đánh giá món lỡ thêm cho ĐƠN CŨ (order_id <= --max-order) ở đợt 12 (enrich-reviews chạy cả --add). 
   Chỉ đánh giá có id >= --from-id (id sau lần sao lưu đợt 12) và không thuộc minh.anh; trigger tự tính lại điểm.
   Dùng:  node scripts/softdelete-old-order-reviews.mjs --from-id 88094 --max-order 45488 [--dry-run] */
import { connect } from './lib/db.mjs';
const args = process.argv.slice(2);
const opt = name => Number(args[args.indexOf(name) + 1]);
const fromId = opt('--from-id'); const maxOrder = opt('--max-order'); const DRY = args.includes('--dry-run');
if (!fromId || !maxOrder) throw new Error('Thiếu --from-id / --max-order');
const db = await connect();
const where = `r.id >= ? AND r.deleted_at IS NULL AND r.order_id <= ? AND NOT EXISTS (SELECT 1 FROM orders o JOIN customer_profiles cp ON cp.id = o.customer_id JOIN users u ON u.id = cp.user_id WHERE o.id = r.order_id AND u.username = 'minh.anh')`;
const [[{ n }]] = await db.query(`SELECT COUNT(*) n FROM menu_item_reviews r WHERE ${where}`, [fromId, maxOrder]);
console.log(`Đánh giá món sẽ gỡ mềm: ${n}`);
if (DRY) { await db.end(); process.exit(0); }
const [result] = await db.query(`UPDATE menu_item_reviews r SET r.deleted_at = NOW() WHERE ${where}`, [fromId, maxOrder]);
console.log(`Đã gỡ mềm ${result.affectedRows} đánh giá món (trigger tính lại điểm món).`);
await db.end();
