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

## 10. Giới hạn giao hàng, quán đóng cửa, cam kết đối tác (cập nhật 08/11/2026)

- **Trên 15 km không giao**: `system_settings.max_delivery_distance` (mặc định `DEFAULT_MAX_KM = 15` trong `shared/pricing/delivery-fee.js`; đúng 15,00 km vẫn giao, > 15 km thì không). Khoảng cách = đường chim bay quán → địa chỉ. Kiểm ở `checkoutForUser` (lỗi `ADDRESS_TOO_FAR`, nêu số km) và `/orders/quote` (`outOfRange`, `maxDeliveryKm`). Giao diện: `/api/catalog/storefront.delivery.maxKm` → nhãn "Ngoài phạm vi giao" ở danh sách quán, cảnh báo + khoá nút Đặt hàng ở giỏ.
- **Quán đóng cửa không cho đặt**: `checkoutForUser` gọi `shared/time/opening-hours.js#isOpenNow` → lỗi `RESTAURANT_CLOSED`. Script dựng dữ liệu cần đặt ngoài giờ chạy với `ALLOW_ORDER_WHEN_CLOSED=1`.
- **Cam kết đối tác**: nội dung ở `modules/partners/commitments.js` (nhà hàng, tài xế — khách hàng không cần), API `GET /api/partners/commitments/:kind`. Đăng ký đối tác bắt buộc kèm `commitment {kind, version, accepted, readToEnd}` (giao diện chỉ bật nút đồng ý khi kéo tới cuối); máy chủ lưu `commitment` (phiên bản + thời điểm) vào `partner_applications.payload`. Sửa nội dung → tăng `COMMITMENT_VERSION`.
- **Địa chỉ mặc định = Hưng Yên**: tỉnh mặc định là tỉnh có nhiều quán nhất trong DB (`/api/catalog/cities`); khu vực (cột `district`) là phường/xã.

## 11. Topping đúng món (cập nhật 08/11/2026)

- Topping **thêm có giá** (nhóm `min_select=0`, `max_select` = số topping của nhóm → **không giới hạn số lượng chọn**) chỉ gắn cho đúng loại món: trà sữa → trân châu/thạch/kem cheese; cà phê → shot espresso/sữa đặc/kem muối; nước ép/sinh tố → hạt chia/sữa chua…; pizza → phô mai/nấm/xúc xích; mì Ý, burger, cơm, bún/phở… mỗi loại một nhóm riêng. Luật nằm trong `scripts/fix-menu-toppings.mjs#plan`.
- Nhóm **chọn đúng 1**: "Mức đường" chỉ đồ uống, "Mức đá" chỉ đồ uống lạnh, "Độ cay" chỉ món mặn hợp lý, "Loại đế" chỉ pizza. Combo dùng chung các nhóm của món trong combo + nhóm topping chính của quán (`enrich-combo-options.mjs`).
- Dòng topping trong đơn cũ (`order_item_toppings`) đã được chuyển sang topping hợp lệ cùng món, **giữ nguyên số tiền** (không đổi tổng đơn).

## 12. Đánh giá

- Mỗi món có nhiều đánh giá (trung bình ~65, 28–170) từ các đơn đã giao; bình luận sinh theo loại món/quán (`scripts/data/review-comments.mjs`: đồ uống → "uống/ly/mát lạnh", món ăn → "ăn/tô/phần", món nóng → "nóng hổi", đồ chiên → "còn giòn"). Chạy lại: `node scripts/enrich-reviews.mjs`.
- Giao diện: thanh phân bố sao bấm được → lọc đúng số sao (`?rating=1..5` trên `/api/catalog/menu-items/:id/reviews` và `/api/catalog/restaurants/:id/reviews`, `summary` luôn là tổng); danh sách đánh giá có thanh cuộn riêng, cuộn tới cuối tự tải thêm (`app.js#mountReviews`).

## 13. Đợt 1 (22/11/2026): huỷ đơn quá hạn, tìm kiếm, vùng giao, bảng phí

