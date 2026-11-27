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

## Bổ sung ngày 08/11/2026

| Lệnh | Việc làm |
|---|---|
| `node scripts/relocate-to-hung-yen.mjs --dry-run` / `--apply` | Chuyển toàn bộ vị trí (quán, địa chỉ khách, đơn, GPS tài xế) từ HCM sang Hưng Yên bằng phép xoay+tịnh tiến giữ nguyên khoảng cách; tên đường/phường-xã thật từ OpenStreetMap (Overpass). Một lần. |
| `node scripts/relocate-hung-yen-extras.mjs` | Đổi mã voucher SAIGON→PHOHIEN, biển số 59→89, hồ sơ đối tác. |
| `node scripts/fix-menu-toppings.mjs [--dry-run]` | Gắn topping/tuỳ chọn đúng từng món (qua API) + chuyển dòng topping đơn cũ. Sau đó `node scripts/cleanup-orphan-topping-groups.mjs`. |
| `node scripts/enrich-combo-options.mjs` | Combo có mức đường/đá/độ cay theo món bên trong. |
| `node scripts/enrich-reviews.mjs` | Thêm đánh giá món (72–92% số lượt đã giao), đặt mốc thời gian, viết lại bình luận theo loại món/quán. |
| `scripts/image-library/{collect,sheet,build,apply}.mjs` | Ảnh món: thu ứng viên từ Wikimedia Commons/Openverse → xem bằng mắt (contact sheet) → `build` (chuẩn hoá + ghi nguồn/giấy phép) → `apply` (gắn qua API). Xem `docs/image-credits.md`. |
| `node scripts/run-sql-file.mjs <file.sql>` | Chạy file migration chỉ gồm UPDATE/INSERT đơn giản (vd `20261108_max_delivery_distance_15km.sql`). |

Mọi script gọi API cần `API_BASE_URL=http://localhost:3001` (mặc định đã là 3001). Đặt đơn ngoài giờ mở cửa: `ALLOW_ORDER_WHEN_CLOSED=1`.

## Khôi phục / sao lưu

- Sao lưu đầy đủ: `mysqldump --single-transaction --routines --triggers --default-character-set=utf8mb4 --result-file=backups/realistic-data-YYYYMMDD.sql food_delivery_db` (hoặc `npm run db:backup`). **Không dùng pipe PowerShell** (hỏng tiếng Việt).
- Khôi phục: tạo DB trống `utf8mb4_unicode_ci` rồi `mysql --default-character-set=utf8mb4 --database=food_delivery_db -e "source <file>"`. Kiểm tra bằng `npm run db:restore:test -- -BackupPath <file>` (nạp vào DB tạm `food_delivery_restore_test`).
- Bản sao lưu trước khi chuyển sang Hưng Yên: `backend/backups/pre-hungyen-20261108.sql` (~516 MB, gitignored).
- Bản mới nhất (HCM, trước đợt chuyển): `backend/backups/realistic-data-20261014.sql` (~515 MB, gitignored; đã khôi phục thử thành công).
- Migration chưa có trong dump cũ phải áp thủ công theo thứ tự: `20261017_order_delivery_preferences.sql`, `20261018_promotions_loyalty_combos.sql` (**áp bằng mysql client**, xem `gotchas.md`).

## Thêm quán mới ở Hà Nội + Hưng Yên (08/11/2026)

Dữ liệu: `scripts/data/new-restaurants.mjs` (16 quán: 11 Hà Nội, 5 Hưng Yên; mỗi quán 14 món), `scripts/data/option-catalog.mjs` (nhóm topping/mức đường/độ cay), `scripts/data/new-places.json` (sinh ra: điểm neo + đường thật dùng làm địa chỉ khách Hà Nội). Tất cả đi qua API thật. Thứ tự:

