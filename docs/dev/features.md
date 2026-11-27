# Chức năng và đối chiếu Master Plan

Ký hiệu: ✅ đã làm & chạy được · 🟡 làm một phần / dạng đơn giản · ❌ chưa làm. "Code" chỉ nơi sửa chính. Route chi tiết ở `api-routes.md`.

## 1. Chức năng theo vai trò

### Khách hàng (CUSTOMER) — giao diện: màn `customer`
| Chức năng | Trạng thái | Code / API |
|---|---|---|
| Đăng ký, đăng nhập, quên/đặt lại mật khẩu | ✅ | `auth.*`; modal `#authModal` (`app.js`: `openAuth`, `login`) |
| Xác minh email | ✅ nút "Gửi mã xác minh" trong Hồ sơ (chưa nối dịch vụ gửi email thật: mã trả trực tiếp) | `auth.service.js`, `app.js#renderSessionDetail` |
| Hồ sơ, ví | ✅ màn `account` (Hồ sơ, Ví) | `customer.*`, `/api/payments/wallet/*` |
| Sổ địa chỉ + ghim vị trí trên bản đồ OSM | ✅ | `address.js`, `/api/customer/addresses` |
| Chọn tỉnh/thành, tìm quán/món (AND, đúng dấu, xếp theo liên quan, gợi ý khi 0 kết quả), tab Nổi bật·Gần tôi·Bán chạy·Đánh giá·Giao nhanh·Ưu đãi·Giá thấp·Giá cao, lọc quận/đang mở/ẩn quán ngoài vùng giao/bộ sưu tập, phân trang | ✅ | `catalog.*`; `app.js`: `searchCatalog`, `renderRestaurants`, `loadCollections` |
| Trang quán: menu nhóm, combo, voucher quán, đánh giá, giỏ nhỏ bên phải | ✅ | `renderRestaurantDetail`, `renderMiniCart` |
| Chi tiết món: size, nhóm topping (bắt buộc/giới hạn), ghi chú, số lượng, tổng tiền tức thì, đánh giá món | ✅ | `openItemModal`, `readItemSelection` |
| Giỏ hàng, ghi chú món, báo giá (phí giao theo km, voucher gợi ý, mốc freeship, điểm sẽ tích) | ✅ | `orders.*`, `rewards.routes.js` (`/orders/quote`), `loadQuote` |
| Checkout: COD/online, voucher, ghi chú quán/tài xế, dụng cụ, giao không tiếp xúc, Idempotency-Key | ✅ | `order.repository.js#checkoutForUser` |
| Theo dõi đơn: trạng thái, bản đồ GPS, chat theo đơn, huỷ đơn, hoá đơn in/PDF | ✅ | `live.js` (`startTracking`), `/api/communications`, `/api/payments/orders/:id/invoice` |
| Đánh giá quán/tài xế/từng món | ✅ | `/api/communications/orders/:id/{restaurant-review,shipper-review,item-reviews}` |
| Ví voucher, đổi điểm thưởng, thống kê chi tiêu | ✅ | `rewards.routes.js`, `analytics` (`customer/spending`) |
| Yêu thích quán/món, lịch sử tìm kiếm | ✅ | `engagement.*` |
| Hỗ trợ (ticket) + widget liên hệ | ✅ | `/api/communications/support/*`, `widgets.js` |
| Thông báo trong app | ✅ | `notifications.*`, `widgets.js` |

### Nhà hàng (RESTAURANT) — màn `restaurant` (`restaurant.js`)
| Chức năng | Trạng thái | Code |
|---|---|---|
| Hồ sơ quán, giờ mở cửa, bật/tắt nhận đơn | ✅ | `restaurants.*`, `restaurant.js#hours/toggleOpen` |
| Menu: nhóm món, món (ảnh), size, topping, nhóm tuỳ chọn, **combo** | ✅ | `menus.*`; form trong `index.html` + `app.js` (owner menu) |
| Bảng xử lý đơn thời gian thực, xác nhận/chuẩn bị/sẵn sàng/từ chối, thấy ghi chú & dụng cụ | ✅ | `order.routes.js#restaurantOrderRoutes`, `boardAuto` |
| Gán tài xế cho đơn | ✅ | `/api/deliveries/assign`, `/available-shippers` |
| Lịch sử đơn + lọc + xuất | ✅ | `history`, `export.js` |
| Voucher của quán (% hoặc trực tiếp, hạn ngạch, hạn dùng ≤ 90 ngày, gia hạn) | ✅ | `engagement.service.js`, `app.js#loadRestaurantPromotions` |
| Đánh giá & phản hồi | ✅ | `reviews` |
| Báo cáo: doanh thu, món & combo, voucher, khách hàng, đối soát + Excel/PDF/CSV | ✅ | `analytics.js` (frontend), `analytics.service.js` |
| Đối soát & hoa hồng | ✅ | `/api/settlements`, `management.routes.js` |