- **Tự huỷ đơn quá hạn**: job nền (`job.worker.js`, 30 giây/lần) gọi `orders/order-cancellation.js#cancelExpiredPendingOrders`: đơn `PENDING` + `payment_status = PENDING` tạo quá `PENDING_ORDER_TIMEOUT_MINUTES` (mặc định 30, 0 = tắt) bị huỷ bằng **cùng luồng huỷ** của `POST /api/payments/orders/:id/cancel` (`cancelOrderInTransaction`), `reason_code = SYSTEM_TIMEOUT`, `cancelled_by = NULL`, khách được thông báo. Đơn đã thanh toán online không bị huỷ tự động. Khoá dòng đơn và kiểm lại trạng thái trước khi huỷ (quán vừa xác nhận thì bỏ qua).
- **Thứ tự xếp hạng tìm kiếm** (`catalog/search-text.js`): từ khoá chuẩn hoá NFC, tách từ, **mọi từ phải khớp (AND)** trên tên/mô tả/danh mục/tên món (quán) hoặc tên món/mô tả/tên quán/nhóm món (món). Từ **có dấu** khớp đúng dấu (phở ≠ phố ≠ phô); từ **không dấu** bỏ qua dấu (đ ≡ d). Điểm: tên chứa nguyên cụm đúng dấu +40 > tên chứa cụm không dấu +30 > tên khớp đủ từ +20 > danh mục/món/quán liên quan +10 > mô tả +5; bằng điểm giữ thứ tự theo `sort`. Không có kết quả ⇒ `suggestions` (bỏ bớt từ lạ, danh mục khớp, món gần giống, danh mục nhiều quán nhất). Không cần cột không dấu: dùng collation `utf8mb4_0900_as_ci` (có dấu) và `REPLACE(đ→d)` (không dấu).
- **Sort/lọc quán**: `sort` = featured, nearest, popular, rating (= top_rated), top_rated, fastest, promo, price_asc, price_desc (giá = trung bình giá bán các món thường đang bán, trả `averagePrice`). Giá trị lạ ⇒ 400 tiếng Việt liệt kê giá trị hợp lệ. Lọc: `discount=1` (có món `discount_price < base_price`, kể cả combo), `priceMin/priceMax` (theo giá trung bình quán; với món: theo giá bán), `vegetarian=1` (tên món/danh mục/quán bắt đầu bằng "chay"), `spicy=1` (tên món có từ "cay", phân biệt dấu). Chay/cay **suy ra từ tên**, không có cột riêng.
- **Vùng giao**: có `lat`/`lng` ⇒ mỗi quán có `distanceKm`, `outOfDeliveryRange` (> `system_settings.max_delivery_distance`), quán ngoài vùng **xếp cuối**; `hideOutOfRange=1` ẩn hẳn. Kết quả kèm `maxDeliveryKm`.
- **Bảng phí giao theo km**: `GET /api/catalog/delivery-fees` (cũng nằm ở `/storefront.delivery.tiers`) sinh từ `deliveryFeeTable()` gọi chính `deliveryFeeFor`; giao diện giỏ hàng hiển thị, không số cứng.
- **Voucher**: voucher toàn sàn giảm %/trực tiếp nay có **hạn thật** (mặc định +90 ngày, không còn 2099; `PATCH /api/admin/manage/promotions/:id` nhận thêm `endAt/description/name/minimumOrder`); giao diện hiện "Còn X ngày". Voucher quán: mã giảm % có hậu tố `PT` (tránh nhầm 8K/8%), đơn tối thiểu ≥ 2× đơn tối thiểu của quán và ≥ 4× mức giảm tối đa, mô tả tự sinh có nghĩa. Bản trùng ngữ nghĩa (cùng quán, % và tiền cùng con số) bị `INACTIVE` (không xoá).
- **Giờ mở cửa** (viết lại §9): tính theo **Asia/Ho_Chi_Minh cố định** (`shared/time/opening-hours.js`), ưu tiên `restaurant_operating_hours` theo thứ (1 = Thứ hai … 7 = Chủ nhật, có phần giờ khuya của ca qua nửa đêm), không có thì `opening/closing_time`. Bộ lọc `openNow=1` và `isOpen` dùng cùng một quy tắc.
- **Danh sách đơn khách**: `GET /api/customer/orders?pageSize&pageNumber` (mặc định 20, tối đa 100) trả `totalItems` = COUNT thật, `customerId`, `items[]` (ảnh, biến thể, topping, `available`) và `canReorder`.

## 14. ĐỂ SAU / TỪ CHỐI (chưa làm có chủ đích)

| Hạng mục | Quyết định |
|---|---|
| Thanh toán trực tuyến thật (MoMo/VNPay/ZaloPay/thẻ) | ĐỂ SAU — hiện là sandbox, giao diện đã ghi rõ "không trừ tiền thật" |
| Email thật (xác minh, thông báo), OAuth/Google | ĐỂ SAU — mã xác minh trả trực tiếp, không gửi mail; không OAuth |
| WebSocket/realtime thật | ĐỂ SAU — dùng polling |
| Điểm thưởng nâng cao (hết hạn điểm, hạng thành viên) | ĐỂ SAU |
| Đặt hẹn giờ giao | TỪ CHỐI đợt này (cần mô hình lịch + giữ chỗ tài xế) |
| Lọc chay/cay bằng cột riêng | ĐỂ SAU — hiện suy ra từ tên món |

## 15. Đợt 2 (22/11/2026)

