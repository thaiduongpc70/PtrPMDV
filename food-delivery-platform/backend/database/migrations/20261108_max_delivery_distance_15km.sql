-- Đơn có quãng đường quán → địa chỉ giao trên 15 km thì không giao.
UPDATE system_settings SET setting_value = '15' WHERE setting_key = 'max_delivery_distance';
UPDATE delivery_zones SET maximum_distance = 15, updated_at = updated_at WHERE maximum_distance > 15;
