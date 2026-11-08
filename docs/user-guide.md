# User guide

1. Start the API from `food-delivery-platform/backend` and open `http://localhost:3001`.
2. Use the seeded accounts from `backend/scripts/seed-realistic.mjs`; the default password is `duong2k5`. The primary admin account is `thaiduongpc7` for `Lê Nguyễn Thái Dương`. Restaurant examples: `bep.annhien`, `pho.ganh36`, `comtam.suonmoc`, `gagion.bepdo`, `pizza.logach`; each owns one restaurant.
3. Customer flow: search catalog, add menu items, checkout with address ID, then monitor order status.
4. Restaurant flow: open the order queue and move an order through confirm, preparing and ready; use the management tab to update profile, create menu categories, toppings and variants.
5. Shipper flow: update availability, accept an assignment, send GPS and move delivery status.
6. Admin flow: inspect audit logs, users, system settings, imports, exports and settlements.

The API reference is available at `/api/docs` (Swagger UI) and `/api/openapi.json`.

Import jobs accept CSV text or Excel-compatible SpreadsheetML `.xls/.xml` text. Export jobs generate real files under `/exports`: CSV (UTF-8 BOM), Excel `.xlsx` and PDF (A4, Vietnamese font) — the same writers as the report exports below.

## Bản đồ, theo dõi và thanh toán

- Bản đồ là **OpenStreetMap** (Leaflet, đã đóng gói trong `frontend/vendor/leaflet`; ô bản đồ tải từ `tile.openstreetmap.org` nên cần Internet). Mọi điểm trên bản đồ là toạ độ thật trong DB: quán (`restaurants`), địa chỉ giao (`customer_addresses`/đơn), vị trí tài xế (`shipper_locations`, `shipper_profiles.current_*`). Không có toạ độ bịa: thiếu toạ độ thì không vẽ điểm.
- Khách: chi tiết đơn có thanh trạng thái, bản đồ theo dõi tài xế (GPS mới nhất), khoảng cách và ETA ước tính, chat theo đơn và hóa đơn in/lưu PDF.
- Nhà hàng: đơn "Sẵn sàng lấy hàng" có form gán tài xế đang rảnh; theo dõi hành trình và chat.
- Tài xế: bản đồ chuyến đang giao; nút **Chia sẻ vị trí GPS của tôi** dùng GPS thật của thiết bị (`navigator.geolocation`, gửi lên `/api/shippers/locations` tối đa 5 giây/lần); chọn vị trí bằng cách chạm bản đồ hoặc dùng GPS; nút thu COD; chat.
- Admin: tab "Giám sát giao hàng" hiển thị mọi chuyến đang chạy (tự làm mới 5 giây).
- Thanh toán: các cổng MoMo/VNPay/ZaloPay/thẻ **chưa nối cổng thật**; đơn trả trước đi qua cổng thử nghiệm (sandbox) `/api/payments/orders/{id}/mock-pay` và ghi nhận giao dịch trong DB.
- Áp migration `backend/database/migrations/20261013_grant_live_permissions.sql` cho DB đã tạo trước đó.

## Giao diện FoodGo, console Admin/Nhà hàng và dữ liệu mẫu

- Khách chưa đăng nhập vẫn xem được cửa hàng; đăng nhập/đăng ký nằm ở popup trên header. Có footer đầy đủ và widget "Hỗ trợ" (hotline, Zalo/Messenger giả lập, gửi ticket).
- Admin: bảng điều khiển, giám sát giao hàng, báo cáo, đơn hàng, nhà hàng (duyệt/khóa/hoa hồng), tài xế (duyệt giấy tờ), khách hàng, thanh toán & hoàn tiền, đối soát, khuyến mãi, banner, đánh giá, hỗ trợ, tài khoản, danh mục & khu vực, cấu hình, nhập/xuất, nhật ký bảo mật.
- Nhà hàng: tổng quan doanh thu, bảng đơn thời gian thực (tự làm mới 20 giây), lịch sử đơn có bộ lọc, thực đơn (tìm kiếm/phân trang), khuyến mãi, đánh giá & phản hồi, hồ sơ + giờ mở cửa, bật/tắt nhận đơn, đối soát.

## Dữ liệu chạy thật (mô phỏng qua API)