- **Thông báo lỗi tiếng Việt tập trung**: `src/shared/http/messages.js` (`M.<khoá>`, chuỗi hoặc hàm nhận tham số); mã lỗi/tên trường kỹ thuật giữ nguyên. Thêm lỗi mới: thêm vào bảng, không viết chuỗi tiếng Anh trong `HttpError`.
- **Báo giá/voucher với `addressId` lạ**: `POST /customer/orders/quote` và `GET /customer/vouchers` trả **404 "Không tìm thấy địa chỉ giao hàng"** (không ngầm dùng phí mặc định). Khách đăng nhập mà không gửi `lat/lng` thì `GET /catalog/restaurants` lấy địa chỉ mặc định làm gốc tính `distanceKm` (`originSource = DEFAULT_ADDRESS`); khách ẩn danh vẫn null. Cache `/api/catalog` nay khoá theo người dùng.
- **Tìm kiếm bớt nhiễu** (viết lại §13): khớp **từ trọn vẹn** (từ có dấu: khớp đầu từ đúng dấu; từ không dấu: bằng cả từ sau khi bỏ dấu — "com" không khớp "combo"). Quán khớp "chính" khi mọi từ nằm trong *tên + danh mục + MỘT tên món* (không ghép từ rải ở nhiều món); khớp nhờ mô tả chỉ được thêm khi kết quả chính < 5. Điểm: tên đúng dấu +40, tên khớp đủ từ +30 (có dấu)/+10 (không dấu), món +6/món (≤ 30), danh mục +8, mô tả +3. Từ không dấu được chấm theo dạng có dấu phổ biến trong **tên danh mục** (pho → phở, com → cơm) nên quán có món phở xếp trên quán chỉ có chữ "Phố".
- **Job dọn đơn dở và voucher quá hạn** (`jobs/order-sweeper.js`, chạy cùng worker 30 giây/lần): đơn `PREPARING/READY_FOR_PICKUP/SHIPPER_ASSIGNED` không đổi trạng thái quá `STALE_ORDER_MINUTES` (mặc định 180) ⇒ huỷ `SYSTEM_TIMEOUT` bằng luồng huỷ chung (đơn đã trả online sinh yêu cầu hoàn tiền `PENDING`, tài xế được nhả); `PICKED_UP/DELIVERING` quá `STALE_DELIVERY_MINUTES` (mặc định 240) ⇒ chuyến giao `FAILED` qua `updateDeliveryStatus` + hoàn tiền nếu đã trả online; voucher `ACTIVE` có `end_at < now` ⇒ `EXPIRED` (đọc vẫn lọc theo `end_at`; chủ quán/admin `/extend` đưa về `ACTIVE`). Đặt ngưỡng 0 để tắt từng nhóm. Lần chạy đầu (22/11): huỷ 7 đơn, 2 chuyến FAILED, 107 voucher EXPIRED; không còn đơn trung gian.
- **Voucher quán đa dạng**: tên/mô tả sinh theo quán + món bán chạy nhất (mẫu chọn theo id quán), hạn 30–88 ngày kể từ ngày chạy `load-promotions.mjs`; voucher đã có người dùng chỉ đổi chữ + hạn (không đổi giá trị/ngưỡng). Đo: 63 voucher quán ACTIVE (hạn còn 32–88 ngày), 0 ACTIVE hết hạn, tên lặp tối đa 1 quán, 74/74 mô tả khác nhau.
- **Đánh giá thực tế hơn**: trigger đánh giá chỉ có **INSERT và UPDATE** (tính lại AVG/COUNT với `deleted_at IS NULL`), **không có DELETE** ⇒ chỉ được **gỡ mềm** (`deleted_at`), không xoá cứng. `scripts/trim-simulated-reviews.mjs` (`--dry-run`, `--comments`): đánh giá quán 21.087 → 4.257 (phủ 10,2–25,5% số đơn DELIVERED mỗi quán, ≤ 2/khách/quán, ưu tiên đã có phản hồi, tài khoản không phải `kh.*` như `minh.anh` giữ nguyên), đánh giá món 48.883 → 8.080 (chỉ giữ của đơn còn đánh giá quán + đơn của tài khoản thật); 4 quán TB ≥ 4,5 (Bếp Nhà An Nhiên, Bún Bò Cố Đô, Bếp Chay Sen Vàng, Lẩu Ly Đêm), 5 quán < 3,5; điểm TB/số lượng khớp AVG/COUNT thật (sai số < 0,01). Bình luận sinh bởi `scripts/data/review-phrases.mjs` (rỗng ~10% quán/món, một câu ≤ 3 lần, ~98% khác nhau; bình luận tài xế chưa đổi). Ngoại lệ có chủ đích: `minh.anh` có tới 13 đánh giá/quán (giữ nguyên theo yêu cầu).

## 16. Đợt 4 (23/11/2026): quy mô dữ liệu và quy tắc đánh giá mô phỏng

- Hà Nội 33 quán, **mỗi phường (11 phường) đúng 3 quán**; quán mới có 15 món, 3 combo, 2 voucher đa dạng (hạn 31–87 ngày), giờ mở 7 ngày, phường, logo/bìa/ảnh combo ghép. Đơn quán mới ≈ 496/quán (484–514); quán cũ ≈ 152 đơn trong 14 ngày gần nhất; mọi quán đều có đơn trong 7 ngày gần nhất; không đơn nào của quán mới vượt 15 km hay chéo vùng HN/HY.
- **Phủ đánh giá quán 10,1–20,1% số đơn DELIVERED mỗi quán** (đo 58 quán, 0 quán ngoài 10–30%), khách `kh.*` ≤ 2 đánh giá/quán, điểm TB quán 3,27–4,67 (4 quán ≥ 4,5; 5 quán < 3,5), TB và số lượng của quán/món/tài xế khớp AVG/COUNT thật (sai số < 0,01). Bình luận: rỗng quán 5,0% / món 10,9% / tài xế 12,8%; khác nhau 95,4% / 99,7% / 88,1%; một câu tối đa 3 lần. Ngoại lệ: `minh.anh` (143 đánh giá quán) giữ nguyên.
- Đơn dở dang: 0 đơn ở trạng thái trung gian; 0 voucher `ACTIVE` hết hạn.

