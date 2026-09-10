import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = 'C:/Users/LENOVO/Desktop/PMDV/outputs/master-plan';
const outputPath = `${outputDir}/Master Plan.xlsx`;
const previewDir = `${outputDir}/preview`;

await fs.mkdir(previewDir, { recursive: true });

const workbook = Workbook.create();
const summary = workbook.worksheets.add('Summary');
const plan = workbook.worksheets.add('Plan');
const infrastructure = workbook.worksheets.add('Ha tang');
const sqlCoverage = workbook.worksheets.add('SQL coverage');
const requirements = workbook.worksheets.add('Yeu cau');

const colors = {
  navy: '#1F4E78',
  navyDark: '#17365D',
  blue: '#5B9BD5',
  blueSoft: '#D9EAF7',
  green: '#70AD47',
  greenSoft: '#E2F0D9',
  orange: '#C55A11',
  orangeSoft: '#FCE4D6',
  purple: '#8064A2',
  purpleSoft: '#E4DFEC',
  yellow: '#FFF2CC',
  gray: '#F2F2F2',
  grayDark: '#666666',
  border: '#D9E2F3',
  text: '#1F2937',
  white: '#FFFFFF'
};

const today = dateValue('2026-09-09');
const timelineDates = createDateRange('2026-09-10', '2026-11-11');
const timelineStartColumn = 8;
const timelineEndColumn = timelineStartColumn + timelineDates.length - 1;
const timelineEndLetter = columnLetter(timelineEndColumn);
let summaryGroupRows = [];
let summaryTaskProgressRanges = [];
let summaryTaskStatusRanges = [];