Dữ liệu trong DB không còn là "Demo dish 1-31" hay đơn chèn tay. Mọi bản ghi đều do chính hệ thống tạo ra khi chạy: khách đăng ký, tài xế nộp hồ sơ và admin duyệt, chủ quán dựng thực đơn, khách đặt hàng, thanh toán, quán chế biến, tài xế giao có GPS, rồi khách đánh giá. Người dùng là nhân vật hư cấu (email dùng tên miền `example.vn`), không phải khách thật.

| Bước | Lệnh (trong `backend`) | Việc làm |
|---|---|---|
| 0 | `npm run db:backup` | Sao lưu DB (ghi thẳng bằng `mysqldump --result-file`, giữ đúng tiếng Việt) |
| 1 | `npm run data:reset -- --yes` | Xoá quán/món/tài khoản mẫu và dữ liệu giao dịch cũ |
| 2 | `npm run data:menus` | 20 quán × ~20 món thật (tên, mô tả, giá, size, topping) nạp qua API chủ quán |
| 2b | `npm run data:options` | Nhóm tuỳ chọn kiểu ShopeeFood: mức đường/đá (bắt buộc chọn 1), loại đế pizza, độ cay, chọn nước |
| 2c | `npm run data:promotions` | Voucher toàn sàn (admin), voucher từng quán (chủ quán), quà đổi điểm, 60 combo — đều qua API đúng phân quyền |
| 2d | `node scripts/set-opening-hours.mjs` | Giờ mở cửa theo loại hình (quán đêm mở qua nửa đêm) |
| 2e | `node scripts/repair-freeship-orders.mjs` | Sửa các đơn freeship tạo trước khi sửa công thức tính giá (khách trả thiếu phí giao, tài xế nhận 0đ) |
| 3 | `npm run data:simulate -- --ignore-hours` | Tạo ~115 khách, 16 tài xế; chạy đơn hàng (nhóm tuỳ chọn, ghi chú, quote + voucher, combo) đến khi mỗi món/combo đủ 20-50 đánh giá |
| 3b | `node scripts/simulate-rewards.mjs` | Khách đổi điểm thưởng lấy voucher qua API |
| 4 | `npm run data:extras` | Quán trả lời đánh giá, khách yêu thích/tìm kiếm/nạp ví, tài xế rút tiền, admin xử lý hoàn tiền (`-- --incremental` chỉ trả lời đánh giá mới + hoàn tiền) |
| 5 | `npm run data:finalize` | Giữ mỗi món 20-50 đánh giá, tính lại điểm trung bình của món/quán/tài xế |
| 6 | `npm run data:spread` | Rải mốc thời gian ra 6 tuần (29/08 → hôm nay) theo giờ cao điểm, dựng dòng thời gian từng đơn; `-- --recent-from-id N --recent-days 45` chỉ rải các đơn mới (id ≥ N) và đặt mốc ra mắt combo/voucher/điểm thưởng, thời điểm đổi điểm hợp lý |
| 7 | `npm run data:closeout` | Quyết toán hàng tuần, đối soát COD, đánh dấu thông báo đã đọc (`-- --regenerate-settlements` tính lại quyết toán sau khi có thêm đơn ở tuần cũ) |
| 8 | `npm run data:banners` | Banner trang chủ dựng từ voucher/combo/điểm thưởng thật, ảnh nền sinh bằng `sharp` và lưu qua API admin |
| - | `npm run data:cleanup-tests` | Dọn tài khoản/quán "Postman" do bộ test để lại |

Cần chạy server với giới hạn request cao hơn mặc định khi mô phỏng: `RATE_LIMIT_MAX=10000 npm start`. Số ngẫu nhiên có seed nên chạy lại cho kết quả giống nhau.

Lưu ý về tính "thật": mô phỏng chạy trong vài chục phút nên bước 6 chỉ gán lại **thời gian** của bản ghi (không đổi nội dung giao dịch). Điểm sao, bình luận và hành vi khách do kịch bản mô phỏng sinh ra theo phân bố (món ngon/dở, khách dễ/khó tính, đơn giao muộn), không phải ý kiến của người thật.