## 15. Đợt 5 (giờ đặt đơn, bình luận, hoàn tiền)

- Giờ đặt đơn lấy mẫu theo giờ mở cửa + loại quán (`scripts/lib/order-hours.mjs`); `retime-out-of-hours-orders.mjs` dời đơn ngoài giờ, sau đó bắt buộc chạy `spread-timeline.mjs --yes` rồi `simulate-closeout.mjs --regenerate-settlements`.
- Bình luận/phản hồi sinh theo nhãn món/quán và số sao thật (`data/review-phrases.mjs`, kiểm bằng `lib/comment-checks.mjs`); viết lại hàng loạt bằng `rewrite-review-comments.mjs` (chỉ tài khoản `kh.*`). Một bình luận lặp ≤ 3, một phản hồi ≤ 5 (trừ dữ liệu của `minh.anh` được giữ nguyên).
- Báo giá ngoài vùng giao (> `max_delivery_distance`, mặc định 15 km): phí = 0, `outOfRange = true`, kèm `outOfRangeMessage`; đặt đơn bị từ chối 400 (tiếng Việt).
- `refund-failed-orders.mjs`: đơn huỷ/thất bại đã thanh toán online -> hoàn qua API admin (PENDING/REJECTED -> PROCESSING -> COMPLETED) làm đơn thành REFUNDED.
- ĐỂ SAU: gán lại ảnh món dùng chung (113 nhóm ảnh dùng chung nhiều món) cần xem từng ảnh; combo 5323 và các "Combo..." của Gà Giòn Bếp Đỏ chưa có ảnh.

## 17. Đợt 7 (24/11/2026): kiểm chứng đặt hàng, hoàn tiền tự động, báo cáo chất lượng dữ liệu

- **Kiểm chứng API thật** (`node scripts/verify-checkout-rules.mjs`, khách `minh.anh`, tự dọn giỏ + địa chỉ tạm, không tạo đơn). Bằng chứng 24/11/2026:
  - body rỗng → HTTP 400 "Mã nhà hàng phải là số nguyên dương";
  - `paymentMethod='BITCOIN'` → HTTP 400 "Phương thức thanh toán không hợp lệ";
  - địa chỉ Hồ Chí Minh (cách quán 1102,34 km) → HTTP 400 "Địa chỉ cách quán 1102.34 km, vượt quá giới hạn giao hàng 15 km nên đơn này không được giao";
  - `COUNT(orders)` trước/sau = 45.481 / 45.481; giỏ còn lại của minh.anh ở quán thử = 0 (địa chỉ tạm được xoá mềm).
- **Hoàn tiền tự động**: job `jobs/refund-sweeper.js` (chạy cùng `job.worker.js`) chuyển yêu cầu hoàn PENDING/PROCESSING của đơn CANCELLED/FAILED tồn quá `REFUND_AUTO_APPROVE_MINUTES` (mặc định 240; 0 = tắt) sang COMPLETED + đơn REFUNDED (cùng hiệu ứng PATCH `/api/admin/manage/refunds/:id`), ghi audit `REFUND_AUTO_COMPLETE`. Logic thuần ở `jobs/refund-rules.js` (có test); `scripts/refund-failed-orders.mjs` dùng chung `stepsToComplete`.
- **Đánh giá tài xế (chỉ đọc)**: `GET /api/deliveries/reviews?limit=&offset=&shipperId=` — ADMIN xem tất cả, SHIPPER chỉ xem của mình, khách 403; `limit` ≤ 100.
- **Báo cáo chất lượng dữ liệu**: `GET /api/admin/dashboard/data-quality` (ADMIN + `report.view`): đơn ngoài giờ, đơn huỷ/thất bại còn PAID, đơn dở quá ngưỡng, quán/món lệch điểm hoặc số đánh giá, món thiếu ảnh, voucher ACTIVE quá hạn, hoàn tiền quá hạn — đếm trên 100% bản ghi.
- **Giới hạn tốc độ**: khách/khách ẩn danh 240 yêu cầu/phút/IP/đường dẫn; ADMIN đã đăng nhập `RATE_LIMIT_ADMIN_MAX` (2400).
- **Tìm kiếm quán có ngưỡng liên quan**: quán chỉ khớp nhờ ít hơn `MIN_DISH_HITS` (3) món là kết quả phụ; kết quả chính điểm < 20% điểm cao nhất bị hạ; khi ít kết quả chính thì tổng tối đa 8 (đo thật: "gà" 39 → 10, "phở" 12 → 8, "chay" 13 → 8; "bún bò" 6, "com tam" 4, "bánh kem" 3, "bia" 3, "my y" 3).
- **Địa chỉ khách mới**: `scripts/lib/address-gen.mjs` chỉ dùng đường thật trong `new-places.json` (loại "Đường chung cư", "Đường trục phía Bắc"…), HN + HY. Đơn/địa chỉ cũ không đổi (checksum `BIT_XOR(CRC32(id+delivery_address))` = 2510960526 trên 45.481 đơn).
- **Hotline**: lấy từ `system_settings` (`app.owner.phone`) qua `/api/catalog/storefront` → `contact.phone`; frontend không còn số cứng (test `frontend-format.test.js`).
- ĐỂ SAU / TỪ CHỐI (không làm có chủ đích): thanh toán trực tuyến thật (cổng MoMo/VNPAY... vẫn sandbox), gửi email thật, đăng nhập OAuth, WebSocket thật (đang polling), đặt hẹn giờ, đổi điểm thưởng thành tiền, xác nhận tuổi khi mua bia, sửa địa chỉ của đơn cũ.

