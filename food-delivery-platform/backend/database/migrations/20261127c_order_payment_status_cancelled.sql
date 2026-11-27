-- Đợt 20: đơn đã huỷ chưa thu tiền có trạng thái thanh toán CANCELLED (trước đây giữ PENDING). Dữ liệu cũ: scripts/close-order-payment-status.mjs.
-- Áp bằng mysql client: mysql -u <user> --default-character-set=utf8mb4 <db> < database/migrations/20261127c_order_payment_status_cancelled.sql
ALTER TABLE orders MODIFY payment_status ENUM('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED','CANCELLED') NOT NULL DEFAULT 'PENDING';
