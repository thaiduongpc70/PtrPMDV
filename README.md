# Food Delivery Management System

## 1. Mục đích hệ thống

Food Delivery Management System là nền tảng quản lý toàn bộ quy trình giao hàng đồ ăn từ nhà hàng đến khách hàng.

Hệ thống hỗ trợ quản trị người dùng, quản lý nhà hàng và menu, giỏ hàng, đặt món, xác nhận và chuẩn bị món, phân công shipper, theo dõi giao hàng theo thời gian thực, thanh toán COD/online, hóa đơn, khuyến mãi, đánh giá, chat, hỗ trợ khách hàng và báo cáo vận hành.

Mục tiêu chính của hệ thống:

- Quản lý tập trung nhà hàng, món ăn, khách hàng và shipper.
- Chuẩn hóa quy trình đặt món → chuẩn bị → giao hàng → thanh toán.
- Theo dõi trạng thái đơn hàng và vị trí shipper theo thời gian thực.
- Hỗ trợ thanh toán COD và thanh toán online.
- Quản lý lịch sử giao dịch, hóa đơn, hoàn tiền và đối soát.
- Hỗ trợ báo cáo doanh thu, hiệu suất giao hàng và hoạt động hệ thống.
- Đảm bảo phân quyền, audit log, bảo mật và khả năng mở rộng.

---

## 2. Vai trò người dùng

### Quản trị viên — Admin

Admin chịu trách nhiệm quản trị toàn bộ hệ thống:

- Quản lý tài khoản người dùng.
- Quản lý vai trò và quyền truy cập.
- Duyệt, khóa hoặc mở khóa nhà hàng.
- Duyệt và quản lý shipper.
- Theo dõi đơn hàng và trạng thái giao hàng.
- Quản lý thanh toán, hoàn tiền và COD.
- Quản lý khuyến mãi toàn hệ thống.
- Theo dõi audit log và security event.
- Quản lý cấu hình hệ thống.
- Theo dõi dashboard và xuất báo cáo.

### Nhà hàng — Restaurant

Nhà hàng chịu trách nhiệm quản lý hoạt động bán món:

- Quản lý hồ sơ nhà hàng.
- Quản lý giờ hoạt động.
- Quản lý menu, danh mục món, món ăn, size và topping.
- Bật/tắt trạng thái món còn bán.
- Tiếp nhận đơn hàng mới.
- Xác nhận hoặc từ chối đơn.
- Cập nhật trạng thái chuẩn bị món.
- Chuyển đơn sang trạng thái sẵn sàng để shipper lấy.
- Quản lý khuyến mãi của nhà hàng.
- Theo dõi doanh thu, hoa hồng và đối soát.
- Phản hồi đánh giá.
- Trao đổi với khách hàng hoặc shipper trong phạm vi đơn hàng.

### Shipper

Shipper chịu trách nhiệm giao hàng:

- Quản lý hồ sơ và giấy tờ shipper.
- Bật/tắt trạng thái sẵn sàng nhận đơn.
- Nhận đề nghị giao hàng.
- Chấp nhận hoặc từ chối đơn giao.
- Di chuyển đến nhà hàng để lấy món.
- Cập nhật trạng thái giao hàng.
- Gửi vị trí GPS trong quá trình giao.
- Thu tiền COD nếu có.
- Xác nhận giao hàng thành công.
- Lưu ảnh/chữ ký xác nhận nếu cần.
- Theo dõi thu nhập và lịch sử giao hàng.
- Yêu cầu rút tiền.

### Khách hàng — Customer

Khách hàng sử dụng hệ thống để đặt món:

- Đăng ký và đăng nhập.
- Quản lý hồ sơ cá nhân.
- Quản lý nhiều địa chỉ giao hàng.
- Tìm kiếm nhà hàng và món ăn.
- Xem menu, giá, size và topping.
- Thêm món vào giỏ hàng.
- Áp dụng mã giảm giá.
- Đặt món và chọn phương thức thanh toán.
- Theo dõi trạng thái đơn.
- Theo dõi vị trí shipper.
- Chat với nhà hàng hoặc shipper.
- Hủy đơn theo chính sách.
- Đánh giá nhà hàng và shipper.
- Gửi yêu cầu hỗ trợ.