## 18. Đợt 9 (24/11/2026): xác nhận đủ 18 tuổi khi đặt đồ uống có cồn

- Nhận diện theo TÊN món (`orders/alcohol-rules.js`): bắt đầu bằng bia/rượu/vodka/soju/whisky/sake/cocktail/vang/chuhai/beer hoặc nhãn bia phổ biến (Tiger, Heineken, Saigon Special, Hennessy); không khớp "Bò bía", "Cơm rượu nếp", "Hủ tiếu Nam Vang". Món "Bia lon Tiger" xuất hiện cả như món lẻ lẫn THÀNH PHẦN của combo (vd 6 combo "Combo 1 người/2 người/gia đình" của Lẩu Ly Đêm Phố Hiến và Lẩu Nướng Tây Sơn: id 4668, 4669, 4671, 4906, 4910, 4911). Vì tên combo không có chữ bia, kiểm tra ở checkout và quote xét cả tên dòng giỏ LẪN tên các món thành phần (`menu_item_combo_components`, hàm `loadComboComponentNames`).
- `POST /api/customer/orders/checkout` nhận `ageConfirmed` (boolean, mặc định false). Giỏ có đồ uống có cồn mà thiếu `ageConfirmed: true` → **400** "Giỏ hàng có đồ uống có cồn: bạn cần xác nhận đủ 18 tuổi trước khi đặt". Nếu hồ sơ khách có `date_of_birth` cho thấy < 18 tuổi → **403** "Hồ sơ của bạn cho thấy chưa đủ 18 tuổi nên không thể đặt đồ uống có cồn" (kể cả có `ageConfirmed`). Kiểm tra nằm trong giao dịch checkout, sau bước kiểm tra giờ mở cửa và trước khi tạo đơn.
- `POST /api/customer/orders/quote` trả thêm `requiresAgeConfirmation` (true khi giỏ có đồ uống có cồn); frontend (`app.js`, hàm `checkout`) hiện hộp xác nhận (`confirm`) trước khi gửi `ageConfirmed: true`; khách bấm Huỷ thì không đặt.
- Chưa thể hiện bằng DB (không thêm cột cờ trên món): nếu thêm đồ uống có cồn tên khác (vd "Chivas"), cần bổ sung vào `ALCOHOL_NAME` hoặc thêm cờ `is_alcoholic` cho món. Ca bia của `verify-checkout-rules.mjs` chỉ chạy khi có quán bán bia đang mở cửa.

## 19. Đợt 14 (24/11/2026): phân trang chặt, tiếng Việt cho dữ liệu mới, thông báo tài xế/admin, vùng giao Hà Nội