| Bước | Lệnh | Việc làm |
|---|---|---|
| 1 | `node scripts/add-restaurants.mjs --cache <osm.json> [--dry-run] [--only key,…]` | Admin tạo thêm danh mục quán (Món Hàn, Món Nhật, Dimsum & Món Hoa, Bánh & Kem, Lẩu & Nướng) → chủ quán nộp hồ sơ kèm cam kết → admin duyệt → địa chỉ/toạ độ lấy từ OpenStreetMap (Overpass, `scripts/lib/osm.mjs`) → thực đơn, size, topping, mức đường/đá/độ cay. Chạy lại không tạo trùng (quán đã có món thì bỏ qua thực đơn). |
| 2 | `node scripts/load-promotions.mjs --from-id <id quán mới đầu tiên>` | Voucher quán + 3 combo cho quán mới (không đụng quán cũ) |
| 3 | `node scripts/enrich-combo-options.mjs --from-id <id>` | Combo nhận mức đường/đá/độ cay + nhóm topping chính của món bên trong |
| 4 | `node scripts/simulate-activity.mjs --restaurants-from <id> --customers-hn 45 --shippers-hn 8 --ignore-hours` (+ `--extra-orders N --max-orders N` để thêm đơn) | Khách/tài xế Hà Nội mới (địa chỉ = đường thật, biển số 29); **khách chỉ đặt quán cùng vùng và trong 14 km**, tài xế chỉ nhận đơn cùng vùng. Cần server chạy với `ALLOW_ORDER_WHEN_CLOSED=1 RATE_LIMIT_MAX=10000` |
| 5 | `node scripts/simulate-extras.mjs --incremental` → `node scripts/enrich-reviews.mjs --add` → `node scripts/finalize-realistic-data.mjs --no-trim` | Trả lời đánh giá/hoàn tiền; làm dày đánh giá (72–92% lượt giao); tính lại điểm **không cắt** đánh giá (`--no-trim` bắt buộc khi đã có dữ liệu làm dày, nếu không mọi món bị cắt về ≤ 50) |
| 6 | `node scripts/spread-timeline.mjs --yes --recent-from-id <id đơn mới đầu tiên> --recent-days 60` → `node scripts/enrich-reviews.mjs --comments` → `node scripts/simulate-closeout.mjs --regenerate-settlements` | Rải thời gian, viết lại bình luận theo loại món/quán, quyết toán + đối soát |
| 7 | `node scripts/image-library/apply.mjs` → `node scripts/image-library/make-brand-images.mjs` → `node scripts/load-banners.mjs` | Gắn ảnh món đã duyệt; **logo thiết kế** (chữ cái đầu, nền màu riêng) cho mọi quán, **ảnh bìa ghép** từ ảnh món của quán, **ảnh combo ghép** từ ảnh các món bên trong (chỉ dùng ảnh đã duyệt, không tạo ảnh giả); làm mới banner |

Ảnh đợt 4 (`image-library/spec-round4.mjs`: món Nhật/Hàn, dimsum, bánh ngọt, xôi, lẩu…) thu thập và duyệt theo cùng cách; tới 09/11/2026: 496/630 món có ảnh đúng, 36/36 quán có logo + ảnh bìa, 108/108 combo có ảnh ghép. Ảnh đợt 3 (`image-library/spec-round3.mjs`): ngoài Commons + Openverse còn lấy **ảnh trong bài Wikipedia vi/en** (`collect.mjs --wiki`; mỗi nguồn tối đa 1/3 ứng viên); vẫn xem từng ảnh bằng mắt, loại ảnh không đúng món.

## Trạng thái dữ liệu hiện tại (08/11/2026)

36 quán (Hưng Yên 25, Hà Nội 11), 630 món + 108 combo (mỗi món/combo 28–171 đánh giá, ~66 TB), 162 khách (45 ở Hà Nội), 24 tài xế (8 ở Hà Nội), 29.076 đơn từ 29/08 đến 08/11 (26.600 đã giao; đơn quán mới 10.951, trong ≤ 13,4 km, không đơn nào chéo vùng), 161 voucher, 10 tuần quyết toán, banner 5. Khách hàng/tài xế là nhân vật hư cấu, thanh toán online là sandbox. Sao lưu trước đợt thêm quán: `backend/backups/pre-newrestaurants-20261108.sql` (~800 MB, gitignored).

## Đợt 1 (22/11/2026): bảo trì dữ liệu qua API

| Lệnh | Việc làm |
|---|---|
| `node scripts/load-promotions.mjs` (chạy lại an toàn) | Voucher toàn sàn có hạn thật 90 ngày; chuẩn hoá voucher quán (mô tả, đơn tối thiểu, INACTIVE bản trùng); không tạo thêm voucher cùng loại/mức giảm |
| `node scripts/set-weekly-hours.mjs` | `restaurant_operating_hours` 7 ngày cho mọi quán (khớp giờ hiện có; Izakaya đến 23:00) + `ward` = phường/xã ở cột district. **Chạy sau mỗi lần thêm quán** |
| `node scripts/resolve-stuck-orders.mjs <id…>` | Hoàn tất giao đơn kẹt `SHIPPER_ASSIGNED` bằng API tài xế |
| `node scripts/clean-test-notes.mjs` | Xoá chữ "Postman" khỏi ghi chú đơn/giao hàng (UPDATE tối thiểu) |

