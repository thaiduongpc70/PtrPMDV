-- Đơn đăng ký đối tác: tài xế / nhà hàng. Tài khoản ở trạng thái PENDING cho tới khi admin duyệt.
CREATE TABLE IF NOT EXISTS partner_applications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_type ENUM('SHIPPER', 'RESTAURANT') NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    applicant_name VARCHAR(150) NOT NULL,
    payload JSON NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    review_note VARCHAR(500) NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_partner_app_status (status, application_type),
    CONSTRAINT fk_partner_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_partner_app_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