Kết quả hiện tại: 20 quán, 406 món + 60 combo (mỗi món/combo 20-50 đánh giá, 1-5 sao), 117 khách, 16 tài xế, ~18.000 đơn từ 29/08 đến nay, hàng chục nghìn đánh giá món/quán/tài xế, 7 voucher toàn sàn, 40 voucher quán, sổ điểm thưởng khớp với số dư của khách.

### Đánh giá theo món

- Khách đánh giá từng món sau khi đơn `DELIVERED`: `POST /api/communications/orders/{orderId}/item-reviews`.
- Xem đánh giá và phân bố sao của món (công khai): `GET /api/catalog/menu-items/{itemId}/reviews`. Điểm trung bình và số lượt nằm sẵn trong `rating` / `totalReviews` của món.
- Trên web: mở một món để thấy điểm, biểu đồ 1-5 sao và bình luận gần đây.

## Tìm quán kiểu ShopeeFood

- Header có ô chọn **tỉnh/thành** (63 tỉnh, tìm nhanh, nhớ lựa chọn); tỉnh chưa có quán hiển thị "Sắp ra mắt" thay vì dữ liệu giả. `GET /api/catalog/cities`, `GET /api/catalog/districts?city=`.
- Thanh tab: **Nổi bật · Gần tôi · Đặt nhiều · Đánh giá cao · Giao nhanh · Ưu đãi**, lọc quận/huyện và "Đang mở cửa". "Gần tôi" dùng GPS của trình duyệt (nếu từ chối thì dùng địa chỉ giao hàng, cuối cùng là trung tâm tỉnh/thành). Thẻ quán có khoảng cách, thời gian chuẩn bị, trạng thái mở/đóng cửa, nhãn voucher.
- API: `GET /api/catalog/restaurants?city=&district=&sort=featured|nearest|popular|top_rated|fastest|promo&lat=&lng=&promo=1&openNow=1`.

## Chi tiết món, ghi chú và đặt hàng

- Modal món: chọn size, nhóm tuỳ chọn (bắt buộc/tuỳ chọn, giới hạn số lượng chọn), ghi chú cho quán (kèm gợi ý nhanh), số lượng; tổng tiền cập nhật tức thì.
- Giỏ hàng sửa được ghi chú từng món. Checkout có ghi chú cho quán, **ghi chú cho tài xế**, lấy dụng cụ ăn uống, giao không tiếp xúc; tài xế và bếp thấy các ghi chú này.
- Phí giao tính theo khoảng cách: phí cơ bản gồm 3 km đầu, mỗi km tiếp theo cộng `delivery_price_per_km`; ngoài `max_delivery_distance` thì quán không giao. Báo giá: `POST /api/customer/orders/quote` (phí giao, giảm giá, tổng, voucher gợi ý, mốc freeship còn thiếu, điểm sẽ tích).

## Ưu đãi, combo và điểm thưởng

- **Voucher toàn sàn** do admin tạo: mã giảm giá chung (giảm % hoặc trực tiếp) không giới hạn hạn ngạch và thời gian; mã **freeship** bắt buộc có hạn ngạch và ngày kết thúc. Có mã chỉ cho khách mới (đơn đầu tiên).
- **Voucher của quán** do chủ quán tự cấp: chỉ giảm % hoặc giảm trực tiếp, bắt buộc có hạn ngạch và hạn dùng ≤ 90 ngày, có nút gia hạn (+7 ngày, +50 lượt). Admin và chủ quán đều có API `/promotions/{id}/extend`.
- **Ví voucher & chọn voucher ở giỏ hàng**: danh sách dùng được/chưa đủ điều kiện (cần mua thêm bao nhiêu), gợi ý voucher tiết kiệm nhất, thanh tiến độ freeship.
- **Điểm thưởng**: 1 điểm cho mỗi 1.000đ tiền món khi đơn giao thành công (trigger `trg_order_delivered_loyalty`). Khách đổi điểm lấy voucher cá nhân dùng 1 lần ở tab **Ưu đãi**; admin quản danh mục quà.
- **Combo**: món bán trọn gói từ các món của quán, rẻ hơn mua lẻ; hiển thị "Tiết kiệm X", danh sách món thành phần; chủ quán tạo trong tab Khuyến mãi (`PUT .../menu-items/{id}/combo`).

## Công thức tiền