Sao lưu trước đợt: `backend/backups/pre-dev1-20261122.sql`.

## Đợt 2 (22/11/2026)

| Lệnh | Việc làm |
|---|---|
| `node scripts/trim-simulated-reviews.mjs --dry-run` → `node scripts/trim-simulated-reviews.mjs --comments` | Gỡ mềm bớt đánh giá mô phỏng, chọn lọc theo "chất lượng quán", viết lại bình luận (`--comments-only` chỉ viết lại bình luận). Sao lưu trước: `backups/pre-dev2-reviews-20261122.sql` |
| `node scripts/load-promotions.mjs` | Nay còn: tên/mô tả voucher quán đa dạng, gia hạn voucher quán hết hạn qua `/extend` (30–88 ngày) |

Sao lưu đợt 2: `pre-dev2-jobs-`, `pre-dev2-vouchers-`, `pre-dev2-reviews-20261122.sql` (mỗi file ~880 MB, gitignored). Khi nối dữ liệu mô phỏng mới (T8 chưa làm) cần sửa `simulate-activity.mjs`/`enrich-reviews.mjs --add` để KHÔNG tạo lại đánh giá phủ ~80% số đơn và một khách nhiều đánh giá/quán.

## Ảnh đợt 5 (22/11/2026)

`scripts/image-library/spec-round5.mjs` (nước vối, trà dâu tằm/xoài, cháo, canh, dưa leo trộn, miến gà, sushi tôm, trứng chần…) + các loại món cũ còn thiếu: `collect.mjs --out <cand> --wiki --per 12 --only <khoá>` (nên chạy nhiều tiến trình song song với danh sách khoá khác nhau, mỗi khoá khoảng 2–3 phút) → `sheet.mjs` → **xem bằng mắt từng ảnh + đối chiếu tiêu đề tệp gốc** → `accept.json` → `build.mjs --cand <cand> --accept <accept>` (nay **gộp** với `image-library.json` hiện có: loại món không nhắc trong accept được giữ nguyên) → `apply.mjs` → `make-brand-images.mjs --covers --combos`. Danh mục quán thiếu ảnh: `node scripts/set-category-images.mjs` (qua API admin, dùng ảnh thư viện đã duyệt). Kết quả: 63 loại món được xem, 19 loại có ảnh đúng (32 món được gắn ảnh), món thiếu ảnh 134 → 102.
Món không có ảnh đúng được để trống vì: món gọi thêm/phần phụ (bì, chả, gân bò, giò heo, bò viên thêm), món đặc sản/ít ảnh tự do (nem chua rán, nước sâm, nước vối, bánh ram ít, cơm hến, chè hạt sen), ảnh tìm được chỉ là nguyên liệu/món gần giống (chè nhãn, soda chanh dây, cá hộp, miến gà, đậu rán, canh rau củ…), combo đặt tên như món. Sao lưu trước: `backups/pre-dev2-images-20261122.sql`.

## Đợt 4 (22–23/11/2026): thêm quán Hà Nội, nối đơn tới hiện tại

Số liệu đo từ DB sau đợt này: **58 quán** (Hà Nội 33 = **mỗi phường 3 quán** × 11 phường; Hưng Yên 25), 960 món + 174 combo, 227 khách (HN 110), 32 tài xế (HN 16), **45.481 đơn** (giao 41.624, huỷ 3.225, thất bại 632) từ 29/08 tới 23/11/2026, 531 bản quyết toán (13 tuần), 126 voucher toàn sàn/quán, đánh giá quán 5.824, món 10.612, tài xế 4.086.

