-- Nhà hàng điều phối shipper + xem thanh toán/hóa đơn; khách hàng xem thanh toán/hóa đơn của chính mình.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code IN ('delivery.assign', 'delivery.location.view', 'payment.view');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE code IN ('payment.view');