- **Phân trang dùng chung** (`shared/http/pagination.js`): `readPagination` (page|pageNumber, pageSize|limit; mặc định trang 1, 20 dòng; tối đa theo endpoint: catalog 50/100, quản trị 100) và `readLimitOffset` (limit ≤ 100, offset ≥ 0). Số âm/0/chữ/thập phân → **400** "Tham số X không hợp lệ: phải là số nguyên từ N trở lên"; vượt tối đa → **400** "Tham số X vượt giá trị tối đa N" (không âm thầm cắt). Áp cho `/api/deliveries/reviews`, `/api/catalog/*`, `/api/notifications`, `/api/admin/manage/*`, `/api/restaurant/.../menu-items`, nhật ký.
- **`GET /api/notifications`**: nhận page/pageSize (hoặc limit cũ); trả `items`, `totalItems` (tổng thật), `page`, `pageSize`, `totalPages`, `pagination {page,pageSize,totalItems,totalPages}` và `unreadCount`.
- **405**: đường dẫn có nhưng sai phương thức (vd `POST /api/customer/profile`) → 405 + header `Allow: GET, PATCH` (`shared/http/method-not-allowed.js`, áp ở hồ sơ khách; dùng lại cho router khác bằng `router.all('/', methodNotAllowed([...]))`).
- **Đánh giá đơn** (`/api/communications/orders/:id/restaurant-review|shipper-review|item-reviews`): kiểm tra đầu vào (điểm 1–5, bình luận ≤ 2000 ký tự, danh sách món) TRƯỚC khi kiểm tra đơn/trạng thái → 400 trước 404/409.
- **Tiếng Việt cho dữ liệu MỚI**: bảng mẫu tập trung `shared/i18n/order-texts.js` (mã trạng thái → nhãn, ghi chú lịch sử, thông báo khách, thông báo chủ quán); "Order created" → "Đơn hàng được tạo", "Restaurant confirmed order" → "Quán đã xác nhận đơn"… Chuỗi cũ trong dữ liệu cũ và chuỗi trigger ("Status automatically recorded by trigger") CHƯA dịch (để D5).
- **Thông báo tài xế/admin** (hạ tầng `notifications`, không gửi trùng nhờ `createOnce` theo người nhận + loại + đối tượng + tiêu đề): tài xế nhận "Bạn được giao đơn mới" khi admin/quán giao đơn (`POST /api/deliveries/assign`), "Đơn đã được chuyển cho tài xế khác" khi đổi tài xế, "Đơn đã bị huỷ"/"Đơn giao không thành công" khi đơn của họ kết thúc; mọi admin nhận cảnh báo khi job tự huỷ đơn quá hạn ("Hệ thống tự huỷ đơn …") và khi yêu cầu hoàn tiền PENDING tồn quá `REFUND_ALERT_MINUTES` (mặc định 120; chỉ xét yêu cầu trong `REFUND_ALERT_WINDOW_DAYS` = 2 ngày gần đây để không phát sinh cho dữ liệu cũ). Loại thông báo: DELIVERY (tài xế), SYSTEM (admin).
- **Vùng giao hàng**: `scripts/add-delivery-zones.mjs` thêm 4 vùng Hà Nội (toàn thành phố; Hồ Tây–Ba Đình–Long Biên; Cầu Giấy–Từ Liêm–Nghĩa Đô; Hà Đông) qua `POST /api/admin/manage/zones`, bán kính/phí lấy từ `system_settings` (15 km, 15.000đ + 5.000đ/km); cùng vùng "Khu vực mặc định" Hưng Yên → 5 vùng. Bảng `delivery_zones` hiện chỉ để hiển thị/quản trị; phí và `outOfRange` thực tế tính theo `max_delivery_distance` (báo giá >15 km vẫn `outOfRange: true`, phí 0).
- **OpenAPI**: `tools/generate-openapi.mjs` (chạy cùng `generate-dev-docs.mjs`) sinh `docs/openapi.json` từ route thật, phủ 100% route, tag theo module, mô tả tiếng Việt; giữ mô tả viết tay đã có.

## 20. Đợt 15 (24/11/2026): thông báo theo trạng thái, tìm kiếm admin, đọc hàng loạt

- **Thông báo đơn cho khách + chủ quán theo MỌI trạng thái** (bảng `shared/i18n/order-texts.js`): chờ xác nhận → quán xác nhận → chuẩn bị → sẵn sàng → **tài xế nhận đơn** (khi giao tài xế) → **tài xế đã lấy món** → **đang giao** → **đã giao** → huỷ/giao thất bại. Hàm `notificationService.notifyOrderProgress(orderId, status)` được gọi ở route tài xế cập nhật trạng thái (`POST /api/shippers/deliveries/:id/status`), giao tài xế, huỷ đơn; job nền dùng `notifyOrderStatus` (trạng thái FAILED/CANCELLED đúng loại). Tiêu đề theo trạng thái ("Đơn X: Đang giao hàng") nên `createOnce` chống trùng theo người nhận + loại + đơn + tiêu đề. Chỉ áp cho dữ liệu mới (không quét lại đơn cũ). Bằng chứng đơn #46492: khách nhận 8 thông báo từ "Chờ quán xác nhận" tới "Đã giao thành công".
- **Tìm kiếm danh sách quản trị**: `shared/http/search-param.js` — chấp nhận ?search=, ?keyword=, ?q=. Áp cho `/api/admin/manage/customers|orders|shippers|promotions|refunds`, `/api/accounts/admin/users`, `/api/admin/restaurants`, đơn của quán (owner). Trước đây `/customers` chỉ nhận `q` nên `?search=` bị bỏ qua (trả đủ 347 khách).
- **Đánh dấu tất cả đã đọc**: trước đây chỉ có `PATCH /api/notifications/:id/read`. Thêm `PATCH|POST /api/notifications/read-all`: chỉ của chính người dùng, chỉ UPDATE dòng chưa đọc, không xoá; trả `{updated, unreadCount, totalItems}`.

## 21. Đợt 17 (24/11/2026): phân trang thật cho 4 danh sách admin