### Tài xế (SHIPPER) — màn `shipper`
| Chức năng | Trạng thái | Code |
|---|---|---|
| Đăng ký → admin duyệt; hồ sơ/giấy tờ; trạng thái sẵn sàng | ✅ | `partners.*`, `/api/shippers/profile|availability` |
| Nhận/chấp nhận đề nghị, cập nhật Đã lấy hàng → Đang giao → Đã giao/Thất bại | ✅ | `operations.routes.js#shipperRoutes` |
| GPS thật từ thiết bị + bản đồ chuyến | ✅ | `live.js#startGps`, `POST /api/shippers/locations` |
| Thu COD, thu nhập, yêu cầu rút tiền, thống kê hiệu suất + xuất file | ✅ | `/api/payments/cod`, `/api/shippers/withdrawals`, `analytics` |

### Quản trị (ADMIN) — màn `admin` (`admin.js`)
Bảng điều khiển, giám sát giao hàng (bản đồ), **báo cáo & phân tích 8 tab** (`analytics.js`), đơn hàng, duyệt đối tác, nhà hàng (duyệt/khoá/hoa hồng), tài xế, khách hàng, thanh toán & hoàn tiền, đối soát, khuyến mãi (voucher toàn sàn + gia hạn + quà đổi điểm), banner, đánh giá, hỗ trợ, tài khoản & phân quyền, danh mục & khu vực giao, cấu hình hệ thống, nhập/xuất dữ liệu, nhật ký bảo mật — ✅ tất cả.

## 2. Đối chiếu Master Plan (`outputs/master-plan/Master Plan.xlsx`)

| # | Hạng mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 1.1 | SRS, ERD, use case, kiến trúc | 🟡 | Có `README.md` (mô tả/vai trò), `docs/dev/*` (kiến trúc, schema ERD dạng bảng), docx quy trình nghiệp vụ. **Chưa có sơ đồ use-case/ERD dạng hình** |
| 1.2 | DB/migration | ✅ | `food_delivery_db.sql` + `database/migrations` |
| 1.3 | Auth JWT, reset mật khẩu, RBAC 4 vai trò, audit, xoá mềm | ✅ | OAuth2/Google: ❌ (không có) |
| 1.4 | UI đăng ký/đăng nhập/hồ sơ + màn theo 4 vai trò | ✅ | Xác minh email có UI; tự làm mới token khi hết hạn |
| 2.1–2.2 | CRUD nhà hàng/menu/món, giá, trạng thái, ảnh | ✅ | Ảnh món/quán: upload hỗ trợ; thư viện ảnh minh hoạ **đã duyệt bằng mắt** (535 ảnh, 232 loại món, nguồn trong `docs/image-credits.md`): 528/630 món thường có ảnh, 36/36 quán có logo + bìa, 108/108 combo có ảnh ghép, 20/20 danh mục có ảnh; 102 món chưa có ảnh đúng tên được để trống (UI dùng ô màu + emoji) |
| 2.3 | Tìm kiếm/lọc/sắp xếp/phân trang | ✅ | |
| 2.4 | Seed ≥ 2.000 bản ghi | ✅ | Thực tế hàng trăm nghìn dòng qua `data:*` (xem data-pipeline) |
| 3.1–3.3 | Giỏ, checkout transaction, chống đơn trùng, nhà hàng xác nhận | ✅ | `Idempotency-Key` + khoá giao dịch |
| 3.4 | Realtime/in-app/email notification, job mail | 🟡 | In-app ✅ (polling); email qua Mailhog ở docker-compose, chưa kiểm chứng gửi thật |
| 3.5, 5.3 | Integration/E2E test, coverage 30–40% | 🟡 | Unit test ✅; E2E bằng Postman/newman ✅ (`postman/`), chưa đo coverage chính thức |
| 4.1–4.2 | Shipper nhận–giao | ✅ | |
| 4.3 | GPS tracking realtime | ✅ | GPS thật + polling (không WebSocket) |
| 4.4 | Thanh toán COD/online (gateway giả lập) | 🟡 | COD thật; online là **sandbox** `mock-pay`, chưa nối cổng thật |
| 4.5 | Hoá đơn PDF | ✅ | In/lưu PDF phía trình duyệt từ trang hoá đơn; xuất báo cáo PDF do server sinh |
| 4.6 | Dashboard/báo cáo | ✅ | `analytics` |
| 4.7 | Redis cache, rate limit, CORS, audit | ✅ | Redis tuỳ chọn |
| 5.1 | Nhập/xuất Excel/CSV/PDF qua job | ✅ | Xuất .xlsx/.pdf/.csv thật; nhập `.xlsx` ✅ (cùng CSV, SpreadsheetML) — trang Admin → Dữ liệu |
| 5.2 | Rà SQLi/XSS/CSRF, upload, secret | 🟡 | Dùng truy vấn tham số hoá, `escapeHtml` ở frontend, helmet+CSP, rate limit; chưa có báo cáo rà soát bảo mật chính thức |
| 6.1 | Docker Compose, CI/CD, logging, health | ✅ | `.github/workflows`, `/health/live|ready`, log JSON |
| 6.2 | OpenAPI/Postman/tài liệu | ✅ | `docs/openapi.json` (70 path, chưa phủ hết 219 route), Postman |
| 6.3 | Video demo, kiểm tra bàn giao | 🟡 | `docs/video-demo-script.md`, `handover-checklist.md`; chưa có video |
| 7 | Ổn định realtime/GPS, hiệu năng | 🟡 | API đo < ~120 ms trên 18k đơn; chưa tải thử nặng |