| Bước | Lệnh |
|---|---|
| 1 | `node scripts/add-restaurants.mjs --only <khoá 22 quán>` — dữ liệu `scripts/data/new-restaurants-hn2.mjs` (≥ 14 món/quán, topping theo `option-catalog.mjs`); quán có `sameAreaAs` lấy phường + đường **thật** (OSM) đã lưu ở `new-places.json`, không gọi lại Overpass; luôn dùng `--only` để không ghi đè `new-places.json` |
| 2 | `node scripts/set-weekly-hours.mjs` → `node scripts/load-promotions.mjs --from-id 86` (mã voucher nay duy nhất toàn hệ thống: trùng thì thêm id quán) → `node scripts/enrich-combo-options.mjs --from-id 86` → `image-library/apply.mjs` + `make-brand-images.mjs` |
| 3 | `node scripts/simulate-activity.mjs --customers-hn 110 --shippers-hn 16 --accounts-only` (110 là **tổng** khách HN muốn có) |
| 4 | Server **tạm thời** chạy `RATE_LIMIT_MAX=10000 ALLOW_ORDER_WHEN_CLOSED=1` (và `STALE_ORDER_MINUTES=0 STALE_DELIVERY_MINUTES=0 PENDING_ORDER_TIMEOUT_MINUTES=0` để job dọn đơn không huỷ đơn đang mô phỏng); `simulate-activity.mjs --restaurants-from 86 --orders-per-restaurant 340 --ignore-hours --review-rate 0.2`, rồi `--restaurants-from 22 --orders-per-restaurant 130` cho cả hệ thống. Tham số mới: `--review-rate` (mặc định 0,2), `--max-reviews-per-shop` (2), `--orders-per-restaurant` |
| 5 | `simulate-extras.mjs --incremental` → `finalize-realistic-data.mjs --no-trim` → `spread-timeline.mjs --yes --recent-from-id <id đơn đầu của đợt> --recent-days <45 cho quán mới | 14 cho cả hệ thống>` (chạy riêng từng đợt) → `simulate-closeout.mjs --regenerate-settlements` |
| 6 | Đánh giá: `trim-simulated-reviews.mjs --dry-run` rồi `--comments` (nay cũng gỡ mềm đánh giá tài xế của đơn không còn đánh giá quán và viết lại bình luận tài xế); `dedupe-review-comments.mjs` (câu lặp > 3 lần) |
| 7 | Khởi động lại server KHÔNG có cờ nào; job `order-sweeper` xử lý đơn dở; đơn CONFIRMED kẹt xử lý bằng `scripts/reject-stuck-order.mjs` (API chủ quán) |

Sửa script để không tái tạo lỗi đánh giá: `simulate-activity.mjs` chỉ ~20% đơn giao xong có đánh giá (1 đánh giá quán/đơn, mỗi khách ≤ 2/quán, đếm cả đánh giá sẵn có), bình luận sinh bởi `review-phrases.mjs` (rỗng ~10%, một câu ≤ 3 lần toàn hệ thống, đếm cả câu sẵn có); `enrich-reviews.mjs --add` phủ 10–30% (không còn 72–92%) và `--comments` dùng bộ câu mới (chỉ tài khoản `kh.*`); `simulate-extras.mjs` bỏ qua đánh giá đã gỡ mềm; `spread-timeline.mjs` chịu được chuyến CANCELLED không có thời điểm kết thúc. Sao lưu: `backups/pre-dev2-newrestaurants-20261122.sql`, `pre-dev2-trim2-20261122.sql`.

## Đợt 5–6 (23–24/11/2026): giờ đặt đơn, bình luận, hoàn tiền, ảnh dùng chung

Thứ tự khi cần dựng lại: `set-weekly-hours.mjs` → `retime-out-of-hours-orders.mjs --dry-run` (rồi chạy thật, **sao lưu `pre-dev5-retime` trước**) → `spread-timeline.mjs --yes` → `simulate-closeout.mjs --regenerate-settlements` (server tạm `RATE_LIMIT_MAX=10000`) → `rewrite-review-comments.mjs` (chỉ tài khoản `kh.*`, giữ nguyên `minh.anh`) → `refund-failed-orders.mjs` → `fix-shared-images.mjs` (gỡ/gán ảnh món dùng chung sai tên, qua API chủ quán) → `image-library/make-brand-images.mjs --combos`.

ĐỂ SAU: ~247/1134 món chưa có ảnh đúng tên (món chay của Bếp Chay Sen Vàng/Quán Chay Thiện Tâm, bánh tôm Hồ Tây, món phụ/đặc sản, "Combo..." DISH của Gà Giòn Bếp Đỏ không có thành phần) — cần thu thêm ảnh tự do (collect `--wiki`) và duyệt bằng mắt; không dùng ảnh gần giống.

## Đợt 7 (24/11/2026)

