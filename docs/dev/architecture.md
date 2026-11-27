# Kiến trúc

## Stack thực tế

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Backend | **Node.js (ES modules) + Express 4** | Kiến trúc module: `routes → controller → service → repository` (module lớn như `operations`, `management`, `analytics` viết thẳng trong `*.routes.js`) |
| DB | **MySQL 8** (`mysql2`) | Pool + helper `query()` / `withTransaction()` (tự retry deadlock) trong `src/shared/database/mysql.js`. Trigger giữ số liệu thống kê |
| Frontend | HTML + CSS + **JavaScript thuần** (không framework/bundler) | Phục vụ tĩnh bởi chính Express (`frontend/`). Master Plan ghi AngularJS/.NET nhưng bản làm là Node + JS thuần |
| Auth | JWT access + refresh token, RBAC theo `roles`/`permissions` | `requireAuth`, `requireRole('ADMIN')`, `requirePermission('order.view')` |
| Cache | Redis tuỳ chọn (`REDIS_URL`), không có thì bỏ qua (log `cache.redis.unavailable`) | `responseCache` cho `/api/catalog` (30 giây) |
| Job | `job.worker.js` chạy mỗi 30 giây (`background_jobs`, `export_jobs`, `import_jobs`) | |
| Thư viện file | `exceljs` (.xlsx), `pdfkit` + `dejavu-fonts-ttf` (PDF tiếng Việt), `sharp` (dev: ảnh banner), `leaflet` (vendor bản đồ) | |
| Triển khai | `docker-compose.yml`: api + mysql + redis + mailhog | `docs/deployment.md` |

## Cấu trúc thư mục

```
PtrPMDV/
├─ CLAUDE.md                      # điểm vào cho AI (đọc đầu tiên)
├─ docs/                          # openapi.json, user-guide.md, deployment.md + docs/dev/* (bộ tài liệu này)
├─ food_delivery_db.sql           # schema gốc + các migration đã nối thêm (dùng khởi tạo Docker)
├─ outputs/master-plan/           # Master Plan.xlsx (kế hoạch), tools/ sinh/kiểm tra plan
├─ postman/                       # collection git-native + exports + runs/ (lịch sử chạy newman)
├─ minh-chung/                    # ảnh minh chứng theo tuần (CŨ, chụp từ dữ liệu trước khi làm lại)
├─ storage/                       # file upload (ảnh quán/món/banner) và exports/ do server ghi (gitignored)
├─ tools/                         # build/verify master plan, generate-dev-docs.mjs
└─ food-delivery-platform/
   ├─ docker-compose.yml
   ├─ backend/
   │  ├─ src/app.js               # dựng Express: helmet(CSP cho ô bản đồ OSM), cors, rate-limit, audit, mount route
   │  ├─ src/server.js            # listen + job worker + graceful shutdown
   │  ├─ src/modules/<module>/    # xem bảng dưới
   │  ├─ src/shared/              # config/env, database/mysql, http (error, pagination), middlewares, cache, pricing, data (63 tỉnh)
   │  ├─ database/migrations/     # *.sql áp theo thứ tự tên file (xem gotchas: áp bằng mysql client)
   │  ├─ scripts/                 # data pipeline (data:*), backup/restore, postman runner, smoke
   │  ├─ test/                    # node:test (hơn 230 test, không cần DB)
   │  └─ backups/                 # dump đầy đủ (gitignored): realistic-data-YYYYMMDD.sql
   └─ frontend/
      ├─ index.html               # MỘT trang, nhiều "screen" + "sub-view"
      ├─ src/*.js, src/*.css      # xem frontend-map.md
      ├─ vendor/leaflet/          # Leaflet đóng gói sẵn
      └─ assets/                  # logo, city-dusk.svg (nền hero)
```

## Module backend ↔ prefix API

Mount trong `src/app.js` (thứ tự mount quan trọng: `/api/customer/orders/quote` nằm trong `rewardsCustomerRoutes` phải mount **trước** `customerOrderRoutes`).

