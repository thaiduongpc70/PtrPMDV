# Quy tắc nghiệp vụ

Nguồn: code `backend/src` (file ghi trong ngoặc) + trigger trong DB (`db-schema.md`, mục Trigger). Sửa công thức phải sửa ở **một chỗ** rồi cập nhật tài liệu này.

## 1. Máy trạng thái đơn hàng (`orders.order_status`)

```
PENDING ─► CONFIRMED ─► PREPARING ─► READY_FOR_PICKUP ─► SHIPPER_ASSIGNED ─► PICKED_UP ─► DELIVERING ─► DELIVERED
   │           │            │                                                     │            │
   └─ CANCELLED (khách huỷ hoặc quán từ chối: PENDING/CONFIRMED/PREPARING)        └────────────┴─► FAILED (giao thất bại)
```

- Quán chỉ được: `PENDING→CONFIRMED|CANCELLED`, `CONFIRMED→PREPARING|CANCELLED`, `PREPARING→READY_FOR_PICKUP` (`order.validation.js#restaurantOrderTransitions`).
- Gán tài xế → `SHIPPER_ASSIGNED`; tài xế cập nhật `PICKED_UP`, `DELIVERING`, `DELIVERED`/`FAILED` qua `POST /api/shippers/deliveries/:id/status` (`operations.routes.js`).
- Mỗi lần đổi trạng thái, trigger `trg_order_status_history` ghi **1 dòng** vào `order_status_history`; code ứng dụng chỉ **UPDATE** dòng đó để thêm `changed_by`/`note` (không INSERT thêm — từng gây lịch sử trùng).
- `deliveries.delivery_status`: `PENDING, ASSIGNED, ACCEPTED, PICKED_UP, DELIVERING, DELIVERED, FAILED, CANCELLED`; trigger `trg_delivery_status_sync` đồng bộ sang đơn.
- Thanh toán: `orders.payment_status` (`PENDING/PAID/FAILED/REFUNDED…`), phương thức `COD, BANK_TRANSFER, MOMO, VNPAY, ZALOPAY, CARD, WALLET`. Online đi qua **sandbox** `mock-pay`; COD ghi `cod_transactions` (tài xế thu → `COLLECTED`, admin đối soát → `SETTLED`).

## 2. Công thức tiền (`shared/pricing/delivery-fee.js`, `engagement/voucher.js#priceOrder`, `orders/order.repository.js#checkoutForUser`)

```
tiền món (subtotal)  = Σ (đơn giá món + giá size + Σ topping) × số lượng
phí giao (delivery_fee) = base + max(0, ceil(km − 3)) × per_km      # km = haversine(quán, địa chỉ); > max_delivery_distance ⇒ từ chối
thuế                 = subtotal × tax_rate%
giảm giá (discount)  = voucher % / trực tiếp (≤ subtotal, ≤ max_discount)  hoặc  freeship (≤ phí giao, ≤ max_discount)
tổng thanh toán      = subtotal + delivery_fee + service_fee + tax − discount
```

- **Freeship không đặt phí giao = 0**: `delivery_fee` luôn là phí thật (để tài xế được trả đủ), phần miễn nằm trong `discount_amount`. (Dữ liệu cũ sai đã sửa bằng `scripts/repair-freeship-orders.mjs`.)
- `base`, `per_km`, `max_delivery_distance`, `tax_rate` đọc từ `system_settings`; 3 km đầu là hằng `INCLUDED_KM` trong `delivery-fee.js`.
- Đơn tối thiểu của quán: `restaurants.minimum_order` (checkout trả `MINIMUM_ORDER_NOT_MET`).
- Chống tạo đơn trùng: header `Idempotency-Key` (cột `orders.idempotency_key`).

## 3. Voucher (`promotions`, `promotion_usage`; `engagement/voucher.js#listVouchers`)

| Loại | Ai tạo | Ràng buộc |
|---|---|---|
| Toàn sàn (`restaurant_id NULL`, `customer_id NULL`) | Admin (`POST /api/admin/manage/promotions`) | Giảm % / trực tiếp: **không giới hạn hạn ngạch và ngày** (`usage_limit NULL`, `end_at 2099`). **Freeship** (`FREE_DELIVERY`): bắt buộc `usage_limit` và `end_at`. `first_order_only` = chỉ khách chưa có đơn nào (không tính huỷ/thất bại) |
| Của quán (`restaurant_id`) | Chủ quán | Chỉ `PERCENT`/`FIXED_AMOUNT`, **bắt buộc** `usage_limit` 1–100000 và hiệu lực ≤ 90 ngày; gia hạn qua `/extend` (+ngày ≤ 90 từ hôm nay, +hạn ngạch) |
| Cá nhân (`customer_id`) | Hệ thống khi khách đổi điểm | Dùng 1 lần, hạn theo `loyalty_rewards.valid_days`; không hiện ở danh sách công khai |

