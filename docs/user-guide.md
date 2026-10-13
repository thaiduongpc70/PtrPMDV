# User guide

1. Start the API from `food-delivery-platform/backend` and open `http://localhost:3000`.
2. Use the seeded accounts from `backend/scripts/seed-realistic.mjs`; the default password is `duong2k5`. The primary admin account is `thaiduongpc7` for `Lê Nguyễn Thái Dương`. Restaurant examples: `bep.annhien`, `pho.ganh36`, `comtam.suonmoc`, `gagion.bepdo`, `pizza.logach`; each owns one restaurant.
3. Customer flow: search catalog, add menu items, checkout with address ID, then monitor order status.
4. Restaurant flow: open the order queue and move an order through confirm, preparing and ready; use the management tab to update profile, create menu categories, toppings and variants.
5. Shipper flow: update availability, accept an assignment, send GPS and move delivery status.
6. Admin flow: inspect audit logs, users, system settings, imports, exports and settlements.

The API reference is available at `/api/docs` (Swagger UI) and `/api/openapi.json`.

Import jobs accept CSV text or Excel-compatible SpreadsheetML `.xls/.xml` text. Export jobs can generate CSV, Excel-readable `.xls` and PDF files under `/exports`.

## Bản đồ, theo dõi và thanh toán (mock)

- Bản đồ là SVG giả lập (không dùng Google Maps); toạ độ thật được chiếu lên khu vực TP.HCM, toạ độ thiếu/ngoài vùng được sinh cố định theo mã đơn.
- Khách: trong chi tiết đơn có thanh trạng thái, bản đồ theo dõi tài xế + ETA, chat theo đơn, cổng thanh toán giả lập (đơn online) và hóa đơn in/lưu PDF.
- Nhà hàng: đơn "Sẵn sàng lấy hàng" có form gán tài xế đang rảnh; theo dõi hành trình và chat.
- Tài xế: bản đồ chuyến đang giao, nút "Chạy giả lập hành trình" (gửi GPS giả, tự lấy hàng → giao), chọn vị trí bằng cách chạm bản đồ, nút thu COD, chat.
- Admin: tab "Bản đồ live" hiển thị mọi chuyến giao đang chạy (tự làm mới 5 giây).
- Áp migration `backend/database/migrations/20261013_grant_live_permissions.sql` cho DB đã tạo trước đó.

## Giao diện FoodGo, console Admin/Nhà hàng và dữ liệu mẫu

- Khách chưa đăng nhập vẫn xem được cửa hàng; đăng nhập/đăng ký nằm ở popup trên header. Có footer đầy đủ và widget "Hỗ trợ" (hotline, Zalo/Messenger giả lập, gửi ticket).
- Admin: bảng điều khiển, giám sát giao hàng, báo cáo, đơn hàng, nhà hàng (duyệt/khóa/hoa hồng), tài xế (duyệt giấy tờ), khách hàng, thanh toán & hoàn tiền, đối soát, khuyến mãi, banner, đánh giá, hỗ trợ, tài khoản, danh mục & khu vực, cấu hình, nhập/xuất, nhật ký bảo mật.
- Nhà hàng: tổng quan doanh thu, bảng đơn thời gian thực (tự làm mới 20 giây), lịch sử đơn có bộ lọc, thực đơn (tìm kiếm/phân trang), khuyến mãi, đánh giá & phản hồi, hồ sơ + giờ mở cửa, bật/tắt nhận đơn, đối soát.
- Dữ liệu lịch sử (≈45 ngày, ~500 đơn, 24 khách, 6 tài xế): `npm run seed:history` trong `backend` (chạy lại sẽ bỏ qua nếu đã có; thêm `--force` để thêm lô mới).

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

## Xuất dữ liệu CSV / PDF
- Mọi màn quản trị (đơn hàng, nhà hàng, tài xế, khách hàng, thanh toán, đối soát, tài khoản, nhật ký, hồ sơ đối tác, báo cáo) và màn **Lịch sử đơn** của nhà hàng đều có nút **⬇ Xuất dữ liệu** → CSV hoặc PDF.
- CSV có BOM UTF-8 nên mở bằng Excel không lỗi tiếng Việt. PDF là báo cáo A4 có logo/tiêu đề/tổng tiền, mở hộp thoại in của trình duyệt — chọn "Lưu dưới dạng PDF".
- API: `GET /api/admin/export/{orders|restaurants|shippers|customers|users|payments|settlements|revenue|audit|applications}` và `GET /api/restaurant/export/:restaurantId/{orders|menu|revenue|settlements}`; thêm `?format=csv` để tải file CSV trực tiếp, `?from=YYYY-MM-DD&to=YYYY-MM-DD` để lọc theo ngày (nơi có hỗ trợ). Tối đa 5.000 dòng mỗi lần.

### Chạy trong app Postman và xem lịch sử
- Import `postman/exports/Food Delivery API.postman_collection.json` (hoặc để Postman tự đọc thư mục `postman/collections` ở Local View), mở collection → **Run** → **Start run**. Mỗi lần chạy được Postman lưu ở tab **Runs** của collection và mục **History** ở thanh bên.
- Các folder `00`–`08` được viết lại theo từng vai trò (khách, nhà hàng, tài xế, admin) và có assertion cho từng request; `99 - Full E2E Flow` đi trọn một đơn từ đặt → giao → hóa đơn → đánh giá. Toàn collection hiện có 269 request / 424 assertion (kết quả mới nhất trong `postman/runs/HISTORY.md`).