- `GET /api/admin/manage/refunds|shippers|promotions|settlements` dùng `readPagination` chung (page|pageNumber hoặc offset; pageSize|limit; mặc định 20, trần 100; sai/vượt → 400 tiếng Việt) và trả `{ items, totalItems, page, pageSize, totalPages, pagination:{page,pageSize,totalItems,totalPages}, summary }`. `totalItems` = đếm theo cùng điều kiện lọc/tìm kiếm, `summary` = tổng hợp trên TOÀN BỘ dữ liệu (refunds: đếm theo trạng thái; shippers: total/available/suspended/activeDeliveries; settlements: grossSales/commissionAmount/pendingNet/settledNet) để màn hình không phải tải hết.
- refunds: thêm lọc `?status=PENDING|PROCESSING|COMPLETED|REJECTED`; yêu cầu PENDING xếp lên trước.
- `offset` được chấp nhận khi không có `page` (trang = floor(offset/pageSize)+1); `page` được ưu tiên.
- Giao diện admin (`admin.js`): tài xế `pageSize=100` (32 tài xế) + thẻ thống kê từ `summary`; đối soát và khuyến mãi `pageSize=50` kèm nút Trước/Sau; hoàn tiền trong màn Thanh toán `pageSize=10` có nút Trước/Sau, tổng quan lấy số chờ xử lý từ `summary.PENDING`.
- Các danh sách admin nhỏ cố định không phân trang: `loyalty-rewards` (5), `banners` (23), `zones` (5).

## 22. Đợt 18 (27/11/2026)

- Thông báo/ghi chú trạng thái cũ đã dịch tiếng Việt (khớp chính xác mẫu, giữ mã đơn); trigger `trg_order_status_history` ghi "Hệ thống tự ghi nhận chuyển trạng thái". `delivery_status_history.note` (GPS update, Delivery assigned, Shipper accepted, Automatically recorded) CHƯA dịch: "GPS update" là mã đánh dấu dùng trong mã nguồn.
- Email tài khoản mô phỏng: `ownerNN@example.com` (đăng nhập bằng username hoặc email mới; email cũ không còn).
- Thông báo huỷ/thất bại (đã kiểm sống): khách + chủ quán "Đơn X: Đã huỷ"/"Giao hàng thất bại"; tài xế đang giữ đơn "Đơn đã bị huỷ"/"Đơn giao không thành công"; admin cảnh báo "Hệ thống tự huỷ đơn …"/"Hệ thống ghi nhận giao thất bại đơn …" chỉ khi job hệ thống (khách tự huỷ không cảnh báo admin).

## 23. Đợt 19 (27/11/2026): hoàn tiền, giao dịch, ghi chú trạng thái

- **Một nguồn duy nhất cho hoàn tiền** `modules/payments/refund-service.js`: tổng hoàn (PENDING+PROCESSING+COMPLETED) không bao giờ vượt số đã trả (payments PAID/REFUNDED); mọi thao tác khoá dòng đơn `FOR UPDATE` trước khi đọc/ghi (chống đua song song); yêu cầu COMPLETED bất biến; REJECTED chỉ mở lại khi còn hạn mức. Lỗi: 409 tiếng Việt ("vượt quá số còn được hoàn…", "đã được hoàn đủ", "chưa được thanh toán", "đã hoàn tất, không thể thay đổi").
- Hoàn tất hoàn tiền đồng bộ: hoàn đủ → `orders.payment_status` và `payments.status` = REFUNDED; hoàn một phần → đơn PARTIALLY_REFUNDED (payments giữ PAID vì enum không có trạng thái một phần). Dashboard "Doanh thu đã thu" = đơn PAID + PARTIALLY_REFUNDED trừ phần đã hoàn; thẻ "Đã hoàn tiền" ở màn Thanh toán lấy từ yêu cầu hoàn COMPLETED (`refunded` trong `/api/admin/manage/payments`).
- Huỷ đơn (khách/admin/quán từ chối/job) đi qua một luồng: tạo yêu cầu hoàn phần còn lại nếu đã trả, đóng giao dịch chưa thu (CANCELLED); giao thất bại đóng FAILED. Callback thanh toán: không đổi trực tiếp sang REFUNDED, không ghi PAID cho đơn đã huỷ/thất bại.
- Nguyên nhân hoàn trùng cũ: `simulate-activity.mjs` gọi thêm `POST /api/payments/orders/:id/refund` sau khi luồng huỷ đã tự tạo yêu cầu, và endpoint không kiểm tra yêu cầu đang có (970 đơn có 2 yêu cầu COMPLETED, thừa 250.880.320đ). Đã sửa cả hai. Dữ liệu cũ: giữ yêu cầu sớm nhất, 970 yêu cầu thừa đổi REJECTED kèm lý do "Trùng lặp: …"; ví/điểm/đối soát không bị ảnh hưởng (hoàn không cộng ví/điểm; đối soát chỉ tính đơn đã giao, `refund_amount` = 0).
- `data-quality` thêm: `refundsExceedPaid`, `duplicateCompletedRefunds`, `paymentsOutOfSyncWithRefunds`, `openPaymentsOnClosedOrders`.
- Lý do tự huỷ dùng nhãn tiếng Việt (`jobs/stale-reasons.js`). Trigger `trg_order_status_history` ghi chú theo trạng thái mới (migration `20261127b_trigger_note_by_status.sql`). Ba đơn thử #46493–46495 (đợt 18) có lý do "quá 1 phút" vì chạy server tạm `STALE_*_MINUTES=1` khi kiểm chứng; đơn #46496 (đợt 19) kiểm chứng hoàn tiền (MOMO, hoàn 60% rồi huỷ, REFUNDED).

