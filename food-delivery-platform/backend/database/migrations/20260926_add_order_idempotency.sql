ALTER TABLE orders
    ADD COLUMN idempotency_key VARCHAR(100) NULL AFTER order_code,
    ADD UNIQUE KEY uk_order_customer_idempotency (customer_id, idempotency_key);