- Ảnh: `image-library/spec-round6.mjs` (15 loại món chay/đặc sản) + `collect.mjs --wiki --per 12`; nguồn Wikipedia/Commons trả ảnh rất nhiễu (người, bản đồ, bìa sách…) nên chỉ 2 loại dùng được (`dau-ran`, `dau-hu-chien`). Chạy `node scripts/fix-shared-images.mjs` (PATTERN_ADDS/ADDS) thay vì `apply.mjs` — `apply.mjs` sẽ gán lại ảnh dùng chung sai tên cho món đã gỡ ảnh. Còn 235/1.134 món chưa ảnh (món chay, đặc sản bún đậu/chả cá/bánh tôm/gỏi ngó sen…): cần nguồn ảnh tốt hơn (ảnh tự chụp/được cấp phép).
- 4 món "Combo..." của Gà Giòn Bếp Đỏ (4258/4261/4266/4269) đã đổi tên "Set gà rán…/Set cánh gà…" và thành COMBO thật có thành phần (PUT `/menu-items/:id/combo`).
- Kiểm chứng luật đặt hàng: `node scripts/verify-checkout-rules.mjs` (không để lại đơn/giỏ).
- Sao lưu đợt 7: `backups/pre-dev7-refund-20261124.sql` (refunds, orders, payments), `backups/pre-dev7-images-20261124.sql` (menu_items, restaurant_images).

## Đợt 8 (24/11/2026): quy tắc ảnh dùng chung, ảnh combo, báo cáo ảnh thiếu

- **Quy tắc ảnh dùng chung**: một ảnh chỉ được dùng cho nhiều món khi các món đó **thật sự cùng loại** (cùng là đậu rán, cháo, gà rán, cơm tấm…). Không dùng chung giữa chay/mặn, bò/gà, nước/khô, chiên/nướng, hay món có nguyên liệu chính khác nhau. Dùng chung giữa các quán cho cùng một món là có chủ đích, không phải lỗi.
- **Danh sách dùng chung có chủ đích** sinh từ DB ở cuối `docs/dev/missing-images.md` (chạy `node scripts/report-missing-images.mjs`). Ví dụ đo ngày 24/11: đậu rán/đậu hũ rán/đậu hũ chiên — `dau-ran-2.jpg` 4 món ở 4 quán, `dau-hu-chien-1.jpg` 2 món ở 2 quán; cháo — `chao-1.jpg` 13 món ở 5 quán (cháo gà/lòng/sườn/thịt bằm, cùng loại cháo thịt), `chao-trang-1.jpg` 2 món, `chao-yen-mach-1.jpg` 2 món. Kiểm tra 0 cặp chay/mặn dùng chung file: truy vấn `GROUP BY image_url HAVING SUM(name LIKE '%chay%')>0 AND SUM(name NOT LIKE '%chay%')>0` trả 0 dòng.
- **Ảnh combo** (`make-brand-images.mjs --combos`, logic ô ở `scripts/lib/combo-tiles.mjs`): mỗi ảnh món thành phần KHÁC NHAU là một ô (tối đa 4), món số lượng > 1 có nhãn "×N"; không nhân đôi ảnh giả. Combo chỉ có một thành phần có ảnh thì chỉ một ô (vd "Combo 2 ly" 5323: có ảnh cold brew, "Cà phê dừa" chưa có ảnh đúng nên không ghép).
- **Ảnh thiếu**: `docs/dev/missing-images.md` liệt kê theo quán/danh mục món cần chụp ảnh thật. Vòng thu ảnh Openverse-only (13 loại món) chỉ nhận được 1 loại đúng (`com-chay`); pho-chay/bun-hue-chay/nam-kho/trung-cut-nuong/goi-cuon-chay/nam-xao không có ảnh khớp tên nên bị loại; nuoc-sam, trà gạo lứt, chè hạt sen, cà phê dừa, bánh tráng nướng, nem chua rán: nguồn không trả ảnh.
- **Chưa chứng minh trên đơn thật**: bộ sinh địa chỉ mới (`scripts/lib/address-gen.mjs`) mới được kiểm bằng test hàm sinh (1.000 địa chỉ), CHƯA chạy mô phỏng đơn thật để tránh rủi ro đánh giá/dữ liệu.

## Đợt 9 (24/11/2026)