## 3. Chức năng thêm ngoài Master Plan (đã làm)
Đánh giá theo món · nhóm tuỳ chọn bắt buộc/giới hạn · ghi chú quán/tài xế/dụng cụ · phí giao theo km · voucher toàn sàn/quán/cá nhân/khách mới · freeship theo ngưỡng · điểm thưởng & đổi quà · combo · thống kê 4 vai trò + xuất file thật · chọn tỉnh/thành · bộ sưu tập · giao diện kiểu ShopeeFood.

## 3b. Thêm ngày 08/11/2026
Hai khu vực **Hà Nội (11 quán) + Hưng Yên (25 quán)**, nhiều loại hình (phở, bún chả, cà phê trứng, lẩu nướng, món Hàn, món Nhật, dimsum, bánh ngọt…); dữ liệu & địa chỉ mặc định **Hưng Yên** · giới hạn giao **15 km** · chặn đặt khi quán đóng cửa · cam kết đối tác (nhà hàng/tài xế, đọc tới cuối mới đồng ý) · combo chọn mức đường/đá/độ cay · topping đúng món, không giới hạn số lượng · đánh giá: nhiều hơn, bình luận đúng loại món, bấm dòng sao để lọc, khung cuộn riêng · ảnh món minh hoạ đã kiểm tra (`docs/image-credits.md`).

## 4. Việc nên làm tiếp (gợi ý)
1. (tuỳ chọn) đăng nhập OAuth; nối dịch vụ gửi email thật cho xác minh/đặt lại mật khẩu.
2. Ảnh thật cho quán/món (upload đã có API) và banner do admin tải lên.
3. Nối cổng thanh toán thật (MoMo/VNPay sandbox thật) thay `mock-pay`.
4. WebSocket/SSE thay polling; thông báo đẩy.
5. Mở rộng OpenAPI phủ hết route (có thể sinh từ `api-routes.md`); đo coverage.
6. Dữ liệu đang dừng ở 13/10/2026 (đơn cuối) — nếu cần "đang chạy tới hôm nay" phải chạy tiếp pipeline (xem `data-pipeline.md`).
7. Chụp lại `minh-chung/` (ảnh cũ, dữ liệu cũ).

## 3. Đợt 1 (22/11/2026)

- Job tự huỷ đơn PENDING chưa thanh toán quá 30 phút (SYSTEM_TIMEOUT); danh sách đơn khách phân trang, có ảnh món + nút "Đặt lại".
- Giờ mở cửa theo ngày + giờ Việt Nam cố định; bảng phí giao theo km trong giỏ; voucher có hạn thật ("Còn X ngày"); nhãn sandbox ở thanh toán.
- Chi tiết quy tắc: `business-rules.md` §13; mục ĐỂ SAU/TỪ CHỐI: §14.

## 4. Đợt 2 (22/11/2026)

