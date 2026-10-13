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
