-- Đánh giá theo từng món ăn (khách chấm sao cho món sau khi đơn được giao).
-- Điểm trung bình và số lượt đánh giá được cập nhật tự động bằng trigger, giống restaurant_reviews.

ALTER TABLE menu_items
  ADD COLUMN rating DECIMAL(3,2) NOT NULL DEFAULT 0.00 AFTER sold_count,
  ADD COLUMN total_reviews INT UNSIGNED NOT NULL DEFAULT 0 AFTER rating;

CREATE TABLE IF NOT EXISTS menu_item_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  menu_item_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_menu_item_review_order_item (order_item_id),
  KEY idx_menu_item_review_item (menu_item_id, deleted_at, created_at),
  KEY idx_menu_item_review_customer (customer_id),
  KEY idx_menu_item_review_order (order_id),
  CONSTRAINT fk_menu_item_review_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_item_review_order_item FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_item_review_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_item_review_customer FOREIGN KEY (customer_id) REFERENCES customer_profiles (id) ON DELETE CASCADE,
  CONSTRAINT chk_menu_item_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_menu_item_review_insert$$
CREATE TRIGGER trg_menu_item_review_insert
AFTER INSERT ON menu_item_reviews
FOR EACH ROW
BEGIN
    UPDATE menu_items
    SET rating = (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM menu_item_reviews
                  WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL),
        total_reviews = (SELECT COUNT(*) FROM menu_item_reviews
                         WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL)
    WHERE id = NEW.menu_item_id;
END$$

DROP TRIGGER IF EXISTS trg_menu_item_review_update$$
CREATE TRIGGER trg_menu_item_review_update
AFTER UPDATE ON menu_item_reviews
FOR EACH ROW
BEGIN
    UPDATE menu_items
    SET rating = (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM menu_item_reviews
                  WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL),
        total_reviews = (SELECT COUNT(*) FROM menu_item_reviews
                         WHERE menu_item_id = NEW.menu_item_id AND deleted_at IS NULL)
    WHERE id = NEW.menu_item_id;
END$$

DELIMITER ;
