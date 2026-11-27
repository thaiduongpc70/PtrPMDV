-- Đợt 18: ghi chú do trigger trg_order_status_history ghi cho đơn MỚI bằng tiếng Việt (chuỗi cũ: 'Status automatically recorded by trigger').
-- Dữ liệu cũ được dịch bằng scripts/translate-legacy-notes.mjs. Áp bằng mysql client (không dùng driver gộp câu lệnh):
--   mysql -u <user> --default-character-set=utf8mb4 <db> < database/migrations/20261127_vietnamese_trigger_note.sql
SET NAMES utf8mb4;
DROP TRIGGER IF EXISTS trg_order_status_history;
DELIMITER $$
CREATE TRIGGER trg_order_status_history
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.order_status <> NEW.order_status THEN
        INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
        VALUES (NEW.id, OLD.order_status, NEW.order_status, NULL, 'Hệ thống tự ghi nhận chuyển trạng thái');
    END IF;
END$$
DELIMITER ;
