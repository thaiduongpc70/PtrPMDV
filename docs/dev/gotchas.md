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

- **Cổng mặc định 3001** (cổng 3000 trên máy này bị Grafana của dự án khác chiếm). Dừng server: `netstat -ano | findstr :3001` rồi `taskkill /PID <pid> /F` — đôi khi tiến trình cũ còn "treo" ở trạng thái FIN_WAIT: kiểm tra `Get-NetTCPConnection -LocalPort 3001` và đảm bảo sau khi sửa backend server đã chạy lại bản mới.
- Cổng Overpass/Nominatim: Nominatim có thể không phân giải được; Overpass cần User-Agent và hay quá tải (script có thử lại).
- `scripts/lib/db.mjs` đọc `.env` để kết nối MySQL trực tiếp cho script bảo trì; dữ liệu nghiệp vụ vẫn nên đi qua API.

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

## Hạn chế đã chốt (22/11/2026, "ĐỂ SAU")
- **Polling thay WebSocket**: đơn bếp 20s, theo dõi đơn 4s, bản đồ admin 5s; chưa có kênh đẩy.
- **Email xác minh chưa gửi thật**: mã xác minh/đặt lại được trả trực tiếp cho giao diện; hàng đợi email chỉ nằm trong bộ nhớ/Mailhog.
- **Không có OAuth/đăng nhập Google.**
- Thanh toán online là sandbox (nhãn "không trừ tiền thật" ở bước thanh toán). Số "đã giao" trang chủ là tích luỹ từ đơn đầu tiên (`stats.since`), thời gian giao TB tính 30 ngày gần nhất.
- Job tự huỷ đơn PENDING chưa thanh toán sau `PENDING_ORDER_TIMEOUT_MINUTES` phút chạy ngay khi server khởi động: dựng dữ liệu cũ (đơn PENDING lâu) sẽ bị huỷ ở lượt đầu. Muốn tắt tạm: `PENDING_ORDER_TIMEOUT_MINUTES=0`.
- Trong lệnh Bash của Claude Code, `\` trong heredoc node có thể bị nuốt (regex `B`, `d` mất dấu): ghi script bằng công cụ Write/Edit rồi chạy; luôn kiểm `includes()` trước `replace()`.
- File nguồn hỗn hợp CRLF/LF (`catalog.repository.js`, `index.html` là CRLF): vá bằng script phải chuẩn hoá rồi trả lại kiểu cũ.

## Đợt 2 (22/11/2026)
- Trigger đánh giá không có DELETE: đừng `DELETE FROM *_reviews` (thống kê quán/món sẽ lệch); dùng `deleted_at` (gỡ mềm) để trigger UPDATE tính lại.
- Job dọn đơn/voucher chạy ngay lúc server khởi động: dựng dữ liệu mô phỏng có đơn dang dở quá ngưỡng sẽ bị huỷ/FAILED ở lượt đầu (đặt `STALE_ORDER_MINUTES=0`, `STALE_DELIVERY_MINUTES=0` để tắt). Voucher quá hạn tự thành `EXPIRED`: chạy `node scripts/load-promotions.mjs` để gia hạn voucher quán qua API.
- Bảng thông báo lỗi: `src/shared/http/messages.js`; test so chuỗi tiếng Việt, đừng so tiếng Anh.
- Cache `/api/catalog` khoá theo người dùng (kết quả có thể cá nhân hoá theo địa chỉ mặc định).
- Chưa làm trong đợt 2 (cần thời gian chạy dài/duyệt ảnh bằng mắt): lấp 134 món còn thiếu ảnh (T5) và thêm quán Hà Nội + nối dữ liệu tới 22/11 (T8). Dữ liệu đơn vẫn dừng ở 08/11/2026.

## Đợt 4 (23/11/2026)
- Khi mô phỏng lâu, đồng hồ máy có thể sang ngày mới: `spread-timeline` đặt đơn cuối cách hiện tại ≥ 75 phút nên "đơn cuối" có thể ở ngày sau ngày bắt đầu đợt.
- Job dọn đơn dở sẽ huỷ/FAILED các đơn mô phỏng đang chạy nếu ngưỡng nhỏ: khi mô phỏng đặt `STALE_ORDER_MINUTES=0 STALE_DELIVERY_MINUTES=0 PENDING_ORDER_TIMEOUT_MINUTES=0`; khi muốn quét đơn kẹt sau sự cố thì đặt = 1 rồi khởi động lại bình thường. Job không xử lý đơn `CONFIRMED` kẹt: dùng `scripts/reject-stuck-order.mjs`.
- `add-restaurants.mjs` luôn chạy với `--only` khi thêm quán (không `--only` sẽ ghi đè `new-places.json` và gọi Overpass cho cả quán cũ). Mã voucher quán sinh theo "2 từ cuối của tên quán": hai quán cùng đuôi tên đụng mã — `load-promotions.mjs` nay thêm id quán nếu trùng.
- Sau khi nối đơn mới, luôn chạy lại `trim-simulated-reviews.mjs` (dry-run trước) để đưa phủ đánh giá và điểm TB về khoảng mục tiêu; mô phỏng nối thêm sẽ lệch dần.
- Ảnh quán mới dùng thư viện hiện có: 110/330 món thường của 22 quán mới và 1 combo chưa có ảnh đúng nên để trống.

## Đợt 5–6

- Đánh giá đã xoá mềm (`deleted_at`) vẫn còn trong bảng: mọi truy vấn nghiệm thu bình luận phải lọc `deleted_at IS NULL`.
- Sau `retime-out-of-hours-orders.mjs` bắt buộc chạy lại `spread-timeline.mjs` và `simulate-closeout.mjs --regenerate-settlements`, nếu không các mốc sự kiện/quyết toán lệch ngày.
- Báo giá ngoài vùng giao (>15 km) trả `outOfRange: true`, phí 0 và `outOfRangeMessage`; đặt đơn trả 400 (`ADDRESS_TOO_FAR`).
- Đơn huỷ/thất bại đã thanh toán online chỉ thành REFUNDED khi admin duyệt hoàn tiền COMPLETED (PATCH `/api/admin/manage/refunds/:id`); `refund-failed-orders.mjs` xử lý tồn.
- Ảnh combo ghép từ ảnh món thành phần: nếu thành phần chính không có ảnh, combo chỉ còn ảnh đồ uống (vd combo-5333) — chưa lý tưởng.

## Đợt 7

- Job tự duyệt hoàn tiền chạy mỗi 30 giây khi máy chủ bật: muốn kiểm soát thủ công thì đặt `REFUND_AUTO_APPROVE_MINUTES=0`.
- Máy chủ phải bật bằng đúng tiến trình `src/server.js`; đừng `taskkill /IM node.exe` (xem `run-server.md`).
- `rateLimit` nhận `max` là hàm theo request; middleware xác thực (`authContextMiddleware`) phải chạy TRƯỚC `rateLimit` để biết vai trò.
- Tìm kiếm quán dùng `MIN_DISH_HITS`: sửa ngưỡng ở `search-text.js` thì cập nhật cả test `search-threshold.test.js`.

## Đợt 14

- `notifications.type` là ENUM (ORDER, DELIVERY, PAYMENT, PROMOTION, SYSTEM, SUPPORT): thông báo mới phải dùng một trong các giá trị này (loại sai sẽ lỗi "Data truncated" và bị nuốt bởi `.catch`).
- Phân trang nghiêm ngặt: client gọi `pageSize` vượt tối đa nhận 400 thay vì bị cắt; kiểm tra frontend khi đổi `pageSize`.
- `docs/openapi.json` do `tools/generate-openapi.mjs` giữ mô tả viết tay; xoá route thì phải xoá cả thao tác cũ trong file.

- `tools/generate-dev-docs.mjs`: lệnh sinh `openapi.json` phải nằm TRƯỚC `process.exit(0)` ở cuối file (lỗi đợt 14–15: nằm sau exit nên không bao giờ chạy; `test/admin-lists-openapi.test.js` canh lại). Danh sách admin shippers/promotions/refunds nay có `totalItems` (đếm theo cùng điều kiện lọc; refunds vẫn chỉ trả tối đa 200 dòng nhưng `totalItems` là tổng thật).

## Đợt 18

- `spread-timeline.mjs` xác định mốc thông báo bằng nội dung message (nay nhận cả tiếng Anh cũ và tiếng Việt): đổi câu chữ thông báo thì cập nhật CASE ở đó.
- `image-library/build.mjs` ghi đè toàn bộ `docs/image-credits.md`: nối lại ghi chú sau mỗi lần build.
- Kiểm thử giao diện admin không cần cài gói: Chrome headless + CDP qua WebSocket có sẵn trong Node (đặt `localStorage` fd_access_token/fd_refresh_token).

## Đợt 19

- Đừng `INSERT INTO refunds` hay `UPDATE refunds SET status` trực tiếp: dùng `modules/payments/refund-service.js` (khoá đơn + kiểm hạn mức + đồng bộ payments/orders).
- Script mô phỏng KHÔNG gọi `/refund` sau khi huỷ/từ chối đơn (luồng huỷ đã tạo yêu cầu).

## Chuẩn bị commit

KHÔNG commit: `food-delivery-platform/backend/.env`, `backend/backups/` (dump DB hàng GB), `storage/` (ảnh tải lên/thư viện ảnh; dựng lại bằng `image-library/build.mjs` từ `scripts/data/image-library.json`), `release/`, `minh-chung/`, `outputs/` (mới), `node_modules/`, `scripts/tmp-*`. Nên commit: mã nguồn, test, migration, `scripts/`, `docs/`, `food_delivery_db.sql`, `tools/generate-dev-docs.mjs` + `tools/generate-openapi.mjs` (đã mở ngoại lệ trong `.gitignore`).