Vòng thu ảnh thứ 3 (Commons tìm tệp + Wikipedia vi/en, `collect.mjs --per 12`) cho 11 loại món chay/đặc sản; xem bằng mắt ~100 ứng viên, chỉ nhận `xoai-lac` (2 ảnh, gán cho "Xoài lắc"). Phần còn lại (bánh tôm Hồ Tây, gỏi ngó sen, nấm xào, canh nấm, phở chay, bún Huế chay, nem chua rán, bánh tráng nướng, trứng cút nướng) nguồn trả ảnh sai chủ đề (người, bản đồ, nhà cao tầng, món Trung/Thái…) hoặc không đủ chắc nên để trống. Sao lưu: `backups/pre-dev9-images-20261124.sql`.

## Đợt 10 (24/11/2026): ảnh tìm trên web

`scripts/image-library/web-spec.mjs` (truy vấn + mẫu tên món) → `web-collect.mjs --out <thư mục> --per 8` (Bing Images, URL ảnh gốc `murl` + trang `purl`; Bing trả 200 từ máy này, Google/DuckDuckGo trả 302 chuyển hướng nên không dùng) → `sheet.mjs` + xem bằng mắt → `build.mjs --accept` → `web-apply.mjs` (chỉ gán món đang trống, qua API chủ quán). Không chạy `apply.mjs` sau `fix-shared-images`. Nghiệm thu: món thiếu ảnh 232 → 163/1.134. Ảnh chưa xác minh giấy phép (xem `image-credits.md`). Không nhận: bò lúc lắc chay, gỏi cuốn heo quay, chả cua/giò heo/rau sống bắp chuối (món gọi thêm: ảnh cả tô sẽ gây hiểu nhầm). Sao lưu: `backups/pre-dev10-images-20261124.sql`.

## Đợt 11 (24/11/2026)

Combo chứa bia phải xác nhận 18 tuổi (kiểm tra cả thành phần combo). Ảnh Combo 2 ly (5323) ghép từ 2 ảnh khác nhau (cà phê dừa + cold brew). Gỡ ảnh trà gạo lứt-3 và nước sâm bí đao-3, rebuild thư viện (ca-phe-dua mới). Sao lưu: backups/pre-dev11-images-20261124.sql. Chưa chạy mô phỏng đơn mới (chờ người dùng quyết).

## Đợt 12 (24/11/2026): mô phỏng 1.000 đơn mới để chứng minh bộ sinh địa chỉ

Sao lưu toàn DB: `backups/pre-dev12-sim-20261124.sql` (~1,4 GB). Server tạm `RATE_LIMIT_MAX=10000 ALLOW_ORDER_WHEN_CLOSED=1 STALE_ORDER_MINUTES=0 STALE_DELIVERY_MINUTES=0 PENDING_ORDER_TIMEOUT_MINUTES=0 REFUND_AUTO_APPROVE_MINUTES=0`. Chuỗi đã chạy: `simulate-activity.mjs --customers-hn 230 --accounts-only` (+120 khách, địa chỉ do `lib/address-gen.mjs` sinh, HN + HY) → `simulate-activity.mjs --customers-after 255 --orders-per-restaurant 18 --max-orders N --ignore-hours --review-rate 0.2` (cờ mới `--customers-after`: chỉ khách có `customer_profiles.id` > số này đặt đơn; khách mô phỏng gửi `ageConfirmed: true`) → `simulate-extras.mjs --incremental` → `enrich-reviews.mjs --add/--timeline/--comments` → `finalize-realistic-data.mjs --no-trim` → `spread-timeline.mjs --yes --recent-from-id 45489 --recent-days 14` → `simulate-closeout.mjs --regenerate-settlements` → `retime-out-of-hours-orders.mjs --dry-run` (0 đơn ngoài giờ, không cần dời) → `refund-failed-orders.mjs` (12 đơn) → `rewrite-review-comments.mjs`. Sau đó khởi động lại server KHÔNG cờ tạm.