- Tổng thanh toán = tiền món + phí giao + thuế − giảm giá. Voucher giảm % hoặc trực tiếp trừ vào tiền món (không quá tiền món); voucher freeship chỉ miễn tối đa bằng phí giao thật. `orders.delivery_fee` luôn giữ phí giao thật nên tài xế được trả đủ; phần được miễn nằm trong `discount_amount`.
- Quyết toán quán theo tuần: doanh thu = tổng **tiền món** của đơn đã giao (phí giao thuộc về tài xế); trừ hoa hồng nền tảng, trừ hoàn tiền, và trừ **voucher do quán tự cấp** (cột điều chỉnh). Voucher toàn sàn do nền tảng chịu nên quán vẫn nhận đủ tiền món.
- Doanh thu ròng nền tảng = hoa hồng − chi phí voucher toàn sàn (xem Admin → Báo cáo → Tổng quan).

## Thống kê, báo cáo và xuất file thật

- **Admin → Báo cáo & phân tích** (8 tab): doanh thu & hoa hồng (so sánh kỳ trước, biểu đồ đường/cột chồng, bản đồ nhiệt thứ × giờ), nhà hàng, món & combo, khu vực, khuyến mãi & điểm thưởng, khách hàng (mới/quay lại, tần suất), tài xế, tài chính (quyết toán, COD, hoàn tiền). Chọn khoảng ngày bất kỳ (tối đa 366 ngày) và gom theo ngày/tuần/tháng.
- **Quán → Báo cáo & thống kê**: doanh thu, món & combo (món chưa bán được), voucher, khách hàng, đối soát. **Tài xế → Thu nhập**: thu nhập, chuyến, đúng giờ. **Khách → Chi tiêu**: chi tiêu, tiền tiết kiệm nhờ ưu đãi, điểm.
- Mọi bảng có nút **Excel / PDF / CSV**: file do máy chủ sinh ra (không phải hộp thoại in): `.xlsx` có định dạng tiền/ngày, bộ lọc, cố định dòng tiêu đề, dòng tổng bằng công thức; PDF A4 tiếng Việt nhiều trang có số trang; CSV UTF-8 BOM.
- API: `GET /api/analytics/admin/{overview|restaurants|items|regions|promotions|customers|shippers|finance}`, `/api/analytics/restaurant/{id}/{overview|items|promotions|customers|finance}`, `/api/analytics/shipper/performance`, `/api/analytics/customer/spending` với `from`, `to`, `group`, `format=xlsx|pdf|csv`.

## Chạy test full luồng bằng Postman collection

- Collection nằm ở `postman/collections/Food Delivery API - Tested Flow` (Postman tự nạp ở Local View). Thư mục mới: `09 Address Book`, `10 Admin Management`, `11 Restaurant Management`, `12 Live Delivery & Monitoring` và `99 Full E2E Flow` (đăng ký → địa chỉ → đặt món → thanh toán → bếp → gán tài xế → GPS/chat → giao xong → hóa đơn/đánh giá → admin/báo cáo → ticket → hủy đơn).
- Collection tự đăng nhập theo vai trò (script pre-request cấp cấp collection), nên có thể chạy riêng từng thư mục trong Postman.
- Chạy bằng dòng lệnh (API phải đang chạy): trong `food-delivery-platform/backend` dùng `npm run test:e2e` (chỉ luồng 99), `npm run test:postman` (toàn bộ), hoặc `node scripts/run-postman.mjs --folder "10 - Admin Management"`.

### Lưu lịch sử chạy test
- Mỗi lần chạy `npm run test:postman` / `test:e2e` / `run-postman.mjs` đều tự lưu vào `postman/runs/`: `HISTORY.md` (bảng tổng hợp, mới nhất ở trên), `history.json` và một báo cáo chi tiết `<thời-điểm>.json` cho từng lần chạy (từng request, status, thời gian, từng assertion). Thêm `--no-history` nếu không muốn ghi.
- Khi chạy toàn bộ collection, bản chuyển sang Postman v2.1 được ghi ở `postman/exports/Food Delivery API.postman_collection.json`. Import file này vào Postman (Import → File) rồi chạy bằng Collection Runner để lịch sử chạy cũng nằm trong chính app Postman.
- Thư mục mới: `13 - Partner Onboarding` (đăng ký tài xế/nhà hàng → admin duyệt/từ chối → đăng nhập) và `14 - Data Export` (xuất CSV/JSON cho admin và nhà hàng, kiểm tra phân quyền).

