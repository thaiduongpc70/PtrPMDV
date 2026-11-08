# Dữ liệu "chạy thật" (data pipeline)

Toàn bộ dữ liệu trong DB do **chính hệ thống tạo ra qua API thật** (không chèn SQL tay): khách đăng ký, tài xế nộp hồ sơ rồi admin duyệt, chủ quán dựng thực đơn/voucher/combo, khách đặt–thanh toán–nhận hàng, quán chế biến, tài xế giao kèm GPS, khách đánh giá, admin quyết toán. Khách/tài xế là **nhân vật hư cấu** (email `@example.vn`); điểm sao/bình luận/hành vi do kịch bản sinh theo phân bố có seed (mulberry32) nên chạy lại cho kết quả tương tự. Bước `spread` chỉ gán lại **thời gian** của bản ghi.

Tài khoản (mật khẩu `duong2k5`): admin `thaiduongpc7`; chủ quán `bep.annhien` (quán 22), `trasua.lanon` (27)…; tài xế `bao.shipper`; khách `minh.anh`.

## Điều kiện chạy

Server đang chạy ở `http://localhost:3001` và chạy với giới hạn request cao: `RATE_LIMIT_MAX=10000 node src/server.js` (script tự retry 429). Chạy trong `food-delivery-platform/backend`. Thư viện dùng chung: `scripts/lib/api-client.mjs` (`api`, `tokenFor`, `pool`); dữ liệu thực đơn/tên người: `scripts/data/*.mjs`.

## Thứ tự (dựng lại từ đầu)

| Bước | Lệnh | Việc làm |
|---|---|---|
| 0 | `npm run data:reset -- --yes` | **XOÁ** quán/món/tài khoản mẫu và dữ liệu giao dịch (sao lưu trước!) |
| 1 | `npm run data:menus` | 20 quán × ~20 món thật (tên, mô tả, giá, size, topping) qua API chủ quán |
| 2 | `npm run data:options` | Nhóm tuỳ chọn: mức đường/đá (bắt buộc), loại đế pizza, độ cay, chọn nước |
| 3 | `npm run data:promotions` | Voucher toàn sàn (admin), voucher quán (chủ quán), quà đổi điểm, 60 combo |
| 4 | `node scripts/set-opening-hours.mjs` | Giờ mở cửa theo loại hình (quán đêm qua nửa đêm) |
| 5 | `node scripts/simulate-rewards.mjs` | Khách đổi điểm lấy voucher |
| 6 | `npm run data:simulate -- --ignore-hours` | Tạo khách/tài xế, chạy đơn đến khi mỗi món/combo đủ 20–50 đánh giá (cờ: `--max-orders --concurrency --promo-rate --customers --shippers --extra-orders --accounts-only`) |
| 7 | `npm run data:extras` | Quán trả lời đánh giá, yêu thích/tìm kiếm/nạp ví, rút tiền, hoàn tiền (`-- --incremental`: chỉ trả lời đánh giá mới + hoàn tiền) |
| 8 | `npm run data:finalize` | Cắt mỗi món về 20–50 đánh giá, tính lại điểm TB món/quán/tài xế, thu nhập/số chuyến tài xế |
| 9 | `npm run data:spread -- --recent-from-id N --recent-days 45` | Rải thời gian đơn ra ~6 tuần theo giờ cao điểm, dựng dòng thời gian từng đơn (xác nhận→…→giao), đặt mốc ra mắt combo/voucher/điểm, thời điểm đổi điểm hợp lý, tính lại sổ điểm. Không có `--recent-from-id`: rải **tất cả** đơn |
| 10 | `npm run data:closeout -- --regenerate-settlements` | Xử lý hoàn tiền, quyết toán tuần (qua API), đối soát COD, đánh dấu đã đọc thông báo, chỉnh mốc thời gian |
| 11 | `npm run data:banners` | Banner từ voucher/combo/điểm thật (ảnh nền sinh bằng `sharp`) |
| - | `node scripts/repair-freeship-orders.mjs` | Sửa đơn freeship cũ tính sai (chỉ cần khi nạp dữ liệu cũ) |
| - | `npm run data:cleanup-tests` | Dọn tài khoản/quán "Postman" |

**Chạy nối tiếp (thêm đơn mới vào DB hiện có)**: bước 6 → 7 (`--incremental`) → 8 → 9 với `--recent-from-id <id đơn đầu của đợt mới>` → 10 (`--regenerate-settlements`). `simulate-activity` chỉ đặt vào quán đang mở nếu không có `--ignore-hours` (thời điểm đặt đơn sẽ được `spread` dàn lại).

## Khôi phục / sao lưu

- Sao lưu đầy đủ: `mysqldump --single-transaction --routines --triggers --default-character-set=utf8mb4 --result-file=backups/realistic-data-YYYYMMDD.sql food_delivery_db` (hoặc `npm run db:backup`). **Không dùng pipe PowerShell** (hỏng tiếng Việt).
- Khôi phục: tạo DB trống `utf8mb4_unicode_ci` rồi `mysql --default-character-set=utf8mb4 --database=food_delivery_db -e "source <file>"`. Kiểm tra bằng `npm run db:restore:test -- -BackupPath <file>` (nạp vào DB tạm `food_delivery_restore_test`).
- Bản mới nhất: `backend/backups/realistic-data-20261014.sql` (~515 MB, gitignored; đã khôi phục thử thành công).
- Migration chưa có trong dump cũ phải áp thủ công theo thứ tự: `20261017_order_delivery_preferences.sql`, `20261018_promotions_loyalty_combos.sql` (**áp bằng mysql client**, xem `gotchas.md`).

## Trạng thái dữ liệu hiện tại (13/10/2026 là ngày đơn cuối)

20 quán (TP.HCM), 406 món + 60 combo (mỗi món/combo 20–50 đánh giá), 117 khách, 16 tài xế, 18.125 đơn từ 29/08 đến 13/10 (16.546 đã giao), 7 voucher toàn sàn + 40 voucher quán, 5 quà đổi điểm, 140 bản quyết toán (7 tuần × 20 quán), banner 5. Đơn gần nhất còn một số đơn "đang chạy" (14) dừng ở 13/10 vì không còn tiến trình mô phỏng.
