-- Áp dụng bằng mysql client (mysql < file), không dùng driver gộp nhiều câu lệnh: trigger một câu lệnh sẽ bị lưu kèm dấu ";" thừa làm lỗi khi khôi phục từ mysqldump.
-- Ưu đãi kiểu ShopeeFood: voucher cá nhân/khách mới, tích điểm đổi thưởng, combo giảm giá.

-- 1. Voucher: gắn riêng cho một khách (voucher đổi từ điểm) hoặc chỉ dành cho đơn đầu tiên
ALTER TABLE promotions
  ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER restaurant_id,
  ADD COLUMN first_order_only BOOLEAN NOT NULL DEFAULT FALSE AFTER usage_per_customer,
  ADD CONSTRAINT fk_promotion_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;

-- 2. Danh mục quà đổi bằng điểm
CREATE TABLE loyalty_rewards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    points_cost INT UNSIGNED NOT NULL,
    discount_type ENUM('PERCENT', 'FIXED_AMOUNT', 'FREE_DELIVERY') NOT NULL,
    discount_value DECIMAL(15,2) NOT NULL,
    max_discount DECIMAL(15,2) NULL,
    minimum_order DECIMAL(15,2) NOT NULL DEFAULT 0,
    valid_days INT UNSIGNED NOT NULL DEFAULT 30,
    stock INT UNSIGNED NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_reward_points CHECK (points_cost > 0)
) ENGINE=InnoDB;

-- 3. Sổ điểm thưởng (EARN: +điểm khi đơn giao thành công, REDEEM: -điểm khi đổi quà)
CREATE TABLE loyalty_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    type ENUM('EARN', 'REDEEM', 'ADJUST') NOT NULL,
    points INT NOT NULL,
    balance_after INT NOT NULL,
    order_id BIGINT UNSIGNED NULL,
    reward_id BIGINT UNSIGNED NULL,
    promotion_id BIGINT UNSIGNED NULL,
    description VARCHAR(300),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_loyalty_order_earn (order_id, type),
    KEY idx_loyalty_customer (customer_id, created_at),
    CONSTRAINT fk_loyalty_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_loyalty_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_loyalty_reward FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Combo là một món bán trọn gói (đi qua giỏ/đơn/đánh giá như món thường) + danh sách món thành phần
ALTER TABLE menu_items
  ADD COLUMN item_type ENUM('DISH', 'COMBO') NOT NULL DEFAULT 'DISH' AFTER description;

CREATE TABLE menu_item_combo_components (
    combo_item_id BIGINT UNSIGNED NOT NULL,
    component_item_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (combo_item_id, component_item_id),
    CONSTRAINT chk_combo_quantity CHECK (quantity BETWEEN 1 AND 20),
    CONSTRAINT fk_combo_item FOREIGN KEY (combo_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_combo_component FOREIGN KEY (component_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Tích điểm hồi tố cho các đơn đã giao: 1 điểm / 1.000đ tiền món (trước khi bật trigger để không cộng đôi)
INSERT INTO loyalty_transactions (customer_id, type, points, balance_after, order_id, description, created_at)
SELECT customer_id, 'EARN', pts, SUM(pts) OVER (PARTITION BY customer_id ORDER BY delivered_at, id), id,
       CONCAT('Tích điểm đơn ', order_code), delivered_at
FROM (SELECT id, customer_id, order_code, delivered_at, FLOOR(subtotal / 1000) AS pts FROM orders
      WHERE order_status = 'DELIVERED' AND delivered_at IS NOT NULL AND deleted_at IS NULL) delivered
WHERE pts > 0;

UPDATE customer_profiles cp
LEFT JOIN (SELECT customer_id, SUM(points) AS total FROM loyalty_transactions GROUP BY customer_id) lt ON lt.customer_id = cp.id
SET cp.loyalty_points = COALESCE(lt.total, 0);

-- 6. Từ nay đơn chuyển sang DELIVERED thì tự cộng điểm; sổ điểm cập nhật số dư của khách
-- Số dư sau giao dịch được tính ở BEFORE INSERT (MySQL không cho câu lệnh vừa đọc vừa bị trigger sửa customer_profiles)
CREATE TRIGGER trg_loyalty_transaction_before BEFORE INSERT ON loyalty_transactions FOR EACH ROW
  SET NEW.balance_after = (SELECT loyalty_points FROM customer_profiles WHERE id = NEW.customer_id) + NEW.points;

CREATE TRIGGER trg_order_delivered_loyalty AFTER UPDATE ON orders FOR EACH ROW
  INSERT INTO loyalty_transactions (customer_id, type, points, balance_after, order_id, description)
  SELECT NEW.customer_id, 'EARN', FLOOR(NEW.subtotal / 1000), 0, NEW.id, CONCAT('Tích điểm đơn ', NEW.order_code)
  FROM DUAL WHERE NEW.order_status = 'DELIVERED' AND OLD.order_status <> 'DELIVERED' AND FLOOR(NEW.subtotal / 1000) > 0;

CREATE TRIGGER trg_loyalty_transaction_balance AFTER INSERT ON loyalty_transactions FOR EACH ROW
  UPDATE customer_profiles SET loyalty_points = GREATEST(0, CAST(loyalty_points AS SIGNED) + NEW.points) WHERE id = NEW.customer_id;