## Đăng ký đối tác (tài xế / nhà hàng)
- Trang chủ có hai khối "Đăng ký nhà hàng" / "Trở thành tài xế" (cũng có ở footer và tab Tạo tài khoản). Form gọi `POST /api/partners/register/shipper` hoặc `/register/restaurant`.
- Tài khoản tạo ra ở trạng thái `PENDING` (đăng nhập sẽ báo "đang chờ duyệt"); tài xế ở trạng thái `SUSPENDED`, nhà hàng ở `PENDING`.
- Admin vào **Duyệt đối tác**: xem hồ sơ, bấm Duyệt (nhà hàng nhập tỷ lệ hoa hồng) hoặc Từ chối (bắt buộc ghi lý do). Duyệt xong tài khoản chuyển `ACTIVE`, giấy tờ tài xế được đánh dấu đã xác minh và ví được tạo. Từ chối thì tài khoản chuyển `INACTIVE`.
- API admin: `GET /api/admin/partners/applications?status=&type=`, `POST /api/admin/partners/applications/:id/approve|reject`. Bảng dữ liệu: `partner_applications` (migration `20261014_partner_applications.sql`).

## Xuất dữ liệu Excel / PDF / CSV

- Mọi màn quản trị (đơn hàng, nhà hàng, tài xế, khách hàng, thanh toán, đối soát, tài khoản, nhật ký, hồ sơ đối tác) và màn **Lịch sử đơn** của nhà hàng có nút **⬇ Xuất dữ liệu** → Excel, PDF hoặc CSV; file được tạo ở máy chủ rồi tải về.
- API: `GET /api/admin/export/{orders|restaurants|shippers|customers|users|payments|settlements|revenue|audit|applications}` và `GET /api/restaurant/export/:restaurantId/{orders|menu|revenue|settlements}`; thêm `?format=xlsx|pdf|csv` để tải file, `?from=YYYY-MM-DD&to=YYYY-MM-DD` để lọc theo ngày. Tối đa 5.000 dòng mỗi lần (PDF hiển thị tối đa 2.000 dòng kèm ghi chú).

### Chạy trong app Postman và xem lịch sử
- Import `postman/exports/Food Delivery API.postman_collection.json` (hoặc để Postman tự đọc thư mục `postman/collections` ở Local View), mở collection → **Run** → **Start run**. Mỗi lần chạy được Postman lưu ở tab **Runs** của collection và mục **History** ở thanh bên.
- Các folder `00`–`08` được viết lại theo từng vai trò (khách, nhà hàng, tài xế, admin) và có assertion cho từng request; `99 - Full E2E Flow` đi trọn một đơn từ đặt → giao → hóa đơn → đánh giá. Toàn collection hiện có 269 request / 424 assertion (kết quả mới nhất trong `postman/runs/HISTORY.md`).

## Giao diện cửa hàng kiểu ShopeeFood (bản thiết kế lại)

- Header gọn: logo · chọn tỉnh/thành · Đồ ăn / Combo / Ưu đãi / Đơn hàng / Yêu thích / Chi tiêu / Hỗ trợ · tìm kiếm · thông báo · giỏ · đăng nhập.
- Trang chủ hai cột: bên trái lời chào + ô tìm kiếm + chip danh mục + voucher đang chạy (đều từ DB); bên phải ô chọn địa chỉ giao, **Bộ sưu tập** (banner admin + bộ sưu tập tính từ dữ liệu: voucher, combo, đánh giá ≥ 4★, chuẩn bị nhanh, mở khuya, danh mục) và danh sách quán dạng dòng với các tab Nổi bật · Gần tôi · Bán chạy · Đánh giá · Giao nhanh · Ưu đãi.
- Trang quán: thông tin + voucher, menu theo nhóm (cột trái), món dạng dòng có nút "+", giỏ hàng nhỏ ở cột phải (tăng/giảm/đặt hàng).
- Đăng nhập: form gọn, có **Quên mật khẩu** (nhập email → nhận mã → đặt lại mật khẩu) qua `POST /api/auth/password/forgot|reset`.
- Tài liệu kỹ thuật cho người/AI tiếp tục phát triển: `docs/dev/README.md` và `CLAUDE.md`.