---

## 3. Quy trình nghiệp vụ chính

### 3.1. Quản lý người dùng và phân quyền

1. Người dùng đăng ký hoặc được Admin tạo tài khoản.
2. Hệ thống gán vai trò tương ứng: `ADMIN`, `RESTAURANT`, `SHIPPER`, `CUSTOMER`.
3. Người dùng đăng nhập.
4. Hệ thống xác thực tài khoản và lấy Role/Permission.
5. Người dùng chỉ được truy cập chức năng phù hợp với quyền được cấp.
6. Hoạt động nhạy cảm được ghi vào Audit Log.

---

### 3.2. Quản lý nhà hàng và menu

1. Chủ nhà hàng tạo hoặc cập nhật hồ sơ nhà hàng.
2. Admin duyệt nhà hàng nếu chính sách hệ thống yêu cầu.
3. Nhà hàng cấu hình giờ hoạt động.
4. Nhà hàng tạo menu.
5. Nhà hàng tạo danh mục món.
6. Nhà hàng tạo món ăn.
7. Nhà hàng cấu hình:
   - giá;
   - size/variant;
   - topping;
   - hình ảnh;
   - thời gian chuẩn bị;
   - trạng thái còn hàng.
8. Hệ thống chỉ hiển thị nhà hàng và món hợp lệ cho khách hàng.

---

### 3.3. Giỏ hàng và đặt món

1. Khách hàng chọn nhà hàng.
2. Khách hàng xem menu.
3. Khách hàng chọn món, size, topping và số lượng.
4. Món được thêm vào giỏ hàng.
5. Khách hàng chọn địa chỉ giao hàng.
6. Khách hàng áp dụng promotion/voucher nếu có.
7. Hệ thống tính:
   - `subtotal`;
   - `discount_amount`;
   - `delivery_fee`;
   - `service_fee`;
   - `tax_amount`;
   - `total_amount`.
8. Khách hàng chọn phương thức thanh toán.
9. Hệ thống kiểm tra lại giá, món, voucher, khoảng cách và trạng thái nhà hàng.
10. Hệ thống tạo đơn hàng.
11. Nhà hàng nhận thông báo đơn mới.

---

### 3.4. Nhà hàng xác nhận và chuẩn bị món

1. Đơn mới được tạo với trạng thái `PENDING`.
2. Nhà hàng kiểm tra đơn.
3. Nhà hàng xác nhận đơn.
4. Đơn chuyển sang `CONFIRMED`.
5. Nhà hàng bắt đầu chế biến.
6. Đơn chuyển sang `PREPARING`.
7. Khi món hoàn tất, nhà hàng cập nhật `READY_FOR_PICKUP`.
8. Nếu không thể phục vụ, nhà hàng từ chối đơn với lý do phù hợp.

Luồng trạng thái:

```text
PENDING
   ↓
CONFIRMED
   ↓
PREPARING
   ↓
READY_FOR_PICKUP
```

---

### 3.5. Phân công shipper

1. Hệ thống tìm shipper phù hợp.
2. Hệ thống tạo `delivery_assignment`.
3. Shipper nhận đề nghị giao hàng.
4. Shipper có thể:
   - `ACCEPTED`;
   - `REJECTED`;
   - hoặc để assignment `EXPIRED`.
5. Nếu shipper từ chối hoặc hết thời gian phản hồi, hệ thống tìm shipper khác.
6. Khi shipper chấp nhận:
   - đơn chuyển `SHIPPER_ASSIGNED`;
   - shipper chuyển `BUSY`.

Luồng:

```text
OFFERED
   ↓
ACCEPTED
```

Hoặc:

```text
OFFERED
   ├── REJECTED
   ├── EXPIRED
   └── CANCELLED
```

---

### 3.6. Lấy món và giao hàng