| Module | Prefix | Vai trò | Nội dung |
|---|---|---|---|
| `auth` | `/api/auth` | công khai | đăng ký khách, login/refresh/logout, quên/đặt lại mật khẩu, xác minh email, `/me` |
| `accounts` (trong `operations`) | `/api/accounts` | admin | người dùng, trạng thái tài khoản, session |
| `customers`, `addresses` | `/api/customer/profile`, `/api/customer/addresses` | khách | hồ sơ, sổ địa chỉ |
| `catalog` | `/api/catalog` | công khai (cache 30s) | tìm quán/món, menu quán, đánh giá, tỉnh/thành, quận, `storefront`, `collections` |
| `restaurants` | `/api/catalog` (public), `/api/restaurant/restaurants` (chủ quán), `/api/admin/restaurants` | | hồ sơ quán, ảnh, giờ mở cửa, duyệt/khoá quán, danh mục quán |
| `menus` | `/api/restaurant/restaurants/:id/...` | chủ quán | menu, nhóm món, món, biến thể, topping, **combo** |
| `orders` | `/api/customer/cart`, `/api/customer/orders`, `/api/restaurant/orders` | khách / bếp | giỏ, checkout, danh sách/chi tiết đơn, xác nhận–chuẩn bị–từ chối |
| `engagement` | `/api/customer/...`, `/api/catalog/promotions`, `/api/restaurant/restaurants/:id/promotions`, `/api/admin/banners` | | voucher, yêu thích, banner; `rewards.routes.js`: ví voucher, báo giá `orders/quote`, điểm thưởng |
| `operations` | `/api/shippers`, `/api/deliveries`, `/api/payments`, `/api/communications`, `/api/settlements` | tài xế/admin/khách | gán–nhận–giao, GPS, thu nhập/rút tiền, thanh toán sandbox, COD, hoàn tiền, hoá đơn, đánh giá, chat, hỗ trợ, quyết toán |
| `management` | `/api/admin/manage`, `/api/restaurant/manage` | admin / chủ quán | trang quản trị: đơn, thanh toán, hoàn tiền, khuyến mãi, quà đổi điểm, cấu hình |
| `analytics` | `/api/analytics/{admin,restaurant,shipper,customer}` | theo vai trò | thống kê + xuất file (`?format=xlsx|pdf|csv`) |
| `exports` | `/api/admin/export`, `/api/restaurant/export` | | bộ dữ liệu xuất; `file-writers.js` sinh .xlsx/.pdf/.csv thật |
| `jobs` | `/api/jobs` | admin | job xuất/nhập/nền |
| `partners` | `/api/partners`, `/api/admin/partners` | công khai/admin | đăng ký làm tài xế/nhà hàng và duyệt |
| `notifications` | `/api/notifications` | đăng nhập | thông báo trong app |
| `settings`, `audit`, `dashboard`, `health` | `/api/admin/system-settings`, `/api/admin/audit-logs`, `/api/admin/dashboard`, `/health` | | |

## Luồng một request

`helmet → cors → morgan(JSON log) → rateLimit (env RATE_LIMIT_MAX) → authContext (đọc JWT nếu có) → requestAudit (ghi audit_logs sau khi trả lời) → express.json → static → route → error-handler`. Lỗi nghiệp vụ ném `HttpError(status, message)`; lỗi lạ được log `http.unhandled_error` kèm stack rồi trả 500 chung chung.

## Cấu hình (`backend/.env`, đọc ở `src/shared/config/env.js`)

`PORT`, `NODE_ENV`, `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` (**bắt buộc** `DB_PASSWORD`), `JWT_SECRET` (≥32 ký tự ở production), `CORS_ORIGINS`, `REDIS_URL`, `MAIL_HOST/MAIL_PORT`, `RATE_LIMIT_MAX` (mặc định thấp; chạy mô phỏng dùng `RATE_LIMIT_MAX=10000`). Cấu hình nghiệp vụ lưu trong bảng `system_settings` (`delivery_base_fee`, `delivery_price_per_km`, `max_delivery_distance`, `tax_rate`, `platform_commission_rate`, `app.owner.*` làm thông tin liên hệ).

## Realtime

Không dùng WebSocket: giao diện **polling** (đơn bếp 20s, theo dõi đơn 4s, bản đồ admin 5s, thông báo định kỳ). GPS tài xế là điểm thật do thiết bị gửi (`POST /api/shippers/locations`).

## Test

- `npm test`: unit test thuần (không cần DB): validation, pricing/voucher, file xuất (.xlsx/.pdf), analytics range, service có stub repository.
- Postman/newman: `npm run test:postman` (đầy đủ), `npm run test:e2e` (luồng 99). **Không chạy nếu người dùng không yêu cầu** (để lại tài khoản "Postman" trong DB; dọn bằng `npm run data:cleanup-tests`).
- Kiểm tra giao diện: headless Edge + `puppeteer-core` (xem `gotchas.md`).
