-- Ghi chú và tuỳ chọn giao hàng ở cấp đơn (tham khảo ShopeeFood/GrabFood):
--   customer_note (đã có)  -> ghi chú cho quán
--   shipper_note           -> ghi chú cho tài xế (số nhà, gửi bảo vệ, gọi trước khi tới...)
--   need_utensils          -> có lấy dụng cụ ăn uống (đũa, muỗng, ống hút) hay không
--   contactless_delivery   -> giao không tiếp xúc (để trước cửa)
ALTER TABLE orders
  ADD COLUMN shipper_note VARCHAR(500) NULL AFTER customer_note,
  ADD COLUMN need_utensils BOOLEAN NOT NULL DEFAULT TRUE AFTER shipper_note,
  ADD COLUMN contactless_delivery BOOLEAN NOT NULL DEFAULT FALSE AFTER need_utensils;