1. Shipper đến nhà hàng.
2. Shipper xác minh đơn hàng.
3. Nhà hàng bàn giao món.
4. Shipper xác nhận lấy món.
5. Đơn chuyển `PICKED_UP`.
6. Shipper bắt đầu giao hàng.
7. Đơn chuyển `DELIVERING`.
8. Ứng dụng shipper gửi GPS định kỳ.
9. Khách hàng theo dõi vị trí shipper.
10. Shipper đến địa chỉ khách hàng.
11. Shipper giao món.
12. Nếu là COD, shipper thu tiền.
13. Shipper xác nhận giao hàng.
14. Đơn chuyển `DELIVERED`.
15. Shipper trở lại trạng thái `AVAILABLE`.

Luồng tổng quát:

```text
SHIPPER_ASSIGNED
        ↓
PICKED_UP
        ↓
DELIVERING
        ↓
DELIVERED
```

---

### 3.7. GPS Tracking

Trong thời gian giao hàng:

1. Ứng dụng shipper lấy vị trí hiện tại.
2. Vị trí được gửi về backend theo chu kỳ.
3. Backend lưu lịch sử vị trí vào `shipper_locations`.
4. Backend cập nhật vị trí mới nhất của shipper.
5. Frontend khách hàng nhận dữ liệu realtime.
6. Hệ thống hiển thị vị trí shipper trên bản đồ.

Dữ liệu GPS chính:

- latitude;
- longitude;
- speed;
- heading;
- accuracy;
- recorded time.

---

### 3.8. Thanh toán COD và online

#### COD

1. Khách hàng chọn `COD`.
2. Đơn được giao.
3. Shipper thu tiền.
4. `cod_transactions.status = COLLECTED`.
5. `orders.payment_status = PAID`.
6. Sau đối soát, COD chuyển `SETTLED`.

#### Thanh toán online

1. Hệ thống tạo Payment.
2. Payment ở trạng thái `PENDING`.
3. Khách hàng thanh toán qua gateway.
4. Gateway gửi callback/webhook.
5. Backend xác thực callback.
6. Backend kiểm tra transaction/idempotency.
7. Payment chuyển `PAID` hoặc `FAILED`.
8. Hệ thống cập nhật trạng thái thanh toán của Order.

---

### 3.9. Hủy đơn và hoàn tiền

1. Người dùng yêu cầu hủy đơn.
2. Hệ thống kiểm tra trạng thái đơn.
3. Hệ thống kiểm tra cancel policy.
4. Nếu được phép:
   - tạo `order_cancellations`;
   - cập nhật Order thành `CANCELLED`.
5. Nếu đơn đã thanh toán online:
   - tạo Refund;
   - gửi yêu cầu hoàn tiền;
   - cập nhật trạng thái refund.

Các lý do hủy có thể gồm:

- `CUSTOMER_CHANGED_MIND`;
- `RESTAURANT_REJECTED`;
- `OUT_OF_STOCK`;
- `SHIPPER_UNAVAILABLE`;
- `PAYMENT_FAILED`;
- `SYSTEM_TIMEOUT`;
- `OTHER`.

---

### 3.10. Đánh giá, chat và hỗ trợ

#### Đánh giá

Sau khi đơn `DELIVERED`:

- Customer đánh giá Restaurant.
- Customer đánh giá Shipper.
- Rating hợp lệ từ 1 đến 5.
- Hệ thống cập nhật rating trung bình.

#### Chat

Hệ thống hỗ trợ chat trong phạm vi Order giữa:

- Customer;
- Restaurant;
- Shipper.

Message có thể gồm:

- text;
- image;
- location;
- system message.

#### Support

1. User tạo Support Ticket.
2. Ticket ở trạng thái `OPEN`.
3. Admin tiếp nhận.
4. Ticket chuyển `IN_PROGRESS`.
5. Hai bên trao đổi.
6. Ticket được `RESOLVED`.
7. Cuối cùng chuyển `CLOSED`.

---

### 3.11. Báo cáo và xuất dữ liệu

