-- Trigger trg_order_status_history / trg_delivery_status_sync và code ứng dụng cùng ghi lịch sử trạng thái nên mỗi bước bị ghi hai lần.
-- Từ bản này code chỉ bổ sung người thực hiện/ghi chú vào dòng do trigger tạo. Migration này gỡ các dòng trigger trùng đã có,
-- chỉ khi đã có dòng do ứng dụng ghi cho cùng bước (bước chỉ có dòng trigger thì giữ nguyên).

DELETE h
FROM order_status_history h
INNER JOIN (
    SELECT order_id, new_status FROM order_status_history
    WHERE note IS NULL OR note <> 'Status automatically recorded by trigger'
    GROUP BY order_id, new_status
) app ON app.order_id = h.order_id AND app.new_status = h.new_status
WHERE h.note = 'Status automatically recorded by trigger';

DELETE h
FROM delivery_status_history h
INNER JOIN (
    SELECT delivery_id, status FROM delivery_status_history
    WHERE note IS NULL OR note NOT IN ('Automatically recorded', 'GPS update')
    GROUP BY delivery_id, status
) app ON app.delivery_id = h.delivery_id AND app.status = h.status
WHERE h.note = 'Automatically recorded';