Số liệu: đơn 45.481 → 46.481 (+1.000: giao 911, huỷ 72, thất bại 15, 2 đơn dở do job dọn xử lý); khách 227 → 347; đánh giá quán 5.824 → 6.024, món 10.612 → 12.529, tài xế 4.086 → 4.233. Địa chỉ đơn mới: 1.000/1.000 (100%) có tên đường thật, 117 địa chỉ khác nhau, HN 567 / HY 433, 0 đơn xa quán > 14 km. Địa chỉ đơn cũ không đổi (checksum `BIT_XOR(CRC32(id+delivery_address))` trên 45.481 đơn cũ = 2510960526 trước và sau).
Lưu ý: chạy `enrich-reviews.mjs` với tham số lạ (như `--help`) sẽ chạy cả ba bước (--add/--timeline/--comments); lần này làm thêm ~1.400 đánh giá món cho đơn cũ chưa có đánh giá. Khi chạy bước 6 mới, các lần 3 đơn đầu bị chặn vì quy tắc 18 tuổi (combo chứa bia) đã được khắc phục bằng `ageConfirmed: true` trong simulator.

## Đợt 13 (24/11/2026): gỡ mềm đánh giá món lỡ thêm cho đơn cũ

Ở đợt 12, `enrich-reviews.mjs --help` chạy cả `--add/--timeline/--comments` và thêm đánh giá món cho đơn cũ. Đã gỡ mềm bằng `node scripts/softdelete-old-order-reviews.mjs --from-id 88094 --max-order 45488` (id 88094 = `AUTO_INCREMENT` của `menu_item_reviews` trong bản sao lưu `pre-dev12-sim-20261124.sql`; loại minh.anh; trigger tự tính lại điểm món). Sao lưu: `backups/pre-dev13-reviews-20261124.sql`. Kết quả: đánh giá món sống 12.529 → 10.965 (10.612 cũ + 353 của đơn mới); đánh giá quán 6.024 và tài xế 4.233 không đổi; điểm TB quán không đổi (3,955), điểm TB món có đánh giá 4,020 → 3,993; `data-quality`: quán/món lệch điểm 0. Đối chiếu bình luận với bản sao lưu: món đổi 54/10.612, quán 0/5.824, tài xế 154/4.086, phản hồi quán 401 (phần lớn là phản hồi mới do `simulate-extras --incremental`); không khôi phục (đều đạt kiểm tra ngữ cảnh/lặp, minh.anh 0 thay đổi). Quy tắc: không chạy script dữ liệu với tham số lạ (`--help` không phải cờ trợ giúp).

## Đợt 18 (27/11/2026)

Sao lưu toàn DB trước khi sửa dữ liệu cũ: `backups/pre-dev18-full-20261127.sql` (~1,5 GB).
1. `node scripts/translate-legacy-notes.mjs --dry-run` → chạy thật: 1.059.089 dòng khớp mẫu (`notifications.title` 354.568; message 354.522; `order_status_history.note` 349.999 gồm 129.550 dòng trigger); COUNT và checksum cột type/reference/read/time/user không đổi.
2. Migration `database/migrations/20261127_vietnamese_trigger_note.sql` (áp bằng mysql client).
3. `node scripts/change-local-emails.mjs --dry-run` rồi chạy: 20 tài khoản + 20 quán `@fooddelivery.local` → `@example.com` (quán qua API admin; tài khoản cập nhật trực tiếp vì không có API đổi email).
4. `node scripts/verify-cancel-fail-notifications.mjs` (server tạm `STALE_ORDER_MINUTES=1 STALE_DELIVERY_MINUTES=1`): tạo 3 đơn #46493–46495 kiểm thông báo huỷ/thất bại.
5. Ảnh: thêm 53 loại `w18-*` (web-spec ROUND18) → `web-collect` → xem sheet → `build --accept` → `web-apply` → `make-brand-images --covers --combos`; thiếu ảnh 161 → 73 / 1.134.

## Đợt 19 (27/11/2026)

Sao lưu: `backups/pre-dev19-money-20261127.sql` (orders, payments, refunds, order_status_history, order_cancellations, notifications, menu_items, restaurant_settlements, wallet/loyalty). `node scripts/fix-money-consistency.mjs --dry-run` rồi chạy thật (không xoá dòng nào); migration trigger áp bằng mysql client; `node scripts/verify-refund-rules.mjs` (tạo 1 đơn thật); ảnh: `fix-shared-images.mjs` + `make-brand-images.mjs --covers --combos`.

## Đợt 20 (27/11/2026)

Sao lưu: `backups/pre-dev20-orders-20261127.sql`. Migration `20261127c_order_payment_status_cancelled.sql` (mysql client, dừng server trước) → `node scripts/close-order-payment-status.mjs --dry-run` → chạy thật (1.918 đơn). Đơn #45688 do job xử lý + admin duyệt hoàn.