Hệ thống hỗ trợ:

- doanh thu theo ngày;
- doanh thu theo nhà hàng;
- tổng số đơn;
- đơn hoàn thành;
- đơn bị hủy;
- tỷ lệ giao hàng thành công;
- top nhà hàng;
- top món ăn;
- hiệu suất shipper;
- doanh thu shipper;
- commission nhà hàng;
- promotion usage;
- thống kê khách hàng.

Dữ liệu có thể xuất:

- CSV;
- Excel;
- PDF.

Các tác vụ export lớn có thể được xử lý qua background job.

---

## 4. Quy tắc nghiệp vụ cốt lõi

- Người dùng phải đăng nhập và có quyền phù hợp trước khi thao tác.
- Customer chỉ được thao tác trên dữ liệu thuộc tài khoản của mình.
- Restaurant chỉ được quản lý menu và order thuộc nhà hàng của mình.
- Shipper chỉ được cập nhật Delivery mà mình được phân công.
- Admin có quyền toàn hệ thống theo RBAC.
- Restaurant phải ở trạng thái `ACTIVE` mới được nhận đơn mới.
- Menu Item phải `is_available = TRUE` mới được đặt.
- Giá Order phải được backend tính lại, không tin giá từ client.
- Order Item phải lưu snapshot tên món và giá tại thời điểm đặt.
- Mỗi Order phải có `order_code` duy nhất.
- Promotion phải còn hiệu lực và thỏa điều kiện áp dụng.
- Delivery Assignment phải bảo đảm chỉ một shipper được `ACCEPTED`.
- GPS chỉ được chia sẻ trong phạm vi Delivery hợp lệ.
- Callback từ Payment Gateway phải được xác thực.
- Payment callback phải hỗ trợ idempotency.
- Order `DELIVERED` không đồng nghĩa COD/Settlement đã hoàn tất.
- Review chỉ được tạo sau khi Order `DELIVERED`.
- Tài khoản bị `LOCKED`, `INACTIVE` hoặc `SUSPENDED` không được thực hiện nghiệp vụ bị hạn chế.
- Các thao tác nhạy cảm phải được ghi Audit Log.
- Dữ liệu đã phát sinh giao dịch nên ưu tiên soft-delete.
- Dữ liệu cá nhân, vị trí GPS, thanh toán và tài liệu shipper phải được bảo vệ khỏi truy cập trái phép.

---

## 5. Phạm vi chức năng

### Backend

Các module nghiệp vụ đề xuất nằm trong:

```text
backend/src/modules
```

Bao gồm:

- Identity Access
- User Role Permission
- Customer Management
- Restaurant Management
- Menu Management
- Cart Management
- Order Management
- Delivery Assignment
- Shipper Management
- GPS Tracking
- Payment
- COD Reconciliation
- Invoice
- Refund
- Promotion
- Review
- Favorite
- Notification
- Chat
- Support
- Wallet
- Shipper Earnings
- Restaurant Settlement
- Reporting Export
- Audit Security
- Background Jobs
- System Settings

---

### Frontend

Frontend được tổ chức theo tính năng và cổng người dùng:

```text
frontend/src/features
frontend/src/portals
```

Các portal chính:

- Admin Portal
- Restaurant Portal
- Shipper Portal
- Customer Portal

Các nhóm giao diện:

- Authentication
- Restaurant Discovery
- Menu
- Cart
- Checkout
- Orders
- Live Tracking
- Payment
- Promotion
- Reviews
- Chat
- Support
- Dashboard
- Reports

---

### Database

Database sử dụng **MySQL 8**.

Các nhóm bảng chính:

- Authentication & RBAC
- Customer
- Restaurant
- Menu
- Cart
- Order
- Delivery
- GPS Tracking
- Payment
- COD
- Invoice
- Promotion
- Review
- Chat
- Support
- Wallet
- Finance
- Audit
- Import/Export
- Background Job
- System Configuration

Database thiết kế đầy đủ hiện tại gồm khoảng **66 bảng**.

---

### Dữ liệu và hạ tầng

