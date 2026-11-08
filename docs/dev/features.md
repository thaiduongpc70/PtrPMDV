# Chức năng và đối chiếu Master Plan

Ký hiệu: ✅ đã làm & chạy được · 🟡 làm một phần / dạng đơn giản · ❌ chưa làm. "Code" chỉ nơi sửa chính. Route chi tiết ở `api-routes.md`.

## 1. Chức năng theo vai trò

### Khách hàng (CUSTOMER) — giao diện: màn `customer`
| Chức năng | Trạng thái | Code / API |
|---|---|---|
| Đăng ký, đăng nhập, quên/đặt lại mật khẩu | ✅ | `auth.*`; modal `#authModal` (`app.js`: `openAuth`, `login`) |
| Xác minh email | 🟡 API có (`/api/auth/email/verification/*`), **chưa có UI** | `auth.service.js` |
| Hồ sơ, ví | ✅ màn `account` (Hồ sơ, Ví) | `customer.*`, `/api/payments/wallet/*` |
| Sổ địa chỉ + ghim vị trí trên bản đồ OSM | ✅ | `address.js`, `/api/customer/addresses` |
| Chọn tỉnh/thành, tìm quán/món, tab Nổi bật·Gần tôi·Bán chạy·Đánh giá·Giao nhanh·Ưu đãi, lọc quận/đang mở/bộ sưu tập, phân trang | ✅ | `catalog.*`; `app.js`: `searchCatalog`, `renderRestaurants`, `loadCollections` |
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
| 1.4 | UI đăng ký/đăng nhập/hồ sơ + màn theo 4 vai trò | ✅ | Xác minh email chưa có UI |
| 2.1–2.2 | CRUD nhà hàng/menu/món, giá, trạng thái, ảnh | ✅ | Ảnh món/quán: upload hỗ trợ nhưng **dữ liệu mẫu chưa có ảnh** (UI dùng ô màu + emoji) |
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
| 5.1 | Nhập/xuất Excel/CSV/PDF qua job | ✅ | Xuất .xlsx/.pdf/.csv thật; **nhập .xlsx chưa hỗ trợ** (CSV và SpreadsheetML `.xls/.xml` thì có) |
| 5.2 | Rà SQLi/XSS/CSRF, upload, secret | 🟡 | Dùng truy vấn tham số hoá, `escapeHtml` ở frontend, helmet+CSP, rate limit; chưa có báo cáo rà soát bảo mật chính thức |
| 6.1 | Docker Compose, CI/CD, logging, health | ✅ | `.github/workflows`, `/health/live|ready`, log JSON |
| 6.2 | OpenAPI/Postman/tài liệu | ✅ | `docs/openapi.json` (70 path, chưa phủ hết 219 route), Postman |
| 6.3 | Video demo, kiểm tra bàn giao | 🟡 | `docs/video-demo-script.md`, `handover-checklist.md`; chưa có video |
| 7 | Ổn định realtime/GPS, hiệu năng | 🟡 | API đo < ~120 ms trên 18k đơn; chưa tải thử nặng |

## 3. Chức năng thêm ngoài Master Plan (đã làm)
Đánh giá theo món · nhóm tuỳ chọn bắt buộc/giới hạn · ghi chú quán/tài xế/dụng cụ · phí giao theo km · voucher toàn sàn/quán/cá nhân/khách mới · freeship theo ngưỡng · điểm thưởng & đổi quà · combo · thống kê 4 vai trò + xuất file thật · chọn tỉnh/thành · bộ sưu tập · giao diện kiểu ShopeeFood.

## 4. Việc nên làm tiếp (gợi ý)
1. UI xác minh email; (tuỳ chọn) đăng nhập OAuth.
2. Ảnh thật cho quán/món (upload đã có API) và banner do admin tải lên.
3. Nối cổng thanh toán thật (MoMo/VNPay sandbox thật) thay `mock-pay`.
4. WebSocket/SSE thay polling; thông báo đẩy.
5. Mở rộng OpenAPI phủ hết route (có thể sinh từ `api-routes.md`); đo coverage.
6. Dữ liệu đang dừng ở 13/10/2026 (đơn cuối) — nếu cần "đang chạy tới hôm nay" phải chạy tiếp pipeline (xem `data-pipeline.md`).
7. Chụp lại `minh-chung/` (ảnh cũ, dữ liệu cũ).
