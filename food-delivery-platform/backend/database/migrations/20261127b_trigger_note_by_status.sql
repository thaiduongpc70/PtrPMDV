-- Đợt 19: trigger trg_order_status_history ghi chú theo trạng thái mới (thay câu chung chung). Dữ liệu cũ: scripts/fix-money-consistency.mjs (bước E).
-- Áp bằng mysql client: mysql -u <user> --default-character-set=utf8mb4 <db> < database/migrations/20261127b_trigger_note_by_status.sql
SET NAMES utf8mb4;
DROP TRIGGER IF EXISTS trg_order_status_history;
DELIMITER $$
CREATE TRIGGER trg_order_status_history
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.order_status <> NEW.order_status THEN
        INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
        VALUES (NEW.id, OLD.order_status, NEW.order_status, NULL,
            CASE NEW.order_status
                WHEN 'PENDING' THEN 'Đơn hàng được tạo' WHEN 'CONFIRMED' THEN 'Quán đã xác nhận đơn' WHEN 'PREPARING' THEN 'Bếp bắt đầu chuẩn bị món'
                WHEN 'READY_FOR_PICKUP' THEN 'Món đã sẵn sàng để tài xế lấy' WHEN 'SHIPPER_ASSIGNED' THEN 'Đã có tài xế nhận đơn' WHEN 'PICKED_UP' THEN 'Tài xế đã lấy món'
                WHEN 'DELIVERING' THEN 'Đang giao hàng' WHEN 'DELIVERED' THEN 'Đã giao thành công' WHEN 'CANCELLED' THEN 'Đơn hàng đã bị huỷ' WHEN 'FAILED' THEN 'Giao hàng thất bại'
                ELSE 'Hệ thống tự ghi nhận chuyển trạng thái' END);
    END IF;
END$$
DELIMITER ;