```text
database
```

Chứa:

- schema;
- migration;
- seed;
- view;
- trigger;
- procedure nếu cần.

```text
storage
```

Chứa:

- avatar;
- restaurant images;
- menu item images;
- shipper documents;
- delivery proof;
- invoice PDF;
- support attachments;
- exported reports.

```text
infrastructure
```

Chứa:

- Docker;
- Docker Compose;
- database configuration;
- Redis;
- Mail service;
- monitoring;
- deployment scripts.

```text
shared
```

Chứa:

- constants;
- enums;
- DTO/contracts;
- validation;
- shared types.

```text
docs
```

Chứa:

- Business Workflow;
- User Flow;
- API documentation;
- ERD;
- Use Case;
- architecture;
- database documentation;
- deployment guide.

---

## 6. Cấu trúc dự án đề xuất

```text
food-delivery-platform/
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   ├── customers/
│   │   │   ├── restaurants/
│   │   │   ├── menus/
│   │   │   ├── carts/
│   │   │   ├── orders/
│   │   │   ├── shippers/
│   │   │   ├── deliveries/
│   │   │   ├── tracking/
│   │   │   ├── payments/
│   │   │   ├── cod/
│   │   │   ├── invoices/
│   │   │   ├── refunds/
│   │   │   ├── promotions/
│   │   │   ├── reviews/
│   │   │   ├── favorites/
│   │   │   ├── notifications/
│   │   │   ├── chat/
│   │   │   ├── support/
│   │   │   ├── wallets/
│   │   │   ├── earnings/
│   │   │   ├── settlements/
│   │   │   ├── reports/
│   │   │   ├── audit/
│   │   │   └── system/
│   │   │
│   │   ├── common/
│   │   ├── config/
│   │   └── main/
│   │
│   ├── tests/
│   └── README.md
│
├── database/
│   ├── migrations/
│   ├── schema/
│   ├── seeds/
│   ├── views/
│   ├── triggers/
│   └── README.md
│
├── docs/
│   ├── business/
│   ├── api/
│   ├── architecture/
│   ├── database/
│   ├── workflows/
│   └── diagrams/
│
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   ├── portals/
│   │   │   ├── admin/
│   │   │   ├── restaurant/
│   │   │   ├── shipper/
│   │   │   └── customer/
│   │   ├── shared/
│   │   └── assets/
│   └── tests/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   ├── scripts/
│   └── docker-compose.yml
│
├── shared/
│   ├── constants/
│   ├── contracts/
│   ├── enums/
│   ├── types/
│   └── validation/
│
├── storage/
│   ├── avatars/
│   ├── restaurants/
│   ├── menu-items/
│   ├── shipper-documents/
│   ├── delivery-proofs/
│   ├── invoices/
│   ├── support/
│   └── exports/
│
├── tests/
│   ├── acceptance/
│   ├── integration/
│   ├── performance/
│   └── security/
│
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 7. Database

Database sử dụng:

```text
MySQL 8
```

Tên database đề xuất:

```text
food_delivery_db
```

Các entity quan trọng:

```text
roles
users
permissions
role_permissions

customer_profiles
customer_addresses

restaurants
restaurant_categories
restaurant_operating_hours
restaurant_images

menus
menu_categories
menu_items
menu_item_variants
topping_groups
toppings

carts
cart_items
cart_item_toppings

orders
order_items
order_item_toppings
order_status_history

shipper_profiles
shipper_documents

deliveries
delivery_status_history
delivery_assignments
shipper_locations

payments
payment_transactions
cod_transactions
invoices
refunds

promotions
promotion_usage

restaurant_reviews
shipper_reviews

notifications
chat_sessions
chat_messages

support_tickets
support_messages

wallets
wallet_transactions

shipper_earnings
shipper_withdrawals

restaurant_commissions
restaurant_settlements

audit_logs
login_history

import_jobs
export_jobs
background_jobs

delivery_zones
system_settings
```

---

## 8. Trạng thái nghiệp vụ

### Order

```text
PENDING
   ↓