## 24. Đợt 20 (27/11/2026)

- **Đơn PENDING quá hạn**: job `cancelExpiredPendingOrders` huỷ MỌI đơn quán chưa xác nhận quá `PENDING_ORDER_TIMEOUT_MINUTES` (mặc định 30), KỂ CẢ đã trả tiền: tạo yêu cầu hoàn qua `refund-service` trong cùng giao dịch, lý do "… tự huỷ đơn và hoàn tiền", thông báo khách + quán + cảnh báo admin; yêu cầu hoàn được duyệt theo luồng bình thường (admin hoặc job tự duyệt sau `REFUND_AUTO_APPROVE_MINUTES`). `data-quality.staleOrders.pending` đếm mọi đơn PENDING quá hạn.
- **`orders.payment_status`** có thêm `CANCELLED`: đơn huỷ chưa thu tiền = CANCELLED, giao thất bại chưa thu = FAILED (đồng bộ với `payments`); `data-quality.closedOrdersPaymentStatusPending` phải = 0. Giao diện: nhãn "Đã hủy"/"Hoàn một phần", bộ lọc admin có đủ 6 giá trị; trang theo dõi đơn không mời thanh toán đơn đã đóng.

### Đơn tạo ra để kiểm chứng (khách mô phỏng kh.*, không phải minh.anh)

| Đơn | Mã | Khách | Kết quả | Thanh toán | Ghi chú cuối / mục đích |
|---|---|---|---|---|---|
| #46491 | FD-MWUTWO7K-8X6R0 | kh.nguyen.khanh.phuong | DELIVERED | COD/PAID | Đợt 14: kiểm thông báo tài xế |
| #46492 | FD-MWUU43S2-K81QS | kh.nguyen.khanh.phuong | DELIVERED | COD/PAID | Đợt 15: kiểm thông báo khách mọi trạng thái |
| #46493 | FD-MWYYNLL6-RMLDM | kh.huynh.ngoc.trang | CANCELLED | COD/CANCELLED | Đợt 18: khách tự huỷ ("Đổi ý, không muốn đặt nữa") |
| #46494 | FD-MWYYNLPV-CYOWX | kh.nguyen.khanh.phuong | CANCELLED | COD/CANCELLED | Đợt 18: job huỷ, lý do "Quá 1 phút…" vì server tạm `STALE_ORDER_MINUTES=1` |
| #46495 | FD-MWYYNLXZ-T4190 | kh.tran.mai.dung | FAILED | COD/FAILED | Đợt 18: job đánh dấu giao thất bại với server tạm `STALE_DELIVERY_MINUTES=1` |
| #46496 | FD-MWYZH2U6-IUM1I | kh.huynh.mai.linh | CANCELLED | MOMO/REFUNDED | Đợt 19: kiểm luật hoàn tiền ("Kiểm thử huỷ sau hoàn một phần") |

Đơn #45688 (ZaloPay 122.000đ, đặt 24/11) không phải đơn kiểm thử: bị kẹt PENDING đã trả tiền, được job xử lý ở đợt 20 (CANCELLED, hoàn #3087 duyệt COMPLETED).

## 25. Đợt 21 (27/11/2026): sửa lỗi phát hiện khi chạy Postman toàn bộ chức năng và khi rà luồng

- **Phân công**: chỉ khi đơn `READY_FOR_PICKUP` hoặc `SHIPPER_ASSIGNED` (đổi tài xế); đề nghị `OFFERED` cũ của đơn bị huỷ khi đổi tài xế (`operations/delivery-rules.js`).
- **Chuyến giao**: `ASSIGNED/ACCEPTED → PICKED_UP|FAILED`, `PICKED_UP → DELIVERING|DELIVERED|FAILED`, `DELIVERING → DELIVERED|FAILED`; gửi lại đúng trạng thái hiện tại thì không ghi gì; đơn đã đóng trả 409.
- **COD** (`payments/cod-service.js`): tài xế chỉ thu giao dịch của mình; `SETTLED` không quay về `COLLECTED`; chỉ đối soát giao dịch `COLLECTED`; mã lạ 404.
- **Tài xế**: không tự đặt hoặc tự gỡ `SUSPENDED`; không gửi GPS vào chuyến của người khác; từ chối đề nghị không thuộc mình trả 404.
- **Quán từ chối đơn** chỉ ghi `order_cancellations` một lần (trước đó lỗi 500).
- **Thực đơn**: `PATCH` size/topping/nhóm topping giữ nguyên trường không gửi; `PUT` combo và nhóm topping của món trả nội dung phản hồi.
- **Xuất dữ liệu**: loại không hỗ trợ trả 400, không tạo job.
