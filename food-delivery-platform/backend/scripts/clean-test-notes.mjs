/* Làm sạch ghi chú còn sót từ lượt chạy Postman (khách/quán/tài xế đọc được trên giao diện) bằng UPDATE tối thiểu.
   Không đổi trạng thái/tiền; không đụng audit_logs/login_history (nhật ký kỹ thuật) và idempotency_key.
   Chạy lại không có tác dụng phụ:  node scripts/clean-test-notes.mjs */
import { connect } from './lib/db.mjs';

const db = await connect();
const steps = [
  ["orders.customer_note 'Postman E2E' -> không ghi chú", "UPDATE orders SET customer_note = NULL, updated_at = updated_at WHERE customer_note LIKE '%Postman%'"],
  ["order_status_history.note 'Postman cancel test'", "UPDATE order_status_history SET note = 'Khách huỷ đơn' WHERE note LIKE '%Postman%'"],
  ["order_cancellations.reason 'Postman cancel test'", "UPDATE order_cancellations SET reason = 'Khách huỷ đơn' WHERE reason LIKE '%Postman%'"],
  ["deliveries.delivery_note 'Postman'", "UPDATE deliveries SET delivery_note = 'Giao thành công', updated_at = updated_at WHERE delivery_note LIKE '%Postman%' AND delivery_status = 'DELIVERED'"],
  ["delivery_status_history PICKED_UP", "UPDATE delivery_status_history SET note = 'Đã lấy hàng' WHERE note LIKE '%Postman%' AND status = 'PICKED_UP'"],
  ["delivery_status_history DELIVERING", "UPDATE delivery_status_history SET note = 'Đang giao hàng' WHERE note LIKE '%Postman%' AND status = 'DELIVERING'"],
  ["delivery_status_history DELIVERED", "UPDATE delivery_status_history SET note = 'Giao thành công' WHERE note LIKE '%Postman%' AND status = 'DELIVERED'"]
];
for (const [label, sql] of steps) {
  const [result] = await db.query(sql);
  console.log(`${label}: ${result.affectedRows} dòng`);
}
await db.end();