- Hợp lệ khi: `ACTIVE`, trong `[start_at, end_at]`, còn hạn ngạch (`used_count < usage_limit`, trigger `trg_promotion_usage_counter` tăng `used_count`), khách chưa dùng quá `usage_per_customer`, đủ `minimum_order`.
- `GET /api/customer/vouchers` trả cả voucher **chưa đủ điều kiện** kèm `shortfall` (cần mua thêm).
- Chi phí khuyến mãi: voucher toàn sàn do **nền tảng** chịu; voucher của quán do **quán** chịu (trừ vào quyết toán).

## 4. Điểm thưởng (`loyalty_*`)

- Tích: **1 điểm / 1.000đ tiền món** khi đơn chuyển `DELIVERED` (`trg_order_delivered_loyalty` → `loyalty_transactions` loại `EARN`).
- Đổi: `POST /api/customer/loyalty/rewards/:id/redeem` (transaction): khoá hồ sơ khách + quà, trừ điểm (`REDEEM`, âm), tạo voucher cá nhân, trừ `stock` nếu có.
- `customer_profiles.loyalty_points` được trigger `trg_loyalty_transaction_balance` cập nhật; `balance_after` tính ở `trg_loyalty_transaction_before`. **Không** sửa số dư tay; loại `ADJUST` dùng cho thưởng/điều chỉnh.
- Bất biến kiểm được: `Σ loyalty_transactions.points = customer_profiles.loyalty_points` và `balance_after ≥ 0`.

## 5. Combo

- Combo là một dòng `menu_items` có `item_type='COMBO'` + thành phần ở `menu_item_combo_components (combo_item_id, component_item_id, quantity)`. Đi qua giỏ/đơn/đánh giá như món thường.
- Giá lẻ = Σ giá thành phần × số lượng (tính khi đọc); `discount_price` = giá combo; "tiết kiệm" = giá lẻ − giá bán. Thành phần phải là món thường (`DISH`) của cùng quán (`PUT …/menu-items/:id/combo`).

## 6. Tuỳ chọn món (topping/size)

- `topping_groups(min_select, max_select, required)` gắn món qua `menu_item_topping_groups`. Server kiểm khi thêm giỏ: thiếu nhóm bắt buộc ⇒ 400 `Topping selection does not meet the group limits`. Frontend khoá chọn vượt `max` và báo lỗi trước khi gửi.
- Ghi chú: `cart_items.note`/`order_items.note` (≤ 500 ký tự); `orders.customer_note` (cho quán), `orders.shipper_note` (cho tài xế), `need_utensils`, `contactless_delivery`.

## 7. Đối soát & doanh thu

- **Quyết toán quán theo tuần** (`generateSettlements`, `POST /api/settlements/admin/settlements/generate`): `gross_sales = Σ subtotal` của đơn `DELIVERED` giao trong kỳ (phí giao **không** thuộc quán); `commission = Σ restaurant_commissions` (`trg_create_restaurant_commission`, = % hoa hồng × subtotal, mặc định 15%); `refund_amount` = hoàn tiền của đơn đã giao; `adjustment_amount = −Σ giảm giá của voucher do quán cấp`; `net = gross − commission − refund + adjustment`.
- **Doanh thu ròng nền tảng** (Admin → Báo cáo) = hoa hồng − chi phí voucher toàn sàn.
- **Thu nhập tài xế**: `shipper_earnings.net_earning = delivery_fee` của chuyến `DELIVERED` (ghi khi giao xong, cộng vào `shipper_profiles.total_earnings` trong code ứng dụng; `total_deliveries` do trigger cộng).
- **Hoàn tiền** (`refunds`): tạo khi huỷ/thất bại đơn đã thanh toán online; admin xử lý `PENDING→PROCESSING→COMPLETED|REJECTED`.

## 8. Số liệu do trigger duy trì (không cập nhật tay)

`restaurants.total_orders/total_revenue/rating/total_reviews`, `customer_profiles.total_orders/total_spent/loyalty_points`, `shipper_profiles.total_deliveries/rating/total_reviews/current_*`, `menu_items.sold_count/rating/total_reviews`, `promotions.used_count`, `restaurant_commissions` (khi đơn DELIVERED), `order_status_history`, `delivery_status_history`.
Nếu cần dựng lại số liệu sau khi sửa dữ liệu hàng loạt: `scripts/finalize-realistic-data.mjs` tính lại điểm TB/số đánh giá của món, quán, tài xế và thu nhập/số chuyến tài xế.

## 9. Giờ mở cửa & trạng thái mở/đóng

`restaurants.opening_time/closing_time` (cho phép qua nửa đêm: `closing < opening`). `isOpen` tính ở `catalog.repository.js#isOpenNow` theo giờ máy chủ; bộ lọc `openNow=1` có biểu thức SQL tương ứng. **Checkout chưa chặn đặt đơn khi quán đóng cửa.**
