# Bẫy đã gặp, quy ước và việc chưa làm

## Cơ sở dữ liệu
- **Trigger một câu lệnh + driver gộp nhiều câu (`multipleStatements`)**: thân trigger bị lưu kèm dấu `;` thừa ⇒ `mysqldump` ra file **không khôi phục được** (lỗi 1064 gần `*/`). Áp migration bằng **mysql client** (`mysql < file.sql`) hoặc tạo từng trigger bằng một `query()` riêng không có `;` cuối. Kiểm: `SELECT ACTION_STATEMENT FROM information_schema.TRIGGERS` không được kết thúc bằng `;`.
- **MySQL cấm đọc rồi sửa cùng bảng trong trigger** (`Can't update table … already used by statement`): vì vậy số dư sổ điểm tính ở trigger `BEFORE INSERT` và cập nhật hồ sơ ở `AFTER INSERT`.
- **Deadlock** khi nhiều request đồng thời: `query()` và `withTransaction()` tự thử lại tối đa 4 lần (`ER_LOCK_DEADLOCK`, `ER_LOCK_WAIT_TIMEOUT`). Tránh `DELETE` hết rồi `INSERT` lại các bảng liên kết (gap lock) — chỉ xoá/thêm phần thay đổi (xem `menu.repository.js#linkToppingGroups`).
- **Trigger và code cùng ghi một thứ** từng gây lỗi: lịch sử trạng thái trùng; `shipper_profiles.total_deliveries` cộng đôi. Quy ước: trigger là nguồn, code chỉ bổ sung (xem `business-rules.md` §8).
- Datetime lưu **naive theo giờ địa phương (UTC+7)**; script cần epoch dùng `SET time_zone='+00:00'` và `dateStrings:true` (xem `spread-timeline.mjs`).
- `mysqldump` qua pipe PowerShell làm hỏng tiếng Việt — luôn dùng `--result-file` và `source`.
- `over` là từ khoá SQL (đừng đặt alias `over`).

## Backend
- Thứ tự mount route quan trọng (`/api/customer/orders/quote` trước `/orders/:orderId`).
- Cache `/api/catalog` 30 giây (có thể thấy dữ liệu cũ ngay sau khi sửa); Redis không bắt buộc.
- Log lỗi 500 có stack ở `http.unhandled_error` (xem log JSON khi gặp "Internal server error").
- Rate limit mặc định thấp — chạy script hàng loạt cần `RATE_LIMIT_MAX=10000`.
- `catalog.repository.js#searchRestaurants`: `ORDER BY` do biểu thức dựng sẵn theo `sort`; thêm kiểu sắp xếp mới phải thêm vào cả `RESTAURANT_SORTS` (service) và `orderSql` (repository).
- Cổng thanh toán online là sandbox; đừng coi `mock-pay` là tích hợp thật.
- Checkout chưa chặn quán đóng cửa; frontend refresh token chưa tự động.

## Frontend
- Một file `app.js` rất lớn: tìm hàm bằng `grep -n "function tênHàm"`. Các màn nhân sự (admin/chủ quán) là DOM do JS dựng — sửa HTML tĩnh không đủ.
- `showSubView` gọi hàm tải dữ liệu theo màn (offers/stats/…); thêm màn mới nhớ thêm nhánh ở đó.
- Bản đồ cần Internet để tải ô nền OSM; CSP ở `app.js` chỉ cho phép `tile.openstreetmap.org` cho ảnh ngoài.
- Không để chữ/số cứng trên giao diện (người dùng yêu cầu dữ liệu thật): lấy từ API.

## Cách sửa file an toàn trên máy này (Windows)
- Nhiều file nguồn dùng **CRLF**, một số **LF** (không đồng nhất). Khi vá bằng script, đọc file, chuẩn hoá về `\n`, thay thế, rồi ghi lại đúng kiểu xuống dòng gốc (đừng làm lẫn kiểu trong một file). Công cụ Edit xử lý được, nhưng `Read` trước khi `Edit`.
- Heredoc trong Bash tool dễ hỏng khi chứa nhiều lớp nháy/backtick — ghi script bằng công cụ Write rồi chạy.
- Thư mục scratchpad tạm có thể bị dọn giữa các phiên: đừng để công cụ cần thiết chỉ nằm ở đó (script lâu dài đặt trong `tools/` hoặc `backend/scripts/`).
- Dừng server: `netstat -ano | grep :3001` lấy PID rồi `taskkill //PID <pid> //F` (không có `pkill`).
- Python/ImageMagick/poppler không có sẵn; xem PDF bằng cách mở trong Edge headless rồi chụp màn hình.

## Việc chưa làm / hạn chế đã biết
Xem mục 2 và 4 của `features.md`. Ngoài ra: ảnh món/quán chưa có (dữ liệu mẫu không có ảnh); `docs/openapi.json` chưa phủ hết route; dữ liệu dừng ở 13/10/2026 so với đồng hồ hiện tại; `minh-chung/` (ảnh minh chứng theo tuần) đã cũ; Postman collection chưa chạy lại sau các thay đổi voucher/nhóm tuỳ chọn/phí giao theo km.