const taskGroups = [
  {
    id: '1',
    title: 'Nền tảng, tài khoản & phân quyền',
    sprint: 'A',
    estimate: '2w',
    start: '2026-09-10',
    deadline: '2026-09-18',
    tasks: [
      task('1.1', 'SRS, ERD, use case/flow và sơ đồ kiến trúc hệ thống', '1d', '2026-09-09', '2026-09-10', 'Đã hoàn thành', 1),
      task('1.2', 'SQL schema v1 theo food_delivery_db.sql: 66 bảng, khóa ngoại, index, view và trigger', '2d', '2026-09-09', '2026-09-10', 'Đã hoàn thành', 1),
      task('1.3', 'Node.js API foundation: Express, env validation, MySQL pool/transaction, lỗi HTTP, liveness/readiness và graceful shutdown', '2d', '2026-09-10', '2026-09-11', 'Đã hoàn thành', 1),
      task('1.4', 'Đăng ký/đăng nhập JWT, access/refresh token, hash mật khẩu, logout, /me và login_history', '3d', '2026-09-10', '2026-09-12', 'Đang thực hiện', 0.8),
      task('1.5', 'RBAC 4 vai trò, permission theo hành động, reset/email verification, audit log và soft-delete', '4d', '2026-09-13', '2026-09-16', 'Đang thực hiện', 0.65),
      task('1.6', 'Hồ sơ khách hàng và địa chỉ giao hàng: CRUD, mặc định, xóa mềm, kiểm tra quyền và audit', '3d', '2026-09-13', '2026-09-15', 'Đang thực hiện', 0.85),
      task('1.7', 'Design system Tailwind CSS thống nhất màu sắc, bố cục, typography, spacing và component cho Food Delivery; UI đăng ký/đăng nhập/hồ sơ 4 vai trò', '3d', '2026-09-16', '2026-09-18', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '2',
    title: 'Nhà hàng & menu',
    sprint: 'A',
    estimate: '3w',
    start: '2026-09-19',
    deadline: '2026-10-07',
    tasks: [
      task('2.1', 'CRUD restaurant_categories, restaurants, operating_hours, restaurant_images; validation, audit, xóa mềm', '3d', '2026-09-19', '2026-09-22', 'Đang thực hiện', 0.9),
      task('2.2', 'CRUD menus, menu_categories, menu_items; giá gốc/giảm, trạng thái bán và thông tin món', '4d', '2026-09-23', '2026-09-26', 'Chưa thực hiện', 0),
      task('2.3', 'Variants, topping_groups, toppings và liên kết topping theo món; kiểm tra min/max lựa chọn', '3d', '2026-09-27', '2026-09-29', 'Chưa thực hiện', 0),
      task('2.4', 'Catalog cho khách: tìm kiếm/lọc/sắp xếp/phân trang nhà hàng và menu; lưu search_history', '2d', '2026-09-30', '2026-10-01', 'Đang thực hiện', 0.7),
      task('2.5', 'Promotions, promotion_usage, banners, favorite restaurants/menu items theo đúng quan hệ SQL', '2d', '2026-10-02', '2026-10-03', 'Chưa thực hiện', 0),
      task('2.6', 'Seed dữ liệu mẫu tối thiểu 2.000 bản ghi, kiểm tra khóa ngoại và bộ dữ liệu demo 4 vai trò', '3d', '2026-10-04', '2026-10-07', 'Chưa thực hiện', 0),
      task('2.7', 'Quản lý ảnh/icon dùng chung: chọn, upload, thay và xóa; toolbar crop, xoay, zoom, căn khung/reset; aspect-ratio, object-fit và thumbnail đồng đều, không kéo méo ảnh', '3d', '2026-10-04', '2026-10-07', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '3',
    title: 'Giỏ hàng, đặt món & xử lý đơn',
    sprint: 'A',
    estimate: '1.5w',
    start: '2026-09-27',
    deadline: '2026-10-07',
    tasks: [
      task('3.1', 'Giỏ hàng theo khách/nhà hàng: carts, cart_items, cart_item_toppings; cập nhật số lượng và giá snapshot', '3d', '2026-09-27', '2026-09-29', 'Chưa thực hiện', 0),
      task('3.2', 'Checkout tạo orders, order_items, order_item_toppings bằng transaction và idempotency key', '3d', '2026-09-30', '2026-10-02', 'Chưa thực hiện', 0),
      task('3.3', 'Nhà hàng xác nhận/từ chối, chuẩn bị món; order_status_history và quy tắc chuyển trạng thái', '2d', '2026-10-03', '2026-10-04', 'Chưa thực hiện', 0),
      task('3.4', 'UI đặt món: chọn địa chỉ, ghi chú, phí, khuyến mãi và phương thức thanh toán', '2d', '2026-10-05', '2026-10-06', 'Chưa thực hiện', 0),
      task('3.5', 'Integration workflow đặt món - xác nhận - chuẩn bị; kiểm tra lỗi nghiệp vụ và audit', '1d', '2026-10-07', '2026-10-07', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '4',
    title: 'Shipper, giao hàng, thanh toán & hậu mãi',
    sprint: 'B',
    estimate: '2.5w',
    start: '2026-10-08',
    deadline: '2026-10-24',
    tasks: [
      task('4.1', 'Hồ sơ shipper, giấy tờ, trạng thái sẵn sàng và delivery_assignments; phân quyền nhận đơn', '3d', '2026-10-08', '2026-10-10', 'Chưa thực hiện', 0),
      task('4.2', 'Deliveries, delivery_status_history, shipper_locations, delivery_zones; quy trình nhận - giao', '4d', '2026-10-11', '2026-10-14', 'Chưa thực hiện', 0),
      task('4.3', 'GPS tracking và cập nhật realtime vị trí/trạng thái giao hàng cho khách, nhà hàng, shipper', '2d', '2026-10-15', '2026-10-16', 'Chưa thực hiện', 0),
      task('4.4', 'Payments, payment_transactions, COD; gateway giả lập, retry, callback và xử lý thất bại', '2d', '2026-10-17', '2026-10-18', 'Chưa thực hiện', 0),
      task('4.5', 'Invoices, xuất hóa đơn PDF và tra cứu theo order_code; dữ liệu lấy từ snapshot đơn hàng', '1d', '2026-10-19', '2026-10-19', 'Chưa thực hiện', 0),
      task('4.6', 'Notifications, preferences, chat theo đơn, review nhà hàng/shipper và support tickets', '2d', '2026-10-20', '2026-10-21', 'Chưa thực hiện', 0),
      task('4.7', 'Hủy đơn, refund, ví khách hàng và wallet_transactions; kiểm soát hoàn tiền theo trạng thái', '2d', '2026-10-22', '2026-10-23', 'Chưa thực hiện', 0),
      task('4.8', 'Earnings/withdrawals của shipper và settlement/commission của nhà hàng; báo cáo đối soát', '1d', '2026-10-24', '2026-10-24', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '5',
    title: 'Nhập/xuất, báo cáo & tác vụ nền',
    sprint: 'C',
    estimate: '1w',
    start: '2026-10-25',
    deadline: '2026-10-29',
    tasks: [
      task('5.1', 'Import Excel/CSV cho nhà hàng, menu và dữ liệu demo; lưu import_jobs và kết quả từng dòng', '2d', '2026-10-25', '2026-10-26', 'Chưa thực hiện', 0),
      task('5.2', 'Export CSV/Excel/PDF cho đơn, doanh thu, shipper và restaurant settlement; lưu export_jobs', '2d', '2026-10-27', '2026-10-28', 'Chưa thực hiện', 0),
      task('5.3', 'Background jobs cho mail, export lớn và dọn token; retry, trạng thái job và log lỗi', '1d', '2026-10-29', '2026-10-29', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '6',
    title: 'Bảo mật, hiệu năng & giám sát',
    sprint: 'C',
    estimate: '1w',
    start: '2026-10-30',
    deadline: '2026-11-03',
    tasks: [
      task('6.1', 'Rà SQL injection/XSS/CSRF, validation, CORS, rate limit, upload và secret; khóa API theo quyền', '2d', '2026-10-30', '2026-10-31', 'Chưa thực hiện', 0),
      task('6.2', 'Redis cache cho catalog/báo cáo, invalidation khi cập nhật menu và giới hạn truy vấn nặng', '2d', '2026-11-01', '2026-11-02', 'Chưa thực hiện', 0),
      task('6.3', 'Structured logging, health/readiness check, audit hành động nhạy cảm và cấu hình system_settings', '1d', '2026-11-03', '2026-11-03', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '7',
    title: 'Kiểm thử & chất lượng',
    sprint: 'C',
    estimate: '1w',
    start: '2026-11-04',
    deadline: '2026-11-08',
    tasks: [
      task('7.1', 'Unit test service: auth, địa chỉ, catalog, giỏ hàng, tính phí và chuyển trạng thái', '2d', '2026-11-04', '2026-11-05', 'Chưa thực hiện', 0),
      task('7.2', 'Integration test API + MySQL: transaction, quyền, audit, idempotency, payment và rollback', '2d', '2026-11-06', '2026-11-07', 'Chưa thực hiện', 0),
      task('7.3', 'E2E 4 vai trò, regression, kiểm tra seed >= 2.000 và coverage mục tiêu 30-40%', '1d', '2026-11-08', '2026-11-08', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '8',
    title: 'Triển khai, tài liệu & bàn giao',
    sprint: 'C',
    estimate: '1w',
    start: '2026-11-09',
    deadline: '2026-11-11',
    tasks: [
      task('8.1', 'Docker Compose API + MySQL + Redis + MailHog; migration/seed và biến môi trường', '1d', '2026-11-09', '2026-11-09', 'Chưa thực hiện', 0),
      task('8.2', 'CI/CD đơn giản: install, lint/check, test, build image và deploy thử', '1d', '2026-11-09', '2026-11-09', 'Chưa thực hiện', 0),
      task('8.3', 'OpenAPI/Swagger đầy đủ, Postman collection và bộ request mẫu cho 4 vai trò', '1d', '2026-11-10', '2026-11-10', 'Chưa thực hiện', 0),
      task('8.4', 'Hoàn thiện SRS, ERD, use case/flow, kiến trúc, hướng dẫn cài đặt và hướng dẫn sử dụng', '1d', '2026-11-10', '2026-11-10', 'Chưa thực hiện', 0),
      task('8.5', 'Video demo 5-10 phút, checklist bàn giao, data mẫu và chạy thử end-to-end cuối', '1d', '2026-11-11', '2026-11-11', 'Chưa thực hiện', 0)
    ]
  },
  {
    id: '9',
    title: 'Ổn định cuối & nghiệm thu',
    sprint: 'C',
    estimate: '0.5w',
    start: '2026-11-09',
    deadline: '2026-11-11',
    tasks: [
      task('9.1', 'Smoke test sau triển khai, kiểm tra realtime/GPS, backup và khôi phục database', '1d', '2026-11-09', '2026-11-09', 'Chưa thực hiện', 0),
      task('9.2', 'Sửa lỗi còn lại, tối ưu UX và chốt các tiêu chí nghiệm thu theo yêu cầu Word', '2d', '2026-11-10', '2026-11-11', 'Chưa thực hiện', 0),
      task('9.3', 'Đóng gói bản nộp: source, SQL, Postman, video, tài liệu và biên bản kiểm tra', '1d', '2026-11-11', '2026-11-11', 'Chưa thực hiện', 0)
    ]
  }
];

const sqlRows = [
  ['Identity & access', 'roles', 'Vai trò hệ thống', '1.5', 'Đang thực hiện'],
  ['Identity & access', 'users', 'Tài khoản dùng chung cho 4 vai trò', '1.4, 1.5, 2.7', 'Đang thực hiện'],
  ['Identity & access', 'permissions', 'Danh sách quyền theo hành động', '1.5', 'Đang thực hiện'],
  ['Identity & access', 'role_permissions', 'Gán quyền cho role', '1.5', 'Đang thực hiện'],
  ['Identity & access', 'customer_profiles', 'Hồ sơ khách hàng', '1.6', 'Đang thực hiện'],
  ['Identity & access', 'customer_addresses', 'Địa chỉ giao hàng', '1.6', 'Đang thực hiện'],
  ['Restaurant & menu', 'restaurant_categories', 'Danh mục nhà hàng', '2.1', 'Đang thực hiện'],
  ['Restaurant & menu', 'restaurants', 'Thông tin nhà hàng', '2.1', 'Đang thực hiện'],
  ['Restaurant & menu', 'restaurant_operating_hours', 'Giờ hoạt động', '2.1', 'Đang thực hiện'],
  ['Restaurant & menu', 'restaurant_images', 'Ảnh logo/cover/gallery', '2.1, 2.7', 'Đang thực hiện'],
  ['Restaurant & menu', 'menus', 'Menu theo nhà hàng', '2.2', 'Chưa thực hiện'],
  ['Restaurant & menu', 'menu_categories', 'Nhóm món', '2.2', 'Chưa thực hiện'],
  ['Restaurant & menu', 'menu_items', 'Món ăn, giá, trạng thái', '2.2, 2.7', 'Chưa thực hiện'],
  ['Restaurant & menu', 'menu_item_variants', 'Biến thể món', '2.3', 'Chưa thực hiện'],
  ['Restaurant & menu', 'topping_groups', 'Nhóm topping', '2.3', 'Chưa thực hiện'],
  ['Restaurant & menu', 'toppings', 'Topping và giá', '2.3', 'Chưa thực hiện'],
  ['Restaurant & menu', 'menu_item_topping_groups', 'Liên kết món - nhóm topping', '2.3', 'Chưa thực hiện'],
  ['Shipper', 'shipper_profiles', 'Hồ sơ và trạng thái shipper', '4.1', 'Chưa thực hiện'],
  ['Shipper', 'shipper_documents', 'Giấy tờ shipper', '4.1', 'Chưa thực hiện'],
  ['Cart & ordering', 'carts', 'Giỏ theo khách và nhà hàng', '3.1', 'Chưa thực hiện'],
  ['Cart & ordering', 'cart_items', 'Món trong giỏ', '3.1', 'Chưa thực hiện'],
  ['Cart & ordering', 'cart_item_toppings', 'Topping trong giỏ', '3.1', 'Chưa thực hiện'],
  ['Cart & ordering', 'orders', 'Đơn hàng và snapshot địa chỉ', '3.2', 'Chưa thực hiện'],
  ['Cart & ordering', 'order_items', 'Chi tiết món trong đơn', '3.2', 'Chưa thực hiện'],
  ['Cart & ordering', 'order_item_toppings', 'Topping trong đơn', '3.2', 'Chưa thực hiện'],
  ['Cart & ordering', 'order_status_history', 'Lịch sử trạng thái đơn', '3.3', 'Chưa thực hiện'],
  ['Delivery', 'deliveries', 'Thông tin chuyến giao', '4.2', 'Chưa thực hiện'],
  ['Delivery', 'delivery_status_history', 'Lịch sử giao hàng', '4.2', 'Chưa thực hiện'],
  ['Delivery', 'shipper_locations', 'Vị trí GPS shipper', '4.2, 4.3', 'Chưa thực hiện'],
  ['Delivery', 'delivery_assignments', 'Phân công đơn giao', '4.1, 4.2', 'Chưa thực hiện'],
  ['Payment & invoice', 'payments', 'Thanh toán của đơn', '4.4', 'Chưa thực hiện'],
  ['Payment & invoice', 'payment_transactions', 'Giao dịch/callback thanh toán', '4.4', 'Chưa thực hiện'],
  ['Payment & invoice', 'cod_transactions', 'Thu hộ COD', '4.4', 'Chưa thực hiện'],
  ['Payment & invoice', 'invoices', 'Hóa đơn', '4.5', 'Chưa thực hiện'],
  ['Promotion & engagement', 'promotions', 'Mã/chiến dịch khuyến mãi', '2.5', 'Chưa thực hiện'],
  ['Promotion & engagement', 'promotion_usage', 'Lượt sử dụng khuyến mãi', '2.5', 'Chưa thực hiện'],
  ['Promotion & engagement', 'restaurant_reviews', 'Đánh giá nhà hàng', '4.6', 'Chưa thực hiện'],
  ['Promotion & engagement', 'shipper_reviews', 'Đánh giá shipper', '4.6', 'Chưa thực hiện'],
  ['Promotion & engagement', 'favorite_restaurants', 'Nhà hàng yêu thích', '2.5', 'Chưa thực hiện'],
  ['Promotion & engagement', 'favorite_menu_items', 'Món ăn yêu thích', '2.5', 'Chưa thực hiện'],
  ['Communication', 'notifications', 'Thông báo in-app/email', '4.6, 5.3', 'Chưa thực hiện'],
  ['Communication', 'notification_preferences', 'Tùy chọn nhận thông báo', '4.6', 'Chưa thực hiện'],
  ['Communication', 'chat_sessions', 'Phiên chat theo đơn', '4.6', 'Chưa thực hiện'],
  ['Communication', 'chat_messages', 'Tin nhắn chat', '4.6', 'Chưa thực hiện'],
  ['Support', 'support_tickets', 'Yêu cầu hỗ trợ', '4.6', 'Chưa thực hiện'],
  ['Support', 'support_messages', 'Trao đổi xử lý ticket', '4.6', 'Chưa thực hiện'],
  ['Order exception', 'order_cancellations', 'Hủy đơn và lý do', '4.7', 'Chưa thực hiện'],
  ['Order exception', 'refunds', 'Hoàn tiền', '4.7', 'Chưa thực hiện'],
  ['Wallet', 'wallets', 'Ví khách hàng', '4.7', 'Chưa thực hiện'],
  ['Wallet', 'wallet_transactions', 'Giao dịch ví', '4.7', 'Chưa thực hiện'],
  ['Settlement', 'shipper_earnings', 'Thu nhập shipper', '4.8', 'Chưa thực hiện'],
  ['Settlement', 'shipper_withdrawals', 'Rút tiền shipper', '4.8', 'Chưa thực hiện'],
  ['Settlement', 'restaurant_settlements', 'Đối soát nhà hàng', '4.8', 'Chưa thực hiện'],
  ['Settlement', 'restaurant_commissions', 'Hoa hồng nền tảng', '4.8', 'Chưa thực hiện'],
  ['Audit & auth', 'audit_logs', 'Lịch sử thao tác trong web', '1.5, 6.3', 'Đang thực hiện'],
  ['Audit & auth', 'refresh_tokens', 'Refresh token dạng hash', '1.4', 'Đang thực hiện'],
  ['Audit & auth', 'password_reset_tokens', 'Token đặt lại mật khẩu', '1.5', 'Chưa thực hiện'],
  ['Audit & auth', 'email_verification_tokens', 'Token xác thực email', '1.5', 'Chưa thực hiện'],
  ['Audit & auth', 'login_history', 'Lịch sử đăng nhập thành công/thất bại', '1.4', 'Đang thực hiện'],
  ['Jobs & exchange', 'import_jobs', 'Theo dõi import', '5.1', 'Chưa thực hiện'],
  ['Jobs & exchange', 'export_jobs', 'Theo dõi export', '5.2', 'Chưa thực hiện'],
  ['Jobs & exchange', 'background_jobs', 'Hàng đợi tác vụ nền', '5.3', 'Chưa thực hiện'],
  ['Discovery', 'banners', 'Banner hiển thị trên catalog', '2.5, 2.7', 'Chưa thực hiện'],
  ['Discovery', 'search_history', 'Lịch sử tìm kiếm khách', '2.4', 'Chưa thực hiện'],
  ['Delivery', 'delivery_zones', 'Khu vực/phí giao hàng', '4.2', 'Chưa thực hiện'],
  ['Platform', 'system_settings', 'Cấu hình phí, thuế, commission', '6.3', 'Chưa thực hiện']
];

const requirementsRows = [
  ['Tài khoản', 'Đăng ký/đăng nhập, JWT, refresh token, reset mật khẩu', '1.4, 1.5', 'Đang làm', 'users, refresh_tokens, password_reset_tokens, login_history'],
  ['Phân quyền', 'Ít nhất 3 vai trò; đề tài dùng ADMIN/RESTAURANT/SHIPPER/CUSTOMER', '1.5, 1.7', 'Đang làm', 'roles, permissions, role_permissions'],
  ['CRUD & tra cứu', 'CRUD có tìm kiếm, lọc, sắp xếp, phân trang', '2.1-2.5, 3.1-3.4', 'Đã đưa vào kế hoạch', 'restaurant_*, menu_*, carts, orders'],
  ['Ảnh & icon', 'Chọn/upload/thay/xóa; toolbar crop, xoay, zoom, căn khung/reset; hiển thị đồng đều và không méo ảnh', '2.7, 6.1', 'Đã đưa vào kế hoạch', 'restaurant_images, restaurant_categories.image_url, menu_items.image_url, users.avatar_url, banners.image_url'],
  ['Giao diện & design system', 'Tailwind CSS, token màu, bố cục, typography, spacing và component dùng chung; responsive theo nghiệp vụ giao đồ ăn', '1.7, 2.7, 3.4', 'Đã đưa vào kế hoạch', 'Tham khảo sản phẩm giao đồ ăn hiện hành khi chốt theme; dùng chung cho 4 vai trò và kiểm tra tương phản/mobile'],
  ['Import/export/PDF', 'Excel/CSV, hóa đơn PDF, báo cáo và job lớn', '4.5, 5.1-5.3', 'Đã đưa vào kế hoạch', 'invoices, import_jobs, export_jobs, background_jobs'],
  ['Audit & dữ liệu', 'Ai làm gì, lúc nào; soft-delete; snapshot/versioning cơ bản', '1.5, 1.6, 3.2, 6.3', 'Đang làm', 'audit_logs, deleted_at, order snapshots'],
  ['Thông báo & job', 'Email/in-app notification, hàng đợi tác vụ lâu', '4.6, 5.3', 'Đã đưa vào kế hoạch', 'notifications, notification_preferences, background_jobs'],
  ['API tài liệu', 'OpenAPI/Swagger đầy đủ và Postman collection', '8.3', 'Đã đưa vào kế hoạch', 'Toàn bộ API'],
  ['Kiểm thử', 'Unit service, integration API, E2E, coverage mục tiêu 30-40%', '3.5, 7.1-7.3, 9.1', 'Đang làm', 'Đã có 28 kiểm tra foundation và validation nhà hàng; integration/E2E làm tiếp'],
  ['Triển khai', 'Docker Compose và CI/CD build-test-deploy', '8.1, 8.2', 'Đã đưa vào kế hoạch', 'API + MySQL + Redis + MailHog'],
  ['Bảo mật & hiệu năng', 'SQLi/XSS/CSRF, rate limit, CORS, cache Redis, seed >= 2.000', '2.6, 6.1, 6.2', 'Đã đưa vào kế hoạch', 'Validation, Redis, seed'],
  ['Giám sát', 'Structured logging và health check', '1.3, 6.3', 'Đang làm', 'Đã có /health, /health/live, /health/ready; structured logs và system_settings làm ở 6.3'],
  ['Bàn giao', 'SRS, ERD, use case/flow, kiến trúc, hướng dẫn, video 5-10 phút', '1.1, 8.3-8.5, 9.3', 'Đang làm', 'Bộ hồ sơ nộp'],
  ['Food Delivery core', 'Nhà hàng, menu, khách đặt món, nhà hàng xác nhận, shipper giao, COD/online', '2.1-4.4', 'Đang làm', 'Đã triển khai API hồ sơ nhà hàng; menu, order, delivery, payment làm tiếp'],
  ['Realtime/GPS', 'Realtime thay đổi trạng thái và GPS tracking', '4.2, 4.3, 6.2, 9.1', 'Đã đưa vào kế hoạch', 'delivery_status_history, shipper_locations']
];

buildPlanSheet();
buildSummarySheet();
buildInfrastructureSheet();
buildSqlCoverageSheet();
buildRequirementsSheet();

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'formula error scan'
});
if (errors.ndjson.trim()) {
  const hasFormulaError = /#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A/.test(errors.ndjson);
  if (hasFormulaError) {
    throw new Error(`Formula errors found:\n${errors.ndjson}`);
  }
}

for (const sheetName of ['Summary', 'Plan', 'Ha tang', 'SQL coverage', 'Yeu cau']) {
  const preview = await workbook.render({
    sheetName,
    autoCrop: 'all',
    scale: 1,
    format: 'png'
  });
  await fs.writeFile(
    `${previewDir}/${sheetName.replaceAll(' ', '-').toLowerCase()}.png`,
    new Uint8Array(await preview.arrayBuffer())
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const check = await workbook.inspect({
  kind: 'sheet,table,region',
  maxChars: 16000,
  tableMaxRows: 8,
  tableMaxCols: 8,
  tableMaxCellChars: 120
});
await fs.writeFile(`${outputDir}/final-inspect.ndjson`, check.ndjson, 'utf8');
console.log(JSON.stringify({
  outputPath,
  timeline: `${dateText(timelineDates[0])} - ${dateText(timelineDates.at(-1))}`,
  sqlTables: sqlRows.length,
  taskCount: taskGroups.reduce((sum, group) => sum + group.tasks.length, 0),
  checks: 'passed'
}, null, 2));

function buildPlanSheet() {
  plan.showGridLines = false;
  plan.freezePanes.freezeRows(2);
  plan.freezePanes.freezeColumns(7);

  const rows = [];
  const rowMeta = [];
  const header = [
    'ID',
    'Công việc',
    'Người chịu trách nhiệm chính',
    'Ước lượng thời gian',
    'Deadline',
    'Trạng thái',
    'Tỉ lệ/Mức độ hoàn thành'
  ];
  rows.push([...header, ...Array(timelineDates.length).fill(null)]);
  rows.push([...Array(7).fill(null), ...timelineDates.map(date => date.getUTCDate())]);

  const sprintDefinitions = [
    { id: 'A', title: 'Sprint 1 - Core platform, catalog & ordering', groups: taskGroups.slice(0, 3), color: colors.blue, soft: colors.blueSoft },
    { id: 'B', title: 'Sprint 2 - Delivery, payment & operations', groups: taskGroups.slice(3, 4), color: colors.green, soft: colors.greenSoft },
    { id: 'C', title: 'Sprint 3 - Quality, deployment & handover', groups: taskGroups.slice(4), color: colors.orange, soft: colors.orangeSoft }
  ];

  for (const sprint of sprintDefinitions) {
    const sprintRow = rows.length + 1;
    const sprintStart = minDate(sprint.groups.map(group => group.start));
    const sprintEnd = maxDate(sprint.groups.map(group => group.deadline));
    rows.push([
      sprint.id,
      sprint.title,
      'Dương',
      sprint.id === 'A' ? '4w' : sprint.id === 'B' ? '2.5w' : '2.5w',
      dateValue(sprintEnd),
      null,
      null,
      ...Array(timelineDates.length).fill(null)
    ]);
    rowMeta.push({
      type: 'sprint',
      row: sprintRow,
      color: sprint.color,
      soft: sprint.soft,
      start: sprintStart,
      end: sprintEnd,
      groupRows: []
    });

    for (const group of sprint.groups) {
      const groupRow = rows.length + 1;
      const groupStart = minDate(group.tasks.map(item => item.start));
      const groupEnd = maxDate(group.tasks.map(item => item.deadline));
      rows.push([
        group.id,
        group.title,
        'Dương',
        group.estimate,
        dateValue(group.deadline),
        null,
        null,
        ...Array(timelineDates.length).fill(null)
      ]);
      rowMeta.push({
        type: 'group',
        row: groupRow,
        color: sprint.color,
        soft: sprint.soft,
        start: groupStart,
        end: groupEnd,
        taskRows: []
      });
      const sprintMeta = rowMeta.find(item => item.row === sprintRow);
      sprintMeta.groupRows.push(groupRow);

      for (const item of group.tasks) {
        const taskRow = rows.length + 1;
        rows.push([
          item.id,
          item.title,
          'Dương',
          item.estimate,
          dateValue(item.deadline),
          item.status,
          item.progress,
          ...Array(timelineDates.length).fill(null)
        ]);
        rowMeta.push({
          type: 'task',
          row: taskRow,
          color: sprint.color,
          soft: sprint.soft,
          start: item.start,
          end: item.deadline
        });
        const groupMeta = rowMeta.find(meta => meta.row === groupRow);
        groupMeta.taskRows.push(taskRow);
      }
    }
  }

  const lastRow = rows.length;
  plan.getRange(`A1:${timelineEndLetter}${lastRow}`).values = rows;

  plan.mergeCells('H1:AB1');
  plan.mergeCells('AC1:BG1');
  plan.mergeCells('BH1:BR1');
  plan.getRange('H1').values = [['Tháng 9/2026']];
  plan.getRange('AC1').values = [['Tháng 10/2026']];
  plan.getRange('BH1').values = [['Tháng 11/2026']];

  plan.getRange(`A1:${timelineEndLetter}${lastRow}`).format = {
    font: { typeface: 'Arial', fontSize: 10, color: colors.text },
    borders: { preset: 'all', style: 'thin', color: colors.border },
    verticalAlignment: 'center'
  };
  plan.getRange('A1:G1').format = {
    fill: colors.navyDark,
    font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    wrapText: true,
    borders: { preset: 'all', style: 'thin', color: colors.white }
  };
  plan.getRange('H1:AB1').format = monthBandFormat(colors.blue);
  plan.getRange('AC1:BG1').format = monthBandFormat(colors.green);
  plan.getRange('BH1:BR1').format = monthBandFormat(colors.orange);
  plan.getRange(`H2:${timelineEndLetter}2`).format = {
    fill: colors.gray,
    font: { typeface: 'Arial', fontSize: 9, bold: true, color: colors.grayDark },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: colors.border }
  };
  plan.getRange('A2:G2').format = {
    fill: colors.gray,
    borders: { preset: 'all', style: 'thin', color: colors.border }
  };
  plan.getRange(`A3:${timelineEndLetter}${lastRow}`).format.wrapText = true;
  plan.getRange(`A3:A${lastRow}`).format.horizontalAlignment = 'center';
  plan.getRange(`C3:G${lastRow}`).format.horizontalAlignment = 'center';
  plan.getRange(`E3:E${lastRow}`).format.numberFormat = 'dd/mm/yyyy';
  plan.getRange(`G3:G${lastRow}`).format.numberFormat = '0%';
  plan.getRange(`A1:${timelineEndLetter}2`).format.rowHeight = 28;
  plan.getRange(`A3:${timelineEndLetter}${lastRow}`).format.rowHeight = 26;

  const taskRows = rowMeta.filter(meta => meta.type === 'task').map(meta => meta.row);
  const groupMetas = rowMeta.filter(meta => meta.type === 'group');
  const groupRows = groupMetas.map(meta => meta.row);
  const sprintRows = rowMeta.filter(meta => meta.type === 'sprint').map(meta => meta.row);
  summaryGroupRows = groupRows;
  summaryTaskProgressRanges = groupMetas.map(meta => (
    `G${meta.taskRows[0]}:G${meta.taskRows.at(-1)}`
  ));
  summaryTaskStatusRanges = groupMetas.map(meta => (
    `F${meta.taskRows[0]}:F${meta.taskRows.at(-1)}`
  ));

  for (const meta of rowMeta) {
    const rowRange = plan.getRange(`A${meta.row}:${timelineEndLetter}${meta.row}`);
    if (meta.type === 'sprint') {
      rowRange.format = {
        fill: meta.soft,
        font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.navyDark },
        borders: { preset: 'all', style: 'thin', color: meta.color }
      };
      plan.getRange(`F${meta.row}`).formulas = [[`=IF(G${meta.row}=1,"Đã hoàn thành",IF(G${meta.row}=0,"Chưa thực hiện","Đang thực hiện"))`]];
      plan.getRange(`G${meta.row}`).formulas = [[`=AVERAGE(${meta.groupRows.map(row => `G${row}`).join(',')})`]];
      fillTimeline(meta.row, meta.start, meta.end, meta.color);
    } else if (meta.type === 'group') {
      rowRange.format = {
        fill: meta.soft,
        font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.text },
        borders: { preset: 'all', style: 'thin', color: meta.color }
      };
      plan.getRange(`F${meta.row}`).formulas = [[`=IF(G${meta.row}=1,"Đã hoàn thành",IF(G${meta.row}=0,"Chưa thực hiện","Đang thực hiện"))`]];
      plan.getRange(`G${meta.row}`).formulas = [[`=AVERAGE(${meta.taskRows.map(row => `G${row}`).join(',')})`]];
      fillTimeline(meta.row, meta.start, meta.end, meta.color);
    } else {
      fillTimeline(meta.row, meta.start, meta.end, meta.color, meta.soft);
      const status = rows[meta.row - 1][5];
      plan.getRange(`F${meta.row}`).format = statusFormat(status);
      plan.getRange(`G${meta.row}`).format = {
        fill: colors.white,
        horizontalAlignment: 'center',
        numberFormat: '0%'
      };
    }
  }

  for (const row of taskRows) {
    plan.getRange(`B${row}`).format.horizontalAlignment = 'left';
    if (String(rows[row - 1][1]).length > 125) {
      plan.getRange(`A${row}:${timelineEndLetter}${row}`).format.rowHeight = 38;
    }
  }
  for (const row of [...groupRows, ...sprintRows]) {
    plan.getRange(`B${row}`).format.horizontalAlignment = 'left';
  }

  plan.getRange(`F3:F${lastRow}`).dataValidation = {
    rule: {
      type: 'list',
      values: ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành', 'Bị chặn']
    }
  };
  plan.getRange(`G3:G${lastRow}`).dataValidation = {
    rule: {
      type: 'decimal',
      operator: 'between',
      formula1: 0,
      formula2: 1
    }
  };
  plan.getRange(`G3:G${lastRow}`).conditionalFormats.add('dataBar', {
    color: colors.blue
  });

  for (const column of ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR']) {
    const timelineIndex = columnNumber(column) - timelineStartColumn;
    const date = timelineDates[timelineIndex];
    if (date && [0, 6].includes(date.getUTCDay())) {
      plan.getRange(`${column}2:${column}${lastRow}`).format.fill = '#FAFAFA';
    }
    plan.getRange(`${column}1:${column}${lastRow}`).format.columnWidth = 3.2;
  }

  plan.getRange(`A1:A${lastRow}`).format.columnWidth = 7;
  plan.getRange(`B1:B${lastRow}`).format.columnWidth = 54;
  plan.getRange(`C1:C${lastRow}`).format.columnWidth = 18;
  plan.getRange(`D1:D${lastRow}`).format.columnWidth = 15;
  plan.getRange(`E1:E${lastRow}`).format.columnWidth = 14;
  plan.getRange(`F1:F${lastRow}`).format.columnWidth = 18;
  plan.getRange(`G1:G${lastRow}`).format.columnWidth = 15;
}

function buildSummarySheet() {
  summary.showGridLines = false;
  summary.freezePanes.freezeRows(2);

  summary.mergeCells('A1:Q1');
  summary.getRange('A1').values = [['MASTER PLAN - FOOD DELIVERY MANAGEMENT SYSTEM']];
  summary.getRange('A1:Q1').format = {
    fill: colors.navyDark,
    font: { typeface: 'Arial', fontSize: 18, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  };
  summary.getRange('A1:Q1').format.rowHeight = 34;

  summary.mergeCells('A2:Q2');
  summary.getRange('A2').values = [['Kế hoạch triển khai bám theo food_delivery_db.sql và yêu cầu chung của bài tập lớn | Cập nhật: 09/09/2026']];
  summary.getRange('A2:Q2').format = {
    fill: colors.blueSoft,
    font: { typeface: 'Arial', fontSize: 10, italic: true, color: colors.navyDark },
    horizontalAlignment: 'left',
    verticalAlignment: 'center'
  };

  summary.getRange('A4:B4').merge();
  summary.getRange('C4:D4').merge();
  summary.getRange('E4:F4').merge();
  summary.getRange('G4:H4').merge();
  summary.getRange('I4:J4').merge();
  summary.getRange('A4').values = [['Tiến độ công việc']];
  summary.getRange('C4').values = [['Đã hoàn thành']];
  summary.getRange('E4').values = [['Đang thực hiện']];
  summary.getRange('G4').values = [['Chưa thực hiện']];
  summary.getRange('I4').values = [['Mốc hiện tại']];
  summary.getRange('A4:J4').format = {
    fill: colors.navy,
    font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: colors.white }
  };
  summary.getRange('A5:B5').merge();
  summary.getRange('C5:D5').merge();
  summary.getRange('E5:F5').merge();
  summary.getRange('G5:H5').merge();
  summary.getRange('I5:J5').merge();
  summary.getRange('I5').values = [['5/20']];
  summary.getRange('A5:J5').format = {
    fill: colors.gray,
    font: { typeface: 'Arial', fontSize: 15, bold: true, color: colors.navyDark },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: colors.border }
  };
  summary.getRange('A5').formulas = [[overallProgressFormula()]];
  summary.getRange('C5').formulas = [[countStatusFormula('Đã hoàn thành')]];
  summary.getRange('E5').formulas = [[countStatusFormula('Đang thực hiện')]];
  summary.getRange('G5').formulas = [[countStatusFormula('Chưa thực hiện')]];
  summary.getRange('A5').format.numberFormat = '0%';

  summary.mergeCells('A7:H7');
  summary.getRange('A7').values = [['Phạm vi và tiến độ thực tế']];
  summary.getRange('A7:H7').format = sectionFormat(colors.blue);
  summary.getRange('A8:A12').values = [
    ['Backend hiện tại'],
    ['Database'],
    ['4 vai trò'],
    ['Đã triển khai'],
    ['Còn xác nhận']
  ];
  summary.getRange('B8:B12').values = [
    ['Node.js + Express, ES modules, MySQL2'],
    ['MySQL 8.0+ | 66 bảng | 62 index | 8 view | 15 trigger'],
    ['ADMIN | RESTAURANT | SHIPPER | CUSTOMER'],
    ['API foundation, health live/ready, graceful shutdown; auth, audit, catalog, địa chỉ và hồ sơ nhà hàng'],
    ['HTTP end-to-end phần nhà hàng, UI Tailwind theo design system 4 vai trò, test tích hợp/E2E và Docker']
  ];
  summary.getRange('A8:H12').format = {
    borders: { preset: 'all', style: 'thin', color: colors.border },
    verticalAlignment: 'center',
    wrapText: true
  };
  summary.getRange('A8:A12').format = {
    fill: colors.gray,
    font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.navyDark },
    horizontalAlignment: 'left'
  };
  summary.getRange('B8:H12').merge(true);
  summary.getRange('A8:A12').format.columnWidth = 20;
  summary.getRange('B8:H12').format.columnWidth = 16;
  summary.getRange('A8:H12').format.rowHeight = 27;

  summary.mergeCells('A15:F15');
  summary.getRange('A15').values = [['Tiến độ theo nhóm công việc']];
  summary.getRange('A15:F15').format = sectionFormat(colors.green);
  summary.getRange('A16:B25').values = [
    ['Nhóm', 'Tiến độ'],
    ['1 - Nền tảng', null],
    ['2 - Nhà hàng/menu', null],
    ['3 - Đặt món', null],
    ['4 - Giao hàng/thanh toán', null],
    ['5 - Nhập/xuất/job', null],
    ['6 - Bảo mật/giám sát', null],
    ['7 - Kiểm thử', null],
    ['8 - Bàn giao', null],
    ['9 - Nghiệm thu', null]
  ];
  summaryGroupRows.forEach((row, index) => {
    summary.getRange(`B${17 + index}`).formulas = [[`=Plan!G${row}`]];
  });
  summary.getRange('A16:B25').format = {
    borders: { preset: 'all', style: 'thin', color: colors.border },
    verticalAlignment: 'center'
  };
  summary.getRange('A16:B16').format = {
    fill: colors.navy,
    font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.white },
    horizontalAlignment: 'center'
  };
  summary.getRange('B17:B25').format = {
    fill: colors.greenSoft,
    horizontalAlignment: 'center',
    numberFormat: '0%'
  };
  summary.getRange('A16:A25').format.columnWidth = 25;
  summary.getRange('B16:B25').format.columnWidth = 13;

  const chart = summary.charts.add('bar', summary.getRange('A16:B25'));
  chart.title = 'Tiến độ theo nhóm';
  chart.hasLegend = false;
  chart.yAxis = { numberFormatCode: '0%', min: 0, max: 1 };
  chart.setPosition('D16', 'Q31');

  summary.mergeCells('A33:Q33');
  summary.getRange('A33').values = [['Lưu ý: cột Trạng thái và % trong sheet Plan là nguồn cập nhật chính; Logs thao tác thật được lưu trong bảng audit_logs của hệ thống web, không ghi vào file kế hoạch.']];
  summary.getRange('A33:Q33').format = {
    fill: colors.yellow,
    font: { typeface: 'Arial', fontSize: 10, italic: true, color: '#7F6000' },
    wrapText: true,
    verticalAlignment: 'center'
  };
  summary.getRange('A33:Q33').format.rowHeight = 30;

  summary.mergeCells('A34:Q34');
  summary.getRange('A34').values = [['Nguyên tắc chọn phần .../20: ưu tiên công việc chưa hoàn thành có deadline gần nhất và đủ dependency; nếu bị chặn thì xử lý phần phụ thuộc cần thiết trước.']];
  summary.getRange('A34:Q34').format = {
    fill: colors.blueSoft,
    font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.navyDark },
    wrapText: true,
    verticalAlignment: 'center'
  };
  summary.getRange('A34:Q34').format.rowHeight = 30;

  setColumnWidths(summary, {
    A: 20, B: 15, C: 14, D: 14, E: 14, F: 14, G: 14, H: 14, I: 14, J: 14,
    K: 12, L: 12, M: 12, N: 12, O: 12, P: 12, Q: 12
  });
}

function buildInfrastructureSheet() {
  infrastructure.showGridLines = false;
  infrastructure.freezePanes.freezeRows(3);
  infrastructure.mergeCells('A1:D1');
  infrastructure.getRange('A1').values = [['HẠ TẦNG VÀ CÔNG NGHỆ - FOOD DELIVERY']];
  infrastructure.getRange('A1:D1').format = {
    fill: colors.navyDark,
    font: { typeface: 'Arial', fontSize: 15, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  };
  infrastructure.getRange('A2:D2').merge();
  infrastructure.getRange('A2').values = [['Cập nhật theo backend Node.js hiện tại; các thành phần chưa code được đánh dấu rõ để tránh ghi nhận khống tiến độ.']];
  infrastructure.getRange('A2:D2').format = {
    fill: colors.blueSoft,
    font: { typeface: 'Arial', fontSize: 10, italic: true, color: colors.navyDark },
    wrapText: true
  };
  infrastructure.getRange('A3:D3').values = [['STT', 'Hạng mục', 'Công nghệ / phiên bản', 'Hiện trạng / ghi chú']];
  infrastructure.getRange('A3:D3').format = headerFormat();

  const values = [
    [1, 'Backend', 'Node.js 20+ / Express 4 / ES modules', 'Đã có env validation, MySQL pool/transaction, lỗi HTTP và graceful shutdown'],
    [2, 'Database', 'MySQL 8.0+ / food_delivery_db.sql', '66 bảng, 62 index, 8 view, 15 trigger; là nguồn dữ liệu chuẩn'],
    [3, 'Frontend', 'HTML, JavaScript, Tailwind CSS + design tokens dùng chung', 'Chưa làm giao diện; một quy chuẩn màu, bố cục và component cho cả 4 vai trò'],
    [4, 'Auth', 'JWT access/refresh + node:crypto PBKDF2/HMAC', 'Đã có register/login/logout/me, lưu token hash'],
    [5, 'Phân quyền', 'RBAC ADMIN/RESTAURANT/SHIPPER/CUSTOMER', 'Đã kiểm tra role và permission từ database cho API nhà hàng; tiếp tục phủ các module sau'],
    [6, 'Audit', 'audit_logs + request audit middleware', 'Lưu thao tác web vào database để mở lại trong hệ thống'],
    [7, 'Cache / realtime', 'Redis + WebSocket/Socket.IO', 'Đưa vào Sprint 3; phục vụ catalog, GPS và trạng thái đơn'],
    [8, 'Job queue', 'background_jobs + worker', 'Đưa vào Sprint 3; mail, export lớn, dọn token'],
    [9, 'Mail test', 'MailHog', 'Dùng trong Docker Compose khi làm notification'],
    [10, 'PDF / report', 'PDFKit + query từ các view báo cáo SQL', 'Đưa vào Sprint 2-3'],
    [11, 'Import / export', 'CSV/Excel + import_jobs/export_jobs', 'Đưa vào Sprint 3'],
    [12, 'API docs', 'OpenAPI/Swagger + Postman', 'Đưa vào hạng mục 8.3'],
    [13, 'Testing', 'Node test runner + API integration/E2E', 'Đã có 28 kiểm tra foundation và validation nhà hàng; coverage 30-40% hoàn thiện ở hạng mục 7.3'],
    [14, 'Container', 'Docker Compose: API + MySQL + Redis + MailHog', 'Đưa vào hạng mục 8.1'],
    [15, 'CI/CD', 'Pipeline install - check - test - build - deploy', 'Đưa vào hạng mục 8.2'],
    [16, 'Logging', 'Morgan/structured logging + health/readiness', 'Đã có liveness/readiness và graceful shutdown; structured logging nâng cấp ở 6.3'],
    [17, 'Media', 'Image picker/editor + xử lý thumbnail', 'Đưa vào hạng mục 2.7; lưu URL kết quả vào các bảng/cột ảnh hiện có trong SQL']
  ];
  infrastructure.getRange(`A4:D${3 + values.length}`).values = values;
  infrastructure.getRange(`A4:D${3 + values.length}`).format = {
    borders: { preset: 'all', style: 'thin', color: colors.border },
    verticalAlignment: 'center',
    wrapText: true
  };
  infrastructure.getRange(`A4:A${3 + values.length}`).format.horizontalAlignment = 'center';
  infrastructure.getRange(`A4:D${3 + values.length}`).format.rowHeight = 30;
  infrastructure.getRange(`A4:D${3 + values.length}`).conditionalFormats.add('containsText', {
    text: 'Đang dùng',
    format: { fill: colors.greenSoft }
  });
  infrastructure.getRange(`A4:D${3 + values.length}`).conditionalFormats.add('containsText', {
    text: 'Chưa làm',
    format: { fill: colors.yellow }
  });
  setColumnWidths(infrastructure, { A: 8, B: 22, C: 38, D: 62 });
  infrastructure.tables.add(`A3:D${3 + values.length}`, true, 'InfrastructureTable');
}

function buildSqlCoverageSheet() {
  sqlCoverage.showGridLines = false;
  sqlCoverage.freezePanes.freezeRows(4);
  sqlCoverage.mergeCells('A1:F1');
  sqlCoverage.getRange('A1').values = [['MA TRẬN BÁM SÁT DATABASE - food_delivery_db.sql']];
  sqlCoverage.getRange('A1:F1').format = {
    fill: colors.navyDark,
    font: { typeface: 'Arial', fontSize: 15, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  };
  sqlCoverage.mergeCells('A2:F2');
  sqlCoverage.getRange('A2').values = [['SQL thực tế: 66 bảng | 62 index | 8 view | 15 trigger. Mỗi bảng được gắn với hạng mục trong Plan để tránh kế hoạch tách rời database.']];
  sqlCoverage.getRange('A2:F2').format = {
    fill: colors.blueSoft,
    font: { typeface: 'Arial', fontSize: 10, italic: true, color: colors.navyDark },
    wrapText: true
  };
  sqlCoverage.getRange('A3:F3').values = [['Nhóm dữ liệu', 'Bảng SQL', 'Vai trò trong hệ thống', 'Plan ID', 'Trạng thái hiện tại', 'Ghi chú']];
  sqlCoverage.getRange('A3:F3').format = headerFormat();
  const rows = sqlRows.map(([group, table, role, planId, status]) => [
    group,
    table,
    role,
    planId,
    status,
    table === 'audit_logs'
      ? 'Log thao tác lưu trong web/database'
      : table === 'customer_addresses'
        ? 'Đã có API Node.js'
        : table === 'restaurant_images'
          ? 'Đã có backend CRUD; UI chọn/chỉnh ảnh ở hạng mục 2.7'
        : ['restaurant_categories', 'restaurants', 'restaurant_operating_hours', 'restaurant_images'].includes(table)
          ? 'Đã có API Node.js; còn xác nhận HTTP end-to-end'
        : table === 'login_history' || table === 'refresh_tokens'
          ? 'Đã có repository/service'
          : ''
  ]);
  sqlCoverage.getRange(`A4:F${3 + rows.length}`).values = rows;
  sqlCoverage.getRange(`A4:F${3 + rows.length}`).format = {
    borders: { preset: 'all', style: 'thin', color: colors.border },
    verticalAlignment: 'center',
    wrapText: true
  };
  sqlCoverage.getRange(`D4:E${3 + rows.length}`).format.horizontalAlignment = 'center';
  sqlCoverage.getRange(`A4:F${3 + rows.length}`).format.rowHeight = 23;
  sqlCoverage.getRange(`E4:E${3 + rows.length}`).conditionalFormats.add('containsText', {
    text: 'Đang thực hiện',
    format: { fill: colors.yellow }
  });
  sqlCoverage.getRange(`E4:E${3 + rows.length}`).conditionalFormats.add('containsText', {
    text: 'Đang làm',
    format: { fill: colors.yellow }
  });
  sqlCoverage.getRange(`E4:E${3 + rows.length}`).conditionalFormats.add('containsText', {
    text: 'Đã hoàn thành',
    format: { fill: colors.greenSoft }
  });
  setColumnWidths(sqlCoverage, { A: 23, B: 29, C: 42, D: 14, E: 20, F: 36 });
  sqlCoverage.tables.add(`A3:F${3 + rows.length}`, true, 'SqlCoverageTable');
}

function buildRequirementsSheet() {
  requirements.showGridLines = false;
  requirements.freezePanes.freezeRows(4);
  requirements.mergeCells('A1:E1');
  requirements.getRange('A1').values = [['MA TRẬN ĐÁP ỨNG YÊU CẦU CHUNG VÀ ĐỀ TÀI FOOD DELIVERY']];
  requirements.getRange('A1:E1').format = {
    fill: colors.navyDark,
    font: { typeface: 'Arial', fontSize: 15, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  };
  requirements.mergeCells('A2:E2');
  requirements.getRange('A2').values = [['Nội dung được rút từ file “Yêu cầu chung cho mọi bài tập lớn.docx”, sau đó điều chỉnh theo đúng 4 vai trò và bảng trong food_delivery_db.sql.']];
  requirements.getRange('A2:E2').format = {
    fill: colors.blueSoft,
    font: { typeface: 'Arial', fontSize: 10, italic: true, color: colors.navyDark },
    wrapText: true
  };
  requirements.getRange('A3:E3').values = [['Nhóm yêu cầu', 'Nội dung cần đáp ứng', 'Plan ID', 'Mức đáp ứng trong kế hoạch', 'Căn cứ SQL / bàn giao']];
  requirements.getRange('A3:E3').format = headerFormat();
  requirements.getRange(`A4:E${3 + requirementsRows.length}`).values = requirementsRows;
  requirements.getRange(`A4:E${3 + requirementsRows.length}`).format = {
    borders: { preset: 'all', style: 'thin', color: colors.border },
    verticalAlignment: 'center',
    wrapText: true
  };
  requirements.getRange(`C4:D${3 + requirementsRows.length}`).format.horizontalAlignment = 'center';
  requirements.getRange(`A4:E${3 + requirementsRows.length}`).format.rowHeight = 34;
  requirements.getRange(`D4:D${3 + requirementsRows.length}`).conditionalFormats.add('containsText', {
    text: 'Đang làm',
    format: { fill: colors.yellow }
  });
  requirements.getRange(`D4:D${3 + requirementsRows.length}`).conditionalFormats.add('containsText', {
    text: 'Đã đưa vào kế hoạch',
    format: { fill: colors.greenSoft }
  });
  setColumnWidths(requirements, { A: 20, B: 47, C: 19, D: 25, E: 43 });
  requirements.tables.add(`A3:E${3 + requirementsRows.length}`, true, 'RequirementsTable');
}

function fillTimeline(row, start, end, color, soft = null) {
  const startIndex = Math.max(0, timelineDates.findIndex(date => date >= dateValue(start)));
  const endIndex = Math.min(
    timelineDates.length - 1,
    timelineDates.findLastIndex(date => date <= dateValue(end))
  );
  if (startIndex > endIndex || startIndex < 0 || endIndex < 0) {
    return;
  }
  const startColumn = columnLetter(timelineStartColumn + startIndex);
  const endColumn = columnLetter(timelineStartColumn + endIndex);
  plan.getRange(`${startColumn}${row}:${endColumn}${row}`).format.fill = soft ?? color;
  plan.getRange(`${startColumn}${row}:${endColumn}${row}`).format.borders = {
    top: { style: 'thin', color },
    bottom: { style: 'thin', color }
  };
}

function task(id, title, estimate, start, deadline, status, progress) {
  return { id, title, estimate, start, deadline, status, progress };
}

function dateValue(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function createDateRange(start, end) {
  const dates = [];
  const current = dateValue(start);
  const final = dateValue(end);
  while (current <= final) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function minDate(values) {
  return values.slice().sort()[0];
}

function maxDate(values) {
  return values.slice().sort().at(-1);
}

function dateText(date) {
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function columnLetter(columnNumberValue) {
  let value = columnNumberValue;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function columnNumber(letter) {
  let result = 0;
  for (const char of letter) {
    result = result * 26 + char.charCodeAt(0) - 64;
  }
  return result;
}

function monthBandFormat(color) {
  return {
    fill: color,
    font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: colors.white }
  };
}

function headerFormat() {
  return {
    fill: colors.navy,
    font: { typeface: 'Arial', fontSize: 10, bold: true, color: colors.white },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    wrapText: true,
    borders: { preset: 'all', style: 'thin', color: colors.white }
  };
}

function sectionFormat(color) {
  return {
    fill: color,
    font: { typeface: 'Arial', fontSize: 11, bold: true, color: colors.white },
    horizontalAlignment: 'left',
    verticalAlignment: 'center'
  };
}

function statusFormat(status) {
  if (status === 'Đã hoàn thành') {
    return {
      fill: colors.greenSoft,
      font: { typeface: 'Arial', fontSize: 10, bold: true, color: '#274E13' },
      horizontalAlignment: 'center'
    };
  }
  if (status === 'Đang thực hiện') {
    return {
      fill: colors.yellow,
      font: { typeface: 'Arial', fontSize: 10, bold: true, color: '#7F6000' },
      horizontalAlignment: 'center'
    };
  }
  return {
    fill: colors.gray,
    font: { typeface: 'Arial', fontSize: 10, color: colors.grayDark },
    horizontalAlignment: 'center'
  };
}

function setColumnWidths(sheet, widths) {
  for (const [letter, width] of Object.entries(widths)) {
    sheet.getRange(`${letter}:${letter}`).format.columnWidth = width;
  }
}

function taskRowRanges() {
  return summaryTaskProgressRanges;
}

function statusRowRanges() {
  return summaryTaskStatusRanges;
}

function overallProgressFormula() {
  return `=AVERAGE(${taskRowRanges().map(range => `Plan!${range}`).join(',')})`;
}

function countStatusFormula(status) {
  return taskRowRanges()
    .map((range, index) => `COUNTIF(Plan!${statusRowRanges()[index]},"${status}")`)
    .join('+');
}
