# Frontend map

Frontend = **một trang** `food-delivery-platform/frontend/index.html` + JS thuần (không bundler). Express phục vụ tĩnh cùng origin với API (không cần CORS khi dùng `localhost:3000`). Mọi script `defer`, nạp theo thứ tự trong `index.html`.

## File

| File | Vai trò | Nội dung chính |
|---|---|---|
| `src/app.js` (~3.1k dòng) | **Lõi** + màn khách + chủ quán (form) | `state`, `api()`, auth, storefront/home, catalog, trang quán, giỏ/checkout, ưu đãi/voucher/quote, đơn của khách, đánh giá, yêu thích, hỗ trợ, form menu/combo/voucher của chủ quán, shipper cơ bản, `showScreen/showSubView`, `window.FD` |
| `src/ui.js` | Thành phần dùng chung | `statCard, table, pager, barChart, hbars, donut, modal, confirmBox, act, chip` → `window.FDUI` |
| `src/analytics.js` | Thống kê + xuất file | `FDAN.admin/restaurant/shipper/customer`, `FDAN.download(url, format)` |
| `src/admin.js` | Console admin (19 trang) | `NAV`, mỗi trang là một hàm `async function name(el)` |
| `src/restaurant.js` | Console chủ quán | `NAV`, `dashboard/history/reviews/hours/boardAuto`, dựng giao diện quanh các panel có sẵn trong HTML |
| `src/live.js` | Bản đồ Leaflet, theo dõi đơn, GPS, chat, thanh toán sandbox, hoá đơn | `RealMap`, `startTracking`, `startGps`, `renderAdminMap`, `window.FDLive` |
| `src/address.js` | Sổ địa chỉ + ghim bản đồ | |
| `src/widgets.js` | Widget liên hệ, thông báo | |
| `src/partner.js` | Form đăng ký nhà hàng/tài xế | |
| `src/export.js` | Menu "⬇ Xuất dữ liệu" (Excel/PDF/CSV) | gọi `FDAN.download` |
| `src/styles.css` | Design system + mọi màn (~1k dòng) | token `:root` |
| `src/storefront.css` | **Lớp giao diện kiểu ShopeeFood** (tải sau `styles.css`, ghi đè) | header `.sf-header`, hero `.sf-hero`, `.sf-card`, `.sf-row`, trang quán `.sf-store*`, đăng nhập |
| `vendor/leaflet/` | Leaflet 1.9.4 (đóng gói) | CSP cho phép ô `tile.openstreetmap.org` (cần Internet) |
| `assets/` | Logo, `city-dusk.svg` (nền hero — tài sản thiết kế sinh bằng script, không phải dữ liệu) | |

## Màn hình (screen) và sub-view

`body[data-screen]` = màn hiện tại; mỗi panel có `data-screen-panel`/`data-view-panel="<screen>:<view>"`. Chuyển bằng `FD.showScreen(s)` / `FD.showSubView(s, v)` (các nút `data-screen-target`, `data-subview-target` tự gắn). `showSubView` bật class `sf-landing` trên `<body>` khi ở `customer:catalog` (hero toàn chiều rộng).

| Screen | Sub-view |
|---|---|
| `customer` | `catalog` (landing), `detail` (trang quán), `cart`, `offers`, `stats`, `orders`, `favorites`, `support` |
| `restaurant` | `dashboard, orders, history, reports, menu, promotions, reviews, branches, settlement` |
| `shipper` | `profile, assignments, deliveries, earnings` |
| `admin` | `overview, live, reports, orders, applications, restaurants, shippers, customers, payments, settlements, promotions, banners, reviews, support, users, catalog, settings, data, audit` |
| `account` | `profile, wallet, users` ; `api` = nhật ký hoạt động |

Quyền hiển thị: `body[data-role]` (`guest|customer|restaurant|shipper|admin`) và `data-auth`; phần tử `data-auth-only`, `data-guest-only`, `data-storefront` (ẩn với role nhân sự) được CSS ẩn/hiện.

## Hợp đồng quan trọng

- `window.FD = { api, state, escapeHtml, formatMoney, statusLabel, paymentLabel, setStatus, toast, openAuth, roleOf, showScreen, showSubView, photo, foodEmoji, loadAddresses, loadOwnerRestaurants, … }`. `api(path, options)` tự gắn `Authorization`, ghi nhật ký vào `state.apiLog` (màn `api`), mở modal đăng nhập khi 401 mà chưa có token, và ném `Error(message)` theo body `{message}` của server. **Chưa tự dùng refresh token** khi access token hết hạn (người dùng phải đăng nhập lại).
- `state` (trong `app.js`): `user, token, restaurants, selectedRestaurant, selectedMenu, cart, quote, city, sort, district, collection, collections, storefront, geo, subViews…`. Token lưu `localStorage` (`fd_access_token`, `fd_refresh_token`), thành phố `fd_city`.
- Dữ liệu trang chủ từ DB: `GET /api/catalog/storefront` (thanh trên cùng, tiêu đề hero, dòng khuyến mãi, footer/liên hệ), `GET /api/catalog/collections` + `GET /api/catalog/banners` (Bộ sưu tập). Không chèn chữ/số cố định.
- Danh sách quán: `searchCatalog({append})` ghép tham số từ `state` (`city, sort, district, openNow, lat/lng, categoryId, collection.filter`), trả phân trang `pageNumber/pageSize/totalItems`; "Gần tôi" xin GPS trình duyệt → địa chỉ mặc định → tâm tỉnh.
- Thêm/sửa màn: (1) thêm panel `data-view-panel` trong `index.html`; (2) nếu cần tải dữ liệu khi mở, thêm nhánh trong `showSubView` (`app.js`); (3) nút điều hướng dùng `data-subview-target="screen:view"`.
- Biểu đồ/báo cáo mới: thêm tab trong `analytics.js` (`TABS`, `ADMIN_TABS`/`RESTAURANT_TABS`) + report tương ứng ở `analytics.service.js` (trả `dataset` để xuất file tự động).
- Console admin/chủ quán là DOM do JS dựng lại (`build()` ghi đè `.sub-tabs` và `.workspace-head`); sửa HTML tĩnh của các panel đó thường cần sửa luôn hàm `build()`.

## Quy ước CSS

- Màu/bo góc toàn cục ở `:root` (`styles.css`); lớp giao diện cửa hàng nằm riêng ở `storefront.css` (màu `--sf-red #ee4d2d`, `--sf-blue #0288d1`). Muốn đổi diện mạo cửa hàng → sửa `storefront.css`, không sửa đè trong `styles.css`.
- Breakpoint chính: 1060px (ẩn nav/menu trái), 900px (hero 1 cột), 520px.
- Ảnh quán/món chưa có trong dữ liệu ⇒ `photo()` dựng ô gradient + emoji theo tên (`foodEmoji`); khi có `imageUrl` thì hiện ảnh thật.

## Kiểm tra giao diện bằng headless Edge

`puppeteer-core` + `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; đăng nhập nhanh bằng cách `fetch('/api/auth/login')` trong trang rồi ghi `localStorage` (`fd_access_token`, `fd_refresh_token`) và `reload`. Gọi `FD.showScreen/showSubView` để mở màn. Ô bản đồ OSM không tải được khi không có Internet (điểm/đường vẫn hiện).