CONFIRMED
   ↓
PREPARING
   ↓
READY_FOR_PICKUP
   ↓
SHIPPER_ASSIGNED
   ↓
PICKED_UP
   ↓
DELIVERING
   ↓
DELIVERED
```

Các trạng thái ngoại lệ:

```text
CANCELLED
FAILED
```

### Delivery

```text
PENDING
   ↓
ASSIGNED
   ↓
ACCEPTED
   ↓
PICKED_UP
   ↓
DELIVERING
   ↓
DELIVERED
```

Ngoại lệ:

```text
FAILED
CANCELLED
```

### Payment

```text
PENDING
   ↓
PROCESSING
   ↓
PAID
```

Ngoại lệ:

```text
FAILED
CANCELLED
REFUNDED
```

### COD

```text
PENDING
   ↓
COLLECTED
   ↓
SETTLED
```

### Refund

```text
PENDING
   ↓
PROCESSING
   ↓
COMPLETED
```

Ngoại lệ:

```text
FAILED
REJECTED
```

---

## 9. Công nghệ đề xuất

### Backend

```text
.NET 8
ASP.NET Core Web API
Entity Framework Core
JWT Authentication
Swagger / OpenAPI
```

### Frontend

```text
HTML
CSS
JavaScript
AngularJS
```

### Database

```text
MySQL 8
```

### Cache / Realtime

```text
Redis
WebSocket / SignalR
```

### Infrastructure

```text
Docker
Docker Compose
```

### API Testing

```text
Postman
Swagger
```

### Report

```text
PDF
Excel
CSV
```

---

## 10. Yêu cầu phi chức năng

### Security

- JWT Authentication.
- RBAC.
- Password hashing.
- Rate limiting.
- CORS.
- Validation.
- Chống SQL Injection.
- Chống XSS.
- CSRF protection nếu kiến trúc yêu cầu.
- Audit log cho hành động nhạy cảm.

### Performance

- Index cho Order, Delivery, Payment và GPS Tracking.
- Redis cache cho dữ liệu đọc nhiều.
- Pagination cho danh sách lớn.
- Background Job cho export/report/email.
- Archive dữ liệu GPS cũ.

### Reliability

- Transaction cho nghiệp vụ Order/Payment.
- Idempotency cho tạo Order và Payment Callback.
- Retry cho background jobs.
- Structured logging.
- Health Check endpoint.

### Testing

- Unit Test.
- Integration Test.
- API Test.
- Acceptance Test.
- Performance Test.
- Security Test.

Mục tiêu coverage:

```text
>= 30-40%
```

---

## 11. Báo cáo và Dashboard

Dashboard Admin có thể bao gồm:

- Tổng số đơn hôm nay.
- Đơn đang xử lý.
- Đơn giao thành công.
- Đơn bị hủy.
- Doanh thu hôm nay.
- Doanh thu theo thời gian.
- Tỷ lệ giao thành công.
- Top nhà hàng.
- Top món ăn.
- Top shipper.
- Payment statistics.
- COD chưa đối soát.
- Refund đang xử lý.
- Support ticket chưa giải quyết.

Dashboard Restaurant:

- Đơn mới.
- Đơn đang chuẩn bị.
- Đơn hoàn thành.
- Doanh thu.
- Top món ăn.
- Rating.
- Commission.
- Settlement.

Dashboard Shipper:

- Đơn đang giao.
- Tổng chuyến.
- Thu nhập.
- Rating.
- COD đang giữ.
- Lịch sử giao.

Dashboard Customer:

- Đơn đang xử lý.
- Lịch sử đơn.
- Voucher.
- Nhà hàng yêu thích.
- Đánh giá.
- Support Ticket.

---

## 12. Tài liệu dự án

Thư mục `docs` nên bao gồm:

```text
docs/
├── business/
│   ├── master-plan.md
│   ├── business-workflow.md
│   ├── business-rules.md
│   └── use-cases.md
│
├── database/
│   ├── erd.md
│   ├── tables.md
│   └── database-design.md
│
├── architecture/
│   ├── system-architecture.md
│   └── module-architecture.md
│
├── api/
│   └── api-documentation.md
│
└── workflows/
    ├── order-flow.md
    ├── delivery-flow.md
    ├── payment-flow.md
    └── refund-flow.md