- Việt hoá thông báo lỗi backend (bảng tập trung); báo giá địa chỉ lạ → 404; khoảng cách theo địa chỉ mặc định khi đăng nhập.
- Tìm kiếm khớp từ trọn vẹn, trọng số tên quán > món > danh mục > mô tả.
- Giao diện 375px không tràn ngang (trang chủ, quán, giỏ + bảng phí, thanh toán, đơn); đánh giá quán tải 8/lần + nút "Xem thêm đánh giá".
- Job dọn đơn dở/voucher quá hạn; voucher quán đa dạng; đánh giá quán 10–25% số đơn, điểm TB phân hoá (3,29–4,69).
- **Chưa làm**: ảnh cho 134 món còn thiếu và danh mục chưa có ảnh (Bánh & Kem…) — mục "Ảnh món/quán" ở §2 (2.1–2.2) vẫn như cũ; thêm quán Hà Nội (hiện 11 quán, mỗi phường 1 quán) và nối dữ liệu tới 22/11.

## 5. Đợt 4 (23/11/2026)

- 58 quán: Hà Nội 33 (mỗi phường 3 quán, đủ loại hình: phở, bún/miến, cơm, bánh mì, trà sữa/cà phê, nướng/lẩu, Nhật/Hàn/Hoa, pizza/burger, chay, ăn vặt, bánh ngọt), Hưng Yên 25; 45.481 đơn tới 23/11/2026; đánh giá thực tế (10–20% số đơn, điểm TB 3,27–4,67). Chi tiết số liệu: `business-rules.md` §16, quy trình: `data-pipeline.md`.
- Còn thiếu: ảnh cho 110 món/1 combo quán mới (không có ảnh đúng tên), thanh toán thật, email/OAuth/WebSocket thật.

## Cập nhật đợt 5–6

- Giờ đặt đơn theo giờ mở cửa từng quán (0 đơn ngoài giờ); quán đêm có giờ hợp lý.
- Bình luận/phản hồi theo nhãn món/quán, không lệch số sao; 2.027 câu phản hồi khác nhau (lặp ≤ 5, trừ `minh.anh`).
- Hoàn tiền: 67 đơn huỷ/thất bại đã PAID → REFUNDED; báo giá ngoài vùng giao không còn phí giả.
- Ảnh món: gỡ/gán lại 53 món ảnh sai tên (`fix-shared-images.mjs`); còn thiếu ảnh xem `data-pipeline.md` mục ĐỂ SAU.

## Cập nhật đợt 7

- Admin: báo cáo chất lượng dữ liệu `/api/admin/dashboard/data-quality`; xem đánh giá tài xế `/api/deliveries/reviews`; trần tốc độ riêng cho ADMIN.
- Hoàn tiền tự động cho đơn huỷ/thất bại (job nền); `verify-checkout-rules.mjs` kiểm chứng luật đặt hàng bằng API thật.
- Tìm kiếm quán có ngưỡng liên quan; địa chỉ khách mô phỏng mới chỉ dùng đường thật.
- Số liệu thực tế: 58 quán, 1.134 món, 45.481 đơn.

## Cập nhật đợt 9

- Khách: xác nhận đủ 18 tuổi khi đặt đồ uống có cồn (backend chặn 400/403, frontend hộp xác nhận); báo giá có `requiresAgeConfirmation`.

## Cập nhật đợt 12

- Dữ liệu: 46.481 đơn, 347 khách (HN + HY); địa chỉ khách mới sinh từ đường thật OSM (xem `data-pipeline.md` đợt 12).

## Cập nhật đợt 14

- Phân trang chặt + 405 + validate đánh giá; `/api/notifications` có phân trang và `unreadCount`; thông báo tiếng Việt cho trạng thái đơn mới; tài xế và admin nhận thông báo (giao đơn, huỷ, hoàn tiền chờ lâu); 5 vùng giao (4 Hà Nội + Hưng Yên); `docs/openapi.json` phủ toàn bộ route.

## Cập nhật đợt 15

- Khách và chủ quán nhận thông báo ở mọi bước (tài xế nhận đơn, đã lấy món, đang giao, đã giao, huỷ/thất bại); danh sách admin hỗ trợ ?search=; `PATCH|POST /api/notifications/read-all`.

## Cập nhật đợt 17

- Danh sách admin hoàn tiền/tài xế/khuyến mãi/đối soát phân trang thật (xem được toàn bộ 3.083 yêu cầu hoàn tiền); giao diện admin có nút Trước/Sau; `summary` tổng hợp trên toàn bộ dữ liệu.

## Cập nhật đợt 18

- Toàn bộ thông báo/lịch sử trạng thái cũ hiển thị tiếng Việt; email mô phỏng `@example.com`; giao diện admin đã kiểm trên Chrome headless (phân trang đúng); ảnh món thiếu 161 → 73.