```

---

## 13. Trạng thái hiện tại

Hiện tại dự án đã hoàn thành phần thiết kế và phân tích chính:

- Master Plan cho đề tài Food Delivery.
- Phân tích Business Workflow & User Flow.
- Xác định 4 actor:
  - Admin;
  - Restaurant;
  - Shipper;
  - Customer.
- Thiết kế quy trình Order End-to-End.
- Thiết kế quy trình Delivery và GPS Tracking.
- Thiết kế Payment/COD/Refund.
- Thiết kế RBAC.
- Thiết kế database MySQL đầy đủ với khoảng 66 bảng.
- Xác định View, Index, Constraint và Trigger phục vụ nghiệp vụ.

Các bước triển khai tiếp theo:

1. Khởi tạo source code backend.
2. Tạo migration database.
3. Seed role và permission.
4. Xây dựng Authentication/JWT.
5. Xây dựng RBAC.
6. Xây dựng Restaurant/Menu API.
7. Xây dựng Cart/Order API.
8. Xây dựng Shipper/Delivery API.
9. Tích hợp realtime GPS Tracking.
10. Xây dựng Payment/COD.
11. Xây dựng frontend theo 4 portal.
12. Hoàn thiện test, Docker, CI/CD và tài liệu API.

---

## 14. Quy ước phát triển

### Branch

```text
main
develop
feature/*
bugfix/*
hotfix/*
```

Ví dụ:

```text
feature/auth
feature/restaurant-menu
feature/order
feature/delivery
feature/payment
```

### Commit

Ví dụ:

```text
feat: add restaurant management API
feat: implement order checkout
feat: add shipper GPS tracking
fix: prevent duplicate payment callback
docs: update business workflow
test: add order integration tests
```

---

## 15. Mục tiêu bàn giao

Dự án hoàn chỉnh cần có:

- Source code backend.
- Source code frontend.
- Database schema + migration + seed.
- Swagger/OpenAPI.
- Postman Collection.
- Unit Test và Integration Test.
- Docker Compose.
- Master Plan.
- SRS.
- ERD.
- Use Case.
- Business Workflow.
- Architecture Diagram.
- PDF/Excel report.
- Hướng dẫn cài đặt.
- Hướng dẫn sử dụng.
- Video demo.

---

## 16. Luồng nghiệp vụ tổng thể

```text
Customer
   ↓
Restaurant Discovery
   ↓
Menu
   ↓
Cart
   ↓
Checkout
   ↓
Order Created
   ↓
Restaurant Confirmation
   ↓
Food Preparation
   ↓
Shipper Assignment
   ↓
Pickup
   ↓
Delivery + GPS Tracking
   ↓
Customer Receives Order
   ↓
Payment / COD Completion
   ↓
Invoice
   ↓
Review
   ↓
Commission / Settlement
   ↓
Analytics & Reporting
```

---

## 17. Kết luận

Food Delivery Management System được thiết kế theo hướng quản lý đầy đủ vòng đời giao đồ ăn thay vì chỉ xử lý thao tác đặt món đơn giản.

Ba đối tượng nghiệp vụ trung tâm là:

```text
ORDER
DELIVERY
PAYMENT
```

Các đối tượng này có state machine độc lập nhưng liên kết với nhau.

Hệ thống cần đảm bảo:

- phân quyền rõ ràng;
- lịch sử trạng thái đầy đủ;
- dữ liệu đơn hàng không bị thay đổi khi menu thay đổi;
- payment callback an toàn;
- GPS tracking theo thời gian thực;
- audit cho thao tác nhạy cảm;
- khả năng export/report;
- khả năng triển khai bằng container;
- khả năng mở rộng khi lượng đơn hàng và dữ liệu GPS tăng cao.
